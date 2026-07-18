const mongoose = require('mongoose');
const OrchestrationDefinition = require('../models/OrchestrationDefinition');
const OrchestrationRun = require('../models/OrchestrationRun');
const OrchestrationNodeRun = require('../models/OrchestrationNodeRun');
const PassportConnection = require('../models/PassportConnection');
const AgentPassport = require('../models/AgentPassport');
const Capability = require('../models/Capability');
const { actorFromPartner, assertAuthorized } = require('./authorization.service');
const { assertOperationalAccess } = require('./operationalState.service');
const { createAuditLog } = require('./auditService');
const { requestCancellation: cancelInvocation } = require('./invocationControl.service');
const metrics = require('./orchestrationMetrics.service');
const {
  DEFAULT_ORCHESTRATION_SETTINGS,
  ORCHESTRATION_DEFINITION_STATUSES,
  ORCHESTRATION_LIMITS,
  ORCHESTRATION_RUN_STATUSES,
  TERMINAL_RUN_STATUSES,
} = require('../constants/orchestration');
const {
  assertSafePayload,
  definitionDigest,
  redactedSummary,
  safeDefinitionSnapshot,
  validateAgainstSchema,
  validateDefinitionDocument,
} = require('./orchestrationValidation.service');
const {
  canonicalize,
  hashesEqual,
  isDuplicateKeyError,
  normalizeClientKey,
  secureDigest,
} = require('../utils/idempotency');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function callerScope(input = {}, caller = {}) {
  const partnerId = idOf(caller.partner);
  if (!partnerId) {
    throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Partner API key is required.');
  }
  const workspaceId = String(input.workspaceId || input.receivingWorkspaceId || '').trim();
  if (!workspaceId) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path: 'workspaceId', message: 'workspaceId is required.' },
    ]);
  }
  return {
    organizationId: partnerId,
    partnerId,
    workspaceId,
    actorId: `partner:${partnerId}`,
    actorType: 'partner',
    requestId: caller.requestId,
    traceId: caller.traceId,
  };
}

function resource(type, id, scope) {
  return {
    type,
    id: idOf(id) || `${type.toLowerCase()}:${scope.workspaceId}`,
    organizationId: scope.organizationId,
    partnerId: scope.partnerId,
    workspaceId: scope.workspaceId,
  };
}

async function authorize(permission, type, entityId, scope, caller, context = {}) {
  return assertAuthorized(
    actorFromPartner(caller.partner, {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      requestId: caller.requestId,
      traceId: caller.traceId,
    }),
    permission,
    resource(type, entityId, scope),
    {
      requestId: caller.requestId,
      traceId: caller.traceId,
      workspaceId: scope.workspaceId,
      ...context,
    },
  );
}

async function audit(action, type, entityId, scope, metadata = {}) {
  return createAuditLog(
    scope.actorType,
    scope.actorId,
    action,
    type,
    idOf(entityId),
    {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      receivingWorkspaceId: scope.workspaceId,
      ...metadata,
    },
    { requestId: scope.requestId, traceId: scope.traceId },
  );
}

function pagination(input = {}) {
  const page = Number(input.page || 1);
  const limit = Number(input.limit || 25);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Pagination is invalid.', [
      { path: 'pagination', message: 'page must be positive and limit must be between 1 and 100.' },
    ]);
  }
  return { page, limit, skip: (page - 1) * limit };
}

function safeSearch(value) {
  const normalized = String(value || '').trim().slice(0, 100);
  return normalized ? normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
}

function normalizeRetryPolicy(input = {}) {
  return {
    maxAttempts: Number(input.maxAttempts || DEFAULT_ORCHESTRATION_SETTINGS.retryPolicy.maxAttempts),
    baseDelayMs: Number(input.baseDelayMs || DEFAULT_ORCHESTRATION_SETTINGS.retryPolicy.baseDelayMs),
    maxDelayMs: Number(input.maxDelayMs || DEFAULT_ORCHESTRATION_SETTINGS.retryPolicy.maxDelayMs),
  };
}

function normalizeDefinitionInput(input = {}, current = {}) {
  assertSafePayload(input, '$definition');
  const defaultTimeout = Number(
    input.defaultNodeTimeoutMs ||
      current.defaultNodeTimeoutMs ||
      DEFAULT_ORCHESTRATION_SETTINGS.defaultNodeTimeoutMs,
  );
  const nodes = (input.nodes || current.nodes || []).map((node) => ({
    nodeKey: String(node.nodeKey || '').trim(),
    displayName: String(node.displayName || node.nodeKey || '').trim(),
    connectionId: node.connectionId,
    passportId: node.passportId,
    capability: String(node.capability || '').trim(),
    operation: String(node.operation || node.capability || '').trim(),
    inputSchema: node.inputSchema || { type: 'object', additionalProperties: false },
    outputSchema: node.outputSchema || { type: 'object' },
    inputMapping: node.inputMapping || {},
    timeoutMs: Number(node.timeoutMs || defaultTimeout),
    retryPolicy: normalizeRetryPolicy(node.retryPolicy),
    approvalRequirement: {
      required: node.approvalRequirement?.required === true,
      ...(node.approvalRequirement?.workflowId
        ? { workflowId: String(node.approvalRequirement.workflowId).trim() }
        : {}),
      ...(node.approvalRequirement?.reason
        ? { reason: String(node.approvalRequirement.reason).trim() }
        : {}),
    },
    policyContext: node.policyContext || {},
    continueOnFailure: node.continueOnFailure === true,
    dependencies: [...new Set((node.dependencies || []).map((value) => String(value).trim()))],
  }));
  return {
    name: String(input.name ?? current.name ?? '').trim(),
    description: String(input.description ?? current.description ?? '').trim(),
    inputSchema: input.inputSchema || current.inputSchema || { type: 'object' },
    outputSchema: input.outputSchema || current.outputSchema || { type: 'object' },
    nodes,
    edges: (input.edges || current.edges || []).map((edge) => ({
      from: String(edge.from || '').trim(),
      to: String(edge.to || '').trim(),
    })),
    concurrencyLimit: Number(
      input.concurrencyLimit || current.concurrencyLimit || DEFAULT_ORCHESTRATION_SETTINGS.concurrencyLimit,
    ),
    maxRunDurationMs: Number(
      input.maxRunDurationMs || current.maxRunDurationMs || DEFAULT_ORCHESTRATION_SETTINGS.maxRunDurationMs,
    ),
    maxNodeExecutions: Number(
      input.maxNodeExecutions || current.maxNodeExecutions || DEFAULT_ORCHESTRATION_SETTINGS.maxNodeExecutions,
    ),
    defaultNodeTimeoutMs: defaultTimeout,
  };
}

function throwDefinitionValidation(result) {
  if (result.valid) return result;
  const stableCode = result.errors[0]?.code || ErrorCodes.ORCHESTRATION_DEFINITION_INVALID;
  throw new AppError(
    400,
    stableCode.startsWith('ORCHESTRATION_') ? stableCode : ErrorCodes.ORCHESTRATION_DEFINITION_INVALID,
    'Orchestration definition validation failed.',
    result.errors.slice(0, 100),
  );
}

async function validateReferences(definition, scope) {
  const result = validateDefinitionDocument(definition);
  if (!result.valid) return result;
  const connectionIds = [...new Set(definition.nodes.map((node) => idOf(node.connectionId)))];
  const connections = await PassportConnection.find({
    _id: { $in: connectionIds },
    receivingWorkspaceId: scope.workspaceId,
    $or: [{ organizationId: scope.organizationId }, { partnerId: scope.partnerId }],
  }).lean();
  const connectionsById = new Map(connections.map((item) => [idOf(item), item]));
  const passportIds = [...new Set(definition.nodes.map((node) => idOf(node.passportId)))];
  const [passports, capabilities] = await Promise.all([
    AgentPassport.find({ _id: { $in: passportIds } }).lean(),
    Capability.find({ passportId: { $in: passportIds } }).lean(),
  ]);
  const passportsById = new Map(passports.map((item) => [idOf(item), item]));
  const capabilitiesByKey = new Map(
    capabilities.map((item) => [`${idOf(item.passportId)}:${item.name}`, item]),
  );
  const errors = [];
  for (const node of definition.nodes) {
    const path = `nodes.${node.nodeKey}`;
    const connection = connectionsById.get(idOf(node.connectionId));
    if (!connection) {
      errors.push({
        path: `${path}.connectionId`,
        code: ErrorCodes.ORCHESTRATION_CONNECTION_SCOPE_DENIED,
        message: 'Connection is unavailable in this tenant scope.',
      });
      continue;
    }
    if (
      connection.status !== 'connected' ||
      connection.installScope !== 'invoke' ||
      idOf(connection.passportId) !== idOf(node.passportId)
    ) {
      errors.push({
        path: `${path}.connectionId`,
        code: ErrorCodes.ORCHESTRATION_CONNECTION_SCOPE_DENIED,
        message: 'Connection is not eligible for orchestration invocation.',
      });
    }
    const passport = passportsById.get(idOf(node.passportId));
    if (!passport || passport.status !== 'valid') {
      errors.push({
        path: `${path}.passportId`,
        code: ErrorCodes.PASSPORT_UNAVAILABLE,
        message: 'Agent Passport is not available for orchestration.',
      });
      continue;
    }
    node._passportVersion = passport.agent?.version;
    const capability = capabilitiesByKey.get(`${idOf(node.passportId)}:${node.capability}`);
    const declaredOperation = capability?.runtimeToolName || capability?.name;
    if (!capability || !capability.enabled || ![capability.name, declaredOperation].includes(node.operation)) {
      errors.push({
        path: `${path}.capability`,
        code: ErrorCodes.ORCHESTRATION_CAPABILITY_DENIED,
        message: 'Capability or operation is not declared and enabled by the passport.',
      });
      continue;
    }
    if (
      canonicalize(capability.inputSchema) !== canonicalize(node.inputSchema) ||
      canonicalize(capability.outputSchema) !== canonicalize(node.outputSchema)
    ) {
      errors.push({
        path: `${path}.inputSchema`,
        code: ErrorCodes.ORCHESTRATION_SCHEMA_INVALID,
        message: 'Node schemas must match the selected passport capability schemas.',
      });
    }
  }
  return {
    ...result,
    valid: errors.length === 0,
    errors,
    references: { connectionsById, passportsById, capabilitiesByKey },
  };
}

function serializeDefinition(definitionInput) {
  const definition =
    typeof definitionInput?.toObject === 'function' ? definitionInput.toObject() : definitionInput;
  return {
    definitionId: idOf(definition),
    organizationId: definition.organizationId,
    workspaceId: definition.workspaceId,
    name: definition.name,
    description: definition.description || '',
    version: definition.version,
    status: definition.status,
    inputSchema: definition.inputSchema,
    outputSchema: definition.outputSchema,
    nodes: (definition.nodes || []).map((node) => ({
      nodeKey: node.nodeKey,
      displayName: node.displayName,
      connectionId: idOf(node.connectionId),
      passportId: idOf(node.passportId),
      capability: node.capability,
      operation: node.operation,
      inputSchema: node.inputSchema,
      outputSchema: node.outputSchema,
      inputMapping: node.inputMapping,
      timeoutMs: node.timeoutMs,
      retryPolicy: node.retryPolicy,
      approvalRequirement: node.approvalRequirement,
      policyContext: node.policyContext,
      continueOnFailure: node.continueOnFailure === true,
      dependencies: node.dependencies || [],
    })),
    edges: definition.edges || [],
    nodeCount: definition.nodes?.length || 0,
    concurrencyLimit: definition.concurrencyLimit,
    maxRunDurationMs: definition.maxRunDurationMs,
    maxNodeExecutions: definition.maxNodeExecutions,
    defaultNodeTimeoutMs: definition.defaultNodeTimeoutMs,
    createdBy: definition.createdBy,
    updatedBy: definition.updatedBy,
    activatedBy: definition.activatedBy,
    activatedAt: definition.activatedAt,
    validatedAt: definition.validatedAt,
    createdAt: definition.createdAt,
    updatedAt: definition.updatedAt,
  };
}

function serializeRun(runInput, progress) {
  const run = typeof runInput?.toObject === 'function' ? runInput.toObject() : runInput;
  const startedAt = run.startedAt ? new Date(run.startedAt) : null;
  const endAt = run.completedAt ? new Date(run.completedAt) : new Date();
  return {
    runId: idOf(run),
    organizationId: run.organizationId,
    workspaceId: run.workspaceId,
    definitionId: idOf(run.definitionId),
    definitionName: run.definitionName,
    definitionVersion: run.definitionVersion,
    status: run.status,
    safeInputSummary: run.input !== undefined ? redactedSummary(run.input) : run.safeInputSummary,
    finalOutputSummary:
      run.finalOutput !== undefined ? redactedSummary(run.finalOutput) : run.finalOutputSummary,
    failureSummary: run.failureSummary || null,
    requestedBy: run.requestedBy,
    traceId: run.traceId,
    requestId: run.requestId,
    concurrencyLimit: run.concurrencyLimit,
    maxRunDurationMs: run.maxRunDurationMs,
    nodeExecutionCount: run.nodeExecutionCount,
    activeNodeCount: run.activeNodeCount,
    progress: progress || run.progress,
    startedAt: run.startedAt || null,
    completedAt: run.completedAt || null,
    cancelRequestedAt: run.cancelRequestedAt || null,
    cancelledAt: run.cancelledAt || null,
    durationMs: startedAt ? Math.max(0, endAt.getTime() - startedAt.getTime()) : null,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

function serializeNodeRun(nodeInput) {
  const node = typeof nodeInput?.toObject === 'function' ? nodeInput.toObject() : nodeInput;
  return {
    nodeRunId: idOf(node),
    orchestrationRunId: idOf(node.orchestrationRunId),
    nodeKey: node.nodeKey,
    connectionId: idOf(node.connectionId),
    passportId: idOf(node.passportId),
    passportVersion: node.passportVersion,
    capability: node.capability,
    operation: node.operation,
    status: node.status,
    dependencyNodeKeys: node.dependencyNodeKeys || [],
    attempt: node.attempt,
    maxAttempts: node.maxAttempts,
    nextAttemptAt: node.nextAttemptAt || null,
    timeoutMs: node.timeoutMs,
    invocationId: idOf(node.invocationId) || null,
    requestId: node.requestId,
    traceId: node.traceId,
    parentTraceId: node.parentTraceId,
    approvalRequestId: node.approvalRequestId || null,
    approvalStatus: node.status === 'waiting_approval' ? 'pending' : null,
    safeFailure: node.safeFailure || null,
    startedAt: node.startedAt || null,
    completedAt: node.completedAt || null,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

async function createDefinition(input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.definition.create', 'OrchestrationDefinition', null, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'MUTATION' });
  const normalized = normalizeDefinitionInput(input);
  throwDefinitionValidation(validateDefinitionDocument(normalized));
  let definition;
  try {
    definition = await OrchestrationDefinition.create({
      ...normalized,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      version: 1,
      status: 'draft',
      createdBy: scope.actorId,
      updatedBy: scope.actorId,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, ErrorCodes.CONFLICT, 'An orchestration version already uses this name.');
    }
    throw error;
  }
  metrics.increment('orchestration_definitions_created', { status: 'draft' });
  await audit('orchestration.definition.created', 'OrchestrationDefinition', definition, scope, {
    definitionId: idOf(definition),
    version: definition.version,
    status: definition.status,
    nodeCount: definition.nodes.length,
  });
  return serializeDefinition(definition);
}

async function listDefinitions(input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.definition.read', 'OrchestrationDefinition', null, scope, caller);
  const paging = pagination(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (input.status) {
    const status = String(input.status).toLowerCase();
    if (!ORCHESTRATION_DEFINITION_STATUSES.includes(status))
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Definition status filter is invalid.');
    filter.status = status;
  }
  const search = safeSearch(input.search || input.q);
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }];
  const [items, total] = await Promise.all([
    OrchestrationDefinition.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip(paging.skip)
      .limit(paging.limit)
      .lean(),
    OrchestrationDefinition.countDocuments(filter),
  ]);
  return {
    items: items.map(serializeDefinition),
    pagination: { page: paging.page, limit: paging.limit, total },
  };
}

async function scopedDefinition(definitionId, scope, options = {}) {
  if (!mongoose.isValidObjectId(definitionId)) {
    throw new AppError(404, ErrorCodes.ORCHESTRATION_DEFINITION_NOT_FOUND, 'Orchestration definition was not found.');
  }
  const query = OrchestrationDefinition.findOne({
    _id: definitionId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
  });
  if (options.lean) query.lean();
  const definition = await query;
  if (!definition) {
    throw new AppError(404, ErrorCodes.ORCHESTRATION_DEFINITION_NOT_FOUND, 'Orchestration definition was not found.');
  }
  return definition;
}

async function getDefinition(definitionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.definition.read', 'OrchestrationDefinition', definitionId, scope, caller);
  return serializeDefinition(await scopedDefinition(definitionId, scope, { lean: true }));
}

async function updateDefinition(definitionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.definition.update', 'OrchestrationDefinition', definitionId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'MUTATION' });
  const current = await scopedDefinition(definitionId, scope);
  if (current.status === 'archived') {
    throw new AppError(409, ErrorCodes.ORCHESTRATION_DEFINITION_IMMUTABLE, 'Archived definitions are immutable.');
  }
  const normalized = normalizeDefinitionInput(input, current.toObject());
  throwDefinitionValidation(validateDefinitionDocument(normalized));
  let updated;
  if (current.status === 'active') {
    const latest = await OrchestrationDefinition.findOne({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      name: current.name,
    })
      .sort({ version: -1 })
      .select('version')
      .lean();
    updated = await OrchestrationDefinition.create({
      ...normalized,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      version: Number(latest?.version || current.version) + 1,
      status: 'draft',
      createdBy: scope.actorId,
      updatedBy: scope.actorId,
    });
  } else {
    Object.assign(current, normalized, { updatedBy: scope.actorId });
    updated = await current.save();
  }
  await audit('orchestration.definition.updated', 'OrchestrationDefinition', updated, scope, {
    definitionId: idOf(updated),
    version: updated.version,
    status: updated.status,
    nodeCount: updated.nodes.length,
  });
  return serializeDefinition(updated);
}

async function validateDefinition(definitionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.definition.validate', 'OrchestrationDefinition', definitionId, scope, caller);
  const definition = await scopedDefinition(definitionId, scope);
  const result = await validateReferences(definition.toObject(), scope);
  if (result.valid) {
    definition.validatedAt = new Date();
    definition.validationDigest = definitionDigest(definition.toObject());
    definition.updatedBy = scope.actorId;
    await definition.save();
  }
  await audit('orchestration.definition.validated', 'OrchestrationDefinition', definition, scope, {
    definitionId: idOf(definition),
    version: definition.version,
    status: result.valid ? 'valid' : 'invalid',
    reasonCode: result.errors[0]?.code,
  });
  return {
    valid: result.valid,
    errors: result.errors,
    roots: result.roots,
    topologicalOrder: result.topologicalOrder,
    validationDigest: result.valid ? definition.validationDigest : null,
  };
}

async function activateDefinition(definitionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.definition.activate', 'OrchestrationDefinition', definitionId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'MUTATION' });
  const definition = await scopedDefinition(definitionId, scope);
  if (definition.status === 'active') return serializeDefinition(definition);
  if (definition.status !== 'draft') {
    throw new AppError(409, ErrorCodes.ORCHESTRATION_DEFINITION_IMMUTABLE, 'Only draft definitions may be activated.');
  }
  const plain = definition.toObject();
  const validation = await validateReferences(plain, scope);
  throwDefinitionValidation(validation);
  for (const node of plain.nodes) {
    const connection = validation.references.connectionsById.get(idOf(node.connectionId));
    const passport = validation.references.passportsById.get(idOf(node.passportId));
    const capability = validation.references.capabilitiesByKey.get(`${idOf(node.passportId)}:${node.capability}`);
    await authorize(
      'orchestration.definition.activate',
      'OrchestrationNodeDefinition',
      `${definitionId}:${node.nodeKey}`,
      scope,
      caller,
      { trustedConnection: connection, trustedPassport: passport, trustedCapability: capability },
    );
  }
  definition.status = 'active';
  definition.activatedBy = scope.actorId;
  definition.activatedAt = new Date();
  definition.validatedAt = new Date();
  definition.validationDigest = definitionDigest(plain);
  definition.updatedBy = scope.actorId;
  const activated = await definition.save();
  metrics.increment('orchestration_definitions_activated', { status: 'active' });
  await audit('orchestration.definition.activated', 'OrchestrationDefinition', activated, scope, {
    definitionId: idOf(activated),
    version: activated.version,
    status: activated.status,
    nodeCount: activated.nodes.length,
  });
  return serializeDefinition(activated);
}

async function archiveDefinition(definitionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.definition.archive', 'OrchestrationDefinition', definitionId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'MUTATION' });
  const definition = await scopedDefinition(definitionId, scope);
  if (definition.status === 'archived') return serializeDefinition(definition);
  definition.status = 'archived';
  definition.archivedAt = new Date();
  definition.updatedBy = scope.actorId;
  const archived = await definition.save();
  await audit('orchestration.definition.archived', 'OrchestrationDefinition', archived, scope, {
    definitionId: idOf(archived),
    version: archived.version,
    status: archived.status,
  });
  return serializeDefinition(archived);
}

async function startRun(definitionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.run.create', 'OrchestrationDefinition', definitionId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'QUEUE_SUBMISSION' });
  const definition = await scopedDefinition(definitionId, scope);
  if (definition.status !== 'active') {
    throw new AppError(409, ErrorCodes.ORCHESTRATION_DEFINITION_IMMUTABLE, 'Only active definitions may start runs.');
  }
  const runInput = validateAgainstSchema(definition.inputSchema, input.input || {}, {
    path: '$run.input',
    code: 'ORCHESTRATION_RUN_INPUT_INVALID',
    message: 'Run input does not match the definition schema.',
  });
  const plain = definition.toObject();
  const validation = await validateReferences(plain, scope);
  throwDefinitionValidation(validation);
  const snapshot = safeDefinitionSnapshot(plain);
  const normalizedKey = normalizeClientKey(input.idempotencyKey);
  const idempotencyKeyHash = secureDigest('orchestration-run-key', normalizedKey.value);
  const requestFingerprint = secureDigest(
    'orchestration-run-request',
    canonicalize({ definitionId: idOf(definition), version: definition.version, input: runInput }),
  );
  const existing = await OrchestrationRun.findOne({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    idempotencyKeyHash,
  }).select('+input +finalOutput +idempotencyKeyHash +requestFingerprint');
  if (existing) {
    if (!hashesEqual(existing.requestFingerprint, requestFingerprint)) {
      throw new AppError(409, ErrorCodes.IDEMPOTENCY_CONFLICT, 'Idempotency key is bound to another orchestration run.');
    }
    return { ...serializeRun(existing), idempotencyReplayed: true };
  }
  let run;
  const now = new Date();
  try {
    run = await OrchestrationRun.create({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      definitionId: definition._id,
      definitionName: definition.name,
      definitionVersion: definition.version,
      status: 'queued',
      input: runInput,
      requestedBy: scope.actorId,
      traceId: scope.traceId || `trace_${secureDigest('orchestration-trace', normalizedKey.value).slice(-48)}`,
      requestId: scope.requestId || `req_${secureDigest('orchestration-request', normalizedKey.value).slice(-48)}`,
      idempotencyKeyHash,
      requestFingerprint,
      clientIdempotencyProvided: normalizedKey.clientProvided,
      concurrencyLimit: snapshot.concurrencyLimit,
      maxRunDurationMs: snapshot.maxRunDurationMs,
      maxNodeExecutions: snapshot.maxNodeExecutions,
      definitionSnapshot: snapshot,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const replay = await OrchestrationRun.findOne({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      idempotencyKeyHash,
    }).select('+input +finalOutput +idempotencyKeyHash +requestFingerprint');
    if (!replay || !hashesEqual(replay.requestFingerprint, requestFingerprint)) {
      throw new AppError(409, ErrorCodes.IDEMPOTENCY_CONFLICT, 'Idempotency key is bound to another orchestration run.');
    }
    return { ...serializeRun(replay), idempotencyReplayed: true };
  }
  const nodeRuns = snapshot.nodes.map((node) => ({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    orchestrationRunId: run._id,
    nodeKey: node.nodeKey,
    connectionId: node.connectionId,
    passportId: node.passportId,
    passportVersion: node.passportVersion,
    capability: node.capability,
    operation: node.operation,
    status: node.dependencies.length ? 'blocked' : 'ready',
    dependencyNodeKeys: node.dependencies,
    continueOnFailure: node.continueOnFailure,
    attempt: 0,
    maxAttempts: node.retryPolicy.maxAttempts,
    timeoutMs: node.timeoutMs,
    requestId: `req_${secureDigest('orchestration-node-request', `${idOf(run)}:${node.nodeKey}`).slice(-48)}`,
    traceId: `trace_${secureDigest('orchestration-node-trace', `${run.traceId}:${node.nodeKey}`).slice(-48)}`,
    parentTraceId: run.traceId,
  }));
  try {
    await OrchestrationNodeRun.insertMany(nodeRuns, { ordered: true });
  } catch (error) {
    await OrchestrationRun.updateOne(
      { _id: run._id, status: 'queued' },
      {
        $set: {
          status: 'failed',
          completedAt: new Date(),
          failureSummary: {
            code: ErrorCodes.INTERNAL_SERVER_ERROR,
            message: 'Node execution records could not be initialized.',
            category: 'persistence',
            requestId: run.requestId,
            traceId: run.traceId,
            occurredAt: new Date(),
          },
        },
      },
    );
    throw error;
  }
  metrics.increment('orchestration_runs_started');
  metrics.increment('orchestration_nodes_ready', {}, nodeRuns.filter((node) => node.status === 'ready').length);
  await audit('orchestration.run.created', 'OrchestrationRun', run, scope, {
    orchestrationRunId: idOf(run),
    definitionId: idOf(definition),
    version: definition.version,
    status: run.status,
    nodeCount: nodeRuns.length,
  });
  for (const node of nodeRuns.filter((item) => item.status === 'ready')) {
    await audit('orchestration.node.ready', 'OrchestrationNodeRun', `${idOf(run)}:${node.nodeKey}`, scope, {
      orchestrationRunId: idOf(run),
      nodeKey: node.nodeKey,
      status: 'ready',
    });
  }
  return { ...serializeRun(run, { total: nodeRuns.length, ready: nodeRuns.filter((node) => node.status === 'ready').length }), idempotencyReplayed: false };
}

async function progressByRunIds(runIds) {
  if (!runIds.length) return new Map();
  const rows = await OrchestrationNodeRun.aggregate([
    { $match: { orchestrationRunId: { $in: runIds } } },
    { $group: { _id: { runId: '$orchestrationRunId', status: '$status' }, count: { $sum: 1 } } },
  ]);
  const result = new Map();
  for (const row of rows) {
    const runId = idOf(row._id.runId);
    const current = result.get(runId) || { total: 0 };
    current[row._id.status] = row.count;
    current.total += row.count;
    result.set(runId, current);
  }
  return result;
}

async function listRuns(input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.run.read', 'OrchestrationRun', null, scope, caller);
  const paging = pagination(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (input.status) {
    const statuses = String(input.status).split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (!statuses.length || statuses.some((status) => !ORCHESTRATION_RUN_STATUSES.includes(status)))
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Run status filter is invalid.');
    filter.status = { $in: statuses.slice(0, 10) };
  }
  if (input.definitionId) {
    if (!mongoose.isValidObjectId(input.definitionId)) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Run definition filter is invalid.');
    }
    filter.definitionId = input.definitionId;
  }
  const search = safeSearch(input.search || input.q);
  if (search) filter.definitionName = new RegExp(search, 'i');
  const [items, total] = await Promise.all([
    OrchestrationRun.find(filter).sort({ createdAt: -1, _id: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    OrchestrationRun.countDocuments(filter),
  ]);
  const progress = await progressByRunIds(items.map((item) => item._id));
  return {
    items: items.map((item) => serializeRun(item, progress.get(idOf(item)))),
    pagination: { page: paging.page, limit: paging.limit, total },
  };
}

async function scopedRun(runId, scope, options = {}) {
  if (!mongoose.isValidObjectId(runId)) {
    throw new AppError(404, ErrorCodes.ORCHESTRATION_RUN_NOT_FOUND, 'Orchestration run was not found.');
  }
  const query = OrchestrationRun.findOne({
    _id: runId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
  });
  if (options.privateFields) query.select('+input +finalOutput +definitionSnapshot +idempotencyKeyHash +requestFingerprint');
  if (options.lean) query.lean();
  const run = await query;
  if (!run) throw new AppError(404, ErrorCodes.ORCHESTRATION_RUN_NOT_FOUND, 'Orchestration run was not found.');
  return run;
}

async function getRun(runId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.run.read', 'OrchestrationRun', runId, scope, caller);
  const run = await scopedRun(runId, scope, { privateFields: true, lean: true });
  const progress = await progressByRunIds([run._id]);
  return serializeRun(run, progress.get(idOf(run)));
}

async function listRunNodes(runId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.run.read', 'OrchestrationRun', runId, scope, caller);
  await scopedRun(runId, scope, { lean: true });
  const paging = pagination(input);
  const filter = {
    orchestrationRunId: runId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
  };
  if (input.status) {
    const status = String(input.status).toLowerCase();
    if (!['blocked', 'ready', 'queued', 'running', 'retry_wait', 'waiting_approval', 'succeeded', 'failed', 'cancelled', 'skipped'].includes(status))
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Node status filter is invalid.');
    filter.status = status;
  }
  const [items, total] = await Promise.all([
    OrchestrationNodeRun.find(filter).sort({ nodeKey: 1, _id: 1 }).skip(paging.skip).limit(paging.limit).lean(),
    OrchestrationNodeRun.countDocuments(filter),
  ]);
  return { items: items.map(serializeNodeRun), pagination: { page: paging.page, limit: paging.limit, total } };
}

async function cancelRun(runId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.run.cancel', 'OrchestrationRun', runId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'LIFECYCLE_CONTROL' });
  let run = await scopedRun(runId, scope);
  if (TERMINAL_RUN_STATUSES.includes(run.status)) {
    return { ...serializeRun(run), idempotent: true };
  }
  const now = new Date();
  if (run.status !== 'cancel_requested') {
    run = await OrchestrationRun.findOneAndUpdate(
      { _id: run._id, status: { $nin: [...TERMINAL_RUN_STATUSES, 'cancel_requested'] } },
      { $set: { status: 'cancel_requested', cancelRequestedAt: now } },
      { new: true, runValidators: true },
    );
    if (!run) run = await scopedRun(runId, scope);
    await audit('orchestration.run.cancel_requested', 'OrchestrationRun', runId, scope, {
      orchestrationRunId: runId,
      status: 'cancel_requested',
      reasonCode: 'USER_REQUESTED',
    });
    metrics.increment('orchestration_cancellations');
  }
  const cancellable = await OrchestrationNodeRun.find({
    orchestrationRunId: run._id,
    status: { $in: ['blocked', 'ready', 'queued', 'retry_wait', 'waiting_approval'] },
  }).select('_id nodeKey status');
  if (cancellable.length) {
    await OrchestrationNodeRun.updateMany(
      { _id: { $in: cancellable.map((node) => node._id) }, status: { $in: ['blocked', 'ready', 'queued', 'retry_wait', 'waiting_approval'] } },
      { $set: { status: 'cancelled', completedAt: now }, $unset: { nextAttemptAt: 1 } },
    );
    for (const node of cancellable) {
      await audit('orchestration.node.cancelled', 'OrchestrationNodeRun', node._id, scope, {
        orchestrationRunId: idOf(run),
        nodeKey: node.nodeKey,
        fromState: node.status,
        toState: 'cancelled',
        status: 'cancelled',
      });
    }
  }
  const running = await OrchestrationNodeRun.find({
    orchestrationRunId: run._id,
    status: 'running',
    invocationId: { $exists: true, $ne: null },
  }).select('invocationId connectionId');
  const connections = await PassportConnection.find({ _id: { $in: running.map((node) => node.connectionId) } })
    .select('_id receivingUserId')
    .lean();
  const connectionsById = new Map(connections.map((item) => [idOf(item), item]));
  await Promise.allSettled(
    running.map((node) => {
      const connection = connectionsById.get(idOf(node.connectionId));
      if (!connection) return undefined;
      return cancelInvocation(
        idOf(node.invocationId),
        {
          receivingWorkspaceId: scope.workspaceId,
          receivingUserId: connection.receivingUserId,
          reasonCode: 'USER_REQUESTED',
        },
        { partner: caller.partner, requestId: caller.requestId, traceId: caller.traceId },
      );
    }),
  );
  const active = await OrchestrationNodeRun.countDocuments({ orchestrationRunId: run._id, status: 'running' });
  if (active === 0) {
    run = await OrchestrationRun.findOneAndUpdate(
      { _id: run._id, status: 'cancel_requested' },
      { $set: { status: 'cancelled', cancelledAt: now, completedAt: now, activeNodeCount: 0 } },
      { new: true, runValidators: true },
    );
    if (run) {
      await audit('orchestration.run.cancelled', 'OrchestrationRun', run, scope, {
        orchestrationRunId: idOf(run),
        fromState: 'cancel_requested',
        toState: 'cancelled',
        status: 'cancelled',
      });
    }
  }
  return { ...serializeRun(run || (await scopedRun(runId, scope))), idempotent: false };
}

async function ensureOrchestrationIndexes() {
  for (const Model of [OrchestrationDefinition, OrchestrationRun, OrchestrationNodeRun]) {
    await Model.createIndexes();
  }
  return { models: ['OrchestrationDefinition', 'OrchestrationRun', 'OrchestrationNodeRun'] };
}

module.exports = {
  activateDefinition,
  archiveDefinition,
  cancelRun,
  createDefinition,
  ensureOrchestrationIndexes,
  getDefinition,
  getRun,
  listDefinitions,
  listRunNodes,
  listRuns,
  normalizeDefinitionInput,
  serializeDefinition,
  serializeNodeRun,
  serializeRun,
  startRun,
  updateDefinition,
  validateDefinition,
  validateReferences,
};
