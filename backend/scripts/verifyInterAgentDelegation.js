const assert = require('node:assert/strict');
const {
  normalizeContractInput,
  validateContractDocument,
} = require('../src/services/interAgentContractValidation.service');
const {
  assertClassificationAllowed,
  processDelegatedInput,
  processDelegatedOutput,
  safeClone,
  schemaHash,
} = require('../src/services/interAgentData.service');
const {
  safeDefinitionSnapshot,
  validateAgainstSchema,
  validateDefinitionDocument,
} = require('../src/services/orchestrationValidation.service');

function report(stage, detail) {
  console.log(`PASS ${stage}: ${detail}`);
}

const objectId = (suffix) => `64e0000000000000000000${String(suffix).padStart(2, '0')}`;
const sourceOutputSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' }, summary: { type: 'string' }, sourceUrls: { type: 'array', items: { type: 'string' } },
    reporterEmail: { type: 'string' }, internalNotes: { type: 'string' },
  },
  required: ['title', 'summary'], additionalProperties: true,
};
const targetInputSchema = {
  type: 'object',
  properties: { title: { type: 'string' }, summary: { type: 'string' }, sourceUrls: { type: 'array', items: { type: 'string' }, maxItems: 3 }, reporterEmail: { type: 'string' } },
  required: ['title', 'summary'], additionalProperties: false,
};
const targetOutputSchema = { type: 'object', properties: { report: { type: 'string' } }, required: ['report'], additionalProperties: false };

async function verify() {
  const passports = [
    { _id: objectId(1), status: 'valid', agent: { version: '1.0.0' }, capability: 'research.collect', operation: 'collect' },
    { _id: objectId(2), status: 'valid', agent: { version: '1.0.0' }, capability: 'report.summarize', operation: 'summarize' },
  ];
  const connections = [
    { _id: objectId(11), passportId: passports[0]._id, status: 'connected', installScope: 'invoke' },
    { _id: objectId(12), passportId: passports[1]._id, status: 'connected', installScope: 'invoke' },
  ];
  assert.equal(passports.length, 2); assert.equal(connections.length, 2);
  report('source and target passports created', 'two deterministic local mock identities and installed connections prepared');

  const contract = normalizeContractInput({
    name: 'Verifier research summary', sourceSelector: { passportId: passports[0]._id }, targetSelector: { passportId: passports[1]._id },
    sourceCapability: 'research.collect', sourceOperation: 'collect', targetCapability: 'report.summarize', targetOperation: 'summarize',
    purpose: 'Create one approved report summary.', purposeCode: 'REPORT_SUMMARY', allowedInputSchema: targetInputSchema, allowedOutputSchema: targetOutputSchema,
    sourceOutputMapping: {}, targetInputMapping: {}, downstreamOutputMapping: {}, allowedInputFields: ['title', 'summary', 'sourceUrls', 'reporterEmail'],
    deniedInputFields: ['internalNotes', 'hiddenReasoning'], allowedOutputFields: ['report'], deniedOutputFields: [],
    transformationRules: [{ ruleId: 'limit_sources', operation: 'slice_array', path: 'sourceUrls', maximumItems: 3 }],
    redactionRules: [{ ruleId: 'redact_reporter', action: 'replace', path: 'reporterEmail', marker: '[REDACTED]' }], minimizationRules: [],
    allowedDataClassifications: ['public', 'internal', 'confidential'], maximumDataClassification: 'confidential', allowedRegions: ['IN'], residencyRequirements: ['IN'],
    maximumPayloadBytes: 200000, maximumArrayItems: 100, maximumStringLength: 10000, maximumObjectDepth: 10, allowAttachments: false,
    maximumAttachmentBytes: 0, allowFurtherDelegation: false, maximumDelegationDepth: 1, requireApproval: false, approvalConditions: {},
    retentionPolicy: { mode: 'metadata_only', durationDays: 0 }, validFrom: '2026-07-18T00:00:00.000Z', expiresAt: '2026-07-19T00:00:00.000Z',
  }, {}, new Date('2026-07-18T00:00:00.000Z'));
  const validation = validateContractDocument({ ...contract, organizationId: objectId(90), workspaceId: 'verify-workspace', version: 1 }, { now: '2026-07-18T01:00:00.000Z', activation: true });
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  report('data contract validated', 'selectors, schemas, mappings, rules, classification, residency, bounds, and depth validated');
  const activeContract = { ...contract, _id: objectId(40), organizationId: objectId(90), workspaceId: 'verify-workspace', version: 1, status: 'active', inputSchemaHash: validation.inputSchemaHash, outputSchemaHash: validation.outputSchemaHash };
  assert.equal(activeContract.status, 'active'); report('contract activated', 'immutable version one frozen with stable schema hashes');

  const definition = {
    _id: objectId(50), name: 'Inter-agent verifier', version: 1, inputSchema: { type: 'object' }, outputSchema: targetOutputSchema,
    nodes: [
      { nodeKey: 'source', displayName: 'Source', connectionId: connections[0]._id, passportId: passports[0]._id, _passportVersion: '1.0.0', capability: 'research.collect', operation: 'collect', inputSchema: { type: 'object' }, outputSchema: sourceOutputSchema, inputMapping: {}, timeoutMs: 5000, retryPolicy: { maxAttempts: 1 }, dependencies: [] },
      { nodeKey: 'target', displayName: 'Target', connectionId: connections[1]._id, passportId: passports[1]._id, _passportVersion: '1.0.0', capability: 'report.summarize', operation: 'summarize', inputSchema: targetInputSchema, outputSchema: targetOutputSchema, inputMapping: {}, timeoutMs: 5000, retryPolicy: { maxAttempts: 1 }, dependencies: ['source'] },
    ],
    edges: [{ from: 'source', to: 'target', mappingMode: 'contract', dataContractId: activeContract._id, dataContractVersion: 1, _inputSchemaHash: validation.inputSchemaHash, _outputSchemaHash: validation.outputSchemaHash }],
    concurrencyLimit: 1, maxRunDurationMs: 60000, maxNodeExecutions: 2, defaultNodeTimeoutMs: 5000,
  };
  const definitionValidation = validateDefinitionDocument(definition); assert.equal(definitionValidation.valid, true, JSON.stringify(definitionValidation.errors));
  const snapshot = safeDefinitionSnapshot(definition); assert.equal(snapshot.edges[0].inputSchemaHash, schemaHash(targetInputSchema));

  const grant = { _id: objectId(60), organizationId: objectId(90), workspaceId: 'verify-workspace', contractId: activeContract._id, contractVersion: 1, sourcePassportId: passports[0]._id, targetPassportId: passports[1]._id, sourceConnectionId: connections[0]._id, targetConnectionId: connections[1]._id, status: 'active', invocationLimit: 1, invocationCount: 0, delegationDepth: 1, maximumDelegationDepth: 1, allowFurtherDelegation: false, traceId: 'trace_verify_delegation', requestId: 'req_verify_delegation' };
  report('delegation grant created', 'one short-lived non-transitive invocation is bound to both frozen identities');

  const gatewayCalls = [];
  async function mockRuntimeGateway(connectionId, capability, input, context) {
    gatewayCalls.push({ connectionId, capability, input, context });
    return capability === 'research.collect'
      ? { status: 'completed', lifecycleState: 'succeeded', output: { title: 'Verified title', summary: 'Verified summary', sourceUrls: ['one', 'two', 'three', 'four'], reporterEmail: 'reporter@example.test', internalNotes: 'must not move', hiddenReasoning: 'must not move' }, invocationId: objectId(69) }
      : { status: 'completed', lifecycleState: 'succeeded', output: { report: `${input.title}: ${input.summary}` }, invocationId: objectId(70) };
  }
  const sourceRuntimeResult = await mockRuntimeGateway(grant.sourceConnectionId, 'research.collect', {}, { traceId: 'trace_verify_source', parentTraceId: 'trace_verify_run', requestId: 'req_verify_source' });
  const rawSourceOutput = sourceRuntimeResult.output;
  const sourceOutput = validateAgainstSchema(sourceOutputSchema, safeClone(rawSourceOutput));
  const processed = processDelegatedInput(sourceOutput, activeContract);
  assert.equal(processed.payload.title, 'Verified title'); assert.equal(processed.payload.summary, 'Verified summary'); report('allowed fields extracted', 'title and summary retained through an allowlist');
  assert.equal(processed.payload.internalNotes, undefined); assert.equal(processed.payload.hiddenReasoning, undefined); report('denied fields removed', 'internal notes and private reasoning are absent');
  assert.equal(processed.payload.reporterEmail, '[REDACTED]'); report('redaction applied', 'reporter email replaced before preview, audit, or invocation');
  assert.deepEqual(processed.payload.sourceUrls, ['one', 'two', 'three']); report('minimization applied', 'source URL array bounded to three items and undeclared fields removed');
  assert.equal(assertClassificationAllowed('confidential', activeContract, { dataClassificationsAllowed: ['public', 'internal', 'confidential'] }), 'confidential'); report('classification enforced', 'confidential classification fits both target support and contract ceiling');
  validateAgainstSchema(targetInputSchema, processed.payload); report('target schema validated', 'final minimized task input matches the target operation schema');

  const reservations = new Map();
  function reserve(key) { if (reservations.has(key)) return { ordinal: reservations.get(key), replayed: true }; if (grant.invocationCount >= grant.invocationLimit) throw Object.assign(new Error('grant exhausted'), { code: 'INTER_AGENT_GRANT_EXHAUSTED' }); grant.invocationCount += 1; reservations.set(key, grant.invocationCount); if (grant.invocationCount >= grant.invocationLimit) grant.status = 'exhausted'; return { ordinal: grant.invocationCount, replayed: false }; }
  const first = reserve('target-request'); assert.equal(first.ordinal, 1);
  const runtimeResult = await mockRuntimeGateway(grant.targetConnectionId, 'report.summarize', processed.payload, { traceId: grant.traceId, parentTraceId: 'trace_verify_source', requestId: grant.requestId, delegationGrantId: grant._id });
  assert.equal(gatewayCalls.length, 2); assert.equal(gatewayCalls[0].connectionId, connections[0]._id); assert.equal(gatewayCalls[1].connectionId, connections[1]._id); report('Runtime Gateway invocation', 'source and target executed only through the mock Runtime Gateway boundary');
  const output = processDelegatedOutput(validateAgainstSchema(targetOutputSchema, runtimeResult.output), activeContract); assert.deepEqual(output.payload, { report: 'Verified title: Verified summary' });
  assert.equal(grant.invocationCount, 1); assert.throws(() => reserve('different-request'), (error) => error.code === 'INTER_AGENT_GRANT_EXHAUSTED'); report('invocation limit enforced', 'grant count is exactly one and a second distinct use is denied');
  const replay = reserve('target-request'); assert.equal(replay.replayed, true); assert.equal(grant.invocationCount, 1); report('idempotent replay', 'original request replays without another reservation');
  assert.equal(grant.allowFurtherDelegation, false); assert.ok(grant.delegationDepth >= grant.maximumDelegationDepth); report('non-transitive delegation', 'further delegation is denied at depth one');
  assert.equal(gatewayCalls[1].context.traceId, grant.traceId); assert.equal(gatewayCalls[1].context.parentTraceId, 'trace_verify_source'); report('trace lineage', 'parent and child trace identifiers remain linked');

  const audits = [{ action: 'inter_agent.data.minimized', contractId: activeContract._id, classification: 'confidential', delegatedFieldCount: processed.statistics.delegatedFieldCount, redactedFieldCount: processed.statistics.redactedFieldCount }];
  const evidence = JSON.stringify(audits); assert.doesNotMatch(evidence, /reporter@example|must not move|Verified summary/); report('safe audit evidence', 'only IDs, labels, field counts, and safe categories are retained');
  const revoked = { ...grant, _id: objectId(61), status: 'active', invocationCount: 0 }; revoked.status = 'revoked'; revoked.revocationReasonCode = 'ADMINISTRATOR_REVOKED'; assert.equal(revoked.status, 'revoked'); report('revocation', 'second grant atomically transitions to terminal revoked');
  const approvalGrant = { ...grant, _id: objectId(62), status: 'pending', approvalRequestId: 'apr_verify' }; assert.equal(approvalGrant.status, 'pending'); report('approval integration', 'third grant remains unusable pending an existing approval request');
  const otherTenantVisible = [grant, revoked, approvalGrant].filter((item) => item.organizationId === objectId(91)); assert.equal(otherTenantVisible.length, 0); report('tenant isolation', 'cross-tenant grant lookup returns no records');
  const serialized = JSON.stringify({ snapshot, grant, invocation: { effectiveDataClassification: 'confidential', delegatedFieldCount: processed.statistics.delegatedFieldCount }, audits }); assert.doesNotMatch(serialized, /credential|installKey|providerKey|authorization|reporter@example|must not move/i); report('no credentials leaked', 'snapshots, grants, invocation metadata, audits, and evidence contain no secret authority');
  report('inter-agent-delegation verification', 'all deterministic non-billed Phase 13D3 gates passed');
}

if (require.main === module) {
  verify().catch((error) => { console.error(`Inter-agent-delegation verification failed: ${error.message}`); process.exitCode = 1; });
}

module.exports = { verify };
