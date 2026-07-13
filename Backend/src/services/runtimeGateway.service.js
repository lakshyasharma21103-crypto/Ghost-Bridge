const Ajv = require('ajv');
const AgentPassport = require('../models/AgentPassport');
const Capability = require('../models/Capability');
const PassportConnection = require('../models/PassportConnection');
const Invocation = require('../models/Invocation');
const { adapters } = require('./adapters');
const { createAuditLog } = require('./auditService');
const {
  checkConnectionHealth: checkConnectionHealthService,
  credentialHeadersForConnection,
} = require('./connectionService');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { redactSecrets } = require('../utils/redact');
const { createObserver, errorFields } = require('../utils/observability');
const { isRetryableError } = require('../utils/retryability');
const { OPERATION_STAGE_NAMES, MAX_INVOCATION_STAGE_METRICS } = require('../constants/operations');

const inputAjv = new Ajv({ allErrors: true, strict: false, validateSchema: true });
const outputAjv = new Ajv({ allErrors: true, strict: false, validateSchema: true });

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function requireString(value, path) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path, message: `${path} is required.` },
    ]);
  }
  return value.trim();
}

function actorFor(connection, actor = {}) {
  return {
    actorType: actor.actorType === 'system' ? 'system' : 'user',
    actorId: actor.actorId || connection.receivingUserId,
    requestId: actor.requestId,
    traceId: actor.traceId,
  };
}

function assertConnectionOwnership(connection, actor = {}) {
  if (!actor.enforceConnectionOwnership) return;

  const receivingWorkspaceId = requireString(actor.receivingWorkspaceId, 'receivingWorkspaceId');
  const receivingUserId = requireString(actor.receivingUserId, 'receivingUserId');
  if (
    connection.receivingWorkspaceId !== receivingWorkspaceId ||
    connection.receivingUserId !== receivingUserId
  ) {
    throw new AppError(404, ErrorCodes.CONNECTION_NOT_FOUND, 'Passport connection was not found.');
  }
}

function inputValidationDetails(errors = []) {
  return errors.map((error) => {
    let path = `input${error.instancePath || ''}`;
    if (error.keyword === 'required' && error.params?.missingProperty) {
      path = `${path}/${error.params.missingProperty}`;
    }
    return {
      path,
      keyword: error.keyword,
      message: error.message || 'is invalid.',
    };
  });
}

function validateCapabilityInput(capability, input) {
  let validate;
  try {
    validate = inputAjv.compile(capability.inputSchema);
  } catch {
    throw new AppError(
      500,
      ErrorCodes.CAPABILITY_SCHEMA_INVALID,
      'Capability input schema could not be loaded.',
    );
  }

  if (!validate(input)) {
    throw new AppError(
      400,
      ErrorCodes.CAPABILITY_INPUT_INVALID,
      'Capability input does not match its schema.',
      inputValidationDetails(validate.errors),
    );
  }
}

function validateCapabilityOutput(capability, output) {
  let validate;
  try {
    validate = outputAjv.compile(capability.outputSchema);
  } catch {
    throw new AppError(
      500,
      ErrorCodes.CAPABILITY_SCHEMA_INVALID,
      'Capability output schema could not be loaded.',
    );
  }

  if (!validate(output)) {
    throw new AppError(
      502,
      ErrorCodes.RUNTIME_OUTPUT_INVALID,
      'Runtime output does not match the capability schema.',
      inputValidationDetails(validate.errors).map((item) => ({
        ...item,
        path: item.path.replace(/^input/, 'output'),
      })),
    );
  }
}

function serializeCapability(capability) {
  return {
    name: capability.name,
    description: capability.description,
    inputSchema: capability.inputSchema,
    outputSchema: capability.outputSchema,
    riskLevel: capability.riskLevel,
    runtimeToolName: capability.runtimeToolName,
  };
}

function serializeInvocation(invocation) {
  return {
    invocationId: idOf(invocation),
    connectionId: idOf(invocation.connectionId),
    passportId: idOf(invocation.passportId),
    capability: invocation.capability,
    status: invocation.status,
    output: invocation.output,
    error: invocation.error,
    durationMs: invocation.durationMs,
    runtimeType: invocation.runtimeType,
    traceId: invocation.traceId,
    requestId: invocation.requestId,
    createdAt: invocation.createdAt,
    updatedAt: invocation.updatedAt,
  };
}

function normalizedError(error) {
  if (error instanceof AppError) return error;
  return new AppError(
    500,
    ErrorCodes.INTERNAL_SERVER_ERROR,
    'Runtime Gateway could not complete the invocation.',
    [],
    { cause: error },
  );
}

function invocationErrorPayload(error) {
  return redactSecrets({
    code: error.code || ErrorCodes.INTERNAL_SERVER_ERROR,
    internalCode: error.internalCode,
    message: error.message || 'Runtime invocation failed.',
    details: Array.isArray(error.details) ? error.details : [],
    operation: error.operation,
    stage: error.stage,
    retryable: isRetryableError(error),
    timeoutReason: error.timeoutReason || error.reason,
    causeCode: error.cause?.code,
    causeName: error.cause?.name,
    durationMs: error.durationMs,
    providerHttpStatus: error.providerHttpStatus,
  });
}

function stageMetricCollector(metrics) {
  const allowed = new Set(OPERATION_STAGE_NAMES);
  return (metric) => {
    if (
      metrics.length >= MAX_INVOCATION_STAGE_METRICS ||
      !allowed.has(metric?.stage) ||
      !['completed', 'failed'].includes(metric?.status) ||
      !Number.isFinite(metric?.durationMs)
    ) {
      return;
    }
    metrics.push({
      stage: metric.stage,
      status: metric.status,
      durationMs: Math.max(0, Math.round(metric.durationMs * 100) / 100),
    });
  };
}

async function persistStageMetrics(invocation, stageMetrics) {
  if (!invocation) return undefined;
  invocation.stageMetrics = stageMetrics.slice(0, MAX_INVOCATION_STAGE_METRICS);
  try {
    await invocation.save();
    return undefined;
  } catch (error) {
    // Operational timing persistence is best-effort and cannot change the invocation outcome.
    return error;
  }
}

function adapterResultOrThrow(result, runtimeType) {
  if (result?.ok === true) return result;

  const adapterError = result?.error;
  if (adapterError?.code) {
    throw new AppError(
      adapterError.code === ErrorCodes.MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED ? 501 : 502,
      adapterError.code,
      adapterError.message || `${runtimeType.toUpperCase()} runtime invocation failed.`,
      Array.isArray(adapterError.details) ? adapterError.details : [],
    );
  }

  throw new AppError(
    502,
    ErrorCodes.RUNTIME_INVOCATION_FAILED,
    `${runtimeType.toUpperCase()} runtime returned an invalid adapter response.`,
  );
}

async function loadConnection(connectionId) {
  const connection = await PassportConnection.findOne({ _id: connectionId });
  if (!connection) {
    throw new AppError(404, ErrorCodes.CONNECTION_NOT_FOUND, 'Passport connection was not found.');
  }
  return connection;
}

async function loadInvocationContext(connectionId, capabilityName, actor, observer) {
  const connection = await observer.stage('connection_lookup', () => loadConnection(connectionId));
  await observer.stage('policy_check', async () => {
    assertConnectionOwnership(connection, actor);
    if (connection.status !== 'connected') {
      throw new AppError(
        409,
        ErrorCodes.CONNECTION_PENDING_AUTH,
        'Passport connection must be connected before it can be invoked.',
      );
    }
    if (connection.installScope && connection.installScope !== 'invoke') {
      throw new AppError(
        403,
        ErrorCodes.FORBIDDEN,
        'This connection was not granted invocation scope.',
      );
    }
  });

  const [passport, capability] = await observer.stage('capability_resolution', () =>
    Promise.all([
      AgentPassport.findOne({ _id: connection.passportId }),
      Capability.findOne({ passportId: connection.passportId, name: capabilityName }),
    ]),
  );

  await observer.stage('policy_check', async () => {
    if (!passport || passport.status !== 'valid') {
      throw new AppError(
        409,
        ErrorCodes.PASSPORT_UNAVAILABLE,
        'Agent Passport is not available for invocation.',
      );
    }
    if (!capability) {
      throw new AppError(404, ErrorCodes.CAPABILITY_NOT_FOUND, 'Agent capability was not found.');
    }
    if (!capability.enabled) {
      throw new AppError(409, ErrorCodes.CAPABILITY_DISABLED, 'Agent capability is disabled.');
    }
    if (connection.runtimeType !== passport.runtime.type) {
      throw new AppError(
        409,
        ErrorCodes.RUNTIME_CONFIGURATION_INVALID,
        'Connection runtime does not match the Agent Passport runtime.',
      );
    }
  });
  return { connection, passport, capability };
}

async function invoke(connectionId, capabilityName, input, actor = {}) {
  const startedAt = Date.now();
  const stageMetrics = [];
  const onStageMetric = stageMetricCollector(stageMetrics);
  let observer = actor.observer
    ? actor.observer.child({ onStageMetric })
    : createObserver(
        {
          traceId: actor.traceId,
          requestId: actor.requestId,
          connectionId,
          capabilityName,
          onStageMetric,
        },
        actor.logger,
      );
  let invocation;
  let context;
  let auditActor;
  observer.emit('info', 'runtime.invocation.started', { status: 'started' });
  try {
    const normalizedCapabilityName = await observer.stage('request_validation', async () =>
      requireString(capabilityName, 'capability'),
    );
    context = await loadInvocationContext(connectionId, normalizedCapabilityName, actor, observer);
    observer = observer.child({
      connectionId: idOf(context.connection),
      agentId: idOf(context.passport),
      capabilityId: idOf(context.capability),
      capabilityName: context.capability.name,
    });
    await observer.stage('request_validation', async () =>
      validateCapabilityInput(context.capability, input),
    );

    invocation = await observer.stage('invocation_persistence', () =>
      Invocation.create({
        connectionId: context.connection._id,
        passportId: context.passport._id,
        receivingWorkspaceId: context.connection.receivingWorkspaceId,
        capability: context.capability.name,
        inputSummary: redactSecrets(input),
        status: 'running',
        runtimeType: context.connection.runtimeType,
        traceId: actor.traceId,
        requestId: actor.requestId,
        stageMetrics,
      }),
    );
    observer = observer.child({ invocationId: idOf(invocation) });
    actor.onInvocationCreated?.(idOf(invocation));
    auditActor = actorFor(context.connection, actor);

    const adapter = adapters[context.connection.runtimeType];
    if (!adapter || typeof adapter.invoke !== 'function') {
      throw new AppError(
        501,
        ErrorCodes.ADAPTER_NOT_IMPLEMENTED,
        `${context.connection.runtimeType.toUpperCase()} runtime invocation is not implemented in v1.`,
      );
    }

    let result;
    if (context.connection.runtimeType === 'mcp') {
      result = await adapter.invoke(context.connection, context.capability, input);
    } else {
      const credentialHeaders = await credentialHeadersForConnection(
        context.connection,
        context.passport.auth,
        { observer },
      );
      result = await adapter.invoke({
        runtime: context.passport.runtime,
        input,
        credentialHeaders,
        observability: {
          observer,
          traceId: actor.traceId,
          requestId: actor.requestId,
          invocationId: idOf(invocation),
        },
      });
    }
    adapterResultOrThrow(result, context.connection.runtimeType);
    await observer.stage('response_validation', async () =>
      validateCapabilityOutput(context.capability, result.output),
    );

    invocation.status = 'completed';
    invocation.output = redactSecrets(result.output);
    invocation.durationMs = Date.now() - startedAt;
    await observer.stage('invocation_persistence', () => invocation.save());
    await observer.stage('audit_persistence', () =>
      createAuditLog(
        auditActor.actorType,
        auditActor.actorId,
        'invocation.completed',
        'Invocation',
        idOf(invocation),
        {
          connectionId: idOf(context.connection),
          passportId: idOf(context.passport),
          receivingWorkspaceId: context.connection.receivingWorkspaceId,
          receivingUserId: context.connection.receivingUserId,
          capability: context.capability.name,
          runtimeType: context.connection.runtimeType,
          remoteStatus: result.status,
          durationMs: invocation.durationMs,
        },
        {
          requestId: auditActor.requestId,
          traceId: auditActor.traceId,
          invocationId: idOf(invocation),
        },
      ),
    );
    const stageMetricError = await persistStageMetrics(invocation, stageMetrics);
    if (stageMetricError) {
      observer.emit('warn', 'persistence.stage_metrics.failed', {
        ...errorFields(stageMetricError),
        status: 'failed',
      });
    }

    observer.emit('info', 'persistence.invocation.completed', {
      status: 'completed',
      durationMs: invocation.durationMs,
    });
    observer.emit('info', 'persistence.audit.completed', { status: 'completed' });
    observer.emit('info', 'runtime.invocation.completed', {
      status: 'completed',
      statusCode: result.status,
      durationMs: invocation.durationMs,
    });

    return {
      ...serializeInvocation(invocation),
      output: invocation.output,
      runtimeStatus: result.status,
    };
  } catch (error) {
    const runtimeError = normalizedError(error);
    runtimeError.retryable = isRetryableError(runtimeError);
    runtimeError.traceId ||= actor.traceId;
    runtimeError.requestId ||= actor.requestId;
    runtimeError.connectionId ||= connectionId;
    if (invocation) {
      runtimeError.invocationId ||= idOf(invocation);
      invocation.status = 'failed';
      invocation.error = invocationErrorPayload(runtimeError);
      invocation.durationMs = Date.now() - startedAt;
      try {
        await observer.stage('invocation_persistence', () => invocation.save());
      } catch (persistenceError) {
        runtimeError.persistenceErrorCode =
          persistenceError.code || ErrorCodes.INTERNAL_SERVER_ERROR;
      }
      try {
        await observer.stage('audit_persistence', () =>
          createAuditLog(
            auditActor.actorType,
            auditActor.actorId,
            'invocation.failed',
            'Invocation',
            idOf(invocation),
            {
              connectionId: idOf(context.connection),
              passportId: idOf(context.passport),
              receivingWorkspaceId: context.connection.receivingWorkspaceId,
              receivingUserId: context.connection.receivingUserId,
              capability: context.capability.name,
              runtimeType: context.connection.runtimeType,
              errorCode: runtimeError.code,
              providerHttpStatus: runtimeError.providerHttpStatus,
              retryable: runtimeError.retryable,
              durationMs: invocation.durationMs,
            },
            {
              requestId: auditActor.requestId,
              traceId: auditActor.traceId,
              invocationId: idOf(invocation),
            },
          ),
        );
      } catch (auditError) {
        runtimeError.auditErrorCode = auditError.code || ErrorCodes.INTERNAL_SERVER_ERROR;
      }
      const stageMetricError = await persistStageMetrics(invocation, stageMetrics);
      if (stageMetricError) {
        runtimeError.stageMetricErrorCode =
          stageMetricError.code || ErrorCodes.INTERNAL_SERVER_ERROR;
      }
    }
    observer.emit('error', 'runtime.invocation.failed', {
      ...errorFields(runtimeError),
      stage: runtimeError.stage,
      status: 'failed',
      invocationId: runtimeError.invocationId,
      durationMs: Date.now() - startedAt,
    });
    throw runtimeError;
  }
}

function normalizeMcpTool(tool, index) {
  if (!tool || typeof tool !== 'object' || typeof tool.name !== 'string' || !tool.name.trim()) {
    throw new AppError(
      502,
      ErrorCodes.RUNTIME_INVOCATION_FAILED,
      'MCP runtime returned an invalid tool definition.',
      [{ path: `tools/${index}`, message: 'MCP tool name is required.' }],
    );
  }

  return {
    name: tool.name.trim(),
    description:
      typeof tool.description === 'string' && tool.description.trim()
        ? tool.description.trim()
        : `MCP tool ${tool.name.trim()}`,
    inputSchema:
      tool.inputSchema && typeof tool.inputSchema === 'object'
        ? tool.inputSchema
        : { type: 'object' },
    outputSchema:
      tool.outputSchema && typeof tool.outputSchema === 'object'
        ? tool.outputSchema
        : { type: 'object' },
    riskLevel: ['low', 'medium', 'high'].includes(tool.riskLevel) ? tool.riskLevel : 'medium',
    runtimeToolName: tool.name.trim(),
    enabled: tool.enabled !== false,
  };
}

async function importMcpTools(connectionId, actor = {}) {
  const connection = await loadConnection(connectionId);
  assertConnectionOwnership(connection, actor);
  if (connection.runtimeType !== 'mcp') {
    throw new AppError(
      409,
      ErrorCodes.RUNTIME_CONFIGURATION_INVALID,
      'MCP tool import is only available for MCP connections.',
    );
  }
  if (connection.status !== 'connected') {
    throw new AppError(
      409,
      ErrorCodes.CONNECTION_PENDING_AUTH,
      'Passport connection must be connected before MCP tools can be imported.',
    );
  }
  if (connection.installScope === 'resolve_only') {
    throw new AppError(
      403,
      ErrorCodes.FORBIDDEN,
      'This connection was not granted connection scope.',
    );
  }

  const passport = await AgentPassport.findOne({ _id: connection.passportId });
  if (!passport || passport.status !== 'valid') {
    throw new AppError(
      409,
      ErrorCodes.PASSPORT_UNAVAILABLE,
      'Agent Passport is not available for MCP tool import.',
    );
  }

  const adapter = adapters.mcp;
  if (
    !adapter ||
    typeof adapter.initialize !== 'function' ||
    typeof adapter.listTools !== 'function'
  ) {
    throw new AppError(
      501,
      ErrorCodes.MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED,
      'MCP runtime adapter is configured but remote MCP transport is not implemented yet.',
    );
  }

  let initialized = false;
  try {
    adapterResultOrThrow(await adapter.initialize(connection), 'mcp');
    initialized = true;
    const listedTools = adapterResultOrThrow(await adapter.listTools(connection), 'mcp');
    const tools = Array.isArray(listedTools.tools) ? listedTools.tools : [];
    const importedCapabilities = [];

    for (const [index, tool] of tools.entries()) {
      const capability = normalizeMcpTool(tool, index);
      const stored = await Capability.findOneAndUpdate(
        { passportId: passport._id, name: capability.name },
        { $set: { passportId: passport._id, ...capability } },
        { upsert: true, new: true, runValidators: true },
      );
      importedCapabilities.push(serializeCapability(stored));
    }

    const auditActor = actorFor(connection, actor);
    await createAuditLog(
      auditActor.actorType,
      auditActor.actorId,
      'mcp_tools.imported',
      'PassportConnection',
      idOf(connection),
      {
        passportId: idOf(passport),
        receivingWorkspaceId: connection.receivingWorkspaceId,
        receivingUserId: connection.receivingUserId,
        importedCount: importedCapabilities.length,
      },
      auditActor.requestId,
    );

    return {
      connectionId: idOf(connection),
      importedCount: importedCapabilities.length,
      capabilities: importedCapabilities,
    };
  } finally {
    if (initialized && typeof adapter.cleanup === 'function') {
      await adapter.cleanup();
    }
  }
}

async function getCapabilities(connectionId) {
  const connection = await loadConnection(connectionId);
  const capabilities = await Capability.find({ passportId: connection.passportId, enabled: true })
    .sort({ name: 1 })
    .lean();
  return {
    connectionId: idOf(connection),
    items: capabilities.map(serializeCapability),
  };
}

async function checkHealth(connectionId, actor = {}) {
  return checkConnectionHealthService(connectionId, actor, actor.requestId);
}

function requireReceivingIdentity(input) {
  return {
    receivingWorkspaceId: requireString(input?.receivingWorkspaceId, 'receivingWorkspaceId'),
    receivingUserId: requireString(input?.receivingUserId, 'receivingUserId'),
  };
}

async function listInvocations(input) {
  const identity = requireReceivingIdentity(input);
  const connections = await PassportConnection.find({
    receivingWorkspaceId: identity.receivingWorkspaceId,
    receivingUserId: identity.receivingUserId,
  })
    .select('_id')
    .lean();
  const connectionIds = connections.map((connection) => connection._id);
  if (!connectionIds.length) return { items: [] };

  const invocations = await Invocation.find({ connectionId: { $in: connectionIds } })
    .sort({ createdAt: -1 })
    .lean();
  return { items: invocations.map(serializeInvocation) };
}

async function getInvocation(invocationId, input) {
  const identity = requireReceivingIdentity(input);
  const invocation = await Invocation.findOne({ _id: invocationId }).lean();
  if (!invocation) {
    throw new AppError(404, ErrorCodes.INVOCATION_NOT_FOUND, 'Invocation was not found.');
  }
  const connection = await PassportConnection.findOne({
    _id: invocation.connectionId,
    receivingWorkspaceId: identity.receivingWorkspaceId,
    receivingUserId: identity.receivingUserId,
  });
  if (!connection) {
    throw new AppError(404, ErrorCodes.INVOCATION_NOT_FOUND, 'Invocation was not found.');
  }
  return serializeInvocation(invocation);
}

module.exports = {
  invoke,
  getCapabilities,
  importMcpTools,
  checkHealth,
  listInvocations,
  getInvocation,
  validateCapabilityInput,
  serializeInvocation,
  adapterResultOrThrow,
  assertConnectionOwnership,
  invocationErrorPayload,
  stageMetricCollector,
};
