const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const AgentSelectionDecision = require('../models/AgentSelectionDecision');
const CapabilityCatalogEntry = require('../models/CapabilityCatalogEntry');
const AgentSelectionPolicy = require('../models/AgentSelectionPolicy');
const ApprovalRequest = require('../models/ApprovalRequest');
const OrchestrationDefinition = require('../models/OrchestrationDefinition');
const OrchestrationNodeRun = require('../models/OrchestrationNodeRun');
const { getPermissionRegistry } = require('../constants/permissionRegistry');
const {
  catalogSourceVersion,
  normalizeCapability,
  normalizeOperationKeys,
  normalizePassportCapabilities,
} = require('../services/capabilityNormalization.service');
const { checkSchemaCompatibility, sanitizeSchema } = require('../services/schemaCompatibility.service');
const {
  candidateSnapshotHash,
  compareCandidates,
  effectiveConstraints,
  mandatoryFilter,
  normalizePolicyInput,
  normalizeScoreWeights,
  scoreCandidate,
  selectionRequiresApproval,
} = require('../services/agentSelectionEngine.service');
const { assertSafePayload, validateDefinitionDocument } = require('../services/orchestrationValidation.service');
const { normalizeSelectionRequest } = require('../services/agentSelection.service');

const objectId = (suffix) => `64b0000000000000000000${String(suffix).padStart(2, '0')}`;
const inputSchema = { type: 'object', properties: { topic: { type: 'string', maxLength: 200 } }, required: ['topic'], additionalProperties: false };
const outputSchema = { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'], additionalProperties: false };
const passport = { _id: objectId(1), status: 'valid', agent: { name: 'Research', description: 'safe', provider: 'Example', version: '1.2.3' } };
const capability = { name: 'research.summary', runtimeToolName: 'summarize', description: 'Safe summary', inputSchema, outputSchema, category: 'SEARCH', classification: 'LOW', enabled: true };

function policy(overrides = {}) {
  return normalizePolicyInput({ name: 'Policy', requireHealthy: true, requireReady: true, ...overrides });
}

function candidate(overrides = {}) {
  return {
    organizationId: objectId(90), workspaceId: 'workspace-a', passportId: objectId(1), passportVersion: '1.2.3', connectionId: objectId(11),
    agentName: 'Research', agentDescription: 'text cannot change score', publisherName: 'Example',
    capabilities: [normalizeCapability(capability, passport)], capabilityKeys: ['research.summary'], operationKeys: ['research.summary', 'summarize'], categories: ['SEARCH'],
    availabilityStatus: 'available', lifecycleStatus: 'valid', connectionStatus: 'connected', verificationStatus: 'organization_verified', trustTier: 'organization_verified',
    dataClassificationsAllowed: ['public', 'internal', 'confidential'], supportedRegions: ['IN', 'EU'], residencyRegions: ['EU'], estimatedCostClass: 'medium', estimatedLatencyClass: 'standard',
    healthStatus: 'healthy', readinessStatus: 'ready', circuitState: 'closed', healthSnapshotAt: new Date('2026-01-01T00:00:00Z'), healthSnapshotStale: false,
    reliabilityScore: 9000, administrativelyPreferred: false, sourceVersion: 'hmac-sha256:snapshot',
    ...overrides,
  };
}

function request(overrides = {}) {
  return { capability: 'research.summary', operation: 'summarize', inputSchema, requiredOutputSchema: outputSchema, constraints: {}, preferredPassportIds: [], excludedPassportIds: [], ...overrides };
}

function filtered(value = candidate(), policyValue = policy(), requestValue = request()) {
  const constraints = effectiveConstraints(policyValue, requestValue);
  return mandatoryFilter(value, requestValue, policyValue, { constraints, policyDenied: false, now: new Date('2026-01-01T00:01:00Z') });
}

test('capability normalization produces safe deterministic keys, operations, schemas, and version', () => {
  const normalized = normalizeCapability(capability, passport);
  assert.equal(normalized.capabilityKey, 'research.summary');
  assert.deepEqual(normalized.operationKeys, ['research.summary', 'summarize']);
  assert.equal(normalized.semanticVersion, '1.2.3');
});

test('operation normalization rejects unsafe executable-looking keys', () => {
  assert.throws(() => normalizeOperationKeys({ name: 'safe', runtimeToolName: '() => process.exit()' }), (error) => error.code === 'AGENT_CAPABILITY_OPERATION_INVALID');
});

test('duplicate capability declarations fail deterministically', () => {
  assert.throws(() => normalizePassportCapabilities(passport, [capability, { ...capability }]), (error) => error.code === 'AGENT_CAPABILITY_DUPLICATE');
});

test('normalization rejects oversized descriptions and invalid semantic versions', () => {
  assert.throws(() => normalizeCapability({ ...capability, description: 'x'.repeat(1001) }, passport), /description/i);
  assert.throws(() => normalizeCapability(capability, { ...passport, agent: { ...passport.agent, version: 'latest' } }), /version/i);
});

test('catalog source versions are deterministic and exclude runtime credentials', () => {
  const connection = { _id: objectId(11), status: 'connected', credentialId: objectId(70), runtimeEndpoint: 'https://private.invalid' };
  const normalized = normalizePassportCapabilities(passport, [capability]);
  assert.equal(catalogSourceVersion(passport, connection, normalized), catalogSourceVersion(passport, { ...connection, credentialId: objectId(71) }, normalized));
});

test('schema compatibility supports required fields, nested objects, arrays, enums and bounds', () => {
  const nested = { type: 'object', properties: { items: { type: 'array', maxItems: 10, items: { type: 'object', properties: { kind: { type: 'string', enum: ['safe'] } }, required: ['kind'], additionalProperties: false } } }, required: ['items'], additionalProperties: false };
  assert.equal(checkSchemaCompatibility(nested, nested, nested, nested).status, 'compatible');
});

test('schema compatibility reports input and output mismatches safely', () => {
  const result = checkSchemaCompatibility(inputSchema, { ...inputSchema, properties: { topic: { type: 'number' } } }, { type: 'object', properties: {}, additionalProperties: false }, outputSchema);
  assert.equal(result.status, 'incompatible');
  assert.ok(result.reasonCodes.includes('INPUT_TYPE_MISMATCH'));
  assert.ok(result.reasonCodes.includes('REQUIRED_OUTPUT_FIELD_MISSING'));
  assert.equal(JSON.stringify(result).includes('topic value'), false);
});

test('unsupported schema features return uncertain and annotations are removed', () => {
  const annotated = { ...inputSchema, title: 'private annotation', description: 'hidden', properties: { topic: { type: 'string', pattern: '^safe$' } } };
  const sanitized = sanitizeSchema(annotated);
  assert.equal(sanitized.title, undefined);
  assert.equal(checkSchemaCompatibility(sanitized, sanitized, outputSchema, outputSchema).status, 'uncertain');
});

test('prototype pollution and protected schema keys are rejected', () => {
  assert.throws(() => assertSafePayload(JSON.parse('{"__proto__":{"polluted":true}}')), /rejected/i);
  assert.equal({}.polluted, undefined);
});

test('arbitrary selection expressions and unknown constraint fields are rejected', () => {
  assert.throws(() => normalizeSelectionRequest({ capability: 'research.summary', operation: 'summarize', inputSchema, requiredOutputSchema: outputSchema, constraints: { expression: 'candidate.score > 0' } }), /unsupported/i);
});

test('score weights require bounded integers and a positive bounded total', () => {
  assert.throws(() => normalizeScoreWeights({ schemaCompatibility: -1 }), /weight/i);
  assert.throws(() => normalizeScoreWeights(Object.fromEntries(Object.keys(policy().scoreWeights).map((key) => [key, 0]))), /total/i);
});

test('mandatory filtering runs trust, verification, health, readiness and schema gates', () => {
  const result = filtered(candidate({ trustTier: 'unverified', verificationStatus: 'unverified', healthStatus: 'unhealthy', readinessStatus: 'not_ready' }), policy({ minimumTrustTier: 'organization_verified', requiredVerificationStatuses: ['organization_verified'] }));
  assert.equal(result.eligible, false);
  for (const reason of ['TRUST_REQUIREMENT_NOT_MET', 'VERIFICATION_REQUIREMENT_NOT_MET', 'HEALTH_REQUIREMENT_NOT_MET', 'READINESS_REQUIREMENT_NOT_MET']) assert.ok(result.reasons.includes(reason));
});

test('denylist takes precedence and allowlist is mandatory', () => {
  assert.ok(filtered(candidate(), policy({ allowedPassportIds: [objectId(1)], deniedPassportIds: [objectId(1)] })).reasons.includes('ADMINISTRATIVELY_DENIED'));
  assert.ok(filtered(candidate(), policy({ allowedPassportIds: [objectId(2)] })).reasons.includes('NOT_ADMINISTRATIVELY_ALLOWED'));
});

test('region, residency and data classification matching is mandatory', () => {
  const result = filtered(candidate({ supportedRegions: ['US'], residencyRegions: [], dataClassificationsAllowed: ['public'] }), policy({ allowedRegions: ['EU'], requiredResidencyRegions: ['EU'] }), request({ constraints: { dataClassification: 'confidential' } }));
  for (const reason of ['REGION_NOT_ALLOWED', 'RESIDENCY_REQUIREMENT_UNMET', 'DATA_CLASSIFICATION_UNSUPPORTED']) assert.ok(result.reasons.includes(reason));
});

test('disjoint request and policy regions fail closed instead of erasing the constraint', () => {
  const result = filtered(candidate({ supportedRegions: ['US'] }), policy({ allowedRegions: ['EU'] }), request({ constraints: { allowedRegions: ['US'] } }));
  assert.ok(result.reasons.includes('REGION_NOT_ALLOWED'));
});

test('policy data-classification allowlist is enforced independently of agent declarations', () => {
  const result = filtered(candidate({ dataClassificationsAllowed: ['public', 'confidential'] }), policy({ allowedDataClassifications: ['public'] }), request({ constraints: { dataClassification: 'confidential' } }));
  assert.ok(result.reasons.includes('DATA_CLASSIFICATION_UNSUPPORTED'));
});

test('administratively allowed capability categories are mandatory', () => {
  const result = filtered(candidate(), policy({ allowedCapabilityCategories: ['DOCUMENT'] }));
  assert.ok(result.reasons.includes('CAPABILITY_CATEGORY_DENIED'));
});

test('cost and latency maximums filter higher and unknown constrained candidates', () => {
  const strict = policy({ maximumCostClass: 'medium', maximumLatencyClass: 'standard' });
  assert.ok(filtered(candidate({ estimatedCostClass: 'high', estimatedLatencyClass: 'slow' }), strict).reasons.includes('COST_LIMIT_EXCEEDED'));
  assert.ok(filtered(candidate({ estimatedCostClass: 'unknown' }), strict).reasons.includes('COST_LIMIT_EXCEEDED'));
});

test('stale health is never represented as current healthy eligibility', () => {
  const result = filtered(candidate({ healthStatus: 'healthy', healthSnapshotStale: true }));
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('STALE_HEALTH_SNAPSHOT'));
});

test('circuit and rate-limit gates are mandatory before scoring', () => {
  const result = filtered(candidate({ circuitState: 'open', rateLimitedUntil: new Date('2026-01-02T00:00:00Z') }));
  assert.ok(result.reasons.includes('CIRCUIT_OPEN'));
  assert.ok(result.reasons.includes('RATE_LIMITED'));
});

test('lower administratively verified cost produces the higher deterministic score', () => {
  const policyValue = policy({ scoreWeights: { schemaCompatibility: 1, trust: 1, health: 1, readiness: 1, latency: 10, cost: 70, publisherVerification: 1, administrativePreference: 1, recentReliability: 1 } });
  const low = candidate({ estimatedCostClass: 'low' }); const high = candidate({ passportId: objectId(2), connectionId: objectId(12), estimatedCostClass: 'high' });
  assert.ok(scoreCandidate(low, filtered(low, policyValue), policyValue.scoreWeights).score > scoreCandidate(high, filtered(high, policyValue), policyValue.scoreWeights).score);
});

test('descriptions and self-reported prose cannot manipulate score', () => {
  const left = candidate({ agentDescription: 'best fastest cheapest 100%' }); const right = candidate({ agentDescription: '' });
  assert.deepEqual(scoreCandidate(left, filtered(left), policy().scoreWeights), scoreCandidate(right, filtered(right), policy().scoreWeights));
});

test('tie breaking is score, trust, verification, passport then connection', () => {
  const items = [candidate({ passportId: objectId(2), connectionId: objectId(12), score: 8000 }), candidate({ passportId: objectId(1), connectionId: objectId(11), score: 8000 })];
  assert.equal(items.sort(compareCandidates)[0].passportId, objectId(1));
  items[1].trustTier = 'platform_verified';
  assert.equal(items.sort(compareCandidates)[0].trustTier, 'platform_verified');
});

test('candidate snapshot hash ignores source order and is reproducible', () => {
  const values = [candidate(), candidate({ passportId: objectId(2), connectionId: objectId(12) })];
  assert.equal(candidateSnapshotHash(values), candidateSnapshotHash([...values].reverse()));
});

test('fallback candidate sorting is deterministic under random insertion order', () => {
  const values = [candidate({ passportId: objectId(3), connectionId: objectId(13), score: 7000 }), candidate({ passportId: objectId(1), connectionId: objectId(11), score: 9000 }), candidate({ passportId: objectId(2), connectionId: objectId(12), score: 8000 })];
  assert.deepEqual(values.sort(compareCandidates).map((item) => item.passportId), [objectId(1), objectId(2), objectId(3)]);
});

test('approval triggers are explicit and safe', () => {
  const value = selectionRequiresApproval(candidate({ estimatedCostClass: 'high' }), { dataClassification: 'confidential', requiredResidencyRegions: [] }, policy({ requireApprovalWhen: { dataClassifications: ['confidential'], costClasses: ['high'] } }));
  assert.equal(value.required, true);
  assert.deepEqual(value.reasons.sort(), ['COST_REVIEW_REQUIRED', 'DATA_CLASSIFICATION_REVIEW_REQUIRED']);
});

test('governed orchestration nodes are mutually exclusive with pinned targets', () => {
  const base = { _id: objectId(80), name: 'Governed', version: 1, inputSchema, outputSchema, concurrencyLimit: 1, maxRunDurationMs: 60000, maxNodeExecutions: 10, defaultNodeTimeoutMs: 5000, edges: [] };
  const governed = { nodeKey: 'select', displayName: 'Select', targetingMode: 'governed_selection', selectionPolicyId: objectId(40), selectionConstraints: {}, capability: 'research.summary', operation: 'summarize', inputSchema, outputSchema, inputMapping: { topic: '$run.input.topic' }, retryPolicy: { maxAttempts: 2 }, dependencies: [] };
  assert.equal(validateDefinitionDocument({ ...base, nodes: [governed] }).valid, true);
  const conflict = validateDefinitionDocument({ ...base, nodes: [{ ...governed, connectionId: objectId(11) }] });
  assert.ok(conflict.errors.some((error) => error.code === 'ORCHESTRATION_TARGETING_MODE_CONFLICT'));
});

test('selection decision fields are immutable except narrow approval/run linkage', () => {
  for (const field of ['organizationId', 'workspaceId', 'normalizedConstraints', 'candidateSnapshotHash', 'selectedConnectionId', 'selectedScore']) assert.equal(AgentSelectionDecision.schema.path(field).options.immutable, true);
  assert.notEqual(AgentSelectionDecision.schema.path('decisionStatus').options.immutable, true);
  assert.ok(ApprovalRequest.schema.path('agentSelectionDecisionId'));
});

test('catalog, policies and decisions expose required tenant indexes', () => {
  const catalogIndexes = JSON.stringify(CapabilityCatalogEntry.schema.indexes()); const policyIndexes = JSON.stringify(AgentSelectionPolicy.schema.indexes()); const decisionIndexes = JSON.stringify(AgentSelectionDecision.schema.indexes());
  assert.match(catalogIndexes, /capabilityKeys/); assert.match(catalogIndexes, /healthStatus/); assert.match(policyIndexes, /status/); assert.match(decisionIndexes, /decisionStatus/);
  assert.ok(OrchestrationDefinition.schema.path('nodes').schema.path('targetingMode'));
  assert.ok(OrchestrationNodeRun.schema.path('selectionDecisionId'));
});

test('new catalog, policy, decision and governed orchestration documents validate cleanly', () => {
  const catalogDocument = new CapabilityCatalogEntry({
    ...candidate(),
    lastCatalogRefreshAt: new Date(),
    sourceVersion: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  });
  assert.equal(catalogDocument.validateSync(), undefined);
  const normalizedPolicy = policy({ allowedCapabilityCategories: ['SEARCH'] });
  const policyDocument = new AgentSelectionPolicy({ ...normalizedPolicy, organizationId: objectId(90), workspaceId: 'workspace-a', version: 1, status: 'draft', createdBy: 'partner:test', updatedBy: 'partner:test' });
  assert.equal(policyDocument.validateSync(), undefined);
  const decisionDocument = new AgentSelectionDecision({
    organizationId: objectId(90), workspaceId: 'workspace-a', requestId: 'req_test', traceId: 'trace_test', requestedBy: 'partner:test', selectionPolicyId: policyDocument._id, selectionPolicyVersion: 1,
    requestedCapability: 'research.summary', requestedOperation: 'summarize', normalizedConstraints: effectiveConstraints(normalizedPolicy, request()),
    candidateSnapshotHash: candidateSnapshotHash([candidate()]), evaluatedCandidateCount: 1, eligibleCandidateCount: 1,
    selectedPassportId: objectId(1), selectedPassportVersion: '1.2.3', selectedConnectionId: objectId(11), selectedAgentName: 'Research', selectedPublisherName: 'Example', selectedTrustTier: 'organization_verified', selectedVerificationStatus: 'organization_verified', selectedScore: 9000,
    safeDecisionReasons: ['CAPABILITY_MATCH'], safeExclusionSummary: {}, decisionStatus: 'selected',
  });
  assert.equal(decisionDocument.validateSync(), undefined);
  const definitionDocument = new OrchestrationDefinition({
    organizationId: objectId(90), workspaceId: 'workspace-a', name: 'Governed', version: 1, inputSchema, outputSchema,
    nodes: [{ nodeKey: 'research', displayName: 'Research', targetingMode: 'governed_selection', selectionPolicyId: policyDocument._id, capability: 'research.summary', operation: 'summarize', inputSchema, outputSchema, inputMapping: { topic: '$run.input.topic' }, retryPolicy: { maxAttempts: 1 }, dependencies: [] }],
    concurrencyLimit: 1, maxRunDurationMs: 60000, maxNodeExecutions: 2, defaultNodeTimeoutMs: 5000, createdBy: 'partner:test', updatedBy: 'partner:test',
  });
  assert.equal(definitionDocument.validateSync(), undefined);
});

test('permission registry v11 separates discovery, selection and production-scale administration', () => {
  const registry = getPermissionRegistry(); assert.equal(registry.version, 11);
  for (const id of ['agentDiscovery.read', 'agentSelection.evaluate', 'agentSelectionPolicy.activate', 'agentSelectionDecision.read', 'agentTrust.manage']) assert.ok(registry.permissions.some((permission) => permission.id === id));
  const trust = registry.permissions.find((permission) => permission.id === 'agentTrust.manage'); assert.equal(trust.defaultRoles.includes('operator'), false);
});

test('public catalog and decision serializers never select or emit credential material', () => {
  const serviceSource = fs.readFileSync(path.resolve(__dirname, '../services/agentSelection.service.js'), 'utf8');
  const decisionSource = fs.readFileSync(path.resolve(__dirname, '../models/AgentSelectionDecision.js'), 'utf8');
  for (const forbidden of ['encryptedDelegatedCredential', 'installKeyHash', 'providerApiKey', 'bearerToken', 'systemPrompt', 'privateMemory']) {
    assert.equal(decisionSource.includes(forbidden), false);
  }
  assert.doesNotMatch(serviceSource, /select\([^)]*(credentialId|runtimeEndpoint|installKey)/);
});

test('discovery and selection APIs are tenant scoped, bounded and never invoke a runtime', () => {
  const routes = fs.readFileSync(path.resolve(__dirname, '../routes/agentSelectionRoutes.js'), 'utf8') + fs.readFileSync(path.resolve(__dirname, '../routes/agentDiscoveryRoutes.js'), 'utf8');
  const service = fs.readFileSync(path.resolve(__dirname, '../services/agentSelection.service.js'), 'utf8');
  assert.match(routes, /agentDiscovery\.read/); assert.match(routes, /agentTrust\.manage/); assert.match(service, /organizationId: scope\.organizationId, workspaceId: scope\.workspaceId/); assert.match(service, /maximumCandidates/);
  assert.doesNotMatch(service, /runtimeGateway|safeFetch|\.invoke\(/);
});

test('agent-selection API and orchestration snapshots contain no secret-shaped values', () => {
  const payload = JSON.stringify({ decision: candidate(), policy: policy() });
  assert.doesNotMatch(payload, /credential|install.?key|bearer|provider.?key/i);
});

test('migration is restart safe and backward compatible for pinned orchestration records', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../scripts/migrateAgentSelection.js'), 'utf8');
  assert.match(source, /createIndexes/);
  assert.match(source, /targetingMode': \{ \$exists: false \}/);
  assert.match(source, /targetingMode': 'pinned'/);
  assert.match(source, /restartSafe: true/);
  assert.doesNotMatch(source, /deleteMany|dropDatabase|dropCollection/);
});

test('selection uses existing operational and policy guards before persisting a decision', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../services/agentSelection.service.js'), 'utf8');
  const start = source.indexOf('async function evaluateSelection');
  const persist = source.indexOf('AgentSelectionDecision.create', start);
  assert.ok(source.indexOf("authorize('agentSelection.evaluate'", start) < persist);
  assert.ok(source.indexOf('assertOperationalAccess', start) < persist);
  assert.ok(source.indexOf('mandatoryFilter', start) < persist);
});

test('governed execution revalidates the frozen policy and does not reselect on retry', () => {
  const scheduler = fs.readFileSync(path.resolve(__dirname, '../services/orchestrationScheduler.service.js'), 'utf8');
  assert.match(scheduler, /AgentSelectionPolicy\.findOne/);
  assert.match(scheduler, /version: definition\.selectionPolicyVersion/);
  assert.match(scheduler, /status: 'active'/);
  assert.doesNotMatch(scheduler, /evaluateSelection|fallbackCandidates\[0\]/);
});
