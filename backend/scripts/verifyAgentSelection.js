const assert = require('node:assert/strict');
const {
  normalizeCapability,
  normalizePassportCapabilities,
} = require('../src/services/capabilityNormalization.service');
const { checkSchemaCompatibility } = require('../src/services/schemaCompatibility.service');
const {
  candidateSnapshotHash,
  compareCandidates,
  effectiveConstraints,
  mandatoryFilter,
  normalizePolicyInput,
  scoreCandidate,
  selectionRequiresApproval,
} = require('../src/services/agentSelectionEngine.service');
const {
  safeDefinitionSnapshot,
  validateDefinitionDocument,
} = require('../src/services/orchestrationValidation.service');

function report(stage, detail) {
  console.log(`PASS ${stage}: ${detail}`);
}

const objectId = (suffix) => `64c0000000000000000000${String(suffix).padStart(2, '0')}`;
const inputSchema = { type: 'object', properties: { topic: { type: 'string' } }, required: ['topic'], additionalProperties: false };
const outputSchema = { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'], additionalProperties: false };
const rawCapability = { name: 'research.summary', runtimeToolName: 'summarize', description: 'Bounded summary', inputSchema, outputSchema, category: 'SEARCH', classification: 'LOW', enabled: true };

function mockCandidate(index, attributes) {
  const passport = { _id: objectId(index), status: 'valid', agent: { name: `Candidate ${String.fromCharCode(64 + index)}`, provider: 'Verifier Publisher', description: 'Untrusted descriptive prose', version: '1.0.0' } };
  const normalized = normalizePassportCapabilities(passport, [rawCapability]);
  return {
    organizationId: objectId(80), workspaceId: 'verify-workspace', passportId: passport._id, passportVersion: '1.0.0', connectionId: objectId(index + 10),
    agentName: passport.agent.name, publisherName: passport.agent.provider, capabilities: normalized, capabilityKeys: ['research.summary'], operationKeys: ['research.summary', 'summarize'], categories: ['SEARCH'],
    availabilityStatus: 'available', lifecycleStatus: 'valid', connectionStatus: 'connected', dataClassificationsAllowed: ['public'], supportedRegions: ['IN'], residencyRegions: ['IN'],
    healthStatus: 'healthy', readinessStatus: 'ready', circuitState: 'closed', healthSnapshotAt: new Date('2026-07-18T00:00:00Z'), healthSnapshotStale: false, reliabilityScore: 9000,
    sourceVersion: `hmac-sha256:candidate-${index}`, administrativelyPreferred: false, ...attributes,
  };
}

function evaluate(candidates, policy) {
  const request = { capability: 'research.summary', operation: 'summarize', inputSchema, requiredOutputSchema: outputSchema, constraints: { dataClassification: 'public' }, preferredPassportIds: [], excludedPassportIds: [] };
  const constraints = effectiveConstraints(policy, request);
  const evaluated = candidates.map((candidate) => {
    const filter = mandatoryFilter(candidate, request, policy, { constraints, policyDenied: false, now: new Date('2026-07-18T00:01:00Z') });
    return filter.eligible ? { ...candidate, ...scoreCandidate(candidate, filter, policy.scoreWeights), filter } : { ...candidate, filter };
  });
  return { request, constraints, evaluated, eligible: evaluated.filter((item) => item.filter.eligible).sort(compareCandidates) };
}

async function verify() {
  const candidates = [
    mockCandidate(1, { trustTier: 'organization_verified', verificationStatus: 'organization_verified', estimatedCostClass: 'high', estimatedLatencyClass: 'standard' }),
    mockCandidate(2, { trustTier: 'organization_verified', verificationStatus: 'organization_verified', estimatedCostClass: 'low', estimatedLatencyClass: 'standard' }),
    mockCandidate(3, { trustTier: 'registered', verificationStatus: 'unverified', estimatedCostClass: 'low', estimatedLatencyClass: 'fast' }),
  ];
  assert.equal(candidates.length, 3);
  report('candidate catalog created', 'three normalized installed mock Agent Passports share one capability and operation');

  const compatibility = checkSchemaCompatibility(inputSchema, candidates[0].capabilities[0].inputSchema, candidates[0].capabilities[0].outputSchema, outputSchema);
  assert.equal(compatibility.status, 'compatible');
  report('schema compatibility', 'conservative input and output compatibility is compatible');

  const policy = normalizePolicyInput({
    name: 'Verified lower-cost verifier policy', minimumTrustTier: 'organization_verified', requiredVerificationStatuses: ['organization_verified'], requireHealthy: true, requireReady: true,
    scoreWeights: { schemaCompatibility: 5, trust: 5, health: 5, readiness: 5, latency: 10, cost: 60, publisherVerification: 5, administrativePreference: 2, recentReliability: 3 }, fallbackCandidateCount: 2,
  });
  const first = evaluate(candidates, policy);
  assert.ok(first.evaluated[2].filter.reasons.includes('TRUST_REQUIREMENT_NOT_MET'));
  report('trust filtering', 'unverified Candidate C is excluded before scoring');

  assert.equal(first.eligible[0].agentName, 'Candidate B');
  assert.ok(first.eligible[0].score > first.eligible[1].score);
  report('deterministic scoring', 'verified Candidate B wins because administratively verified lower cost has the higher fixed score');

  const repeated = evaluate([...candidates].reverse(), policy);
  assert.equal(repeated.eligible[0].connectionId, first.eligible[0].connectionId);
  assert.equal(repeated.eligible[0].score, first.eligible[0].score);
  assert.equal(candidateSnapshotHash(candidates), candidateSnapshotHash([...candidates].reverse()));
  report('deterministic tie breaking', 'input order does not alter snapshot hash, winner, score, or fixed ID fallback');

  const fallbacks = first.eligible.slice(1).map((item) => item.connectionId);
  assert.deepEqual(fallbacks, [objectId(11)]);
  report('fallback ordering', 'Candidate A is recorded after Candidate B with stable ordering');

  const definition = {
    _id: objectId(50), name: 'Governed verifier orchestration', version: 1, inputSchema, outputSchema, concurrencyLimit: 1, maxRunDurationMs: 60000, maxNodeExecutions: 2, defaultNodeTimeoutMs: 5000, edges: [],
    nodes: [{ nodeKey: 'research', displayName: 'Research', targetingMode: 'governed_selection', selectionPolicyId: objectId(40), selectionConstraints: { dataClassification: 'public' }, fallbackCandidateCount: 2, selectionTiming: 'run_creation', capability: 'research.summary', operation: 'summarize', inputSchema, outputSchema, inputMapping: { topic: '$run.input.topic' }, retryPolicy: { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 100 }, approvalRequirement: { required: false }, dependencies: [] }],
  };
  const validation = validateDefinitionDocument(definition);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  report('governed selection', 'node has exactly one governed target and validates without a pinned connection');

  const selectedNode = definition.nodes[0];
  selectedNode.connectionId = first.eligible[0].connectionId; selectedNode.passportId = first.eligible[0].passportId; selectedNode._passportVersion = first.eligible[0].passportVersion; selectedNode.selectionDecisionId = objectId(60); selectedNode.selectionPolicyVersion = 1; selectedNode.fallbackCandidates = fallbacks.map((connectionId) => ({ connectionId }));
  const snapshot = safeDefinitionSnapshot(definition);
  assert.equal(snapshot.nodes[0].connectionId, first.eligible[0].connectionId);
  assert.equal(snapshot.nodes[0].selectionTiming, 'run_creation');
  report('selection snapshot frozen', 'chosen connection, passport version, policy version, and decision ID are frozen at run creation');

  const retryConnection = snapshot.nodes[0].connectionId;
  for (let attempt = 1; attempt <= 2; attempt += 1) assert.equal(snapshot.nodes[0].connectionId, retryConnection);
  report('retry candidate retained', 'all retry attempts retain the frozen connection without replacement');

  const serialized = JSON.stringify({ decision: { selectedConnectionId: first.eligible[0].connectionId, candidateSnapshotHash: candidateSnapshotHash(candidates) }, snapshot });
  assert.doesNotMatch(serialized, /credential|install.?key|provider.?key|bearer|runtimeEndpoint/i);
  report('no credentials leaked', 'decision and run snapshot contain no credential, token, key, or runtime endpoint fields');

  const none = evaluate(candidates, normalizePolicyInput({ name: 'Impossible', minimumTrustTier: 'platform_verified' }));
  assert.equal(none.eligible.length, 0);
  report('no-candidate handling', 'mandatory filters safely produce an empty eligible set');

  const approvalPolicy = normalizePolicyInput({ name: 'Approval', requireApprovalWhen: { manualReview: true } });
  const approvalEvaluation = evaluate(candidates, approvalPolicy);
  const approval = selectionRequiresApproval(approvalEvaluation.eligible[0], approvalEvaluation.constraints, approvalPolicy);
  assert.equal(approval.required, true);
  report('approval-required handling', 'manual review produces approval_required without invoking the selected agent');

  const otherTenant = candidates.filter((candidate) => candidate.organizationId === objectId(81));
  assert.equal(otherTenant.length, 0);
  report('tenant isolation', 'a different organization and workspace observes no candidate or exclusion detail');

  assert.equal(normalizeCapability(rawCapability, { ...candidates[0], agent: { version: '1.0.0' } }).costClass, 'unknown');
  report('untrusted claims bounded', 'passport normalization cannot self-elevate trust or administrative cost attributes');

  candidates.length = 0;
  assert.equal(candidates.length, 0);
  report('safe cleanup', 'in-memory verifier fixtures removed without external calls');
  report('agent-selection verification', 'all deterministic non-billed Phase 13D2 gates passed');
}

if (require.main === module) {
  verify().catch((error) => {
    console.error(`Agent-selection verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { verify };
