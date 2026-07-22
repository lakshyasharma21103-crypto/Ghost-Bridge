const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const InterAgentDataContract = require('../models/InterAgentDataContract');
const InterAgentDelegationGrant = require('../models/InterAgentDelegationGrant');
const InterAgentDelegationInvocation = require('../models/InterAgentDelegationInvocation');
const InterAgentDelegationReference = require('../models/InterAgentDelegationReference');
const OrchestrationDefinition = require('../models/OrchestrationDefinition');
const OrchestrationNodeRun = require('../models/OrchestrationNodeRun');
const Invocation = require('../models/Invocation');
const { getPermissionRegistry } = require('../constants/permissionRegistry');
const {
  assertDelegationInvocationTransition,
  assertGrantTransition,
} = require('../constants/interAgentDelegation');
const {
  normalizeContractInput,
  normalizeMapping,
  normalizeMinimizationRules,
  normalizeRules,
  normalizeSelector,
  validateContractDocument,
} = require('../services/interAgentContractValidation.service');
const {
  applyMapping,
  applyMinimization,
  applyRedactions,
  applyTransformations,
  assertClassificationAllowed,
  assertRegionResidency,
  extractAllowedFields,
  highestClassification,
  processDelegatedInput,
  processDelegatedOutput,
  safeClone,
  schemaHash,
} = require('../services/interAgentData.service');
const {
  capabilityMatches,
  invocationReservationFilter,
  selectorMatchesCandidate,
  serializeContract,
  serializeGrant,
  serializeInvocation,
} = require('../services/interAgentDelegation.service');
const { safeDefinitionSnapshot, validateDefinitionDocument } = require('../services/orchestrationValidation.service');

const objectId = (suffix) => `64d0000000000000000000${String(suffix).padStart(2, '0')}`;
const inputSchema = { type: 'object', properties: { title: { type: 'string' }, summary: { type: 'string' }, sourceUrls: { type: 'array', items: { type: 'string' }, maxItems: 3 }, reporterEmail: { type: 'string' } }, required: ['title', 'summary'], additionalProperties: false };
const outputSchema = { type: 'object', properties: { report: { type: 'string' } }, required: ['report'], additionalProperties: false };

function contractInput(overrides = {}) {
  return {
    name: 'Research summary', sourceSelector: { passportId: objectId(1) }, targetSelector: { connectionId: objectId(12) },
    sourceCapability: 'research.collect', sourceOperation: 'collect', targetCapability: 'report.summarize', targetOperation: 'summarize',
    purpose: 'Create a bounded report.', purposeCode: 'REPORT_SUMMARY', allowedInputSchema: inputSchema, allowedOutputSchema: outputSchema,
    sourceOutputMapping: {}, targetInputMapping: {}, downstreamOutputMapping: {}, allowedInputFields: ['title', 'summary', 'sourceUrls', 'reporterEmail'],
    deniedInputFields: ['internalNotes', 'hiddenReasoning'], allowedOutputFields: ['report'], deniedOutputFields: [],
    transformationRules: [{ ruleId: 'limit_sources', operation: 'slice_array', path: 'sourceUrls', maximumItems: 3 }],
    redactionRules: [{ ruleId: 'redact_reporter', action: 'replace', path: 'reporterEmail', marker: '[REDACTED]' }], minimizationRules: [],
    allowedDataClassifications: ['public', 'internal', 'confidential'], maximumDataClassification: 'confidential', allowedRegions: ['IN'], residencyRequirements: ['IN'],
    maximumPayloadBytes: 200000, maximumArrayItems: 100, maximumStringLength: 10000, maximumObjectDepth: 10, allowAttachments: false,
    allowedAttachmentTypes: [], maximumAttachmentBytes: 0, allowFurtherDelegation: false, maximumDelegationDepth: 1, requireApproval: false,
    approvalConditions: {}, retentionPolicy: { mode: 'metadata_only', durationDays: 0 }, validFrom: '2026-07-18T00:00:00.000Z', expiresAt: '2026-07-19T00:00:00.000Z',
    ...overrides,
  };
}

function normalized(overrides = {}) {
  return normalizeContractInput(contractInput(overrides), {}, new Date('2026-07-18T00:00:00.000Z'));
}

test('contract normalization is deterministic and schema hashes are stable', () => {
  const left = normalized(); const right = normalized();
  assert.deepEqual(left.allowedInputFields, right.allowedInputFields);
  assert.equal(schemaHash(left.allowedInputSchema), schemaHash(right.allowedInputSchema));
  const result = validateContractDocument({ ...left, organizationId: objectId(90), workspaceId: 'workspace-a' }, { now: '2026-07-18T01:00:00.000Z' });
  assert.equal(result.valid, true, JSON.stringify(result.errors));
});

test('contract validation rejects unsafe versions, mappings, transforms and depth', () => {
  assert.equal(validateContractDocument({ ...normalized(), organizationId: objectId(90), workspaceId: 'workspace-a', version: 0 }).errors.some((item) => item.code === 'DATA_CONTRACT_VERSION_INVALID'), true);
  assert.throws(() => normalizeMapping({ value: '$process.env.SECRET' }), (error) => error.code === 'DATA_CONTRACT_MAPPING_INVALID');
  assert.throws(() => normalizeRules([{ ruleId: 'x', operation: 'javascript', path: 'title' }], 'TRANSFORMATION'), (error) => error.code === 'DATA_CONTRACT_TRANSFORMATION_INVALID');
  assert.throws(() => normalizeMinimizationRules([{ ruleId: 'x', operation: 'javascript' }]), (error) => error.code === 'DATA_CONTRACT_INVALID');
  assert.equal(validateContractDocument({ ...normalized({ allowFurtherDelegation: false, maximumDelegationDepth: 2 }), organizationId: objectId(90), workspaceId: 'workspace-a' }).errors.some((item) => item.code === 'DATA_CONTRACT_DELEGATION_DEPTH_INVALID'), true);
  assert.equal(validateContractDocument({ ...normalized({ allowAttachments: true, allowedAttachmentTypes: ['text/plain'], maximumAttachmentBytes: 100 }), organizationId: objectId(90), workspaceId: 'workspace-a' }).errors.some((item) => item.path === 'allowAttachments'), true);
});

test('selectors are fixed-field, deterministic and tenant candidate matching is exact', () => {
  assert.deepEqual(normalizeSelector({ passportId: objectId(1), publisher: 'Verified' }), { passportId: objectId(1), publisher: 'Verified' });
  assert.throws(() => normalizeSelector({ expression: 'candidate.score > 0' }), (error) => error.code === 'DATA_CONTRACT_SELECTOR_INVALID');
  const candidate = { passportId: objectId(1), connectionId: objectId(11), publisherName: 'Verified', trustTier: 'organization_verified', categories: ['SEARCH'], capabilities: [{ capabilityKey: 'research.collect', operationKeys: ['collect'] }] };
  assert.equal(selectorMatchesCandidate({ passportId: objectId(1), minimumTrustTier: 'registered' }, candidate), true);
  assert.equal(selectorMatchesCandidate({ passportId: objectId(2) }, candidate), false);
  assert.equal(capabilityMatches(candidate, 'research.collect', 'collect'), true);
});

test('allowlist extraction excludes undeclared fields and denylist wins', () => {
  const result = extractAllowedFields({ title: 'safe', internalNotes: 'drop', nested: { allowed: true, denied: true } }, ['title', 'internalNotes', 'nested.allowed', 'nested.denied'], ['internalNotes', 'nested.denied']);
  assert.deepEqual(result, { title: 'safe', nested: { allowed: true } });
});

test('safe nested extraction ignores inherited fields and never executes accessors', () => {
  const source = Object.create({ inherited: 'ignored' }); source.title = 'safe';
  assert.deepEqual(extractAllowedFields(source, ['title'], []), { title: 'safe' });
  let executed = false; const accessor = {};
  Object.defineProperty(accessor, 'title', { enumerable: true, get() { executed = true; return 'unsafe'; } });
  assert.throws(() => safeClone(accessor), (error) => error.code === 'INTER_AGENT_DATA_ACCESSOR_REJECTED');
  assert.equal(executed, false);
  const tagged = {};
  Object.defineProperty(tagged, Symbol.toStringTag, { get() { executed = true; return 'Object'; } });
  assert.throws(() => safeClone(tagged), (error) => error.code === 'INTER_AGENT_DATA_SYMBOL_REJECTED');
  assert.equal(executed, false);
});

test('dangerous keys, symbols, functions, circular values and unsupported objects fail closed', () => {
  assert.throws(() => safeClone(JSON.parse('{"__proto__":{"polluted":true}}')), /protected/i);
  assert.throws(() => safeClone({ safe: Symbol('x') }), /unsupported/i);
  assert.throws(() => safeClone({ safe() {} }), /unsupported/i);
  const circular = {}; circular.self = circular; assert.throws(() => safeClone(circular), /Circular/i);
  assert.throws(() => safeClone(new Map([['safe', true]])), /Unsupported object/i);
});

test('mapping, transformation, redaction and minimization order is bounded', () => {
  const mapped = applyMapping({ title: '$source.heading', kind: { literal: 'summary' } }, { source: { heading: 'Title' }, runInput: {}, metadata: {}, dependency: {} });
  const transformed = applyTransformations({ ...mapped, urls: ['1', '2', '3', '4'] }, [{ ruleId: 'rename_kind', operation: 'rename', path: 'kind', targetPath: 'type' }, { ruleId: 'slice_urls', operation: 'slice_array', path: 'urls', maximumItems: 3 }]);
  const redacted = applyRedactions({ ...transformed.payload, email: 'person@example.test' }, [{ ruleId: 'email', action: 'replace', path: 'email', marker: '[REDACTED]' }]);
  const minimized = applyMinimization({ ...redacted.payload, extra: true, empty: null }, { type: 'object', properties: { title: { type: 'string' }, type: { type: 'string' }, urls: { type: 'array', items: { type: 'string' } }, email: { type: 'string' } }, additionalProperties: false }, []);
  assert.deepEqual(minimized.payload.urls, ['1', '2', '3']); assert.equal(minimized.payload.email, '[REDACTED]'); assert.equal(minimized.payload.extra, undefined);
});

test('full delegated input removes private fields, redacts, limits and reports safe statistics', () => {
  const result = processDelegatedInput({ title: 'Title', summary: 'Summary', sourceUrls: ['1', '2', '3', '4'], reporterEmail: 'person@example.test', internalNotes: 'private', hiddenReasoning: 'private' }, normalized());
  assert.deepEqual(result.payload.sourceUrls, ['1', '2', '3']); assert.equal(result.payload.reporterEmail, '[REDACTED]');
  assert.equal(result.payload.internalNotes, undefined); assert.equal(result.payload.hiddenReasoning, undefined); assert.ok(result.statistics.removedFieldCount >= 2); assert.equal(result.statistics.redactedFieldCount, 1);
});

test('classification cannot be downgraded and region and residency are mandatory', () => {
  assert.equal(highestClassification(['public', 'confidential']), 'confidential');
  assert.equal(highestClassification(['unknown']), 'restricted');
  assert.equal(assertClassificationAllowed('confidential', normalized(), { dataClassificationsAllowed: ['confidential'] }), 'confidential');
  assert.throws(() => assertClassificationAllowed('restricted', normalized(), { dataClassificationsAllowed: ['restricted'] }), (error) => error.code === 'DATA_CONTRACT_CLASSIFICATION_DENIED');
  assert.equal(assertRegionResidency(normalized(), { supportedRegions: ['IN'], residencyRegions: ['IN'] }), true);
  assert.throws(() => assertRegionResidency(normalized(), { supportedRegions: ['US'], residencyRegions: ['US'] }), (error) => error.code === 'DATA_CONTRACT_RESIDENCY_DENIED');
});

test('payload, array, string and depth limits stop processing', () => {
  assert.throws(() => safeClone({ text: 'abcdef' }, { maximumStringLength: 3 }), /string/i);
  assert.throws(() => safeClone({ list: [1, 2] }, { maximumArrayItems: 1 }), /array/i);
  assert.throws(() => safeClone({ nested: { deeper: true } }, { maximumObjectDepth: 1 }), /depth/i);
  assert.throws(() => safeClone({ text: 'x'.repeat(100) }, { maximumPayloadBytes: 10, maximumStringLength: 1000 }), /byte limit/i);
});

test('output processing uses schema allowlists as the primary hidden-context control', () => {
  const result = processDelegatedOutput({ report: 'safe', hiddenReasoning: 'drop', extra: 'drop' }, normalized());
  assert.deepEqual(result.payload, { report: 'safe' }); assert.equal(result.statistics.delegatedFieldCount, 1);
});

test('grant and invocation state machines are terminal and non-transitive by default', () => {
  assert.doesNotThrow(() => assertGrantTransition('active', 'revoked'));
  assert.throws(() => assertGrantTransition('revoked', 'active'), /Invalid state transition/);
  assert.doesNotThrow(() => assertDelegationInvocationTransition('failed', 'invoking'));
  assert.throws(() => assertDelegationInvocationTransition('succeeded', 'invoking'), /Invalid state transition/);
});

test('atomic invocation reservation filter binds scope, validity, status, count and idempotency', () => {
  const filter = invocationReservationFilter(objectId(30), { organizationId: objectId(90), workspaceId: 'workspace-a' }, 'hmac-sha256:key', new Date('2026-07-18T00:00:00Z'));
  assert.equal(filter.status, 'active'); assert.equal(filter.organizationId, objectId(90)); assert.deepEqual(filter.$expr, { $lt: ['$invocationCount', '$invocationLimit'] }); assert.deepEqual(filter.idempotencyReservationHashes, { $ne: 'hmac-sha256:key' });
});

test('models are tenant scoped, indexed and freeze authoritative fields', () => {
  for (const Model of [InterAgentDataContract, InterAgentDelegationGrant, InterAgentDelegationInvocation, InterAgentDelegationReference]) { assert.ok(Model.schema.path('organizationId')); assert.ok(JSON.stringify(Model.schema.indexes()).includes('workspaceId') || Model === InterAgentDelegationReference); }
  for (const field of ['organizationId', 'workspaceId', 'version']) assert.equal(InterAgentDataContract.schema.path(field).options.immutable, true);
  for (const field of ['contractId', 'sourcePassportId', 'targetPassportId', 'invocationLimit']) assert.equal(InterAgentDelegationGrant.schema.path(field).options.immutable, true);
  assert.ok(JSON.stringify(InterAgentDelegationGrant.schema.indexes()).includes('invocationOrdinal') === false);
  assert.ok(JSON.stringify(InterAgentDelegationInvocation.schema.indexes()).includes('invocationOrdinal'));
  assert.ok(OrchestrationDefinition.schema.path('edges').schema.path('mappingMode')); assert.ok(OrchestrationNodeRun.schema.path('delegationGrantId')); assert.ok(Invocation.schema.path('delegationContext'));
});

test('contract orchestration edges require explicit IDs, versions and no second incoming contract', () => {
  const nodes = [{ nodeKey: 'source', displayName: 'Source', connectionId: objectId(11), passportId: objectId(1), capability: 'research.collect', operation: 'collect', inputSchema: { type: 'object' }, outputSchema: inputSchema, inputMapping: {}, timeoutMs: 5000, retryPolicy: { maxAttempts: 1 }, dependencies: [] }, { nodeKey: 'target', displayName: 'Target', connectionId: objectId(12), passportId: objectId(2), capability: 'report.summarize', operation: 'summarize', inputSchema, outputSchema, inputMapping: {}, timeoutMs: 5000, retryPolicy: { maxAttempts: 1 }, dependencies: ['source'] }];
  const base = { _id: objectId(50), name: 'Contract run', version: 1, inputSchema: { type: 'object' }, outputSchema, nodes, edges: [{ from: 'source', to: 'target', mappingMode: 'contract', dataContractId: objectId(40), dataContractVersion: 1 }], concurrencyLimit: 1, maxRunDurationMs: 60000, maxNodeExecutions: 2, defaultNodeTimeoutMs: 5000 };
  const valid = validateDefinitionDocument(base); assert.equal(valid.valid, true, JSON.stringify(valid.errors));
  const snapshot = safeDefinitionSnapshot({ ...base, edges: [{ ...base.edges[0], _inputSchemaHash: schemaHash(inputSchema), _outputSchemaHash: schemaHash(outputSchema) }] });
  assert.equal(snapshot.edges[0].mappingMode, 'contract'); assert.equal(snapshot.edges[0].dataContractVersion, 1); assert.doesNotMatch(JSON.stringify(snapshot), /sourceOutput|runtimeCredential|authorization/i);
});

test('serializers and API routes never expose internal references or raw delegated payloads', () => {
  const contract = serializeContract({ _id: objectId(40), ...normalized(), organizationId: objectId(90), workspaceId: 'workspace-a', status: 'active' });
  const grant = serializeGrant({ _id: objectId(41), organizationId: objectId(90), workspaceId: 'workspace-a', contractId: objectId(40), contractVersion: 1, sourcePassportId: objectId(1), sourceConnectionId: objectId(11), targetPassportId: objectId(2), targetConnectionId: objectId(12), status: 'active', invocationCount: 0, invocationLimit: 1, delegationDepth: 1, maximumDelegationDepth: 1, referenceHash: 'private', passportPath: ['private'] });
  const invocation = serializeInvocation({ _id: objectId(42), delegationGrantId: objectId(41), contractId: objectId(40), contractVersion: 1, sourcePassportId: objectId(1), sourceConnectionId: objectId(11), targetPassportId: objectId(2), targetConnectionId: objectId(12), status: 'prepared', delegatedPayload: { title: 'private' } });
  const serialized = JSON.stringify({ contract, grant, invocation }); assert.doesNotMatch(serialized, /referenceHash|passportPath|delegatedPayload|idempotencyKeyHash/);
  const routes = fs.readFileSync(path.join(__dirname, '../routes/interAgentDelegationRoutes.js'), 'utf8'); assert.doesNotMatch(routes, /reference|token|credential/i);
  const gateway = fs.readFileSync(path.join(__dirname, '../services/runtimeGateway.service.js'), 'utf8');
  assert.match(gateway, /transformValidatedOutput/); assert.ok(gateway.indexOf('transformValidatedOutput(result.output)') < gateway.lastIndexOf('output: result.output'));
});

test('permission registry v10 separates activation, preview, revocation and invocation detail', () => {
  const registry = getPermissionRegistry(); assert.equal(registry.version, 10);
  for (const id of ['interAgentContract.activate', 'interAgentDelegation.preview', 'interAgentDelegation.revoke', 'interAgentDelegationInvocation.readDetails']) assert.ok(registry.permissions.some((permission) => permission.id === id));
  assert.equal(registry.permissions.find((item) => item.id === 'interAgentContract.activate').defaultRoles.includes('operator'), false);
  assert.equal(registry.permissions.find((item) => item.id === 'interAgentDelegation.revoke').defaultRoles.includes('operator'), false);
});

test('migration, frontend and dedicated verifier are wired without billed-provider commands', () => {
  const migration = fs.readFileSync(path.join(__dirname, '../../scripts/migrateInterAgentDelegation.js'), 'utf8'); const rootPackage = fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf8'); const verifier = fs.readFileSync(path.join(__dirname, '../../scripts/verifyInterAgentDelegation.js'), 'utf8');
  assert.match(migration, /restartSafe/); assert.match(rootPackage, /verify:inter-agent-delegation/); assert.doesNotMatch(verifier, /Gemini|verify:external-flow|https?:\/\//i);
});
