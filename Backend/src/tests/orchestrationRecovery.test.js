const assert = require('node:assert/strict');
const test = require('node:test');

const OrchestrationCheckpoint = require('../models/OrchestrationCheckpoint');
const OrchestrationCompensationPlan = require('../models/OrchestrationCompensationPlan');
const OrchestrationCompensationRun = require('../models/OrchestrationCompensationRun');
const OrchestrationCorrectedInput = require('../models/OrchestrationCorrectedInput');
const OrchestrationInterventionRequest = require('../models/OrchestrationInterventionRequest');
const OrchestrationRecoveryDecision = require('../models/OrchestrationRecoveryDecision');
const OrchestrationRecoveryPolicy = require('../models/OrchestrationRecoveryPolicy');
const OrchestrationNodeRun = require('../models/OrchestrationNodeRun');
const OrchestrationRun = require('../models/OrchestrationRun');
const {
  CHECKPOINT_TRANSITIONS,
  COMPENSATION_PLAN_TRANSITIONS,
  COMPENSATION_RUN_TRANSITIONS,
  INTERVENTION_TRANSITIONS,
  RECOVERY_DECISION_TRANSITIONS,
  assertRecoveryTransition,
  automaticRetryEligible,
  classifyRecoveryFailure,
  compensationIdempotencyKey,
  recoveryBackoff,
  safeCode,
} = require('../constants/orchestrationRecovery');
const {
  NODE_TRANSITIONS,
  RUN_TRANSITIONS,
  assertNodeTransition,
  assertRunTransition,
} = require('../constants/orchestration');
const {
  safeDefinitionSnapshot,
  validateDefinitionDocument,
} = require('../services/orchestrationValidation.service');
const {
  checkpointHash,
  checkpointSnapshot,
  compensationEligible,
  correctedInputPatch,
  deterministicCompensationSteps,
  normalizeRecoveryPolicyInput,
  validateCheckpoint,
  validateRecoveryPolicyDocument,
} = require('../services/orchestrationRecoveryValidation.service');

const objectId = (suffix) => `65a0000000000000000000${String(suffix).padStart(2, '0')}`;
const hash = (character = 'a') => `sha256:${character.repeat(64)}`;
const objectSchema = {
  type: 'object',
  properties: { orderId: { type: 'string' } },
  required: ['orderId'],
  additionalProperties: false,
};

function compensationDefinition(overrides = {}) {
  return {
    targetingMode: 'pinned',
    connectionId: objectId(11),
    passportId: objectId(12),
    passportVersion: '1.0.0',
    capability: 'order.cancel',
    operation: 'cancel',
    inputSchema: objectSchema,
    outputSchema: {
      type: 'object',
      properties: { cancelled: { type: 'boolean' } },
      required: ['cancelled'],
      additionalProperties: false,
    },
    inputMapping: { orderId: '$source.orderId' },
    timeoutMs: 5_000,
    retryPolicy: { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 1_000 },
    approvalRequirement: { required: false },
    expectedIdempotencyBehavior: 'ghost_bridge_keyed',
    successCriteria: {},
    parallelSafe: false,
    dependencies: [],
    ...overrides,
  };
}

function recoveryDefinition(nodeOverrides = {}, definitionOverrides = {}) {
  return {
    _id: objectId(90),
    name: 'Recovery test orchestration',
    version: 1,
    inputSchema: objectSchema,
    outputSchema: objectSchema,
    nodes: [
      {
        nodeKey: 'create_order',
        displayName: 'Create order',
        targetingMode: 'pinned',
        connectionId: objectId(1),
        passportId: objectId(2),
        _passportVersion: '1.0.0',
        capability: 'order.create',
        operation: 'create',
        inputSchema: objectSchema,
        outputSchema: objectSchema,
        inputMapping: { orderId: '$run.input.orderId' },
        timeoutMs: 5_000,
        retryPolicy: { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 1_000 },
        approvalRequirement: { required: false },
        policyContext: {},
        dependencies: [],
        recoverability: 'compensatable',
        failureStrategy: 'compensate_then_pause',
        compensationDefinition: compensationDefinition(),
        ...nodeOverrides,
      },
    ],
    edges: [],
    concurrencyLimit: 1,
    maxRunDurationMs: 60_000,
    maxNodeExecutions: 5,
    defaultNodeTimeoutMs: 5_000,
    recoveryPolicyId: objectId(40),
    recoveryPolicyVersion: 1,
    failureStrategy: 'request_intervention',
    compensationEnabled: true,
    maximumRecoveryAttempts: 3,
    maximumCompensationAttempts: 2,
    recoveryDeadlineMs: 60_000,
    compensationDeadlineMs: 60_000,
    interventionTimeoutMs: 60_000,
    ...definitionOverrides,
  };
}

function issueCodes(result) {
  return result.errors.map((entry) => entry.code);
}

test('safe failure classification is bounded and deterministic', () => {
  const cases = [
    [{ code: 'SAFE_FETCH_FAILED' }, 'transient_network'],
    [{ code: 'RUNTIME_TIMEOUT' }, 'timeout'],
    [{ code: 'RATE_LIMITED' }, 'rate_limited'],
    [{ code: 'CIRCUIT_OPEN' }, 'circuit_open'],
    [{ code: 'AUTHORIZATION_DENIED' }, 'authorization_denied'],
    [{ code: 'POLICY_DENIED' }, 'policy_denied'],
    [{ code: 'CONNECTION_REVOKED' }, 'connection_revoked'],
    [{ outcomeAmbiguous: true }, 'outcome_unknown'],
    [{ code: 'provider said bearer private-token' }, 'unknown_safe_failure'],
  ];
  for (const [error, expected] of cases) assert.equal(classifyRecoveryFailure(error), expected);
  assert.equal(safeCode('provider said bearer private-token'), 'UNKNOWN_SAFE_FAILURE');
});

test('automatic retry is bounded by category, attempts, deadline, policy and idempotency', () => {
  const input = {
    failureCategory: 'transient_network',
    attempt: 1,
    maximumAttempts: 2,
    idempotencySafe: true,
    policy: { permittedFailureCategories: ['transient_network'] },
  };
  assert.equal(automaticRetryEligible(input), true);
  assert.equal(automaticRetryEligible({ ...input, attempt: 2 }), false);
  assert.equal(automaticRetryEligible({ ...input, deadlineExpired: true }), false);
  assert.equal(automaticRetryEligible({ ...input, idempotencySafe: false }), false);
  for (const failureCategory of ['runtime_authentication', 'policy_denied', 'approval_rejected', 'outcome_unknown']) {
    assert.equal(automaticRetryEligible({ ...input, failureCategory }), false);
  }
});

test('recovery backoff is deterministic, bounded and includes controlled jitter', () => {
  const policy = { baseDelayMs: 100, maxDelayMs: 1_000, multiplier: 2, jitterRatio: 0.2 };
  assert.equal(recoveryBackoff(policy, 1, () => 0), 100);
  assert.equal(recoveryBackoff(policy, 3, () => 0.5), 440);
  assert.equal(recoveryBackoff(policy, 20, () => 1), 1_000);
});

test('compensation idempotency identity is stable and separates logical actions', () => {
  const identity = {
    orchestrationRunId: objectId(1),
    originalNodeRunId: objectId(2),
    compensationDefinitionVersion: 'sha256:definition-v1',
    compensationPlanId: objectId(3),
    compensationStepOrdinal: 1,
    logicalCompensationAttempt: 1,
  };
  const first = compensationIdempotencyKey(identity);
  assert.equal(first, compensationIdempotencyKey({ ...identity }));
  assert.notEqual(first, compensationIdempotencyKey({ ...identity, compensationStepOrdinal: 2 }));
  assert.notEqual(first, compensationIdempotencyKey({ ...identity, logicalCompensationAttempt: 2 }));
  assert.throws(() => compensationIdempotencyKey({ orchestrationRunId: objectId(1) }), TypeError);
});

test('recovery state machines accept guarded paths and reject terminal re-entry', () => {
  assert.equal(assertRecoveryTransition(RECOVERY_DECISION_TRANSITIONS, 'pending', 'applied', 'RECOVERY_DECISION_TRANSITION_INVALID'), true);
  assert.equal(assertRecoveryTransition(COMPENSATION_PLAN_TRANSITIONS, 'planned', 'active', 'COMPENSATION_PLAN_TRANSITION_INVALID'), true);
  assert.equal(assertRecoveryTransition(COMPENSATION_RUN_TRANSITIONS, 'running', 'succeeded', 'COMPENSATION_RUN_TRANSITION_INVALID'), true);
  assert.equal(assertRecoveryTransition(INTERVENTION_TRANSITIONS, 'pending', 'resolved', 'INTERVENTION_TRANSITION_INVALID'), true);
  assert.equal(assertRecoveryTransition(CHECKPOINT_TRANSITIONS, 'created', 'verified', 'CHECKPOINT_TRANSITION_INVALID'), true);
  assert.throws(
    () => assertRecoveryTransition(COMPENSATION_RUN_TRANSITIONS, 'succeeded', 'running', 'COMPENSATION_RUN_TRANSITION_INVALID'),
    { code: 'COMPENSATION_RUN_TRANSITION_INVALID' },
  );
});

test('orchestration run and node recovery transitions are explicit', () => {
  assert.equal(assertRunTransition('running', 'recovery_pending'), true);
  assert.equal(assertRunTransition('recovery_pending', 'recovering'), true);
  assert.equal(assertRunTransition('compensation_pending', 'compensating'), true);
  assert.equal(assertRunTransition('waiting_intervention', 'termination_requested'), true);
  assert.equal(assertNodeTransition('failed', 'recovery_pending'), true);
  assert.equal(assertNodeTransition('succeeded', 'compensation_pending'), true);
  assert.equal(assertNodeTransition('compensating', 'compensated'), true);
  assert.deepEqual(RUN_TRANSITIONS.terminated, []);
  assert.deepEqual(NODE_TRANSITIONS.compensated, []);
});

test('recovery-aware definition validation accepts a declared pinned compensation', () => {
  const result = validateDefinitionDocument(recoveryDefinition());
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  const snapshot = safeDefinitionSnapshot(recoveryDefinition());
  assert.equal(snapshot.recoveryPolicyVersion, 1);
  assert.equal(snapshot.nodes[0].recoverability, 'compensatable');
  assert.equal(snapshot.nodes[0].compensationDefinition.capability, 'order.cancel');
  assert.doesNotMatch(JSON.stringify(snapshot), /credential|authorization|installKey|providerKey/i);
});

test('compensation must be declared and cannot conflict with non-reversibility', () => {
  const missing = validateDefinitionDocument(
    recoveryDefinition({ compensationDefinition: undefined }),
  );
  assert.ok(issueCodes(missing).includes('ORCHESTRATION_COMPENSATION_REQUIRED'));
  const conflict = validateDefinitionDocument(
    recoveryDefinition({ recoverability: 'non_reversible' }),
  );
  assert.ok(issueCodes(conflict).includes('ORCHESTRATION_NON_REVERSIBLE_CONFLICT'));
});

test('compensation targeting is exclusive and executable mappings are rejected', () => {
  const mixedTarget = validateDefinitionDocument(
    recoveryDefinition({
      compensationDefinition: compensationDefinition({ selectionPolicyId: objectId(33) }),
    }),
  );
  assert.ok(issueCodes(mixedTarget).includes('ORCHESTRATION_COMPENSATION_TARGET_CONFLICT'));
  const executable = validateDefinitionDocument(
    recoveryDefinition({
      compensationDefinition: compensationDefinition({ inputMapping: { orderId: '$process.env.API_KEY' } }),
    }),
  );
  assert.ok(issueCodes(executable).includes('ORCHESTRATION_COMPENSATION_MAPPING_INVALID'));
});

test('recovery policy references, limits and compensation enablement fail closed', () => {
  assert.ok(
    issueCodes(validateDefinitionDocument(recoveryDefinition({}, { recoveryPolicyVersion: undefined })))
      .includes('ORCHESTRATION_RECOVERY_POLICY_REFERENCE_INVALID'),
  );
  assert.ok(
    issueCodes(validateDefinitionDocument(recoveryDefinition({}, { maximumRecoveryAttempts: 999 })))
      .includes('ORCHESTRATION_RECOVERY_LIMIT_INVALID'),
  );
  assert.ok(
    issueCodes(validateDefinitionDocument(recoveryDefinition({}, { compensationEnabled: false })))
      .includes('ORCHESTRATION_COMPENSATION_DISABLED'),
  );
});

test('recovery policy model is tenant scoped, versioned and active authority is service-guarded', () => {
  const policy = new OrchestrationRecoveryPolicy({
    organizationId: 'organization-a',
    workspaceId: 'workspace-a',
    name: 'Default recovery',
    version: 1,
    createdBy: 'user-a',
    updatedBy: 'user-a',
  });
  assert.equal(policy.validateSync(), undefined);
  for (const field of ['organizationId', 'workspaceId', 'version']) {
    assert.equal(OrchestrationRecoveryPolicy.schema.path(field).options.immutable, true);
  }
  assert.equal(OrchestrationRecoveryPolicy.schema.path('validationDigest').options.select, false);
  assert.ok(JSON.stringify(OrchestrationRecoveryPolicy.schema.indexes()).includes('unique_tenant_recovery_policy_version'));
});

test('recovery decisions and compensation plans freeze their logical identity', () => {
  for (const field of ['organizationId', 'workspaceId', 'orchestrationRunId', 'decisionType', 'idempotencyKeyHash']) {
    assert.equal(OrchestrationRecoveryDecision.schema.path(field).options.immutable, true);
  }
  assert.equal(OrchestrationRecoveryDecision.schema.path('idempotencyKeyHash').options.select, false);
  for (const field of ['organizationId', 'workspaceId', 'orchestrationRunId', 'orderedSteps', 'planDigest']) {
    assert.equal(OrchestrationCompensationPlan.schema.path(field).options.immutable, true);
  }
  assert.equal(OrchestrationCompensationPlan.schema.path('idempotencyKeyHash').options.select, false);
});

test('compensation persistence contains coordination metadata but hides authority and payloads', () => {
  for (const field of ['compensationDefinitionSnapshot', 'inputPayloadHash', 'outputPayloadHash', 'idempotencyKeyHash', 'leaseOwner', 'leaseTokenHash']) {
    assert.equal(OrchestrationCompensationRun.schema.path(field).options.select, false, field);
  }
  assert.equal(OrchestrationCompensationRun.schema.path('compensationDefinitionSnapshot').options.immutable, true);
  const indexes = JSON.stringify(OrchestrationCompensationRun.schema.indexes());
  for (const expected of ['leaseExpiresAt', 'nextAttemptAt', 'unique_compensation_plan_step', 'unique_tenant_compensation_idempotency']) {
    assert.ok(indexes.includes(expected), expected);
  }
});

test('interventions and checkpoints store safe bounded metadata with tenant indexes', () => {
  assert.equal(OrchestrationInterventionRequest.schema.path('safeSummary').options.immutable, true);
  assert.equal(OrchestrationInterventionRequest.schema.path('idempotencyKeyHash').options.select, false);
  assert.equal(OrchestrationCheckpoint.schema.path('safeStateHash').options.immutable, true);
  assert.equal(OrchestrationCheckpoint.schema.path('completedNodeKeys').options.immutable, true);
  const indexes = JSON.stringify([
    ...OrchestrationInterventionRequest.schema.indexes(),
    ...OrchestrationCheckpoint.schema.indexes(),
  ]);
  assert.ok(indexes.includes('unique_tenant_intervention_idempotency'));
  assert.ok(indexes.includes('unique_tenant_run_checkpoint_sequence'));
  assert.ok(indexes.includes('unique_tenant_run_checkpoint_key'));
});

test('corrected inputs preserve encrypted versions and never expose their payload by default', () => {
  assert.equal(OrchestrationCorrectedInput.schema.path('encryptedPayload').options.select, false);
  assert.equal(OrchestrationCorrectedInput.schema.path('encryptedPayload').options.immutable, true);
  assert.equal(OrchestrationCorrectedInput.schema.path('payloadHash').options.select, false);
  assert.ok(JSON.stringify(OrchestrationCorrectedInput.schema.indexes()).includes('unique_tenant_node_corrected_input_version'));
});

test('run and node recovery links do not expose protected snapshots by default', () => {
  assert.equal(OrchestrationRun.schema.path('recoveryPolicySnapshot').options.select, false);
  assert.equal(OrchestrationNodeRun.schema.path('recoveryTargetSnapshot').options.select, false);
  assert.ok(OrchestrationRun.schema.path('unresolvedSideEffects'));
  assert.ok(OrchestrationNodeRun.schema.path('completedSideEffectAt'));
  assert.ok(OrchestrationNodeRun.schema.path('compensationRunId'));
});

test('recovery-policy normalization is closed, validates bounds and protects active versions', () => {
  const normalized = normalizeRecoveryPolicyInput({
    name: 'Bounded recovery',
    defaultFailureStrategy: 'retry',
    maximumRecoveryAttempts: 2,
    permittedFailureCategories: ['transient_network', 'timeout'],
  });
  const validation = validateRecoveryPolicyDocument({
    ...normalized,
    organizationId: 'organization-a',
    workspaceId: 'workspace-a',
    version: 1,
    createdBy: 'user-a',
    updatedBy: 'user-a',
  });
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  assert.match(validation.validationDigest, /^sha256:[a-f0-9]{64}$/);
  assert.throws(
    () => normalizeRecoveryPolicyInput({ name: 'Unsafe', javascript: 'process.env.SECRET' }),
    { code: 'ORCHESTRATION_RECOVERY_POLICY_INVALID' },
  );
  assert.equal(validateRecoveryPolicyDocument({ ...normalized, maximumRecoveryAttempts: 999 }).valid, false);
  assert.throws(
    () => normalizeRecoveryPolicyInput({ description: 'changed' }, { ...normalized, status: 'active' }),
    { code: 'ORCHESTRATION_RECOVERY_POLICY_IMMUTABLE' },
  );
});

test('compensation eligibility distinguishes reversible, absent, completed and waived work', () => {
  const definition = {
    nodeKey: 'create_order',
    recoverability: 'compensatable',
    compensationDefinition: compensationDefinition(),
  };
  assert.equal(compensationEligible({ status: 'succeeded' }, definition).eligible, true);
  assert.equal(
    compensationEligible({ status: 'ready' }, definition).reasonCode,
    'SIDE_EFFECT_NOT_COMPLETED',
  );
  assert.equal(
    compensationEligible({ status: 'succeeded', compensationStatus: 'succeeded' }, definition)
      .reasonCode,
    'ALREADY_COMPENSATED',
  );
  assert.equal(
    compensationEligible({ status: 'succeeded', compensationStatus: 'waived' }, definition)
      .reasonCode,
    'COMPENSATION_WAIVED',
  );
  assert.equal(
    compensationEligible(
      { status: 'succeeded', completedSideEffectAt: new Date() },
      { nodeKey: 'payment', recoverability: 'non_reversible' },
    ).reasonCode,
    'NON_REVERSIBLE_SIDE_EFFECT',
  );
});

test('compensation planning is deterministic in reverse topology and reverse completion order', () => {
  const definition = {
    nodes: [
      { nodeKey: 'root', dependencies: [], recoverability: 'compensatable', compensationDefinition: compensationDefinition() },
      { nodeKey: 'child', dependencies: ['root'], recoverability: 'compensatable', compensationDefinition: compensationDefinition() },
      { nodeKey: 'branch', dependencies: [], recoverability: 'compensatable', compensationDefinition: compensationDefinition() },
    ],
    edges: [{ from: 'root', to: 'child' }],
  };
  const nodeRuns = [
    { _id: objectId(1), nodeKey: 'root', status: 'succeeded', completedSideEffectAt: new Date('2026-07-18T00:00:01Z') },
    { _id: objectId(2), nodeKey: 'child', status: 'succeeded', completedSideEffectAt: new Date('2026-07-18T00:00:02Z') },
    { _id: objectId(3), nodeKey: 'branch', status: 'succeeded', completedSideEffectAt: new Date('2026-07-18T00:00:03Z') },
  ];
  const topological = deterministicCompensationSteps(definition, nodeRuns, {
    ordering: 'reverse_topological',
  });
  assert.ok(topological.findIndex((step) => step.nodeKey === 'child') < topological.findIndex((step) => step.nodeKey === 'root'));
  const completion = deterministicCompensationSteps(definition, [...nodeRuns].reverse(), {
    ordering: 'reverse_completion',
  });
  assert.deepEqual(completion.map((step) => step.nodeKey), ['branch', 'child', 'root']);
  assert.deepEqual(
    completion,
    deterministicCompensationSteps(definition, nodeRuns, { ordering: 'reverse_completion' }),
  );
});

test('checkpoint hashes are order-stable and tampering or invalidation fails safely', () => {
  const run = { _id: objectId(50), status: 'waiting_intervention' };
  const nodes = [
    { nodeKey: 'b', status: 'succeeded' },
    { nodeKey: 'a', status: 'compensated' },
    { nodeKey: 'c', status: 'failed' },
  ];
  const options = {
    definitionSnapshotHash: hash('a'),
    selectionSnapshotHash: hash('b'),
    contractSnapshotHash: hash('c'),
    recoveryPolicySnapshotHash: hash('d'),
  };
  const snapshot = checkpointSnapshot(run, nodes, options);
  const reversed = checkpointSnapshot(run, [...nodes].reverse(), options);
  assert.deepEqual(snapshot, reversed);
  const safeStateHash = checkpointHash(snapshot);
  assert.equal(validateCheckpoint({ ...snapshot, safeStateHash, status: 'verified' }).valid, true);
  assert.equal(
    validateCheckpoint({ ...snapshot, completedNodeKeys: ['forged'], safeStateHash }).valid,
    false,
  );
  assert.ok(
    validateCheckpoint({ ...snapshot, safeStateHash, status: 'invalidated' }).errors
      .some((entry) => entry.code === 'CHECKPOINT_INVALIDATED'),
  );
});

test('corrected input is immutable, schema bounded and cannot add secrets or lower classification', () => {
  const schema = {
    type: 'object',
    properties: {
      orderId: { type: 'string' },
      quantity: { type: 'integer', minimum: 1 },
    },
    required: ['orderId', 'quantity'],
    additionalProperties: false,
  };
  const original = { orderId: 'order-1', quantity: 1 };
  const corrected = correctedInputPatch(original, { quantity: 2 }, {
    inputSchema: schema,
    allowedCorrectionFields: ['quantity'],
    originalClassification: 'confidential',
    dataClassification: 'confidential',
  });
  assert.deepEqual(original, { orderId: 'order-1', quantity: 1 });
  assert.deepEqual(corrected.input, { orderId: 'order-1', quantity: 2 });
  assert.deepEqual(corrected.changedFieldNames, ['quantity']);
  assert.match(corrected.payloadHash, /^sha256:[a-f0-9]{64}$/);
  assert.throws(
    () => correctedInputPatch(original, { apiKey: 'private' }, { inputSchema: schema }),
    /protected|invalid|undeclared/i,
  );
  assert.throws(
    () => correctedInputPatch(original, { quantity: 2 }, {
      inputSchema: schema,
      originalClassification: 'restricted',
      dataClassification: 'public',
    }),
    { code: 'ORCHESTRATION_CORRECTED_INPUT_CLASSIFICATION_DOWNGRADE' },
  );
});
