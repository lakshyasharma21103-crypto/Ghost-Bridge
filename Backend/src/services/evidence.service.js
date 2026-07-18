const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const EvidenceEvent = require('../models/EvidenceEvent');
const AuditChainState = require('../models/AuditChainState');
const AuditCheckpoint = require('../models/AuditCheckpoint');
const EvidenceExport = require('../models/EvidenceExport');
const RetentionPolicy = require('../models/RetentionPolicy');
const LegalHold = require('../models/LegalHold');
const ApprovalRequest = require('../models/ApprovalRequest');
const OperationalAlert = require('../models/OperationalAlert');
const { actorFromPartner, assertAuthorized } = require('./authorization.service');
const { redactSecrets, redactString } = require('../utils/redact');
const { canonicalDigest, canonicalize, sha256 } = require('../utils/complianceCanonical');
const {
  EVIDENCE_PACKAGE_VERSION,
  MAX_EVIDENCE_EXPORT_EVENTS,
  MAX_LEGAL_HOLD_SELECTOR_VALUES,
} = require('../constants/compliance');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { assertOperationalAccess } = require('./operationalState.service');
const metrics = require('./complianceMetrics.service');
const { enforceApproval, consumeApprovalGrants } = require('./approval.service');

const STORAGE_ROOT = path.resolve(__dirname, '..', '..', '..', 'artifacts', 'evidence-packages');
class LocalEvidencePackageStorage {
  constructor(root = STORAGE_ROOT) {
    this.root = path.resolve(root);
  }

  resolve(storageKey, fileName = '') {
    const resolved = path.resolve(this.root, storageKey, fileName);
    if (!resolved.startsWith(`${this.root}${path.sep}`)) {
      throw new AppError(
        500,
        ErrorCodes.EVIDENCE_PACKAGE_INVALID,
        'Evidence storage key is invalid.',
      );
    }
    return resolved;
  }

  async createPackageDirectory(storageKey) {
    await fs.mkdir(this.root, { recursive: true });
    const directory = this.resolve(storageKey);
    await fs.mkdir(directory, { recursive: true });
    return directory;
  }

  async writeExclusive(storageKey, fileName, content) {
    return fs.writeFile(this.resolve(storageKey, fileName), content, {
      encoding: 'utf8',
      flag: 'wx',
    });
  }

  async read(storageKey, fileName) {
    return fs.readFile(this.resolve(storageKey, fileName));
  }
}

const evidencePackageStorage = new LocalEvidencePackageStorage();
const SAFE_METADATA_KEYS = new Set([
  'permission',
  'decision',
  'reason',
  'reasonCode',
  'status',
  'fromState',
  'toState',
  'stageId',
  'workflowId',
  'workflowVersion',
  'stablePolicyId',
  'version',
  'effect',
  'requestFingerprint',
  'policySnapshotRevision',
  'matchedPolicyIds',
  'matchedPolicyVersions',
  'matchedPolicyEffects',
  'resourceType',
  'resourceId',
  'connectionId',
  'passportId',
  'capabilityId',
  'classification',
  'category',
  'sideEffect',
  'operationType',
  'eventCount',
  'retentionClass',
  'legalHoldId',
  'evidenceExportId',
  'checkpointId',
  'simulation',
  'definitionId',
  'orchestrationRunId',
  'nodeKey',
  'nodeCount',
  'attempt',
  'approvalRequestId',
]);

const CONTROL_CATALOG = Object.freeze(
  [
    [
      'AUTH-001',
      'Default-deny authorization',
      'Authorization',
      'IMPLEMENTED',
      ['authorization.decision'],
      'authorization',
      ['Backend/src/tests/enterpriseIdentity.test.js'],
      'Authorization depends on correct tenant identity configuration.',
    ],
    [
      'AUTH-002',
      'Tenant isolation',
      'Authorization',
      'IMPLEMENTED',
      ['authorization.decision'],
      'authorization',
      ['Backend/src/tests/enterpriseIdentity.test.js'],
      'Formal penetration testing remains required.',
    ],
    [
      'POL-001',
      'Explicit policy DENY precedence',
      'Policy',
      'IMPLEMENTED',
      ['authorization.decision', 'policy.activated'],
      'policy-engine',
      ['Backend/src/tests/policyEngine.test.js'],
      'Policy mappings are implementation evidence, not certification.',
    ],
    [
      'APR-001',
      'Requester self-approval prevention',
      'Approval',
      'IMPLEMENTED',
      ['approval.decision.recorded'],
      'approval-governance',
      ['Backend/src/tests/complianceGovernance.test.js'],
      'Applies when workflow requester exclusion is enabled.',
    ],
    [
      'APR-002',
      'Distinct approver enforcement',
      'Approval',
      'IMPLEMENTED',
      ['approval.decision.recorded'],
      'approval-governance',
      ['Backend/src/tests/complianceGovernance.test.js'],
      'Stage configuration determines the required distinctness.',
    ],
    [
      'SEC-001',
      'Plaintext secrets are not returned',
      'Secret Governance',
      'IMPLEMENTED',
      ['secret.created', 'secret.version.activated'],
      'secret-governance',
      ['Backend/src/tests/secretGovernance.test.js'],
      'Requires operational key management review.',
    ],
    [
      'SEC-002',
      'Credential revocation blocks execution',
      'Secret Governance',
      'IMPLEMENTED',
      ['secret.revoked', 'authorization.decision'],
      'credential-broker',
      ['Backend/src/tests/secretGovernance.test.js'],
      'Provider-side revocation timing is external.',
    ],
    [
      'AUD-001',
      'Audit events are normalized',
      'Audit Evidence',
      'IMPLEMENTED',
      ['evidence.normalized'],
      'evidence',
      ['Backend/src/tests/complianceGovernance.test.js'],
      'Legacy events with ambiguous tenant ownership are quarantined, not guessed.',
    ],
    [
      'AUD-002',
      'Audit chain verification',
      'Audit Evidence',
      'IMPLEMENTED',
      ['audit.integrity.verified'],
      'evidence',
      ['Backend/src/tests/complianceGovernance.test.js'],
      'Hash chains are tamper-evident, not tamper-proof. External anchoring is not implemented.',
    ],
    [
      'OPS-001',
      'Durable execution recovery',
      'Operations',
      'IMPLEMENTED',
      ['invocation.recovery.eligible'],
      'durable-worker',
      ['Backend/src/tests/durableWork.test.js'],
      'Multi-instance recovery requires deployment-specific validation.',
    ],
    [
      'ORC-001',
      'Orchestration data minimization',
      'Orchestration',
      'IMPLEMENTED',
      ['orchestration.node.succeeded', 'orchestration.run.succeeded'],
      'orchestration-control-plane',
      ['Backend/src/tests/orchestration.test.js'],
      'Phase 13D1 stores only schema-validated outputs selected for downstream mappings.',
    ],
    [
      'ORC-002',
      'Durable orchestration recovery',
      'Orchestration',
      'IMPLEMENTED',
      ['orchestration.node.started', 'orchestration.node.retried'],
      'orchestration-worker',
      ['Backend/src/tests/orchestration.test.js'],
      'Compensation transactions are reserved for a later phase.',
    ],
  ].map(
    ([
      controlId,
      title,
      category,
      implementationStatus,
      evidenceEventTypes,
      responsibleSubsystem,
      testReferences,
      limitations,
    ]) =>
      Object.freeze({
        controlId,
        version: 1,
        title,
        description: title,
        category,
        implementationStatus,
        evidenceEventTypes,
        responsibleSubsystem,
        testReferences,
        limitations,
        mappings: [],
        mappingStatus: 'INFORMATIONAL',
        createdAt: '2026-07-16T00:00:00.000Z',
        updatedAt: '2026-07-16T00:00:00.000Z',
      }),
  ),
);

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function clean(value, maximum = 256) {
  return String(value || '')
    .trim()
    .slice(0, maximum);
}

async function recordComplianceAudit(action, entityType, entityId, scope, metadata = {}) {
  try {
    const { createAuditLog } = require('./auditService');
    await createAuditLog(
      scope.actor?.type === 'user' ? 'user' : 'partner',
      scope.actorId || scope.actor?.id || 'system:compliance',
      action,
      entityType,
      entityId,
      {
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        ...safeMetadata(metadata),
      },
      { requestId: scope.requestId, traceId: scope.traceId },
    );
  } catch {
    // The primary evidence operation retains its own deterministic status for recovery.
  }
}

async function raiseComplianceAlert(scope, type, reasonCode) {
  if (mongoose.connection.readyState !== 1 || !mongoose.isValidObjectId(scope.organizationId))
    return;
  const now = new Date();
  const dedupeKey = `compliance:${canonicalDigest({ organizationId: scope.organizationId, workspaceId: scope.workspaceId || 'organization', type })}`;
  try {
    await OperationalAlert.findOneAndUpdate(
      { dedupeKey },
      {
        $set: {
          partnerId: scope.organizationId,
          organizationId: scope.organizationId,
          receivingWorkspaceId: scope.workspaceId || 'organization',
          type,
          scopeKey: 'compliance-governance',
          severity: 'critical',
          status: 'active',
          title: 'Compliance governance verification failed',
          summary: 'A compliance evidence operation failed closed and requires operator review.',
          metricName: type,
          observedValue: 1,
          thresholdValue: 0,
          safeValues: { reasonCode },
          lastSeenAt: now,
        },
        $setOnInsert: { firstSeenAt: now },
        $inc: { occurrenceCount: 1 },
      },
      { upsert: true },
    );
  } catch {
    // The failed evidence result remains fail-closed even if the alert sink is unavailable.
  }
}

function safeMetadata(metadata = {}) {
  const redacted = redactSecrets(metadata);
  return Object.fromEntries(
    Object.entries(redacted || {})
      .filter(([key]) => SAFE_METADATA_KEYS.has(key))
      .map(([key, value]) => [key, value]),
  );
}

function retentionClassFor(action = '') {
  if (action.startsWith('approval.')) return 'APPROVAL';
  if (action.startsWith('secret.') || action.startsWith('credential.')) return 'SECRET_GOVERNANCE';
  if (
    action.startsWith('evidence.') ||
    action.startsWith('audit.') ||
    action.startsWith('legal_hold.') ||
    action.startsWith('retention.')
  )
    return 'COMPLIANCE';
  if (action === 'authorization.decision' || action.startsWith('policy.')) return 'SECURITY';
  return 'OPERATIONAL';
}

function sourceSubsystemFor(action = '') {
  if (action.startsWith('approval.')) return 'approval-governance';
  if (action.startsWith('secret.') || action.startsWith('credential.')) return 'secret-governance';
  if (action.startsWith('policy.') || action === 'authorization.decision')
    return 'authorization-policy';
  if (action.startsWith('invocation.') || action.startsWith('work.')) return 'runtime';
  if (action.startsWith('orchestration.')) return 'orchestration-control-plane';
  if (action.startsWith('evidence.') || action.startsWith('audit.')) return 'evidence';
  return 'control-plane';
}

function partitionFor(organizationId, occurredAt) {
  const date = new Date(occurredAt);
  const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  return { partitionId: month, chainId: sha256(`${organizationId}|${month}`) };
}

function normalizeAuditLog(logInput) {
  const log = typeof logInput?.toObject === 'function' ? logInput.toObject() : logInput || {};
  const metadata = safeMetadata(log.metadata || {});
  const organizationId = clean(
    log.organizationId || log.metadata?.organizationId || log.metadata?.tenantOrganizationId,
  );
  const occurredAt = new Date(log.createdAt || Date.now());
  const ownershipStatus = organizationId ? 'VERIFIED' : 'AMBIGUOUS';
  return {
    eventId: `evt_${idOf(log) || crypto.randomUUID()}`,
    sourceAuditLogId: idOf(log) || undefined,
    eventType: clean(log.action || 'legacy.audit.event'),
    eventSchemaVersion: 1,
    occurredAt,
    recordedAt: new Date(),
    organizationId: organizationId || undefined,
    workspaceId:
      clean(log.workspaceId || log.metadata?.workspaceId || log.metadata?.receivingWorkspaceId) ||
      undefined,
    actorId: clean(log.actorId) || undefined,
    actorType: clean(log.actorType) || undefined,
    action: clean(log.action) || undefined,
    permission: clean(log.metadata?.permission) || undefined,
    resourceType: clean(log.entityType || log.metadata?.resourceType) || undefined,
    resourceId: clean(log.entityId || log.metadata?.resourceId) || undefined,
    decision: clean(log.metadata?.decision || log.metadata?.policyDecision) || undefined,
    reasonCode: clean(log.metadata?.reasonCode || log.metadata?.reason) || undefined,
    traceId: clean(log.traceId) || undefined,
    requestId: clean(log.requestId) || undefined,
    invocationId: clean(log.invocationId) || undefined,
    approvalRequestId:
      clean(
        log.metadata?.approvalRequestId ||
          (log.entityType === 'ApprovalRequest' ? log.entityId : ''),
      ) || undefined,
    policyReferences: (log.metadata?.matchedPolicyIds || []).map((stablePolicyId, index) => ({
      stablePolicyId: clean(stablePolicyId),
      version: Number(log.metadata?.matchedPolicyVersions?.[index] || 0) || undefined,
      effect: clean(log.metadata?.matchedPolicyEffects?.[index]) || undefined,
    })),
    stateTransition:
      log.metadata?.fromState || log.metadata?.toState
        ? {
            fromState: clean(log.metadata?.fromState) || null,
            toState: clean(log.metadata?.toState),
            status: clean(log.metadata?.status) || undefined,
          }
        : undefined,
    sourceSubsystem: sourceSubsystemFor(log.action),
    safeMetadata: metadata,
    retentionClass: retentionClassFor(log.action),
    legalHold: false,
    ownershipStatus,
  };
}

function canonicalEvidenceContent(event) {
  return {
    eventId: event.eventId,
    sourceAuditLogId: event.sourceAuditLogId,
    eventType: event.eventType,
    eventSchemaVersion: event.eventSchemaVersion,
    occurredAt: new Date(event.occurredAt).toISOString(),
    recordedAt: new Date(event.recordedAt).toISOString(),
    organizationId: event.organizationId,
    workspaceId: event.workspaceId,
    actorId: event.actorId,
    actorType: event.actorType,
    action: event.action,
    permission: event.permission,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    decision: event.decision,
    reasonCode: event.reasonCode,
    traceId: event.traceId,
    requestId: event.requestId,
    invocationId: event.invocationId,
    approvalRequestId: event.approvalRequestId,
    policyReferences: event.policyReferences || [],
    stateTransition: event.stateTransition,
    sourceSubsystem: event.sourceSubsystem,
    safeMetadata: safeMetadata(event.safeMetadata),
    retentionClass: event.retentionClass,
    legalHold: event.legalHold === true,
    ownershipStatus: event.ownershipStatus,
  };
}

function eventDigest(event, integrity) {
  return canonicalDigest({
    event: canonicalEvidenceContent(event),
    chainId: integrity.chainId,
    partitionId: integrity.partitionId,
    sequence: integrity.sequence,
    previousDigest: integrity.previousDigest || null,
    algorithm: 'sha256',
    algorithmVersion: 1,
  });
}

async function persistNormalizedEvent(normalized, options = {}) {
  if (!normalized.organizationId) return { quarantined: true, event: normalized };
  const existing = normalized.sourceAuditLogId
    ? await EvidenceEvent.findOne({ sourceAuditLogId: normalized.sourceAuditLogId }).lean()
    : null;
  if (existing) return { created: false, event: existing };
  const partition = partitionFor(normalized.organizationId, normalized.occurredAt);
  let created;
  const operation = async (session) => {
    let state = await AuditChainState.findOne({
      organizationId: normalized.organizationId,
      partitionId: partition.partitionId,
    }).session(session || null);
    if (!state) {
      state = await AuditChainState.create(
        [
          {
            organizationId: normalized.organizationId,
            partitionId: partition.partitionId,
            chainId: partition.chainId,
            nextSequence: 1,
            schemaVersion: 1,
          },
        ],
        { session },
      ).then((items) => items[0]);
    }
    const sequence = state.nextSequence;
    const integrity = {
      chainId: state.chainId,
      partitionId: state.partitionId,
      sequence,
      previousDigest: state.finalDigest,
      algorithm: 'sha256',
      algorithmVersion: 1,
    };
    integrity.eventDigest = eventDigest(normalized, integrity);
    created = await EvidenceEvent.create([{ ...normalized, integrity }], { session }).then(
      (items) => items[0],
    );
    const advanced = await AuditChainState.updateOne(
      { _id: state._id, nextSequence: sequence, finalDigest: state.finalDigest },
      {
        $set: { finalDigest: integrity.eventDigest, lastOccurredAt: normalized.occurredAt },
        $inc: { nextSequence: 1 },
      },
      { session },
    );
    if (advanced.modifiedCount !== 1) throw new Error('AUDIT_CHAIN_SEQUENCE_CONFLICT');
  };
  if (mongoose.connection.readyState === 1 && options.transaction !== false)
    await mongoose.connection.transaction(operation);
  else await operation(null);
  metrics.increment('evidence_events_normalized');
  return { created: true, event: created };
}

async function normalizeAndPersistAuditLog(log, options = {}) {
  try {
    return await persistNormalizedEvent(normalizeAuditLog(log), options);
  } catch (error) {
    metrics.increment('evidence_normalization_failures', {
      reason: error.code || error.message || 'FAILED',
    });
    if (options.throwOnFailure) throw error;
    return { created: false, error: 'EVIDENCE_NORMALIZATION_FAILED' };
  }
}

function verifyEventSequence(eventsInput = [], options = {}) {
  const events = eventsInput.map((event) =>
    typeof event?.toObject === 'function' ? event.toObject() : event,
  );
  const errors = [];
  let previousDigest =
    !options.requireGenesis && events[0]?.integrity?.sequence > 1
      ? events[0]?.integrity?.previousDigest
      : undefined;
  let expectedSequence = options.requireGenesis
    ? 1
    : events.length
      ? Number(events[0].integrity?.sequence || 1)
      : 1;
  let chainId;
  for (const event of events) {
    const integrity = event.integrity || {};
    if (!chainId) chainId = integrity.chainId;
    if (integrity.chainId !== chainId)
      errors.push({ code: 'AUDIT_CHAIN_TENANT_OR_PARTITION_MISMATCH', eventId: event.eventId });
    if (integrity.sequence !== expectedSequence)
      errors.push({
        code: 'AUDIT_CHAIN_GAP',
        expectedSequence,
        actualSequence: integrity.sequence,
      });
    if ((integrity.previousDigest || undefined) !== (previousDigest || undefined))
      errors.push({ code: 'AUDIT_CHAIN_PREVIOUS_DIGEST_MISMATCH', sequence: integrity.sequence });
    const expectedDigest = eventDigest(event, integrity);
    if (expectedDigest !== integrity.eventDigest)
      errors.push({ code: 'AUDIT_EVENT_DIGEST_MISMATCH', sequence: integrity.sequence });
    previousDigest = integrity.eventDigest;
    expectedSequence = Number(integrity.sequence) + 1;
  }
  return {
    status: errors.length ? 'INVALID' : 'VALID',
    valid: errors.length === 0,
    eventCount: events.length,
    firstSequence: events[0]?.integrity?.sequence,
    finalSequence: events.at(-1)?.integrity?.sequence,
    finalDigest: previousDigest,
    errors,
  };
}

function scopeFrom(input = {}, caller = {}) {
  const partnerId = idOf(caller.partner?._id || caller.partnerId || input.organizationId);
  if (!partnerId)
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      'Partner authentication is required.',
    );
  if (input.organizationId && idOf(input.organizationId) !== partnerId)
    throw new AppError(403, ErrorCodes.AUTHORIZATION_DENIED, 'Authorization denied.');
  return {
    partnerId,
    organizationId: partnerId,
    workspaceId: clean(input.workspaceId || input.receivingWorkspaceId) || undefined,
    actorId: idOf(caller.actorId || `partner:${partnerId}`),
    actor: caller.actor || actorFromPartner(caller.partner || { _id: partnerId }),
    requestId: caller.requestId,
    traceId: caller.traceId,
  };
}

async function authorizeEvidence(
  permission,
  input,
  caller,
  resourceType = 'Evidence',
  resourceId = 'evidence',
) {
  const scope = scopeFrom(input, caller);
  scope.authorizationDecision = await assertAuthorized(
    scope.actor,
    permission,
    {
      type: resourceType,
      id: resourceId,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
    },
    { requestId: caller.requestId, traceId: caller.traceId, workspaceId: scope.workspaceId },
  );
  return scope;
}

async function enforceEvidenceApproval(
  scope,
  permission,
  resourceType,
  resourceId,
  operationType,
  input,
  caller,
) {
  const enforcement = await enforceApproval({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    requesterActorId: scope.actor.id,
    requesterActorType: scope.actor.type,
    permission,
    resourceType,
    resourceId,
    operationType,
    environment: process.env.NODE_ENV,
    policySnapshotRevision: scope.authorizationDecision?.policySnapshotRevision,
    safeRequestAttributes: input.safeRequestAttributes || {
      eventType: input.eventType,
      retentionClass: input.retentionClass,
      from: input.from,
      to: input.to,
      approvalRequestId: input.approvalRequestId,
      invocationId: input.invocationId,
    },
    approvalRequestId: input.approvalRequestId,
    approvalRequestIds: input.approvalRequestIds,
  });
  return consumeApprovalGrants(enforcement, {
    actorId: scope.actor.id,
    actorType: scope.actor.type,
    requestId: caller.requestId,
    traceId: caller.traceId,
  });
}

function boundedLimit(value, maximum = 500) {
  const limit = Number(value || 100);
  if (!Number.isInteger(limit) || limit < 1 || limit > maximum)
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, `limit must be between 1 and ${maximum}.`);
  return limit;
}

function evidenceFilter(input, scope) {
  const filter = { organizationId: scope.organizationId };
  if (scope.workspaceId) filter.workspaceId = scope.workspaceId;
  if (input.eventType) filter.eventType = clean(input.eventType);
  if (input.retentionClass) filter.retentionClass = clean(input.retentionClass).toUpperCase();
  if (input.approvalRequestId) filter.approvalRequestId = clean(input.approvalRequestId);
  if (input.invocationId) filter.invocationId = clean(input.invocationId);
  if (input.from || input.to) {
    filter.occurredAt = {};
    if (input.from) filter.occurredAt.$gte = new Date(input.from);
    if (input.to) filter.occurredAt.$lte = new Date(input.to);
  }
  return filter;
}

function serializeEvidence(eventInput) {
  const event = typeof eventInput?.toObject === 'function' ? eventInput.toObject() : eventInput;
  return { ...canonicalEvidenceContent(event), integrity: event.integrity };
}

async function queryEvidence(input = {}, caller = {}) {
  const scope = await authorizeEvidence('evidence.read', input, caller);
  const events = await EvidenceEvent.find(evidenceFilter(input, scope))
    .sort({ occurredAt: -1 })
    .limit(boundedLimit(input.limit))
    .lean();
  return { items: events.map(serializeEvidence) };
}

async function verifyPartition(input = {}, caller = {}) {
  const scope = await authorizeEvidence(
    'audit.integrity.verify',
    input,
    caller,
    'AuditPartition',
    input.partitionId,
  );
  const partitionId = clean(input.partitionId);
  const events = await EvidenceEvent.find({
    organizationId: scope.organizationId,
    'integrity.partitionId': partitionId,
  })
    .sort({ 'integrity.sequence': 1 })
    .lean();
  const result = verifyEventSequence(events, { requireGenesis: true });
  metrics.increment(
    result.valid ? 'audit_chain_verification_success' : 'audit_chain_verification_failure',
  );
  await recordComplianceAudit('audit.integrity.verified', 'AuditPartition', partitionId, scope, {
    decision: result.status,
    reasonCode: result.valid ? 'AUDIT_CHAIN_VALID' : 'AUDIT_INTEGRITY_FAILED',
    eventCount: result.eventCount,
  });
  if (!result.valid)
    await raiseComplianceAlert(scope, 'audit_chain_verification_failure', 'AUDIT_INTEGRITY_FAILED');
  return { organizationId: scope.organizationId, partitionId, ...result };
}

async function generateCheckpoint(input = {}, caller = {}) {
  const scope = await authorizeEvidence(
    'audit.integrity.verify',
    input,
    caller,
    'AuditCheckpoint',
    input.partitionId,
  );
  const partitionId = clean(input.partitionId);
  const startSequence = Math.max(1, Number(input.startSequence || 1));
  const query = {
    organizationId: scope.organizationId,
    'integrity.partitionId': partitionId,
    'integrity.sequence': { $gte: startSequence },
  };
  if (input.endSequence) query['integrity.sequence'].$lte = Number(input.endSequence);
  const events = await EvidenceEvent.find(query)
    .sort({ 'integrity.sequence': 1 })
    .limit(10_000)
    .lean();
  if (!events.length)
    throw new AppError(
      404,
      ErrorCodes.NOT_FOUND,
      'No evidence events were found for this checkpoint.',
    );
  const verification = verifyEventSequence(events);
  const endSequence = events.at(-1).integrity.sequence;
  const existing = await AuditCheckpoint.findOne({
    organizationId: scope.organizationId,
    partitionId,
    startSequence,
    endSequence,
  }).lean();
  if (existing) return existing;
  const checkpoint = await AuditCheckpoint.create({
    checkpointId: `chk_${crypto.randomUUID()}`,
    organizationId: scope.organizationId,
    partitionId,
    startSequence,
    endSequence,
    firstEventDigest: events[0].integrity.eventDigest,
    finalEventDigest: events.at(-1).integrity.eventDigest,
    eventCount: events.length,
    verificationStatus: verification.status,
    schemaVersion: 1,
  });
  metrics.increment(
    verification.valid ? 'checkpoint_creation_success' : 'checkpoint_creation_failure',
  );
  await recordComplianceAudit(
    'audit.checkpoint.created',
    'AuditCheckpoint',
    checkpoint.checkpointId,
    scope,
    {
      checkpointId: checkpoint.checkpointId,
      decision: checkpoint.verificationStatus,
      eventCount: checkpoint.eventCount,
    },
  );
  return checkpoint;
}

async function listCheckpoints(input = {}, caller = {}) {
  const scope = await authorizeEvidence('audit.integrity.read', input, caller, 'AuditCheckpoint');
  const filter = { organizationId: scope.organizationId };
  if (input.partitionId) filter.partitionId = clean(input.partitionId);
  const items = await AuditCheckpoint.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return { items };
}

async function ensureStorage() {
  await fs.mkdir(evidencePackageStorage.root, { recursive: true });
}

async function writePackage(exportRecord, events, checkpoints = []) {
  await ensureStorage();
  const directory = await evidencePackageStorage.createPackageDirectory(
    exportRecord.evidenceExportId,
  );
  const eventLines = `${events.map((event) => canonicalize(serializeEvidence(event))).join('\n')}\n`;
  const summary = [
    'eventId,eventType,occurredAt,resourceType,decision,reasonCode',
    ...events.map((event) =>
      [
        event.eventId,
        event.eventType,
        new Date(event.occurredAt).toISOString(),
        event.resourceType || '',
        event.decision || '',
        event.reasonCode || '',
      ]
        .map((item) => `"${String(item).replaceAll('"', '""')}"`)
        .join(','),
    ),
  ].join('\n');
  const files = { 'events.jsonl': eventLines, 'summary.csv': summary };
  const fileDigests = Object.fromEntries(
    Object.entries(files).map(([name, content]) => [name, sha256(content)]),
  );
  const baseManifest = {
    packageVersion: EVIDENCE_PACKAGE_VERSION,
    evidenceExportId: exportRecord.evidenceExportId,
    organizationId: exportRecord.organizationId,
    workspaceId: exportRecord.workspaceId,
    requestedFilters: redactSecrets(exportRecord.filters || {}),
    exportedAt: new Date().toISOString(),
    eventCount: events.length,
    schemaVersions: { manifest: 1, evidenceEvent: 1 },
    controlMappings: [],
    checkpointReferences: checkpoints.map((item) => ({
      checkpointId: item.checkpointId,
      partitionId: item.partitionId,
      startSequence: item.startSequence,
      endSequence: item.endSequence,
      finalEventDigest: item.finalEventDigest,
    })),
    fileDigests,
    redactionReport: {
      policy: 'phase-13c4-v1',
      secretsExcluded: true,
      privatePayloadsExcluded: true,
    },
    knownGaps: exportRecord.knownGaps || [],
    generatorVersion: 'ghost-bridge-13c4.1',
    verificationInstructions:
      'Run npm run verify:compliance-governance or the protected evidence verification API.',
  };
  const packageDigest = canonicalDigest(baseManifest);
  const manifest = { ...baseManifest, packageDigest };
  await Promise.all([
    ...Object.entries(files).map(([name, content]) =>
      evidencePackageStorage.writeExclusive(exportRecord.evidenceExportId, name, content),
    ),
    evidencePackageStorage.writeExclusive(
      exportRecord.evidenceExportId,
      'manifest.json',
      `${JSON.stringify(manifest, null, 2)}\n`,
    ),
  ]);
  return { directory, storageKey: exportRecord.evidenceExportId, manifest, packageDigest };
}

async function createEvidenceExport(input = {}, caller = {}) {
  const scope = await authorizeEvidence('evidence.export', input, caller, 'EvidenceExport');
  await enforceEvidenceApproval(
    scope,
    'evidence.export',
    'EvidenceExport',
    `evidence-export:${scope.workspaceId || 'organization'}`,
    'EVIDENCE_EXPORT',
    input,
    caller,
  );
  await assertOperationalAccess({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    operation: 'MUTATION',
  });
  const record = await EvidenceExport.create({
    evidenceExportId: `exp_${crypto.randomUUID()}`,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    requestedBy: scope.actorId,
    filters: redactSecrets({
      eventType: input.eventType,
      retentionClass: input.retentionClass,
      from: input.from,
      to: input.to,
      approvalRequestId: input.approvalRequestId,
      invocationId: input.invocationId,
    }),
    status: 'PENDING',
    approvalRequestId: clean(input.approvalRequestId) || undefined,
    requestedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    revision: 0,
  });
  metrics.increment('evidence_exports_created');
  await recordComplianceAudit(
    'evidence.export.created',
    'EvidenceExport',
    record.evidenceExportId,
    scope,
    {
      evidenceExportId: record.evidenceExportId,
      status: record.status,
    },
  );
  if (input.defer !== true)
    setImmediate(() => processEvidenceExport(record.evidenceExportId).catch(() => undefined));
  return serializeExport(record);
}

function serializeExport(recordInput) {
  const record = typeof recordInput?.toObject === 'function' ? recordInput.toObject() : recordInput;
  return {
    evidenceExportId: record.evidenceExportId,
    organizationId: record.organizationId,
    workspaceId: record.workspaceId,
    requestedBy: record.requestedBy,
    filters: redactSecrets(record.filters || {}),
    status: record.status,
    eventCount: record.eventCount,
    packageDigest: record.packageDigest,
    failureReasonCode: record.failureReasonCode,
    knownGaps: record.knownGaps || [],
    approvalRequestId: record.approvalRequestId,
    requestedAt: record.requestedAt,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    cancelledAt: record.cancelledAt,
    expiresAt: record.expiresAt,
  };
}

async function processEvidenceExport(evidenceExportId) {
  let record = await EvidenceExport.findOneAndUpdate(
    { evidenceExportId, status: 'PENDING' },
    { $set: { status: 'RUNNING', startedAt: new Date() }, $inc: { revision: 1 } },
    { new: true },
  );
  if (!record) return null;
  try {
    const scope = { organizationId: record.organizationId, workspaceId: record.workspaceId };
    const filter = evidenceFilter(record.filters || {}, scope);
    const events = await EvidenceEvent.find(filter)
      .sort({ occurredAt: 1, 'integrity.sequence': 1 })
      .limit(MAX_EVIDENCE_EXPORT_EVENTS)
      .lean();
    const partitions = [...new Set(events.map((event) => event.integrity.partitionId))];
    const checkpoints = await AuditCheckpoint.find({
      organizationId: record.organizationId,
      partitionId: { $in: partitions },
    }).lean();
    record = await EvidenceExport.findOneAndUpdate(
      { _id: record._id, status: 'RUNNING' },
      { $set: { status: 'FINALIZING' }, $inc: { revision: 1 } },
      { new: true },
    );
    if (!record) return null;
    const result = await writePackage(record, events, checkpoints);
    record = await EvidenceExport.findOneAndUpdate(
      { _id: record._id, status: 'FINALIZING' },
      {
        $set: {
          status: 'COMPLETED',
          completedAt: new Date(),
          eventCount: events.length,
          storageKey: result.storageKey,
          packageDigest: result.packageDigest,
        },
        $inc: { revision: 1 },
      },
      { new: true },
    );
    metrics.increment('evidence_exports_completed');
    return serializeExport(record);
  } catch (error) {
    await EvidenceExport.updateOne(
      { _id: record._id, status: { $in: ['RUNNING', 'FINALIZING'] } },
      {
        $set: { status: 'FAILED', failureReasonCode: 'EVIDENCE_EXPORT_FAILED' },
        $inc: { revision: 1 },
      },
    );
    metrics.increment('evidence_exports_failed', {
      reason: error.code || 'EVIDENCE_EXPORT_FAILED',
    });
    await raiseComplianceAlert(
      { organizationId: record.organizationId, workspaceId: record.workspaceId },
      'evidence_export_failure',
      'EVIDENCE_EXPORT_FAILED',
    );
    throw error;
  }
}

async function resumePendingEvidenceExports() {
  await EvidenceExport.updateMany(
    { status: 'RUNNING' },
    {
      $set: { status: 'PENDING', failureReasonCode: 'EXPORT_RESTART_RECOVERED' },
      $inc: { revision: 1 },
    },
  );
  await EvidenceExport.updateMany(
    { status: 'FINALIZING' },
    {
      $set: { status: 'RECOVERY_REQUIRED', failureReasonCode: 'EXPORT_FINALIZATION_UNCERTAIN' },
      $inc: { revision: 1 },
    },
  );
  const pending = await EvidenceExport.find({ status: 'PENDING' })
    .sort({ requestedAt: 1 })
    .limit(10)
    .select('evidenceExportId')
    .lean();
  for (const record of pending) await processEvidenceExport(record.evidenceExportId);
  return { resumed: pending.length };
}

async function getEvidenceExport(evidenceExportId, input = {}, caller = {}) {
  const scope = await authorizeEvidence(
    'evidence.read',
    input,
    caller,
    'EvidenceExport',
    evidenceExportId,
  );
  const record = await EvidenceExport.findOne({
    evidenceExportId,
    organizationId: scope.organizationId,
  }).lean();
  if (!record) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Evidence export was not found.');
  return serializeExport(record);
}

async function listEvidenceExports(input = {}, caller = {}) {
  const scope = await authorizeEvidence('evidence.read', input, caller, 'EvidenceExport');
  const filter = { organizationId: scope.organizationId };
  if (scope.workspaceId) filter.workspaceId = scope.workspaceId;
  const items = await EvidenceExport.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return { items: items.map(serializeExport) };
}

async function cancelEvidenceExport(evidenceExportId, input = {}, caller = {}) {
  const scope = await authorizeEvidence(
    'evidence.export',
    input,
    caller,
    'EvidenceExport',
    evidenceExportId,
  );
  const record = await EvidenceExport.findOneAndUpdate(
    {
      evidenceExportId,
      organizationId: scope.organizationId,
      status: { $in: ['PENDING', 'RUNNING'] },
    },
    { $set: { status: 'CANCELLED', cancelledAt: new Date() }, $inc: { revision: 1 } },
    { new: true },
  );
  if (!record)
    throw new AppError(
      409,
      ErrorCodes.CONFLICT,
      'Evidence export cannot be cancelled after finalization starts.',
    );
  return serializeExport(record);
}

async function packageDirectory(evidenceExportId, organizationId) {
  const query = EvidenceExport.findOne({
    evidenceExportId,
    organizationId,
    status: 'COMPLETED',
    expiresAt: { $gt: new Date() },
  }).select('+storageKey');
  const record = typeof query.lean === 'function' ? await query.lean() : await query;
  if (!record?.storageKey)
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Completed evidence package was not found.');
  return evidencePackageStorage.resolve(record.storageKey);
}

async function verifyEvidencePackageAt(directory) {
  let manifest;
  let eventText;
  try {
    [manifest, eventText] = await Promise.all([
      fs.readFile(path.join(directory, 'manifest.json'), 'utf8').then(JSON.parse),
      fs.readFile(path.join(directory, 'events.jsonl'), 'utf8'),
    ]);
  } catch {
    return { status: 'INVALID', valid: false, errors: [{ code: 'EVIDENCE_FILE_MISSING' }] };
  }
  if (manifest.packageVersion !== EVIDENCE_PACKAGE_VERSION)
    return {
      status: 'UNSUPPORTED_VERSION',
      valid: false,
      errors: [{ code: 'UNSUPPORTED_PACKAGE_VERSION' }],
    };
  const errors = [];
  if (sha256(eventText) !== manifest.fileDigests?.['events.jsonl'])
    errors.push({ code: 'EVENT_FILE_DIGEST_MISMATCH' });
  let events = [];
  try {
    events = eventText.trim() ? eventText.trim().split('\n').map(JSON.parse) : [];
  } catch {
    errors.push({ code: 'MALFORMED_EVIDENCE_EVENT' });
  }
  if (events.length !== manifest.eventCount) errors.push({ code: 'EVENT_COUNT_MISMATCH' });
  const expectedPackageDigest = canonicalDigest(
    Object.fromEntries(Object.entries(manifest).filter(([key]) => key !== 'packageDigest')),
  );
  if (expectedPackageDigest !== manifest.packageDigest)
    errors.push({ code: 'PACKAGE_DIGEST_MISMATCH' });
  const validEvents = events.filter((event) => {
    const valid =
      event?.eventId &&
      !Number.isNaN(new Date(event.occurredAt).getTime()) &&
      !Number.isNaN(new Date(event.recordedAt).getTime()) &&
      event.integrity?.partitionId &&
      Number.isInteger(event.integrity?.sequence) &&
      event.integrity?.eventDigest;
    if (!valid) errors.push({ code: 'MALFORMED_EVIDENCE_EVENT', eventId: event?.eventId });
    if (event?.organizationId && event.organizationId !== manifest.organizationId) {
      errors.push({ code: 'EVIDENCE_TENANT_MISMATCH', eventId: event.eventId });
    }
    return Boolean(valid);
  });
  const byPartition = Map.groupBy
    ? Map.groupBy(validEvents, (event) => event.integrity?.partitionId)
    : validEvents.reduce(
        (map, event) =>
          map.set(event.integrity?.partitionId, [
            ...(map.get(event.integrity?.partitionId) || []),
            event,
          ]),
        new Map(),
      );
  for (const partitionEvents of byPartition.values()) {
    const result = verifyEventSequence(
      partitionEvents.sort((left, right) => left.integrity.sequence - right.integrity.sequence),
    );
    errors.push(...result.errors);
  }
  for (const checkpoint of manifest.checkpointReferences || []) {
    const endEvent = validEvents.find(
      (event) =>
        event.integrity.partitionId === checkpoint.partitionId &&
        event.integrity.sequence === checkpoint.endSequence,
    );
    if (endEvent && endEvent.integrity.eventDigest !== checkpoint.finalEventDigest) {
      errors.push({ code: 'CHECKPOINT_DIGEST_MISMATCH', checkpointId: checkpoint.checkpointId });
    }
  }
  const status = errors.length
    ? 'INVALID'
    : manifest.knownGaps?.length
      ? 'PARTIALLY_VERIFIABLE'
      : 'VALID';
  metrics.increment(
    status === 'VALID' ? 'evidence_verification_success' : 'evidence_verification_failure',
    { outcome: status },
  );
  return {
    status,
    valid: status === 'VALID',
    eventCount: events.length,
    packageDigest: manifest.packageDigest,
    errors,
    knownGaps: manifest.knownGaps || [],
  };
}

async function verifyEvidenceExport(evidenceExportId, input = {}, caller = {}) {
  const scope = await authorizeEvidence(
    'evidence.verify',
    input,
    caller,
    'EvidenceExport',
    evidenceExportId,
  );
  return verifyEvidencePackageAt(await packageDirectory(evidenceExportId, scope.organizationId));
}

async function readEvidencePackageFile(evidenceExportId, fileName, input = {}, caller = {}) {
  const scope = await authorizeEvidence(
    'evidence.download',
    input,
    caller,
    'EvidenceExport',
    evidenceExportId,
  );
  const allowed = new Set(['manifest.json', 'events.jsonl', 'summary.csv']);
  if (!allowed.has(fileName))
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Evidence file is not available.');
  return fs.readFile(
    path.join(await packageDirectory(evidenceExportId, scope.organizationId), fileName),
  );
}

function normalizeHoldScope(input = {}) {
  const allowed = [
    'eventCategories',
    'actorIds',
    'resourceIds',
    'invocationIds',
    'approvalRequestIds',
    'policyIds',
    'connectionIds',
    'passportIds',
  ];
  const scope = {};
  if (input.from) scope.from = new Date(input.from);
  if (input.to) scope.to = new Date(input.to);
  for (const key of allowed) {
    if (!Array.isArray(input[key])) continue;
    if (input[key].length > MAX_LEGAL_HOLD_SELECTOR_VALUES)
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Legal-hold selector is too broad.');
    scope[key] = [...new Set(input[key].map((item) => clean(item)).filter(Boolean))];
  }
  if (!Object.keys(scope).length)
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Legal hold requires a bounded date range or selector.',
    );
  if (scope.from && scope.to && scope.from > scope.to)
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Legal-hold date range is invalid.');
  return scope;
}

async function createLegalHold(input = {}, caller = {}) {
  const scope = await authorizeEvidence('legal-hold.create', input, caller, 'LegalHold');
  const hold = await LegalHold.create({
    legalHoldId: `lhold_${crypto.randomUUID()}`,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    name: clean(input.name, 200),
    description: redactString(clean(input.description, 2_000)),
    scope: normalizeHoldScope(input.scope || input),
    status: input.activate === false ? 'DRAFT' : 'ACTIVE',
    effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
    effectiveUntil: input.effectiveUntil ? new Date(input.effectiveUntil) : undefined,
    createdBy: scope.actorId,
    revision: 0,
  });
  metrics.increment('legal_holds_active', {}, hold.status === 'ACTIVE' ? 1 : 0);
  await recordComplianceAudit('legal_hold.created', 'LegalHold', hold.legalHoldId, scope, {
    legalHoldId: hold.legalHoldId,
    status: hold.status,
  });
  return hold;
}

async function listLegalHolds(input = {}, caller = {}) {
  const scope = await authorizeEvidence('legal-hold.read', input, caller, 'LegalHold');
  const filter = { organizationId: scope.organizationId };
  if (scope.workspaceId) filter.workspaceId = scope.workspaceId;
  const items = await LegalHold.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return { items };
}

async function releaseLegalHold(legalHoldId, input = {}, caller = {}) {
  const scope = await authorizeEvidence(
    'legal-hold.release',
    input,
    caller,
    'LegalHold',
    legalHoldId,
  );
  if (input.confirm !== true) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Explicit legal-hold release confirmation is required.',
    );
  }
  const hold = await LegalHold.findOneAndUpdate(
    {
      legalHoldId,
      organizationId: scope.organizationId,
      status: 'ACTIVE',
      revision: Number(input.expectedRevision),
    },
    {
      $set: { status: 'RELEASED', releasedBy: scope.actorId, releasedAt: new Date() },
      $inc: { revision: 1 },
    },
    { new: true },
  );
  if (!hold) throw new AppError(409, ErrorCodes.CONFLICT, 'Legal hold changed before release.');
  await recordComplianceAudit('legal_hold.released', 'LegalHold', legalHoldId, scope, {
    legalHoldId,
    status: 'RELEASED',
  });
  return hold;
}

function holdMatchesEvent(hold, event) {
  const scope = hold.scope || {};
  if (hold.workspaceId && String(hold.workspaceId) !== String(event.workspaceId || ''))
    return false;
  if (scope.from && new Date(event.occurredAt) < new Date(scope.from)) return false;
  if (scope.to && new Date(event.occurredAt) > new Date(scope.to)) return false;
  const pairs = [
    ['eventCategories', event.retentionClass],
    ['actorIds', event.actorId],
    ['resourceIds', event.resourceId],
    ['invocationIds', event.invocationId],
    ['approvalRequestIds', event.approvalRequestId],
    ['connectionIds', event.safeMetadata?.connectionId],
    ['passportIds', event.safeMetadata?.passportId],
  ];
  if (
    !pairs.every(
      ([key, value]) => !scope[key]?.length || scope[key].map(String).includes(String(value || '')),
    )
  )
    return false;
  if (scope.policyIds?.length) {
    const eventPolicyIds = (event.policyReferences || [])
      .flatMap((reference) => [reference?.stablePolicyId, reference?.policyId])
      .filter(Boolean)
      .map(String);
    if (!scope.policyIds.map(String).some((policyId) => eventPolicyIds.includes(policyId)))
      return false;
  }
  return true;
}

function exportReferencesEvent(exportRecord, event) {
  if (
    exportRecord.workspaceId &&
    String(exportRecord.workspaceId) !== String(event.workspaceId || '')
  )
    return false;
  const filters = exportRecord.filters || {};
  if (filters.eventType && String(filters.eventType) !== String(event.eventType)) return false;
  if (filters.retentionClass && String(filters.retentionClass) !== String(event.retentionClass))
    return false;
  if (
    filters.approvalRequestId &&
    String(filters.approvalRequestId) !== String(event.approvalRequestId || '')
  )
    return false;
  if (filters.invocationId && String(filters.invocationId) !== String(event.invocationId || ''))
    return false;
  if (filters.from && new Date(event.occurredAt) < new Date(filters.from)) return false;
  if (filters.to && new Date(event.occurredAt) > new Date(filters.to)) return false;
  return true;
}

async function createRetentionPolicy(input = {}, caller = {}) {
  const scope = await authorizeEvidence('audit.retention.manage', input, caller, 'RetentionPolicy');
  const latest = await RetentionPolicy.findOne({
    organizationId: scope.organizationId,
    retentionPolicyId: input.retentionPolicyId,
  })
    .sort({ version: -1 })
    .lean();
  const policy = await RetentionPolicy.create({
    retentionPolicyId: clean(input.retentionPolicyId) || `ret_${crypto.randomUUID()}`,
    version: Number(latest?.version || 0) + 1,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    eventCategory: clean(input.eventCategory).toUpperCase(),
    retentionDays: Number(input.retentionDays),
    archiveBehavior: input.archiveBehavior || 'KEEP',
    deletionEligible: input.deletionEligible === true,
    legalHoldBehavior: 'PRESERVE',
    status: input.activate === true ? 'ACTIVE' : 'DRAFT',
    createdBy: scope.actorId,
    activatedAt: input.activate === true ? new Date() : undefined,
    revision: 0,
  });
  await recordComplianceAudit(
    'retention.policy.created',
    'RetentionPolicy',
    policy.retentionPolicyId,
    scope,
    {
      retentionClass: policy.eventCategory,
      status: policy.status,
    },
  );
  return policy;
}

async function listRetentionPolicies(input = {}, caller = {}) {
  const scope = await authorizeEvidence('audit.retention.read', input, caller, 'RetentionPolicy');
  const filter = { organizationId: scope.organizationId };
  if (scope.workspaceId) filter.workspaceId = scope.workspaceId;
  const items = await RetentionPolicy.find(filter).sort({ createdAt: -1 }).lean();
  return { items };
}

async function retentionPreview(input = {}, caller = {}) {
  const scope = await authorizeEvidence(
    'audit.retention.read',
    input,
    caller,
    'RetentionPolicy',
    input.retentionPolicyId,
  );
  const policy = await RetentionPolicy.findOne({
    organizationId: scope.organizationId,
    retentionPolicyId: input.retentionPolicyId,
    version: Number(input.version),
    status: 'ACTIVE',
  }).lean();
  if (!policy)
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Active retention policy was not found.');
  if (!policy.deletionEligible)
    throw new AppError(
      409,
      ErrorCodes.CONFLICT,
      'This retention policy does not permit evidence deletion.',
    );
  const cutoff = new Date(Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000);
  const events = await EvidenceEvent.find({
    organizationId: scope.organizationId,
    ...(policy.workspaceId ? { workspaceId: policy.workspaceId } : {}),
    retentionClass: policy.eventCategory,
    occurredAt: { $lt: cutoff },
  })
    .sort({ occurredAt: 1 })
    .limit(1_000)
    .lean();
  const holds = await LegalHold.find({
    organizationId: scope.organizationId,
    status: 'ACTIVE',
    effectiveFrom: { $lte: new Date() },
    $or: [
      { effectiveUntil: { $exists: false } },
      { effectiveUntil: null },
      { effectiveUntil: { $gt: new Date() } },
    ],
  }).lean();
  const activeExports = await EvidenceExport.find({
    organizationId: scope.organizationId,
    status: 'COMPLETED',
    expiresAt: { $gt: new Date() },
  })
    .select('workspaceId filters')
    .lean();
  const protectedEventIds = new Set(
    events
      .filter((event) => holds.some((hold) => holdMatchesEvent(hold, event)))
      .map((event) => event.eventId),
  );
  const exportReferencedEventIds = new Set(
    events
      .filter((event) =>
        activeExports.some((exportRecord) => exportReferencesEvent(exportRecord, event)),
      )
      .map((event) => event.eventId),
  );
  const eligibleCount = events.filter(
    (event) =>
      !protectedEventIds.has(event.eventId) && !exportReferencedEventIds.has(event.eventId),
  ).length;
  metrics.increment('retention_previews');
  return {
    dryRun: true,
    deleted: 0,
    cutoff,
    eligibleCount,
    protectedByLegalHoldCount: protectedEventIds.size,
    protectedByExportReferenceCount: exportReferencedEventIds.size,
    items: events.slice(0, 100).map((event) => ({
      eventId: event.eventId,
      occurredAt: event.occurredAt,
      retentionClass: event.retentionClass,
      legalHoldProtected: protectedEventIds.has(event.eventId),
      exportReferenced: exportReferencedEventIds.has(event.eventId),
    })),
  };
}

async function executeRetentionDeletion(input = {}, caller = {}) {
  const scope = await authorizeEvidence(
    'audit.retention.manage',
    input,
    caller,
    'RetentionPolicy',
    input.retentionPolicyId,
  );
  if (input.confirm !== true)
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Explicit deletion confirmation is required.',
    );
  const preview = await retentionPreview(input, {
    ...caller,
    actor: scope.actor,
    partnerId: scope.partnerId,
  });
  if (preview.protectedByLegalHoldCount > 0 && preview.eligibleCount === 0)
    throw new AppError(
      409,
      ErrorCodes.LEGAL_HOLD_ACTIVE,
      'Retention deletion is blocked by a legal hold.',
    );
  const ids = preview.items
    .filter((item) => !item.legalHoldProtected && !item.exportReferenced)
    .map((item) => item.eventId);
  let result;
  try {
    result = await EvidenceEvent.deleteMany({
      organizationId: scope.organizationId,
      eventId: { $in: ids },
    });
  } catch (error) {
    metrics.increment('retention_deletion_failures', {
      reason: error.code || 'RETENTION_DELETION_FAILED',
    });
    await raiseComplianceAlert(scope, 'retention_deletion_failure', 'RETENTION_DELETION_FAILED');
    throw error;
  }
  metrics.increment('retention_deletions', {}, result.deletedCount);
  await recordComplianceAudit(
    'retention.evidence.deleted',
    'RetentionPolicy',
    input.retentionPolicyId,
    scope,
    {
      eventCount: result.deletedCount,
      reasonCode: 'RETENTION_POLICY_APPLIED',
    },
  );
  return {
    dryRun: false,
    deleted: result.deletedCount,
    preserved: preview.protectedByLegalHoldCount + preview.protectedByExportReferenceCount,
  };
}

async function controlCatalog(input = {}, caller = {}) {
  await authorizeEvidence('control.read', input, caller, 'ControlCatalog');
  return { certificationClaimed: false, mappingStatus: 'INFORMATIONAL', items: CONTROL_CATALOG };
}

async function complianceReport(input = {}, caller = {}) {
  const scope = await authorizeEvidence(
    'compliance.report.read',
    input,
    caller,
    'ComplianceReport',
  );
  const base = {
    organizationId: scope.organizationId,
    ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
  };
  const [approvalStatuses, integrity, exports, holds, authorizationDenials] = await Promise.all([
    ApprovalRequest.aggregate([
      { $match: base },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    EvidenceEvent.countDocuments({ ...base, eventType: 'audit.integrity.verified' }),
    EvidenceExport.aggregate([
      { $match: base },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    LegalHold.countDocuments({ ...base, status: 'ACTIVE' }),
    EvidenceEvent.countDocuments({
      ...base,
      eventType: 'authorization.decision',
      decision: 'DENY',
    }),
  ]);
  metrics.increment('control_report_generation');
  return {
    generatedAt: new Date(),
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    certificationClaimed: false,
    approvalActivity: Object.fromEntries(approvalStatuses.map((item) => [item._id, item.count])),
    authorizationDenials,
    integrityVerificationEvents: integrity,
    evidenceExports: Object.fromEntries(exports.map((item) => [item._id, item.count])),
    activeLegalHolds: holds,
    controlImplementation: Object.fromEntries(
      CONTROL_CATALOG.map((control) => [control.controlId, control.implementationStatus]),
    ),
  };
}

async function backfillEvidence(options = {}) {
  const filter = {};
  if (options.organizationId) filter.organizationId = String(options.organizationId);
  if (options.afterId) {
    const checkpoint = await AuditLog.findById(options.afterId).select('createdAt').lean();
    if (checkpoint) {
      filter.$or = [
        { createdAt: { $gt: checkpoint.createdAt } },
        { createdAt: checkpoint.createdAt, _id: { $gt: checkpoint._id } },
      ];
    }
  }
  const logs = await AuditLog.find(filter)
    .sort({ createdAt: 1, _id: 1 })
    .limit(Number(options.limit || 500))
    .lean();
  const result = { processed: 0, created: 0, quarantined: 0, lastId: null, gaps: [] };
  for (const log of logs) {
    const normalized = normalizeAuditLog(log);
    result.processed += 1;
    result.lastId = idOf(log);
    if (!normalized.organizationId) {
      result.quarantined += 1;
      result.gaps.push({ sourceAuditLogId: idOf(log), reasonCode: 'AMBIGUOUS_TENANT_OWNERSHIP' });
      continue;
    }
    const persisted = await persistNormalizedEvent(normalized);
    if (persisted.created) result.created += 1;
  }
  return result;
}

module.exports = {
  CONTROL_CATALOG,
  LocalEvidencePackageStorage,
  STORAGE_ROOT,
  evidencePackageStorage,
  backfillEvidence,
  cancelEvidenceExport,
  canonicalEvidenceContent,
  complianceReport,
  controlCatalog,
  createEvidenceExport,
  createLegalHold,
  createRetentionPolicy,
  eventDigest,
  executeRetentionDeletion,
  generateCheckpoint,
  getEvidenceExport,
  holdMatchesEvent,
  exportReferencesEvent,
  listCheckpoints,
  listEvidenceExports,
  listLegalHolds,
  listRetentionPolicies,
  normalizeAndPersistAuditLog,
  normalizeAuditLog,
  partitionFor,
  persistNormalizedEvent,
  processEvidenceExport,
  queryEvidence,
  readEvidencePackageFile,
  releaseLegalHold,
  resumePendingEvidenceExports,
  retentionPreview,
  safeMetadata,
  serializeEvidence,
  verifyEventSequence,
  verifyEvidenceExport,
  verifyEvidencePackageAt,
  verifyPartition,
  writePackage,
};
