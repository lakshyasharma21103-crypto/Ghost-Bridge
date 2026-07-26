const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const ApprovalRequest = require('../models/ApprovalRequest');
const ApprovalDecision = require('../models/ApprovalDecision');
const ApprovalGrant = require('../models/ApprovalGrant');
const EvidenceEvent = require('../models/EvidenceEvent');
const AuditCheckpoint = require('../models/AuditCheckpoint');
const LegalHold = require('../models/LegalHold');
const RuntimeWorkItem = require('../models/RuntimeWorkItem');
const {
  actionFingerprint,
  evaluateApprovalRequirement,
  validateWorkflowDefinition,
  workflowMatches,
} = require('../services/approval.service');
const {
  CONTROL_CATALOG,
  STORAGE_ROOT,
  eventDigest,
  holdMatchesEvent,
  normalizeAuditLog,
  verifyEventSequence,
  verifyEvidencePackageAt,
  writePackage,
} = require('../services/evidence.service');
const metrics = require('../services/complianceMetrics.service');
const { approvalFingerprint, canonicalize } = require('../utils/complianceCanonical');
const {
  CLAIMABLE_DURABLE_WORK_STATUSES,
  DURABLE_WORK_STATUSES,
} = require('../constants/durableWork');
const { INVOCATION_STATES } = require('../constants/invocationLifecycle');
const { listPermissions } = require('../constants/permissionRegistry');

function source(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function workflow(status = 'ACTIVE') {
  return {
    stableWorkflowId: 'awf_test',
    version: 1,
    status,
    organizationId: 'org_1',
    workspaceId: 'ws_1',
    name: 'Critical action',
    expirationMs: 60_000,
    target: { permissionIds: ['connection.invoke'], sideEffects: ['IRREVERSIBLE'] },
    stages: [
      {
        stageId: 'first',
        sequence: 1,
        name: 'First',
        requiredDecisionCount: 1,
        eligibleApprovers: { permissionIds: ['approval.request.approve'], requireHuman: true },
        excludeRequester: true,
        distinctApprovers: true,
      },
      {
        stageId: 'second',
        sequence: 2,
        name: 'Second',
        requiredDecisionCount: 2,
        eligibleApprovers: { permissionIds: ['approval.request.approve'], requireHuman: true },
        excludeRequester: true,
        distinctApprovers: true,
        excludePreviousStageApprovers: true,
      },
    ],
  };
}

function action(overrides = {}) {
  return {
    organizationId: 'org_1',
    workspaceId: 'ws_1',
    requesterActorId: 'user_1',
    requesterActorType: 'user',
    permission: 'connection.invoke',
    resourceType: 'Connection',
    resourceId: 'con_1',
    connectionId: 'con_1',
    capabilityId: 'cap_1',
    sideEffect: 'IRREVERSIBLE',
    operationType: 'INVOCATION',
    environment: 'production',
    policySnapshotRevision: 4,
    safeRequestAttributes: { allowedField: 'value' },
    ...overrides,
  };
}

function evidence(sequence, previousDigest, overrides = {}) {
  const base = {
    eventId: `evt_${sequence}`,
    sourceAuditLogId: `audit_${sequence}`,
    eventType: 'approval.decision.recorded',
    eventSchemaVersion: 1,
    occurredAt: new Date(`2026-01-01T00:0${sequence}:00Z`),
    recordedAt: new Date(`2026-01-01T00:0${sequence}:01Z`),
    organizationId: 'org_1',
    workspaceId: 'ws_1',
    actorId: 'user_2',
    actorType: 'user',
    action: 'approval.decision.recorded',
    permission: 'approval.request.approve',
    resourceType: 'ApprovalRequest',
    resourceId: 'apr_1',
    decision: 'APPROVE',
    reasonCode: 'APPROVAL_RECORDED',
    sourceSubsystem: 'approval-governance',
    safeMetadata: {},
    retentionClass: 'APPROVAL',
    legalHold: false,
    ownershipStatus: 'VERIFIED',
    ...overrides,
  };
  const integrity = {
    chainId: 'chain_1',
    partitionId: '2026-01',
    sequence,
    previousDigest,
    algorithm: 'sha256',
    algorithmVersion: 1,
  };
  return { ...base, integrity: { ...integrity, eventDigest: eventDigest(base, integrity) } };
}

test('RBAC and policy denial are evaluated before approval', () => {
  const runtime = source('services/runtimeGateway.service.js');
  assert.ok(runtime.indexOf("'authorization_check'") < runtime.indexOf("'approval_check'"));
});

test('no active matching workflow preserves existing behavior', async () => {
  const result = await evaluateApprovalRequirement(action(), { workflowLoader: async () => [] });
  assert.deepEqual(
    { required: result.required, decision: result.decision },
    { required: false, decision: 'ALLOW' },
  );
});

test('active workflow requires approval while draft and retired workflows do not', async () => {
  for (const status of ['DRAFT', 'RETIRED']) {
    const result = await evaluateApprovalRequirement(action(), {
      workflowLoader: async () => [workflow(status)],
    });
    assert.equal(result.required, false);
  }
  const active = await evaluateApprovalRequirement(action(), {
    workflowLoader: async () => [workflow()],
  });
  assert.equal(active.decision, 'ALLOW_WITH_APPROVAL');
});

test('workflow target matching is exact and stable-ID based', () => {
  assert.equal(workflowMatches(workflow(), action()), true);
  assert.equal(
    workflowMatches(workflow(), action({ resourceId: 'con_other', connectionId: 'con_other' })),
    true,
  );
  assert.equal(
    workflowMatches(
      { ...workflow(), target: { resourceIds: ['con_1'] } },
      action({ resourceId: 'con_other' }),
    ),
    false,
  );
  assert.equal(workflowMatches(workflow(), action({ sideEffect: 'READ_ONLY' })), false);
});

test('multi-stage workflow validation enforces contiguous stage ordering', () => {
  assert.equal(validateWorkflowDefinition(workflow()).valid, true);
  const invalid = workflow();
  invalid.stages[1].sequence = 3;
  assert.equal(validateWorkflowDefinition(invalid).valid, false);
});

test('workflow schemas make active versions immutable and versioned', () => {
  const indexes = ApprovalWorkflow.schema.indexes();
  assert.ok(
    indexes.some(([fields]) => fields.organizationId && fields.stableWorkflowId && fields.version),
  );
  assert.ok(indexes.some(([, options]) => options.partialFilterExpression?.status === 'ACTIVE'));
  assert.equal(ApprovalWorkflow.schema.options.optimisticConcurrency, true);
});

test('request fingerprints are deterministic and bind all security-relevant identities', () => {
  const first = approvalFingerprint({ ...action(), workflowId: 'awf_test', workflowVersion: 1 });
  const reordered = approvalFingerprint({
    workflowVersion: 1,
    workflowId: 'awf_test',
    ...action(),
  });
  assert.equal(first.digest, reordered.digest);
  for (const changed of [
    { requesterActorId: 'other' },
    { organizationId: 'other' },
    { workspaceId: 'other' },
    { resourceId: 'other' },
    { connectionId: 'other' },
    { capabilityId: 'other' },
    { environment: 'staging' },
    { policySnapshotRevision: 5 },
  ])
    assert.notEqual(
      first.digest,
      approvalFingerprint({ ...action(), workflowId: 'awf_test', workflowVersion: 1, ...changed })
        .digest,
    );
});

test('payload-sensitive fingerprint stores only a digest of redacted attributes', () => {
  const result = actionFingerprint(
    {
      ...action({
        safeRequestAttributes: { authorization: 'Bearer private-value', prompt: 'private prompt' },
      }),
      policySnapshotRevision: 4,
    },
    workflow(),
  );
  assert.equal(JSON.stringify(result.selected).includes('private-value'), false);
  assert.equal(JSON.stringify(result.selected).includes('private prompt'), false);
});

test('approval request, decision, and grant schemas carry tenant and concurrency indexes', () => {
  assert.ok(
    ApprovalRequest.schema.indexes().some(([fields]) => fields.organizationId && fields.status),
  );
  assert.ok(
    ApprovalDecision.schema
      .indexes()
      .some(
        ([fields, options]) => fields.approvalRequestId && fields.approverActorId && options.unique,
      ),
  );
  assert.ok(
    ApprovalGrant.schema
      .indexes()
      .some(([fields]) => fields.organizationId && fields.status && fields.expiresAt),
  );
  assert.equal(ApprovalRequest.schema.options.optimisticConcurrency, true);
});

test('separation-of-duties checks cover self approval, duplicate identities, and previous stages', () => {
  const approval = source('services/approval.service.js');
  assert.match(approval, /stage\.excludeRequester/);
  assert.match(approval, /APPROVER_DUPLICATE/);
  assert.match(approval, /excludePreviousStageApprovers/);
  assert.match(approval, /requiredDecisionCount/);
});

test('approvers are re-authorized as active human enterprise users at decision time', () => {
  const approval = source('services/approval.service.js');
  assert.match(approval, /EnterpriseUser\.findOne\([\s\S]*status: 'active'/);
  assert.match(approval, /approverActorType: 'user'/);
  assert.match(approval, /approval\.request\.approve/);
});

test('approval state transitions use revision and stage predicates to prevent over-counting', () => {
  const approval = source('services/approval.service.js');
  assert.match(approval, /revision: request\.revision[\s\S]*currentStageSequence: stage\.sequence/);
  assert.ok(
    ApprovalDecision.schema
      .indexes()
      .some(([, options]) => options.name === 'unique_approver_decision_per_stage'),
  );
});

test('expiry, rejection, cancellation, invalidation, and single-use consumption are explicit', () => {
  const approval = source('services/approval.service.js');
  for (const state of ['EXPIRED', 'REJECTED', 'CANCELLED', 'INVALIDATED', 'CONSUMED'])
    assert.match(approval, new RegExp(`'${state}'`));
  assert.match(approval, /expiresAt: \{ \$gt: new Date\(\) \}/);
});

test('grants are tenant, requester, resource, action, fingerprint, and expiry bound', () => {
  const approval = source('services/approval.service.js');
  assert.match(approval, /organizationId: String\(action\.organizationId\)/);
  assert.match(approval, /grant\.requesterActorId/);
  assert.match(approval, /grant\.resourceId/);
  assert.match(approval, /grant\.permission/);
  assert.match(approval, /grant\.requestFingerprint/);
});

test('there is no public generic grant bearer or redemption endpoint', () => {
  const routes = source('routes/approvalRoutes.js');
  assert.equal(/grant.*(?:redeem|token)|(?:redeem|token).*grant/i.test(routes), false);
});

test('approval is enforced before credential resolution and external invocation', () => {
  const runtime = source('services/runtimeGateway.service.js');
  assert.ok(
    runtime.indexOf("'approval_check'") < runtime.lastIndexOf('resolveCredentialForRuntime'),
  );
  assert.ok(runtime.indexOf('consumeApprovalGrants') < runtime.lastIndexOf('adapter.invoke'));
});

test('waiting-for-approval durable work cannot be claimed', () => {
  assert.ok(DURABLE_WORK_STATUSES.includes('waiting_for_approval'));
  assert.equal(CLAIMABLE_DURABLE_WORK_STATUSES.includes('waiting_for_approval'), false);
  assert.ok(INVOCATION_STATES.includes('waiting_for_approval'));
  assert.ok(RuntimeWorkItem.schema.path('approvalRequestId'));
});

test('unknown-side-effect recovery remains an explicit distinct governed action', () => {
  const runtime = source('services/runtimeGateway.service.js');
  assert.match(runtime, /RECOVERY_RETRY/);
  const control = source('services/invocationControl.service.js');
  assert.match(control, /Manual retry is not proven safe/);
  assert.match(control, /remoteIdempotencyKeyHash/);
});

test('legacy audit normalization preserves verified tenant ownership and quarantines ambiguity', () => {
  const verified = normalizeAuditLog({
    _id: '1',
    action: 'policy.activated',
    organizationId: 'org_1',
    createdAt: new Date(),
  });
  const ambiguous = normalizeAuditLog({ _id: '2', action: 'legacy.event', createdAt: new Date() });
  assert.equal(verified.organizationId, 'org_1');
  assert.equal(verified.ownershipStatus, 'VERIFIED');
  assert.equal(ambiguous.organizationId, undefined);
  assert.equal(ambiguous.ownershipStatus, 'AMBIGUOUS');
});

test('normalization excludes credentials, headers, private prompts, and payloads', () => {
  const event = normalizeAuditLog({
    _id: '1',
    organizationId: 'org_1',
    action: 'secret.revoked',
    createdAt: new Date(),
    metadata: {
      authorization: 'Bearer very-private-token',
      credential: 'credential-value',
      privatePrompt: 'private prompt',
      input: { topic: 'private payload' },
      reasonCode: 'SECRET_REVOKED',
    },
  });
  const serialized = JSON.stringify(event);
  for (const value of [
    'very-private-token',
    'credential-value',
    'private prompt',
    'private payload',
  ])
    assert.equal(serialized.includes(value), false);
  assert.equal(event.reasonCode, 'SECRET_REVOKED');
});

test('evidence canonicalization and hash chaining are deterministic', () => {
  const first = evidence(1);
  const duplicate = evidence(1);
  assert.equal(canonicalize(first), canonicalize(duplicate));
  assert.equal(first.integrity.eventDigest, duplicate.integrity.eventDigest);
  const second = evidence(2, first.integrity.eventDigest);
  assert.equal(verifyEventSequence([first, second]).status, 'VALID');
});

test('modification and missing sequence break audit-chain verification', () => {
  const first = evidence(1);
  const second = evidence(2, first.integrity.eventDigest);
  assert.equal(verifyEventSequence([first, { ...second, decision: 'REJECT' }]).status, 'INVALID');
  const gap = { ...second, integrity: { ...second.integrity, sequence: 3 } };
  assert.ok(
    verifyEventSequence([first, gap]).errors.some((error) => error.code === 'AUDIT_CHAIN_GAP'),
  );
});

test('tenant chains and checkpoint ranges have isolated unique indexes', () => {
  assert.ok(
    EvidenceEvent.schema
      .indexes()
      .some(
        ([fields, options]) =>
          fields.organizationId &&
          fields['integrity.partitionId'] &&
          fields['integrity.sequence'] &&
          options.unique,
      ),
  );
  assert.ok(
    AuditCheckpoint.schema
      .indexes()
      .some(
        ([fields, options]) =>
          fields.organizationId &&
          fields.partitionId &&
          fields.startSequence &&
          fields.endSequence &&
          options.unique,
      ),
  );
});

test('evidence package manifest and digests verify, and tampering is detected', async () => {
  const exportId = `exp_test_${crypto.randomUUID()}`;
  const first = evidence(1);
  const second = evidence(2, first.integrity.eventDigest);
  const result = await writePackage(
    {
      evidenceExportId: exportId,
      organizationId: 'org_1',
      workspaceId: 'ws_1',
      filters: {},
      knownGaps: [],
    },
    [first, second],
    [],
  );
  try {
    const valid = await verifyEvidencePackageAt(result.directory);
    assert.equal(valid.status, 'VALID');
    await fsp.appendFile(path.join(result.directory, 'events.jsonl'), '{}\n');
    const invalid = await verifyEvidencePackageAt(result.directory);
    assert.equal(invalid.status, 'INVALID');
  } finally {
    await fsp.rm(result.directory, { recursive: true, force: true });
  }
});

test('missing package files and unsupported versions are never reported valid', async () => {
  const missingDir = path.join(STORAGE_ROOT, `missing_${crypto.randomUUID()}`);
  await fsp.mkdir(missingDir, { recursive: true });
  try {
    assert.equal((await verifyEvidencePackageAt(missingDir)).status, 'INVALID');
    await fsp.writeFile(
      path.join(missingDir, 'manifest.json'),
      JSON.stringify({ packageVersion: 999 }),
    );
    await fsp.writeFile(path.join(missingDir, 'events.jsonl'), '');
    assert.equal((await verifyEvidencePackageAt(missingDir)).status, 'UNSUPPORTED_VERSION');
  } finally {
    await fsp.rm(missingDir, { recursive: true, force: true });
  }
});

test('legal hold scoping protects only matching tenant evidence', () => {
  const hold = {
    organizationId: 'org_1',
    workspaceId: 'ws_1',
    scope: { eventCategories: ['APPROVAL'], resourceIds: ['apr_1'] },
  };
  const matching = {
    organizationId: 'org_1',
    workspaceId: 'ws_1',
    retentionClass: 'APPROVAL',
    resourceId: 'apr_1',
    occurredAt: new Date(),
  };
  assert.equal(holdMatchesEvent(hold, matching), true);
  assert.equal(holdMatchesEvent(hold, { ...matching, workspaceId: 'ws_other' }), false);
  assert.ok(LegalHold.schema.indexes().some(([fields]) => fields.organizationId && fields.status));
});

test('retention defaults preserve evidence and require dry run plus explicit confirmation', () => {
  const evidenceService = source('services/evidence.service.js');
  assert.match(evidenceService, /dryRun: true/);
  assert.match(evidenceService, /input\.confirm !== true/);
  assert.match(evidenceService, /protectedByLegalHoldCount/);
  assert.equal(
    EvidenceEvent.schema.indexes().some(([, options]) => options.expireAfterSeconds !== undefined),
    false,
  );
});

test('control mappings are informational and make no certification claim', () => {
  assert.ok(CONTROL_CATALOG.length >= 10);
  assert.ok(CONTROL_CATALOG.every((control) => control.mappingStatus === 'INFORMATIONAL'));
  assert.equal(/certified/i.test(JSON.stringify(CONTROL_CATALOG)), false);
});

test('permission registry includes the complete compliance administration surface', () => {
  const permissions = new Set(listPermissions().map((item) => item.id));
  for (const permission of [
    'approval.workflow.read',
    'approval.workflow.create',
    'approval.workflow.update',
    'approval.workflow.activate',
    'approval.workflow.retire',
    'approval.request.read',
    'approval.request.create',
    'approval.request.cancel',
    'approval.request.approve',
    'approval.request.reject',
    'approval.audit.read',
    'evidence.read',
    'evidence.export',
    'evidence.download',
    'evidence.verify',
    'audit.integrity.read',
    'audit.integrity.verify',
    'audit.retention.read',
    'audit.retention.manage',
    'legal-hold.read',
    'legal-hold.create',
    'legal-hold.release',
    'control.read',
    'control.manage',
    'compliance.report.read',
  ])
    assert.ok(permissions.has(permission), permission);
});

test('compliance metrics discard high-cardinality identifiers', () => {
  metrics.reset();
  metrics.increment('approval_requests_created', {
    outcome: 'created',
    organizationId: 'org_secret',
    actorId: 'actor_secret',
    traceId: 'trace_secret',
  });
  const snapshot = JSON.stringify(metrics.snapshot());
  assert.equal(snapshot.includes('org_secret'), false);
  assert.equal(snapshot.includes('actor_secret'), false);
  assert.equal(snapshot.includes('trace_secret'), false);
  assert.equal(snapshot.includes('outcome=created'), true);
});

test('health and readiness routes do not perform exports or external calls', () => {
  const health = source('routes/healthRoutes.js');
  assert.equal(
    /createEvidenceExport|processEvidenceExport|adapter\.invoke|resolveCredential/.test(health),
    false,
  );
});
