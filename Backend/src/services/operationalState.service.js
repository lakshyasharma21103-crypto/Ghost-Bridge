const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const Workspace = require('../models/Workspace');
const MaintenanceWindow = require('../models/MaintenanceWindow');
const RuntimeWorkItem = require('../models/RuntimeWorkItem');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  MAINTENANCE_MODES,
  OPERATIONAL_ACCESS_TYPES,
  OPERATIONAL_REASON_CODES,
  ORGANIZATION_LIFECYCLE_STATES,
  WORKSPACE_LIFECYCLE_STATES,
} = require('../constants/enterpriseOperations');

const SAFE_DURING_RESTRICTION = new Set([
  'SAFE_READ',
  'HEALTH',
  'LIFECYCLE_CONTROL',
  'MAINTENANCE_CONTROL',
  'DELETION_CONTROL',
  'INCIDENT_RESPONSE',
]);
const NEW_EXECUTION_OPERATIONS = new Set([
  'EXECUTION',
  'QUEUE_SUBMISSION',
  'WORKER_CLAIM',
  'CREDENTIAL_OPERATION',
]);
const MUTATING_OPERATIONS = new Set([
  'MUTATION',
  'EXECUTION',
  'QUEUE_SUBMISSION',
  'WORKER_CLAIM',
  'CREDENTIAL_OPERATION',
  'PRIVILEGED_CONFIGURATION',
  'INCIDENT_RESPONSE',
]);

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function validOperation(operation) {
  return OPERATIONAL_ACCESS_TYPES.includes(String(operation || '').toUpperCase());
}

function statusOf(record, fallback = 'active') {
  return String(record?.status || fallback)
    .trim()
    .toLowerCase();
}

function deny(reasonCode, state = {}) {
  return {
    allowed: false,
    reasonCode,
    organizationState: statusOf(state.organization),
    workspaceState: state.workspace ? statusOf(state.workspace) : undefined,
    maintenanceMode: state.maintenance?.mode,
    maintenanceId: state.maintenance?.maintenanceId,
  };
}

function allow(state = {}) {
  return {
    allowed: true,
    reasonCode: 'OPERATIONAL_ACCESS_ALLOWED',
    organizationState: statusOf(state.organization),
    workspaceState: state.workspace ? statusOf(state.workspace) : undefined,
    maintenanceMode: state.maintenance?.mode || 'NONE',
    maintenanceId: state.maintenance?.maintenanceId,
  };
}

function evaluateOperationalAccess(input = {}, state = {}) {
  const operation = String(input.operation || '').toUpperCase();
  if (!validOperation(operation))
    return deny(OPERATIONAL_REASON_CODES.OPERATIONAL_STATE_INCONSISTENT, state);
  const organizationState = statusOf(state.organization);
  const workspaceState = state.workspace ? statusOf(state.workspace) : undefined;
  if (!ORGANIZATION_LIFECYCLE_STATES.includes(organizationState)) {
    return deny(OPERATIONAL_REASON_CODES.OPERATIONAL_STATE_INCONSISTENT, state);
  }
  if (workspaceState && !WORKSPACE_LIFECYCLE_STATES.includes(workspaceState)) {
    return deny(OPERATIONAL_REASON_CODES.OPERATIONAL_STATE_INCONSISTENT, state);
  }

  if (organizationState !== 'active') {
    if (!SAFE_DURING_RESTRICTION.has(operation)) {
      if (['suspending', 'suspended', 'reactivating'].includes(organizationState)) {
        return deny(OPERATIONAL_REASON_CODES.ORGANIZATION_SUSPENDED, state);
      }
      if (['archiving', 'archived'].includes(organizationState)) {
        return deny(OPERATIONAL_REASON_CODES.ORGANIZATION_ARCHIVED, state);
      }
      if (organizationState.startsWith('deletion_') || organizationState === 'deleted') {
        return deny(OPERATIONAL_REASON_CODES.ORGANIZATION_DELETION_PENDING, state);
      }
      return deny(OPERATIONAL_REASON_CODES.ORGANIZATION_NOT_ACTIVE, state);
    }
    if (organizationState === 'deleted' && operation !== 'SAFE_READ') {
      return deny(OPERATIONAL_REASON_CODES.ORGANIZATION_DELETION_PENDING, state);
    }
  }

  if (workspaceState && workspaceState !== 'active') {
    if (workspaceState === 'read_only' && MUTATING_OPERATIONS.has(operation)) {
      return deny(OPERATIONAL_REASON_CODES.WORKSPACE_READ_ONLY, state);
    }
    if (
      ['suspending', 'suspended', 'recovery_required'].includes(workspaceState) &&
      !SAFE_DURING_RESTRICTION.has(operation)
    ) {
      return deny(OPERATIONAL_REASON_CODES.WORKSPACE_SUSPENDED, state);
    }
    if (
      ['archived', 'deletion_requested', 'deletion_blocked', 'deleted'].includes(workspaceState) &&
      !SAFE_DURING_RESTRICTION.has(operation)
    ) {
      return deny(OPERATIONAL_REASON_CODES.WORKSPACE_ARCHIVED, state);
    }
  }

  const mode = state.maintenance?.mode || 'NONE';
  if (!MAINTENANCE_MODES.includes(mode)) {
    return deny(OPERATIONAL_REASON_CODES.OPERATIONAL_STATE_INCONSISTENT, state);
  }
  if (mode === 'FULL_MAINTENANCE' && !['HEALTH', 'SAFE_READ'].includes(operation)) {
    return deny(OPERATIONAL_REASON_CODES.MAINTENANCE_MODE_ACTIVE, state);
  }
  if (mode === 'READ_ONLY' && MUTATING_OPERATIONS.has(operation)) {
    return deny(OPERATIONAL_REASON_CODES.MAINTENANCE_MODE_ACTIVE, state);
  }
  if (mode === 'EXECUTION_BLOCKED' && NEW_EXECUTION_OPERATIONS.has(operation)) {
    return deny(OPERATIONAL_REASON_CODES.MAINTENANCE_MODE_ACTIVE, state);
  }
  if (
    mode === 'DRAINING' &&
    NEW_EXECUTION_OPERATIONS.has(operation) &&
    !(operation === 'EXECUTION' && input.existingClaim === true)
  ) {
    return deny(OPERATIONAL_REASON_CODES.EXECUTION_DRAINING, state);
  }
  return allow(state);
}

async function loadOrganization(organizationId, partnerId) {
  if (mongoose.isValidObjectId(partnerId)) return Organization.findOne({ partnerId }).lean();
  if (mongoose.isValidObjectId(organizationId)) {
    return Organization.findOne({ _id: organizationId }).lean();
  }
  return null;
}

async function loadWorkspace(workspaceId, organization, partnerId) {
  if (!workspaceId) return null;
  const scope = [];
  if (organization?._id) scope.push({ organizationId: organization._id });
  if (mongoose.isValidObjectId(partnerId)) scope.push({ partnerId });
  const identity = [{ externalWorkspaceId: String(workspaceId) }];
  if (mongoose.isValidObjectId(workspaceId)) identity.push({ _id: workspaceId });
  const filter = { $or: identity };
  if (scope.length) filter.$and = [{ $or: scope }];
  return Workspace.findOne(filter).lean();
}

function maintenanceScopeFilter(input, organizationId, workspaceId, now) {
  const scopes = [{ scopeType: 'PLATFORM' }];
  if (organizationId) scopes.push({ scopeType: 'ORGANIZATION', organizationId });
  if (workspaceId) scopes.push({ scopeType: 'WORKSPACE', organizationId, workspaceId });
  if (input.adapterId)
    scopes.push({ scopeType: 'RUNTIME_ADAPTER', adapterId: idOf(input.adapterId) });
  if (input.connectionId)
    scopes.push({ scopeType: 'CONNECTION', connectionId: idOf(input.connectionId) });
  return {
    status: { $in: ['ACTIVE', 'SCHEDULED'] },
    startsAt: { $lte: now },
    $and: [
      { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gt: now } }] },
      { $or: scopes },
    ],
  };
}

async function loadOperationalState(input = {}) {
  const organizationId = idOf(input.organizationId || input.partnerId);
  const partnerId = idOf(input.partnerId || input.organizationId);
  const workspaceId = idOf(input.workspaceId || input.receivingWorkspaceId) || undefined;
  if (mongoose.connection.readyState !== 1) {
    if (env.NODE_ENV === 'production') {
      throw operationalError({
        reasonCode: OPERATIONAL_REASON_CODES.OPERATIONAL_STATE_INCONSISTENT,
        organizationState: 'unknown',
        workspaceState: workspaceId ? 'unknown' : undefined,
        maintenanceMode: 'UNKNOWN',
      });
    }
    // Development and isolated unit-test modes historically run service paths
    // without persistence. Production remains fail-closed; non-production keeps
    // that compatibility while pure guard tests inject authoritative state.
    return {
      organization: { status: 'active', synthetic: true },
      workspace: workspaceId
        ? { status: 'active', externalWorkspaceId: workspaceId, synthetic: true }
        : null,
      maintenance: null,
      organizationId,
      partnerId,
      workspaceId,
      persistenceUnavailable: true,
    };
  }
  const organization = await loadOrganization(organizationId, partnerId);
  const workspace = await loadWorkspace(workspaceId, organization, partnerId);
  const maintenanceRecords = await MaintenanceWindow.find(
    maintenanceScopeFilter(input, organizationId, workspaceId, new Date()),
  )
    .sort({ startsAt: -1 })
    .limit(50)
    .lean();
  const modePriority = {
    FULL_MAINTENANCE: 4,
    DRAINING: 3,
    EXECUTION_BLOCKED: 2,
    READ_ONLY: 1,
    NONE: 0,
  };
  const maintenance = maintenanceRecords.sort(
    (left, right) => (modePriority[right.mode] || 0) - (modePriority[left.mode] || 0),
  )[0];
  return {
    organization: organization || { status: 'active', synthetic: true },
    workspace:
      workspace ||
      (workspaceId
        ? { status: 'active', externalWorkspaceId: workspaceId, synthetic: true }
        : null),
    maintenance,
    organizationId,
    partnerId,
    workspaceId,
  };
}

function operationalError(decision) {
  const code = ErrorCodes[decision.reasonCode] || ErrorCodes.OPERATIONAL_STATE_INCONSISTENT;
  return new AppError(
    503,
    code,
    'Operation is unavailable in the current administrative state.',
    [],
    {
      reasonCode: decision.reasonCode,
      organizationState: decision.organizationState,
      workspaceState: decision.workspaceState,
      maintenanceMode: decision.maintenanceMode,
      maintenanceId: decision.maintenanceId,
    },
  );
}

async function assertOperationalAccess(input = {}, options = {}) {
  const state =
    options.state ||
    (options.loadState ? await options.loadState(input) : await loadOperationalState(input));
  const decision = evaluateOperationalAccess(input, state);
  if (!decision.allowed) throw operationalError(decision);
  return { ...decision, state };
}

async function pauseQueuedWork(input = {}) {
  const organizationId = idOf(input.organizationId);
  const partnerId = idOf(input.partnerId || organizationId);
  const workspaceId = idOf(input.workspaceId);
  if (!organizationId && !partnerId)
    throw new TypeError('Tenant scope is required to pause durable work.');
  const tenantScope = organizationId
    ? { $or: [{ organizationId }, ...(mongoose.isValidObjectId(partnerId) ? [{ partnerId }] : [])] }
    : { partnerId };
  const filter = {
    ...tenantScope,
    ...(workspaceId ? { receivingWorkspaceId: workspaceId } : {}),
    status: { $in: ['pending', 'retry_scheduled'] },
  };
  const result = await RuntimeWorkItem.updateMany(filter, {
    $set: {
      status: 'blocked',
      blockedAt: new Date(),
      blockedReasonCode: input.reasonCode || 'ORGANIZATION_SUSPENDED',
    },
    $inc: { version: 1 },
  });
  return { blocked: result.modifiedCount };
}

async function resumeBlockedWork(input = {}) {
  const organizationId = idOf(input.organizationId);
  const partnerId = idOf(input.partnerId || organizationId);
  const workspaceId = idOf(input.workspaceId);
  await assertOperationalAccess({
    organizationId,
    partnerId,
    workspaceId,
    operation: 'QUEUE_SUBMISSION',
  });
  const tenantScope = organizationId
    ? { $or: [{ organizationId }, ...(mongoose.isValidObjectId(partnerId) ? [{ partnerId }] : [])] }
    : { partnerId };
  const result = await RuntimeWorkItem.updateMany(
    {
      ...tenantScope,
      ...(workspaceId ? { receivingWorkspaceId: workspaceId } : {}),
      status: 'blocked',
    },
    {
      $set: { status: 'pending', availableAt: new Date() },
      $unset: { blockedAt: 1, blockedReasonCode: 1 },
      $inc: { version: 1 },
    },
  );
  return { resumed: result.modifiedCount, automatic: false };
}

module.exports = {
  evaluateOperationalAccess,
  assertOperationalAccess,
  loadOperationalState,
  maintenanceScopeFilter,
  operationalError,
  pauseQueuedWork,
  resumeBlockedWork,
};
