const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { approvalFingerprint } = require('../src/utils/complianceCanonical');
const {
  evaluateApprovalRequirement,
  validateWorkflowDefinition,
  workflowMatches,
} = require('../src/services/approval.service');
const {
  eventDigest,
  normalizeAuditLog,
  verifyEventSequence,
} = require('../src/services/evidence.service');
const { listPermissions } = require('../src/constants/permissionRegistry');
const { CLAIMABLE_DURABLE_WORK_STATUSES } = require('../src/constants/durableWork');

function source(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function pass(name) {
  console.log(`PASS ${name}`);
}

async function verify() {
  const action = {
    organizationId: 'org_verify',
    workspaceId: 'workspace_verify',
    requesterActorId: 'user_requester',
    requesterActorType: 'user',
    permission: 'connection.invoke',
    resourceType: 'Connection',
    resourceId: 'connection_verify',
    connectionId: 'connection_verify',
    capabilityId: 'capability_verify',
    operationType: 'INVOCATION',
    environment: 'production',
    workflowId: 'awf_verify',
    workflowVersion: 1,
    policySnapshotRevision: 7,
    safeRequestAttributes: { topic: 'safe' },
  };
  assert.equal(approvalFingerprint(action).digest, approvalFingerprint({ ...action }).digest);
  assert.notEqual(
    approvalFingerprint(action).digest,
    approvalFingerprint({ ...action, capabilityId: 'changed' }).digest,
  );
  pass('deterministic exact-action approval fingerprinting and invalidation');

  const workflow = {
    stableWorkflowId: 'awf_verify',
    version: 1,
    status: 'ACTIVE',
    organizationId: action.organizationId,
    workspaceId: action.workspaceId,
    name: 'Critical invocation',
    expirationMs: 60_000,
    target: { permissionIds: ['connection.invoke'], sideEffects: ['IRREVERSIBLE'] },
    stages: [
      {
        stageId: 'workspace',
        sequence: 1,
        name: 'Workspace review',
        requiredDecisionCount: 1,
        eligibleApprovers: { permissionIds: ['approval.request.approve'], requireHuman: true },
        excludeRequester: true,
        distinctApprovers: true,
      },
      {
        stageId: 'security',
        sequence: 2,
        name: 'Security review',
        requiredDecisionCount: 2,
        eligibleApprovers: { permissionIds: ['approval.request.approve'], requireHuman: true },
        excludeRequester: true,
        excludePreviousStageApprovers: true,
        distinctApprovers: true,
      },
    ],
  };
  assert.equal(validateWorkflowDefinition(workflow).valid, true);
  assert.equal(workflowMatches(workflow, { ...action, sideEffect: 'IRREVERSIBLE' }), true);
  assert.equal(workflowMatches(workflow, { ...action, sideEffect: 'READ_ONLY' }), false);
  const active = await evaluateApprovalRequirement(
    { ...action, sideEffect: 'IRREVERSIBLE' },
    { workflowLoader: async () => [workflow] },
  );
  const draft = await evaluateApprovalRequirement(
    { ...action, sideEffect: 'IRREVERSIBLE' },
    { workflowLoader: async () => [{ ...workflow, status: 'DRAFT' }] },
  );
  assert.equal(active.decision, 'ALLOW_WITH_APPROVAL');
  assert.equal(draft.decision, 'ALLOW');
  pass('active-only workflow evaluation and ordered multi-stage definition');

  const runtime = source('src/services/runtimeGateway.service.js');
  assert.ok(runtime.indexOf("'authorization_check'") < runtime.indexOf("'approval_check'"));
  assert.ok(
    runtime.indexOf("'approval_check'") < runtime.lastIndexOf('resolveCredentialForRuntime'),
  );
  assert.ok(runtime.indexOf('consumeApprovalGrants') < runtime.lastIndexOf('adapter.invoke'));
  pass('RBAC and policy precede approval, credentials, queue execution, and external calls');

  const approval = source('src/services/approval.service.js');
  assert.match(approval, /REQUESTER_SELF_APPROVAL_FORBIDDEN|SELF_APPROVAL/);
  assert.match(approval, /excludePreviousStageApprovers/);
  assert.match(approval, /requiredDecisionCount/);
  assert.match(approval, /status: 'CONSUMED'/);
  assert.match(approval, /EnterpriseUser\.findOne[\s\S]*status: 'active'/);
  pass('self-approval, distinct human approvers, expiry, and single-use grant controls');

  assert.equal(CLAIMABLE_DURABLE_WORK_STATUSES.includes('waiting_for_approval'), false);
  assert.match(
    source('src/services/approval.service.js'),
    /status: 'waiting_for_approval'[\s\S]*status: 'pending'/,
  );
  pass('waiting approval work is non-claimable and atomically released');

  const normalized = normalizeAuditLog({
    _id: 'legacy_1',
    action: 'secret.revoked',
    actorType: 'user',
    actorId: 'user_1',
    organizationId: 'org_verify',
    workspaceId: 'workspace_verify',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    metadata: { decision: 'ALLOW', authorization: 'Bearer never-export', privatePrompt: 'private' },
  });
  assert.equal(normalized.organizationId, 'org_verify');
  assert.equal(JSON.stringify(normalized).includes('never-export'), false);
  assert.equal(JSON.stringify(normalized).includes('private'), false);
  const integrity1 = {
    chainId: 'chain',
    partitionId: '2026-01',
    sequence: 1,
    algorithm: 'sha256',
    algorithmVersion: 1,
  };
  const event1 = {
    ...normalized,
    integrity: { ...integrity1, eventDigest: eventDigest(normalized, integrity1) },
  };
  const normalized2 = {
    ...normalized,
    eventId: 'evt_legacy_2',
    sourceAuditLogId: 'legacy_2',
    occurredAt: new Date('2026-01-01T00:01:00Z'),
  };
  const integrity2 = {
    chainId: 'chain',
    partitionId: '2026-01',
    sequence: 2,
    previousDigest: event1.integrity.eventDigest,
    algorithm: 'sha256',
    algorithmVersion: 1,
  };
  const event2 = {
    ...normalized2,
    integrity: { ...integrity2, eventDigest: eventDigest(normalized2, integrity2) },
  };
  assert.equal(verifyEventSequence([event1, event2]).status, 'VALID');
  assert.equal(verifyEventSequence([event1, { ...event2, decision: 'DENY' }]).status, 'INVALID');
  assert.equal(
    verifyEventSequence([event1, { ...event2, integrity: { ...event2.integrity, sequence: 3 } }])
      .status,
    'INVALID',
  );
  pass('normalized evidence redaction, deterministic chains, tamper detection, and gap detection');

  const permissions = new Set(listPermissions().map((item) => item.id));
  for (const permission of [
    'approval.workflow.activate',
    'approval.request.approve',
    'evidence.export',
    'audit.integrity.verify',
    'audit.retention.manage',
    'legal-hold.release',
    'compliance.report.read',
  ])
    assert.ok(permissions.has(permission));
  assert.equal(/grant.*redeem|redeem.*grant/i.test(source('src/routes/approvalRoutes.js')), false);
  pass('canonical permissions and no public generic grant redemption API');

  const evidence = source('src/services/evidence.service.js');
  assert.match(evidence, /PARTIALLY_VERIFIABLE/);
  assert.match(evidence, /protectedByLegalHoldCount/);
  assert.match(evidence, /certificationClaimed: false/);
  assert.equal(
    /privatePrompt|executionPayload|credentialHeaders/.test(source('src/models/EvidenceEvent.js')),
    false,
  );
  pass(
    'package verification, retention dry run, legal-hold protection, and no certification claim',
  );

  const metrics = source('src/services/complianceMetrics.service.js');
  assert.equal(
    /organizationId|workspaceId|actorId|resourceId|traceId/.test(
      metrics.match(/APPROVED_LABELS[^;]+/s)?.[0] || '',
    ),
    false,
  );
  pass('compliance metrics exclude high-cardinality tenant and actor labels');

  console.log('Compliance governance verification passed without external provider requests.');
}

verify().catch((error) => {
  console.error(`FAIL compliance governance verification: ${error.message}`);
  process.exitCode = 1;
});
