const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const mongoose = require('mongoose');

const { env } = require('../src/config/env');
const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const DurableEventOutbox = require('../src/models/DurableEventOutbox');
const Invocation = require('../src/models/Invocation');
const InvocationAttempt = require('../src/models/InvocationAttempt');
const RuntimeWorkItem = require('../src/models/RuntimeWorkItem');
const {
  claimWorkById,
  enqueueWork,
  ensureDurableIndexes,
  finalizeWork,
  recordMilestone,
  scanAbandonedWork,
  scheduleRetry,
  serializeWorkItem,
  startWork,
} = require('../src/services/durableWork.service');
const { executeClaimedWork } = require('../src/services/durableWorker.service');
const { encryptPayload } = require('../src/utils/crypto');
const { ErrorCodes } = require('../src/utils/errorCodes');

const SECRET_SENTINEL = 'agentpass_partner_durable-verifier-secret-never-print';
const LEASE_MS = env.DURABLE_WORK_LEASE_MS;
const GRACE_MS = env.DURABLE_WORK_ABANDONED_GRACE_MS;
const scopeSuffix = crypto.randomUUID().replaceAll('-', '');
const scope = {
  partnerId: new mongoose.Types.ObjectId(),
  receivingWorkspaceId: `durable_verify_${scopeSuffix}`,
};

let failedStage = 'startup';
let fixtureDatabaseConnected = false;
let deterministicRuntimeCalls = 0;
let blockedNetworkAttempts = 0;

class DurableVerificationError extends Error {
  constructor(code) {
    super('Durable recovery verification failed.');
    this.code = code;
  }
}

function report(label, detail) {
  console.log(`PASS ${label}: ${detail}`);
}

function safeCode(value, fallback = 'DURABLE_VERIFICATION_FAILED') {
  const normalized = String(value || '').toUpperCase();
  return /^[A-Z][A-Z0-9_]{0,127}$/.test(normalized) ? normalized : fallback;
}

function fail(error) {
  console.error('FAIL durable recovery verification');
  console.error(`Failed stage: ${failedStage}`);
  console.error(`Application error code: ${safeCode(error?.code)}`);
  process.exitCode = 1;
}

function owner(label) {
  return { workerId: `worker:durable-verify-${label}`, leaseMs: LEASE_MS };
}

function restartTime(startedAt, offsetMs = 0) {
  return new Date(startedAt.getTime() + LEASE_MS + GRACE_MS + offsetMs);
}

function workInput(invocation, label, overrides = {}) {
  return {
    ...scope,
    invocationId: invocation._id,
    connectionId: invocation.connectionId,
    attemptNumber: 1,
    executionGeneration: 1,
    workType: 'runtime_invocation',
    safeOperation: 'runtime_invocation',
    traceId: `trace_durable_verify_${label}`,
    maximumAttempts: Math.min(3, env.DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS),
    ...overrides,
  };
}

async function createLinkedFixture(label, options = {}) {
  const invocation = await Invocation.create({
    _id: new mongoose.Types.ObjectId(),
    connectionId: new mongoose.Types.ObjectId(),
    passportId: new mongoose.Types.ObjectId(),
    receivingWorkspaceId: scope.receivingWorkspaceId,
    capability: 'durable_verify',
    inputSummary: {},
    executionPayload: encryptPayload({ input: { protectedReference: SECRET_SENTINEL } }),
    protectedReplayAvailable: true,
    executionGeneration: 1,
    status: 'queued',
    lifecycleState: 'accepted',
    attemptCount: 0,
    retryState: 'not_evaluated',
    runtimeType: 'rest',
    traceId: `trace_durable_verify_${label}`,
    requestId: `request_durable_verify_${label}`,
  });
  const enqueued = await enqueueWork(
    workInput(invocation, label, {
      availableAt: options.availableAt || new Date(),
    }),
  );
  assert.equal(enqueued.created, true);
  const linked = await Invocation.findOneAndUpdate(
    {
      _id: invocation._id,
      receivingWorkspaceId: scope.receivingWorkspaceId,
      $or: [{ currentWorkItemId: { $exists: false } }, { currentWorkItemId: null }],
    },
    { $set: { currentWorkItemId: enqueued.workItem._id } },
    { new: true, runValidators: true },
  );
  assert.ok(linked);
  return { invocation: linked, workItem: enqueued.workItem };
}

async function reconnectDatabase() {
  await disconnectDatabase();
  await connectDatabase();
  if (databaseStatus() !== 'connected') {
    throw new DurableVerificationError('DURABLE_VERIFY_DATABASE_RECONNECT_FAILED');
  }
}

async function verifyRejectedSecretFields(exampleWork) {
  let rejectedDiagnostic;
  try {
    await enqueueWork({
      ...scope,
      invocationId: new mongoose.Types.ObjectId(),
      connectionId: new mongoose.Types.ObjectId(),
      attemptNumber: 1,
      executionGeneration: 1,
      workType: 'runtime_invocation',
      safeOperation: 'runtime_invocation',
      traceId: 'trace_durable_verify_secret_rejection',
      maximumAttempts: Math.min(3, env.DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS),
      prompt: SECRET_SENTINEL,
    });
  } catch (error) {
    rejectedDiagnostic = {
      errorCode: safeCode(error?.code, 'VALIDATION_ERROR'),
      errorName: String(error?.name || 'Error').slice(0, 64),
    };
  }
  assert.ok(rejectedDiagnostic, 'Durable work accepted an unapproved payload field.');
  assert.equal(JSON.stringify(rejectedDiagnostic).includes(SECRET_SENTINEL), false);

  const serialized = serializeWorkItem({
    ...exampleWork,
    leaseOwner: 'worker:must-not-be-exposed',
    leaseTokenHash: `sha256:${'a'.repeat(64)}`,
    dedupeKey: `sha256:${'b'.repeat(64)}`,
  });
  const serializedJson = JSON.stringify(serialized);
  assert.equal(serializedJson.includes(SECRET_SENTINEL), false);
  assert.equal(serializedJson.includes('leaseOwner'), false);
  assert.equal(serializedJson.includes('leaseToken'), false);
  assert.equal(serializedJson.includes('dedupeKey'), false);
}

async function runDeterministicWorker(fixture, claim) {
  const workItemId = String(fixture.workItem._id);
  const invocationId = String(fixture.invocation._id);
  const result = await executeClaimedWork(claim, {
    workerId: claim.ownership.leaseOwner,
    dependencies: {
      async loadInvocation(workItem) {
        return Invocation.findOne({
          _id: workItem.invocationId,
          receivingWorkspaceId: workItem.receivingWorkspaceId,
          connectionId: workItem.connectionId,
        })
          .select('capability requestId traceId')
          .lean();
      },
      async invoke(connectionId, capability, input, actor) {
        deterministicRuntimeCalls += 1;
        assert.equal(connectionId, String(fixture.invocation.connectionId));
        assert.equal(capability, 'durable_verify');
        assert.equal(input, undefined);
        assert.equal(actor.durableInvocationId, invocationId);
        assert.equal(actor.durableWorkItemId, workItemId);
        assert.equal(actor.requireDurablePersistence, true);
        assert.ok(actor.signal instanceof AbortSignal);

        const persisted = await Invocation.findOneAndUpdate(
          {
            _id: fixture.invocation._id,
            receivingWorkspaceId: scope.receivingWorkspaceId,
            currentWorkItemId: fixture.workItem._id,
            lifecycleState: 'accepted',
          },
          {
            $set: {
              status: 'completed',
              lifecycleState: 'succeeded',
              attemptCount: 1,
              terminalAt: new Date(),
              terminalizedAt: new Date(),
              lastProgressAt: new Date(),
              lastProgressStage: 'terminalized',
            },
          },
          { new: true, runValidators: true },
        );
        assert.ok(persisted);
        await recordMilestone(workItemId, claim.ownership, {
          name: 'invocation_persisted',
          attemptNumber: 1,
          safeStatus: 'completed',
        });
        return { invocationId, status: 'completed' };
      },
    },
  });
  assert.deepEqual(result, { invocationId, status: 'completed' });
  const completed = await RuntimeWorkItem.findById(workItemId).lean();
  assert.equal(completed?.status, 'completed');
}

async function verify() {
  if (!env.MONGODB_URI) {
    throw new DurableVerificationError('MONGODB_URI_NOT_CONFIGURED');
  }
  if (env.NODE_ENV === 'production') {
    throw new DurableVerificationError('DURABLE_VERIFY_PRODUCTION_DATABASE_REFUSED');
  }
  if (env.DURABLE_WORK_DEAD_LETTER_AFTER_ATTEMPTS < 2) {
    throw new DurableVerificationError('DURABLE_VERIFY_RETRY_LIMIT_TOO_LOW');
  }

  failedStage = 'database_connection';
  await connectDatabase();
  if (databaseStatus() !== 'connected') {
    throw new DurableVerificationError('DURABLE_VERIFY_DATABASE_UNAVAILABLE');
  }
  fixtureDatabaseConnected = true;
  await ensureDurableIndexes();

  const startedAt = new Date();
  const claimTime = new Date(startedAt.getTime() + 10);

  failedStage = 'restart_survival';
  const workerFixture = await createLinkedFixture('worker_restart', {
    availableAt: startedAt,
  });
  await reconnectDatabase();
  const survived = await RuntimeWorkItem.findById(workerFixture.workItem._id).lean();
  const survivedInvocation = await Invocation.findById(workerFixture.invocation._id).lean();
  assert.equal(survived?.status, 'pending');
  assert.equal(String(survivedInvocation?.currentWorkItemId), String(survived?._id));
  const workerClaim = await claimWorkById(workerFixture.workItem._id, {
    ...owner('restart'),
    now: claimTime,
  });
  assert.ok(workerClaim);
  await runDeterministicWorker(workerFixture, workerClaim);
  assert.equal(deterministicRuntimeCalls, 1);
  report(
    'restart survival',
    'linked work survived reconnect and completed through the deterministic worker path',
  );

  failedStage = 'atomic_claim';
  const atomicFixture = await createLinkedFixture('atomic', { availableAt: startedAt });
  const claimResults = await Promise.all([
    claimWorkById(atomicFixture.workItem._id, { ...owner('alpha'), now: claimTime }),
    claimWorkById(atomicFixture.workItem._id, { ...owner('beta'), now: claimTime }),
  ]);
  const successfulClaims = claimResults.filter(Boolean);
  assert.equal(successfulClaims.length, 1);
  const originalOwnership = successfulClaims[0].ownership;
  report('atomic claim', 'exactly one of two concurrent workers acquired the linked work lease');

  failedStage = 'scheduled_retry_restart';
  const retryFixture = await createLinkedFixture('retry', { availableAt: startedAt });
  const retryClaim = await claimWorkById(retryFixture.workItem._id, {
    ...owner('retry-first'),
    now: claimTime,
  });
  assert.ok(retryClaim);
  await startWork(retryFixture.workItem._id, retryClaim.ownership, { now: claimTime });
  const failedInvocation = await Invocation.findOneAndUpdate(
    {
      _id: retryFixture.invocation._id,
      currentWorkItemId: retryFixture.workItem._id,
      lifecycleState: 'accepted',
    },
    {
      $set: {
        status: 'failed',
        lifecycleState: 'failed',
        attemptCount: 1,
        retryState: 'scheduled',
        retryDecisionReason: 'TRANSIENT_RUNTIME_FAILURE',
      },
    },
    { new: true, runValidators: true },
  );
  assert.ok(failedInvocation);
  const scheduled = await scheduleRetry(
    retryFixture.workItem._id,
    retryClaim.ownership,
    {
      errorCode: 'RUNTIME_NETWORK_ERROR',
      operation: 'rest_runtime',
      retryable: true,
      clientIdempotencyProvided: true,
      idempotencySupported: true,
      remoteIdempotencyAcknowledged: true,
      mayCreateExternalSideEffects: false,
    },
    {
      now: claimTime,
      retryDecisionEvaluator: () => ({
        allowed: true,
        reason: 'TRANSIENT_RUNTIME_FAILURE',
        delayMs: 5_000,
      }),
    },
  );
  assert.equal(scheduled.workItem.status, 'retry_scheduled');
  assert.equal(scheduled.workItem.attemptNumber, 2);
  const retryAvailableAt = new Date(scheduled.workItem.availableAt);
  await reconnectDatabase();
  const earlyRetry = await claimWorkById(retryFixture.workItem._id, {
    ...owner('retry-early'),
    now: new Date(retryAvailableAt.getTime() - 1),
  });
  assert.equal(earlyRetry, null);
  const dueRetry = await claimWorkById(retryFixture.workItem._id, {
    ...owner('retry-due'),
    now: retryAvailableAt,
  });
  assert.ok(dueRetry);
  assert.equal(dueRetry.workItem.attemptNumber, 2);
  report('durable retry', 'aligned scheduled retry survived reconnect and was not claimed early');

  failedStage = 'pre_transmission_recovery';
  const preFixture = await createLinkedFixture('pre', { availableAt: startedAt });
  const preClaim = await claimWorkById(preFixture.workItem._id, {
    ...owner('pre'),
    now: claimTime,
  });
  assert.ok(preClaim);
  await startWork(preFixture.workItem._id, preClaim.ownership, { now: claimTime });
  const preRecoveryAt = restartTime(claimTime, 10);
  const preRecovery = await scanAbandonedWork({
    ...scope,
    connectionId: preFixture.invocation.connectionId,
    now: preRecoveryAt,
    graceMs: GRACE_MS,
    limit: 5,
  });
  assert.equal(preRecovery.safelyRecovered, 1);
  const preRecoveredWork = await RuntimeWorkItem.findById(preFixture.workItem._id).lean();
  const preRecoveredInvocation = await Invocation.findById(preFixture.invocation._id).lean();
  assert.equal(preRecoveredWork?.status, 'pending');
  assert.equal(preRecoveredWork?.recoveryReasonCode, 'LEASE_EXPIRED_BEFORE_TRANSMISSION');
  assert.equal(String(preRecoveredInvocation?.currentWorkItemId), String(preRecoveredWork?._id));
  report('pre-transmission recovery', 'expired linked work safely returned to pending');

  failedStage = 'post_transmission_recovery';
  const postFixture = await createLinkedFixture('post', { availableAt: startedAt });
  const postClaim = await claimWorkById(postFixture.workItem._id, {
    ...owner('post'),
    now: claimTime,
  });
  assert.ok(postClaim);
  await startWork(postFixture.workItem._id, postClaim.ownership, { now: claimTime });
  await recordMilestone(postFixture.workItem._id, postClaim.ownership, {
    name: 'outbound_transmission_started',
    safeStatus: 'completed',
    attemptNumber: 1,
    at: new Date(claimTime.getTime() + 1),
  });
  const waitingInvocation = await Invocation.findOneAndUpdate(
    {
      _id: postFixture.invocation._id,
      currentWorkItemId: postFixture.workItem._id,
      lifecycleState: 'accepted',
    },
    {
      $set: {
        status: 'running',
        lifecycleState: 'waiting_for_runtime',
        attemptCount: 1,
        lastProgressAt: new Date(claimTime.getTime() + 1),
        lastProgressStage: 'outbound_request_started',
      },
    },
    { new: true, runValidators: true },
  );
  assert.ok(waitingInvocation);
  const postRecovery = await scanAbandonedWork({
    ...scope,
    connectionId: postFixture.invocation.connectionId,
    now: restartTime(claimTime, 10),
    graceMs: GRACE_MS,
    limit: 5,
  });
  assert.equal(postRecovery.recoveryRequired, 1);
  const postRecoveredWork = await RuntimeWorkItem.findById(postFixture.workItem._id).lean();
  const postRecoveredInvocation = await Invocation.findById(postFixture.invocation._id).lean();
  assert.equal(postRecoveredWork?.status, 'recovery_required');
  assert.equal(postRecoveredWork?.recoveryReasonCode, 'WORKER_LOST_DURING_REMOTE_EXECUTION');
  assert.equal(postRecoveredInvocation?.lifecycleState, 'recovery_required');
  report(
    'post-transmission recovery',
    'expired transmitted work and its Invocation required recovery without replay',
  );

  failedStage = 'stale_owner_finalization';
  const ownershipRecoveryAt = restartTime(claimTime, 20);
  const ownershipRecovery = await scanAbandonedWork({
    ...scope,
    connectionId: atomicFixture.invocation.connectionId,
    now: ownershipRecoveryAt,
    graceMs: GRACE_MS,
    limit: 5,
  });
  assert.equal(ownershipRecovery.safelyRecovered, 1);
  const replacementClaim = await claimWorkById(atomicFixture.workItem._id, {
    ...owner('replacement'),
    now: new Date(ownershipRecoveryAt.getTime() + 1),
  });
  assert.ok(replacementClaim);
  await assert.rejects(
    () =>
      finalizeWork(
        atomicFixture.workItem._id,
        originalOwnership,
        { status: 'failed', lastErrorCode: 'STALE_OWNER_REJECTED' },
        { now: new Date(ownershipRecoveryAt.getTime() + 2) },
      ),
    (error) => error?.code === ErrorCodes.DURABLE_WORK_FINALIZATION_CONFLICT,
  );
  report('stale-owner fencing', 'an expired owner could not finalize after a replacement claim');

  failedStage = 'data_minimization';
  await verifyRejectedSecretFields(survived);
  const [persistedWork, persistedOutbox, persistedInvocations] = await Promise.all([
    RuntimeWorkItem.find(scope).select('+dedupeKey +leaseOwner +leaseTokenHash').lean(),
    DurableEventOutbox.find(scope).select('+eventKey').lean(),
    Invocation.find({ receivingWorkspaceId: scope.receivingWorkspaceId })
      .select('+executionPayload +idempotencyKeyHash +requestFingerprint')
      .lean(),
  ]);
  const persistedJson = JSON.stringify({
    persistedWork,
    persistedOutbox,
    persistedInvocations,
  });
  assert.equal(persistedJson.includes(SECRET_SENTINEL), false);
  assert.ok(persistedWork.length >= 5);
  assert.ok(persistedOutbox.length >= 5);
  assert.ok(persistedInvocations.length >= 5);
  report(
    'data minimization',
    'work, outbox, encrypted Invocation input, serializers, and diagnostics exposed no secret',
  );

  failedStage = 'provider_call_guard';
  assert.equal(deterministicRuntimeCalls, 1);
  assert.equal(blockedNetworkAttempts, 0);
  report(
    'non-billed isolation',
    'only the injected deterministic runtime ran; no HTTP call occurred',
  );

  console.log('Durable recovery verification completed successfully.');
}

async function cleanup() {
  if (!fixtureDatabaseConnected) return;
  if (databaseStatus() !== 'connected' && env.MONGODB_URI) {
    await connectDatabase();
  }
  if (databaseStatus() !== 'connected') return;
  await Promise.all([
    DurableEventOutbox.deleteMany(scope),
    InvocationAttempt.deleteMany({ receivingWorkspaceId: scope.receivingWorkspaceId }),
    RuntimeWorkItem.deleteMany(scope),
    Invocation.deleteMany({ receivingWorkspaceId: scope.receivingWorkspaceId }),
  ]);
}

async function main() {
  const reservedInvocationSuite = spawnSync(
    process.execPath,
    ['--test', 'src/tests/reservedInvocation.test.js'],
    { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', windowsHide: true },
  );
  if (reservedInvocationSuite.status !== 0) {
    failedStage = 'reserved_invocation_loading';
    fail(new DurableVerificationError('DURABLE_RESERVED_INVOCATION_VERIFICATION_FAILED'));
    return;
  }
  report(
    'reserved invocation loading',
    'ownership and persisted credential alignment tests passed',
  );
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    blockedNetworkAttempts += 1;
    throw new DurableVerificationError('DURABLE_VERIFY_NETWORK_CALL_BLOCKED');
  };
  try {
    await verify();
  } catch (error) {
    fail(error);
  } finally {
    globalThis.fetch = originalFetch;
    await cleanup().catch(() => {
      if (!process.exitCode) {
        failedStage = 'fixture_cleanup';
        fail(new DurableVerificationError('DURABLE_VERIFY_CLEANUP_FAILED'));
      }
    });
    await disconnectDatabase().catch(() => undefined);
  }
}

void main();
