const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const Workspace = require('../models/Workspace');
const EnterpriseUser = require('../models/EnterpriseUser');
const ServiceAccount = require('../models/ServiceAccount');
const Team = require('../models/Team');
const AgentPassport = require('../models/AgentPassport');
const Capability = require('../models/Capability');
const PassportInstallKey = require('../models/PassportInstallKey');
const PassportConnection = require('../models/PassportConnection');
const Credential = require('../models/Credential');
const Invocation = require('../models/Invocation');
const InvocationAttempt = require('../models/InvocationAttempt');
const RuntimeWorkItem = require('../models/RuntimeWorkItem');
const DurableEventOutbox = require('../models/DurableEventOutbox');
const RuntimeCapacitySlot = require('../models/RuntimeCapacitySlot');
const RuntimeWorkerHeartbeat = require('../models/RuntimeWorkerHeartbeat');
const CircuitBreaker = require('../models/CircuitBreaker');
const Role = require('../models/Role');
const Policy = require('../models/Policy');
const PolicyRevision = require('../models/PolicyRevision');
const ApprovalRequest = require('../models/ApprovalRequest');
const ApprovalDecision = require('../models/ApprovalDecision');
const GovernedSecret = require('../models/GovernedSecret');
const SecretVersion = require('../models/SecretVersion');
const CredentialBinding = require('../models/CredentialBinding');
const CredentialLease = require('../models/CredentialLease');
const CredentialRotationAttempt = require('../models/CredentialRotationAttempt');
const EncryptionRewrapJob = require('../models/EncryptionRewrapJob');
const LegalHold = require('../models/LegalHold');
const RetentionPolicy = require('../models/RetentionPolicy');
const EvidenceExport = require('../models/EvidenceExport');
const OperationalAlert = require('../models/OperationalAlert');
const ComplianceNotification = require('../models/ComplianceNotification');
const LifecycleTransition = require('../models/LifecycleTransition');
const MaintenanceWindow = require('../models/MaintenanceWindow');
const AccessReviewCampaign = require('../models/AccessReviewCampaign');
const AccessReviewItem = require('../models/AccessReviewItem');
const OperationalConfiguration = require('../models/OperationalConfiguration');
const OperationalIncident = require('../models/OperationalIncident');
const SecurityEvent = require('../models/SecurityEvent');
const TenantDataExport = require('../models/TenantDataExport');
const TenantDeletionJob = require('../models/TenantDeletionJob');
const TenantDeletionTombstone = require('../models/TenantDeletionTombstone');
const OperationalRecovery = require('../models/OperationalRecovery');
const DisasterRecoveryStatus = require('../models/DisasterRecoveryStatus');
const { createAuditLog } = require('./auditService');
const { actorFromPartner, assertAuthorized } = require('./authorization.service');
const { enforceApproval, consumeApprovalGrants } = require('./approval.service');
const {
  assertOperationalAccess,
  pauseQueuedWork,
  resumeBlockedWork,
} = require('./operationalState.service');
const metrics = require('./enterpriseOperationsMetrics.service');
const { canonicalDigest, canonicalize, sha256 } = require('../utils/complianceCanonical');
const { redactSecrets } = require('../utils/redact');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  ACCESS_REVIEW_DECISIONS,
  CONFIGURATION_CATEGORIES,
  DR_PROVIDER_STATUSES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  MAINTENANCE_MODES,
  MAINTENANCE_SCOPES,
} = require('../constants/enterpriseOperations');

const EXPORT_ROOT = path.resolve(__dirname, '../../.enterprise-exports');
const MAX_EXPORT_RECORDS_PER_CATEGORY = 500;
const MAX_CONFIGURATION_BYTES = 64 * 1024;
const ACTIVE_WORK_STATUSES = [
  'pending',
  'claimed',
  'running',
  'retry_preparing',
  'retry_scheduled',
  'cancellation_requested',
  'blocked',
  'waiting_for_approval',
];
const ACTIVE_INCIDENT_STATUSES = [
  'OPEN',
  'ACKNOWLEDGED',
  'INVESTIGATING',
  'MITIGATING',
  'MONITORING',
];
const SECRET_KEY_PATTERN =
  /(secret|password|token|api.?key|authorization|credential|ciphertext|private.?key|bearer)/i;
const CORE_SECURITY_KEY_PATTERN =
  /(tenant.?isolation|authorization|default.?deny|redaction|audit(ing)?|approval.?bypass|policy.?bypass)/i;

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function clean(value, maximum = 1_000) {
  return String(value || '')
    .trim()
    .slice(0, maximum);
}

function safeReason(value) {
  return clean(value, 1_000) || 'Administrative operation requested.';
}

function scopeFromCaller(input = {}, caller = {}) {
  const partnerId = idOf(caller.partner?._id || caller.partnerId);
  if (!partnerId)
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      'Authenticated Partner access is required.',
    );
  const requestedOrganizationId = idOf(input.organizationId || partnerId);
  if (requestedOrganizationId !== partnerId) {
    throw new AppError(403, ErrorCodes.AUTHORIZATION_DENIED, 'Authorization denied.');
  }
  return {
    partnerId,
    organizationId: partnerId,
    workspaceId: clean(input.workspaceId || input.receivingWorkspaceId, 128) || undefined,
    actorId: `partner:${partnerId}`,
    actorType: 'service_account',
    requestId: caller.requestId,
    traceId: caller.traceId,
    partner: caller.partner,
    platformAuthorized: caller.platformAuthorized === true,
  };
}

async function authorizeOperation(permission, input, caller, resourceType, resourceId, operation) {
  const scope = scopeFromCaller(input, caller);
  const decision = await assertAuthorized(
    actorFromPartner(caller.partner || { _id: scope.partnerId }, {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
    }),
    permission,
    {
      type: resourceType,
      id: idOf(resourceId || scope.workspaceId || scope.organizationId),
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
    },
    { requestId: caller.requestId, traceId: caller.traceId, workspaceId: scope.workspaceId },
  );
  await assertOperationalAccess({
    organizationId: scope.organizationId,
    partnerId: scope.partnerId,
    workspaceId: scope.workspaceId,
    operation,
  });
  return { ...scope, authorizationDecision: decision };
}

async function enforceAdministrativeApproval(
  scope,
  input,
  permission,
  resourceType,
  resourceId,
  operationType,
) {
  const enforcement = await enforceApproval({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    requesterActorId: scope.actorId,
    requesterActorType: scope.actorType,
    permission,
    resourceType,
    resourceId: idOf(resourceId),
    operationType,
    environment: 'ADMINISTRATION',
    policySnapshotRevision: scope.authorizationDecision?.policySnapshotRevision,
    safeRequestAttributes: redactSecrets({
      reason: input.reason,
      targetState: input.targetState,
      mode: input.mode,
    }),
    approvalRequestId: input.approvalRequestId,
    approvalRequestIds: input.approvalRequestIds,
  });
  const consumed = await consumeApprovalGrants(enforcement, {
    actorId: scope.actorId,
    actorType: scope.actorType,
    requestId: scope.requestId,
    traceId: scope.traceId,
  });
  const normalizedType = String(operationType || '').toUpperCase();
  const operation = normalizedType.includes('MAINTENANCE')
    ? 'MAINTENANCE_CONTROL'
    : normalizedType.includes('DELETION')
      ? 'DELETION_CONTROL'
      : normalizedType.includes('SUSPEND') ||
          normalizedType.includes('REACTIVAT') ||
          normalizedType.includes('ARCHIV') ||
          normalizedType.includes('MEMBERSHIP') ||
          normalizedType.includes('SERVICE_ACCOUNT')
        ? 'LIFECYCLE_CONTROL'
        : normalizedType.includes('CONFIGURATION')
          ? 'PRIVILEGED_CONFIGURATION'
          : 'MUTATION';
  await assertOperationalAccess({
    organizationId: scope.organizationId,
    partnerId: scope.partnerId,
    workspaceId: scope.workspaceId,
    operation,
  });
  const approvalRequestIds = (consumed.approvals || [])
    .map((item) => clean(item.request?.approvalRequestId, 200))
    .filter(Boolean);
  const approverActorIds = approvalRequestIds.length
    ? await ApprovalDecision.distinct('approverActorId', {
        organizationId: scope.organizationId,
        approvalRequestId: { $in: approvalRequestIds },
        decision: 'APPROVE',
      })
    : [];
  return { ...consumed, approvalRequestIds, approverActorIds };
}

async function auditAdministrative(
  action,
  permission,
  resourceType,
  resourceId,
  scope,
  metadata = {},
) {
  return createAuditLog(
    scope.actorType,
    scope.actorId,
    action,
    resourceType,
    idOf(resourceId),
    {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      permission,
      policyDecision: scope.authorizationDecision?.policyDecision,
      approvalRequestId: metadata.approvalRequestId,
      oldState: metadata.oldState,
      newState: metadata.newState,
      reasonCode: metadata.reasonCode,
      operationId: metadata.operationId,
      ...redactSecrets(metadata),
    },
    { requestId: scope.requestId, traceId: scope.traceId },
  );
}

async function notifyAdministrative(scope, input = {}) {
  const deduplicationKey =
    clean(input.deduplicationKey, 200) ||
    canonicalDigest({
      type: input.type,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      status: input.status,
    });
  try {
    return await ComplianceNotification.findOneAndUpdate(
      { organizationId: scope.organizationId, deduplicationKey },
      {
        $setOnInsert: {
          notificationId: `ntf_${crypto.randomUUID()}`,
          organizationId: scope.organizationId,
          workspaceId: scope.workspaceId,
          recipientActorId: input.recipientActorId,
          type: input.type,
          resourceType: input.resourceType,
          resourceId: idOf(input.resourceId),
          deduplicationKey,
          title: clean(input.title, 200),
          safeSummary: clean(input.safeSummary, 500),
          deliveryStatus: 'PENDING',
          schemaVersion: 1,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch {
    metrics.increment('administrative_notification_failures', { result: 'failure' });
    return null;
  }
}

async function raiseOperationalAlert(scope, type, severity, reasonCode) {
  const now = new Date();
  const workspaceId = scope.workspaceId || 'organization';
  const dedupeKey = canonicalDigest({ organizationId: scope.organizationId, workspaceId, type });
  try {
    return await OperationalAlert.findOneAndUpdate(
      { dedupeKey },
      {
        $set: { lastSeenAt: now, status: 'active', safeValues: { reasonCode } },
        $setOnInsert: {
          partnerId: mongoose.isValidObjectId(scope.partnerId) ? scope.partnerId : undefined,
          receivingWorkspaceId: workspaceId,
          type,
          dedupeKey,
          severity,
          title: clean(type.replaceAll('_', ' '), 200),
          summary: clean(`Enterprise operation requires attention: ${reasonCode}`, 500),
          metricName: type,
          observedValue: 1,
          thresholdValue: 1,
          occurrenceCount: 0,
          firstSeenAt: now,
        },
        $inc: { occurrenceCount: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch {
    return null;
  }
}

async function ensureOrganization(scope) {
  let organization = await Organization.findOne({ partnerId: scope.partnerId });
  if (organization) return organization;
  try {
    return await Organization.create({
      partnerId: scope.partnerId,
      name: scope.partner?.name || 'Partner Organization',
      slug: scope.partner?.slug || `partner-${scope.partnerId}`,
      status: 'active',
      lifecycleRevision: 0,
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return Organization.findOne({ partnerId: scope.partnerId });
  }
}

function lifecycleOperationId(scope, resourceType, resourceId, targetState, input) {
  return (
    clean(input.operationId, 200) ||
    canonicalDigest({
      organizationId: scope.organizationId,
      resourceType,
      resourceId: idOf(resourceId),
      targetState,
      actorId: scope.actorId,
      reason: safeReason(input.reason),
    })
  );
}

async function recordLifecycleTransition(scope, input) {
  try {
    return await LifecycleTransition.create({
      transitionId: `trn_${crypto.randomUUID()}`,
      operationId: input.operationId,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      resourceType: input.resourceType,
      resourceId: idOf(input.resourceId),
      permission: input.permission,
      oldState: input.oldState,
      newState: input.newState,
      reasonCode: input.reasonCode,
      safeReason: safeReason(input.safeReason),
      requestedBy: scope.actorId,
      approvedBy: input.approvedBy,
      approvalRequestId: input.approvalRequestId,
      policyDecision: scope.authorizationDecision?.policyDecision,
      traceId: scope.traceId,
      requestId: scope.requestId,
      occurredAt: new Date(),
      schemaVersion: 1,
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return LifecycleTransition.findOne({
      organizationId: scope.organizationId,
      operationId: input.operationId,
    });
  }
}

const ORGANIZATION_TRANSITIONS = Object.freeze({
  active: new Set(['suspending', 'archiving']),
  suspending: new Set(['suspended', 'recovery_required']),
  suspended: new Set(['reactivating', 'archiving']),
  reactivating: new Set(['active', 'recovery_required']),
  archiving: new Set(['archived', 'recovery_required']),
  archived: new Set(['deletion_requested']),
  deletion_requested: new Set(['deletion_blocked', 'deletion_in_progress']),
  deletion_blocked: new Set(['deletion_requested']),
  deletion_in_progress: new Set(['deleted', 'recovery_required']),
  recovery_required: new Set(['suspended', 'archived', 'deletion_requested']),
});

const WORKSPACE_TRANSITIONS = Object.freeze({
  active: new Set(['read_only', 'suspending', 'archived']),
  read_only: new Set(['active', 'suspending', 'archived']),
  suspending: new Set(['suspended', 'recovery_required']),
  suspended: new Set(['active', 'archived']),
  archived: new Set(['deletion_requested']),
  deletion_requested: new Set(['deletion_blocked', 'deleted']),
  deletion_blocked: new Set(['deletion_requested']),
  recovery_required: new Set(['suspended', 'archived']),
});

function transitionPermission(resourceType, targetState) {
  const prefix = resourceType === 'Organization' ? 'organization' : 'workspace';
  if (targetState === 'suspending' || targetState === 'suspended' || targetState === 'read_only')
    return `${prefix}.suspend`;
  if (targetState === 'reactivating' || targetState === 'active') return `${prefix}.reactivate`;
  if (targetState === 'archiving' || targetState === 'archived') return `${prefix}.archive`;
  if (targetState.startsWith('deletion_') || targetState === 'deleted')
    return `${prefix}.delete.request`;
  return `${prefix}.suspend`;
}

async function validateReactivation(scope) {
  const now = new Date();
  const [
    activeDeletion,
    criticalIncidents,
    activeBindingSecretIds,
    readyWorkers,
    recoverableWork,
    policyRevision,
  ] = await Promise.all([
    TenantDeletionJob.countDocuments({
      organizationId: scope.organizationId,
      status: { $in: ['SCHEDULED', 'QUIESCING', 'DELETING', 'VERIFYING'] },
    }),
    OperationalIncident.countDocuments({
      organizationId: scope.organizationId,
      status: { $in: ACTIVE_INCIDENT_STATUSES },
      severity: 'CRITICAL',
    }),
    CredentialBinding.distinct('secretId', {
      organizationId: scope.organizationId,
      ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
      status: 'ACTIVE',
    }),
    RuntimeWorkerHeartbeat.countDocuments({
      status: 'ready',
      lastHeartbeatAt: { $gt: new Date(now.getTime() - 5 * 60 * 1_000) },
    }),
    RuntimeWorkItem.countDocuments({
      partnerId: scope.partnerId,
      ...(scope.workspaceId ? { receivingWorkspaceId: scope.workspaceId } : {}),
      status: { $in: ['pending', 'retry_scheduled', 'blocked', 'waiting_for_approval'] },
    }),
    PolicyRevision.findOne({ organizationId: scope.organizationId }).lean(),
  ]);
  const readySecrets = activeBindingSecretIds.length
    ? await GovernedSecret.countDocuments({
        organizationId: scope.organizationId,
        ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
        secretId: { $in: activeBindingSecretIds },
        status: 'ACTIVE',
        healthStatus: { $in: ['HEALTHY', 'DEGRADED'] },
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
      })
    : 0;
  const invalidBindings = Math.max(0, activeBindingSecretIds.length - readySecrets);
  const currentPolicyGeneration = Number(policyRevision?.generation || 0);
  const authorizedPolicyGeneration = Number(scope.authorizationDecision?.policySnapshotRevision);
  const policyGenerationValidated =
    Number.isInteger(authorizedPolicyGeneration) &&
    authorizedPolicyGeneration >= 0 &&
    authorizedPolicyGeneration === currentPolicyGeneration;
  const blockers = [];
  if (activeDeletion)
    blockers.push({ reasonCode: 'TENANT_DELETION_IN_PROGRESS', count: activeDeletion });
  if (criticalIncidents)
    blockers.push({
      reasonCode: 'UNRESOLVED_CRITICAL_SECURITY_INCIDENT',
      count: criticalIncidents,
    });
  if (invalidBindings)
    blockers.push({ reasonCode: 'CRITICAL_BINDING_NOT_READY', count: invalidBindings });
  if (!policyGenerationValidated)
    blockers.push({ reasonCode: 'POLICY_GENERATION_CHANGED', count: 1 });
  if (recoverableWork && !readyWorkers)
    blockers.push({ reasonCode: 'WORKER_READINESS_UNCONFIRMED', count: recoverableWork });
  return {
    ready: blockers.length === 0,
    blockers,
    legalHoldsPreserved: true,
    policyGenerationValidated,
    policyGeneration: currentPolicyGeneration,
  };
}

async function transitionOrganization(targetState, input = {}, caller = {}) {
  const permission = transitionPermission('Organization', targetState);
  const scope = await authorizeOperation(
    permission,
    input,
    caller,
    'Organization',
    scopeFromCaller(input, caller).organizationId,
    'LIFECYCLE_CONTROL',
  );
  const organization = await ensureOrganization(scope);
  const oldState = organization.status;
  if (oldState === targetState) return { organization, idempotentReplay: true };
  if (!ORGANIZATION_TRANSITIONS[oldState]?.has(targetState)) {
    throw new AppError(
      409,
      ErrorCodes.OPERATIONAL_STATE_INCONSISTENT,
      'Organization lifecycle transition is not allowed.',
      [],
      { oldState, targetState },
    );
  }
  if (targetState === 'active') {
    const validation = await validateReactivation(scope);
    if (!validation.ready)
      throw new AppError(
        409,
        ErrorCodes.ORGANIZATION_NOT_ACTIVE,
        'Organization reactivation readiness validation failed.',
        validation.blockers,
      );
  }
  const operationId = lifecycleOperationId(
    scope,
    'Organization',
    organization._id,
    targetState,
    input,
  );
  const replay = await LifecycleTransition.findOne({
    organizationId: scope.organizationId,
    operationId,
  }).lean();
  if (replay)
    return {
      organization: await Organization.findById(organization._id),
      transition: replay,
      idempotentReplay: true,
    };
  const approval = await enforceAdministrativeApproval(
    scope,
    input,
    permission,
    'Organization',
    organization._id,
    `ORGANIZATION_${targetState.toUpperCase()}`,
  );
  const expectedRevision = Number(input.expectedRevision ?? organization.lifecycleRevision);
  const now = new Date();
  const updated = await Organization.findOneAndUpdate(
    {
      _id: organization._id,
      partnerId: scope.partnerId,
      status: oldState,
      lifecycleRevision: expectedRevision,
    },
    {
      $set: {
        status: targetState,
        lifecycleReason: safeReason(input.reason),
        lifecycleOperationId: operationId,
        lifecycleRequestedBy: scope.actorId,
        lifecycleApprovedBy: approval.approverActorIds.join(',') || undefined,
        lifecycleChangedAt: now,
        ...(targetState === 'suspended' ? { suspendedAt: now } : {}),
        ...(targetState === 'active' ? { reactivatedAt: now } : {}),
        ...(targetState === 'archived' ? { archivedAt: now } : {}),
        ...(targetState === 'deleted' ? { deletedAt: now } : {}),
      },
      $inc: { lifecycleRevision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!updated)
    throw new AppError(
      409,
      ErrorCodes.OPERATIONAL_STATE_INCONSISTENT,
      'Organization lifecycle changed concurrently.',
    );
  if (['suspending', 'suspended'].includes(targetState)) {
    await pauseQueuedWork({
      organizationId: scope.organizationId,
      partnerId: scope.partnerId,
      reasonCode: 'ORGANIZATION_SUSPENDED',
    });
  }
  const transition = await recordLifecycleTransition(scope, {
    operationId,
    resourceType: 'Organization',
    resourceId: organization._id,
    permission,
    oldState,
    newState: targetState,
    reasonCode: `ORGANIZATION_${targetState.toUpperCase()}`,
    safeReason: input.reason,
    approvedBy: approval.approverActorIds.join(',') || undefined,
    approvalRequestId: approval.approvalRequestIds[0] || input.approvalRequestId,
  });
  await auditAdministrative(
    `organization.${targetState}`,
    permission,
    'Organization',
    organization._id,
    scope,
    {
      oldState,
      newState: targetState,
      reasonCode: transition.reasonCode,
      operationId,
      approvalRequestId: input.approvalRequestId,
    },
  );
  metrics.increment('organizations_lifecycle_transitions', { state: targetState });
  await notifyAdministrative(scope, {
    type: targetState === 'active' ? 'TENANT_REACTIVATED' : 'TENANT_SUSPENDED',
    resourceType: 'Organization',
    resourceId: organization._id,
    status: targetState,
    title:
      targetState === 'active' ? 'Organization reactivated' : 'Organization lifecycle restricted',
    safeSummary: `Organization state changed from ${oldState} to ${targetState}.`,
  });
  return { organization: updated, transition, blockedWorkResumesAutomatically: false };
}

async function transitionWorkspace(externalWorkspaceId, targetState, input = {}, caller = {}) {
  const permission = transitionPermission('Workspace', targetState);
  const scopedInput = { ...input, workspaceId: externalWorkspaceId };
  const scope = await authorizeOperation(
    permission,
    scopedInput,
    caller,
    'Workspace',
    externalWorkspaceId,
    'LIFECYCLE_CONTROL',
  );
  const organization = await ensureOrganization(scope);
  const workspace = await Workspace.findOne({ partnerId: scope.partnerId, externalWorkspaceId });
  if (!workspace) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Workspace was not found.');
  if (workspace.organizationId && idOf(workspace.organizationId) !== idOf(organization._id)) {
    throw new AppError(403, ErrorCodes.AUTHORIZATION_DENIED, 'Authorization denied.');
  }
  const oldState = workspace.status;
  if (oldState === targetState) return { workspace, idempotentReplay: true };
  if (!WORKSPACE_TRANSITIONS[oldState]?.has(targetState)) {
    throw new AppError(
      409,
      ErrorCodes.OPERATIONAL_STATE_INCONSISTENT,
      'Workspace lifecycle transition is not allowed.',
      [],
      { oldState, targetState },
    );
  }
  if (targetState === 'active') {
    const validation = await validateReactivation(scope);
    if (!validation.ready)
      throw new AppError(
        409,
        ErrorCodes.WORKSPACE_NOT_ACTIVE,
        'Workspace reactivation readiness validation failed.',
        validation.blockers,
      );
  }
  const operationId = lifecycleOperationId(scope, 'Workspace', workspace._id, targetState, input);
  const replay = await LifecycleTransition.findOne({
    organizationId: scope.organizationId,
    operationId,
  }).lean();
  if (replay)
    return {
      workspace: await Workspace.findById(workspace._id),
      transition: replay,
      idempotentReplay: true,
    };
  const approval = await enforceAdministrativeApproval(
    scope,
    input,
    permission,
    'Workspace',
    workspace._id,
    `WORKSPACE_${targetState.toUpperCase()}`,
  );
  const now = new Date();
  const updated = await Workspace.findOneAndUpdate(
    {
      _id: workspace._id,
      partnerId: scope.partnerId,
      status: oldState,
      lifecycleRevision: Number(input.expectedRevision ?? workspace.lifecycleRevision),
    },
    {
      $set: {
        status: targetState,
        lifecycleReason: safeReason(input.reason),
        lifecycleOperationId: operationId,
        lifecycleRequestedBy: scope.actorId,
        lifecycleApprovedBy: approval.approverActorIds.join(',') || undefined,
        lifecycleChangedAt: now,
        ...(targetState === 'suspended' ? { suspendedAt: now } : {}),
        ...(targetState === 'active' ? { reactivatedAt: now } : {}),
        ...(targetState === 'archived' ? { archivedAt: now } : {}),
        ...(targetState === 'deleted' ? { deletedAt: now } : {}),
      },
      $inc: { lifecycleRevision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!updated)
    throw new AppError(
      409,
      ErrorCodes.OPERATIONAL_STATE_INCONSISTENT,
      'Workspace lifecycle changed concurrently.',
    );
  if (['suspending', 'suspended'].includes(targetState))
    await pauseQueuedWork({
      organizationId: scope.organizationId,
      partnerId: scope.partnerId,
      workspaceId: externalWorkspaceId,
      reasonCode: 'WORKSPACE_SUSPENDED',
    });
  const transition = await recordLifecycleTransition(scope, {
    operationId,
    resourceType: 'Workspace',
    resourceId: workspace._id,
    permission,
    oldState,
    newState: targetState,
    reasonCode: `WORKSPACE_${targetState.toUpperCase()}`,
    safeReason: input.reason,
    approvedBy: approval.approverActorIds.join(',') || undefined,
    approvalRequestId: approval.approvalRequestIds[0] || input.approvalRequestId,
  });
  await auditAdministrative(
    `workspace.${targetState}`,
    permission,
    'Workspace',
    workspace._id,
    scope,
    {
      oldState,
      newState: targetState,
      reasonCode: transition.reasonCode,
      operationId,
      approvalRequestId: input.approvalRequestId,
    },
  );
  metrics.increment('workspaces_lifecycle_transitions', { state: targetState });
  await notifyAdministrative(scope, {
    type: targetState === 'active' ? 'WORKSPACE_REACTIVATED' : 'WORKSPACE_SUSPENDED',
    resourceType: 'Workspace',
    resourceId: workspace._id,
    status: targetState,
    title: targetState === 'active' ? 'Workspace reactivated' : 'Workspace lifecycle restricted',
    safeSummary: `Workspace state changed from ${oldState} to ${targetState}.`,
  });
  return { workspace: updated, transition, blockedWorkResumesAutomatically: false };
}

async function getLifecycle(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    input.workspaceId ? 'workspace.lifecycle.read' : 'organization.lifecycle.read',
    input,
    caller,
    input.workspaceId ? 'Workspace' : 'Organization',
    input.workspaceId || scopeFromCaller(input, caller).organizationId,
    'SAFE_READ',
  );
  const organization = await ensureOrganization(scope);
  const workspace = scope.workspaceId
    ? await Workspace.findOne({
        partnerId: scope.partnerId,
        externalWorkspaceId: scope.workspaceId,
      }).lean()
    : null;
  const transitions = await LifecycleTransition.find({
    organizationId: scope.organizationId,
    ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
  })
    .sort({ occurredAt: -1 })
    .limit(100)
    .lean();
  return { organization, workspace, transitions };
}

async function controlledResume(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'maintenance.release',
    input,
    caller,
    'RuntimeWorkItem',
    input.workspaceId || scopeFromCaller(input, caller).organizationId,
    'LIFECYCLE_CONTROL',
  );
  const result = await resumeBlockedWork({
    organizationId: scope.organizationId,
    partnerId: scope.partnerId,
    workspaceId: scope.workspaceId,
  });
  await auditAdministrative(
    'durable_work.controlled_resume',
    'maintenance.release',
    'RuntimeWorkItem',
    scope.workspaceId || scope.organizationId,
    scope,
    { reasonCode: 'BLOCKED_WORK_CONTROLLED_RESUME', resumedCount: result.resumed },
  );
  return result;
}

function validateMaintenanceScope(input, scope) {
  const scopeType = clean(input.scopeType, 32).toUpperCase();
  const mode = clean(input.mode, 32).toUpperCase();
  if (
    !MAINTENANCE_SCOPES.includes(scopeType) ||
    !MAINTENANCE_MODES.includes(mode) ||
    mode === 'NONE'
  ) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Maintenance scope or mode is invalid.');
  }
  if (scopeType === 'PLATFORM' && scope.platformAuthorized !== true) {
    throw new AppError(
      403,
      ErrorCodes.AUTHORIZATION_DENIED,
      'Platform maintenance requires deployment-authorized context.',
    );
  }
  if (scopeType === 'WORKSPACE' && !scope.workspaceId)
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Workspace maintenance requires workspace scope.',
    );
  if (scopeType === 'RUNTIME_ADAPTER' && !clean(input.adapterId, 64))
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Adapter maintenance requires an adapter ID.',
    );
  if (scopeType === 'CONNECTION' && !clean(input.connectionId, 128))
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Connection maintenance requires a connection ID.',
    );
  const startsAt = new Date(input.startsAt || Date.now());
  const endsAt = input.endsAt ? new Date(input.endsAt) : undefined;
  if (
    Number.isNaN(startsAt.getTime()) ||
    (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt))
  ) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Maintenance timestamps are invalid.');
  }
  return { scopeType, mode, startsAt, endsAt };
}

function assertMaintenanceRecordAuthority(record, scope) {
  if (record.scopeType === 'PLATFORM' && scope.platformAuthorized !== true) {
    throw new AppError(403, ErrorCodes.AUTHORIZATION_DENIED, 'Authorization denied.');
  }
}

async function createMaintenance(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'maintenance.manage',
    input,
    caller,
    'MaintenanceWindow',
    'new',
    'MAINTENANCE_CONTROL',
  );
  const validated = validateMaintenanceScope(input, scope);
  const record = await MaintenanceWindow.create({
    maintenanceId: `mnt_${crypto.randomUUID()}`,
    scopeType: validated.scopeType,
    organizationId: validated.scopeType === 'PLATFORM' ? undefined : scope.organizationId,
    workspaceId: validated.scopeType === 'WORKSPACE' ? scope.workspaceId : undefined,
    adapterId: validated.scopeType === 'RUNTIME_ADAPTER' ? clean(input.adapterId, 64) : undefined,
    connectionId: validated.scopeType === 'CONNECTION' ? clean(input.connectionId, 128) : undefined,
    mode: validated.mode,
    safeReason: safeReason(input.reason),
    startsAt: validated.startsAt,
    endsAt: validated.endsAt,
    status: 'DRAFT',
    createdBy: scope.actorId,
    revision: 0,
    schemaVersion: 1,
  });
  await auditAdministrative(
    'maintenance.created',
    'maintenance.manage',
    'MaintenanceWindow',
    record.maintenanceId,
    scope,
    { reasonCode: 'MAINTENANCE_DRAFT_CREATED', mode: record.mode },
  );
  return record;
}

async function validateMaintenance(maintenanceId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'maintenance.manage',
    input,
    caller,
    'MaintenanceWindow',
    maintenanceId,
    'MAINTENANCE_CONTROL',
  );
  const record = await MaintenanceWindow.findOne({
    maintenanceId,
    $or: [{ organizationId: scope.organizationId }, { scopeType: 'PLATFORM' }],
  });
  if (!record) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Maintenance window was not found.');
  assertMaintenanceRecordAuthority(record, scope);
  validateMaintenanceScope(record.toObject(), { ...scope, workspaceId: record.workspaceId });
  const updated = await MaintenanceWindow.findOneAndUpdate(
    {
      _id: record._id,
      status: 'DRAFT',
      revision: Number(input.expectedRevision ?? record.revision),
    },
    { $set: { status: 'VALIDATED' }, $inc: { revision: 1 } },
    { new: true, runValidators: true },
  );
  if (!updated)
    throw new AppError(
      409,
      ErrorCodes.OPERATIONAL_STATE_INCONSISTENT,
      'Maintenance window changed concurrently.',
    );
  return updated;
}

async function activateMaintenance(maintenanceId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'maintenance.activate',
    input,
    caller,
    'MaintenanceWindow',
    maintenanceId,
    'MAINTENANCE_CONTROL',
  );
  const record = await MaintenanceWindow.findOne({
    maintenanceId,
    $or: [{ organizationId: scope.organizationId }, { scopeType: 'PLATFORM' }],
  });
  if (!record) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Maintenance window was not found.');
  assertMaintenanceRecordAuthority(record, scope);
  const approval = await enforceAdministrativeApproval(
    scope,
    input,
    'maintenance.activate',
    'MaintenanceWindow',
    maintenanceId,
    `MAINTENANCE_${record.mode}`,
  );
  const now = new Date();
  const status = record.startsAt > now ? 'SCHEDULED' : 'ACTIVE';
  const updated = await MaintenanceWindow.findOneAndUpdate(
    {
      _id: record._id,
      status: { $in: ['VALIDATED', 'SCHEDULED'] },
      revision: Number(input.expectedRevision ?? record.revision),
    },
    {
      $set: {
        status,
        approvedBy: approval.approverActorIds.join(',') || undefined,
        approvalRequestId: approval.approvalRequestIds[0] || input.approvalRequestId,
        ...(status === 'ACTIVE' ? { activatedAt: now } : {}),
      },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!updated)
    throw new AppError(
      409,
      ErrorCodes.OPERATIONAL_STATE_INCONSISTENT,
      'Maintenance activation conflict.',
    );
  if (
    updated.status === 'ACTIVE' &&
    ['DRAINING', 'EXECUTION_BLOCKED', 'FULL_MAINTENANCE'].includes(updated.mode) &&
    updated.scopeType !== 'PLATFORM'
  ) {
    await pauseQueuedWork({
      organizationId: scope.organizationId,
      partnerId: scope.partnerId,
      workspaceId: updated.workspaceId,
      reasonCode: updated.mode === 'DRAINING' ? 'EXECUTION_DRAINING' : 'MAINTENANCE_MODE_ACTIVE',
    });
  }
  await auditAdministrative(
    'maintenance.activated',
    'maintenance.activate',
    'MaintenanceWindow',
    maintenanceId,
    scope,
    {
      reasonCode: 'MAINTENANCE_ACTIVATED',
      newState: updated.status,
      mode: updated.mode,
      approvalRequestId: approval.approvals?.[0]?.request?.approvalRequestId,
    },
  );
  metrics.increment('maintenance_windows_active', { mode: updated.mode });
  await notifyAdministrative(scope, {
    type: updated.status === 'ACTIVE' ? 'MAINTENANCE_ACTIVATED' : 'MAINTENANCE_SCHEDULED',
    resourceType: 'MaintenanceWindow',
    resourceId: maintenanceId,
    status: updated.status,
    title: 'Maintenance window activated',
    safeSummary: `${updated.mode} maintenance is ${updated.status.toLowerCase()}.`,
  });
  return updated;
}

async function releaseMaintenance(maintenanceId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'maintenance.release',
    input,
    caller,
    'MaintenanceWindow',
    maintenanceId,
    'MAINTENANCE_CONTROL',
  );
  if (input.confirm !== true)
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Explicit maintenance release confirmation is required.',
    );
  const record = await MaintenanceWindow.findOne({
    maintenanceId,
    $or: [{ organizationId: scope.organizationId }, { scopeType: 'PLATFORM' }],
  });
  if (!record) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Maintenance window was not found.');
  assertMaintenanceRecordAuthority(record, scope);
  const updated = await MaintenanceWindow.findOneAndUpdate(
    {
      _id: record._id,
      status: { $in: ['ACTIVE', 'SCHEDULED'] },
      revision: Number(input.expectedRevision),
    },
    { $set: { status: 'RELEASED', releasedAt: new Date() }, $inc: { revision: 1 } },
    { new: true, runValidators: true },
  );
  if (!updated)
    throw new AppError(
      409,
      ErrorCodes.OPERATIONAL_STATE_INCONSISTENT,
      'Maintenance release conflict.',
    );
  await auditAdministrative(
    'maintenance.released',
    'maintenance.release',
    'MaintenanceWindow',
    maintenanceId,
    scope,
    { oldState: 'ACTIVE', newState: 'RELEASED', reasonCode: 'MAINTENANCE_RELEASED' },
  );
  await notifyAdministrative(scope, {
    type: 'MAINTENANCE_COMPLETED',
    resourceType: 'MaintenanceWindow',
    resourceId: maintenanceId,
    status: 'RELEASED',
    title: 'Maintenance completed',
    safeSummary: 'Maintenance was released. Blocked work remains paused until controlled resume.',
  });
  return { maintenance: updated, blockedWorkResumesAutomatically: false };
}

async function cancelMaintenance(maintenanceId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'maintenance.manage',
    input,
    caller,
    'MaintenanceWindow',
    maintenanceId,
    'MAINTENANCE_CONTROL',
  );
  const record = await MaintenanceWindow.findOne({
    maintenanceId,
    $or: [{ organizationId: scope.organizationId }, { scopeType: 'PLATFORM' }],
  });
  if (!record) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Maintenance window was not found.');
  assertMaintenanceRecordAuthority(record, scope);
  const updated = await MaintenanceWindow.findOneAndUpdate(
    {
      _id: record._id,
      status: { $in: ['DRAFT', 'VALIDATED', 'SCHEDULED'] },
      revision: Number(input.expectedRevision),
    },
    { $set: { status: 'CANCELLED' }, $inc: { revision: 1 } },
    { new: true, runValidators: true },
  );
  if (!updated)
    throw new AppError(
      409,
      ErrorCodes.OPERATIONAL_STATE_INCONSISTENT,
      'Maintenance cannot be cancelled in its current state.',
    );
  return updated;
}

async function listMaintenance(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'maintenance.read',
    input,
    caller,
    'MaintenanceWindow',
    'list',
    'SAFE_READ',
  );
  const tenantScope = {
    $or: [{ organizationId: scope.organizationId }, { scopeType: 'PLATFORM' }],
  };
  const filter = scope.workspaceId
    ? {
        $and: [
          tenantScope,
          { $or: [{ workspaceId: scope.workspaceId }, { workspaceId: { $exists: false } }] },
        ],
      }
    : tenantScope;
  const items = await MaintenanceWindow.find(filter).sort({ startsAt: -1 }).limit(100).lean();
  return { items };
}

async function drainStatus(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'dr-status.read',
    input,
    caller,
    'RuntimeWorkItem',
    'drain-status',
    'SAFE_READ',
  );
  const filter = {
    partnerId: scope.partnerId,
    ...(scope.workspaceId ? { receivingWorkspaceId: scope.workspaceId } : {}),
  };
  const [workStatuses, workers, expiredLeases] = await Promise.all([
    RuntimeWorkItem.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    RuntimeWorkerHeartbeat.find({}).sort({ lastHeartbeatAt: -1 }).limit(100).lean(),
    RuntimeWorkItem.countDocuments({
      ...filter,
      status: { $in: ['claimed', 'running', 'cancellation_requested'] },
      leaseExpiresAt: { $lte: new Date() },
    }),
  ]);
  const counts = Object.fromEntries(workStatuses.map((item) => [item._id, item.count]));
  return {
    activeJobs:
      (counts.claimed || 0) + (counts.running || 0) + (counts.cancellation_requested || 0),
    queuedJobs: (counts.pending || 0) + (counts.retry_scheduled || 0),
    blockedJobs: (counts.blocked || 0) + (counts.waiting_for_approval || 0),
    drainingWorkers: workers.filter((worker) => worker.draining).length,
    readyWorkers: workers.filter((worker) => worker.status === 'ready').length,
    expiredLeases,
    unresolvedInFlightOperations: (counts.recovery_required || 0) + expiredLeases,
  };
}

const MEMBERSHIP_TRANSITIONS = Object.freeze({
  invited: new Set(['active', 'removed']),
  active: new Set(['suspended', 'removal_pending']),
  suspended: new Set(['active', 'removal_pending']),
  removal_pending: new Set(['removed', 'active']),
});

function requestedWorkspaceIds(input = {}, scope = {}) {
  const requested = [
    ...(Array.isArray(input.externalWorkspaceIds) ? input.externalWorkspaceIds : []),
    ...(input.externalWorkspaceId ? [input.externalWorkspaceId] : []),
    ...(scope.workspaceId ? [scope.workspaceId] : []),
  ]
    .map((value) => clean(value, 128))
    .filter(Boolean);
  const unique = [...new Set(requested)].slice(0, 50);
  if (scope.workspaceId && unique.some((workspaceId) => workspaceId !== scope.workspaceId)) {
    throw new AppError(403, ErrorCodes.AUTHORIZATION_DENIED, 'Authorization denied.');
  }
  return unique;
}

function requestedRoleBindings(input = {}, workspaceIds = []) {
  const roleKeys = Array.isArray(input.roleKeys) ? input.roleKeys : [];
  if (roleKeys.length > 20)
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Too many role assignments.');
  return [...new Set(roleKeys)]
    .map((roleKey) => clean(roleKey, 100).toLowerCase().replace(/\s+/g, '_'))
    .filter((roleKey) => /^[a-z0-9][a-z0-9._-]{0,99}$/.test(roleKey))
    .flatMap((roleKey) =>
      workspaceIds.length
        ? workspaceIds.map((externalWorkspaceId) => ({
            roleKey,
            scopeType: 'workspace',
            externalWorkspaceId,
          }))
        : [{ roleKey, scopeType: 'organization' }],
    );
}

async function validateProvisioningWorkspaces(scope, workspaceIds) {
  if (!workspaceIds.length) return;
  const count = await Workspace.countDocuments({
    partnerId: scope.partnerId,
    externalWorkspaceId: { $in: workspaceIds },
  });
  if (count !== workspaceIds.length) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'A workspace scope is invalid.');
  }
}

async function provisionMembership(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'user.manage',
    input,
    caller,
    'EnterpriseUser',
    'new',
    'MUTATION',
  );
  const externalUserId = clean(input.externalUserId, 128);
  const displayName = clean(input.displayName, 200);
  if (!externalUserId || !displayName) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'External user ID and display name are required.',
    );
  }
  const existing = await EnterpriseUser.findOne({ partnerId: scope.partnerId, externalUserId });
  if (existing) return { user: existing, idempotentReplay: true };
  const workspaceIds = requestedWorkspaceIds(input, scope);
  await validateProvisioningWorkspaces(scope, workspaceIds);
  const initialStatus = input.activate === true ? 'active' : 'invited';
  await enforceAdministrativeApproval(
    scope,
    input,
    'user.manage',
    'EnterpriseUser',
    externalUserId,
    'MEMBERSHIP_PROVISION',
  );
  const organization = await ensureOrganization(scope);
  let user;
  try {
    user = await EnterpriseUser.create({
      organizationId: organization._id,
      partnerId: scope.partnerId,
      externalUserId,
      email: clean(input.email, 320) || undefined,
      displayName,
      externalWorkspaceIds: workspaceIds,
      roleBindings: requestedRoleBindings(input, workspaceIds),
      status: initialStatus,
      lifecycleRevision: 0,
      lifecycleReason: safeReason(input.reason),
      lifecycleChangedAt: new Date(),
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    user = await EnterpriseUser.findOne({ partnerId: scope.partnerId, externalUserId });
    return { user, idempotentReplay: true };
  }
  await auditAdministrative(
    'membership.provisioned',
    'user.manage',
    'EnterpriseUser',
    user._id,
    scope,
    { reasonCode: 'MEMBERSHIP_PROVISIONED', newState: initialStatus },
  );
  return { user, idempotentReplay: false };
}

async function transitionMembership(userId, targetState, input = {}, caller = {}) {
  const permission =
    targetState === 'suspended'
      ? 'membership.suspend'
      : targetState === 'active'
        ? 'membership.restore'
        : 'membership.remove';
  const scope = await authorizeOperation(
    permission,
    input,
    caller,
    'EnterpriseUser',
    userId,
    'LIFECYCLE_CONTROL',
  );
  const filter = mongoose.isValidObjectId(userId) ? { _id: userId } : { externalUserId: userId };
  const user = await EnterpriseUser.findOne({ ...filter, partnerId: scope.partnerId });
  if (!user) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Enterprise membership was not found.');
  if (user.status === targetState) return { user, idempotentReplay: true };
  if (!MEMBERSHIP_TRANSITIONS[user.status]?.has(targetState))
    throw new AppError(
      409,
      ErrorCodes.OPERATIONAL_STATE_INCONSISTENT,
      'Membership transition is not allowed.',
    );
  const approval = await enforceAdministrativeApproval(
    scope,
    input,
    permission,
    'EnterpriseUser',
    user._id,
    `MEMBERSHIP_${targetState.toUpperCase()}`,
  );
  const oldState = user.status;
  const operationId = lifecycleOperationId(scope, 'Membership', user._id, targetState, input);
  const update = {
    status: targetState,
    lifecycleReason: safeReason(input.reason),
    lifecycleChangedAt: new Date(),
    ...(targetState === 'suspended' ? { suspendedAt: new Date() } : {}),
    ...(targetState === 'removed'
      ? {
          removedAt: new Date(),
          workspaceIds: [],
          externalWorkspaceIds: [],
          teamIds: [],
          roleBindings: [],
        }
      : {}),
  };
  const updated = await EnterpriseUser.findOneAndUpdate(
    {
      _id: user._id,
      partnerId: scope.partnerId,
      status: oldState,
      lifecycleRevision: Number(input.expectedRevision ?? user.lifecycleRevision),
    },
    { $set: update, $inc: { lifecycleRevision: 1 } },
    { new: true, runValidators: true },
  );
  if (!updated)
    throw new AppError(
      409,
      ErrorCodes.OPERATIONAL_STATE_INCONSISTENT,
      'Membership changed concurrently.',
    );
  const transition = await recordLifecycleTransition(scope, {
    operationId,
    resourceType: 'Membership',
    resourceId: user._id,
    permission,
    oldState,
    newState: targetState,
    reasonCode: `MEMBERSHIP_${targetState.toUpperCase()}`,
    safeReason: input.reason,
    approvedBy: approval.approverActorIds.join(',') || undefined,
    approvalRequestId: approval.approvalRequestIds[0] || input.approvalRequestId,
  });
  await auditAdministrative(
    `membership.${targetState}`,
    permission,
    'EnterpriseUser',
    user._id,
    scope,
    { oldState, newState: targetState, reasonCode: transition.reasonCode, operationId },
  );
  metrics.increment('membership_lifecycle_transitions', { state: targetState });
  return { user: updated, transition };
}

const SERVICE_ACCOUNT_TRANSITIONS = Object.freeze({
  active: new Set(['disabled', 'rotation_required', 'expired', 'revoked']),
  disabled: new Set(['active', 'rotation_required', 'revoked', 'deleted']),
  rotation_required: new Set(['active', 'disabled', 'revoked']),
  expired: new Set(['rotation_required', 'revoked', 'deleted']),
  revoked: new Set(['deleted']),
  suspended: new Set(['active', 'revoked']),
});

async function createServiceAccount(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'service_account.manage',
    input,
    caller,
    'ServiceAccount',
    'new',
    'MUTATION',
  );
  const name = clean(input.name, 200);
  if (!name)
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Service-account name is required.');
  const workspaceIds = requestedWorkspaceIds(input, scope);
  if (workspaceIds.length > 1) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'A service account may bind to only one workspace.',
    );
  }
  await validateProvisioningWorkspaces(scope, workspaceIds);
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
  if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Service-account expiry must be in the future.',
    );
  }
  await enforceAdministrativeApproval(
    scope,
    input,
    'service_account.manage',
    'ServiceAccount',
    name,
    'SERVICE_ACCOUNT_CREATE',
  );
  const organization = await ensureOrganization(scope);
  const account = await ServiceAccount.create({
    organizationId: organization._id,
    partnerId: scope.partnerId,
    externalWorkspaceId: workspaceIds[0],
    name,
    keyId: `svc_${crypto.randomUUID()}`,
    roleBindings: requestedRoleBindings(input, workspaceIds),
    status: 'active',
    expiresAt,
    lifecycleRevision: 0,
    lifecycleReason: safeReason(input.reason),
    lifecycleChangedAt: new Date(),
  });
  await auditAdministrative(
    'service_account.created',
    'service_account.manage',
    'ServiceAccount',
    account._id,
    scope,
    { reasonCode: 'SERVICE_ACCOUNT_CREATED', newState: 'active' },
  );
  return account;
}

async function transitionServiceAccount(accountId, targetState, input = {}, caller = {}) {
  const permission =
    targetState === 'disabled'
      ? 'service-account.disable'
      : targetState === 'rotation_required' || targetState === 'active'
        ? 'service-account.rotate'
        : 'service-account.revoke';
  const scope = await authorizeOperation(
    permission,
    input,
    caller,
    'ServiceAccount',
    accountId,
    'LIFECYCLE_CONTROL',
  );
  const filter = mongoose.isValidObjectId(accountId) ? { _id: accountId } : { keyId: accountId };
  const account = await ServiceAccount.findOne({ ...filter, partnerId: scope.partnerId });
  if (!account) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Service account was not found.');
  if (
    scope.workspaceId &&
    account.externalWorkspaceId &&
    account.externalWorkspaceId !== scope.workspaceId
  )
    throw new AppError(403, ErrorCodes.AUTHORIZATION_DENIED, 'Authorization denied.');
  if (account.status === targetState) return { account, idempotentReplay: true };
  if (!SERVICE_ACCOUNT_TRANSITIONS[account.status]?.has(targetState))
    throw new AppError(
      409,
      ErrorCodes.OPERATIONAL_STATE_INCONSISTENT,
      'Service-account transition is not allowed.',
    );
  const approval = await enforceAdministrativeApproval(
    scope,
    input,
    permission,
    'ServiceAccount',
    account._id,
    `SERVICE_ACCOUNT_${targetState.toUpperCase()}`,
  );
  const oldState = account.status;
  const operationId = lifecycleOperationId(
    scope,
    'ServiceAccount',
    account._id,
    targetState,
    input,
  );
  const now = new Date();
  const updated = await ServiceAccount.findOneAndUpdate(
    {
      _id: account._id,
      partnerId: scope.partnerId,
      status: oldState,
      lifecycleRevision: Number(input.expectedRevision ?? account.lifecycleRevision),
    },
    {
      $set: {
        status: targetState,
        lifecycleReason: safeReason(input.reason),
        lifecycleChangedAt: now,
        ...(targetState === 'disabled' ? { disabledAt: now } : {}),
        ...(targetState === 'revoked' ? { revokedAt: now } : {}),
        ...(targetState === 'active' ? { rotatedAt: now } : {}),
      },
      $inc: { lifecycleRevision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!updated)
    throw new AppError(
      409,
      ErrorCodes.OPERATIONAL_STATE_INCONSISTENT,
      'Service account changed concurrently.',
    );
  const transition = await recordLifecycleTransition(scope, {
    operationId,
    resourceType: 'ServiceAccount',
    resourceId: account._id,
    permission,
    oldState,
    newState: targetState,
    reasonCode: `SERVICE_ACCOUNT_${targetState.toUpperCase()}`,
    safeReason: input.reason,
    approvedBy: approval.approverActorIds.join(',') || undefined,
    approvalRequestId: approval.approvalRequestIds[0] || input.approvalRequestId,
  });
  await auditAdministrative(
    `service_account.${targetState}`,
    permission,
    'ServiceAccount',
    account._id,
    scope,
    { oldState, newState: targetState, reasonCode: transition.reasonCode, operationId },
  );
  metrics.increment('service_account_lifecycle_transitions', { state: targetState });
  return { account: updated, transition };
}

async function listMembershipHistory(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'membership.lifecycle.read',
    input,
    caller,
    'EnterpriseUser',
    input.userId || 'memberships',
    'SAFE_READ',
  );
  const transitions = await LifecycleTransition.find({
    organizationId: scope.organizationId,
    resourceType: 'Membership',
    ...(input.userId ? { resourceId: idOf(input.userId) } : {}),
  })
    .sort({ occurredAt: -1 })
    .limit(100)
    .lean();
  return { items: transitions };
}

async function listServiceAccountHistory(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'service-account.lifecycle.read',
    input,
    caller,
    'ServiceAccount',
    input.accountId || 'service-accounts',
    'SAFE_READ',
  );
  const transitions = await LifecycleTransition.find({
    organizationId: scope.organizationId,
    resourceType: 'ServiceAccount',
    ...(input.accountId ? { resourceId: idOf(input.accountId) } : {}),
  })
    .sort({ occurredAt: -1 })
    .limit(100)
    .lean();
  return { items: transitions };
}

function accessSnapshot(subject) {
  return {
    status: subject.status,
    roleBindings: subject.roleBindings || [],
    workspaceIds:
      subject.externalWorkspaceIds ||
      (subject.externalWorkspaceId ? [subject.externalWorkspaceId] : []),
    teamIds: subject.teamIds || [],
    lifecycleRevision: Number(subject.lifecycleRevision || 0),
  };
}

async function createAccessReview(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'access-review.create',
    input,
    caller,
    'AccessReviewCampaign',
    'new',
    'MUTATION',
  );
  const dueAt = new Date(input.dueAt);
  if (!clean(input.name, 200) || Number.isNaN(dueAt.getTime()) || dueAt <= new Date())
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Access review name and future due date are required.',
    );
  const campaign = await AccessReviewCampaign.create({
    campaignId: `arc_${crypto.randomUUID()}`,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    name: clean(input.name, 200),
    description: clean(input.description, 2_000),
    status: 'DRAFT',
    scope: redactSecrets(input.scope || { subjects: ['MEMBERSHIP', 'SERVICE_ACCOUNT'] }),
    reviewerRules: redactSecrets(
      input.reviewerRules || { permission: 'access-review.decide', requireHuman: true },
    ),
    dueAt,
    createdBy: scope.actorId,
    revision: 0,
    schemaVersion: 1,
  });
  await auditAdministrative(
    'access_review.created',
    'access-review.create',
    'AccessReviewCampaign',
    campaign.campaignId,
    scope,
    { reasonCode: 'ACCESS_REVIEW_CREATED' },
  );
  metrics.increment('access_reviews_created', { status: 'DRAFT' });
  return campaign;
}

async function activateAccessReview(campaignId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'access-review.manage',
    input,
    caller,
    'AccessReviewCampaign',
    campaignId,
    'MUTATION',
  );
  const campaign = await AccessReviewCampaign.findOne({
    campaignId,
    organizationId: scope.organizationId,
    status: 'DRAFT',
  });
  if (!campaign)
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Access review campaign draft was not found.');
  await enforceAdministrativeApproval(
    scope,
    input,
    'access-review.manage',
    'AccessReviewCampaign',
    campaignId,
    'ACCESS_REVIEW_ACTIVATION',
  );
  const subjectTypes = new Set(campaign.scope?.subjects || ['MEMBERSHIP', 'SERVICE_ACCOUNT']);
  const [users, accounts] = await Promise.all([
    subjectTypes.has('MEMBERSHIP')
      ? EnterpriseUser.find({
          partnerId: scope.partnerId,
          status: { $nin: ['removed', 'deleted'] },
          ...(scope.workspaceId ? { externalWorkspaceIds: scope.workspaceId } : {}),
        }).lean()
      : [],
    subjectTypes.has('SERVICE_ACCOUNT')
      ? ServiceAccount.find({
          partnerId: scope.partnerId,
          status: { $ne: 'deleted' },
          ...(scope.workspaceId ? { externalWorkspaceId: scope.workspaceId } : {}),
        }).lean()
      : [],
  ]);
  const items = [
    ...users.map((user) => ({ subjectType: 'MEMBERSHIP', subject: user })),
    ...accounts.map((account) => ({ subjectType: 'SERVICE_ACCOUNT', subject: account })),
  ].slice(0, 2_000);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await AccessReviewCampaign.findOneAndUpdate(
        {
          _id: campaign._id,
          status: 'DRAFT',
          revision: Number(input.expectedRevision ?? campaign.revision),
        },
        { $set: { status: 'ACTIVE', startedAt: new Date() }, $inc: { revision: 1 } },
        { new: true, session },
      );
      if (!updated)
        throw new AppError(
          409,
          ErrorCodes.ACCESS_REMEDIATION_CONFLICT,
          'Access review campaign changed concurrently.',
        );
      if (items.length)
        await AccessReviewItem.insertMany(
          items.map(({ subjectType, subject }) => {
            const snapshot = accessSnapshot(subject);
            return {
              reviewItemId: `ari_${crypto.randomUUID()}`,
              campaignId,
              organizationId: scope.organizationId,
              workspaceId: scope.workspaceId,
              subjectType,
              subjectActorId: idOf(subject._id),
              currentAccess: redactSecrets(snapshot),
              accessSnapshotDigest: canonicalDigest(snapshot),
              resourceScope: {
                organizationId: scope.organizationId,
                workspaceId: scope.workspaceId,
              },
              remediationStatus: 'PENDING',
              revision: 0,
            };
          }),
          { session },
        );
    });
  } finally {
    await session.endSession();
  }
  await auditAdministrative(
    'access_review.activated',
    'access-review.manage',
    'AccessReviewCampaign',
    campaignId,
    scope,
    { reasonCode: 'ACCESS_REVIEW_ACTIVATED', itemCount: items.length },
  );
  return getAccessReview(campaignId, input, caller);
}

async function getAccessReview(campaignId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'access-review.read',
    input,
    caller,
    'AccessReviewCampaign',
    campaignId,
    'SAFE_READ',
  );
  const campaign = await AccessReviewCampaign.findOne({
    campaignId,
    organizationId: scope.organizationId,
  }).lean();
  if (!campaign)
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Access review campaign was not found.');
  const items = await AccessReviewItem.find({ campaignId, organizationId: scope.organizationId })
    .sort({ createdAt: 1 })
    .limit(2_000)
    .lean();
  return { campaign, items };
}

async function listAccessReviews(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'access-review.read',
    input,
    caller,
    'AccessReviewCampaign',
    'list',
    'SAFE_READ',
  );
  const items = await AccessReviewCampaign.find({
    organizationId: scope.organizationId,
    ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return { items };
}

async function decideAccessReviewItem(reviewItemId, input = {}, caller = {}) {
  let scope = await authorizeOperation(
    'access-review.decide',
    input,
    caller,
    'AccessReviewItem',
    reviewItemId,
    'MUTATION',
  );
  const decision = clean(input.decision, 32).toUpperCase();
  if (!ACCESS_REVIEW_DECISIONS.includes(decision))
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Access review decision is invalid.');
  const reviewerId = clean(input.reviewerActorId, 128);
  const reviewerFilter = mongoose.isValidObjectId(reviewerId)
    ? { _id: reviewerId }
    : { externalUserId: reviewerId };
  const reviewer = reviewerId
    ? await EnterpriseUser.findOne({
        ...reviewerFilter,
        partnerId: scope.partnerId,
        status: 'active',
      }).lean()
    : null;
  if (!reviewer)
    throw new AppError(
      403,
      ErrorCodes.AUTHORIZATION_DENIED,
      'An active human reviewer is required.',
    );
  const reviewerDecision = await assertAuthorized(
    {
      type: 'user',
      id: idOf(reviewer._id),
      enterpriseUserId: idOf(reviewer._id),
      userId: reviewer.externalUserId,
      organizationId: scope.organizationId,
      partnerId: scope.partnerId,
      workspaceId: scope.workspaceId,
    },
    'access-review.decide',
    {
      type: 'AccessReviewItem',
      id: reviewItemId,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
    },
    { requestId: scope.requestId, traceId: scope.traceId, workspaceId: scope.workspaceId },
  );
  scope = {
    ...scope,
    actorId: idOf(reviewer._id),
    actorType: 'user',
    authorizationDecision: reviewerDecision,
  };
  const item = await AccessReviewItem.findOneAndUpdate(
    {
      reviewItemId,
      organizationId: scope.organizationId,
      decision: { $exists: false },
      revision: Number(input.expectedRevision ?? 0),
    },
    {
      $set: {
        reviewerActorId: scope.actorId,
        decision,
        justification: safeReason(input.justification),
        decidedAt: new Date(),
        remediationStatus: ['REVOKE', 'MODIFY'].includes(decision) ? 'PENDING' : 'NOT_REQUIRED',
      },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!item)
    throw new AppError(
      409,
      ErrorCodes.ACCESS_REMEDIATION_CONFLICT,
      'Access review item changed concurrently.',
    );
  await auditAdministrative(
    'access_review.decision_recorded',
    'access-review.decide',
    'AccessReviewItem',
    reviewItemId,
    scope,
    { reasonCode: 'ACCESS_REVIEW_DECISION_RECORDED', decision },
  );
  return { item, accessMutated: false };
}

async function loadReviewSubject(item, scope) {
  if (item.subjectType === 'MEMBERSHIP')
    return EnterpriseUser.findOne({ _id: item.subjectActorId, partnerId: scope.partnerId });
  if (item.subjectType === 'SERVICE_ACCOUNT')
    return ServiceAccount.findOne({ _id: item.subjectActorId, partnerId: scope.partnerId });
  return null;
}

async function remediateAccessReviewItem(reviewItemId, input = {}, caller = {}) {
  let scope = await authorizeOperation(
    'access-review.remediate',
    input,
    caller,
    'AccessReviewItem',
    reviewItemId,
    'LIFECYCLE_CONTROL',
  );
  const item = await AccessReviewItem.findOne({
    reviewItemId,
    organizationId: scope.organizationId,
  });
  if (!item) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Access review item was not found.');
  if (!['REVOKE', 'MODIFY'].includes(item.decision) || item.remediationStatus !== 'PENDING')
    throw new AppError(
      409,
      ErrorCodes.ACCESS_REMEDIATION_CONFLICT,
      'Access review item does not require pending remediation.',
    );
  const reviewer = await EnterpriseUser.findOne({
    _id: item.reviewerActorId,
    partnerId: scope.partnerId,
    status: 'active',
  }).lean();
  if (!reviewer) {
    throw new AppError(
      403,
      ErrorCodes.AUTHORIZATION_DENIED,
      'The assigned human reviewer is no longer eligible to remediate access.',
    );
  }
  const reviewerDecision = await assertAuthorized(
    {
      type: 'user',
      id: idOf(reviewer._id),
      enterpriseUserId: idOf(reviewer._id),
      userId: reviewer.externalUserId,
      organizationId: scope.organizationId,
      partnerId: scope.partnerId,
      workspaceId: item.workspaceId || scope.workspaceId,
    },
    'access-review.remediate',
    {
      type: 'AccessReviewItem',
      id: reviewItemId,
      organizationId: scope.organizationId,
      workspaceId: item.workspaceId || scope.workspaceId,
    },
    {
      requestId: scope.requestId,
      traceId: scope.traceId,
      workspaceId: item.workspaceId || scope.workspaceId,
    },
  );
  scope = {
    ...scope,
    workspaceId: item.workspaceId || scope.workspaceId,
    actorId: idOf(reviewer._id),
    actorType: 'user',
    authorizationDecision: reviewerDecision,
  };
  const subject = await loadReviewSubject(item, scope);
  if (!subject)
    throw new AppError(409, ErrorCodes.ACCESS_REVIEW_STALE, 'Reviewed access no longer exists.');
  const currentSnapshot = accessSnapshot(subject);
  if (canonicalDigest(currentSnapshot) !== item.accessSnapshotDigest) {
    await AccessReviewItem.updateOne(
      { _id: item._id, remediationStatus: 'PENDING' },
      { $set: { remediationStatus: 'CONFLICT' }, $inc: { revision: 1 } },
    );
    metrics.increment('access_review_remediation_conflicts', { result: 'conflict' });
    throw new AppError(
      409,
      ErrorCodes.ACCESS_REVIEW_STALE,
      'Reviewed access changed after the campaign snapshot.',
    );
  }
  await enforceAdministrativeApproval(
    scope,
    input,
    'access-review.remediate',
    'AccessReviewItem',
    reviewItemId,
    'ACCESS_REVIEW_REMEDIATION',
  );
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const subjectUpdate =
        item.decision === 'REVOKE'
          ? {
              status: item.subjectType === 'MEMBERSHIP' ? 'removed' : 'revoked',
              roleBindings: [],
              ...(item.subjectType === 'MEMBERSHIP'
                ? { workspaceIds: [], externalWorkspaceIds: [], teamIds: [], removedAt: new Date() }
                : { revokedAt: new Date() }),
            }
          : { roleBindings: Array.isArray(input.roleBindings) ? input.roleBindings : [] };
      const Model = item.subjectType === 'MEMBERSHIP' ? EnterpriseUser : ServiceAccount;
      const updatedSubject = await Model.findOneAndUpdate(
        {
          _id: subject._id,
          partnerId: scope.partnerId,
          lifecycleRevision: Number(subject.lifecycleRevision || 0),
        },
        {
          $set: {
            ...subjectUpdate,
            lifecycleReason: 'Access review remediation',
            lifecycleChangedAt: new Date(),
          },
          $inc: { lifecycleRevision: 1 },
        },
        { new: true, session, runValidators: true },
      );
      if (!updatedSubject)
        throw new AppError(
          409,
          ErrorCodes.ACCESS_REMEDIATION_CONFLICT,
          'Access changed during remediation.',
        );
      const updatedItem = await AccessReviewItem.findOneAndUpdate(
        { _id: item._id, remediationStatus: 'PENDING', revision: item.revision },
        {
          $set: { remediationStatus: 'COMPLETED', remediatedAt: new Date() },
          $inc: { revision: 1 },
        },
        { new: true, session },
      );
      if (!updatedItem)
        throw new AppError(
          409,
          ErrorCodes.ACCESS_REMEDIATION_CONFLICT,
          'Review item changed during remediation.',
        );
    });
  } finally {
    await session.endSession();
  }
  await auditAdministrative(
    'access_review.remediation_executed',
    'access-review.remediate',
    'AccessReviewItem',
    reviewItemId,
    scope,
    { reasonCode: 'ACCESS_REVIEW_REMEDIATION_EXECUTED', decision: item.decision },
  );
  metrics.increment('access_review_remediation', { result: 'completed' });
  return AccessReviewItem.findById(item._id).lean();
}

async function closeAccessReview(campaignId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'access-review.manage',
    input,
    caller,
    'AccessReviewCampaign',
    campaignId,
    'MUTATION',
  );
  const pending = await AccessReviewItem.countDocuments({
    campaignId,
    organizationId: scope.organizationId,
    remediationStatus: 'PENDING',
  });
  if (pending)
    throw new AppError(
      409,
      ErrorCodes.ACCESS_REMEDIATION_CONFLICT,
      'Access review has pending remediation.',
      [],
      { pending },
    );
  const campaign = await AccessReviewCampaign.findOneAndUpdate(
    {
      campaignId,
      organizationId: scope.organizationId,
      status: 'ACTIVE',
      revision: Number(input.expectedRevision),
    },
    { $set: { status: 'COMPLETED', completedAt: new Date() }, $inc: { revision: 1 } },
    { new: true },
  );
  if (!campaign)
    throw new AppError(
      409,
      ErrorCodes.ACCESS_REMEDIATION_CONFLICT,
      'Access review close conflict.',
    );
  metrics.increment('access_reviews_completed', { status: 'COMPLETED' });
  return campaign;
}

function validateConfigurationValues(category, values) {
  if (
    !CONFIGURATION_CATEGORIES.includes(category) ||
    !values ||
    typeof values !== 'object' ||
    Array.isArray(values)
  ) {
    throw new AppError(
      400,
      ErrorCodes.CONFIGURATION_INVALID,
      'Operational configuration category or values are invalid.',
    );
  }
  const serialized = canonicalize(values);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_CONFIGURATION_BYTES)
    throw new AppError(
      400,
      ErrorCodes.CONFIGURATION_INVALID,
      'Operational configuration exceeds the size limit.',
    );
  function inspect(value, trail = []) {
    for (const [key, item] of Object.entries(value || {})) {
      if (CORE_SECURITY_KEY_PATTERN.test(key))
        throw new AppError(
          400,
          ErrorCodes.CONFIGURATION_INVALID,
          'Core security controls cannot be configured or disabled.',
        );
      if (SECRET_KEY_PATTERN.test(key))
        throw new AppError(
          400,
          ErrorCodes.CONFIGURATION_INVALID,
          'Secret-like values are forbidden in operational configuration.',
        );
      if (typeof item === 'function' || (typeof item === 'string' && /=>|function\s*\(/.test(item)))
        throw new AppError(
          400,
          ErrorCodes.CONFIGURATION_INVALID,
          'Executable configuration is forbidden.',
        );
      if (item && typeof item === 'object') inspect(item, [...trail, key]);
    }
  }
  inspect(values);
  if (
    category === 'FEATURE_AVAILABILITY' &&
    Object.values(values.flags || {}).some((value) => typeof value !== 'boolean')
  )
    throw new AppError(
      400,
      ErrorCodes.CONFIGURATION_INVALID,
      'Feature availability flags must be boolean.',
    );
  return { values: redactSecrets(values), valuesDigest: canonicalDigest(values) };
}

async function createConfiguration(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'configuration.create',
    input,
    caller,
    'OperationalConfiguration',
    input.configurationId || 'new',
    'PRIVILEGED_CONFIGURATION',
  );
  const category = clean(input.category, 64).toUpperCase();
  const validated = validateConfigurationValues(category, input.values);
  const configurationId = clean(input.configurationId, 128) || `cfg_${crypto.randomUUID()}`;
  const latest = await OperationalConfiguration.findOne({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    configurationId,
  })
    .sort({ version: -1 })
    .lean();
  const record = await OperationalConfiguration.create({
    configurationId,
    version: Number(latest?.version || 0) + 1,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    category,
    name: clean(input.name, 200) || category,
    values: validated.values,
    valuesDigest: validated.valuesDigest,
    status: 'DRAFT',
    createdBy: scope.actorId,
    revision: 0,
    schemaVersion: 1,
  });
  await auditAdministrative(
    'configuration.created',
    'configuration.create',
    'OperationalConfiguration',
    `${configurationId}:${record.version}`,
    scope,
    { reasonCode: 'CONFIGURATION_DRAFT_CREATED' },
  );
  return record;
}

async function validateConfiguration(configurationId, version, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'configuration.validate',
    input,
    caller,
    'OperationalConfiguration',
    configurationId,
    'PRIVILEGED_CONFIGURATION',
  );
  const record = await OperationalConfiguration.findOne({
    configurationId,
    version: Number(version),
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    status: 'DRAFT',
  });
  if (!record) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Configuration draft was not found.');
  validateConfigurationValues(record.category, record.values);
  const updated = await OperationalConfiguration.findOneAndUpdate(
    {
      _id: record._id,
      status: 'DRAFT',
      revision: Number(input.expectedRevision ?? record.revision),
    },
    {
      $set: { status: 'VALIDATED', validatedAt: new Date(), validatedBy: scope.actorId },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!updated)
    throw new AppError(
      409,
      ErrorCodes.CONFIGURATION_VERSION_CONFLICT,
      'Configuration changed concurrently.',
    );
  return updated;
}

async function activateConfiguration(configurationId, version, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'configuration.activate',
    input,
    caller,
    'OperationalConfiguration',
    configurationId,
    'PRIVILEGED_CONFIGURATION',
  );
  const record = await OperationalConfiguration.findOne({
    configurationId,
    version: Number(version),
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    status: 'VALIDATED',
  });
  if (!record)
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Validated configuration was not found.');
  validateConfigurationValues(record.category, record.values);
  await enforceAdministrativeApproval(
    scope,
    input,
    'configuration.activate',
    'OperationalConfiguration',
    `${configurationId}:${version}`,
    'CONFIGURATION_ACTIVATION',
  );
  const session = await mongoose.startSession();
  let activated;
  try {
    await session.withTransaction(async () => {
      await OperationalConfiguration.updateMany(
        {
          organizationId: scope.organizationId,
          workspaceId: scope.workspaceId,
          category: record.category,
          status: 'ACTIVE',
        },
        { $set: { status: 'RETIRED', retiredAt: new Date() }, $inc: { revision: 1 } },
        { session },
      );
      activated = await OperationalConfiguration.findOneAndUpdate(
        {
          _id: record._id,
          status: 'VALIDATED',
          revision: Number(input.expectedRevision ?? record.revision),
        },
        {
          $set: {
            status: 'ACTIVE',
            activatedAt: new Date(),
            activatedBy: scope.actorId,
            approvalRequestId: input.approvalRequestId,
          },
          $inc: { revision: 1 },
        },
        { new: true, session },
      );
      if (!activated)
        throw new AppError(
          409,
          ErrorCodes.CONFIGURATION_VERSION_CONFLICT,
          'Configuration activation conflict.',
        );
    });
  } catch (error) {
    metrics.increment('configuration_activation', { result: 'failure' });
    await raiseOperationalAlert(
      scope,
      'configuration_activation_failure',
      'warning',
      error.code || 'CONFIGURATION_ACTIVATION_FAILED',
    );
    throw error;
  } finally {
    await session.endSession();
  }
  metrics.increment('configuration_activation', { result: 'success' });
  await auditAdministrative(
    'configuration.activated',
    'configuration.activate',
    'OperationalConfiguration',
    `${configurationId}:${version}`,
    scope,
    {
      reasonCode: 'CONFIGURATION_ACTIVATED',
      newState: 'ACTIVE',
      approvalRequestId: input.approvalRequestId,
    },
  );
  await notifyAdministrative(scope, {
    type: 'CONFIGURATION_ACTIVATED',
    resourceType: 'OperationalConfiguration',
    resourceId: `${configurationId}:${version}`,
    status: 'ACTIVE',
    title: 'Configuration activated',
    safeSummary: `${record.category} configuration version ${version} is active.`,
  });
  return activated;
}

async function rollbackConfiguration(configurationId, targetVersion, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'configuration.rollback',
    input,
    caller,
    'OperationalConfiguration',
    configurationId,
    'PRIVILEGED_CONFIGURATION',
  );
  const target = await OperationalConfiguration.findOne({
    configurationId,
    version: Number(targetVersion),
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
  });
  if (!target || !['ACTIVE', 'RETIRED', 'ROLLED_BACK'].includes(target.status))
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Rollback target was not found.');
  const draft = await createConfiguration(
    {
      ...input,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      configurationId,
      category: target.category,
      name: `${target.name} rollback`,
      values: target.values,
    },
    caller,
  );
  await OperationalConfiguration.updateOne(
    { _id: draft._id },
    {
      $set: {
        status: 'VALIDATED',
        validatedAt: new Date(),
        validatedBy: scope.actorId,
        rolledBackFromVersion: Number(targetVersion),
      },
      $inc: { revision: 1 },
    },
  );
  const activated = await activateConfiguration(
    configurationId,
    draft.version,
    { ...input, expectedRevision: 1 },
    caller,
  );
  await auditAdministrative(
    'configuration.rolled_back',
    'configuration.rollback',
    'OperationalConfiguration',
    `${configurationId}:${activated.version}`,
    scope,
    { reasonCode: 'CONFIGURATION_ROLLED_BACK', targetVersion: Number(targetVersion) },
  );
  metrics.increment('configuration_rollback', { result: 'success' });
  await notifyAdministrative(scope, {
    type: 'CONFIGURATION_ROLLBACK_COMPLETED',
    resourceType: 'OperationalConfiguration',
    resourceId: `${configurationId}:${activated.version}`,
    status: 'ACTIVE',
    title: 'Configuration rollback completed',
    safeSummary: `A new active version was created from version ${targetVersion}.`,
  });
  return activated;
}

async function listConfigurations(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'configuration.read',
    input,
    caller,
    'OperationalConfiguration',
    'list',
    'SAFE_READ',
  );
  const items = await OperationalConfiguration.find({
    organizationId: scope.organizationId,
    ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
  })
    .sort({ category: 1, version: -1 })
    .limit(500)
    .lean();
  return { items: items.map((item) => ({ ...item, values: redactSecrets(item.values) })) };
}

async function evaluateFeature(input = {}) {
  const organizationId = idOf(input.organizationId || input.partnerId);
  const workspaceId = clean(input.workspaceId, 128) || undefined;
  const feature = clean(input.feature, 128);
  const configurations = await OperationalConfiguration.find({
    organizationId,
    category: 'FEATURE_AVAILABILITY',
    status: 'ACTIVE',
    $or: [{ workspaceId }, { workspaceId: { $exists: false } }],
  })
    .sort({ workspaceId: -1, version: -1 })
    .lean();
  for (const configuration of configurations) {
    if (Object.hasOwn(configuration.values?.flags || {}, feature))
      return {
        enabled: configuration.values.flags[feature] === true,
        sourceVersion: configuration.version,
        safeDefault: false,
      };
  }
  return { enabled: false, sourceVersion: null, safeDefault: true };
}

function safeReferenceList(values, maximum = 100) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : []).map((value) => clean(value, 128)).filter(Boolean),
    ),
  ].slice(0, maximum);
}

async function createIncident(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'incident.create',
    input,
    caller,
    'OperationalIncident',
    'new',
    'MUTATION',
  );
  const severity = clean(input.severity, 32).toUpperCase();
  if (
    !INCIDENT_SEVERITIES.includes(severity) ||
    !clean(input.title, 200) ||
    !clean(input.safeDescription, 2_000)
  )
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Incident severity, title, and safe description are required.',
    );
  const incident = await OperationalIncident.create({
    incidentId: `inc_${crypto.randomUUID()}`,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    severity,
    category: clean(input.category, 100).toUpperCase() || 'OPERATIONAL',
    title: clean(input.title, 200),
    safeDescription: clean(redactSecrets({ value: input.safeDescription }).value, 2_000),
    status: 'OPEN',
    detectedAt: input.detectedAt ? new Date(input.detectedAt) : new Date(),
    ownerActorId: clean(input.ownerActorId, 128) || undefined,
    affectedScopes: redactSecrets(
      Array.isArray(input.affectedScopes) ? input.affectedScopes.slice(0, 50) : [],
    ),
    relatedAlertIds: safeReferenceList(input.relatedAlertIds),
    traceReferences: safeReferenceList(input.traceReferences),
    invocationReferences: safeReferenceList(input.invocationReferences),
    connectionReferences: safeReferenceList(input.connectionReferences),
    timeline: [
      {
        at: new Date(),
        actorId: scope.actorId,
        action: 'CREATED',
        safeNote: clean(input.timelineNote, 1_000),
        reasonCode: 'INCIDENT_CREATED',
      },
    ],
    revision: 0,
    schemaVersion: 1,
  });
  await auditAdministrative(
    'incident.created',
    'incident.create',
    'OperationalIncident',
    incident.incidentId,
    scope,
    { reasonCode: 'INCIDENT_CREATED', severity },
  );
  metrics.increment('incidents_created', { severity, status: 'OPEN' });
  await notifyAdministrative(scope, {
    type: 'SECURITY_INCIDENT_OPENED',
    resourceType: 'OperationalIncident',
    resourceId: incident.incidentId,
    status: 'OPEN',
    title: 'Security incident opened',
    safeSummary: `${severity} incident: ${incident.title}`,
  });
  if (severity === 'CRITICAL')
    await raiseOperationalAlert(
      scope,
      'critical_security_incident',
      'critical',
      'CRITICAL_SECURITY_INCIDENT',
    );
  return incident;
}

async function listIncidents(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'incident.read',
    input,
    caller,
    'OperationalIncident',
    'list',
    'SAFE_READ',
  );
  const filter = {
    organizationId: scope.organizationId,
    ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
  };
  if (input.status) filter.status = clean(input.status, 32).toUpperCase();
  if (input.severity) filter.severity = clean(input.severity, 32).toUpperCase();
  const items = await OperationalIncident.find(filter).sort({ detectedAt: -1 }).limit(200).lean();
  return { items };
}

async function getIncident(incidentId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'incident.read',
    input,
    caller,
    'OperationalIncident',
    incidentId,
    'SAFE_READ',
  );
  const incident = await OperationalIncident.findOne({
    incidentId,
    organizationId: scope.organizationId,
  }).lean();
  if (!incident) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Incident was not found.');
  return incident;
}

async function updateIncident(incidentId, action, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'incident.manage',
    input,
    caller,
    'OperationalIncident',
    incidentId,
    'MUTATION',
  );
  const normalizedAction = clean(action, 32).toUpperCase();
  const statusByAction = {
    ACKNOWLEDGE: 'ACKNOWLEDGED',
    INVESTIGATE: 'INVESTIGATING',
    MITIGATE: 'MITIGATING',
    MONITOR: 'MONITORING',
    RESOLVE: 'RESOLVED',
    CLOSE: 'CLOSED',
  };
  const nextStatus = statusByAction[normalizedAction];
  if (!nextStatus || !INCIDENT_STATUSES.includes(nextStatus))
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Incident action is invalid.');
  const now = new Date();
  const update = {
    status: nextStatus,
    ...(input.ownerActorId ? { ownerActorId: clean(input.ownerActorId, 128) } : {}),
    ...(nextStatus === 'ACKNOWLEDGED' ? { acknowledgedAt: now } : {}),
    ...(nextStatus === 'MITIGATING' ? { mitigatedAt: now } : {}),
    ...(nextStatus === 'RESOLVED' ? { resolvedAt: now } : {}),
    ...(nextStatus === 'CLOSED' ? { closedAt: now } : {}),
  };
  const incident = await OperationalIncident.findOneAndUpdate(
    { incidentId, organizationId: scope.organizationId, revision: Number(input.expectedRevision) },
    {
      $set: update,
      $push: {
        timeline: {
          at: now,
          actorId: scope.actorId,
          action: normalizedAction,
          safeNote: safeReason(input.note),
          reasonCode: `INCIDENT_${normalizedAction}`,
        },
      },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!incident)
    throw new AppError(409, ErrorCodes.INCIDENT_RESPONSE_FAILED, 'Incident changed concurrently.');
  await auditAdministrative(
    `incident.${normalizedAction.toLowerCase()}`,
    'incident.manage',
    'OperationalIncident',
    incidentId,
    scope,
    { reasonCode: `INCIDENT_${normalizedAction}`, newState: nextStatus },
  );
  return incident;
}

async function respondToIncident(incidentId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'incident.respond',
    input,
    caller,
    'OperationalIncident',
    incidentId,
    'INCIDENT_RESPONSE',
  );
  const incident = await OperationalIncident.findOne({
    incidentId,
    organizationId: scope.organizationId,
  });
  if (!incident) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Incident was not found.');
  const responseAction = clean(input.responseAction, 64).toUpperCase();
  await enforceAdministrativeApproval(
    scope,
    input,
    'incident.respond',
    'OperationalIncident',
    incidentId,
    responseAction,
  );
  let result;
  if (responseAction === 'SUSPEND_ORGANIZATION')
    result = await transitionOrganization(
      'suspending',
      {
        ...input,
        organizationId: scope.organizationId,
        reason: `Incident ${incidentId}: ${safeReason(input.reason)}`,
      },
      caller,
    );
  else if (responseAction === 'SUSPEND_WORKSPACE')
    result = await transitionWorkspace(
      clean(input.targetWorkspaceId || scope.workspaceId, 128),
      'suspending',
      { ...input, reason: `Incident ${incidentId}: ${safeReason(input.reason)}` },
      caller,
    );
  else if (responseAction === 'DISABLE_SERVICE_ACCOUNT')
    result = await transitionServiceAccount(
      clean(input.targetServiceAccountId, 128),
      'disabled',
      input,
      caller,
    );
  else if (responseAction === 'PAUSE_DURABLE_WORK')
    result = await pauseQueuedWork({
      organizationId: scope.organizationId,
      partnerId: scope.partnerId,
      workspaceId: clean(input.targetWorkspaceId || scope.workspaceId, 128),
      reasonCode: 'INCIDENT_RESPONSE_PAUSE',
    });
  else
    throw new AppError(
      400,
      ErrorCodes.INCIDENT_RESPONSE_FAILED,
      'Incident response action is not supported.',
    );
  await OperationalIncident.updateOne(
    { _id: incident._id },
    {
      $push: {
        timeline: {
          at: new Date(),
          actorId: scope.actorId,
          action: responseAction,
          safeNote: safeReason(input.reason),
          reasonCode: 'INCIDENT_RESPONSE_EXECUTED',
        },
      },
      $inc: { revision: 1 },
    },
  );
  await auditAdministrative(
    'incident.response_executed',
    'incident.respond',
    'OperationalIncident',
    incidentId,
    scope,
    {
      reasonCode: 'INCIDENT_RESPONSE_EXECUTED',
      responseAction,
      approvalRequestId: input.approvalRequestId,
    },
  );
  return { responseAction, result, emergencyBypassUsed: false };
}

function normalizeSecurityMetadata(input = {}) {
  const safe = redactSecrets(input);
  const allowlist = [
    'actorType',
    'permission',
    'resourceType',
    'reasonCode',
    'sourceSubsystem',
    'attemptCount',
    'status',
  ];
  return Object.fromEntries(
    allowlist.filter((key) => safe[key] !== undefined).map((key) => [key, safe[key]]),
  );
}

async function recordSecurityEvent(input = {}) {
  const organizationId = idOf(input.organizationId);
  if (!organizationId) return null;
  const type = clean(input.type, 100).toUpperCase();
  const severity = INCIDENT_SEVERITIES.includes(clean(input.severity, 32).toUpperCase())
    ? clean(input.severity, 32).toUpperCase()
    : 'MEDIUM';
  const safeSubjectMetadata = normalizeSecurityMetadata(input.safeSubjectMetadata || {});
  const deduplicationKey = canonicalDigest({
    organizationId,
    workspaceId: clean(input.workspaceId, 128),
    type,
    safeSubjectMetadata,
  });
  const now = new Date();
  const event = await SecurityEvent.findOneAndUpdate(
    { organizationId, deduplicationKey },
    {
      $set: { lastObservedAt: now, severity, status: 'OPEN', safeSubjectMetadata },
      $setOnInsert: {
        securityEventId: `sec_${crypto.randomUUID()}`,
        organizationId,
        workspaceId: clean(input.workspaceId, 128) || undefined,
        type,
        firstObservedAt: now,
        occurrenceCount: 0,
        relatedAuditEventReferences: safeReferenceList(input.relatedAuditEventReferences),
        deduplicationKey,
        schemaVersion: 1,
      },
      $inc: { occurrenceCount: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  metrics.increment('security_events', { category: type, severity });
  return event;
}

async function listSecurityEvents(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'security-event.read',
    input,
    caller,
    'SecurityEvent',
    'list',
    'SAFE_READ',
  );
  const items = await SecurityEvent.find({
    organizationId: scope.organizationId,
    ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
  })
    .sort({ lastObservedAt: -1 })
    .limit(200)
    .lean();
  return { items };
}

async function manageSecurityEvent(securityEventId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'security-event.manage',
    input,
    caller,
    'SecurityEvent',
    securityEventId,
    'MUTATION',
  );
  const status = clean(input.status, 32).toUpperCase();
  if (!['ACKNOWLEDGED', 'RESOLVED'].includes(status))
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Security event status is invalid.');
  const event = await SecurityEvent.findOneAndUpdate(
    { securityEventId, organizationId: scope.organizationId },
    {
      $set: {
        status,
        resolutionMetadata: redactSecrets({
          reasonCode: clean(input.reasonCode, 128),
          safeNote: safeReason(input.note),
          actorId: scope.actorId,
          at: new Date(),
        }),
      },
    },
    { new: true },
  );
  if (!event) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Security event was not found.');
  return event;
}

async function listAdministrativeNotifications(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'operations.admin.read',
    input,
    caller,
    'ComplianceNotification',
    'list',
    'SAFE_READ',
  );
  const filter = {
    organizationId: scope.organizationId,
    ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
  };
  if (input.unread === 'true' || input.unread === true) filter.readAt = { $exists: false };
  const items = await ComplianceNotification.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  return { items };
}

async function markNotificationRead(notificationId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'operations.admin.read',
    input,
    caller,
    'ComplianceNotification',
    notificationId,
    'MUTATION',
  );
  const notification = await ComplianceNotification.findOneAndUpdate(
    { notificationId, organizationId: scope.organizationId },
    { $set: { readAt: new Date() } },
    { new: true },
  );
  if (!notification)
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Administrative notification was not found.');
  return notification;
}

async function createRecovery(input = {}) {
  const organizationId = idOf(input.organizationId);
  const operationId = clean(input.operationId, 200);
  if (!organizationId || !operationId)
    throw new TypeError('Recovery tenant and operation scope are required.');
  return OperationalRecovery.findOneAndUpdate(
    { organizationId, operationId },
    {
      $setOnInsert: {
        recoveryId: `rcv_${crypto.randomUUID()}`,
        organizationId,
        workspaceId: clean(input.workspaceId, 128) || undefined,
        operationType: clean(input.operationType, 100),
        operationId,
        status: 'OPEN',
        lastSuccessfulStage: clean(input.lastSuccessfulStage, 100),
        nextPermittedStage: clean(input.nextPermittedStage, 100),
        retryable: input.retryable === true,
        safeReason: safeReason(input.safeReason),
        traceReferences: safeReferenceList(input.traceReferences),
        auditReferences: safeReferenceList(input.auditReferences),
        revision: 0,
        schemaVersion: 1,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function listRecoveries(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'recovery.read',
    input,
    caller,
    'OperationalRecovery',
    'list',
    'SAFE_READ',
  );
  const items = await OperationalRecovery.find({
    organizationId: scope.organizationId,
    ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
  })
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();
  return { items };
}

async function manageRecovery(recoveryId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'recovery.manage',
    input,
    caller,
    'OperationalRecovery',
    recoveryId,
    'LIFECYCLE_CONTROL',
  );
  const recovery = await OperationalRecovery.findOne({
    recoveryId,
    organizationId: scope.organizationId,
  });
  if (!recovery)
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Operational recovery record was not found.');
  if (input.action === 'RETRY' && !recovery.retryable)
    throw new AppError(
      409,
      ErrorCodes.RECOVERY_ACTION_NOT_SAFE,
      'The recovery action is not proven retry-safe.',
    );
  const status =
    input.action === 'RESOLVE'
      ? 'RESOLVED'
      : input.action === 'ASSIGN'
        ? 'ASSIGNED'
        : 'IN_PROGRESS';
  const updated = await OperationalRecovery.findOneAndUpdate(
    { _id: recovery._id, revision: Number(input.expectedRevision ?? recovery.revision) },
    {
      $set: {
        status,
        assignedOperator: clean(input.assignedOperator || scope.actorId, 128),
        ...(status === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
      },
      $inc: { revision: 1 },
    },
    { new: true },
  );
  if (!updated)
    throw new AppError(
      409,
      ErrorCodes.RECOVERY_ACTION_NOT_SAFE,
      'Recovery record changed concurrently.',
    );
  await auditAdministrative(
    'recovery.action_executed',
    'recovery.manage',
    'OperationalRecovery',
    recoveryId,
    scope,
    { reasonCode: 'RECOVERY_ACTION_EXECUTED', newState: status },
  );
  metrics.increment('recovery_operations', { result: status });
  return updated;
}

async function updateDisasterRecoveryStatus(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'recovery.manage',
    input,
    caller,
    'DisasterRecoveryStatus',
    input.component,
    'MUTATION',
  );
  const status = clean(input.status, 32).toUpperCase();
  if (!DR_PROVIDER_STATUSES.includes(status))
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'DR provider status is invalid.');
  if (status === 'HEALTHY' && !clean(input.source, 128))
    throw new AppError(
      400,
      ErrorCodes.DR_STATUS_UNKNOWN,
      'Healthy DR status requires a configured operational source.',
    );
  const component = clean(input.component, 100);
  const record = await DisasterRecoveryStatus.findOneAndUpdate(
    { organizationId: scope.organizationId, workspaceId: scope.workspaceId, component },
    {
      $set: {
        drStatusId: `drs_${canonicalDigest({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, component }).slice(-32)}`,
        status,
        source: clean(input.source, 128) || 'NOT_CONFIGURED',
        observedAt: new Date(input.observedAt || Date.now()),
        lastSuccessfulRestoreDrillAt: input.lastSuccessfulRestoreDrillAt
          ? new Date(input.lastSuccessfulRestoreDrillAt)
          : undefined,
        recoveryPointObjectiveMinutes: input.recoveryPointObjectiveMinutes,
        recoveryTimeObjectiveMinutes: input.recoveryTimeObjectiveMinutes,
        safeMetadata: normalizeSecurityMetadata(input.safeMetadata || {}),
        updatedBy: scope.actorId,
        schemaVersion: 1,
      },
      $inc: { revision: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await auditAdministrative(
    'dr_status.updated',
    'recovery.manage',
    'DisasterRecoveryStatus',
    component,
    scope,
    { reasonCode: 'DR_STATUS_UPDATED', newState: status },
  );
  metrics.increment('dr_status_updates', { status });
  if (['FAILED', 'UNKNOWN'].includes(status))
    await raiseOperationalAlert(
      scope,
      'dr_status_requires_attention',
      status === 'FAILED' ? 'critical' : 'warning',
      `DR_STATUS_${status}`,
    );
  return record;
}

async function listDisasterRecoveryStatus(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'dr-status.read',
    input,
    caller,
    'DisasterRecoveryStatus',
    'list',
    'SAFE_READ',
  );
  const items = await DisasterRecoveryStatus.find({
    organizationId: scope.organizationId,
    ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
  })
    .sort({ component: 1 })
    .lean();
  const components = [
    'DATABASE_BACKUP',
    'RESTORE_DRILL',
    'WORKER_RECOVERY',
    'ENCRYPTION_KEY_AVAILABILITY',
    'EXTERNAL_AGENT_CONFIGURATION',
    'EVIDENCE_STORAGE',
  ];
  const byComponent = new Map(items.map((item) => [item.component, item]));
  return {
    items: components.map(
      (component) =>
        byComponent.get(component) || {
          component,
          status: 'NOT_CONFIGURED',
          source: 'NOT_CONFIGURED',
          fabricated: false,
        },
    ),
    atlasBackupsConfiguredByGhostBridge: false,
  };
}

function serializeTenantExport(recordInput) {
  const record = typeof recordInput?.toObject === 'function' ? recordInput.toObject() : recordInput;
  return {
    tenantExportId: record.tenantExportId,
    organizationId: record.organizationId,
    workspaceId: record.workspaceId,
    requestedBy: record.requestedBy,
    status: record.status,
    includedCategories: record.includedCategories || [],
    recordCounts: record.recordCounts || {},
    manifestDigest: record.manifestDigest,
    downloadExpiresAt: record.downloadExpiresAt,
    failureReasonCode: record.failureReasonCode,
    requestedAt: record.requestedAt,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    cancelledAt: record.cancelledAt,
  };
}

async function createTenantExport(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'tenant-export.create',
    input,
    caller,
    'TenantDataExport',
    'new',
    'MUTATION',
  );
  await enforceAdministrativeApproval(
    scope,
    input,
    'tenant-export.create',
    'TenantDataExport',
    `tenant-export:${scope.organizationId}`,
    'TENANT_DATA_EXPORT',
  );
  const record = await TenantDataExport.create({
    tenantExportId: `tex_${crypto.randomUUID()}`,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    requestedBy: scope.actorId,
    status: 'PENDING',
    includedCategories: [
      'organization',
      'workspaces',
      'memberships',
      'serviceAccounts',
      'teams',
      'passports',
      'connections',
      'invocations',
      'policies',
      'approvals',
      'configuration',
      'incidents',
      'evidenceReferences',
    ],
    approvalRequestId: input.approvalRequestId,
    requestedAt: new Date(),
    revision: 0,
    schemaVersion: 1,
  });
  await auditAdministrative(
    'tenant_export.created',
    'tenant-export.create',
    'TenantDataExport',
    record.tenantExportId,
    scope,
    { reasonCode: 'TENANT_EXPORT_CREATED', approvalRequestId: input.approvalRequestId },
  );
  metrics.increment('tenant_exports', { status: 'PENDING' });
  if (input.defer !== true)
    setImmediate(() => processTenantExport(record.tenantExportId).catch(() => undefined));
  return serializeTenantExport(record);
}

function safeTenantExportDocument(document, fields) {
  const source = typeof document?.toObject === 'function' ? document.toObject() : document;
  return Object.fromEntries(
    fields
      .filter((field) => source?.[field] !== undefined)
      .map((field) => [field, redactSecrets(source[field])]),
  );
}

async function collectTenantExportData(record) {
  const organizationId = record.organizationId;
  const partnerFilter = mongoose.isValidObjectId(organizationId)
    ? { partnerId: organizationId }
    : { _id: null };
  const workspaceFilter = record.workspaceId ? { externalWorkspaceId: record.workspaceId } : {};
  const [
    organization,
    workspaces,
    users,
    accounts,
    teams,
    passports,
    connections,
    invocations,
    policies,
    approvals,
    configurations,
    incidents,
    evidenceExports,
  ] = await Promise.all([
    Organization.findOne(partnerFilter).lean(),
    Workspace.find({ ...partnerFilter, ...workspaceFilter })
      .limit(MAX_EXPORT_RECORDS_PER_CATEGORY)
      .lean(),
    EnterpriseUser.find({
      ...partnerFilter,
      ...(record.workspaceId ? { externalWorkspaceIds: record.workspaceId } : {}),
    })
      .limit(MAX_EXPORT_RECORDS_PER_CATEGORY)
      .lean(),
    ServiceAccount.find({ ...partnerFilter, ...workspaceFilter })
      .limit(MAX_EXPORT_RECORDS_PER_CATEGORY)
      .lean(),
    Team.find({ ...partnerFilter, ...workspaceFilter })
      .limit(MAX_EXPORT_RECORDS_PER_CATEGORY)
      .lean(),
    AgentPassport.find(partnerFilter).limit(MAX_EXPORT_RECORDS_PER_CATEGORY).lean(),
    PassportConnection.find({
      ...partnerFilter,
      ...(record.workspaceId ? { receivingWorkspaceId: record.workspaceId } : {}),
    })
      .limit(MAX_EXPORT_RECORDS_PER_CATEGORY)
      .lean(),
    Invocation.find({
      $or: [
        { organizationId },
        ...(mongoose.isValidObjectId(organizationId) ? [{ partnerId: organizationId }] : []),
      ],
      ...(record.workspaceId ? { receivingWorkspaceId: record.workspaceId } : {}),
    })
      .limit(MAX_EXPORT_RECORDS_PER_CATEGORY)
      .lean(),
    Policy.find({
      organizationId,
      ...(record.workspaceId ? { workspaceId: record.workspaceId } : {}),
    })
      .limit(MAX_EXPORT_RECORDS_PER_CATEGORY)
      .lean(),
    ApprovalRequest.find({
      organizationId,
      ...(record.workspaceId ? { workspaceId: record.workspaceId } : {}),
    })
      .limit(MAX_EXPORT_RECORDS_PER_CATEGORY)
      .lean(),
    OperationalConfiguration.find({
      organizationId,
      ...(record.workspaceId ? { workspaceId: record.workspaceId } : {}),
    })
      .limit(MAX_EXPORT_RECORDS_PER_CATEGORY)
      .lean(),
    OperationalIncident.find({
      organizationId,
      ...(record.workspaceId ? { workspaceId: record.workspaceId } : {}),
    })
      .limit(MAX_EXPORT_RECORDS_PER_CATEGORY)
      .lean(),
    EvidenceExport.find({
      organizationId,
      ...(record.workspaceId ? { workspaceId: record.workspaceId } : {}),
    })
      .limit(MAX_EXPORT_RECORDS_PER_CATEGORY)
      .lean(),
  ]);
  return {
    organization: organization
      ? safeTenantExportDocument(organization, [
          '_id',
          'name',
          'slug',
          'status',
          'createdAt',
          'updatedAt',
        ])
      : null,
    workspaces: workspaces.map((item) =>
      safeTenantExportDocument(item, [
        '_id',
        'externalWorkspaceId',
        'name',
        'slug',
        'environment',
        'status',
        'createdAt',
        'updatedAt',
      ]),
    ),
    memberships: users.map((item) =>
      safeTenantExportDocument(item, [
        '_id',
        'externalUserId',
        'email',
        'displayName',
        'externalWorkspaceIds',
        'roleBindings',
        'status',
        'createdAt',
        'updatedAt',
      ]),
    ),
    serviceAccounts: accounts.map((item) =>
      safeTenantExportDocument(item, [
        '_id',
        'name',
        'keyId',
        'externalWorkspaceId',
        'roleBindings',
        'status',
        'expiresAt',
        'lastUsedAt',
        'createdAt',
        'updatedAt',
      ]),
    ),
    teams: teams.map((item) =>
      safeTenantExportDocument(item, [
        '_id',
        'name',
        'slug',
        'externalWorkspaceId',
        'memberUserIds',
        'status',
        'createdAt',
        'updatedAt',
      ]),
    ),
    passports: passports.map((item) =>
      safeTenantExportDocument(item, [
        '_id',
        'partnerAgentId',
        'name',
        'description',
        'status',
        'version',
        'createdAt',
        'updatedAt',
      ]),
    ),
    connections: connections.map((item) =>
      safeTenantExportDocument(item, [
        '_id',
        'passportId',
        'receivingWorkspaceId',
        'receivingUserId',
        'runtimeType',
        'status',
        'healthStatus',
        'createdAt',
        'updatedAt',
      ]),
    ),
    invocations: invocations.map((item) =>
      safeTenantExportDocument(item, [
        '_id',
        'connectionId',
        'receivingWorkspaceId',
        'capability',
        'status',
        'lifecycleState',
        'retryState',
        'cancellationState',
        'recoveryState',
        'createdAt',
        'updatedAt',
      ]),
    ),
    policies: policies.map((item) =>
      safeTenantExportDocument(item, [
        'stablePolicyId',
        'version',
        'name',
        'status',
        'effect',
        'target',
        'createdAt',
        'updatedAt',
      ]),
    ),
    approvals: approvals.map((item) =>
      safeTenantExportDocument(item, [
        'approvalRequestId',
        'workflowId',
        'workflowVersion',
        'requesterActorId',
        'permission',
        'resourceType',
        'resourceId',
        'status',
        'requestedAt',
        'expiresAt',
      ]),
    ),
    configuration: configurations.map((item) =>
      safeTenantExportDocument(item, [
        'configurationId',
        'version',
        'category',
        'name',
        'values',
        'valuesDigest',
        'status',
        'createdAt',
        'updatedAt',
      ]),
    ),
    incidents: incidents.map((item) =>
      safeTenantExportDocument(item, [
        'incidentId',
        'severity',
        'category',
        'title',
        'safeDescription',
        'status',
        'detectedAt',
        'resolvedAt',
        'timeline',
      ]),
    ),
    evidenceReferences: evidenceExports.map((item) =>
      safeTenantExportDocument(item, [
        'evidenceExportId',
        'status',
        'eventCount',
        'packageDigest',
        'completedAt',
      ]),
    ),
  };
}

async function processTenantExport(tenantExportId) {
  let record = await TenantDataExport.findOneAndUpdate(
    { tenantExportId, status: 'PENDING' },
    { $set: { status: 'RUNNING', startedAt: new Date() }, $inc: { revision: 1 } },
    { new: true },
  );
  if (!record) return null;
  try {
    const data = await collectTenantExportData(record);
    record = await TenantDataExport.findOneAndUpdate(
      { _id: record._id, status: 'RUNNING' },
      { $set: { status: 'FINALIZING' }, $inc: { revision: 1 } },
      { new: true },
    );
    if (!record) return null;
    const recordCounts = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.length : value ? 1 : 0,
      ]),
    );
    const packageBody = {
      packageVersion: 1,
      tenantExportId,
      organizationId: record.organizationId,
      workspaceId: record.workspaceId,
      generatedAt: new Date().toISOString(),
      redaction: {
        secretsExcluded: true,
        ciphertextExcluded: true,
        privateInvocationPayloadsExcluded: true,
      },
      recordCounts,
      data,
    };
    const manifestDigest = canonicalDigest(packageBody);
    const directory = path.join(EXPORT_ROOT, tenantExportId);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(
      path.join(directory, 'tenant-export.json'),
      `${JSON.stringify({ ...packageBody, manifestDigest }, null, 2)}\n`,
      { flag: 'wx', mode: 0o600 },
    );
    record = await TenantDataExport.findOneAndUpdate(
      { _id: record._id, status: 'FINALIZING' },
      {
        $set: {
          status: 'COMPLETED',
          completedAt: new Date(),
          recordCounts,
          manifestDigest,
          storageKey: tenantExportId,
        },
        $inc: { revision: 1 },
      },
      { new: true },
    );
    metrics.increment('tenant_exports', { status: 'COMPLETED' });
    await notifyAdministrative(
      { organizationId: record.organizationId, workspaceId: record.workspaceId },
      {
        type: 'TENANT_EXPORT_COMPLETED',
        resourceType: 'TenantDataExport',
        resourceId: tenantExportId,
        status: 'COMPLETED',
        title: 'Tenant export completed',
        safeSummary:
          'The redacted tenant data export is ready for short-lived authorized download.',
      },
    );
    return serializeTenantExport(record);
  } catch (error) {
    await TenantDataExport.updateOne(
      { _id: record._id, status: { $in: ['RUNNING', 'FINALIZING'] } },
      {
        $set: { status: 'FAILED', failureReasonCode: 'TENANT_EXPORT_FAILED' },
        $inc: { revision: 1 },
      },
    );
    metrics.increment('tenant_exports', { status: 'FAILED' });
    await raiseOperationalAlert(
      { organizationId: record.organizationId, workspaceId: record.workspaceId },
      'tenant_export_failure',
      'warning',
      'TENANT_EXPORT_FAILED',
    );
    throw error;
  }
}

async function listTenantExports(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'tenant-export.read',
    input,
    caller,
    'TenantDataExport',
    'list',
    'SAFE_READ',
  );
  const items = await TenantDataExport.find({
    organizationId: scope.organizationId,
    ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
  })
    .sort({ requestedAt: -1 })
    .limit(100)
    .lean();
  return { items: items.map(serializeTenantExport) };
}

async function getTenantExport(tenantExportId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'tenant-export.read',
    input,
    caller,
    'TenantDataExport',
    tenantExportId,
    'SAFE_READ',
  );
  const record = await TenantDataExport.findOne({
    tenantExportId,
    organizationId: scope.organizationId,
  }).lean();
  if (!record) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Tenant export was not found.');
  return serializeTenantExport(record);
}

async function cancelTenantExport(tenantExportId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'tenant-export.create',
    input,
    caller,
    'TenantDataExport',
    tenantExportId,
    'MUTATION',
  );
  const record = await TenantDataExport.findOneAndUpdate(
    {
      tenantExportId,
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
      'Tenant export cannot be cancelled after finalization starts.',
    );
  return serializeTenantExport(record);
}

async function issueTenantExportDownload(tenantExportId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'tenant-export.download',
    input,
    caller,
    'TenantDataExport',
    tenantExportId,
    'SAFE_READ',
  );
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1_000);
  const record = await TenantDataExport.findOneAndUpdate(
    { tenantExportId, organizationId: scope.organizationId, status: 'COMPLETED' },
    {
      $set: { downloadTokenHash: sha256(rawToken), downloadExpiresAt: expiresAt },
      $inc: { revision: 1 },
    },
    { new: true },
  );
  if (!record)
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Completed tenant export was not found.');
  return { tenantExportId, downloadToken: rawToken, expiresAt };
}

async function readTenantExportFile(tenantExportId, token, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'tenant-export.download',
    input,
    caller,
    'TenantDataExport',
    tenantExportId,
    'SAFE_READ',
  );
  const query = TenantDataExport.findOne({
    tenantExportId,
    organizationId: scope.organizationId,
    status: 'COMPLETED',
    downloadExpiresAt: { $gt: new Date() },
  }).select('+storageKey +downloadTokenHash');
  const record = await query.lean();
  if (!record || record.downloadTokenHash !== sha256(token || ''))
    throw new AppError(
      403,
      ErrorCodes.AUTHORIZATION_DENIED,
      'Tenant export download authorization is invalid or expired.',
    );
  return {
    fileName: `${tenantExportId}.json`,
    data: await fs.readFile(path.join(EXPORT_ROOT, record.storageKey, 'tenant-export.json')),
  };
}

async function tenantDeletionPreview(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'tenant-deletion.read',
    input,
    caller,
    'TenantDeletionJob',
    input.deletionJobId || 'preview',
    'DELETION_CONTROL',
  );
  const now = new Date();
  const [
    legalHolds,
    retentionPolicies,
    activeWork,
    activeEvidenceExports,
    activeTenantExports,
    unresolvedIncidents,
    workspaces,
    users,
    accounts,
    connections,
    invocations,
  ] = await Promise.all([
    LegalHold.countDocuments({
      organizationId: scope.organizationId,
      status: 'ACTIVE',
      effectiveFrom: { $lte: now },
      $or: [
        { effectiveUntil: { $exists: false } },
        { effectiveUntil: null },
        { effectiveUntil: { $gt: now } },
      ],
    }),
    RetentionPolicy.countDocuments({ organizationId: scope.organizationId, status: 'ACTIVE' }),
    RuntimeWorkItem.countDocuments({
      partnerId: scope.partnerId,
      status: { $in: ACTIVE_WORK_STATUSES },
    }),
    EvidenceExport.countDocuments({
      organizationId: scope.organizationId,
      status: { $in: ['PENDING', 'RUNNING', 'FINALIZING', 'COMPLETED'] },
      $or: [{ expiresAt: { $gt: now } }, { expiresAt: { $exists: false } }],
    }),
    TenantDataExport.countDocuments({
      organizationId: scope.organizationId,
      status: { $in: ['PENDING', 'RUNNING', 'FINALIZING', 'COMPLETED'] },
      $or: [{ expiresAt: { $gt: now } }, { expiresAt: { $exists: false } }],
    }),
    OperationalIncident.countDocuments({
      organizationId: scope.organizationId,
      status: { $in: ACTIVE_INCIDENT_STATUSES },
    }),
    Workspace.countDocuments({ partnerId: scope.partnerId }),
    EnterpriseUser.countDocuments({ partnerId: scope.partnerId }),
    ServiceAccount.countDocuments({ partnerId: scope.partnerId }),
    PassportConnection.countDocuments({ partnerId: scope.partnerId }),
    Invocation.countDocuments({
      $or: [{ organizationId: scope.organizationId }, { partnerId: scope.partnerId }],
    }),
  ]);
  const activeExports = activeEvidenceExports + activeTenantExports;
  const blockers = [
    ...(legalHolds
      ? [{ reasonCode: ErrorCodes.TENANT_DELETION_LEGAL_HOLD_BLOCK, count: legalHolds }]
      : []),
    ...(retentionPolicies
      ? [{ reasonCode: ErrorCodes.TENANT_DELETION_RETENTION_BLOCK, count: retentionPolicies }]
      : []),
    ...(activeWork
      ? [{ reasonCode: ErrorCodes.TENANT_DELETION_ACTIVE_WORK_BLOCK, count: activeWork }]
      : []),
    ...(activeExports
      ? [{ reasonCode: 'TENANT_DELETION_ACTIVE_EXPORT_BLOCK', count: activeExports }]
      : []),
    ...(unresolvedIncidents
      ? [{ reasonCode: 'TENANT_DELETION_UNRESOLVED_INCIDENT_BLOCK', count: unresolvedIncidents }]
      : []),
  ];
  return {
    dryRun: true,
    deleted: 0,
    organizationId: scope.organizationId,
    blocking: blockers.length > 0,
    blockers,
    affected: {
      workspaces,
      memberships: users,
      serviceAccounts: accounts,
      connections,
      invocations,
      activeWork,
    },
    legalHoldsPreserved: true,
    evidencePreserved: true,
    confirmationText: `DELETE ${scope.organizationId}`,
    operationFingerprint: canonicalDigest({
      organizationId: scope.organizationId,
      blockers,
      affected: { workspaces, users, accounts, connections, invocations },
    }),
  };
}

async function requestTenantDeletion(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'tenant-deletion.request',
    input,
    caller,
    'TenantDeletionJob',
    'new',
    'DELETION_CONTROL',
  );
  const expectedConfirmation = `DELETE ${scope.organizationId}`;
  if (input.confirmationText !== expectedConfirmation)
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Tenant deletion confirmation text does not match.',
    );
  const preview = await tenantDeletionPreview(input, caller);
  const operationId =
    clean(input.operationId, 200) ||
    canonicalDigest({
      organizationId: scope.organizationId,
      confirmationText: input.confirmationText,
      reason: safeReason(input.reason),
    });
  const existing = await TenantDeletionJob.findOne({
    organizationId: scope.organizationId,
    operationId,
  }).lean();
  if (existing) return existing;
  const status = preview.blocking ? 'BLOCKED' : 'REQUESTED';
  const job = await TenantDeletionJob.create({
    deletionJobId: `del_${crypto.randomUUID()}`,
    operationId,
    organizationId: scope.organizationId,
    requestedBy: scope.actorId,
    status,
    safeReason: safeReason(input.reason),
    confirmationDigest: canonicalDigest({ confirmationText: input.confirmationText }),
    preview,
    blockers: preview.blockers,
    deletionSteps: [],
    requestedAt: new Date(),
    revision: 0,
    schemaVersion: 1,
  });
  await auditAdministrative(
    preview.blocking ? 'tenant_deletion.blocked' : 'tenant_deletion.requested',
    'tenant-deletion.request',
    'TenantDeletionJob',
    job.deletionJobId,
    scope,
    {
      reasonCode: preview.blocking ? 'TENANT_DELETION_BLOCKED' : 'TENANT_DELETION_REQUESTED',
      operationId,
    },
  );
  if (preview.blocking)
    await notifyAdministrative(scope, {
      type: 'DELETION_REQUEST_BLOCKED',
      resourceType: 'TenantDeletionJob',
      resourceId: job.deletionJobId,
      status: 'BLOCKED',
      title: 'Tenant deletion blocked',
      safeSummary: 'Legal hold, retention, active work, exports, or incidents block deletion.',
    });
  metrics.increment('tenant_deletion_jobs', { status });
  return job;
}

async function approveTenantDeletion(deletionJobId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'tenant-deletion.approve',
    input,
    caller,
    'TenantDeletionJob',
    deletionJobId,
    'DELETION_CONTROL',
  );
  const job = await TenantDeletionJob.findOne({
    deletionJobId,
    organizationId: scope.organizationId,
  });
  if (!job) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Tenant deletion job was not found.');
  const preview = await tenantDeletionPreview({ ...input, deletionJobId }, caller);
  if (preview.blocking) {
    await TenantDeletionJob.updateOne(
      { _id: job._id },
      { $set: { status: 'BLOCKED', blockers: preview.blockers, preview }, $inc: { revision: 1 } },
    );
    throw new AppError(
      409,
      preview.blockers[0].reasonCode,
      'Tenant deletion remains blocked.',
      preview.blockers,
    );
  }
  await enforceAdministrativeApproval(
    scope,
    input,
    'tenant-deletion.approve',
    'TenantDeletionJob',
    deletionJobId,
    'TENANT_DELETION_APPROVAL',
  );
  const updated = await TenantDeletionJob.findOneAndUpdate(
    {
      _id: job._id,
      status: { $in: ['REQUESTED', 'APPROVAL_PENDING', 'BLOCKED'] },
      revision: Number(input.expectedRevision ?? job.revision),
    },
    {
      $set: {
        status: 'SCHEDULED',
        approvedBy: scope.actorId,
        approvalRequestId: input.approvalRequestId,
        scheduledAt: new Date(),
        blockers: [],
        preview,
      },
      $inc: { revision: 1 },
    },
    { new: true },
  );
  if (!updated)
    throw new AppError(
      409,
      ErrorCodes.OPERATIONAL_STATE_INCONSISTENT,
      'Tenant deletion approval conflict.',
    );
  return updated;
}

async function deleteTenantExportPackages(scope) {
  const records = await TenantDataExport.find({ organizationId: scope.organizationId })
    .select('+storageKey')
    .lean();
  const rootPrefix = `${EXPORT_ROOT}${path.sep}`;
  for (const record of records) {
    if (!record.storageKey) continue;
    const target = path.resolve(EXPORT_ROOT, record.storageKey);
    if (!target.startsWith(rootPrefix)) {
      throw new AppError(
        500,
        ErrorCodes.TENANT_DELETION_RECOVERY_REQUIRED,
        'Tenant export storage scope is invalid.',
      );
    }
    await fs.rm(target, { recursive: true, force: true });
  }
  return TenantDataExport.deleteMany({ organizationId: scope.organizationId });
}

const DELETION_COLLECTIONS = Object.freeze([
  {
    name: 'runtimeCapacitySlots',
    model: RuntimeCapacitySlot,
    filter: (scope) => ({ connectionId: { $in: scope.connectionIds } }),
  },
  {
    name: 'circuitBreakers',
    model: CircuitBreaker,
    filter: (scope) => ({ connectionId: { $in: scope.connectionIds } }),
  },
  {
    name: 'durableEventOutbox',
    model: DurableEventOutbox,
    filter: (scope) => ({ partnerId: scope.partnerId }),
  },
  {
    name: 'invocationAttempts',
    model: InvocationAttempt,
    filter: (scope) => ({ partnerId: scope.partnerId }),
  },
  {
    name: 'credentials',
    model: Credential,
    filter: (scope) => ({ partnerId: scope.partnerId }),
  },
  {
    name: 'credentialLeases',
    model: CredentialLease,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'credentialRotationAttempts',
    model: CredentialRotationAttempt,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'credentialBindings',
    model: CredentialBinding,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'secretVersions',
    model: SecretVersion,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'governedSecrets',
    model: GovernedSecret,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'encryptionRewrapJobs',
    model: EncryptionRewrapJob,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'capabilities',
    model: Capability,
    filter: (scope) => ({ passportId: { $in: scope.passportIds } }),
  },
  {
    name: 'passportInstallKeys',
    model: PassportInstallKey,
    filter: (scope) => ({ partnerId: scope.partnerId }),
  },
  {
    name: 'roles',
    model: Role,
    filter: (scope) => ({ partnerId: scope.partnerId }),
  },
  {
    name: 'policies',
    model: Policy,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'policyRevision',
    model: PolicyRevision,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'maintenanceWindows',
    model: MaintenanceWindow,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'operationalAlerts',
    model: OperationalAlert,
    filter: (scope) => ({ partnerId: scope.partnerId }),
  },
  {
    name: 'tenantExportPackages',
    execute: deleteTenantExportPackages,
  },
  {
    name: 'accessReviewItems',
    model: AccessReviewItem,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'accessReviewCampaigns',
    model: AccessReviewCampaign,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'operationalConfigurations',
    model: OperationalConfiguration,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'operationalIncidents',
    model: OperationalIncident,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'disasterRecoveryStatuses',
    model: DisasterRecoveryStatus,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'securityEvents',
    model: SecurityEvent,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'administrativeNotifications',
    model: ComplianceNotification,
    filter: (scope) => ({ organizationId: scope.organizationId }),
  },
  {
    name: 'runtimeWorkItems',
    model: RuntimeWorkItem,
    filter: (scope) => ({ partnerId: scope.partnerId }),
  },
  {
    name: 'invocations',
    model: Invocation,
    filter: (scope) => ({
      $or: [{ organizationId: scope.organizationId }, { partnerId: scope.partnerId }],
    }),
  },
  {
    name: 'connections',
    model: PassportConnection,
    filter: (scope) => ({ partnerId: scope.partnerId }),
  },
  { name: 'passports', model: AgentPassport, filter: (scope) => ({ partnerId: scope.partnerId }) },
  { name: 'teams', model: Team, filter: (scope) => ({ partnerId: scope.partnerId }) },
  {
    name: 'serviceAccounts',
    model: ServiceAccount,
    filter: (scope) => ({ partnerId: scope.partnerId }),
  },
  {
    name: 'enterpriseUsers',
    model: EnterpriseUser,
    filter: (scope) => ({ partnerId: scope.partnerId }),
  },
  { name: 'workspaces', model: Workspace, filter: (scope) => ({ partnerId: scope.partnerId }) },
]);

async function executeTenantDeletion(deletionJobId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'tenant-deletion.execute',
    input,
    caller,
    'TenantDeletionJob',
    deletionJobId,
    'DELETION_CONTROL',
  );
  if (input.confirm !== true)
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Explicit tenant deletion execution confirmation is required.',
    );
  let job = await TenantDeletionJob.findOne({
    deletionJobId,
    organizationId: scope.organizationId,
  });
  if (!job) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Tenant deletion job was not found.');
  if (job.status === 'COMPLETED') return { job, idempotentReplay: true };
  if (!['SCHEDULED', 'RECOVERY_REQUIRED'].includes(job.status))
    throw new AppError(
      409,
      ErrorCodes.OPERATIONAL_STATE_INCONSISTENT,
      'Tenant deletion job is not executable.',
    );
  const preview = await tenantDeletionPreview({ ...input, deletionJobId }, caller);
  if (preview.blocking) {
    job = await TenantDeletionJob.findOneAndUpdate(
      { _id: job._id },
      { $set: { status: 'BLOCKED', blockers: preview.blockers, preview }, $inc: { revision: 1 } },
      { new: true },
    );
    throw new AppError(
      409,
      preview.blockers[0].reasonCode,
      'Tenant deletion is blocked.',
      preview.blockers,
    );
  }
  await enforceAdministrativeApproval(
    scope,
    input,
    'tenant-deletion.execute',
    'TenantDeletionJob',
    deletionJobId,
    'TENANT_DELETION_EXECUTION',
  );
  const [passportIds, connectionIds] = await Promise.all([
    AgentPassport.find({ partnerId: scope.partnerId }).distinct('_id'),
    PassportConnection.find({ partnerId: scope.partnerId }).distinct('_id'),
  ]);
  const deletionScope = { ...scope, passportIds, connectionIds };
  await Organization.updateOne(
    { partnerId: scope.partnerId },
    {
      $set: { status: 'deletion_in_progress', lifecycleChangedAt: new Date() },
      $inc: { lifecycleRevision: 1 },
    },
  );
  await pauseQueuedWork({
    organizationId: scope.organizationId,
    partnerId: scope.partnerId,
    reasonCode: 'ORGANIZATION_DELETION_PENDING',
  });
  job = await TenantDeletionJob.findOneAndUpdate(
    { _id: job._id, status: { $in: ['SCHEDULED', 'RECOVERY_REQUIRED'] } },
    { $set: { status: 'DELETING', startedAt: job.startedAt || new Date() }, $inc: { revision: 1 } },
    { new: true },
  );
  try {
    const completedNames = new Set(
      (job.deletionSteps || [])
        .filter((step) => step.status === 'COMPLETED')
        .map((step) => step.collectionName),
    );
    for (const step of DELETION_COLLECTIONS) {
      if (completedNames.has(step.name)) continue;
      if (step.execute) {
        const result = await step.execute(deletionScope);
        await TenantDeletionJob.updateOne(
          { _id: job._id },
          {
            $push: {
              deletionSteps: {
                collectionName: step.name,
                status: 'COMPLETED',
                deletedCount: result.deletedCount,
                completedAt: new Date(),
              },
            },
            $set: { lastCompletedStage: step.name },
            $inc: { revision: 1 },
          },
        );
        continue;
      }
      const filter = step.filter(deletionScope);
      if (!filter || Object.keys(filter).length === 0)
        throw new AppError(
          500,
          ErrorCodes.TENANT_DELETION_RECOVERY_REQUIRED,
          'Destructive tenant scope is missing.',
        );
      const result = await step.model.deleteMany(filter);
      await TenantDeletionJob.updateOne(
        { _id: job._id },
        {
          $push: {
            deletionSteps: {
              collectionName: step.name,
              status: 'COMPLETED',
              deletedCount: result.deletedCount,
              completedAt: new Date(),
            },
          },
          $set: { lastCompletedStage: step.name },
          $inc: { revision: 1 },
        },
      );
    }
    await Organization.updateOne(
      { partnerId: scope.partnerId },
      {
        $set: { status: 'deleted', deletedAt: new Date(), lifecycleChangedAt: new Date() },
        $inc: { lifecycleRevision: 1 },
      },
    );
    await TenantDeletionTombstone.findOneAndUpdate(
      { organizationId: scope.organizationId },
      {
        $setOnInsert: {
          organizationId: scope.organizationId,
          deletionJobId,
          deletionCompletedAt: new Date(),
          safeReason: job.safeReason,
          evidenceReferences: [],
          deletionSchemaVersion: 1,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    job = await TenantDeletionJob.findOneAndUpdate(
      { _id: job._id },
      {
        $set: { status: 'COMPLETED', completedAt: new Date(), lastCompletedStage: 'tombstone' },
        $inc: { revision: 1 },
      },
      { new: true },
    );
    await auditAdministrative(
      'tenant_deletion.completed',
      'tenant-deletion.execute',
      'TenantDeletionJob',
      deletionJobId,
      scope,
      { reasonCode: 'TENANT_DELETION_COMPLETED', operationId: job.operationId },
    );
    await notifyAdministrative(scope, {
      type: 'TENANT_DELETION_COMPLETED',
      resourceType: 'TenantDeletionJob',
      resourceId: deletionJobId,
      status: 'COMPLETED',
      title: 'Tenant deletion completed',
      safeSummary: 'Governed tenant deletion completed and a secret-free tombstone was retained.',
    });
    metrics.increment('tenant_deletion_jobs', { status: 'COMPLETED' });
    return { job, tombstoneContainsSecrets: false, evidencePreserved: true };
  } catch (error) {
    await TenantDeletionJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: 'RECOVERY_REQUIRED',
          failureReasonCode: error.code || 'TENANT_DELETION_RECOVERY_REQUIRED',
        },
        $inc: { revision: 1 },
      },
    );
    await createRecovery({
      organizationId: scope.organizationId,
      operationId: job.operationId,
      operationType: 'TENANT_DELETION',
      lastSuccessfulStage: job.lastCompletedStage,
      nextPermittedStage: 'RESUME_COLLECTION_DELETION',
      retryable: true,
      safeReason: 'Tenant deletion stopped after a bounded collection step.',
    });
    await raiseOperationalAlert(
      scope,
      'tenant_deletion_partial_failure',
      'critical',
      error.code || 'TENANT_DELETION_RECOVERY_REQUIRED',
    );
    throw error;
  }
}

async function getTenantDeletion(deletionJobId, input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'tenant-deletion.read',
    input,
    caller,
    'TenantDeletionJob',
    deletionJobId,
    'DELETION_CONTROL',
  );
  const job = await TenantDeletionJob.findOne({
    deletionJobId,
    organizationId: scope.organizationId,
  }).lean();
  if (!job) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Tenant deletion job was not found.');
  const tombstone =
    job.status === 'COMPLETED'
      ? await TenantDeletionTombstone.findOne({ organizationId: scope.organizationId }).lean()
      : null;
  return { job, tombstone };
}

async function resumeAdministrativeJobs() {
  const now = new Date();
  await MaintenanceWindow.updateMany(
    { status: { $in: ['ACTIVE', 'SCHEDULED'] }, endsAt: { $lte: now } },
    { $set: { status: 'EXPIRED', releasedAt: now }, $inc: { revision: 1 } },
  );
  await MaintenanceWindow.updateMany(
    {
      status: 'SCHEDULED',
      startsAt: { $lte: now },
      $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gt: now } }],
    },
    { $set: { status: 'ACTIVE', activatedAt: now }, $inc: { revision: 1 } },
  );
  await TenantDataExport.updateMany(
    { status: 'RUNNING' },
    {
      $set: { status: 'PENDING', failureReasonCode: 'EXPORT_RESTART_RECOVERED' },
      $inc: { revision: 1 },
    },
  );
  await TenantDataExport.updateMany(
    { status: 'FINALIZING' },
    {
      $set: { status: 'RECOVERY_REQUIRED', failureReasonCode: 'EXPORT_FINALIZATION_UNCERTAIN' },
      $inc: { revision: 1 },
    },
  );
  const pending = await TenantDataExport.find({ status: 'PENDING' })
    .sort({ requestedAt: 1 })
    .limit(10)
    .select('tenantExportId')
    .lean();
  for (const record of pending) await processTenantExport(record.tenantExportId);
  return { resumedExports: pending.length, destructiveJobsAutomaticallyRetried: 0 };
}

async function operationsDashboard(input = {}, caller = {}) {
  const scope = await authorizeOperation(
    'operations.admin.read',
    input,
    caller,
    'EnterpriseOperations',
    'dashboard',
    'SAFE_READ',
  );
  const [
    organization,
    workspaces,
    maintenance,
    accessReviews,
    incidents,
    securityEvents,
    exports,
    deletions,
    recoveries,
    notifications,
    drain,
  ] = await Promise.all([
    Organization.findOne({ partnerId: scope.partnerId }).lean(),
    Workspace.aggregate([
      { $match: { partnerId: new mongoose.Types.ObjectId(scope.partnerId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    MaintenanceWindow.countDocuments({ organizationId: scope.organizationId, status: 'ACTIVE' }),
    AccessReviewCampaign.aggregate([
      { $match: { organizationId: scope.organizationId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    OperationalIncident.aggregate([
      { $match: { organizationId: scope.organizationId } },
      { $group: { _id: { severity: '$severity', status: '$status' }, count: { $sum: 1 } } },
    ]),
    SecurityEvent.aggregate([
      { $match: { organizationId: scope.organizationId, status: { $ne: 'RESOLVED' } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
    TenantDataExport.aggregate([
      { $match: { organizationId: scope.organizationId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    TenantDeletionJob.aggregate([
      { $match: { organizationId: scope.organizationId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    OperationalRecovery.countDocuments({
      organizationId: scope.organizationId,
      status: { $in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
    }),
    ComplianceNotification.countDocuments({
      organizationId: scope.organizationId,
      readAt: { $exists: false },
    }),
    drainStatus(input, caller),
  ]);
  return {
    organizationState: organization?.status || 'active',
    workspaceStates: Object.fromEntries(workspaces.map((item) => [item._id, item.count])),
    activeMaintenanceWindows: maintenance,
    accessReviews: Object.fromEntries(accessReviews.map((item) => [item._id, item.count])),
    incidents: Object.fromEntries(
      incidents.map((item) => [`${item._id.severity}:${item._id.status}`, item.count]),
    ),
    securityEvents: Object.fromEntries(securityEvents.map((item) => [item._id, item.count])),
    tenantExports: Object.fromEntries(exports.map((item) => [item._id, item.count])),
    deletionJobs: Object.fromEntries(deletions.map((item) => [item._id, item.count])),
    openRecoveries: recoveries,
    unreadNotifications: notifications,
    drain,
  };
}

module.exports = {
  EXPORT_ROOT,
  activateAccessReview,
  activateConfiguration,
  activateMaintenance,
  approveTenantDeletion,
  cancelMaintenance,
  cancelTenantExport,
  closeAccessReview,
  collectTenantExportData,
  controlledResume,
  createAccessReview,
  createConfiguration,
  createIncident,
  createMaintenance,
  createRecovery,
  createServiceAccount,
  createTenantExport,
  decideAccessReviewItem,
  drainStatus,
  evaluateFeature,
  executeTenantDeletion,
  getAccessReview,
  getIncident,
  getLifecycle,
  getTenantDeletion,
  getTenantExport,
  issueTenantExportDownload,
  listAccessReviews,
  listAdministrativeNotifications,
  listConfigurations,
  listDisasterRecoveryStatus,
  listIncidents,
  listMaintenance,
  listMembershipHistory,
  listRecoveries,
  listSecurityEvents,
  listServiceAccountHistory,
  listTenantExports,
  manageRecovery,
  manageSecurityEvent,
  markNotificationRead,
  normalizeSecurityMetadata,
  operationsDashboard,
  processTenantExport,
  provisionMembership,
  readTenantExportFile,
  recordSecurityEvent,
  releaseMaintenance,
  remediateAccessReviewItem,
  requestTenantDeletion,
  respondToIncident,
  resumeAdministrativeJobs,
  rollbackConfiguration,
  tenantDeletionPreview,
  transitionMembership,
  transitionOrganization,
  transitionServiceAccount,
  transitionWorkspace,
  updateDisasterRecoveryStatus,
  updateIncident,
  validateConfiguration,
  validateConfigurationValues,
  validateMaintenance,
  validateReactivation,
};
