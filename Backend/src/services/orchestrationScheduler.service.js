const crypto = require('node:crypto');
const mongoose = require('mongoose');
const OrchestrationRun = require('../models/OrchestrationRun');
const OrchestrationNodeRun = require('../models/OrchestrationNodeRun');
const PassportConnection = require('../models/PassportConnection');
const AgentPassport = require('../models/AgentPassport');
const Capability = require('../models/Capability');
const ApprovalRequest = require('../models/ApprovalRequest');
const AgentSelectionPolicy = require('../models/AgentSelectionPolicy');
const InterAgentDelegationGrant = require('../models/InterAgentDelegationGrant');
const OrchestrationCorrectedInput = require('../models/OrchestrationCorrectedInput');
const { env } = require('../config/env');
const { connectDatabase, databaseStatus, disconnectDatabase } = require('../config/db');
const { invoke: invokeThroughRuntimeGateway } = require('./runtimeGateway.service');
const {
  createApprovalRequest,
  evaluateApprovalRequirement,
  expireIfNeeded,
} = require('./approval.service');
const { assertAuthorized } = require('./authorization.service');
const { assertOperationalAccess } = require('./operationalState.service');
const { assertWorkersNotDraining } = require('./orchestrationObservability.service');
const { ensureOrchestrationIndexes } = require('./orchestration.service');
const { reconcileSelectionApprovals } = require('./agentSelection.service');
const {
  closeRunGrants,
  executeDelegatedInvocation,
} = require('./interAgentDelegation.service');
const { createAuditLog } = require('./auditService');
const { isRetryableError } = require('../utils/retryability');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { logger } = require('../utils/logger');
const metrics = require('./orchestrationMetrics.service');
const {
  TERMINAL_NODE_STATUSES,
  TERMINAL_RUN_STATUSES,
  assertNodeTransition,
  assertRunTransition,
} = require('../constants/orchestration');
const {
  projectValidatedOutput,
  resolveNodeInput,
} = require('./orchestrationMapping.service');
const {
  safeFailure,
  validateAgainstSchema,
} = require('./orchestrationValidation.service');
const { safeClone: safeDelegationClone } = require('./interAgentData.service');
const { decryptCorrectedInput } = require('./orchestrationRecoveryValidation.service');
const {
  assertPartitionFence,
  claimPartition,
  fairSchedule,
  heartbeatWorker,
  registerWorker,
  releaseQuotaReservation,
} = require('./productionScale.service');
const {
  createDeadLetter,
  ensureProductionScaleIndexes,
} = require('./productionScaleOperations.service');

const NON_RETRYABLE_ORCHESTRATION_CODES = new Set([
  ErrorCodes.AUTHENTICATION_REQUIRED,
  ErrorCodes.AUTHORIZATION_DENIED,
  ErrorCodes.FORBIDDEN,
  ErrorCodes.POLICY_EVALUATION_FAILED,
  ErrorCodes.CAPABILITY_INPUT_INVALID,
  ErrorCodes.CAPABILITY_SCHEMA_INVALID,
  ErrorCodes.RUNTIME_OUTPUT_INVALID,
  ErrorCodes.RUNTIME_OUTPUT_MISSING,
  ErrorCodes.PASSPORT_UNAVAILABLE,
  ErrorCodes.CONNECTION_NOT_FOUND,
  ErrorCodes.CONNECTION_PENDING_AUTH,
  ErrorCodes.CREDENTIAL_REQUIRED,
  ErrorCodes.CREDENTIAL_VALIDATION_FAILED,
  ErrorCodes.APPROVAL_REJECTED,
  ErrorCodes.APPROVAL_EXPIRED,
  ErrorCodes.APPROVAL_INVALIDATED,
  ErrorCodes.INVOCATION_CANCELLED,
  'ORCHESTRATION_NODE_INPUT_INVALID',
  'ORCHESTRATION_NODE_OUTPUT_INVALID',
  'ORCHESTRATION_MAPPING_EXPRESSION_REJECTED',
  'ORCHESTRATION_MAPPING_DEPENDENCY_DENIED',
  'ORCHESTRATION_MAPPING_VALUE_MISSING',
]);

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function safeCode(value, fallback = ErrorCodes.INTERNAL_SERVER_ERROR) {
  const code = String(value || '').toUpperCase();
  return /^[A-Z][A-Z0-9_]{0,127}$/.test(code) ? code : fallback;
}

function workerError(error) {
  return {
    code: safeCode(error?.code),
    message: String(error?.message || 'Orchestration worker failed.').slice(0, 300),
  };
}

function isOrchestrationRetryable(error) {
  const code = safeCode(error?.code);
  if (NON_RETRYABLE_ORCHESTRATION_CODES.has(code)) return false;
  return isRetryableError(error);
}

function retryDelay(policy = {}, attempt, random = Math.random) {
  const base = Math.max(1, Number(policy.baseDelayMs || 1_000));
  const maximum = Math.max(base, Number(policy.maxDelayMs || 30_000));
  const exponential = Math.min(maximum, base * 2 ** Math.max(0, Number(attempt || 1) - 1));
  const jitter = Math.round(exponential * 0.2 * Math.max(0, Math.min(1, Number(random()))));
  return Math.min(maximum, exponential + jitter);
}

function availableConcurrency(limit, active) {
  const boundedLimit = Math.max(0, Number.isFinite(Number(limit)) ? Math.floor(Number(limit)) : 0);
  const boundedActive = Math.max(0, Number.isFinite(Number(active)) ? Math.floor(Number(active)) : 0);
  return Math.max(0, boundedLimit - boundedActive);
}

function scopeFor(run, node) {
  return {
    organizationId: run.organizationId,
    workspaceId: run.workspaceId,
    actorId: 'system:orchestration-worker',
    actorType: 'system',
    requestId: node?.requestId || run.requestId,
    traceId: node?.traceId || run.traceId,
  };
}

async function audit(action, type, entityId, run, node, metadata = {}, dependencies = {}) {
  const create = dependencies.createAuditLog || createAuditLog;
  const scope = scopeFor(run, node);
  return create(
    scope.actorType,
    scope.actorId,
    action,
    type,
    idOf(entityId),
    {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      receivingWorkspaceId: scope.workspaceId,
      orchestrationRunId: idOf(run),
      ...(node ? { nodeKey: node.nodeKey } : {}),
      ...metadata,
    },
    { requestId: scope.requestId, traceId: scope.traceId, invocationId: idOf(node?.invocationId) || undefined },
  );
}

function schedulerDependencies(overrides = {}) {
  return {
    OrchestrationRun,
    OrchestrationNodeRun,
    PassportConnection,
    AgentPassport,
    Capability,
    ApprovalRequest,
    AgentSelectionPolicy,
    InterAgentDelegationGrant,
    OrchestrationCorrectedInput,
    invokeThroughRuntimeGateway,
    createApprovalRequest,
    evaluateApprovalRequirement,
    expireIfNeeded,
    assertAuthorized,
    assertOperationalAccess,
    assertWorkersNotDraining,
    createAuditLog,
    ensureOrchestrationIndexes,
    ensureProductionScaleIndexes,
    reconcileSelectionApprovals,
    closeRunGrants,
    executeDelegatedInvocation,
    connectDatabase,
    disconnectDatabase,
    databaseStatus,
    assertPartitionFence,
    claimPartition,
    fairSchedule,
    heartbeatWorker,
    registerWorker,
    releaseQuotaReservation,
    createDeadLetter,
    logger,
    random: Math.random,
    ...overrides,
  };
}

function nodeDefinition(run, nodeKey) {
  return (run.definitionSnapshot?.nodes || []).find((item) => item.nodeKey === nodeKey);
}

function effectiveNodeTarget(node) {
  return node.recoveryTargetSnapshot || node;
}

async function privateRun(Model, runId) {
  return Model.findOne({ _id: runId }).select('+input +finalOutput +definitionSnapshot +recoveryPolicySnapshot');
}

async function transitionNode(node, toState, update = {}, dependencies = {}) {
  const Model = dependencies.OrchestrationNodeRun || OrchestrationNodeRun;
  if (node.leaseOwner && node.partitionKey) {
    await (dependencies.assertPartitionFence || assertPartitionFence)(node, { dependencies });
  }
  assertNodeTransition(node.status, toState);
  const filter = { _id: node._id, status: node.status };
  if (node.leaseOwner) filter.leaseOwner = node.leaseOwner;
  if (node.leaseToken) filter.leaseToken = node.leaseToken;
  if (node.leaseEpoch !== undefined) filter.leaseEpoch = node.leaseEpoch;
  const set = { status: toState, ...update };
  if (TERMINAL_NODE_STATUSES.includes(toState)) set.completedAt ||= new Date();
  const unset = {};
  for (const [key, value] of Object.entries(set)) {
    if (value === undefined) {
      delete set[key];
      unset[key] = 1;
    }
  }
  if (toState !== 'running') {
    unset.leaseOwner = 1;
    unset.leaseToken = 1;
    unset.leaseExpiresAt = 1;
    unset.heartbeatAt = 1;
  }
  if (toState !== 'retry_wait') unset.nextAttemptAt = 1;
  const updated = await Model.findOneAndUpdate(
    filter,
    { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { new: true, runValidators: true },
  ).select('+leaseToken +resumeAttempt +resolvedInput +validatedOutput');
  if (!updated) {
    throw new AppError(
      409,
      ErrorCodes.ORCHESTRATION_NODE_TRANSITION_INVALID,
      'Orchestration node changed before transition.',
      [],
      { fromState: node.status, toState },
    );
  }
  return updated;
}

async function releaseRunSlot(runId, dependencies = {}) {
  const Model = dependencies.OrchestrationRun || OrchestrationRun;
  await Model.updateOne({ _id: runId, activeNodeCount: { $gt: 0 } }, { $inc: { activeNodeCount: -1 } });
}

async function transitionClaimedNode(node, toState, update, run, dependencies) {
  const changed = await transitionNode(node, toState, update, dependencies);
  await releaseRunSlot(run._id, dependencies);
  return changed;
}

async function recoverExpiredLeases(options = {}) {
  const dependencies = schedulerDependencies(options.dependencies);
  const now = options.now || new Date();
  const limit = Math.max(1, Math.min(Number(options.limit || 100), 500));
  const expired = await dependencies.OrchestrationNodeRun.find({
    status: 'running',
    leaseExpiresAt: { $lte: now },
  })
    .select('+leaseToken')
    .sort({ leaseExpiresAt: 1, _id: 1 })
    .limit(limit);
  let recovered = 0;
  for (const node of expired) {
    const updated = await dependencies.OrchestrationNodeRun.findOneAndUpdate(
      {
        _id: node._id,
        status: 'running',
        leaseOwner: node.leaseOwner,
        leaseToken: node.leaseToken,
        leaseExpiresAt: { $lte: now },
      },
      {
        $set: { status: 'ready', resumeAttempt: true },
        $unset: { leaseOwner: 1, leaseToken: 1, leaseExpiresAt: 1, heartbeatAt: 1 },
      },
      { new: true, runValidators: true },
    );
    if (!updated) continue;
    recovered += 1;
    await releaseRunSlot(node.orchestrationRunId, dependencies);
    metrics.increment('orchestration_expired_leases_recovered');
  }
  return { recovered, scanned: expired.length };
}

async function claimNextNode(options = {}) {
  const dependencies = schedulerDependencies(options.dependencies);
  const now = options.now || new Date();
  const workerId = String(options.workerId || `orchestration:${crypto.randomUUID()}`);
  const instanceId = String(options.instanceId || workerId);
  const leaseMs = Number(options.leaseMs || env.ORCHESTRATION_NODE_LEASE_MS || 120_000);
  const eligibility = {
    $or: [
      { status: 'ready' },
      { status: 'retry_wait', nextAttemptAt: { $lte: now } },
    ],
    ...(options.excludedPartitionKeys?.length
      ? { partitionKey: { $nin: options.excludedPartitionKeys } }
      : {}),
  };
  let candidate;
  if (options.fairScheduling === true) {
    const candidates = await dependencies.OrchestrationNodeRun.find(eligibility)
      .select('+resumeAttempt +recoveryTargetSnapshot')
      .sort({ createdAt: 1, _id: 1 })
      .limit(Math.max(10, Math.min(Number(options.fairCandidateLimit || 200), 500)));
    const tenantFilters = [...new Map(candidates.map((item) => [
      `${item.organizationId}\u0000${item.workspaceId}`,
      { organizationId: item.organizationId, workspaceId: item.workspaceId },
    ])).values()];
    const history = tenantFilters.length
      ? await dependencies.OrchestrationNodeRun.aggregate([
          { $match: { claimedAt: { $exists: true }, $or: tenantFilters } },
          { $group: { _id: { organizationId: '$organizationId', workspaceId: '$workspaceId' }, serviceCount: { $sum: 1 }, lastServedAt: { $max: '$claimedAt' } } },
        ])
      : [];
    const tenantServiceCounts = new Map(history.map((item) => [`${item._id.organizationId}\u0000${item._id.workspaceId}`, item.serviceCount]));
    const tenantLastServedAt = new Map(history.map((item) => [`${item._id.organizationId}\u0000${item._id.workspaceId}`, item.lastServedAt]));
    candidate = dependencies.fairSchedule(candidates, { now, tenantServiceCounts, tenantLastServedAt })[0];
  } else {
    candidate = await dependencies.OrchestrationNodeRun.findOne(eligibility)
      .select('+resumeAttempt +recoveryTargetSnapshot')
      .sort({ nextAttemptAt: 1, createdAt: 1, nodeKey: 1 });
  }
  if (!candidate) return null;
  const run = await privateRun(dependencies.OrchestrationRun, candidate.orchestrationRunId);
  if (!run || !['queued', 'running', 'waiting_approval', 'recovering', 'recovered'].includes(run.status)) return null;
  if (run.cancelRequestedAt || run.status === 'cancel_requested') return null;
  if (run.startedAt && Date.now() - new Date(run.startedAt).getTime() >= run.maxRunDurationMs) {
    if (Number(run.activeNodeCount || 0) === 0) {
      await failRun(run, {
        code: 'ORCHESTRATION_RUN_DURATION_EXCEEDED',
        message: 'Orchestration run duration limit was reached.',
        category: 'limit',
      }, dependencies);
    }
    return null;
  }
  try {
    await dependencies.assertOperationalAccess({
      organizationId: run.organizationId,
      workspaceId: run.workspaceId,
      operation: 'WORKER_CLAIM',
    });
    await dependencies.assertWorkersNotDraining({
      organizationId: run.organizationId,
      workspaceId: run.workspaceId,
    });
  } catch (error) {
    if (
      [
        ErrorCodes.EXECUTION_DRAINING,
        ErrorCodes.MAINTENANCE_MODE_ACTIVE,
        'ORCHESTRATION_WORKERS_DRAINING',
      ].includes(error.code)
    ) return null;
    throw error;
  }
  let partitionOwnership;
  if (options.partitionCoordination === true && candidate.partitionKey) {
    partitionOwnership = await dependencies.claimPartition(
      {
        partitionKey: candidate.partitionKey,
        workloadCategory: candidate.workloadCategory || 'orchestration_node',
        routingVersion: candidate.routingVersion || 1,
        partitionNumber: candidate.partitionNumber || 0,
        workerId,
        instanceId,
        leaseMs,
      },
      { dependencies },
    );
    if (!partitionOwnership) {
      metrics.increment('orchestration_scheduler_claim_conflicts', { reason: 'partition_ownership' });
      const excludedPartitionKeys = [...(options.excludedPartitionKeys || []), candidate.partitionKey];
      if (excludedPartitionKeys.length >= 32) return null;
      return claimNextNode({ ...options, dependencies, now, excludedPartitionKeys });
    }
  }
  const resuming = candidate.resumeAttempt === true;
  const slot = await dependencies.OrchestrationRun.findOneAndUpdate(
    {
      _id: run._id,
      status: { $in: ['queued', 'running', 'waiting_approval', 'recovering', 'recovered'] },
      cancelRequestedAt: { $exists: false },
      nodeExecutionCount: { $lt: run.maxNodeExecutions },
      $expr: { $lt: ['$activeNodeCount', '$concurrencyLimit'] },
    },
    {
      $set: { status: 'running', startedAt: run.startedAt || now },
      $inc: { activeNodeCount: 1, ...(resuming ? {} : { nodeExecutionCount: 1 }) },
    },
    { new: true, runValidators: true },
  ).select('+input +definitionSnapshot +recoveryPolicySnapshot');
  if (!slot) {
    const exhausted = await dependencies.OrchestrationRun.findOne({ _id: run._id })
      .select('status nodeExecutionCount maxNodeExecutions activeNodeCount requestId traceId')
      .lean();
    if (
      exhausted &&
      !TERMINAL_RUN_STATUSES.includes(exhausted.status) &&
      Number(exhausted.nodeExecutionCount) >= Number(exhausted.maxNodeExecutions) &&
      Number(exhausted.activeNodeCount || 0) === 0
    ) {
      await failRun(exhausted, {
        code: 'ORCHESTRATION_NODE_EXECUTION_LIMIT_EXCEEDED',
        message: 'Orchestration node execution limit was reached.',
        category: 'limit',
      }, dependencies);
    }
    metrics.increment('orchestration_scheduler_claim_conflicts', { reason: 'run_slot' });
    return null;
  }
  const leaseToken = crypto.randomUUID();
  const filter = { _id: candidate._id, status: candidate.status };
  if (candidate.status === 'retry_wait') filter.nextAttemptAt = { $lte: now };
  const claimed = await dependencies.OrchestrationNodeRun.findOneAndUpdate(
    filter,
    {
      $set: {
        status: 'running',
        leaseOwner: workerId,
        leaseToken,
        partitionOwnershipEpoch: partitionOwnership?.ownershipEpoch,
        leaseExpiresAt: new Date(now.getTime() + leaseMs),
        heartbeatAt: now,
        claimedAt: now,
        startedAt: candidate.startedAt || now,
        resumeAttempt: false,
      },
      $inc: { leaseEpoch: 1, ...(resuming ? {} : { attempt: 1 }) },
      $unset: { nextAttemptAt: 1 },
    },
    { new: true, runValidators: true },
  ).select('+leaseToken +resumeAttempt +resolvedInput +validatedOutput +recoveryTargetSnapshot');
  if (!claimed) {
    await releaseRunSlot(run._id, dependencies);
    if (!resuming) await dependencies.OrchestrationRun.updateOne({ _id: run._id, nodeExecutionCount: { $gt: 0 } }, { $inc: { nodeExecutionCount: -1 } });
    metrics.increment('orchestration_scheduler_claim_conflicts', { reason: 'node_claim' });
    return null;
  }
  const freshRun = await privateRun(dependencies.OrchestrationRun, run._id);
  if (freshRun?.quotaReservationId) {
    await dependencies.releaseQuotaReservation(freshRun.quotaReservationId, { scope: scopeFor(freshRun, claimed) }, { dependencies });
  }
  metrics.increment('orchestration_node_executions');
  await audit('orchestration.node.started', 'OrchestrationNodeRun', claimed._id, freshRun, claimed, {
    fromState: candidate.status,
    toState: 'running',
    status: 'running',
    attempt: claimed.attempt,
  }, dependencies);
  if (!run.startedAt) {
    await audit('orchestration.run.started', 'OrchestrationRun', run._id, freshRun, null, {
      fromState: run.status,
      toState: 'running',
      status: 'running',
    }, dependencies);
  }
  return {
    run: freshRun,
    node: claimed,
    workerId,
    instanceId,
    leaseToken,
    leaseEpoch: claimed.leaseEpoch,
    partitionOwnershipEpoch: claimed.partitionOwnershipEpoch,
  };
}

async function renewNodeLease(node, options = {}) {
  const dependencies = schedulerDependencies(options.dependencies);
  const now = options.now || new Date();
  const leaseMs = Number(options.leaseMs || env.ORCHESTRATION_NODE_LEASE_MS || 120_000);
  if (node.partitionKey) {
    await dependencies.assertPartitionFence(node, { dependencies, now, extendLeaseMs: leaseMs });
  }
  const updated = await dependencies.OrchestrationNodeRun.findOneAndUpdate(
    {
      _id: node._id,
      status: 'running',
      leaseOwner: node.leaseOwner,
      leaseToken: node.leaseToken,
      leaseEpoch: node.leaseEpoch,
      leaseExpiresAt: { $gt: now },
    },
    { $set: { heartbeatAt: now, leaseExpiresAt: new Date(now.getTime() + leaseMs) } },
    { new: true },
  ).select('+leaseToken');
  if (!updated) {
    throw new AppError(409, ErrorCodes.ORCHESTRATION_NODE_LEASE_LOST, 'Orchestration node lease was lost.');
  }
  return updated;
}

async function executionContext(run, node, definition, dependencies) {
  const target = effectiveNodeTarget(node);
  const [connection, passport, capability] = await Promise.all([
    dependencies.PassportConnection.findOne({
      _id: target.connectionId,
      receivingWorkspaceId: run.workspaceId,
      status: 'connected',
      installScope: 'invoke',
      $or: [{ organizationId: run.organizationId }, { partnerId: run.organizationId }],
    }).lean(),
    dependencies.AgentPassport.findOne({ _id: target.passportId, status: 'valid' }).lean(),
    dependencies.Capability.findOne({
      passportId: target.passportId,
      name: node.capability,
      enabled: true,
    }).lean(),
  ]);
  if (!connection) throw new AppError(404, ErrorCodes.CONNECTION_NOT_FOUND, 'Node connection is unavailable.');
  if (!passport || idOf(passport) !== idOf(connection.passportId))
    throw new AppError(409, ErrorCodes.PASSPORT_UNAVAILABLE, 'Node passport is unavailable.');
  if (!capability) throw new AppError(404, ErrorCodes.CAPABILITY_NOT_FOUND, 'Node capability is unavailable.');
  if (String(passport.agent?.version || '') !== String(target.passportVersion || '')) {
    throw new AppError(409, ErrorCodes.PASSPORT_UNAVAILABLE, 'Node passport version no longer matches its run snapshot.');
  }
  if (definition.targetingMode === 'governed_selection') {
    const selectionPolicyFilter = {
      _id: definition.selectionPolicyId,
      organizationId: run.organizationId,
      workspaceId: run.workspaceId,
      version: definition.selectionPolicyVersion,
      status: 'active',
    };
    if (node.recoveryTargetSnapshot) {
      selectionPolicyFilter._id = target.selectionPolicyId || definition.selectionPolicyId;
      selectionPolicyFilter.version = target.selectionPolicyVersion || definition.selectionPolicyVersion;
    }
    const activeSelectionPolicy = await dependencies.AgentSelectionPolicy.findOne(selectionPolicyFilter).lean();
    if (!activeSelectionPolicy) {
      throw new AppError(409, 'AGENT_SELECTION_POLICY_INACTIVE', 'The frozen agent selection policy no longer permits execution.');
    }
  }
  const actor = {
    type: 'system',
    id: 'system:orchestration-worker',
    actorType: 'system',
    actorId: 'system:orchestration-worker',
    organizationId: run.organizationId,
    workspaceId: run.workspaceId,
    trustedSystem: true,
    skipPersistentRoles: true,
  };
  const resource = {
    type: 'OrchestrationNodeRun',
    id: idOf(node),
    organizationId: run.organizationId,
    workspaceId: run.workspaceId,
  };
  const policyContext = {
    requestId: node.requestId,
    traceId: node.traceId,
    trustedSystem: true,
    trustedConnection: connection,
    trustedPassport: passport,
    trustedCapability: capability,
  };
  await dependencies.assertAuthorized(actor, 'orchestration.node.execute', resource, policyContext);
  if (node.attempt > 1) {
    await dependencies.assertAuthorized(actor, 'orchestration.node.retry', resource, policyContext);
  }
  await dependencies.assertOperationalAccess({
    organizationId: run.organizationId,
    workspaceId: run.workspaceId,
    connectionId: target.connectionId,
    operation: 'EXECUTION',
    existingClaim: true,
  });
  return { connection, passport, capability, actor, resource, policyContext, definition, target };
}

async function mappedInput(run, node, definition, context, dependencies) {
  const dependencyRuns = await dependencies.OrchestrationNodeRun.find({
    orchestrationRunId: run._id,
    nodeKey: { $in: node.dependencyNodeKeys },
  }).select('+validatedOutput');
  if (dependencyRuns.some((dependency) => dependency.status !== 'succeeded')) {
    throw new AppError(409, 'ORCHESTRATION_DEPENDENCY_NOT_SUCCEEDED', 'Node dependency did not succeed.');
  }
  await dependencies.assertAuthorized(
    context.actor,
    'orchestration.node.execute',
    { ...context.resource, type: 'OrchestrationDataMapping', id: `${idOf(node)}:mapping` },
    { ...context.policyContext, operation: 'data_mapping' },
  );
  const outputs = Object.fromEntries(
    dependencyRuns.map((dependency) => [dependency.nodeKey, dependency.validatedOutput]),
  );
  const contractEdge = (run.definitionSnapshot.edges || []).find(
    (edge) => edge.to === node.nodeKey && edge.mappingMode === 'contract',
  );
  if (node.correctedInputId) {
    const record = await dependencies.OrchestrationCorrectedInput.findOne({
      _id: node.correctedInputId,
      organizationId: run.organizationId,
      workspaceId: run.workspaceId,
      orchestrationRunId: run._id,
      nodeRunId: node._id,
      version: node.correctedInputVersion,
    }).select('+encryptedPayload +payloadHash');
    if (!record) {
      throw new AppError(
        409,
        'ORCHESTRATION_CORRECTED_INPUT_PAYLOAD_UNAVAILABLE',
        'The immutable corrected input is unavailable.',
      );
    }
    const corrected = decryptCorrectedInput(record);
    const validatedCorrection = validateAgainstSchema(definition.inputSchema, corrected, {
      path: '$node.correctedInput',
      code: 'ORCHESTRATION_CORRECTED_INPUT_SCHEMA_INVALID',
      message: 'Corrected input no longer matches the frozen node schema.',
    });
    if (contractEdge) {
      const source = dependencyRuns.find((dependency) => dependency.nodeKey === contractEdge.from);
      if (!source || !node.delegationGrantId) {
        throw new AppError(409, 'INTER_AGENT_GRANT_NOT_FOUND', 'Corrected contract retry grant is unavailable.');
      }
      return {
        input: undefined,
        contractEdge,
        sourceNodeRunId: source._id,
        sourceOutput: validatedCorrection,
        correctedInputVersion: record.version,
        metadata: {
          runId: idOf(run),
          definitionId: idOf(run.definitionId),
          definitionVersion: run.definitionVersion,
          sourceNodeKey: contractEdge.from,
          targetNodeKey: node.nodeKey,
          correctedInputVersion: record.version,
          traceId: node.traceId,
          requestId: node.requestId,
        },
      };
    }
    return {
      input: validatedCorrection,
      correctedInputVersion: record.version,
    };
  }
  if (contractEdge) {
    const source = dependencyRuns.find((dependency) => dependency.nodeKey === contractEdge.from);
    if (!source || !node.delegationGrantId) {
      throw new AppError(
        409,
        'INTER_AGENT_GRANT_NOT_FOUND',
        'Contract edge delegation grant is unavailable.',
      );
    }
    return {
      input: undefined,
      contractEdge,
      sourceNodeRunId: source._id,
      sourceOutput: source.validatedOutput,
      metadata: {
        runId: idOf(run),
        definitionId: idOf(run.definitionId),
        definitionVersion: run.definitionVersion,
        sourceNodeKey: contractEdge.from,
        targetNodeKey: node.nodeKey,
        traceId: node.traceId,
        requestId: node.requestId,
      },
    };
  }
  return { input: resolveNodeInput(
    definition.inputMapping,
    {
      runInput: run.input,
      nodeOutputs: outputs,
      dependencies: node.dependencyNodeKeys,
      metadata: {
        runId: idOf(run),
        definitionId: idOf(run.definitionId),
        definitionVersion: run.definitionVersion,
        nodeKey: node.nodeKey,
        attempt: node.attempt,
        traceId: node.traceId,
        requestId: node.requestId,
      },
    },
    definition.inputSchema,
  ) };
}

function approvalAction(run, node, context, input) {
  return {
    organizationId: run.organizationId,
    workspaceId: run.workspaceId,
    requesterActorId: run.requestedBy,
    requesterActorType: 'service_account',
    permission: 'connection.invoke',
    resourceType: 'Connection',
    resourceId: idOf(context.connection),
    connectionId: idOf(context.connection),
    passportId: idOf(context.passport),
    capabilityId: idOf(context.capability),
    capabilityClassification: context.capability.classification || 'UNCLASSIFIED',
    capabilityCategory: context.capability.category || 'UNCLASSIFIED',
    sideEffect: context.capability.sideEffect || 'UNKNOWN',
    operationType: 'INVOCATION',
    safeRequestAttributes: input,
  };
}

async function approvalState(run, node, definition, context, input, dependencies) {
  const action = approvalAction(run, node, context, input);
  if (node.approvalRequestId) {
    let request = await dependencies.ApprovalRequest.findOne({
      approvalRequestId: node.approvalRequestId,
      organizationId: run.organizationId,
    });
    if (!request) throw new AppError(409, ErrorCodes.APPROVAL_REQUEST_NOT_FOUND, 'Node approval request is unavailable.');
    request = await dependencies.expireIfNeeded(request);
    if (request.status === 'APPROVED') return { approved: true, approvalRequestId: request.approvalRequestId };
    if (['PENDING', 'PARTIALLY_APPROVED'].includes(request.status)) return { waiting: true, approvalRequestId: request.approvalRequestId };
    const code = request.status === 'EXPIRED' ? ErrorCodes.APPROVAL_EXPIRED : ErrorCodes.APPROVAL_REJECTED;
    throw new AppError(403, code, 'Node approval was not granted.');
  }
  const evaluation = await dependencies.evaluateApprovalRequirement(action);
  const configuredRequired = definition.approvalRequirement?.required === true;
  if (!configuredRequired && !evaluation.required) return { approved: true };
  const created = await dependencies.createApprovalRequest(
    {
      workspaceId: run.workspaceId,
      requesterActorId: run.requestedBy,
      requesterActorType: 'service_account',
      permission: action.permission,
      resourceType: action.resourceType,
      resourceId: action.resourceId,
      operationType: action.operationType,
      connectionId: action.connectionId,
      capabilityId: action.capabilityId,
      passportId: action.passportId,
      capabilityClassification: action.capabilityClassification,
      capabilityCategory: action.capabilityCategory,
      sideEffect: action.sideEffect,
      safeRequestAttributes: input,
      workflowId: definition.approvalRequirement?.workflowId,
      reason: definition.approvalRequirement?.reason || 'Orchestration node approval required.',
      idempotencyKey: `orchestration:${idOf(run)}:${node.nodeKey}:attempt:${node.attempt}`,
    },
    {
      partner: { _id: new mongoose.Types.ObjectId(run.organizationId) },
      requestId: node.requestId,
      traceId: node.traceId,
    },
  );
  await dependencies.ApprovalRequest.updateOne(
    { approvalRequestId: created.approvalRequestId, organizationId: run.organizationId },
    { $set: { orchestrationRunId: idOf(run), orchestrationNodeRunId: idOf(node), orchestrationNodeKey: node.nodeKey } },
  );
  return { waiting: true, approvalRequestId: created.approvalRequestId };
}

function nodeTimeoutError(timeoutMs) {
  return new AppError(504, 'SAFE_FETCH_TIMEOUT', 'Node execution reached its configured timeout.', [], {
    timeoutReason: 'orchestration_node_timeout',
    timeoutMs,
  });
}

async function scheduleFailure(run, node, definition, error, dependencies) {
  const retryable = isOrchestrationRetryable(error);
  const failure = safeFailure(error, {
    retryable,
    requestId: node.requestId,
    traceId: node.traceId,
    attempt: node.attempt,
  });
  if (run.status === 'cancel_requested' || error.code === ErrorCodes.INVOCATION_CANCELLED) {
    const cancelled = await transitionClaimedNode(node, 'cancelled', { safeFailure: failure }, run, dependencies);
    await audit('orchestration.node.cancelled', 'OrchestrationNodeRun', node._id, run, cancelled, {
      fromState: 'running',
      toState: 'cancelled',
      status: 'cancelled',
      reasonCode: failure.code,
    }, dependencies);
    return cancelled;
  }
  if (retryable && node.attempt < node.maxAttempts) {
    try {
      const context = await executionContext(run, node, definition, dependencies);
      await dependencies.assertAuthorized(
        context.actor,
        'orchestration.node.retry',
        context.resource,
        { ...context.policyContext, operation: 'retry' },
      );
      const delayMs = retryDelay(definition.retryPolicy, node.attempt, dependencies.random);
      const retried = await transitionClaimedNode(
        node,
        'retry_wait',
        { safeFailure: failure, nextAttemptAt: new Date(Date.now() + delayMs) },
        run,
        dependencies,
      );
      metrics.increment('orchestration_node_retries');
      await audit('orchestration.node.retried', 'OrchestrationNodeRun', node._id, run, retried, {
        fromState: 'running',
        toState: 'retry_wait',
        status: 'retry_wait',
        reasonCode: failure.code,
        attempt: node.attempt,
      }, dependencies);
      return retried;
    } catch (retryAuthorizationError) {
      error = retryAuthorizationError;
      failure.code = safeCode(retryAuthorizationError.code);
      failure.retryable = false;
    }
  }
  const failed = await transitionClaimedNode(node, 'failed', { safeFailure: failure }, run, dependencies);
  metrics.increment('orchestration_node_failures', { category: failure.httpStatusCategory || 'platform' });
  await audit('orchestration.node.failed', 'OrchestrationNodeRun', node._id, run, failed, {
    fromState: 'running',
    toState: 'failed',
    status: 'failed',
    reasonCode: failure.code,
    attempt: node.attempt,
  }, dependencies);
  if (Number(node.attempt || 0) >= Number(node.maxAttempts || 1)) {
    await dependencies.createDeadLetter(
      {
        organizationId: run.organizationId,
        workspaceId: run.workspaceId,
        safeJobId: `node:${idOf(node)}`,
        sourceType: 'orchestration_node',
        sourceRecordId: idOf(node),
        workloadCategory: node.workloadCategory || 'orchestration_node',
        priorityClass: node.priorityClass || 'standard',
        routingVersion: node.routingVersion || 1,
        partitionNumber: node.partitionNumber || 0,
        safeFailureCode: failure.code,
        attemptCount: node.attempt,
        requestId: node.requestId,
        traceId: node.traceId,
        lastAttemptAt: new Date(),
      },
      { dependencies },
    );
  }
  return failed;
}

async function processClaimedNode(claim, options = {}) {
  const dependencies = schedulerDependencies(options.dependencies);
  let { run, node } = claim;
  const definition = nodeDefinition(run, node.nodeKey);
  if (!definition) throw new AppError(500, ErrorCodes.ORCHESTRATION_DEFINITION_INVALID, 'Run snapshot is missing a node.');
  const controller = options.controller || new AbortController();
  const heartbeatMs = Number(options.heartbeatMs || env.ORCHESTRATION_NODE_HEARTBEAT_MS || 30_000);
  const leaseMs = Number(options.leaseMs || env.ORCHESTRATION_NODE_LEASE_MS || 120_000);
  let heartbeatTimer;
  let heartbeatError;
  const heartbeat = async () => {
    try {
      node = await renewNodeLease(node, { dependencies, leaseMs });
    } catch (error) {
      heartbeatError = error;
      if (!controller.signal.aborted) controller.abort(error);
    }
  };
  heartbeatTimer = setInterval(() => void heartbeat(), heartbeatMs);
  const timeoutTimer = setTimeout(() => {
    if (!controller.signal.aborted) controller.abort(nodeTimeoutError(node.timeoutMs));
  }, node.timeoutMs);
  const started = Date.now();
  try {
    run = await privateRun(dependencies.OrchestrationRun, run._id);
    if (!run) throw new AppError(404, ErrorCodes.ORCHESTRATION_RUN_NOT_FOUND, 'Run is unavailable.');
    if (run.status === 'cancel_requested' || run.cancelRequestedAt) {
      throw new AppError(409, ErrorCodes.INVOCATION_CANCELLED, 'Run cancellation was requested.');
    }
    const context = await executionContext(run, node, definition, dependencies);
    const mapped = await mappedInput(run, node, definition, context, dependencies);
    const input = mapped.input;
    if (!mapped.contractEdge) {
      await dependencies.OrchestrationNodeRun.updateOne(
        { _id: node._id, status: 'running', leaseOwner: node.leaseOwner, leaseToken: node.leaseToken },
        { $set: { resolvedInput: input } },
      );
    }
    const approval = mapped.contractEdge
      ? { approved: true }
      : await approvalState(run, node, definition, context, input, dependencies);
    if (approval.waiting) {
      const waiting = await transitionClaimedNode(
        node,
        'waiting_approval',
        { approvalRequestId: approval.approvalRequestId },
        run,
        dependencies,
      );
      metrics.increment('orchestration_nodes_waiting_approval');
      await audit('orchestration.node.waiting_approval', 'OrchestrationNodeRun', node._id, run, waiting, {
        fromState: 'running',
        toState: 'waiting_approval',
        status: 'waiting_approval',
        approvalRequestId: approval.approvalRequestId,
      }, dependencies);
      await reconcileRun(run._id, { dependencies });
      return waiting;
    }
    const preInvocationRun = await dependencies.OrchestrationRun.findOne({ _id: run._id })
      .select('status cancelRequestedAt')
      .lean();
    if (!preInvocationRun || preInvocationRun.status === 'cancel_requested' || preInvocationRun.cancelRequestedAt) {
      throw new AppError(409, ErrorCodes.INVOCATION_CANCELLED, 'Run cancellation was requested.');
    }
    const runtimeActor = {
        actorType: 'service_account',
        actorId: run.requestedBy,
        type: 'service_account',
        id: run.requestedBy,
        partnerId: run.organizationId,
        organizationId: run.organizationId,
        workspaceId: run.workspaceId,
        receivingWorkspaceId: run.workspaceId,
        skipPersistentRoles: true,
        requestId: node.requestId,
        traceId: node.traceId,
        idempotencyKey: `orchestration:${idOf(run)}:${node.nodeKey}:attempt:${node.attempt}`,
        approvalRequestId: approval.approvalRequestId,
        signal: controller.signal,
        orchestrationContext: {
          orchestrationRunId: idOf(run),
          nodeRunId: idOf(node),
          nodeKey: node.nodeKey,
          parentTraceId: node.parentTraceId,
          traceId: node.traceId,
          requestId: node.requestId,
          attempt: node.attempt,
          capability: node.capability,
          operation: node.operation,
        },
        async onInvocationCreated(invocationId) {
          await dependencies.OrchestrationNodeRun.updateOne(
            { _id: node._id, status: 'running', leaseOwner: node.leaseOwner, leaseToken: node.leaseToken },
            { $set: { invocationId } },
          );
          const latestRun = await dependencies.OrchestrationRun.findOne({ _id: run._id })
            .select('status cancelRequestedAt')
            .lean();
          if (
            (!latestRun || latestRun.status === 'cancel_requested' || latestRun.cancelRequestedAt) &&
            !controller.signal.aborted
          ) {
            controller.abort(new AppError(409, ErrorCodes.INVOCATION_CANCELLED, 'Run cancellation was requested.'));
          }
        },
      };
    const invocation = mapped.contractEdge
      ? await dependencies.executeDelegatedInvocation({
          organizationId: run.organizationId,
          partnerId: run.organizationId,
          workspaceId: run.workspaceId,
          grantId: node.delegationGrantId,
          sourceNodeRunId: mapped.sourceNodeRunId,
          targetNodeRunId: node._id,
          sourceOutput: mapped.sourceOutput,
          runInput: run.input,
          metadata: mapped.metadata,
          dataClassification:
            definition.policyContext?.dataClassification ||
            definition.inputSchema?.['x-data-classification'] ||
            definition.outputSchema?.['x-data-classification'],
          residencyRequirements: definition.policyContext?.residencyRequirements,
          idempotencyKey: `orchestration-delegation:${idOf(run)}:${mapped.contractEdge.from}:${node.nodeKey}`,
          requestedBy: run.requestedBy,
          requestId: node.requestId,
          traceId: node.traceId,
          parentTraceId: node.parentTraceId,
          outputSchema: definition.outputSchema,
          retry: node.attempt > 1,
          signal: controller.signal,
          orchestrationContext: runtimeActor.orchestrationContext,
          onInvocationCreated: runtimeActor.onInvocationCreated,
        })
      : await dependencies.invokeThroughRuntimeGateway(
          idOf(node.connectionId),
          node.capability,
          input,
          runtimeActor,
        );
    if (heartbeatError) throw heartbeatError;
    if (!['succeeded', 'completed'].includes(invocation.lifecycleState) && invocation.status !== 'completed') {
      const pending = new AppError(503, 'ORCHESTRATION_INVOCATION_IN_PROGRESS', 'Runtime invocation is still in progress.');
      pending.retryable = true;
      const failure = safeFailure(pending, {
        retryable: true,
        requestId: node.requestId,
        traceId: node.traceId,
        attempt: node.attempt,
      });
      const retrying = await transitionClaimedNode(
        node,
        'retry_wait',
        {
          invocationId: invocation.invocationId,
          safeFailure: failure,
          nextAttemptAt: new Date(Date.now() + 1_000),
          resumeAttempt: true,
        },
        run,
        dependencies,
      );
      await reconcileRun(run._id, { dependencies });
      return retrying;
    }
    const hasOutgoingContract = (run.definitionSnapshot.edges || []).some(
      (edge) => edge.from === node.nodeKey && edge.mappingMode === 'contract',
    );
    const runtimeOutput = hasOutgoingContract
      ? safeDelegationClone(invocation.output)
      : invocation.output;
    const validated = validateAgainstSchema(definition.outputSchema, runtimeOutput, {
      path: '$node.output',
      code: 'ORCHESTRATION_NODE_OUTPUT_INVALID',
      message: 'Runtime output does not match the node output schema.',
    });
    const output = projectValidatedOutput(validated, node.nodeKey, run.definitionSnapshot);
    const succeeded = await transitionClaimedNode(
      node,
      'succeeded',
      { invocationId: invocation.invocationId, validatedOutput: output, safeFailure: undefined },
      run,
      dependencies,
    );
    metrics.observe('orchestration_node_duration', Date.now() - started);
    await audit('orchestration.node.succeeded', 'OrchestrationNodeRun', node._id, run, succeeded, {
      fromState: 'running',
      toState: 'succeeded',
      status: 'succeeded',
      attempt: node.attempt,
    }, dependencies);
    await reconcileRun(run._id, { dependencies });
    return succeeded;
  } catch (error) {
    if (heartbeatError && error !== heartbeatError) error = heartbeatError;
    const currentRun = (await privateRun(dependencies.OrchestrationRun, run._id)) || run;
    if (error.code === ErrorCodes.ORCHESTRATION_NODE_LEASE_LOST) throw error;
    const result = await scheduleFailure(currentRun, node, definition, error, dependencies);
    await reconcileRun(run._id, { dependencies });
    return result;
  } finally {
    clearInterval(heartbeatTimer);
    clearTimeout(timeoutTimer);
  }
}

async function markNodeFromApproval(node, request, dependencies) {
  const run = await privateRun(dependencies.OrchestrationRun, node.orchestrationRunId);
  if (!run || TERMINAL_RUN_STATUSES.includes(run.status)) return null;
  if (request.status === 'APPROVED') {
    if (node.delegationGrantId) {
      await dependencies.InterAgentDelegationGrant.updateOne(
        {
          _id: node.delegationGrantId,
          status: 'pending',
          approvalRequestId: request.approvalRequestId,
        },
        { $set: { status: 'active', approvedBy: 'approval-system', approvedAt: new Date() } },
      );
    }
    const nextStatus = node.dependencyNodeKeys?.length ? 'blocked' : 'ready';
    const ready = await transitionNode(node, nextStatus, {}, dependencies);
    await audit(`orchestration.node.${nextStatus}`, 'OrchestrationNodeRun', node._id, run, ready, {
      fromState: 'waiting_approval',
      toState: nextStatus,
      status: nextStatus,
      approvalRequestId: request.approvalRequestId,
    }, dependencies);
    if (run.status === 'waiting_approval') {
      await dependencies.OrchestrationRun.updateOne({ _id: run._id, status: 'waiting_approval' }, { $set: { status: 'running' } });
    }
    return ready;
  }
  if (['REJECTED', 'EXPIRED', 'INVALIDATED', 'CANCELLED'].includes(request.status)) {
    const code = request.status === 'EXPIRED' ? ErrorCodes.APPROVAL_EXPIRED : ErrorCodes.APPROVAL_REJECTED;
    if (node.delegationGrantId) {
      await dependencies.InterAgentDelegationGrant.updateOne(
        {
          _id: node.delegationGrantId,
          status: 'pending',
          approvalRequestId: request.approvalRequestId,
        },
        { $set: { status: request.status === 'EXPIRED' ? 'expired' : 'rejected' } },
      );
    }
    const failed = await transitionNode(
      node,
      'failed',
      {
        safeFailure: safeFailure(new AppError(403, code, 'Node approval was not granted.'), {
          retryable: false,
          requestId: node.requestId,
          traceId: node.traceId,
          attempt: node.attempt,
        }),
      },
      dependencies,
    );
    await audit('orchestration.node.failed', 'OrchestrationNodeRun', node._id, run, failed, {
      fromState: 'waiting_approval',
      toState: 'failed',
      status: 'failed',
      reasonCode: code,
      approvalRequestId: request.approvalRequestId,
    }, dependencies);
    return failed;
  }
  return null;
}

async function handleApprovalResolution(approvalRequestId, options = {}) {
  const dependencies = schedulerDependencies(options.dependencies);
  let request = await dependencies.ApprovalRequest.findOne({ approvalRequestId });
  if (!request) return { updated: 0 };
  request = await dependencies.expireIfNeeded(request);
  const nodes = await dependencies.OrchestrationNodeRun.find({
    $or: [{ approvalRequestId }, { selectionApprovalRequestId: approvalRequestId }],
    organizationId: request.organizationId,
    status: 'waiting_approval',
  });
  let updated = 0;
  for (const node of nodes) {
    if (await markNodeFromApproval(node, request, dependencies)) updated += 1;
    await reconcileRun(node.orchestrationRunId, { dependencies });
  }
  return { updated, status: request.status };
}

async function reconcileWaitingApprovals(options = {}) {
  const dependencies = schedulerDependencies(options.dependencies);
  const limit = Math.max(1, Math.min(Number(options.limit || 100), 500));
  const nodes = await dependencies.OrchestrationNodeRun.find({
    status: 'waiting_approval',
    $or: [
      { approvalRequestId: { $exists: true, $ne: null } },
      { selectionApprovalRequestId: { $exists: true, $ne: null } },
    ],
  })
    .select('approvalRequestId selectionApprovalRequestId delegationGrantId')
    .sort({ updatedAt: 1, _id: 1 })
    .limit(limit);
  let updated = 0;
  for (const node of nodes) {
    const result = await handleApprovalResolution(node.selectionApprovalRequestId || node.approvalRequestId, { dependencies });
    updated += result.updated || 0;
  }
  return { scanned: nodes.length, updated };
}

async function releaseBlockedNodes(run, nodes, dependencies) {
  const byKey = new Map(nodes.map((node) => [node.nodeKey, node]));
  let changed = 0;
  for (const node of nodes
    .filter((item) => item.status === 'blocked' && item.operationallyBlocked !== true)
    .sort((a, b) => a.nodeKey.localeCompare(b.nodeKey))) {
    const dependencyRuns = node.dependencyNodeKeys.map((key) => byKey.get(key)).filter(Boolean);
    if (dependencyRuns.length !== node.dependencyNodeKeys.length) continue;
    if (!dependencyRuns.every((dependency) => TERMINAL_NODE_STATUSES.includes(dependency.status))) continue;
    const target = dependencyRuns.every((dependency) => dependency.status === 'succeeded') ? 'ready' : 'skipped';
    const updated = await transitionNode(node, target, {}, dependencies);
    byKey.set(node.nodeKey, updated);
    changed += 1;
    if (target === 'ready') {
      metrics.increment('orchestration_nodes_ready');
      await audit('orchestration.node.ready', 'OrchestrationNodeRun', node._id, run, updated, {
        fromState: 'blocked',
        toState: 'ready',
        status: 'ready',
      }, dependencies);
    }
  }
  return changed;
}

async function cancelPendingNodes(run, dependencies) {
  const pending = await dependencies.OrchestrationNodeRun.find({
    orchestrationRunId: run._id,
    status: { $in: ['blocked', 'ready', 'queued', 'retry_wait', 'waiting_approval'] },
  });
  for (const node of pending) {
    const cancelled = await transitionNode(node, 'cancelled', {}, dependencies);
    await audit('orchestration.node.cancelled', 'OrchestrationNodeRun', node._id, run, cancelled, {
      fromState: node.status,
      toState: 'cancelled',
      status: 'cancelled',
    }, dependencies);
  }
  return pending.length;
}

async function transitionRun(run, toState, update, dependencies) {
  if (run.status === toState) return run;
  assertRunTransition(run.status, toState);
  const updated = await dependencies.OrchestrationRun.findOneAndUpdate(
    { _id: run._id, status: run.status },
    { $set: { status: toState, ...update } },
    { new: true, runValidators: true },
  ).select('+input +finalOutput +definitionSnapshot');
  return updated || privateRun(dependencies.OrchestrationRun, run._id);
}

function finalOutputCandidate(run, nodes) {
  const dependencyKeys = new Set((run.definitionSnapshot.nodes || []).flatMap((node) => node.dependencies || []));
  const terminals = nodes.filter((node) => !dependencyKeys.has(node.nodeKey) && node.status === 'succeeded');
  if (terminals.length === 1) return terminals[0].validatedOutput;
  return Object.fromEntries(terminals.sort((a, b) => a.nodeKey.localeCompare(b.nodeKey)).map((node) => [node.nodeKey, node.validatedOutput]));
}

function hasContractDelegation(run) {
  return (run.definitionSnapshot?.edges || []).some((edge) => edge.mappingMode === 'contract');
}

async function closeDelegationGrants(run, status, dependencies) {
  if (!hasContractDelegation(run)) return { closed: 0 };
  return dependencies.closeRunGrants(run._id, status, scopeFor(run), { dependencies });
}

async function failRun(run, failure, dependencies) {
  await cancelPendingNodes(run, dependencies);
  await closeDelegationGrants(run, 'failed', dependencies);
  const fromState = run.status;
  const failed = await transitionRun(
    run,
    'failed',
    {
      completedAt: new Date(),
      activeNodeCount: 0,
      failureSummary: {
        code: failure.code,
        message: failure.message,
        category: failure.category,
        requestId: run.requestId,
        traceId: run.traceId,
        occurredAt: new Date(),
      },
    },
    dependencies,
  );
  metrics.increment('orchestration_runs_completed', { status: 'failed' });
  await audit('orchestration.run.failed', 'OrchestrationRun', run._id, failed, null, {
    fromState,
    toState: 'failed',
    status: 'failed',
    reasonCode: failure.code,
  }, dependencies);
  return failed;
}

async function reconcileRun(runId, options = {}) {
  const dependencies = schedulerDependencies(options.dependencies);
  let run = await privateRun(dependencies.OrchestrationRun, runId);
  if (!run || TERMINAL_RUN_STATUSES.includes(run.status)) return run;
  let nodes = await dependencies.OrchestrationNodeRun.find({ orchestrationRunId: run._id })
    .select('+validatedOutput +operationallyBlocked');
  let changed;
  do {
    changed = await releaseBlockedNodes(run, nodes, dependencies);
    if (changed) {
      nodes = await dependencies.OrchestrationNodeRun.find({ orchestrationRunId: run._id })
        .select('+validatedOutput +operationallyBlocked');
    }
  } while (changed);

  for (const node of nodes.filter((item) => item.status === 'waiting_approval' && item.approvalRequestId)) {
    const request = await dependencies.ApprovalRequest.findOne({ approvalRequestId: node.approvalRequestId });
    if (!request) continue;
    const current = await dependencies.expireIfNeeded(request);
    if (!['PENDING', 'PARTIALLY_APPROVED'].includes(current.status)) {
      await markNodeFromApproval(node, current, dependencies);
    }
  }
  nodes = await dependencies.OrchestrationNodeRun.find({ orchestrationRunId: run._id })
    .select('+validatedOutput +operationallyBlocked');
  const running = nodes.filter((node) => node.status === 'running').length;
  if (run.status === 'cancel_requested' || run.cancelRequestedAt) {
    await cancelPendingNodes(run, dependencies);
    if (running === 0) {
      await closeDelegationGrants(run, 'cancelled', dependencies);
      run = await transitionRun(run, 'cancelled', { completedAt: new Date(), cancelledAt: new Date(), activeNodeCount: 0 }, dependencies);
      metrics.increment('orchestration_runs_completed', { status: 'cancelled' });
      await audit('orchestration.run.cancelled', 'OrchestrationRun', run._id, run, null, {
        fromState: 'cancel_requested',
        toState: 'cancelled',
        status: 'cancelled',
      }, dependencies);
    }
    return run;
  }
  if (
    run.startedAt &&
    Date.now() - new Date(run.startedAt).getTime() >= run.maxRunDurationMs &&
    running === 0
  ) {
    return failRun(run, {
      code: 'ORCHESTRATION_RUN_DURATION_EXCEEDED',
      message: 'Orchestration run duration limit was reached.',
      category: 'limit',
    }, dependencies);
  }
  const requiredFailure = nodes.find((node) => node.status === 'failed' && node.continueOnFailure !== true);
  if (requiredFailure) {
    await cancelPendingNodes(run, dependencies);
    await closeDelegationGrants(run, 'failed', dependencies);
    const fromState = run.status;
    run = await transitionRun(
      run,
      'failed',
      {
        completedAt: new Date(),
        failureSummary: {
          code: requiredFailure.safeFailure?.code || ErrorCodes.INTERNAL_SERVER_ERROR,
          message: 'A required orchestration node failed.',
          category: 'node_failure',
          requestId: requiredFailure.requestId,
          traceId: requiredFailure.traceId,
          occurredAt: new Date(),
        },
      },
      dependencies,
    );
    metrics.increment('orchestration_runs_completed', { status: 'failed' });
    await audit('orchestration.run.failed', 'OrchestrationRun', run._id, run, null, {
      fromState,
      toState: 'failed',
      status: 'failed',
      reasonCode: requiredFailure.safeFailure?.code,
    }, dependencies);
    return run;
  }
  const allTerminal = nodes.length > 0 && nodes.every((node) => TERMINAL_NODE_STATUSES.includes(node.status));
  if (allTerminal) {
    const partial = nodes.some((node) => ['failed', 'skipped'].includes(node.status));
    let output;
    try {
      output = validateAgainstSchema(run.definitionSnapshot.outputSchema, finalOutputCandidate(run, nodes), {
        path: '$run.output',
        code: 'ORCHESTRATION_FINAL_OUTPUT_INVALID',
        message: 'Final orchestration output does not match its schema.',
      });
    } catch (error) {
      metrics.increment('orchestration_schema_validation_failures', { scope: 'run_output' });
      return failRun(run, {
        code: error.code,
        message: 'Final orchestration output does not match its schema.',
        category: 'schema',
      }, dependencies);
    }
    const status = partial ? 'partial_failure' : 'succeeded';
    await closeDelegationGrants(run, status === 'succeeded' ? 'completed' : 'failed', dependencies);
    run = await transitionRun(run, status, { completedAt: new Date(), finalOutput: output, activeNodeCount: 0 }, dependencies);
    metrics.increment('orchestration_runs_completed', { status });
    if (run.startedAt) metrics.observe('orchestration_run_duration', Date.now() - new Date(run.startedAt).getTime());
    await audit(`orchestration.run.${status}`, 'OrchestrationRun', run._id, run, null, {
      toState: status,
      status,
    }, dependencies);
    return run;
  }
  const actionable = nodes.some((node) => ['ready', 'queued', 'running', 'retry_wait'].includes(node.status));
  const waiting = nodes.some((node) => node.status === 'waiting_approval');
  const nextStatus = !actionable && waiting ? 'waiting_approval' : run.startedAt ? 'running' : 'queued';
  if (nextStatus !== run.status) run = await transitionRun(run, nextStatus, {}, dependencies);
  return run;
}

function createOrchestrationWorker(options = {}) {
  const dependencies = schedulerDependencies(options.dependencies);
  const workerId = String(options.workerId || `orchestration-worker:${crypto.randomUUID()}`);
  const instanceId = String(options.instanceId || `instance:${crypto.randomUUID()}`);
  const pollIntervalMs = Number(options.pollIntervalMs || env.ORCHESTRATION_WORKER_POLL_INTERVAL_MS || 1_000);
  const batchSize = Number(options.batchSize || env.ORCHESTRATION_WORKER_BATCH_SIZE || 5);
  const concurrency = Number(options.concurrency || env.ORCHESTRATION_WORKER_CONCURRENCY || 3);
  const leaseMs = Number(options.leaseMs || env.ORCHESTRATION_NODE_LEASE_MS || 120_000);
  const heartbeatMs = Number(options.heartbeatMs || env.ORCHESTRATION_NODE_HEARTBEAT_MS || 30_000);
  const manageDatabase = options.manageDatabase !== false;
  const partitionCoordination = options.partitionCoordination === true;
  const supportedRoutingVersions = options.supportedRoutingVersions || [1, 2, 3, 4, 5, 6, 7, 8];
  const active = new Map();
  let state = 'stopped';
  let acceptingClaims = false;
  let pollTimer;
  let pollPromise;
  let shutdownPromise;

  function snapshot() {
    return {
      workerId,
      instanceId,
      status: state,
      ready: state === 'ready' && acceptingClaims && dependencies.databaseStatus() === 'connected',
      draining: state === 'draining',
      acceptingClaims,
      activeNodeCount: active.size,
    };
  }

  async function runClaim(claim) {
    const controller = new AbortController();
    const promise = processClaimedNode(claim, {
      dependencies,
      controller,
      heartbeatMs,
      leaseMs,
    })
      .catch((error) => {
        dependencies.logger.error(
          { event: 'orchestration_worker.node_failed', nodeRunId: idOf(claim.node), ...workerError(error) },
          'Orchestration node processing failed',
        );
      })
      .finally(() => active.delete(idOf(claim.node)));
    active.set(idOf(claim.node), { controller, promise });
    return promise;
  }

  async function pollOnce() {
    if (!acceptingClaims || dependencies.databaseStatus() !== 'connected') return { claimed: 0 };
    if (partitionCoordination) {
      await dependencies.heartbeatWorker(
        { workerId, instanceId, activeClaimCount: active.size },
        { dependencies },
      );
    }
    await recoverExpiredLeases({ dependencies, limit: batchSize });
    await dependencies.reconcileSelectionApprovals({ limit: batchSize });
    await reconcileWaitingApprovals({ dependencies, limit: batchSize });
    let claimedCount = 0;
    while (acceptingClaims && active.size < concurrency && claimedCount < batchSize) {
      const claim = await claimNextNode({
        dependencies,
        workerId,
        instanceId,
        leaseMs,
        fairScheduling: partitionCoordination,
        partitionCoordination,
      });
      if (!claim) break;
      claimedCount += 1;
      void runClaim(claim);
    }
    return { claimed: claimedCount };
  }

  function schedule(delay = pollIntervalMs) {
    if (!acceptingClaims) return;
    pollTimer = setTimeout(() => {
      pollPromise = pollOnce()
        .catch((error) =>
          dependencies.logger.error(
            { event: 'orchestration_worker.poll_failed', ...workerError(error) },
            'Orchestration worker poll failed',
          ),
        )
        .finally(() => {
          pollPromise = null;
          schedule();
        });
    }, delay);
  }

  async function start() {
    if (state !== 'stopped') return snapshot();
    state = 'starting';
    if (manageDatabase) await dependencies.connectDatabase();
    if (dependencies.databaseStatus() !== 'connected') {
      state = 'unavailable';
      throw new AppError(503, ErrorCodes.SERVICE_UNAVAILABLE, 'Orchestration worker requires MongoDB.');
    }
    await dependencies.ensureOrchestrationIndexes();
    if (partitionCoordination) await dependencies.ensureProductionScaleIndexes();
    await recoverExpiredLeases({ dependencies, limit: 500 });
    if (partitionCoordination) {
      await dependencies.registerWorker(
        {
          workerId,
          instanceId,
          workerPool: 'execution',
          supportedWorkloadCategories: ['orchestration_node', 'orchestration_retry'],
          supportedRoutingVersions,
          maximumConcurrency: concurrency,
          activeClaimCount: 0,
          status: 'idle',
          softwareVersion: options.softwareVersion || '0.1.0',
          protocolVersion: '1',
          safeRegion: options.safeRegion,
          safeZone: options.safeZone,
        },
        { dependencies },
      );
    }
    state = 'ready';
    acceptingClaims = true;
    if (options.autoPoll !== false) schedule(0);
    return snapshot();
  }

  function abortActive(reasonCode = 'ORCHESTRATION_WORKER_ABORTED') {
    let aborted = 0;
    for (const entry of active.values()) {
      if (entry.controller.signal.aborted) continue;
      entry.controller.abort(
        new AppError(503, ErrorCodes.SHUTDOWN_INTERRUPTED_INVOCATION, 'Orchestration worker stopped.', [], {
          reasonCode,
        }),
      );
      aborted += 1;
    }
    return aborted;
  }

  async function waitForActive(timeoutMs) {
    if (active.size === 0) return true;
    const promises = [...active.values()].map((entry) => entry.promise);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };
      const timer = setTimeout(() => finish(false), Math.max(1, Number(timeoutMs) || 1));
      Promise.allSettled(promises).then(() => finish(true));
    });
  }

  async function shutdown(signal = 'manual') {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      acceptingClaims = false;
      state = 'draining';
      if (partitionCoordination && dependencies.databaseStatus() === 'connected') {
        await dependencies.registerWorker(
          {
            workerId,
            instanceId,
            workerPool: 'execution',
            supportedWorkloadCategories: ['orchestration_node', 'orchestration_retry'],
            supportedRoutingVersions,
            maximumConcurrency: concurrency,
            activeClaimCount: active.size,
            status: 'draining',
            softwareVersion: options.softwareVersion || '0.1.0',
            protocolVersion: '1',
          },
          { dependencies },
        );
      }
      clearTimeout(pollTimer);
      if (pollPromise) await pollPromise.catch(() => undefined);
      const drainMs = Number(options.shutdownDrainMs || env.DURABLE_WORK_SHUTDOWN_DRAIN_MS || 30_000);
      let drained = await waitForActive(drainMs);
      const forced = !drained;
      if (forced) abortActive('ORCHESTRATION_WORKER_DRAIN_TIMEOUT');
      if (forced) drained = await waitForActive(Math.min(1_000, heartbeatMs));
      state = 'stopped';
      if (partitionCoordination && dependencies.databaseStatus() === 'connected') {
        await dependencies.registerWorker(
          {
            workerId,
            instanceId,
            workerPool: 'execution',
            supportedWorkloadCategories: ['orchestration_node', 'orchestration_retry'],
            supportedRoutingVersions,
            maximumConcurrency: concurrency,
            activeClaimCount: 0,
            status: 'stopped',
            softwareVersion: options.softwareVersion || '0.1.0',
            protocolVersion: '1',
          },
          { dependencies },
        );
      }
      if (manageDatabase) await dependencies.disconnectDatabase();
      return { drained: drained && active.size === 0, forced, workerId, signal };
    })();
    return shutdownPromise;
  }

  return { abortActive, pollOnce, shutdown, snapshot, start };
}

module.exports = {
  availableConcurrency,
  claimNextNode,
  createOrchestrationWorker,
  handleApprovalResolution,
  isOrchestrationRetryable,
  processClaimedNode,
  reconcileRun,
  reconcileWaitingApprovals,
  recoverExpiredLeases,
  renewNodeLease,
  retryDelay,
  schedulerDependencies,
  transitionNode,
  workerError,
};
