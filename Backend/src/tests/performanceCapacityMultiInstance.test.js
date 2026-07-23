const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const {
  DeterministicMultiInstancePerformanceHarness,
  MULTI_INSTANCE_HARNESS_LIMITS,
} = require('../services/performanceCapacityHarness.service');

test('bounded simulated process groups generate concurrent requests without child processes or external calls', () => {
  const harness = new DeterministicMultiInstancePerformanceHarness({
    backendInstanceCount: 2,
    executionWorkerCount: 3,
    recoveryWorkerCount: 2,
    controlPlaneWorkerCount: 2,
    regionalWorkerGroupCount: 2,
    workersPerRegionalGroup: 2,
  });
  const started = harness.start();
  assert.equal(started.configuredProcessCount, 13);
  assert.equal(started.processGroups.backend.processCount, 2);
  assert.equal(started.processGroups.execution.processCount, 3);
  assert.equal(started.processGroups.recovery.processCount, 2);
  assert.equal(started.processGroups['control-plane'].processCount, 2);
  assert.equal(started.processGroups['synthetic-region-1'].processCount, 2);
  assert.equal(started.processGroups['synthetic-region-2'].processCount, 2);
  assert.equal(started.childProcessCount, 0);
  assert.equal(started.externalCallCount, 0);

  const generated = harness.generateConcurrentRequests(12, { concurrency: 4 });
  assert.equal(generated.requestCount, 12);
  assert.equal(generated.peakConcurrency, 4);
  assert.deepEqual(generated.countsByBackend, { 'perf-backend-1': 6, 'perf-backend-2': 6 });
  assert.equal(new Set(generated.requests.map((request) => request.sequence)).size, 12);
  assert.equal(generated.requests.every((request) => request.outcome === 'completed'), true);
});

test('process, workload, concurrency, and timeout inputs fail closed at deterministic limits', () => {
  assert.throws(
    () => new DeterministicMultiInstancePerformanceHarness({ backendInstanceCount: MULTI_INSTANCE_HARNESS_LIMITS.maximumBackendInstances + 1 }),
    (error) => error.code === 'PERFORMANCE_HARNESS_LIMIT_EXCEEDED' && error.limitName === 'backendInstanceCount',
  );
  assert.throws(
    () => new DeterministicMultiInstancePerformanceHarness({
      backendInstanceCount: 8,
      executionWorkerCount: 16,
      recoveryWorkerCount: 8,
      controlPlaneWorkerCount: 8,
    }),
    (error) => error.code === 'PERFORMANCE_HARNESS_PROCESS_LIMIT_EXCEEDED',
  );
  assert.throws(
    () => new DeterministicMultiInstancePerformanceHarness({ timeoutMs: MULTI_INSTANCE_HARNESS_LIMITS.maximumTimeoutMs + 1 }),
    (error) => error.code === 'PERFORMANCE_HARNESS_LIMIT_EXCEEDED' && error.limitName === 'timeoutMs',
  );

  const harness = new DeterministicMultiInstancePerformanceHarness({ maximumWorkloadCount: 10 });
  harness.start();
  harness.generateConcurrentRequests(6, { concurrency: 2 });
  assert.throws(
    () => harness.enqueueWorkloads(5),
    (error) => error.code === 'PERFORMANCE_HARNESS_WORKLOAD_LIMIT_EXCEEDED' && error.maximum === 10,
  );
  assert.throws(
    () => harness.generateConcurrentRequests(1, { concurrency: harness.configuredProcessCount + 1 }),
    (error) => error.code === 'PERFORMANCE_HARNESS_LIMIT_EXCEEDED' && error.limitName === 'requestConcurrency',
  );
});

test('atomic claims, partition fencing, and worker drain preserve exactly-once completion', () => {
  const harness = new DeterministicMultiInstancePerformanceHarness({ maximumWorkloadCount: 20 });
  harness.start();
  harness.enqueueWorkloads(8);
  const first = harness.claim('perf-execution-1', 5_000);
  assert.ok(first);
  assert.equal(harness.scale.jobs.get(first.job.id).status, 'running');
  assert.equal(harness.scale.jobs.get(first.job.id).partitionOwnershipEpoch, first.partitionOwnershipEpoch);

  harness.drainWorker('perf-execution-1');
  assert.equal(harness.claim('perf-execution-1'), null);
  harness.complete(first);
  assert.throws(
    () => harness.complete(first),
    (error) => ['STALE_WORKER_LEASE', 'PARTITION_OWNERSHIP_LOST'].includes(error.code),
  );

  const drained = harness.executeUntilDrained();
  assert.equal(drained.completedCount, 7);
  assert.equal(drained.queuedCount, 0);
  assert.equal(drained.duplicateExecution, false);
  assert.equal(harness.scale.completions.length, 8);
  assert.equal(new Set(harness.scale.completions.map((completion) => completion.logicalId)).size, 8);
  assert.equal(harness.scale.workers.get('perf-execution-1').status, 'draining');
  assert.ok([...harness.scale.partitions.values()].every((partition) => partition.ownerWorkerId !== 'perf-execution-1'));
});

test('versioned invalidation evicts stale cache entries across every backend instance', () => {
  const harness = new DeterministicMultiInstancePerformanceHarness();
  harness.start();
  const loadV1 = () => ({ version: 1, valueCategory: 'policy_definition' });
  assert.equal(harness.cacheRead('perf-backend-1', 'definition.v1', loadV1).outcome, 'miss');
  assert.equal(harness.cacheRead('perf-backend-2', 'definition.v1', loadV1).outcome, 'miss');
  assert.equal(harness.cacheRead('perf-backend-1', 'definition.v1', loadV1).outcome, 'hit');

  const invalidation = harness.invalidateCacheAcrossInstances('definition.v1', 2);
  assert.deepEqual(invalidation, { version: 2, invalidatedInstanceCount: 2, backendInstanceCount: 2 });
  assert.equal([...harness.backendCaches.values()].every((cache) => cache.size === 0), true);
  assert.throws(
    () => harness.cacheRead('perf-backend-1', 'definition.v1', loadV1),
    (error) => error.code === 'PERFORMANCE_HARNESS_STALE_CACHE_VERSION',
  );
  assert.deepEqual(
    harness.cacheRead('perf-backend-1', 'definition.v1', () => ({ version: 2, valueCategory: 'policy_definition' })),
    { outcome: 'miss', value: { version: 2, valueCategory: 'policy_definition' } },
  );
  assert.throws(
    () => harness.cacheRead('perf-backend-2', 'unsafe', () => ({ version: 2, accessToken: 'not-safe' })),
    (error) => error.code === 'PERFORMANCE_HARNESS_UNSAFE_CACHE_VALUE',
  );
});

test('signal and exit interruption synchronously cancel work, clear caches, release ownership, and detach handlers', () => {
  const signals = new EventEmitter();
  const harness = new DeterministicMultiInstancePerformanceHarness();
  harness.start();
  harness.enqueueWorkloads(6);
  assert.ok(harness.claim('perf-execution-1'));
  harness.cacheRead('perf-backend-1', 'definition.v1', () => ({ version: 1, valueCategory: 'definition' }));
  harness.attachLifecycleHandlers(signals);
  assert.equal(signals.listenerCount('SIGTERM'), 1);

  signals.emit('SIGTERM');
  const snapshot = harness.safeSnapshot();
  assert.equal(snapshot.lifecycleState, 'cleaned_up');
  assert.equal(snapshot.interrupted, true);
  assert.equal(snapshot.terminationReason, 'signal');
  assert.equal(snapshot.cacheEntryCount, 0);
  assert.deepEqual(snapshot.workloadStates, { cancelled: 6 });
  assert.equal(signals.listenerCount('SIGTERM'), 0);
  assert.equal([...harness.scale.workers.values()].every((worker) => worker.status === 'stopped' && worker.activeClaimCount === 0), true);
  assert.equal([...harness.scale.partitions.values()].every((partition) => !partition.ownerWorkerId && partition.status === 'paused'), true);
  assert.equal([...harness.processes.values()].every((process) => process.state === 'stopped'), true);
  assert.deepEqual(harness.cleanup(), harness.cleanupSummary);

  const serialized = JSON.stringify(snapshot);
  assert.doesNotMatch(serialized, /access[_-]?token|authorization|bearer|https?:\/\/|perf-multi-org|perf-multi-workspace/i);
  assert.deepEqual(snapshot.safeLogs.map((entry) => entry.event), [
    'harness_started',
    'workloads_enqueued',
    'signal_received',
    'cleanup_completed',
  ]);

  const exitEvents = new EventEmitter();
  const exitHarness = new DeterministicMultiInstancePerformanceHarness();
  exitHarness.start();
  exitHarness.enqueueWorkloads(1);
  exitHarness.attachLifecycleHandlers(exitEvents);
  exitEvents.emit('exit', 0);
  assert.equal(exitHarness.safeSnapshot().terminationReason, 'process_exit');
  assert.equal(exitHarness.cleanupSummary.cancelledWorkloadCount, 1);
});

test('timeout cleanup is deterministic and cancels unfinished work before rejecting more claims', () => {
  const harness = new DeterministicMultiInstancePerformanceHarness({ timeoutMs: 1_000 });
  harness.start();
  harness.enqueueWorkloads(2);
  harness.advance(1_001);
  assert.throws(
    () => harness.claim('perf-execution-1'),
    (error) => error.code === 'PERFORMANCE_HARNESS_TIMEOUT',
  );
  const snapshot = harness.safeSnapshot();
  assert.equal(snapshot.lifecycleState, 'cleaned_up');
  assert.equal(snapshot.terminationReason, 'timeout');
  assert.deepEqual(snapshot.workloadStates, { cancelled: 2 });
  assert.deepEqual(snapshot.safeLogs.map((entry) => entry.event), [
    'harness_started',
    'workloads_enqueued',
    'timeout_reached',
    'cleanup_completed',
  ]);
});
