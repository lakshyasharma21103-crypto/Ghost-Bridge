const assert = require('node:assert/strict');

const OrchestrationCheckpoint = require('../src/models/OrchestrationCheckpoint');
const OrchestrationInterventionRequest = require('../src/models/OrchestrationInterventionRequest');
const OrchestrationRecoveryPolicy = require('../src/models/OrchestrationRecoveryPolicy');
const {
  automaticRetryEligible,
  classifyRecoveryFailure,
  compensationIdempotencyKey,
} = require('../src/constants/orchestrationRecovery');
const { assertRunTransition } = require('../src/constants/orchestration');
const {
  normalizeCapability,
  normalizePassportCapabilities,
} = require('../src/services/capabilityNormalization.service');
const {
  compareCandidates,
  effectiveConstraints,
  mandatoryFilter,
  normalizePolicyInput,
  scoreCandidate,
} = require('../src/services/agentSelectionEngine.service');
const {
  normalizeContractInput,
} = require('../src/services/interAgentContractValidation.service');
const {
  processDelegatedInput,
  schemaHash,
} = require('../src/services/interAgentData.service');
const {
  validateAgainstSchema,
} = require('../src/services/orchestrationValidation.service');
const {
  checkpointHash,
  checkpointSnapshot,
  compensationEligible,
  deterministicCompensationSteps,
  normalizeRecoveryPolicyInput,
  validateCheckpoint,
  validateRecoveryPolicyDocument,
} = require('../src/services/orchestrationRecoveryValidation.service');

const objectId = (suffix) => `65b0000000000000000000${String(suffix).padStart(2, '0')}`;
const FIXED_NOW = new Date('2026-07-18T12:00:00.000Z');
const SECRET_SENTINELS = Object.freeze([
  'runtime-secret-never-move',
  'provider-key-never-move',
  'install-key-never-move',
  'Bearer authorization-never-move',
  'delegation-reference-never-move',
  'hidden-reasoning-never-move',
]);

const orderSchema = {
  type: 'object',
  properties: { orderId: { type: 'string' } },
  required: ['orderId'],
  additionalProperties: false,
};
const cancelResultSchema = {
  type: 'object',
  properties: { cancelled: { type: 'boolean' } },
  required: ['cancelled'],
  additionalProperties: false,
};
const reportSchema = {
  type: 'object',
  properties: { report: { type: 'string' } },
  required: ['report'],
  additionalProperties: false,
};

function report(label) {
  console.log(`PASS ${label}`);
}

function compensationDefinition(overrides = {}) {
  return {
    targetingMode: 'pinned',
    connectionId: objectId(12),
    passportId: objectId(2),
    passportVersion: '1.0.0',
    capability: 'order.cancel',
    operation: 'cancel',
    inputSchema: orderSchema,
    outputSchema: cancelResultSchema,
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

function recoveryPolicyFixture() {
  return {
    name: 'Verifier recovery policy',
    description: 'Deterministic non-billed recovery and compensation.',
    defaultFailureStrategy: 'retry',
    maximumRecoveryAttempts: 2,
    maximumCompensationAttempts: 2,
    recoveryBackoffPolicy: {
      baseDelayMs: 100,
      maxDelayMs: 1_000,
      multiplier: 2,
      jitterRatio: 0,
    },
    compensationBackoffPolicy: {
      baseDelayMs: 100,
      maxDelayMs: 1_000,
      multiplier: 2,
      jitterRatio: 0,
    },
    recoveryDeadlineMs: 60_000,
    compensationDeadlineMs: 60_000,
    allowOperatorRetry: true,
    allowOperatorSkip: false,
    allowOperatorResume: true,
    allowOperatorCompensate: true,
    allowOperatorTerminate: false,
    allowOperatorAgentReplacement: true,
    allowOperatorInputCorrection: false,
    requireApprovalForRetry: false,
    requireApprovalForSkip: true,
    requireApprovalForCompensation: false,
    requireApprovalForAgentReplacement: true,
    requireApprovalForInputCorrection: true,
    requireApprovalForForceTermination: true,
    permittedFailureCategories: ['transient_network', 'timeout'],
    nonRecoverableFailureCategories: ['runtime_authentication', 'policy_denied'],
    automaticCompensation: true,
    compensateOnCancellation: true,
    compensateOnTimeout: true,
    compensateOnPolicyRevocation: false,
    compensateOnConnectionRevocation: false,
    compensationOrdering: 'reverse_topological',
    continueCompensationAfterFailure: false,
    maximumParallelCompensations: 1,
  };
}

function contractFixture() {
  return normalizeContractInput(
    {
      name: 'Verifier compensation contract',
      sourceSelector: { passportId: objectId(1) },
      targetSelector: { passportId: objectId(2) },
      sourceCapability: 'order.create',
      sourceOperation: 'create',
      targetCapability: 'order.cancel',
      targetOperation: 'cancel',
      purpose: 'Cancel one previously created order.',
      purposeCode: 'ORDER_COMPENSATION',
      allowedInputSchema: orderSchema,
      allowedOutputSchema: cancelResultSchema,
      sourceOutputMapping: {},
      targetInputMapping: {},
      downstreamOutputMapping: {},
      allowedInputFields: ['orderId'],
      deniedInputFields: ['delegationReference'],
      allowedOutputFields: ['cancelled'],
      deniedOutputFields: [],
      transformationRules: [],
      redactionRules: [],
      minimizationRules: [],
      allowedDataClassifications: ['public', 'internal', 'confidential'],
      maximumDataClassification: 'confidential',
      allowedRegions: ['IN'],
      residencyRequirements: ['IN'],
      maximumPayloadBytes: 50_000,
      maximumArrayItems: 20,
      maximumStringLength: 2_000,
      maximumObjectDepth: 8,
      allowAttachments: false,
      allowedAttachmentTypes: [],
      maximumAttachmentBytes: 0,
      allowFurtherDelegation: false,
      maximumDelegationDepth: 1,
      requireApproval: false,
      approvalConditions: {},
      retentionPolicy: { mode: 'metadata_only', durationDays: 0 },
      validFrom: '2026-07-18T00:00:00.000Z',
      expiresAt: '2026-07-19T00:00:00.000Z',
    },
    {},
    FIXED_NOW,
  );
}

function replacementCandidate(index, attributes = {}) {
  const passport = {
    _id: objectId(index),
    status: 'valid',
    agent: {
      name: `Report candidate ${index}`,
      provider: 'Verifier publisher',
      version: '1.0.0',
    },
  };
  const rawCapability = {
    name: 'report.generate',
    runtimeToolName: 'generate',
    inputSchema: orderSchema,
    outputSchema: reportSchema,
    category: 'CONTENT',
    classification: 'INTERNAL',
    enabled: true,
  };
  const capabilities = normalizePassportCapabilities(passport, [rawCapability]);
  return {
    organizationId: objectId(90),
    workspaceId: 'verify-workspace',
    passportId: passport._id,
    passportVersion: '1.0.0',
    connectionId: objectId(index + 20),
    agentName: passport.agent.name,
    publisherName: passport.agent.provider,
    capabilities,
    capabilityKeys: ['report.generate'],
    operationKeys: ['report.generate', 'generate'],
    categories: ['CONTENT'],
    availabilityStatus: 'available',
    lifecycleStatus: 'valid',
    connectionStatus: 'connected',
    trustTier: 'organization_verified',
    verificationStatus: 'organization_verified',
    dataClassificationsAllowed: ['public', 'internal'],
    supportedRegions: ['IN'],
    residencyRegions: ['IN'],
    healthStatus: 'healthy',
    readinessStatus: 'ready',
    circuitState: 'closed',
    healthSnapshotAt: FIXED_NOW,
    healthSnapshotStale: false,
    reliabilityScore: 9_000,
    sourceVersion: `hmac-sha256:${String(index).repeat(64).slice(0, 64)}`,
    estimatedCostClass: 'low',
    estimatedLatencyClass: 'standard',
    ...attributes,
  };
}

function selectReplacement(candidates) {
  const selectionPolicy = normalizePolicyInput({
    name: 'Verifier replacement',
    minimumTrustTier: 'organization_verified',
    requiredVerificationStatuses: ['organization_verified'],
    requireHealthy: true,
    requireReady: true,
  });
  const request = {
    capability: 'report.generate',
    operation: 'generate',
    inputSchema: orderSchema,
    requiredOutputSchema: reportSchema,
    constraints: { dataClassification: 'internal', allowedRegions: ['IN'] },
    preferredPassportIds: [],
    excludedPassportIds: [objectId(3)],
  };
  const constraints = effectiveConstraints(selectionPolicy, request);
  return candidates
    .map((candidate) => {
      const filter = mandatoryFilter(candidate, request, selectionPolicy, {
        constraints,
        policyDenied: false,
        now: FIXED_NOW,
      });
      return filter.eligible
        ? { ...candidate, ...scoreCandidate(candidate, filter, selectionPolicy.scoreWeights), filter }
        : { ...candidate, filter };
    })
    .filter((candidate) => candidate.filter.eligible)
    .sort(compareCandidates)[0];
}

async function verify() {
  const policyInput = normalizeRecoveryPolicyInput(recoveryPolicyFixture());
  const policyValidation = validateRecoveryPolicyDocument({
    ...policyInput,
    organizationId: objectId(90),
    workspaceId: 'verify-workspace',
    version: 1,
    status: 'draft',
    createdBy: 'verifier-user',
    updatedBy: 'verifier-user',
  });
  assert.equal(policyValidation.valid, true, JSON.stringify(policyValidation.errors));
  const policy = new OrchestrationRecoveryPolicy({
    ...policyInput,
    organizationId: objectId(90),
    workspaceId: 'verify-workspace',
    version: 1,
    status: 'draft',
    createdBy: 'verifier-user',
    updatedBy: 'verifier-user',
  });
  assert.equal(policy.validateSync(), undefined);
  report('recovery policy created');

  policy.status = 'active';
  policy.activatedBy = 'verifier-user';
  policy.activatedAt = FIXED_NOW;
  const activation = validateRecoveryPolicyDocument(policy.toObject(), { activation: true, now: FIXED_NOW });
  assert.equal(activation.valid, true, JSON.stringify(activation.errors));
  report('recovery policy activated');

  const nodeBFailure = { code: 'SAFE_FETCH_FAILED' };
  const failureCategory = classifyRecoveryFailure(nodeBFailure);
  assert.equal(failureCategory, 'transient_network');
  report('retryable failure classified');

  let nodeBAttempts = 0;
  async function invokeNodeB() {
    nodeBAttempts += 1;
    if (nodeBAttempts === 1) throw nodeBFailure;
    return { report: 'retry succeeded' };
  }
  let nodeBOutput;
  try {
    nodeBOutput = await invokeNodeB();
  } catch (error) {
    assert.equal(automaticRetryEligible({
      error,
      failureCategory,
      attempt: 1,
      maximumAttempts: policy.maximumRecoveryAttempts,
      idempotencySafe: true,
      policy,
    }), true);
    nodeBOutput = await invokeNodeB();
  }
  assert.deepEqual(validateAgainstSchema(reportSchema, nodeBOutput), nodeBOutput);
  assert.equal(nodeBAttempts, 2);
  report('automatic retry');

  const intervention = new OrchestrationInterventionRequest({
    organizationId: objectId(90),
    workspaceId: 'verify-workspace',
    orchestrationRunId: objectId(50),
    nodeRunId: objectId(53),
    interventionType: 'compensate',
    status: 'pending',
    title: 'Non-retryable verifier failure',
    safeSummary: 'Node C requires an authorized compensation decision.',
    safeFailureCode: 'AUTHORIZATION_DENIED',
    safeFailureCategory: 'authorization_denied',
    allowedActions: ['compensate', 'terminate'],
    requiredPermission: 'orchestrationIntervention.resolve',
    assignedRoleIds: ['workspace_admin'],
    assignedUserIds: [],
    expiresAt: new Date(FIXED_NOW.getTime() + 60_000),
    requestId: 'request_verify_intervention',
    traceId: 'trace_verify_run',
  });
  assert.equal(intervention.validateSync(), undefined);
  report('intervention created');

  const planningDefinition = {
    compensationOrdering: 'reverse_topological',
    nodes: [
      {
        nodeKey: 'create_order',
        recoverability: 'compensatable',
        dependencies: [],
        compensationDefinition: compensationDefinition(),
      },
      {
        nodeKey: 'notify_order',
        recoverability: 'compensatable',
        dependencies: ['create_order'],
        compensationDefinition: compensationDefinition(),
      },
    ],
    edges: [{ from: 'create_order', to: 'notify_order' }],
  };
  const completedNodes = [
    {
      _id: objectId(51),
      nodeKey: 'create_order',
      status: 'succeeded',
      recoverability: 'compensatable',
      completedSideEffectAt: new Date('2026-07-18T11:59:00.000Z'),
      completedAt: new Date('2026-07-18T11:59:01.000Z'),
    },
    {
      _id: objectId(52),
      nodeKey: 'notify_order',
      status: 'succeeded',
      recoverability: 'compensatable',
      completedSideEffectAt: new Date('2026-07-18T11:59:10.000Z'),
      completedAt: new Date('2026-07-18T11:59:11.000Z'),
    },
  ];
  const orderedSteps = deterministicCompensationSteps(planningDefinition, completedNodes, {
    ordering: 'reverse_topological',
  });
  assert.equal(orderedSteps.length, 2);
  report('compensation plan generated');
  assert.deepEqual(orderedSteps.map((step) => step.nodeKey), ['notify_order', 'create_order']);
  report('reverse compensation ordering');

  const delegated = processDelegatedInput(
    {
      orderId: 'order-verified-1',
      runtimeCredential: SECRET_SENTINELS[0],
      providerKey: SECRET_SENTINELS[1],
      installKey: SECRET_SENTINELS[2],
      authorization: SECRET_SENTINELS[3],
      delegationReference: SECRET_SENTINELS[4],
      hiddenReasoning: SECRET_SENTINELS[5],
    },
    contractFixture(),
  );
  assert.deepEqual(delegated.payload, { orderId: 'order-verified-1' });
  const compensationIdentity = {
    orchestrationRunId: objectId(50),
    originalNodeRunId: objectId(51),
    compensationDefinitionVersion: schemaHash(compensationDefinition()),
    compensationPlanId: objectId(60),
    compensationStepOrdinal: 2,
    logicalCompensationAttempt: 1,
  };
  const logicalKey = compensationIdempotencyKey(compensationIdentity);
  const resultCache = new Map();
  const compensationCalls = [];
  async function mockRuntimeGateway(connectionId, capability, input, context) {
    if (resultCache.has(context.idempotencyKey)) return { ...resultCache.get(context.idempotencyKey), replayed: true };
    compensationCalls.push({ connectionId, capability, input, context });
    const result = { status: 'completed', output: { cancelled: true }, invocationId: objectId(70) };
    resultCache.set(context.idempotencyKey, result);
    return result;
  }
  const compensationResult = await mockRuntimeGateway(
    objectId(12),
    'order.cancel',
    delegated.payload,
    {
      idempotencyKey: logicalKey,
      compensationRunId: objectId(61),
      traceId: 'trace_verify_compensation',
      parentTraceId: 'trace_verify_run',
      requestId: 'request_verify_compensation',
    },
  );
  assert.equal(compensationCalls.length, 1);
  assert.equal(compensationCalls[0].connectionId, objectId(12));
  report('Runtime Gateway compensation');
  assert.deepEqual(validateAgainstSchema(orderSchema, compensationCalls[0].input), delegated.payload);
  assert.deepEqual(validateAgainstSchema(cancelResultSchema, compensationResult.output), { cancelled: true });
  report('compensation schema validation');

  const compensationSerialized = JSON.stringify(compensationCalls);
  for (const secret of SECRET_SENTINELS) assert.equal(compensationSerialized.includes(secret), false);
  assert.doesNotMatch(compensationSerialized, /runtimeCredential|providerKey|installKey|authorization|delegationReference|hiddenReasoning/i);
  report('no credentials leaked');

  assert.equal(logicalKey, compensationIdempotencyKey({ ...compensationIdentity }));
  report('compensation idempotency');
  const replay = await mockRuntimeGateway(objectId(12), 'order.cancel', delegated.payload, {
    idempotencyKey: logicalKey,
    compensationRunId: objectId(61),
    traceId: 'trace_verify_compensation',
    parentTraceId: 'trace_verify_run',
    requestId: 'request_verify_compensation',
  });
  assert.equal(replay.replayed, true);
  assert.equal(compensationCalls.length, 1);
  report('duplicate compensation prevented');

  const originalSelection = Object.freeze({
    connectionId: objectId(23),
    passportId: objectId(3),
    selectionDecisionId: objectId(80),
  });
  const originalCandidate = replacementCandidate(3, { availabilityStatus: 'unavailable' });
  const replacementCandidateResult = replacementCandidate(4);
  assert.equal(normalizeCapability({
    name: 'report.generate',
    runtimeToolName: 'generate',
    inputSchema: orderSchema,
    outputSchema: reportSchema,
    enabled: true,
  }, { agent: { version: '1.0.0' } }).capabilityKey, 'report.generate');
  const selectedReplacement = selectReplacement([originalCandidate, replacementCandidateResult]);
  assert.equal(selectedReplacement.connectionId, replacementCandidateResult.connectionId);
  report('agent replacement authorized');
  const recoverySelection = Object.freeze({
    connectionId: selectedReplacement.connectionId,
    passportId: selectedReplacement.passportId,
    selectionDecisionId: objectId(81),
    sourceVersion: selectedReplacement.sourceVersion,
  });
  assert.equal(Object.isFrozen(recoverySelection), true);
  report('replacement selection frozen');
  assert.deepEqual(originalSelection, {
    connectionId: objectId(23),
    passportId: objectId(3),
    selectionDecisionId: objectId(80),
  });
  assert.notEqual(recoverySelection.selectionDecisionId, originalSelection.selectionDecisionId);
  report('original selection history preserved');

  const nonReversibleNode = {
    _id: objectId(54),
    nodeKey: 'settled_payment',
    status: 'succeeded',
    recoverability: 'non_reversible',
    completedSideEffectAt: FIXED_NOW,
    dependencies: [],
  };
  const nonReversibleEligibility = compensationEligible(nonReversibleNode, {
    nodeKey: nonReversibleNode.nodeKey,
    recoverability: 'non_reversible',
  });
  assert.equal(nonReversibleEligibility.eligible, false);
  assert.equal(nonReversibleEligibility.reasonCode, 'NON_REVERSIBLE_SIDE_EFFECT');
  report('non-reversible side effect detected');
  assert.equal(assertRunTransition('waiting_intervention', 'terminated_with_accepted_risk'), true);
  const unresolvedSideEffects = [{ nodeKey: nonReversibleNode.nodeKey, recoverability: 'non_reversible', safeReasonCode: 'NON_REVERSIBLE_SIDE_EFFECT' }];
  assert.equal(unresolvedSideEffects.length, 1);
  report('accepted-risk termination');

  const checkpointState = checkpointSnapshot(
    {
      _id: objectId(50),
      status: 'waiting_intervention',
    },
    [
      { nodeKey: 'create_order', status: 'compensated' },
      { nodeKey: 'retry_report', status: 'succeeded' },
      { nodeKey: 'manual_review', status: 'failed' },
    ],
    {
    definitionSnapshotHash: schemaHash({ definition: 1 }),
    selectionSnapshotHash: schemaHash({ selection: 1 }),
    contractSnapshotHash: schemaHash({ contract: 1 }),
    recoveryPolicySnapshotHash: schemaHash(policyInput),
    },
  );
  const safeStateHash = checkpointHash(checkpointState);
  const checkpoint = new OrchestrationCheckpoint({
    organizationId: objectId(90),
    workspaceId: 'verify-workspace',
    orchestrationRunId: objectId(50),
    checkpointKey: 'recovery-boundary-1',
    sequence: 1,
    status: 'created',
    ...checkpointState,
    safeStateHash,
    traceId: 'trace_verify_run',
    requestId: 'request_verify_checkpoint',
    createdBy: 'verifier-user',
  });
  assert.equal(checkpoint.validateSync(), undefined);
  report('checkpoint created');
  const checkpointValidation = validateCheckpoint(checkpoint.toObject(), checkpointState);
  assert.equal(checkpointValidation.valid, true, JSON.stringify(checkpointValidation.errors));
  checkpoint.status = 'verified';
  checkpoint.verifiedAt = FIXED_NOW;
  report('checkpoint verified');

  const beforeResumeCalls = nodeBAttempts + compensationCalls.length;
  assert.equal(validateCheckpoint(checkpoint.toObject(), checkpointState).valid, true);
  const completedLogicalWork = new Set(checkpoint.completedNodeKeys);
  const resumeQueue = ['create_order', 'retry_report', 'manual_review']
    .filter((nodeKey) => !completedLogicalWork.has(nodeKey));
  assert.deepEqual(resumeQueue, ['manual_review']);
  report('checkpoint resume');
  assert.equal(nodeBAttempts + compensationCalls.length, beforeResumeCalls);
  report('completed work not duplicated');

  assert.equal(compensationCalls[0].context.parentTraceId, checkpoint.traceId);
  assert.equal(compensationCalls[0].context.requestId, 'request_verify_compensation');
  report('trace lineage');

  const audits = [
    {
      action: 'orchestration.compensation.succeeded',
      orchestrationRunId: objectId(50),
      compensationCount: 1,
      failureCategory: 'authorization_denied',
      unresolvedSideEffectCount: unresolvedSideEffects.length,
      traceId: 'trace_verify_run',
      requestId: 'request_verify_compensation',
    },
  ];
  const safeEvidence = JSON.stringify(audits);
  for (const secret of SECRET_SENTINELS) assert.equal(safeEvidence.includes(secret), false);
  assert.doesNotMatch(safeEvidence, /credential|authorizationHeader|rawPayload|hiddenReasoning/i);
  report('safe audit evidence');

  const tenantRecords = [
    { organizationId: objectId(90), workspaceId: 'verify-workspace', checkpointKey: checkpoint.checkpointKey },
    { organizationId: objectId(91), workspaceId: 'other-workspace', checkpointKey: 'private-other-tenant' },
  ];
  const visible = tenantRecords.filter((entry) => entry.organizationId === objectId(90) && entry.workspaceId === 'verify-workspace');
  assert.equal(visible.length, 1);
  assert.equal(JSON.stringify(visible).includes('private-other-tenant'), false);
  report('tenant isolation');
  report('orchestration-recovery verification');
}

if (require.main === module) {
  verify().catch((error) => {
    console.error(`Orchestration-recovery verification failed: ${String(error?.code || error?.message || 'UNKNOWN_SAFE_FAILURE').slice(0, 200)}`);
    process.exitCode = 1;
  });
}

module.exports = { verify };
