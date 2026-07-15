const Ajv = require('ajv');
const crypto = require('node:crypto');
const AgentPassport = require('../models/AgentPassport');
const Capability = require('../models/Capability');
const PassportConnection = require('../models/PassportConnection');
const Invocation = require('../models/Invocation');
const InvocationAttempt = require('../models/InvocationAttempt');
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
const { retryPolicyDecision } = require('../utils/retryPolicy');
const {
  createInvocationIdempotency,
  hashesEqual,
  isDuplicateKeyError,
} = require('../utils/idempotency');
const { env } = require('../config/env');
const {
  initialLifecycleFields,
  claimInvocationExecution,
  transitionInvocation,
  transitionUpdate,
} = require('./invocationLifecycle.service');
const {
  INVOCATION_ATTEMPT_STATUSES,
  SAFE_INVOCATION_ATTEMPT_STAGES,
} = require('../constants/invocationLifecycle');
const { OPERATION_STAGE_NAMES, MAX_INVOCATION_STAGE_METRICS } = require('../constants/operations');
const {
  evaluateCircuit,
  recordCircuitFailure,
  recordCircuitSuccess,
  releaseCircuitProbe,
} = require('./circuitBreaker.service');
const { acquireRuntimeCapacity, releaseRuntimeCapacity } = require('./runtimeCapacity.service');
const {
  currentHealth,
  recordConnectionFailure,
  recordConnectionSuccess,
} = require('./connectionHealth.service');
const { serviceLifecycle } = require('./serviceLifecycle.service');
const { serializeOperationalInvocation } = require('../utils/invocationControlView');

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
    actorType: ['system', 'partner'].includes(actor.actorType) ? actor.actorType : 'user',
    actorId: actor.actorId || connection.receivingUserId,
    requestId: actor.requestId,
    traceId: actor.traceId,
  };
}

async function releaseNonFailureProbe(context, circuitEvaluation, actor, observer, reasonCode) {
  if (!circuitEvaluation?.probe || !context?.connection) return false;
  try {
    await releaseCircuitProbe(context.connection, 'runtime', actor.runtimeProtectionOptions);
    observer?.emit?.('info', 'circuit.probe_completed', {
      status: 'deferred',
      circuitState: 'half_open',
      reasonCode,
    });
    return true;
  } catch (error) {
    observer?.emit?.('warn', 'persistence.runtime_protection.failed', {
      ...errorFields(error),
      status: 'failed',
    });
    return false;
  }
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
  const lifecycleState =
    invocation.lifecycleState ||
    { queued: 'accepted', running: 'running', completed: 'succeeded', failed: 'failed' }[
      invocation.status
    ] ||
    'accepted';
  return {
    invocationId: idOf(invocation),
    connectionId: idOf(invocation.connectionId),
    passportId: idOf(invocation.passportId),
    capability: invocation.capability,
    status: invocation.status,
    lifecycleState,
    attemptCount: Number.isInteger(invocation.attemptCount) ? invocation.attemptCount : 0,
    retryState: invocation.retryState || 'not_evaluated',
    retryReason: invocation.retryDecisionReason || null,
    retryScheduledAt: invocation.retryScheduledAt || null,
    recoveryRequired: lifecycleState === 'recovery_required',
    recoveryReason: invocation.recoveryReasonCode || null,
    output: invocation.output,
    error: invocation.error,
    durationMs: invocation.durationMs,
    runtimeStatus: invocation.runtimeStatus,
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
  return {
    code: error.code || ErrorCodes.INTERNAL_SERVER_ERROR,
    internalCode: error.internalCode,
    operation: error.operation,
    stage: error.stage,
    retryable: isRetryableError(error),
    timeoutReason: error.timeoutReason || error.reason,
    causeCode: error.cause?.code,
    causeName: error.cause?.name,
    durationMs: error.durationMs,
    providerHttpStatus: error.providerHttpStatus,
  };
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

async function persistInvocationProgress({
  invocation,
  receivingWorkspaceId,
  stage,
  observer,
  connection,
  actor,
  extra = {},
}) {
  if (!invocation) return invocation;
  const at = new Date();
  try {
    const updated = await Invocation.findOneAndUpdate(
      {
        _id: invocation._id,
        receivingWorkspaceId,
        lifecycleState: {
          $in: ['accepted', 'validating', 'authorized', 'running', 'waiting_for_runtime'],
        },
      },
      {
        $set: {
          lastProgressAt: at,
          lastProgressStage: stage,
          ...(stage === 'outbound_request_started'
            ? { runtimeDeadlineAt: new Date(at.getTime() + env.RUNTIME_INVOCATION_TIMEOUT_MS) }
            : {}),
          ...extra,
        },
      },
      { new: true, runValidators: true },
    );
    if (!updated) return invocation;
    observer?.emit?.('info', 'invocation.progress.updated', {
      invocationId: idOf(invocation),
      stage,
      status: 'completed',
    });
    if (connection && actor) {
      await bestEffortInvocationAudit({
        action: 'invocation.progress.updated',
        actor,
        connection,
        invocation: updated,
        observer,
        metadata: { reasonCode: 'PROGRESS_STAGE_CHANGED', stage },
      });
    }
    return updated;
  } catch (error) {
    observer?.emit?.('warn', 'persistence.invocation_progress.failed', {
      invocationId: idOf(invocation),
      stage,
      errorCode: safeCode(error?.code) || ErrorCodes.INTERNAL_SERVER_ERROR,
      status: 'failed',
    });
    return invocation;
  }
}

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_CAUSE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/;

function definedFields(value) {
  return Object.fromEntries(Object.entries(value || {}).filter(([, item]) => item !== undefined));
}

function safeCode(value) {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return SAFE_CODE_PATTERN.test(normalized) ? normalized : undefined;
}

function safeCauseName(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return SAFE_CAUSE_NAME_PATTERN.test(normalized) ? normalized : undefined;
}

function auditMetadata(connection, invocation, extra = {}) {
  return definedFields({
    receivingWorkspaceId: connection.receivingWorkspaceId,
    receivingUserId: connection.receivingUserId,
    connectionId: idOf(connection),
    passportId: idOf(invocation.passportId || connection.passportId),
    invocationId: idOf(invocation),
    capability: invocation.capability,
    runtimeType: invocation.runtimeType || connection.runtimeType,
    ...extra,
  });
}

async function bestEffortInvocationAudit({
  action,
  actor,
  connection,
  invocation,
  observer,
  metadata,
}) {
  try {
    await createAuditLog(
      actor.actorType,
      actor.actorId,
      action,
      'Invocation',
      idOf(invocation),
      auditMetadata(connection, invocation, metadata),
      {
        requestId: actor.requestId,
        traceId: actor.traceId,
        invocationId: idOf(invocation),
      },
    );
    return undefined;
  } catch (error) {
    observer?.emit('warn', 'persistence.audit.failed', {
      status: 'failed',
      action,
      errorCode: safeCode(error?.code) || ErrorCodes.INTERNAL_SERVER_ERROR,
      invocationId: idOf(invocation),
    });
    return error;
  }
}

async function recordStateAudit({
  invocation,
  connection,
  actor,
  observer,
  fromState,
  toState,
  reasonCode,
  attemptNumber,
}) {
  await bestEffortInvocationAudit({
    action: 'invocation.state.changed',
    actor,
    connection,
    invocation,
    observer,
    metadata: { fromState, toState, reasonCode, attemptNumber },
  });
}

async function transitionAndAudit(options) {
  const invocation = await transitionInvocation(options);
  await recordStateAudit({ ...options, invocation });
  return invocation;
}

async function queryWithPrivateInvocationFields(filter) {
  const query = Invocation.findOne(filter);
  const selected =
    typeof query?.select === 'function'
      ? query.select(
          '+idempotencyKeyHash +requestFingerprint +idempotencyScope +executionLeaseId +executionLeaseExpiresAt +executionOwner',
        )
      : query;
  if (typeof selected?.exec === 'function') return selected.exec();
  if (typeof selected?.lean === 'function') return selected.lean();
  return selected;
}

async function reserveInvocation({ connection, capabilityName, input, actor, observer }) {
  let idempotency;
  try {
    idempotency = createInvocationIdempotency({
      clientKey: actor.idempotencyKey,
      connectionId: idOf(connection),
      capability: capabilityName,
      input,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Invocation request could not be normalized.',
    );
  }

  const lifecycle = initialLifecycleFields({
    state: 'accepted',
    reasonCode: 'INVOCATION_CREATED',
    traceId: actor.traceId,
    requestId: actor.requestId,
  });
  try {
    const invocation = await Invocation.create({
      connectionId: connection._id,
      passportId: connection.passportId,
      receivingWorkspaceId: connection.receivingWorkspaceId,
      capability: capabilityName,
      inputSummary: actor.recoveryParentInvocationId
        ? { recoveryReplay: true }
        : redactSecrets(input),
      runtimeType: connection.runtimeType,
      traceId: actor.traceId,
      requestId: actor.requestId,
      idempotencyScope: idempotency.scope,
      idempotencyKeyHash: idempotency.keyHash,
      requestFingerprint: idempotency.requestFingerprint,
      clientIdempotencyProvided: idempotency.clientProvided,
      ...(actor.recoveryParentInvocationId
        ? { recoveryParentInvocationId: actor.recoveryParentInvocationId }
        : {}),
      ...lifecycle,
    });
    return { invocation, idempotency, replayed: false };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
  }

  let existing = await queryWithPrivateInvocationFields({
    receivingWorkspaceId: connection.receivingWorkspaceId,
    idempotencyScope: idempotency.scope,
    idempotencyKeyHash: idempotency.keyHash,
  });
  if (!existing || !hashesEqual(existing.requestFingerprint, idempotency.requestFingerprint)) {
    if (existing) {
      const conflictActor = actorFor(connection, actor);
      await bestEffortInvocationAudit({
        action: 'invocation.idempotency_conflict',
        actor: conflictActor,
        connection,
        invocation: existing,
        observer,
        metadata: { reasonCode: 'IDEMPOTENCY_REQUEST_MISMATCH' },
      });
    }
    throw new AppError(
      409,
      ErrorCodes.IDEMPOTENCY_CONFLICT,
      'Idempotency-Key was already used for a different invocation request.',
    );
  }

  await bestEffortInvocationAudit({
    action: 'invocation.idempotency_replayed',
    actor: actorFor(connection, actor),
    connection,
    invocation: existing,
    observer,
    metadata: { reasonCode: 'IDEMPOTENT_REPLAY' },
  });
  return { invocation: existing, idempotency, replayed: true };
}

async function startInvocationAttempt({
  invocation,
  connection,
  idempotency,
  executionLeaseId,
  actor,
  observer,
}) {
  if ((invocation.attemptCount || 0) >= env.RUNTIME_RETRY_MAX_ATTEMPTS) {
    throw new AppError(
      409,
      ErrorCodes.INVOCATION_ATTEMPT_LIMIT_REACHED,
      'Invocation attempt limit has been reached.',
    );
  }
  const claimed = await Invocation.findOneAndUpdate(
    {
      _id: invocation._id,
      receivingWorkspaceId: connection.receivingWorkspaceId,
      lifecycleState: 'running',
      executionLeaseId,
    },
    { $inc: { attemptCount: 1 } },
    { new: true, runValidators: true },
  );
  if (!claimed) {
    throw new AppError(
      409,
      ErrorCodes.INVOCATION_CONCURRENT_CLAIM_REJECTED,
      'Invocation execution is no longer owned by this request.',
    );
  }
  const attemptNumber = claimed.attemptCount;
  const startedAt = new Date();
  const attempt = await InvocationAttempt.create({
    invocationId: claimed._id,
    receivingWorkspaceId: connection.receivingWorkspaceId,
    connectionId: connection._id,
    attemptNumber,
    status: 'started',
    startedAt,
    traceId: actor.traceId,
    requestId: actor.requestId,
    runtimeType: connection.runtimeType,
    operation: 'runtime_invocation',
    safeStage: 'external_runtime_invocation',
    idempotencyKeyHash: idempotency.keyHash,
  });
  observer.emit('info', 'invocation.attempt.started', {
    invocationId: idOf(claimed),
    attemptNumber,
    status: 'started',
  });
  await bestEffortInvocationAudit({
    action: 'invocation.attempt.started',
    actor: actorFor(connection, actor),
    connection,
    invocation: claimed,
    observer,
    metadata: { attemptNumber, fromState: 'running', toState: 'waiting_for_runtime' },
  });
  return { invocation: claimed, attempt, attemptNumber, startedAt };
}

function safeAttemptFailure(error) {
  const stage = SAFE_INVOCATION_ATTEMPT_STAGES.includes(error?.stage) ? error.stage : undefined;
  const providerHttpStatus = Number(error?.providerHttpStatus);
  return definedFields({
    safeStage: stage,
    errorCode: safeCode(error?.code) || ErrorCodes.INTERNAL_SERVER_ERROR,
    causeCode: safeCode(error?.cause?.code),
    causeName: safeCauseName(error?.cause?.name || error?.name),
    retryable: isRetryableError(error),
    providerHttpStatus:
      Number.isInteger(providerHttpStatus) && providerHttpStatus >= 100 && providerHttpStatus <= 599
        ? providerHttpStatus
        : undefined,
    timeoutReason: safeCode(error?.timeoutReason || error?.reason),
  });
}

async function finishInvocationAttempt({
  attempt,
  status,
  error,
  retryDecision,
  outcomeAmbiguous = false,
  actor,
  connection,
  invocation,
  observer,
}) {
  if (!INVOCATION_ATTEMPT_STATUSES.includes(status) || status === 'started') {
    throw new TypeError('Attempt completion status is invalid.');
  }
  const completedAt = new Date();
  const completion = {
    status,
    completedAt,
    durationMs: Math.max(0, completedAt.getTime() - new Date(attempt.startedAt).getTime()),
    outcomeAmbiguous,
    ...(error ? safeAttemptFailure(error) : {}),
    ...(retryDecision
      ? {
          retryDecision: retryDecision.allowed ? 'allowed' : 'denied',
          retryDecisionReason: retryDecision.reason,
          ...(retryDecision.allowed
            ? { retryScheduledAt: new Date(Date.now() + retryDecision.delayMs) }
            : {}),
        }
      : { retryDecision: 'not_evaluated' }),
  };
  const completedAttempt = await InvocationAttempt.findOneAndUpdate(
    { _id: attempt._id, status: 'started' },
    { $set: completion },
    { new: true, runValidators: true },
  );
  if (!completedAttempt) {
    observer.emit('info', 'invocation.attempt.terminal_preserved', {
      invocationId: idOf(invocation),
      attemptNumber: attempt.attemptNumber,
      status: 'preserved',
    });
    return attempt;
  }
  const action =
    status === 'succeeded' ? 'invocation.attempt.completed' : 'invocation.attempt.failed';
  observer.emit(status === 'succeeded' ? 'info' : 'warn', action, {
    invocationId: idOf(invocation),
    attemptNumber: completedAttempt.attemptNumber,
    durationMs: completedAttempt.durationMs,
    status,
    errorCode: completedAttempt.errorCode,
    retryDecision: completedAttempt.retryDecision,
    retryReason: completedAttempt.retryDecisionReason,
  });
  await bestEffortInvocationAudit({
    action,
    actor: actorFor(connection, actor),
    connection,
    invocation,
    observer,
    metadata: {
      attemptNumber: completedAttempt.attemptNumber,
      durationMs: completedAttempt.durationMs,
      errorCode: completedAttempt.errorCode,
      retryDecision: completedAttempt.retryDecision,
      reasonCode: completedAttempt.retryDecisionReason,
    },
  });
  return completedAttempt;
}

function ambiguousRuntimeOutcome(error, execution = {}) {
  if (error?.recoveryRequired === true) return true;
  if (execution.responsePersistenceUncertain === true) return true;
  if (!execution.externalCallStarted || error?.providerHttpStatus) return false;
  return [
    ErrorCodes.SAFE_FETCH_TIMEOUT,
    ErrorCodes.SAFE_FETCH_FAILED,
    ErrorCodes.SAFE_FETCH_RESPONSE_TOO_LARGE,
  ].includes(error?.code);
}

function recoveryReasonFor(error, execution = {}) {
  if (safeCode(error?.recoveryReason)) return safeCode(error.recoveryReason);
  if (execution.responsePersistenceUncertain) return 'RESPONSE_PERSISTENCE_UNCERTAIN';
  if (error?.code === ErrorCodes.SAFE_FETCH_TIMEOUT) return 'REMOTE_TIMEOUT_OUTCOME_AMBIGUOUS';
  return 'REMOTE_OUTCOME_AMBIGUOUS';
}

function terminalStateForError(error, ambiguous) {
  if (ambiguous) return 'recovery_required';
  const code = String(error?.code || '').toUpperCase();
  if (Number(error?.providerHttpStatus) === 504 || /(?:TIMEOUT|TIMED_OUT)/.test(code)) {
    return 'timed_out';
  }
  return 'failed';
}

function retryDecisionForRuntime(error, context, invocation, attemptNumber, ambiguous) {
  if (ambiguous) {
    return {
      allowed: false,
      reason: 'AMBIGUOUS_OUTCOME_REQUIRES_RECOVERY',
      delayMs: null,
      nextAttemptNumber: null,
    };
  }
  return retryPolicyDecision({
    errorCode: error?.code,
    errorName: error?.name,
    retryable: isRetryableError(error),
    operation: 'runtime_invocation',
    stage: error?.stage,
    runtimeType: context.connection.runtimeType,
    httpMethod: context.passport.runtime?.method,
    capabilityRetryPolicy: context.capability.retryPolicy,
    idempotencySupported: false,
    remoteIdempotencyAcknowledged: false,
    clientIdempotencyProvided: invocation.clientIdempotencyProvided === true,
    attemptNumber,
    providerHttpStatus: error?.providerHttpStatus,
    mayCreateExternalSideEffects: true,
  });
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

async function loadInvocationContext(
  connectionId,
  capabilityName,
  actor,
  observer,
  loadedConnection,
) {
  const connection =
    loadedConnection ||
    (await observer.stage('connection_lookup', () => loadConnection(connectionId)));
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
  let lifecycleAdmission = serviceLifecycle.beginInvocationAdmission();
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
  let connection;
  let idempotency;
  let attempt;
  let attemptNumber = 0;
  let externalCallStarted = false;
  let responseValidated = false;
  let circuitEvaluation;
  let circuitProbeSettled = false;
  let capacityLease;
  let lifecycleRegistration;
  observer.emit('info', 'runtime.invocation.started', { status: 'started' });
  try {
    const normalizedCapabilityName = await observer.stage('request_validation', async () =>
      requireString(capabilityName, 'capability'),
    );
    connection = await observer.stage('connection_lookup', () => loadConnection(connectionId));
    assertConnectionOwnership(connection, actor);
    auditActor = actorFor(connection, actor);

    const reservation = await observer.stage('invocation_persistence', () =>
      reserveInvocation({
        connection,
        capabilityName: normalizedCapabilityName,
        input,
        actor,
        observer,
      }),
    );
    invocation = reservation.invocation;
    idempotency = reservation.idempotency;
    observer = observer.child({ invocationId: idOf(invocation) });
    if (reservation.replayed) {
      await actor.onInvocationCreated?.(idOf(invocation));
      observer.emit('info', 'runtime.invocation.idempotency_replayed', {
        status: 'replayed',
        lifecycleState: invocation.lifecycleState,
      });
      return {
        ...serializeInvocation(invocation),
        idempotencyReplayed: true,
      };
    }

    lifecycleRegistration = serviceLifecycle.registerInvocation(idOf(invocation), {
      workspaceId: connection.receivingWorkspaceId,
      connectionId: idOf(connection),
      admission: lifecycleAdmission,
    });
    lifecycleAdmission = undefined;
    if (lifecycleRegistration.signal.aborted) {
      throw lifecycleRegistration.signal.reason;
    }

    observer.emit('info', 'invocation.state.changed', {
      fromState: null,
      toState: 'accepted',
      reasonCode: 'INVOCATION_CREATED',
      status: 'completed',
    });
    await recordStateAudit({
      invocation,
      connection,
      actor: auditActor,
      observer,
      fromState: null,
      toState: 'accepted',
      reasonCode: 'INVOCATION_CREATED',
    });
    invocation = await transitionAndAudit({
      invocationId: idOf(invocation),
      receivingWorkspaceId: connection.receivingWorkspaceId,
      fromState: 'accepted',
      toState: 'validating',
      reasonCode: 'REQUEST_VALIDATION_STARTED',
      traceId: actor.traceId,
      requestId: actor.requestId,
      observer,
      connection,
      actor: auditActor,
    });
    await actor.onInvocationCreated?.(idOf(invocation));
    invocation = await persistInvocationProgress({
      invocation,
      receivingWorkspaceId: connection.receivingWorkspaceId,
      stage: 'validation_started',
      observer,
      connection,
      actor: auditActor,
    });

    context = await loadInvocationContext(
      connectionId,
      normalizedCapabilityName,
      actor,
      observer,
      connection,
    );
    observer = observer.child({
      connectionId: idOf(context.connection),
      agentId: idOf(context.passport),
      capabilityId: idOf(context.capability),
      capabilityName: context.capability.name,
    });
    await observer.stage('request_validation', async () =>
      validateCapabilityInput(context.capability, input),
    );
    invocation = await transitionAndAudit({
      invocationId: idOf(invocation),
      receivingWorkspaceId: connection.receivingWorkspaceId,
      fromState: 'validating',
      toState: 'authorized',
      reasonCode: 'INVOCATION_AUTHORIZED',
      traceId: actor.traceId,
      requestId: actor.requestId,
      observer,
      connection,
      actor: auditActor,
    });
    invocation = await persistInvocationProgress({
      invocation,
      receivingWorkspaceId: connection.receivingWorkspaceId,
      stage: 'authorized',
      observer,
      connection,
      actor: auditActor,
    });

    if (currentHealth(context.connection) === 'disabled') {
      throw new AppError(409, ErrorCodes.CONNECTION_DISABLED, 'Connection is disabled.', [], {
        connectionId: idOf(context.connection),
      });
    }

    circuitEvaluation = await evaluateCircuit(
      context.connection,
      'runtime',
      actor.runtimeProtectionOptions,
    );
    if (circuitEvaluation.transitioned === 'half_opened') {
      observer.emit('info', 'circuit.half_opened', {
        status: 'half_open',
        circuitState: 'half_open',
      });
      observer.emit('info', 'circuit.probe_started', { status: 'started' });
      await bestEffortInvocationAudit({
        action: 'circuit.half_opened',
        actor: auditActor,
        connection,
        invocation,
        observer,
        metadata: { circuitState: 'half_open' },
      });
      await bestEffortInvocationAudit({
        action: 'circuit.probe_started',
        actor: auditActor,
        connection,
        invocation,
        observer,
        metadata: { circuitState: 'half_open' },
      });
    }

    try {
      capacityLease = await acquireRuntimeCapacity(
        context.connection,
        idOf(invocation),
        actor.runtimeProtectionOptions,
      );
      observer.emit('info', 'capacity.acquired', {
        status: 'acquired',
        leaseDurationMs: capacityLease.bypassed
          ? undefined
          : Math.max(0, new Date(capacityLease.leaseExpiresAt).getTime() - Date.now()),
      });
      await bestEffortInvocationAudit({
        action: 'capacity.acquired',
        actor: auditActor,
        connection,
        invocation,
        observer,
        metadata: { reasonCode: 'RUNTIME_CAPACITY_ACQUIRED' },
      });
    } catch (capacityError) {
      observer.emit('warn', 'capacity.rejected', {
        status: 'rejected',
        reasonCode: capacityError.reasonCode,
      });
      await bestEffortInvocationAudit({
        action: 'capacity.rejected',
        actor: auditActor,
        connection,
        invocation,
        observer,
        metadata: { reasonCode: capacityError.reasonCode },
      });
      throw capacityError;
    }

    const adapter = adapters[context.connection.runtimeType];
    if (!adapter || typeof adapter.invoke !== 'function') {
      throw new AppError(
        501,
        ErrorCodes.ADAPTER_NOT_IMPLEMENTED,
        `${context.connection.runtimeType.toUpperCase()} runtime invocation is not implemented in v1.`,
      );
    }

    if (context.connection.runtimeType === 'mcp' && adapter.remoteTransportImplemented === false) {
      adapterResultOrThrow(
        await adapter.invoke(context.connection, context.capability, input),
        context.connection.runtimeType,
      );
    }

    let credentialHeaders = {};
    if (context.connection.runtimeType === 'rest') {
      credentialHeaders = await credentialHeadersForConnection(
        context.connection,
        context.passport.auth,
        { observer },
      );
    }

    const executionOwner = `gateway-${process.pid}-${crypto.randomUUID()}`;
    const claim = await claimInvocationExecution({
      invocationId: idOf(invocation),
      receivingWorkspaceId: connection.receivingWorkspaceId,
      executionOwner,
      executionLeaseId: capacityLease?.leaseId,
      reasonCode: 'EXECUTION_CLAIMED',
      traceId: actor.traceId,
      requestId: actor.requestId,
      observer,
      onRecoveryRequired: (recovered, metadata) =>
        bestEffortInvocationAudit({
          action: 'invocation.recovery.eligible',
          actor: auditActor,
          connection,
          invocation: recovered,
          observer,
          metadata,
        }),
    });
    invocation = claim.invocation;
    lifecycleRegistration?.setExecutionOwnership({
      workspaceId: connection.receivingWorkspaceId,
      connectionId: idOf(connection),
      executionOwner,
      executionLeaseId: claim.executionLeaseId,
    });
    await recordStateAudit({
      invocation,
      connection,
      actor: auditActor,
      observer,
      fromState: 'authorized',
      toState: 'running',
      reasonCode: 'EXECUTION_CLAIMED',
    });

    const startedAttempt = await startInvocationAttempt({
      invocation,
      connection,
      idempotency,
      executionLeaseId: claim.executionLeaseId,
      actor,
      observer,
    });
    invocation = startedAttempt.invocation;
    attempt = startedAttempt.attempt;
    attemptNumber = startedAttempt.attemptNumber;
    let result;
    invocation = await persistInvocationProgress({
      invocation,
      receivingWorkspaceId: connection.receivingWorkspaceId,
      stage: 'request_mapped',
      observer,
      connection,
      actor: auditActor,
    });
    const beforeTransmit = async () => {
      if (lifecycleRegistration?.signal?.aborted) {
        throw lifecycleRegistration.signal.reason;
      }
      invocation = await transitionAndAudit({
        invocationId: idOf(invocation),
        receivingWorkspaceId: connection.receivingWorkspaceId,
        fromState: 'running',
        toState: 'waiting_for_runtime',
        reasonCode: 'RUNTIME_REQUEST_TRANSMISSION_STARTED',
        attemptNumber,
        traceId: actor.traceId,
        requestId: actor.requestId,
        observer,
        connection,
        actor: auditActor,
      });
      invocation = await persistInvocationProgress({
        invocation,
        receivingWorkspaceId: connection.receivingWorkspaceId,
        stage: 'outbound_request_started',
        observer,
        connection,
        actor: auditActor,
      });
      externalCallStarted = true;
      lifecycleRegistration?.markExternalCallStarted();
    };
    if (context.connection.runtimeType === 'mcp') {
      await beforeTransmit();
      result = await adapter.invoke(context.connection, context.capability, input);
    } else {
      result = await adapter.invoke({
        runtime: context.passport.runtime,
        input,
        credentialHeaders,
        observability: {
          observer,
          traceId: actor.traceId,
          requestId: actor.requestId,
          invocationId: idOf(invocation),
          idempotencyKey: actor.remoteIdempotencyKeyHash || idempotency.keyHash,
          signal: lifecycleRegistration?.signal,
          beforeTransmit,
        },
      });
    }
    adapterResultOrThrow(result, context.connection.runtimeType);
    invocation = await persistInvocationProgress({
      invocation,
      receivingWorkspaceId: connection.receivingWorkspaceId,
      stage: 'remote_response_received',
      observer,
      connection,
      actor: auditActor,
    });
    invocation = await persistInvocationProgress({
      invocation,
      receivingWorkspaceId: connection.receivingWorkspaceId,
      stage: 'response_validation_started',
      observer,
      connection,
      actor: auditActor,
    });
    await observer.stage('response_validation', async () =>
      validateCapabilityOutput(context.capability, result.output),
    );
    responseValidated = true;
    try {
      const [circuitResult, healthResult] = await Promise.all([
        recordCircuitSuccess(context.connection, 'runtime', actor.runtimeProtectionOptions).then(
          (result) => {
            if (circuitEvaluation?.probe) circuitProbeSettled = true;
            return result;
          },
        ),
        recordConnectionSuccess(context.connection, actor.runtimeProtectionOptions),
      ]);
      if (circuitResult.transitioned === 'closed') {
        observer.emit('info', 'circuit.closed', { status: 'closed', circuitState: 'closed' });
        await bestEffortInvocationAudit({
          action: 'circuit.closed',
          actor: auditActor,
          connection,
          invocation,
          observer,
          metadata: { circuitState: 'closed' },
        });
      }
      if (circuitEvaluation?.probe) {
        observer.emit('info', 'circuit.probe_completed', {
          status: 'succeeded',
          circuitState: circuitResult.state,
        });
        await bestEffortInvocationAudit({
          action: 'circuit.probe_completed',
          actor: auditActor,
          connection,
          invocation,
          observer,
          metadata: { circuitState: circuitResult.state, reasonCode: 'PROBE_SUCCEEDED' },
        });
      }
      if (circuitResult.rateLimitCleared) {
        observer.emit('info', 'rate_limit.protection_cleared', { status: 'cleared' });
      }
      if (healthResult.changed) {
        observer.emit('info', 'connection.health_changed', {
          fromState: healthResult.from,
          toState: healthResult.to,
          status: healthResult.to,
        });
        await bestEffortInvocationAudit({
          action: 'connection.health_changed',
          actor: auditActor,
          connection,
          invocation,
          observer,
          metadata: { fromState: healthResult.from, toState: healthResult.to },
        });
      }
    } catch (protectionPersistenceError) {
      observer.emit('warn', 'persistence.runtime_protection.failed', {
        ...errorFields(protectionPersistenceError),
        status: 'failed',
      });
    }
    await finishInvocationAttempt({
      attempt,
      status: 'succeeded',
      actor,
      connection,
      invocation,
      observer,
    });
    invocation = await persistInvocationProgress({
      invocation,
      receivingWorkspaceId: connection.receivingWorkspaceId,
      stage: 'finalization_started',
      observer,
      connection,
      actor: auditActor,
    });
    invocation = await observer.stage('invocation_persistence', () =>
      transitionAndAudit({
        invocationId: idOf(invocation),
        receivingWorkspaceId: connection.receivingWorkspaceId,
        fromState: 'waiting_for_runtime',
        toState: 'succeeded',
        reasonCode: 'RUNTIME_RESPONSE_VALIDATED',
        attemptNumber,
        traceId: actor.traceId,
        requestId: actor.requestId,
        observer,
        connection,
        actor: auditActor,
        outcome: {
          output: result.output,
          durationMs: Date.now() - startedAt,
          attemptCount: invocation.attemptCount,
          runtimeStatus: result.status,
          stageMetrics,
        },
      }),
    );
    await observer.stage('audit_persistence', () =>
      bestEffortInvocationAudit({
        action: 'invocation.completed',
        actor: auditActor,
        connection,
        invocation,
        observer,
        metadata: { durationMs: invocation.durationMs, remoteStatus: result.status },
      }),
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
      idempotencyReplayed: false,
    };
  } catch (error) {
    let runtimeError = normalizedError(error);
    const lifecycleSignal = lifecycleRegistration?.signal || lifecycleAdmission?.signal;
    if (
      lifecycleSignal?.aborted &&
      lifecycleSignal.reason instanceof AppError &&
      ![ErrorCodes.INVOCATION_CANCELLED, ErrorCodes.SHUTDOWN_INTERRUPTED_INVOCATION].includes(
        runtimeError.code,
      )
    ) {
      // A lifecycle transition may lose a race with cancellation. The registered abort
      // reason remains authoritative and must not be mislabeled as a persistence failure.
      runtimeError = lifecycleSignal.reason;
    }
    runtimeError.retryable = isRetryableError(runtimeError);
    runtimeError.traceId ||= actor.traceId;
    runtimeError.requestId ||= actor.requestId;
    runtimeError.connectionId ||= connectionId;
    if (runtimeError.code === ErrorCodes.INVOCATION_CANCELLED) {
      const current = invocation
        ? await Invocation.findOne({
            _id: invocation._id,
            receivingWorkspaceId: connection?.receivingWorkspaceId,
          })
        : null;
      if (attempt && connection && current) {
        try {
          await finishInvocationAttempt({
            attempt,
            status:
              current.lifecycleState === 'recovery_required' ? 'recovery_required' : 'cancelled',
            error: runtimeError,
            retryDecision: {
              allowed: false,
              reason:
                current.lifecycleState === 'recovery_required'
                  ? 'REMOTE_OUTCOME_UNKNOWN'
                  : 'INVOCATION_CANCELLED',
              delayMs: null,
            },
            outcomeAmbiguous: current.lifecycleState === 'recovery_required',
            actor,
            connection,
            invocation: current,
            observer,
          });
        } catch (attemptPersistenceError) {
          runtimeError.attemptPersistenceErrorCode =
            safeCode(attemptPersistenceError?.code) || ErrorCodes.INTERNAL_SERVER_ERROR;
        }
      }
      runtimeError.invocationId ||= current ? idOf(current) : invocation && idOf(invocation);
      runtimeError.lifecycleState = current?.lifecycleState;
      runtimeError.cancellationState = current?.cancellationState || 'aborting';
      runtimeError.recoveryRequired = current?.lifecycleState === 'recovery_required';
      observer.emit('info', 'runtime.invocation.cancelled', {
        invocationId: runtimeError.invocationId,
        lifecycleState: runtimeError.lifecycleState,
        cancellationState: runtimeError.cancellationState,
        status: 'cancelled',
      });
      circuitProbeSettled =
        (await releaseNonFailureProbe(
          context,
          circuitEvaluation,
          actor,
          observer,
          'INVOCATION_CANCELLED',
        )) || circuitProbeSettled;
      throw runtimeError;
    }
    if (runtimeError.code === ErrorCodes.SHUTDOWN_INTERRUPTED_INVOCATION) {
      const shutdownAmbiguous = externalCallStarted || runtimeError.recoveryRequired === true;
      observer.emit('warn', 'invocation.shutdown_interrupted', {
        status: shutdownAmbiguous ? 'recovery_required' : 'failed',
        reasonCode: shutdownAmbiguous
          ? 'SHUTDOWN_DURING_EXTERNAL_INVOCATION'
          : 'SERVICE_SHUTDOWN_BEFORE_TRANSMISSION',
        invocationId: invocation ? idOf(invocation) : undefined,
      });
      if (invocation && connection) {
        await bestEffortInvocationAudit({
          action: 'invocation.shutdown_interrupted',
          actor: auditActor,
          connection,
          invocation,
          observer,
          metadata: {
            reasonCode: shutdownAmbiguous
              ? 'SHUTDOWN_DURING_EXTERNAL_INVOCATION'
              : 'SERVICE_SHUTDOWN_BEFORE_TRANSMISSION',
          },
        });
      }
      if (!shutdownAmbiguous && invocation && connection) {
        const current = await Invocation.findOne({
          _id: invocation._id,
          receivingWorkspaceId: connection.receivingWorkspaceId,
        });
        if (
          current &&
          ['accepted', 'validating', 'authorized', 'running', 'waiting_for_runtime'].includes(
            current.lifecycleState,
          )
        ) {
          const now = new Date();
          const update = transitionUpdate(current.lifecycleState, 'cancelled', {
            reasonCode: 'SERVICE_SHUTDOWN',
            traceId: actor.traceId,
            requestId: actor.requestId,
            now,
          });
          Object.assign(update.$set, {
            cancellationState: 'confirmed',
            cancellationOutcome: 'local_confirmed',
            cancellationConfirmedAt: now,
            cancelRequestedAt: now,
            cancelRequestedBy: 'system:service-shutdown',
            cancelReasonCode: 'SERVICE_SHUTDOWN',
            recoveryState: 'not_required',
            recoveryEligible: false,
          });
          const cancelled = await Invocation.findOneAndUpdate(
            {
              _id: current._id,
              receivingWorkspaceId: connection.receivingWorkspaceId,
              lifecycleState: current.lifecycleState,
            },
            update,
            { new: true, runValidators: true },
          );
          invocation = cancelled || current;
          if (cancelled) {
            await bestEffortInvocationAudit({
              action: 'invocation.cancel.requested',
              actor: auditActor,
              connection,
              invocation: cancelled,
              observer,
              metadata: { reasonCode: 'SERVICE_SHUTDOWN' },
            });
            await bestEffortInvocationAudit({
              action: 'invocation.cancel.confirmed',
              actor: auditActor,
              connection,
              invocation: cancelled,
              observer,
              metadata: {
                reasonCode: 'SERVICE_SHUTDOWN',
                fromState: current.lifecycleState,
                toState: 'cancelled',
              },
            });
          }
          if (cancelled && attempt) {
            await finishInvocationAttempt({
              attempt,
              status: 'cancelled',
              error: runtimeError,
              retryDecision: {
                allowed: false,
                reason: 'SERVICE_SHUTDOWN_BEFORE_TRANSMISSION',
                delayMs: null,
              },
              outcomeAmbiguous: false,
              actor,
              connection,
              invocation: cancelled,
              observer,
            });
          }
        }
        runtimeError.invocationId ||= idOf(invocation);
        runtimeError.lifecycleState = invocation?.lifecycleState;
        runtimeError.cancellationState = invocation?.cancellationState;
        runtimeError.recoveryRequired = false;
        circuitProbeSettled =
          (await releaseNonFailureProbe(
            context,
            circuitEvaluation,
            actor,
            observer,
            'SERVICE_SHUTDOWN_BEFORE_TRANSMISSION',
          )) || circuitProbeSettled;
        throw runtimeError;
      }
    }
    if (
      [
        ErrorCodes.CIRCUIT_OPEN,
        ErrorCodes.CIRCUIT_HALF_OPEN_PROBE_ACTIVE,
        ErrorCodes.RATE_LIMIT_PROTECTED,
      ].includes(runtimeError.code)
    ) {
      observer.emit('warn', 'circuit.invocation_rejected', {
        status: 'rejected',
        errorCode: runtimeError.code,
        retryAfterMs: runtimeError.retryAfterMs,
        circuitState: runtimeError.circuitState,
      });
      if (invocation && connection) {
        await bestEffortInvocationAudit({
          action: 'circuit.invocation_rejected',
          actor: auditActor,
          connection,
          invocation,
          observer,
          metadata: {
            errorCode: runtimeError.code,
            retryAfterMs: runtimeError.retryAfterMs,
            circuitState: runtimeError.circuitState,
          },
        });
      }
    }
    if (context) {
      try {
        const [circuitResult, healthResult] = await Promise.all([
          recordCircuitFailure(
            context.connection,
            'runtime',
            runtimeError,
            actor.runtimeProtectionOptions,
          ).then((result) => {
            if (circuitEvaluation?.probe && result.classification?.countsTowardCircuit) {
              circuitProbeSettled = true;
            }
            return result;
          }),
          recordConnectionFailure(context.connection, runtimeError, actor.runtimeProtectionOptions),
        ]);
        if (circuitResult.rateLimited) {
          observer.emit('warn', 'rate_limit.protection_started', {
            status: 'active',
            retryAfterMs: runtimeError.retryAfterMs,
          });
          await bestEffortInvocationAudit({
            action: 'rate_limit.protection_started',
            actor: auditActor,
            connection,
            invocation,
            observer,
            metadata: { retryAfterMs: runtimeError.retryAfterMs },
          });
        }
        if (circuitResult.transitioned === 'opened' || circuitResult.reopened) {
          observer.emit('warn', 'circuit.opened', {
            status: 'open',
            circuitState: 'open',
            reasonCode: circuitResult.classification?.reason,
          });
          await bestEffortInvocationAudit({
            action: 'circuit.opened',
            actor: auditActor,
            connection,
            invocation,
            observer,
            metadata: {
              circuitState: 'open',
              reasonCode: circuitResult.classification?.reason,
            },
          });
        }
        if (circuitEvaluation?.probe && circuitResult.classification?.countsTowardCircuit) {
          observer.emit('warn', 'circuit.probe_completed', { status: 'failed' });
          await bestEffortInvocationAudit({
            action: 'circuit.probe_completed',
            actor: auditActor,
            connection,
            invocation,
            observer,
            metadata: { circuitState: 'open', reasonCode: 'PROBE_FAILED' },
          });
        } else if (circuitEvaluation?.probe) {
          await releaseCircuitProbe(context.connection, 'runtime', actor.runtimeProtectionOptions);
          circuitProbeSettled = true;
          observer.emit('info', 'circuit.probe_completed', {
            status: 'deferred',
            circuitState: 'half_open',
            reasonCode: circuitResult.classification?.reason,
          });
          await bestEffortInvocationAudit({
            action: 'circuit.probe_completed',
            actor: auditActor,
            connection,
            invocation,
            observer,
            metadata: {
              circuitState: 'half_open',
              reasonCode: circuitResult.classification?.reason || 'PROBE_NOT_EXECUTED',
            },
          });
        }
        if (healthResult.changed) {
          observer.emit('warn', 'connection.health_changed', {
            fromState: healthResult.from,
            toState: healthResult.to,
            status: healthResult.to,
          });
          await bestEffortInvocationAudit({
            action: 'connection.health_changed',
            actor: auditActor,
            connection,
            invocation,
            observer,
            metadata: { fromState: healthResult.from, toState: healthResult.to },
          });
        }
      } catch (protectionPersistenceError) {
        observer.emit('warn', 'persistence.runtime_protection.failed', {
          ...errorFields(protectionPersistenceError),
          status: 'failed',
        });
      }
    }
    if (invocation) {
      runtimeError.invocationId ||= idOf(invocation);
      const responsePersistenceUncertain = responseValidated;
      let ambiguous = ambiguousRuntimeOutcome(runtimeError, {
        externalCallStarted,
        responsePersistenceUncertain,
      });
      let retryDecision = {
        allowed: false,
        reason: 'EXECUTION_NOT_STARTED',
        delayMs: null,
        nextAttemptNumber: null,
      };
      if (attempt && context) {
        retryDecision = retryDecisionForRuntime(
          runtimeError,
          context,
          invocation,
          attemptNumber,
          ambiguous,
        );
        const retryAction = retryDecision.allowed
          ? 'invocation.retry.allowed'
          : 'invocation.retry.denied';
        observer.emit(retryDecision.allowed ? 'info' : 'warn', retryAction, {
          invocationId: idOf(invocation),
          attemptNumber,
          reasonCode: retryDecision.reason,
          delayMs: retryDecision.delayMs,
          status: retryDecision.allowed ? 'allowed' : 'denied',
        });
        await bestEffortInvocationAudit({
          action: retryAction,
          actor: auditActor,
          connection,
          invocation,
          observer,
          metadata: {
            attemptNumber,
            reasonCode: retryDecision.reason,
            delayMs: retryDecision.delayMs,
          },
        });
        try {
          await finishInvocationAttempt({
            attempt,
            status: ambiguous
              ? 'recovery_required'
              : terminalStateForError(runtimeError, false) === 'timed_out'
                ? 'timed_out'
                : 'failed',
            error: runtimeError,
            retryDecision,
            outcomeAmbiguous: ambiguous,
            actor,
            connection,
            invocation,
            observer,
          });
        } catch (attemptPersistenceError) {
          runtimeError.attemptPersistenceErrorCode =
            safeCode(attemptPersistenceError?.code) || ErrorCodes.INTERNAL_SERVER_ERROR;
          ambiguous = externalCallStarted;
          retryDecision = {
            allowed: false,
            reason: 'ATTEMPT_PERSISTENCE_UNCERTAIN',
            delayMs: null,
            nextAttemptNumber: null,
          };
        }
      }

      const currentState = invocation.lifecycleState;
      const transitionableStates = new Set([
        'validating',
        'authorized',
        'running',
        'waiting_for_runtime',
      ]);
      let targetState = terminalStateForError(runtimeError, ambiguous);
      if (currentState !== 'waiting_for_runtime' && targetState === 'recovery_required') {
        targetState = 'failed';
      }
      if (transitionableStates.has(currentState)) {
        const reasonCode =
          targetState === 'recovery_required'
            ? recoveryReasonFor(runtimeError, { responsePersistenceUncertain })
            : targetState === 'timed_out'
              ? 'INVOCATION_TIMED_OUT'
              : 'INVOCATION_FAILED';
        const retryState =
          targetState === 'recovery_required'
            ? 'recovery_required'
            : retryDecision.reason === 'MAX_ATTEMPTS_REACHED'
              ? 'exhausted'
              : retryDecision.allowed
                ? 'scheduled'
                : 'not_allowed';
        try {
          invocation = await observer.stage('invocation_persistence', () =>
            transitionAndAudit({
              invocationId: idOf(invocation),
              receivingWorkspaceId: connection.receivingWorkspaceId,
              fromState: currentState,
              toState: targetState,
              reasonCode,
              attemptNumber: attemptNumber || undefined,
              traceId: actor.traceId,
              requestId: actor.requestId,
              observer,
              connection,
              actor: auditActor,
              outcome: {
                error: {
                  ...invocationErrorPayload(runtimeError),
                  retryDecisionReason: retryDecision.reason,
                },
                durationMs: Date.now() - startedAt,
                attemptCount: invocation.attemptCount || attemptNumber,
                retryState,
                retryDecisionReason: retryDecision.reason,
                ...(retryDecision.allowed
                  ? { retryScheduledAt: new Date(Date.now() + retryDecision.delayMs) }
                  : {}),
                stageMetrics,
              },
            }),
          );
          runtimeError.lifecycleState = targetState;
          runtimeError.recoveryRequired = targetState === 'recovery_required';
          runtimeError.attemptCount = invocation.attemptCount || attemptNumber;
          runtimeError.retryState = invocation.retryState || retryState;
          runtimeError.retryReason = retryDecision.reason;
          if (targetState === 'recovery_required') {
            observer.emit('warn', 'invocation.recovery_required', {
              invocationId: idOf(invocation),
              attemptNumber,
              reasonCode,
              status: 'recovery_required',
            });
            await bestEffortInvocationAudit({
              action: 'invocation.recovery_required',
              actor: auditActor,
              connection,
              invocation,
              observer,
              metadata: { attemptNumber, reasonCode },
            });
            await bestEffortInvocationAudit({
              action: 'invocation.recovery.eligible',
              actor: auditActor,
              connection,
              invocation,
              observer,
              metadata: { attemptNumber, reasonCode },
            });
          }
        } catch (persistenceError) {
          runtimeError.persistenceErrorCode =
            safeCode(persistenceError?.code) || ErrorCodes.INTERNAL_SERVER_ERROR;
        }
      }
      if (runtimeError.code === ErrorCodes.INVOCATION_CONCURRENT_CLAIM_REJECTED) {
        await bestEffortInvocationAudit({
          action: 'invocation.concurrent_claim_rejected',
          actor: auditActor,
          connection,
          invocation,
          observer,
          metadata: { reasonCode: 'EXECUTION_ALREADY_CLAIMED' },
        });
      }
      if (runtimeError.recoveryRequired !== true) {
        await bestEffortInvocationAudit({
          action: 'invocation.failed',
          actor: auditActor,
          connection,
          invocation,
          observer,
          metadata: {
            errorCode: runtimeError.code,
            retryable: runtimeError.retryable,
            retryDecision: retryDecision.allowed ? 'allowed' : 'denied',
            reasonCode: retryDecision.reason,
            attemptNumber: attemptNumber || undefined,
            durationMs: Date.now() - startedAt,
          },
        });
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
  } finally {
    if (circuitEvaluation?.probe && !circuitProbeSettled && context?.connection) {
      circuitProbeSettled = await releaseNonFailureProbe(
        context,
        circuitEvaluation,
        actor,
        observer,
        'PROBE_CLEANUP_AFTER_PERSISTENCE_FAILURE',
      );
    }
    if (capacityLease) {
      try {
        const released = await releaseRuntimeCapacity(
          capacityLease,
          actor.runtimeProtectionOptions,
        );
        observer.emit('info', 'capacity.released', {
          status: 'released',
          releasedSlots: released.released,
        });
        if (invocation && connection && auditActor) {
          await bestEffortInvocationAudit({
            action: 'capacity.released',
            actor: auditActor,
            connection,
            invocation,
            observer,
            metadata: { releasedSlots: released.released },
          });
        }
      } catch (releaseError) {
        observer.emit('warn', 'capacity.release_failed', {
          ...errorFields(releaseError),
          status: 'failed',
        });
      }
    }
    lifecycleRegistration?.complete();
    lifecycleAdmission?.complete();
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

function requirePartnerActor(actor = {}) {
  if (!actor.partner?._id) {
    throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Partner API key is required.');
  }
  return actor.partner._id;
}

async function listInvocations(input, actor = {}) {
  const identity = requireReceivingIdentity(input);
  const partnerId = requirePartnerActor(actor);
  const connections = await PassportConnection.find({
    partnerId,
    receivingWorkspaceId: identity.receivingWorkspaceId,
    receivingUserId: identity.receivingUserId,
  })
    .select('_id status healthStatus runtimeControl')
    .lean();
  const connectionsById = new Map(connections.map((connection) => [idOf(connection), connection]));
  const connectionIds = connections.map((connection) => connection._id);
  if (!connectionIds.length) return { items: [] };

  const invocations = await Invocation.find({ connectionId: { $in: connectionIds } })
    .sort({ createdAt: -1 })
    .lean();
  return {
    items: invocations.map((invocation) =>
      serializeOperationalInvocation(
        invocation,
        connectionsById.get(idOf(invocation.connectionId)),
      ),
    ),
  };
}

async function getInvocation(invocationId, input, actor = {}) {
  const identity = requireReceivingIdentity(input);
  const partnerId = requirePartnerActor(actor);
  let invocation = await queryWithPrivateInvocationFields({ _id: invocationId });
  if (!invocation) {
    throw new AppError(404, ErrorCodes.INVOCATION_NOT_FOUND, 'Invocation was not found.');
  }
  const connection = await PassportConnection.findOne({
    _id: invocation.connectionId,
    partnerId,
    receivingWorkspaceId: identity.receivingWorkspaceId,
    receivingUserId: identity.receivingUserId,
  });
  if (!connection) {
    throw new AppError(404, ErrorCodes.INVOCATION_NOT_FOUND, 'Invocation was not found.');
  }
  return serializeOperationalInvocation(invocation, connection);
}

function attemptPagination(input = {}) {
  const page = Number(input.page || 1);
  const limit = Number(input.limit || 25);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      {
        path: !Number.isInteger(page) || page < 1 ? 'page' : 'limit',
        message:
          !Number.isInteger(page) || page < 1
            ? 'page must be a positive integer.'
            : 'limit must be an integer between 1 and 100.',
      },
    ]);
  }
  return { page, limit, skip: (page - 1) * limit };
}

function serializeInvocationAttempt(attempt) {
  return {
    attemptId: idOf(attempt),
    invocationId: idOf(attempt.invocationId),
    connectionId: idOf(attempt.connectionId),
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt || null,
    durationMs: Number.isFinite(attempt.durationMs) ? attempt.durationMs : null,
    traceId: attempt.traceId || null,
    requestId: attempt.requestId || null,
    runtimeType: attempt.runtimeType,
    operation: attempt.operation || null,
    safeStage: attempt.safeStage || null,
    errorCode: attempt.errorCode || null,
    retryable: attempt.retryable === true,
    providerHttpStatus: Number.isInteger(attempt.providerHttpStatus)
      ? attempt.providerHttpStatus
      : null,
    timeoutReason: attempt.timeoutReason || null,
    outcomeAmbiguous: attempt.outcomeAmbiguous === true,
    retryDecision: attempt.retryDecision || 'not_evaluated',
    retryReason: attempt.retryDecisionReason || null,
    retryScheduledAt: attempt.retryScheduledAt || null,
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
  };
}

async function listInvocationAttempts(invocationId, input, actor = {}) {
  const identity = requireReceivingIdentity(input);
  const partnerId = requirePartnerActor(actor);
  const pagination = attemptPagination(input);
  const invocation = await Invocation.findOne({ _id: invocationId }).lean();
  if (!invocation) {
    throw new AppError(404, ErrorCodes.INVOCATION_NOT_FOUND, 'Invocation was not found.');
  }
  const connection = await PassportConnection.findOne({
    _id: invocation.connectionId,
    partnerId,
    receivingWorkspaceId: identity.receivingWorkspaceId,
    receivingUserId: identity.receivingUserId,
  })
    .select('_id')
    .lean();
  if (!connection || invocation.receivingWorkspaceId !== identity.receivingWorkspaceId) {
    throw new AppError(404, ErrorCodes.INVOCATION_NOT_FOUND, 'Invocation was not found.');
  }

  const filter = {
    invocationId: invocation._id,
    receivingWorkspaceId: identity.receivingWorkspaceId,
  };
  const [attempts, total] = await Promise.all([
    InvocationAttempt.find(filter)
      .select(
        '_id invocationId connectionId attemptNumber status startedAt completedAt durationMs traceId requestId runtimeType operation safeStage errorCode retryable providerHttpStatus timeoutReason outcomeAmbiguous retryDecision retryDecisionReason retryScheduledAt createdAt updatedAt',
      )
      .sort({ attemptNumber: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    InvocationAttempt.countDocuments(filter),
  ]);
  return {
    items: attempts.map(serializeInvocationAttempt),
    pagination: { page: pagination.page, limit: pagination.limit, total },
  };
}

module.exports = {
  invoke,
  getCapabilities,
  importMcpTools,
  checkHealth,
  listInvocations,
  getInvocation,
  listInvocationAttempts,
  validateCapabilityInput,
  serializeInvocation,
  adapterResultOrThrow,
  assertConnectionOwnership,
  invocationErrorPayload,
  stageMetricCollector,
  serializeInvocationAttempt,
  ambiguousRuntimeOutcome,
};
