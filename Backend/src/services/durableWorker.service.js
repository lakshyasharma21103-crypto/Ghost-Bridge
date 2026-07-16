const { env } = require('../config/env');
const { databaseStatus } = require('../config/db');
const Invocation = require('../models/Invocation');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { logger } = require('../utils/logger');
const RuntimeGateway = require('./runtimeGateway.service');
const { sweepSecretLifecycle } = require('./secretLifecycleMaintenance.service');
const { markActiveInvocationRecovery } = require('./invocationLifecycle.service');
const {
  claimNextWork,
  ensureDurableIndexes,
  finalizeWork,
  generateWorkerId,
  getOwnedWorkControlState,
  heartbeatWork,
  reconcileAcceptedInvocations,
  repairDurableOutbox,
  recordMilestone,
  scanAbandonedWork,
  startWork,
  upsertWorkerHeartbeat,
} = require('./durableWork.service');

const { version: workerVersion } = require('../../package.json');

const ACTIVE_WORK_STATUSES = new Set(['claimed', 'running', 'cancellation_requested']);
const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function plain(value) {
  return typeof value?.toObject === 'function' ? value.toObject() : value;
}

function safeCode(value, fallback = ErrorCodes.INTERNAL_SERVER_ERROR) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  return SAFE_CODE_PATTERN.test(normalized) ? normalized : fallback;
}

function safeWorkerError(error) {
  return {
    errorCode: safeCode(error?.code),
    errorName: /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(String(error?.name || ''))
      ? error.name
      : 'Error',
  };
}

function leaseLossError(workItemId, reasonCode = 'DURABLE_WORKER_LEASE_LOST') {
  return new AppError(
    409,
    ErrorCodes.DURABLE_WORK_LEASE_LOST,
    'Durable worker ownership was lost.',
    [],
    { workItemId: idOf(workItemId), reasonCode },
  );
}

function cancellationError(reasonCode) {
  return new AppError(
    409,
    ErrorCodes.INVOCATION_CANCELLED,
    'Invocation cancellation was requested.',
    [],
    { reasonCode: safeCode(reasonCode, 'DURABLE_CANCELLATION_REQUESTED') },
  );
}

function shutdownError(workItemId) {
  return new AppError(
    503,
    ErrorCodes.SHUTDOWN_INTERRUPTED_INVOCATION,
    'Durable worker shutdown interrupted invocation execution.',
    [],
    { workItemId: idOf(workItemId), reasonCode: 'DURABLE_WORKER_DRAIN_DEADLINE_EXCEEDED' },
  );
}

function settleBefore(promises, durationMs, timers = globalThis) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = timers.setTimeout(
      () => {
        if (settled) return;
        settled = true;
        resolve(false);
      },
      Math.max(0, durationMs),
    );
    timer?.unref?.();
    Promise.allSettled(promises).then(() => {
      if (settled) return;
      settled = true;
      timers.clearTimeout(timer);
      resolve(true);
    });
  });
}

function validateWorkerSettings(settings) {
  const bounds = {
    pollIntervalMs: [100, 60_000],
    batchSize: [1, 100],
    concurrency: [1, 50],
    heartbeatMs: [1_000, 300_000],
    leaseMs: [1_000, 3_600_000],
    shutdownDrainMs: [1_000, 300_000],
  };
  for (const [field, [minimum, maximum]] of Object.entries(bounds)) {
    if (
      !Number.isInteger(settings[field]) ||
      settings[field] < minimum ||
      settings[field] > maximum
    ) {
      throw new TypeError(`${field} must be an integer between ${minimum} and ${maximum}.`);
    }
  }
  if (settings.batchSize < settings.concurrency) {
    throw new TypeError('batchSize must be greater than or equal to concurrency.');
  }
  if (settings.heartbeatMs * 3 > settings.leaseMs) {
    throw new TypeError('heartbeatMs must be at most one third of leaseMs.');
  }
  if (settings.leaseMs <= env.RUNTIME_INVOCATION_TIMEOUT_MS) {
    throw new TypeError('leaseMs must exceed the maximum normal runtime duration.');
  }
  return settings;
}

function defaultLoadInvocation(workItem) {
  return Invocation.findOne({
    _id: workItem.invocationId,
    receivingWorkspaceId: workItem.receivingWorkspaceId,
    connectionId: workItem.connectionId,
  })
    .select(
      'capability lifecycleState cancellationState traceId requestId authorizationEvidence credentialBindingId credentialRequirement +approvalRequestIds approvalRequired',
    )
    .lean();
}

async function markInvocationPolicyDenied(workItem, error) {
  const now = new Date();
  await Invocation.findOneAndUpdate(
    {
      _id: workItem.invocationId,
      receivingWorkspaceId: workItem.receivingWorkspaceId,
      connectionId: workItem.connectionId,
      lifecycleState: { $in: ['accepted', 'validating', 'authorized'] },
    },
    {
      $set: {
        lifecycleState: 'failed',
        status: 'failed',
        terminalAt: now,
        terminalizedAt: now,
        lastTransitionAt: now,
        error: {
          code: ErrorCodes.AUTHORIZATION_DENIED,
          reasonCode: safeCode(error?.reasonCode, 'POLICY_REVALIDATION_DENIED'),
        },
        'authorizationEvidence.decision': 'DENY',
        'authorizationEvidence.reasonCode': safeCode(
          error?.reasonCode,
          'POLICY_REVALIDATION_DENIED',
        ),
        'authorizationEvidence.evaluatedAt': now,
      },
    },
    { runValidators: true },
  );
}

async function settleOrphanedWork({ workItem, ownership, result, error, dependencies }) {
  let control;
  try {
    control = await dependencies.getOwnedWorkControlState(idOf(workItem), ownership);
  } catch (controlError) {
    if (controlError?.code === ErrorCodes.DURABLE_WORK_LEASE_LOST) return false;
    throw controlError;
  }
  if (!ACTIVE_WORK_STATUSES.has(control.status)) return false;

  if (result) {
    try {
      await dependencies.finalizeWork(idOf(workItem), ownership, { status: 'completed' });
    } catch (finalizationError) {
      if (finalizationError?.code !== ErrorCodes.DURABLE_WORK_FINALIZATION_CONFLICT) {
        throw finalizationError;
      }
      await dependencies.recordMilestone(idOf(workItem), ownership, {
        name: 'invocation_persisted',
        attemptNumber: Number(workItem.attemptNumber),
        safeStatus: 'completed',
      });
      await dependencies.finalizeWork(idOf(workItem), ownership, { status: 'completed' });
    }
    return true;
  }

  const lastErrorCode = safeCode(error?.code);
  if (error?.recoveryRequired === true || error?.lifecycleState === 'recovery_required') {
    await dependencies.finalizeWork(idOf(workItem), ownership, {
      status: 'recovery_required',
      lastErrorCode,
      retryDecisionReason: safeCode(error?.retryReason, 'REMOTE_OUTCOME_UNKNOWN'),
      recoveryReasonCode: 'WORKER_LOST_DURING_REMOTE_EXECUTION',
    });
    return true;
  }
  if (lastErrorCode === ErrorCodes.INVOCATION_CANCELLED) {
    await dependencies.finalizeWork(idOf(workItem), ownership, {
      status: 'cancelled',
      lastErrorCode,
      retryDecisionReason: 'INVOCATION_CANCELLED',
    });
    return true;
  }
  await dependencies.finalizeWork(idOf(workItem), ownership, {
    status: 'failed',
    lastErrorCode,
    retryDecisionReason: safeCode(error?.retryReason, 'RETRY_NOT_ALLOWED'),
  });
  return true;
}

function executionDependencies(overrides = {}) {
  return {
    databaseStatus,
    finalizeWork,
    getOwnedWorkControlState,
    heartbeatWork,
    invoke: RuntimeGateway.invoke,
    loadInvocation: defaultLoadInvocation,
    markInvocationPolicyDenied,
    recordMilestone,
    renewRuntimeExecutionOwnership: RuntimeGateway.renewRuntimeExecutionOwnership,
    startWork,
    ...overrides,
  };
}

async function executeClaimedWork(claim, options = {}) {
  if (!claim?.workItem || !claim?.ownership) {
    throw new TypeError('A claimed durable work item and ownership are required.');
  }
  const dependencies = executionDependencies(options.dependencies);
  const workItem = plain(claim.workItem);
  const workItemId = idOf(workItem);
  const workerId = String(options.workerId || claim.ownership.leaseOwner || '');
  const controller = options.controller || new AbortController();
  const heartbeatMs = Number(options.heartbeatMs || env.DURABLE_WORK_HEARTBEAT_MS);
  const leaseMs = Number(options.leaseMs || env.DURABLE_WORK_LEASE_MS);
  const timers = options.timers || globalThis;
  let runtimeOwnership;
  let heartbeatTimer;
  let heartbeatPromise;
  let heartbeatStopped = false;
  let ownershipLost = false;

  function abort(reason) {
    if (!controller.signal.aborted) controller.abort(reason);
  }

  async function heartbeat() {
    if (heartbeatStopped || ownershipLost) return;
    if (dependencies.databaseStatus() !== 'connected') {
      ownershipLost = true;
      abort(leaseLossError(workItemId, 'DURABLE_DATABASE_UNAVAILABLE'));
      return;
    }
    try {
      const workHeartbeat = await dependencies.heartbeatWork(workItemId, claim.ownership, {
        leaseMs,
      });
      if (runtimeOwnership) {
        const renewed = await dependencies.renewRuntimeExecutionOwnership(runtimeOwnership, {
          leaseDurationMs: leaseMs,
          forcePersistence: true,
        });
        if (!renewed) {
          throw leaseLossError(workItemId, 'RUNTIME_EXECUTION_OWNERSHIP_LOST');
        }
        runtimeOwnership = renewed;
      }
      if (workHeartbeat.cancellationRequested) {
        abort(cancellationError(workHeartbeat.workItem?.cancellationReasonCode));
      }
      await options.onHeartbeat?.({ workItemId, runtimeOwnership });
    } catch (error) {
      if (error?.code === ErrorCodes.INVOCATION_CANCELLED) {
        abort(error);
        return;
      }
      ownershipLost = true;
      abort(
        error instanceof AppError
          ? error
          : leaseLossError(workItemId, 'DURABLE_WORK_HEARTBEAT_FAILED'),
      );
    }
  }

  function scheduleHeartbeat() {
    if (heartbeatStopped || ownershipLost) return;
    heartbeatTimer = timers.setTimeout(() => {
      heartbeatPromise = heartbeat()
        .catch(() => undefined)
        .finally(() => {
          heartbeatPromise = undefined;
          scheduleHeartbeat();
        });
    }, heartbeatMs);
    heartbeatTimer?.unref?.();
  }

  async function stopHeartbeat() {
    heartbeatStopped = true;
    if (heartbeatTimer) timers.clearTimeout(heartbeatTimer);
    if (heartbeatPromise) await heartbeatPromise;
  }

  let result;
  let executionError;
  try {
    try {
      await dependencies.startWork(workItemId, claim.ownership);
    } catch (error) {
      const control = await dependencies.getOwnedWorkControlState(workItemId, claim.ownership);
      if (!control.cancellationRequested) throw error;
      const cancelled = cancellationError(control.cancellationReasonCode);
      await settleOrphanedWork({
        workItem,
        ownership: claim.ownership,
        error: cancelled,
        dependencies,
      });
      throw cancelled;
    }

    const control = await dependencies.getOwnedWorkControlState(workItemId, claim.ownership);
    if (control.cancellationRequested) throw cancellationError(control.cancellationReasonCode);
    if (dependencies.databaseStatus() !== 'connected') {
      ownershipLost = true;
      throw leaseLossError(workItemId, 'DURABLE_DATABASE_UNAVAILABLE');
    }

    scheduleHeartbeat();
    const invocation = await dependencies.loadInvocation(workItem);
    if (!invocation || typeof invocation.capability !== 'string' || !invocation.capability) {
      throw new AppError(
        409,
        ErrorCodes.DURABLE_WORK_RECONCILIATION_FAILED,
        'The durable invocation is not executable.',
        [],
        { workItemId, reasonCode: 'DURABLE_INVOCATION_NOT_FOUND' },
      );
    }
    result = await dependencies.invoke(
      idOf(workItem.connectionId),
      invocation.capability,
      undefined,
      {
        actorType: 'system',
        actorId: 'system:durable-worker',
        requestId: invocation.requestId || `durable-work:${workItemId}`,
        traceId: workItem.traceId || invocation.traceId || `durable:${workItemId}`,
        durableInvocationId: idOf(workItem.invocationId),
        durableWorkItemId: workItemId,
        durableWorkOwnership: claim.ownership,
        durableAttemptNumber: Number(workItem.attemptNumber),
        durableMaximumAttempts: Number(workItem.maximumAttempts),
        durableHeartbeatManaged: true,
        executionGeneration: Number(workItem.executionGeneration),
        executionOwner: workerId,
        requireDurablePersistence: true,
        runtimeProtectionOptions: { forcePersistence: true },
        policyActorType: invocation.authorizationEvidence?.actorType,
        policyActorId: invocation.authorizationEvidence?.actorId,
        policyRoleKeys: invocation.authorizationEvidence?.roleKeys,
        policySkipPersistentRoles:
          invocation.authorizationEvidence?.actorType === 'service_account',
        expectedCredentialBindingId: workItem.credentialBindingId || invocation.credentialBindingId,
        approvalRequestIds: invocation.approvalRequestIds,
        signal: controller.signal,
        async onExecutionClaimed(ownership) {
          runtimeOwnership = ownership;
          await options.onExecutionClaimed?.(ownership);
        },
        onDurableProgress: options.onDurableProgress,
      },
    );
    return result;
  } catch (error) {
    executionError = error;
    if (error?.code === ErrorCodes.AUTHORIZATION_DENIED) {
      await dependencies.markInvocationPolicyDenied(workItem, error);
    }
    throw error;
  } finally {
    await stopHeartbeat();
    if (!ownershipLost) {
      try {
        await settleOrphanedWork({
          workItem,
          ownership: claim.ownership,
          result,
          error: executionError,
          dependencies,
        });
      } catch (settlementError) {
        options.logger?.warn?.(
          {
            event: 'durable_worker.orphan_settlement_failed',
            workItemId,
            ...safeWorkerError(settlementError),
          },
          'Durable worker orphan settlement failed',
        );
      }
    }
  }
}

function workerDependencies(overrides = {}) {
  const hasInjectedDependencies = Object.keys(overrides).length > 0;
  const defaults = {
    claimNextWork,
    connectDatabase: require('../config/db').connectDatabase,
    databaseStatus,
    disconnectDatabase: require('../config/db').disconnectDatabase,
    ensureDurableIndexes,
    executeClaimedWork,
    generateWorkerId,
    logger,
    markActiveInvocationRecovery,
    reconcileAcceptedInvocations,
    repairDurableOutbox,
    scanAbandonedWork,
    sweepSecretLifecycle,
    upsertWorkerHeartbeat,
  };
  if (hasInjectedDependencies && !Object.hasOwn(overrides, 'repairDurableOutbox')) {
    defaults.repairDurableOutbox = async () => ({ repaired: 0 });
  }
  if (hasInjectedDependencies && !Object.hasOwn(overrides, 'sweepSecretLifecycle')) {
    defaults.sweepSecretLifecycle = async () => ({ expiredSecrets: 0, expiredVersions: 0 });
  }
  return { ...defaults, ...overrides };
}

function createDurableWorker(options = {}) {
  const dependencies = workerDependencies(options.dependencies);
  const settings = validateWorkerSettings({
    enabled: options.enabled ?? env.DURABLE_WORKER_ENABLED,
    pollIntervalMs: options.pollIntervalMs || env.DURABLE_WORKER_POLL_INTERVAL_MS,
    batchSize: options.batchSize || env.DURABLE_WORKER_BATCH_SIZE,
    concurrency: options.concurrency || env.DURABLE_WORKER_CONCURRENCY,
    heartbeatMs: options.heartbeatMs || env.DURABLE_WORK_HEARTBEAT_MS,
    leaseMs: options.leaseMs || env.DURABLE_WORK_LEASE_MS,
    shutdownDrainMs: options.shutdownDrainMs || env.DURABLE_WORK_SHUTDOWN_DRAIN_MS,
    maintenanceIntervalMs: Math.max(
      options.pollIntervalMs || env.DURABLE_WORKER_POLL_INTERVAL_MS,
      Math.min(env.DURABLE_WORK_ABANDONED_GRACE_MS, 30_000),
    ),
  });
  const timers = options.timers || globalThis;
  const workerId = options.workerId || dependencies.generateWorkerId();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(workerId)) {
    throw new TypeError('workerId must be a safe opaque identifier.');
  }
  const startedAt = new Date();
  const active = new Map();
  let state = 'stopped';
  let acceptingClaims = false;
  let pollTimer;
  let workerHeartbeatTimer;
  let pollPromise;
  let workerHeartbeatPromise;
  let shutdownPromise;
  let started = false;
  let lastMaintenanceAt = 0;

  function snapshot() {
    return {
      workerId,
      status: state,
      ready: state === 'ready' && acceptingClaims && dependencies.databaseStatus() === 'connected',
      draining: state === 'draining',
      activeWorkCount: active.size,
      acceptingClaims,
      startedAt,
    };
  }

  async function persistWorkerHeartbeat(status = state) {
    if (dependencies.databaseStatus() !== 'connected') {
      throw leaseLossError(undefined, 'DURABLE_DATABASE_UNAVAILABLE');
    }
    return dependencies.upsertWorkerHeartbeat({
      workerId,
      status,
      startedAt,
      activeWorkCount: active.size,
      draining: status === 'draining',
      version: workerVersion,
    });
  }

  function abortActive(reasonFactory) {
    let aborted = 0;
    for (const entry of active.values()) {
      if (entry.controller.signal.aborted) continue;
      entry.controller.abort(reasonFactory(entry.workItemId));
      aborted += 1;
    }
    return aborted;
  }

  function failClosed(reasonCode) {
    acceptingClaims = false;
    return abortActive((workItemId) => leaseLossError(workItemId, reasonCode));
  }

  async function refreshDatabaseReadiness() {
    if (dependencies.databaseStatus() === 'connected') return true;
    failClosed('DURABLE_DATABASE_UNAVAILABLE');
    try {
      await dependencies.connectDatabase();
    } catch (error) {
      dependencies.logger.warn(
        { event: 'durable_worker.database_unavailable', ...safeWorkerError(error) },
        'Durable worker database connection is unavailable',
      );
    }
    return dependencies.databaseStatus() === 'connected';
  }

  function runClaim(claim) {
    const workItemId = idOf(claim.workItem);
    const controller = new AbortController();
    const entry = {
      controller,
      promise: null,
      workItemId,
      invocationId: idOf(claim.workItem.invocationId),
      receivingWorkspaceId: claim.workItem.receivingWorkspaceId,
      externalCallStarted: false,
      runtimeOwnership: null,
    };
    active.set(workItemId, entry);
    const promise = Promise.resolve()
      .then(() =>
        dependencies.executeClaimedWork(claim, {
          workerId,
          controller,
          heartbeatMs: settings.heartbeatMs,
          leaseMs: settings.leaseMs,
          timers,
          logger: dependencies.logger,
          onExecutionClaimed(ownership) {
            entry.runtimeOwnership = ownership;
          },
          onDurableProgress(stage) {
            if (
              [
                'outbound_request_started',
                'remote_response_received',
                'response_validation_started',
                'finalization_started',
                'invocation_persisted',
              ].includes(stage)
            ) {
              entry.externalCallStarted = true;
            }
          },
        }),
      )
      .catch((error) => {
        dependencies.logger.warn(
          { event: 'durable_worker.work_failed', workItemId, ...safeWorkerError(error) },
          'Durable worker execution ended without success',
        );
      })
      .finally(() => {
        active.delete(workItemId);
        if (dependencies.databaseStatus() === 'connected') {
          void persistWorkerHeartbeat().catch(() => undefined);
        }
      });
    entry.promise = promise;
    return promise;
  }

  async function persistForcedShutdownRecovery() {
    const candidates = [...active.values()].filter(
      (entry) => entry.externalCallStarted && entry.runtimeOwnership,
    );
    const results = await Promise.allSettled(
      candidates.map((entry) =>
        dependencies.markActiveInvocationRecovery({
          invocationId: entry.invocationId,
          receivingWorkspaceId: entry.receivingWorkspaceId,
          executionOwner: entry.runtimeOwnership.executionOwner,
          executionLeaseId: entry.runtimeOwnership.executionLeaseId,
          reasonCode: 'SHUTDOWN_DURING_EXTERNAL_INVOCATION',
        }),
      ),
    );
    return results.filter((result) => result.status === 'fulfilled' && result.value).length;
  }

  async function performPoll() {
    if (state !== 'ready' || !acceptingClaims) return 0;
    if (!(await refreshDatabaseReadiness())) return 0;
    acceptingClaims = true;
    const now = Date.now();
    if (now - lastMaintenanceAt >= settings.maintenanceIntervalMs) {
      await dependencies.scanAbandonedWork({
        graceMs: env.DURABLE_WORK_ABANDONED_GRACE_MS,
        limit: settings.batchSize,
      });
      await dependencies.repairDurableOutbox({ limit: settings.batchSize });
      await dependencies.reconcileAcceptedInvocations({ limit: settings.batchSize });
      await dependencies.sweepSecretLifecycle({ limit: settings.batchSize });
      lastMaintenanceAt = now;
    }
    const capacity = Math.max(0, settings.concurrency - active.size);
    const claimLimit = Math.min(capacity, settings.batchSize);
    let claimed = 0;
    for (let index = 0; index < claimLimit && acceptingClaims; index += 1) {
      const claim = await dependencies.claimNextWork({
        workerId,
        leaseMs: settings.leaseMs,
      });
      if (!claim) break;
      runClaim(claim);
      claimed += 1;
    }
    return claimed;
  }

  function pollOnce() {
    if (pollPromise) return pollPromise;
    const operation = performPoll();
    const tracked = operation.finally(() => {
      if (pollPromise === tracked) pollPromise = undefined;
    });
    pollPromise = tracked;
    return tracked;
  }

  function schedulePoll(durationMs = settings.pollIntervalMs) {
    if (!started || state !== 'ready' || options.autoPoll === false) return;
    pollTimer = timers.setTimeout(() => {
      pollOnce()
        .catch((error) => {
          // Poll/maintenance failures gate new claims for this polling interval, but do not revoke
          // unrelated Work/Invocation leases that continue to heartbeat successfully.
          acceptingClaims = false;
          dependencies.logger.error(
            { event: 'durable_worker.poll_failed', ...safeWorkerError(error) },
            'Durable worker poll failed',
          );
        })
        .finally(() => {
          if (state === 'ready') {
            if (dependencies.databaseStatus() === 'connected') acceptingClaims = true;
            schedulePoll();
          }
        });
    }, durationMs);
    pollTimer?.unref?.();
  }

  async function workerHeartbeat() {
    const connected = await refreshDatabaseReadiness();
    if (!connected) return;
    if (state === 'ready') acceptingClaims = true;
    await persistWorkerHeartbeat();
  }

  function scheduleWorkerHeartbeat() {
    if (!started || state === 'stopped') return;
    workerHeartbeatTimer = timers.setTimeout(() => {
      workerHeartbeatPromise = workerHeartbeat()
        .catch((error) => {
          failClosed('DURABLE_WORKER_HEARTBEAT_FAILED');
          dependencies.logger.error(
            { event: 'durable_worker.heartbeat_failed', ...safeWorkerError(error) },
            'Durable worker heartbeat failed',
          );
        })
        .finally(() => {
          workerHeartbeatPromise = undefined;
          scheduleWorkerHeartbeat();
        });
    }, settings.heartbeatMs);
    workerHeartbeatTimer?.unref?.();
  }

  async function start() {
    if (started) return snapshot();
    started = true;
    state = 'starting';
    if (!settings.enabled) {
      state = 'stopped';
      dependencies.logger.info(
        { event: 'durable_worker.disabled' },
        'Durable worker is disabled by configuration',
      );
      return snapshot();
    }
    try {
      await dependencies.connectDatabase();
      if (dependencies.databaseStatus() !== 'connected') {
        throw leaseLossError(undefined, 'DURABLE_DATABASE_UNAVAILABLE');
      }
      await dependencies.ensureDurableIndexes();
      await persistWorkerHeartbeat('starting');
      state = 'ready';
      acceptingClaims = true;
      await persistWorkerHeartbeat('ready');
    } catch (error) {
      acceptingClaims = false;
      started = false;
      state = 'stopped';
      if (dependencies.databaseStatus() === 'connected') {
        await dependencies.disconnectDatabase().catch(() => undefined);
      }
      throw error;
    }
    dependencies.logger.info(
      { event: 'durable_worker.started', workerId },
      'Durable runtime worker started',
    );
    scheduleWorkerHeartbeat();
    if (options.autoPoll !== false) schedulePoll(0);
    return snapshot();
  }

  async function waitForIdle(timeoutMs = settings.shutdownDrainMs) {
    if (active.size === 0) return true;
    const current = [...active.values()].map((entry) => entry.promise);
    return settleBefore(current, timeoutMs, timers);
  }

  async function shutdown(signal = 'manual') {
    if (shutdownPromise) return shutdownPromise;
    if (!started || state === 'stopped') {
      return { drained: true, forced: false, workerId };
    }
    shutdownPromise = (async () => {
      const drainStartedAt = Date.now();
      acceptingClaims = false;
      if (pollTimer) timers.clearTimeout(pollTimer);
      state = 'draining';
      if (dependencies.databaseStatus() === 'connected') {
        await persistWorkerHeartbeat('draining').catch(() => undefined);
      }
      dependencies.logger.info(
        { event: 'durable_worker.draining_started', signal, activeWorkCount: active.size },
        'Durable runtime worker drain started',
      );
      const pollDrained = pollPromise
        ? await settleBefore([pollPromise], settings.shutdownDrainMs, timers)
        : true;
      const remainingDrainMs = Math.max(
        1,
        settings.shutdownDrainMs - (Date.now() - drainStartedAt),
      );
      let drained = pollDrained && (await waitForIdle(remainingDrainMs));
      let forced = false;
      if (!drained) {
        forced = true;
        abortActive((workItemId) => shutdownError(workItemId));
        drained = await waitForIdle(Math.min(1_000, settings.heartbeatMs));
        if (!drained && dependencies.databaseStatus() === 'connected') {
          const recoveryPersisted = await persistForcedShutdownRecovery();
          dependencies.logger.warn(
            {
              event: 'durable_worker.forced_recovery_persisted',
              activeWorkCount: active.size,
              recoveryPersisted,
            },
            'Durable worker persisted forced-shutdown recovery evidence',
          );
        }
      }
      if (workerHeartbeatTimer) timers.clearTimeout(workerHeartbeatTimer);
      if (workerHeartbeatPromise) await workerHeartbeatPromise.catch(() => undefined);
      state = 'stopped';
      if (dependencies.databaseStatus() === 'connected') {
        await persistWorkerHeartbeat('stopped').catch(() => undefined);
      }
      await dependencies.disconnectDatabase();
      started = false;
      dependencies.logger.info(
        { event: 'durable_worker.draining_completed', signal, drained },
        'Durable runtime worker drain completed',
      );
      return { drained, forced, workerId };
    })();
    return shutdownPromise;
  }

  return {
    abortActive: (reasonCode = 'DURABLE_WORKER_ABORTED') =>
      abortActive((workItemId) => leaseLossError(workItemId, reasonCode)),
    pollOnce,
    shutdown,
    snapshot,
    start,
    waitForIdle,
  };
}

module.exports = {
  createDurableWorker,
  executeClaimedWork,
  safeWorkerError,
  settleOrphanedWork,
  validateWorkerSettings,
};
