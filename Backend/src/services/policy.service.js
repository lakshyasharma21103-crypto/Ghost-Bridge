const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Policy = require('../models/Policy');
const Workspace = require('../models/Workspace');
const PassportConnection = require('../models/PassportConnection');
const AgentPassport = require('../models/AgentPassport');
const Capability = require('../models/Capability');
const Invocation = require('../models/Invocation');
const EnterpriseUser = require('../models/EnterpriseUser');
const ServiceAccount = require('../models/ServiceAccount');
const AuditLog = require('../models/AuditLog');
const GovernedSecret = require('../models/GovernedSecret');
const { createAuditLog } = require('./auditService');
const { actorFromPartner, assertAuthorized, authorize } = require('./authorization.service');
const {
  evaluatePolicySnapshot,
  incrementPolicyRevision,
  loadActivePolicySnapshot,
  trustedAttributes,
  validatePolicyDocument,
} = require('./policyEngine.service');
const { getAttributeRegistry } = require('../constants/policyAttributeRegistry');
const { getPermission, hasPermission } = require('../constants/permissionRegistry');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const metrics = require('./policyMetrics.service');
const { enforceApproval, consumeApprovalGrants } = require('./approval.service');

const ADMINISTRATIVE_PERMISSIONS = Object.freeze([
  'policy.read',
  'policy.create',
  'policy.update',
  'policy.validate',
  'policy.simulate',
  'policy.activate',
  'policy.retire',
  'organization.manage',
  'role.manage',
]);

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function actorIdentity(actor = {}) {
  const partnerId = idOf(actor.partner?._id || actor.partnerId);
  if (!partnerId)
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      'Partner authentication is required.',
    );
  return {
    partnerId,
    organizationId: partnerId,
    actorId: `partner:${partnerId}`,
    actor: actorFromPartner(actor.partner || { _id: partnerId }),
  };
}

function workspaceIdFrom(input = {}) {
  return String(input.workspaceId || input.receivingWorkspaceId || '').trim() || undefined;
}

function policyWorkspaceId(input = {}, fallback) {
  if (Object.hasOwn(input, 'policyWorkspaceId')) {
    return String(input.policyWorkspaceId || '').trim() || undefined;
  }
  if (input.scope === 'organization') return undefined;
  return fallback;
}

function resourceForPolicy(scope, stablePolicyId = 'policies') {
  return {
    type: 'Policy',
    id: stablePolicyId,
    organizationId: scope.organizationId,
    partnerId: scope.partnerId,
    workspaceId: scope.workspaceId,
  };
}

async function authorizeAction(permission, input, actor, stablePolicyId) {
  const scope = { ...actorIdentity(actor), workspaceId: workspaceIdFrom(input) };
  if (input.organizationId && idOf(input.organizationId) !== scope.organizationId) {
    throw new AppError(403, ErrorCodes.AUTHORIZATION_DENIED, 'Authorization denied.', [], {
      reasonCode: 'TENANT_SCOPE_MISMATCH',
    });
  }
  scope.authorizationDecision = await assertAuthorized(
    scope.actor,
    permission,
    resourceForPolicy(scope, stablePolicyId),
    {
      requestId: actor.requestId,
      traceId: actor.traceId,
      workspaceId: scope.workspaceId,
    },
  );
  return scope;
}

async function enforcePolicyApproval(scope, permission, stablePolicyId, version, input, actor) {
  const enforcement = await enforceApproval({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    requesterActorId: scope.actor.id,
    requesterActorType: scope.actor.type,
    permission,
    resourceType: 'Policy',
    resourceId: stablePolicyId,
    operationType: permission === 'policy.activate' ? 'POLICY_ACTIVATION' : 'POLICY_RETIREMENT',
    environment: process.env.NODE_ENV,
    policySnapshotRevision: scope.authorizationDecision?.policySnapshotRevision,
    safeRequestAttributes: input.safeRequestAttributes || {
      version: Number(version),
      expectedRevision: Number(input.expectedRevision),
    },
    approvalRequestId: input.approvalRequestId,
    approvalRequestIds: input.approvalRequestIds,
  });
  return consumeApprovalGrants(enforcement, {
    actorId: scope.actor.id,
    actorType: scope.actor.type,
    requestId: actor.requestId,
    traceId: actor.traceId,
  });
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => String(item).trim()).filter(Boolean))]
    : undefined;
}

function normalizeTarget(target = {}) {
  return Object.fromEntries(
    [
      ['permissionIds', target.permissionIds || target.permissions],
      ['resourceTypes', target.resourceTypes],
      ['resourceIds', target.resourceIds],
      ['actorTypes', target.actorTypes],
      ['organizationIds', target.organizationIds],
      ['workspaceIds', target.workspaceIds],
      ['passportIds', target.passportIds],
      ['connectionIds', target.connectionIds],
      ['capabilityIds', target.capabilityIds],
      ['capabilityCategories', target.capabilityCategories],
      ['capabilityClassifications', target.capabilityClassifications],
      ['sideEffects', target.sideEffects || target.sideEffectClassifications],
      ['environments', target.environments],
    ]
      .map(([key, value]) => [key, normalizeStringArray(value)])
      .filter(([, value]) => value?.length),
  );
}

function serializePolicy(policyInput) {
  const policy = typeof policyInput?.toObject === 'function' ? policyInput.toObject() : policyInput;
  return {
    id: idOf(policy),
    stablePolicyId: policy.stablePolicyId,
    version: policy.version,
    name: policy.name,
    description: policy.description,
    organizationId: policy.organizationId,
    workspaceId: policy.workspaceId,
    status: policy.status,
    effect: policy.effect,
    target: policy.target || {},
    condition: policy.condition,
    priority: policy.priority,
    createdBy: policy.createdBy,
    updatedBy: policy.updatedBy,
    activatedAt: policy.activatedAt,
    retiredAt: policy.retiredAt,
    revision: policy.revision,
    revisionMetadata: policy.revisionMetadata,
    schemaVersion: policy.schemaVersion,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  };
}

function draftPayload(input, scope, metadata = {}) {
  return {
    stablePolicyId: metadata.stablePolicyId || `pol_${crypto.randomUUID()}`,
    version: metadata.version || 1,
    name: String(input.name || '').trim(),
    description: String(input.description || '').trim(),
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    status: 'DRAFT',
    effect: String(input.effect || '').toUpperCase(),
    target: normalizeTarget(input.target),
    condition: input.condition,
    priority: Number(input.priority || 0),
    createdBy: scope.actorId,
    updatedBy: scope.actorId,
    revision: 0,
    revisionMetadata: {
      ...(metadata.parentVersion ? { parentVersion: metadata.parentVersion } : {}),
      ...(input.changeSummary ? { changeSummary: String(input.changeSummary).trim() } : {}),
    },
    schemaVersion: 1,
  };
}

function throwIfInvalid(policy) {
  const result = validatePolicyDocument(policy);
  const issues = [...result.errors];
  if (!policy.name)
    issues.push({ path: 'name', code: 'REQUIRED', message: 'Policy name is required.' });
  for (const permissionId of policy.target?.permissionIds || []) {
    if (!hasPermission(permissionId))
      issues.push({
        path: 'target.permissionIds',
        code: 'UNKNOWN_PERMISSION',
        message: `Unknown permission: ${permissionId}.`,
      });
  }
  if (issues.length) {
    throw new AppError(400, ErrorCodes.POLICY_INVALID, 'Policy validation failed.', issues, {
      reasonCode: 'POLICY_INVALID',
    });
  }
  return { ...result, valid: true, errors: [] };
}

async function validateTenantReferences(policy, scope) {
  if (policy.organizationId !== scope.organizationId) {
    throw new AppError(403, ErrorCodes.AUTHORIZATION_DENIED, 'Authorization denied.', [], {
      reasonCode: 'TENANT_SCOPE_MISMATCH',
    });
  }
  if (
    (policy.target?.organizationIds || []).some(
      (organizationId) => organizationId !== scope.organizationId,
    )
  ) {
    throw new AppError(
      400,
      ErrorCodes.POLICY_INVALID,
      'Policy contains a cross-organization target reference.',
      [],
      { reasonCode: 'TENANT_SCOPE_MISMATCH' },
    );
  }
  const workspaceIds = [
    ...new Set([policy.workspaceId, ...(policy.target?.workspaceIds || [])].filter(Boolean)),
  ];
  for (const workspaceId of workspaceIds) {
    const [workspace, connection] = await Promise.all([
      Workspace.findOne({ partnerId: scope.partnerId, externalWorkspaceId: workspaceId })
        .select('_id')
        .lean(),
      PassportConnection.findOne({ partnerId: scope.partnerId, receivingWorkspaceId: workspaceId })
        .select('_id')
        .lean(),
    ]);
    if (!workspace && !connection) {
      throw new AppError(400, ErrorCodes.POLICY_INVALID, 'Policy validation failed.', [
        {
          path: 'workspaceId',
          code: 'WORKSPACE_SCOPE_INVALID',
          message: 'Workspace is not owned by this organization.',
        },
      ]);
    }
    if (policy.workspaceId && workspaceId !== policy.workspaceId) {
      throw new AppError(400, ErrorCodes.POLICY_INVALID, 'Policy validation failed.', [
        {
          path: 'target.workspaceIds',
          code: 'CROSS_WORKSPACE_REFERENCE',
          message: 'A workspace policy cannot target another workspace.',
        },
      ]);
    }
  }
  if (policy.target?.passportIds?.length) {
    const count = await AgentPassport.countDocuments({
      _id: { $in: policy.target.passportIds },
      partnerId: scope.partnerId,
    });
    if (count !== policy.target.passportIds.length)
      throw new AppError(
        400,
        ErrorCodes.POLICY_INVALID,
        'Policy contains a cross-tenant passport reference.',
      );
  }
  if (policy.target?.connectionIds?.length) {
    const filter = { _id: { $in: policy.target.connectionIds }, partnerId: scope.partnerId };
    if (policy.workspaceId) filter.receivingWorkspaceId = policy.workspaceId;
    const count = await PassportConnection.countDocuments(filter);
    if (count !== policy.target.connectionIds.length)
      throw new AppError(
        400,
        ErrorCodes.POLICY_INVALID,
        'Policy contains a cross-tenant connection reference.',
      );
  }
  if (policy.target?.capabilityIds?.length) {
    const capabilities = await Capability.find({ _id: { $in: policy.target.capabilityIds } })
      .select('passportId')
      .lean();
    const passportIds = [...new Set(capabilities.map((item) => idOf(item.passportId)))];
    const passportCount = await AgentPassport.countDocuments({
      _id: { $in: passportIds },
      partnerId: scope.partnerId,
    });
    if (
      capabilities.length !== policy.target.capabilityIds.length ||
      passportCount !== passportIds.length
    ) {
      throw new AppError(
        400,
        ErrorCodes.POLICY_INVALID,
        'Policy contains a cross-tenant capability reference.',
      );
    }
  }
  if (policy.target?.resourceIds?.length) {
    const types = policy.target.resourceTypes || [];
    if (types.length !== 1) {
      throw new AppError(
        400,
        ErrorCodes.POLICY_INVALID,
        'Specific resource IDs require exactly one resource type.',
      );
    }
    const resourceIds = policy.target.resourceIds;
    const resourceType = String(types[0]).toLowerCase();
    let count = 0;
    try {
      if (['connection', 'passportconnection'].includes(resourceType)) {
        count = await PassportConnection.countDocuments({
          _id: { $in: resourceIds },
          partnerId: scope.partnerId,
          ...(policy.workspaceId ? { receivingWorkspaceId: policy.workspaceId } : {}),
        });
      } else if (['passport', 'agentpassport'].includes(resourceType)) {
        count = await AgentPassport.countDocuments({
          _id: { $in: resourceIds },
          partnerId: scope.partnerId,
        });
      } else if (resourceType === 'capability') {
        const capabilities = await Capability.find({ _id: { $in: resourceIds } })
          .select('passportId')
          .lean();
        const passportIds = [...new Set(capabilities.map((item) => idOf(item.passportId)))];
        const passports = await AgentPassport.countDocuments({
          _id: { $in: passportIds },
          partnerId: scope.partnerId,
        });
        count = passports === passportIds.length ? capabilities.length : 0;
      } else if (resourceType === 'workspace') {
        count = await Workspace.countDocuments({
          partnerId: scope.partnerId,
          $or: [{ _id: { $in: resourceIds } }, { externalWorkspaceId: { $in: resourceIds } }],
        });
      } else if (resourceType === 'invocation') {
        count = await Invocation.countDocuments({
          _id: { $in: resourceIds },
          partnerId: scope.partnerId,
          ...(policy.workspaceId ? { receivingWorkspaceId: policy.workspaceId } : {}),
        });
      } else if (resourceType === 'policy') {
        count = (
          await Policy.distinct('stablePolicyId', {
            organizationId: scope.organizationId,
            stablePolicyId: { $in: resourceIds },
          })
        ).length;
      } else if (['secret', 'governedsecret'].includes(resourceType)) {
        count = await GovernedSecret.countDocuments({
          organizationId: scope.organizationId,
          secretId: { $in: resourceIds },
          ...(policy.workspaceId ? { workspaceId: policy.workspaceId } : {}),
        });
      } else {
        throw new AppError(
          400,
          ErrorCodes.POLICY_INVALID,
          'Resource ownership validation is not supported for this resource type.',
        );
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        400,
        ErrorCodes.POLICY_INVALID,
        'A target resource identifier is invalid.',
      );
    }
    if (count !== resourceIds.length) {
      throw new AppError(
        400,
        ErrorCodes.POLICY_INVALID,
        'Policy contains a cross-tenant or cross-workspace resource reference.',
      );
    }
  }
}

async function auditLifecycle(action, policy, scope, actor, metadata = {}) {
  await createAuditLog(
    'partner',
    scope.partnerId,
    action,
    'Policy',
    policy.stablePolicyId,
    {
      organizationId: scope.organizationId,
      workspaceId: policy.workspaceId,
      stablePolicyId: policy.stablePolicyId,
      version: policy.version,
      status: policy.status,
      effect: policy.effect,
      ...metadata,
    },
    { requestId: actor.requestId, traceId: actor.traceId },
  );
}

async function listPolicies(input = {}, actor = {}) {
  const scope = await authorizeAction('policy.read', input, actor);
  const filter = { organizationId: scope.organizationId };
  if (scope.workspaceId)
    filter.$or = [
      { workspaceId: scope.workspaceId },
      { workspaceId: { $exists: false } },
      { workspaceId: null },
      { workspaceId: '' },
    ];
  if (input.status) filter.status = String(input.status).toUpperCase();
  const items = await Policy.find(filter).sort({ stablePolicyId: 1, version: -1 }).lean();
  return { items: items.map(serializePolicy) };
}

async function getPolicy(stablePolicyId, input = {}, actor = {}) {
  const scope = await authorizeAction('policy.read', input, actor, stablePolicyId);
  const filter = { organizationId: scope.organizationId, stablePolicyId };
  if (input.version) filter.version = Number(input.version);
  const policy = await Policy.findOne(filter).sort({ version: -1 }).lean();
  if (!policy) throw new AppError(404, ErrorCodes.POLICY_NOT_FOUND, 'Policy was not found.');
  return serializePolicy(policy);
}

async function policyHistory(stablePolicyId, input = {}, actor = {}) {
  const scope = await authorizeAction('policy.read', input, actor, stablePolicyId);
  const items = await Policy.find({ organizationId: scope.organizationId, stablePolicyId })
    .sort({ version: -1 })
    .lean();
  if (!items.length) throw new AppError(404, ErrorCodes.POLICY_NOT_FOUND, 'Policy was not found.');
  return { stablePolicyId, items: items.map(serializePolicy) };
}

async function createDraft(input = {}, actor = {}) {
  const scope = await authorizeAction('policy.create', input, actor);
  const payload = draftPayload(input, {
    ...scope,
    workspaceId: policyWorkspaceId(input, scope.workspaceId),
  });
  throwIfInvalid(payload);
  await validateTenantReferences(payload, scope);
  const policy = await Policy.create(payload);
  await auditLifecycle('policy.draft.created', policy, scope, actor);
  return serializePolicy(policy);
}

async function createNewVersion(stablePolicyId, input = {}, actor = {}) {
  const scope = await authorizeAction('policy.update', input, actor, stablePolicyId);
  const latest = await Policy.findOne({ organizationId: scope.organizationId, stablePolicyId })
    .sort({ version: -1 })
    .lean();
  if (!latest) throw new AppError(404, ErrorCodes.POLICY_NOT_FOUND, 'Policy was not found.');
  const merged = {
    ...latest,
    ...input,
    target: input.target || latest.target,
    condition: input.condition || latest.condition,
  };
  const payload = draftPayload(
    merged,
    { ...scope, workspaceId: policyWorkspaceId(input, latest.workspaceId) },
    {
      stablePolicyId,
      version: Number(latest.version) + 1,
      parentVersion: Number(latest.version),
    },
  );
  throwIfInvalid(payload);
  await validateTenantReferences(payload, scope);
  const policy = await Policy.create(payload);
  await auditLifecycle('policy.version.created', policy, scope, actor, {
    parentVersion: latest.version,
  });
  return serializePolicy(policy);
}

async function updateDraft(stablePolicyId, version, input = {}, actor = {}) {
  const scope = await authorizeAction('policy.update', input, actor, stablePolicyId);
  const expectedRevision = Number(input.expectedRevision);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'expectedRevision is required.');
  }
  const current = await Policy.findOne({
    organizationId: scope.organizationId,
    stablePolicyId,
    version: Number(version),
  }).lean();
  if (!current) throw new AppError(404, ErrorCodes.POLICY_NOT_FOUND, 'Policy was not found.');
  if (current.status !== 'DRAFT')
    throw new AppError(
      409,
      ErrorCodes.POLICY_IMMUTABLE,
      'Activated policy versions are immutable.',
      [],
      { reasonCode: 'POLICY_VERSION_IMMUTABLE' },
    );
  const candidate = {
    ...current,
    ...input,
    organizationId: scope.organizationId,
    workspaceId: policyWorkspaceId(input, current.workspaceId),
    effect: String(input.effect || current.effect).toUpperCase(),
    target: normalizeTarget(input.target || current.target),
    condition: input.condition || current.condition,
    updatedBy: scope.actorId,
    revision: expectedRevision + 1,
  };
  delete candidate.expectedRevision;
  throwIfInvalid(candidate);
  await validateTenantReferences(candidate, scope);
  const updated = await Policy.findOneAndUpdate(
    {
      _id: current._id,
      organizationId: scope.organizationId,
      status: 'DRAFT',
      revision: expectedRevision,
    },
    {
      $set: {
        name: candidate.name,
        description: candidate.description,
        workspaceId: candidate.workspaceId,
        effect: candidate.effect,
        target: candidate.target,
        condition: candidate.condition,
        priority: Number(candidate.priority || 0),
        updatedBy: scope.actorId,
        revisionMetadata: candidate.revisionMetadata,
      },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!updated)
    throw new AppError(
      409,
      ErrorCodes.POLICY_CONFLICT,
      'Policy was modified by another request.',
      [],
      { reasonCode: 'POLICY_REVISION_CONFLICT' },
    );
  await auditLifecycle('policy.draft.updated', updated, scope, actor);
  return serializePolicy(updated);
}

async function validateDraft(stablePolicyId, version, input = {}, actor = {}) {
  const scope = await authorizeAction('policy.validate', input, actor, stablePolicyId);
  const policy = await Policy.findOne({
    organizationId: scope.organizationId,
    stablePolicyId,
    version: Number(version),
  }).lean();
  if (!policy) throw new AppError(404, ErrorCodes.POLICY_NOT_FOUND, 'Policy was not found.');
  const validation = throwIfInvalid(policy);
  await validateTenantReferences(policy, scope);
  return { ...validation, stablePolicyId, version: policy.version, tenantReferencesValid: true };
}

async function resolveSimulationResource(input, scope) {
  const resourceType = String(input.resourceType || 'Policy');
  if (resourceType === 'Secret') {
    const secret = await GovernedSecret.findOne({
      organizationId: scope.organizationId,
      secretId: input.secretId || input.resourceId,
      ...(scope.workspaceId
        ? { $or: [{ workspaceId: scope.workspaceId }, { workspaceId: { $exists: false } }] }
        : {}),
    }).lean();
    if (!secret)
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Simulation resource was not found.');
    return {
      secret,
      resource: {
        type: 'Secret',
        id: secret.secretId,
        organizationId: scope.organizationId,
        workspaceId: secret.workspaceId,
        partnerId: scope.partnerId,
      },
    };
  }
  if (resourceType === 'Connection' || input.connectionId) {
    const connection = await PassportConnection.findOne({
      _id: input.connectionId || input.resourceId,
      partnerId: scope.partnerId,
    }).lean();
    if (!connection)
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Simulation resource was not found.');
    const passport = await AgentPassport.findOne({
      _id: connection.passportId,
      partnerId: scope.partnerId,
    }).lean();
    const capability = input.capabilityId
      ? await Capability.findOne({
          _id: input.capabilityId,
          passportId: connection.passportId,
        }).lean()
      : input.capability
        ? await Capability.findOne({
            name: input.capability,
            passportId: connection.passportId,
          }).lean()
        : undefined;
    return {
      connection,
      passport,
      capability,
      resource: {
        type: 'Connection',
        id: idOf(connection),
        organizationId: scope.organizationId,
        workspaceId: connection.receivingWorkspaceId,
        partnerId: scope.partnerId,
      },
    };
  }
  return { resource: resourceForPolicy(scope, input.resourceId || 'simulation') };
}

async function resolveSimulationActor(input, scope) {
  const requestedId = String(input.actorId || '').trim();
  if (!requestedId || requestedId === scope.actorId || requestedId === scope.actor.id) {
    return { ...scope.actor, workspaceId: scope.workspaceId };
  }
  const actorType = String(input.actorType || '').toLowerCase();
  if (actorType === 'user') {
    const filter = mongoose.isValidObjectId(requestedId)
      ? { _id: requestedId }
      : { externalUserId: requestedId };
    const user = await EnterpriseUser.findOne({
      ...filter,
      partnerId: scope.partnerId,
      status: 'active',
    }).lean();
    if (!user) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Simulation actor was not found.');
    return {
      type: 'user',
      id: idOf(user),
      userId: user.externalUserId,
      enterpriseUserId: idOf(user),
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
    };
  }
  if (actorType === 'service_account') {
    const filter = mongoose.isValidObjectId(requestedId)
      ? { _id: requestedId }
      : { keyId: requestedId };
    const account = await ServiceAccount.findOne({
      ...filter,
      partnerId: scope.partnerId,
      status: 'active',
    }).lean();
    if (!account) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Simulation actor was not found.');
    return {
      type: 'service_account',
      id: idOf(account),
      serviceAccountId: idOf(account),
      partnerId: scope.partnerId,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
    };
  }
  throw new AppError(
    400,
    ErrorCodes.VALIDATION_ERROR,
    'actorType must identify a tenant user or service account.',
  );
}

async function simulateDraft(stablePolicyId, version, input = {}, actor = {}) {
  const scope = await authorizeAction('policy.simulate', input, actor, stablePolicyId);
  const draft = await Policy.findOne({
    organizationId: scope.organizationId,
    stablePolicyId,
    version: Number(version),
    status: 'DRAFT',
  }).lean();
  if (!draft) throw new AppError(404, ErrorCodes.POLICY_NOT_FOUND, 'Draft policy was not found.');
  throwIfInvalid(draft);
  await validateTenantReferences(draft, scope);
  const resolved = await resolveSimulationResource(input, scope);
  const permission = String(input.permission || draft.target?.permissionIds?.[0] || 'policy.read');
  if (!getPermission(permission))
    throw new AppError(400, ErrorCodes.POLICY_INVALID, 'Simulation permission is unknown.');
  const workspaceId = resolved.resource.workspaceId || scope.workspaceId;
  const active = await loadActivePolicySnapshot(scope.organizationId, workspaceId);
  const proposedPolicies = active.policies
    .filter((policy) => policy.stablePolicyId !== stablePolicyId)
    .concat(draft);
  const authorizationInput = {
    ...(await resolveSimulationActor(input, { ...scope, workspaceId })),
    workspaceId,
  };
  const context = {
    requestId: actor.requestId,
    traceId: actor.traceId,
    workspaceId,
    trustedConnection: resolved.connection,
    trustedPassport: resolved.passport,
    trustedCapability: resolved.capability,
    trustedSecret: resolved.secret,
    simulation: true,
    auditDecision: false,
  };
  const [current, proposed] = await Promise.all([
    authorize(authorizationInput, permission, resolved.resource, {
      ...context,
      policyLoader: async () => active,
    }),
    authorize(authorizationInput, permission, resolved.resource, {
      ...context,
      policyLoader: async () => ({ policies: proposedPolicies, revision: active.revision }),
    }),
  ]);
  metrics.increment('policy_simulation_runs', { outcome: proposed.decision });
  await auditLifecycle('policy.simulated', draft, scope, actor, {
    simulation: true,
    permission,
    currentDecision: current.decision,
    proposedDecision: proposed.decision,
    reasonCode: proposed.reasonCode,
  });
  return {
    simulation: true,
    mutatedRuntime: false,
    current: safeDecision(current),
    proposed: safeDecision(proposed),
  };
}

function safeDecision(decision) {
  return {
    allowed: decision.allowed,
    decision: decision.decision,
    reasonCode: decision.reasonCode,
    permission: decision.permission?.id,
    rbacDecision: decision.rbacDecision,
    policyDecision: decision.policyDecision,
    matchedPolicies: (decision.matchedPolicies || []).map((policy) => ({
      stablePolicyId: policy.stablePolicyId,
      version: policy.version,
      name: policy.name,
      effect: policy.effect,
      matched: policy.matched,
      evidence: policy.evidence,
    })),
    policySnapshotRevision: decision.policySnapshotRevision,
    traceId: decision.traceId,
  };
}

async function ownerCandidates(scope) {
  const users = await EnterpriseUser.find({
    partnerId: scope.partnerId,
    status: 'active',
    roleBindings: { $elemMatch: { roleKey: 'organization_owner' } },
  })
    .select('_id externalUserId externalWorkspaceIds')
    .lean();
  return [
    {
      ...scope.actor,
      workspaceId: scope.workspaceId,
      roleKeys: ['organization_owner'],
      skipPersistentRoles: true,
    },
    ...users.map((user) => ({
      type: 'user',
      id: idOf(user),
      userId: user.externalUserId,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      roleKeys: ['organization_owner'],
      skipPersistentRoles: true,
    })),
  ];
}

function affectsAdministration(policy) {
  const permissions = policy.target?.permissionIds || [];
  return (
    permissions.length === 0 ||
    permissions.some((permission) => ADMINISTRATIVE_PERMISSIONS.includes(permission))
  );
}

async function assertNoOwnerLockout(draft, scope, active) {
  if (!affectsAdministration(draft)) return;
  const policies = active.policies
    .filter((policy) => policy.stablePolicyId !== draft.stablePolicyId)
    .concat(draft);
  const owners = await ownerCandidates(scope);
  const lockedOut = [];
  for (const permission of ADMINISTRATIVE_PERMISSIONS) {
    let anyOwnerAllowed = false;
    for (const actor of owners) {
      const tenant = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
      const resource = resourceForPolicy(scope, draft.stablePolicyId);
      const attributes = trustedAttributes({
        actor,
        resource,
        context: {},
        roleKeys: ['organization_owner'],
        tenant,
      });
      const decision = evaluatePolicySnapshot({
        policies,
        snapshotRevision: active.revision,
        attributes,
        input: {
          permission,
          organizationId: scope.organizationId,
          workspaceId: scope.workspaceId,
          actorType: actor.type,
          resourceType: 'Policy',
          resourceId: draft.stablePolicyId,
        },
      });
      if (decision.allowed) {
        anyOwnerAllowed = true;
        break;
      }
    }
    if (!anyOwnerAllowed) lockedOut.push(permission);
  }
  if (lockedOut.length) {
    throw new AppError(
      409,
      ErrorCodes.POLICY_LOCKOUT_RISK,
      'Activation would lock every organization owner out of critical administration.',
      [
        {
          path: 'policy',
          code: 'OWNER_LOCKOUT',
          message: 'One or more critical administrative actions would have no authorized owner.',
        },
      ],
      { reasonCode: 'POLICY_OWNER_LOCKOUT_RISK' },
    );
  }
}

async function activateDraft(stablePolicyId, version, input = {}, actor = {}) {
  const scope = await authorizeAction('policy.activate', input, actor, stablePolicyId);
  const expectedRevision = Number(input.expectedRevision);
  const draft = await Policy.findOne({
    organizationId: scope.organizationId,
    stablePolicyId,
    version: Number(version),
    status: 'DRAFT',
  }).lean();
  if (!draft) throw new AppError(404, ErrorCodes.POLICY_NOT_FOUND, 'Draft policy was not found.');
  if (!Number.isInteger(expectedRevision) || expectedRevision !== Number(draft.revision)) {
    throw new AppError(409, ErrorCodes.POLICY_CONFLICT, 'Policy revision is stale.', [], {
      reasonCode: 'POLICY_REVISION_CONFLICT',
    });
  }
  throwIfInvalid(draft);
  await validateTenantReferences(draft, scope);
  await enforcePolicyApproval(scope, 'policy.activate', stablePolicyId, version, input, actor);
  const active = await loadActivePolicySnapshot(scope.organizationId, draft.workspaceId);
  await assertNoOwnerLockout(draft, { ...scope, workspaceId: draft.workspaceId }, active);
  let activated;
  const operation = async (session) => {
    const now = new Date();
    await Policy.updateMany(
      { organizationId: scope.organizationId, stablePolicyId, status: 'ACTIVE' },
      {
        $set: { status: 'RETIRED', retiredAt: now, updatedBy: scope.actorId },
        $inc: { revision: 1 },
      },
      { session },
    );
    activated = await Policy.findOneAndUpdate(
      {
        _id: draft._id,
        organizationId: scope.organizationId,
        status: 'DRAFT',
        revision: expectedRevision,
      },
      {
        $set: { status: 'ACTIVE', activatedAt: now, updatedBy: scope.actorId },
        $inc: { revision: 1 },
      },
      { new: true, runValidators: true, session },
    );
    if (!activated)
      throw new AppError(409, ErrorCodes.POLICY_CONFLICT, 'Policy changed before activation.', [], {
        reasonCode: 'POLICY_ACTIVATION_CONFLICT',
      });
    await incrementPolicyRevision(scope.organizationId, { session });
  };
  try {
    await mongoose.connection.transaction(operation);
  } catch (error) {
    metrics.increment('policy_activation_failures', {
      reason: error.reasonCode || error.code || 'ACTIVATION_FAILED',
    });
    throw error;
  }
  await auditLifecycle('policy.activated', activated, scope, actor);
  return serializePolicy(activated);
}

async function retirePolicy(stablePolicyId, version, input = {}, actor = {}) {
  const scope = await authorizeAction('policy.retire', input, actor, stablePolicyId);
  await enforcePolicyApproval(scope, 'policy.retire', stablePolicyId, version, input, actor);
  const expectedRevision = Number(input.expectedRevision);
  let retired;
  await mongoose.connection.transaction(async (session) => {
    retired = await Policy.findOneAndUpdate(
      {
        organizationId: scope.organizationId,
        stablePolicyId,
        version: Number(version),
        status: 'ACTIVE',
        revision: expectedRevision,
      },
      {
        $set: { status: 'RETIRED', retiredAt: new Date(), updatedBy: scope.actorId },
        $inc: { revision: 1 },
      },
      { new: true, runValidators: true, session },
    );
    if (!retired)
      throw new AppError(
        409,
        ErrorCodes.POLICY_CONFLICT,
        'Active policy changed before retirement.',
        [],
        { reasonCode: 'POLICY_REVISION_CONFLICT' },
      );
    await incrementPolicyRevision(scope.organizationId, { session });
  });
  await auditLifecycle('policy.retired', retired, scope, actor);
  return serializePolicy(retired);
}

async function attributeRegistry(input = {}, actor = {}) {
  await authorizeAction('policy.read', input, actor, 'attribute-registry');
  return getAttributeRegistry();
}

async function policyAudit(input = {}, actor = {}) {
  const scope = await authorizeAction('policy.audit.read', input, actor, 'policy-audit');
  const filter = {
    organizationId: scope.organizationId,
    $or: [
      { action: { $regex: '^policy\\.' } },
      { action: 'authorization.decision', 'metadata.matchedPolicyIds.0': { $exists: true } },
    ],
  };
  if (scope.workspaceId) filter.workspaceId = scope.workspaceId;
  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return {
    items: logs.map((log) => ({
      id: idOf(log),
      action: log.action,
      actorType: log.actorType,
      actorId: log.actorId,
      organizationId: log.organizationId,
      workspaceId: log.workspaceId,
      stablePolicyId: log.metadata?.stablePolicyId,
      version: log.metadata?.version,
      decision: log.metadata?.decision || log.metadata?.proposedDecision,
      reasonCode: log.metadata?.reasonCode || log.metadata?.reason,
      requestId: log.requestId,
      traceId: log.traceId,
      createdAt: log.createdAt,
    })),
  };
}

async function capabilityGovernance(passportId, input = {}, actor = {}) {
  const scope = await authorizeAction('policy.read', input, actor, passportId);
  const passport = await AgentPassport.findOne({
    _id: passportId,
    partnerId: scope.partnerId,
  }).lean();
  if (!passport)
    throw new AppError(404, ErrorCodes.PASSPORT_NOT_FOUND, 'Agent Passport was not found.');
  const capabilities = await Capability.find({ passportId }).sort({ name: 1 }).lean();
  return {
    passportId,
    items: capabilities.map((capability) => ({
      id: idOf(capability),
      name: capability.name,
      classification: capability.classification || 'UNCLASSIFIED',
      category: capability.category || 'UNCLASSIFIED',
      sideEffect: capability.sideEffect || 'UNKNOWN',
      requiredPermission: capability.requiredPermission,
      retrySafety: capability.retrySafety,
      cancellationSupport: capability.cancellationSupport,
      idempotencySupport: capability.idempotencySupport,
    })),
  };
}

module.exports = {
  ADMINISTRATIVE_PERMISSIONS,
  activateDraft,
  attributeRegistry,
  capabilityGovernance,
  createDraft,
  createNewVersion,
  getPolicy,
  listPolicies,
  policyHistory,
  policyAudit,
  retirePolicy,
  safeDecision,
  serializePolicy,
  simulateDraft,
  updateDraft,
  validateDraft,
};
