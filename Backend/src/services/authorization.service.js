const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const EnterpriseUser = require('../models/EnterpriseUser');
const ServiceAccount = require('../models/ServiceAccount');
const Role = require('../models/Role');
const { createAuditLog } = require('./auditService');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  PERMISSION_REGISTRY_ID,
  PERMISSION_REGISTRY_VERSION,
  getPermission,
} = require('../constants/permissionRegistry');
const { getBuiltInRole, hasBuiltInRole, permissionsForBuiltInRole } = require('../constants/builtInRoles');

const defaultAuditCreate = AuditLog.create;

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function compact(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, item]) => item !== undefined && item !== ''),
  );
}

function normalizeRoleKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function normalizeActor(input = {}) {
  const partnerId = input.partnerId || input.partner?._id;
  const type = input.type || input.actorType || (partnerId ? 'service_account' : undefined);
  const actorId =
    input.id ||
    input.actorId ||
    input.userId ||
    input.enterpriseUserId ||
    input.serviceAccountId ||
    (partnerId ? `partner:${idOf(partnerId)}` : undefined);
  return compact({
    ...input,
    type,
    id: actorId ? idOf(actorId) : undefined,
    partnerId: partnerId ? idOf(partnerId) : undefined,
    organizationId: idOf(input.organizationId || input.tenantOrganizationId || partnerId),
    workspaceId: input.workspaceId || input.receivingWorkspaceId || input.externalWorkspaceId,
    userId: input.userId || (type === 'user' ? actorId : undefined),
    serviceAccountId: input.serviceAccountId,
    auditActorType: input.auditActorType,
    auditActorId: input.auditActorId,
  });
}

function normalizeResource(input = {}) {
  const source = input || {};
  return compact({
    ...source,
    type: source.type || source.resourceType || 'Resource',
    id: idOf(source.id || source.resourceId || source._id),
    organizationId: idOf(source.organizationId || source.tenantOrganizationId || source.partnerId),
    partnerId: source.partnerId ? idOf(source.partnerId) : undefined,
    workspaceId: source.workspaceId || source.receivingWorkspaceId || source.externalWorkspaceId,
    ownerUserId: source.ownerUserId || source.receivingUserId || source.userId,
  });
}

function actorAuditType(actor) {
  if (actor.auditActorType) return actor.auditActorType;
  if (actor.type === 'user') return 'user';
  if (actor.type === 'system') return 'system';
  if (actor.partnerId) return 'partner';
  return 'service_account';
}

function actorAuditId(actor) {
  return idOf(actor.auditActorId || actor.partnerId || actor.id || actor.userId || 'unknown');
}

function tenantDecision(actor, resource, context = {}) {
  const actorOrganizationId = idOf(actor.organizationId || actor.partnerId);
  const resourceOrganizationId = idOf(
    resource.organizationId || resource.partnerId || context.organizationId || context.partnerId,
  );
  if (resourceOrganizationId && actorOrganizationId && resourceOrganizationId !== actorOrganizationId) {
    return {
      allowed: false,
      reason: 'ORGANIZATION_MISMATCH',
      organizationId: resourceOrganizationId,
    };
  }
  if (resourceOrganizationId && !actorOrganizationId && context.allowLegacyOwner !== true) {
    return {
      allowed: false,
      reason: 'ORGANIZATION_SCOPE_REQUIRED',
      organizationId: resourceOrganizationId,
    };
  }

  const actorWorkspaceId = String(actor.workspaceId || '');
  const resourceWorkspaceId = String(resource.workspaceId || context.workspaceId || '');
  if (actorWorkspaceId && resourceWorkspaceId && actorWorkspaceId !== resourceWorkspaceId) {
    return {
      allowed: false,
      reason: 'WORKSPACE_MISMATCH',
      organizationId: resourceOrganizationId || actorOrganizationId,
      workspaceId: resourceWorkspaceId,
    };
  }

  return {
    allowed: true,
    reason: 'TENANT_SCOPE_MATCHED',
    organizationId: resourceOrganizationId || actorOrganizationId,
    workspaceId: resourceWorkspaceId || actorWorkspaceId,
  };
}

function legacyOwnerRole(actor, resource, context = {}) {
  if (context.allowLegacyOwner !== true || actor.type !== 'user') return undefined;
  if (!resource.workspaceId || !actor.workspaceId || resource.workspaceId !== actor.workspaceId) {
    return undefined;
  }
  if (resource.ownerUserId && actor.id && resource.ownerUserId === actor.id) return 'developer';
  if (context.allowWorkspaceUser === true) return 'viewer';
  return undefined;
}

function baseRoleKeys(actor, resource, context = {}) {
  const explicit = [
    ...(Array.isArray(actor.roleKeys) ? actor.roleKeys : []),
    ...(Array.isArray(actor.roles) ? actor.roles : []),
  ]
    .map(normalizeRoleKey)
    .filter(Boolean);
  if (explicit.length) return explicit;
  if (actor.partnerId && actor.type === 'service_account') return ['organization_owner'];
  if (
    actor.type === 'system' &&
    (actor.trustedSystem === true || actor.durableWorkItemId || context.trustedSystem === true)
  ) {
    return ['operator'];
  }
  const legacy = legacyOwnerRole(actor, resource, context);
  return legacy ? [legacy] : [];
}

function bindingApplies(binding = {}, tenant = {}) {
  if (binding.scopeType === 'organization') {
    return !binding.organizationId || idOf(binding.organizationId) === tenant.organizationId;
  }
  if (binding.scopeType === 'team') return false;
  const bindingWorkspace = binding.externalWorkspaceId || idOf(binding.workspaceId);
  return !bindingWorkspace || bindingWorkspace === tenant.workspaceId;
}

async function roleKeysFromPersistentIdentity(actor, tenant) {
  if (actor.skipPersistentRoles === true) return [];
  let identity;
  if (actor.type === 'user' && (actor.enterpriseUserId || actor.id || actor.userId)) {
    const filter = actor.enterpriseUserId && mongoose.isValidObjectId(actor.enterpriseUserId)
      ? { _id: actor.enterpriseUserId }
      : {
          partnerId: actor.partnerId,
          externalUserId: actor.userId || actor.id,
        };
    identity = await EnterpriseUser.findOne({ ...filter, status: 'active' }).lean();
  }
  if (actor.type === 'service_account' && actor.serviceAccountId) {
    const filter = mongoose.isValidObjectId(actor.serviceAccountId)
      ? { _id: actor.serviceAccountId }
      : { partnerId: actor.partnerId, keyId: actor.serviceAccountId };
    identity = await ServiceAccount.findOne({ ...filter, status: 'active' }).lean();
  }
  if (!identity) return [];
  return (identity.roleBindings || [])
    .filter((binding) => bindingApplies(binding, tenant))
    .map((binding) => normalizeRoleKey(binding.roleKey))
    .filter(Boolean);
}

async function permissionsFromCustomRoles(roleKeys, actor) {
  const customKeys = roleKeys.filter((roleKey) => !hasBuiltInRole(roleKey));
  const roleIds = Array.isArray(actor.roleIds)
    ? actor.roleIds.filter((roleId) => mongoose.isValidObjectId(roleId))
    : [];
  if (!customKeys.length && !roleIds.length) return new Set();
  const roles = await Role.find({
    status: 'active',
    ...(actor.partnerId ? { partnerId: actor.partnerId } : {}),
    $or: [
      ...(customKeys.length ? [{ key: { $in: customKeys } }] : []),
      ...(roleIds.length ? [{ _id: { $in: roleIds } }] : []),
    ],
  }).lean();
  return new Set(roles.flatMap((role) => role.permissions || []));
}

async function actorPermissions(actor, resource, tenant, context = {}) {
  const roleKeys = [
    ...baseRoleKeys(actor, resource, context),
    ...(await roleKeysFromPersistentIdentity(actor, tenant)),
  ];
  const permissions = new Set(Array.isArray(actor.permissions) ? actor.permissions : []);
  for (const roleKey of roleKeys) {
    const builtIn = getBuiltInRole(roleKey);
    if (builtIn) {
      for (const permissionId of permissionsForBuiltInRole(roleKey)) permissions.add(permissionId);
    }
  }
  for (const permissionId of await permissionsFromCustomRoles(roleKeys, actor)) {
    permissions.add(permissionId);
  }
  return {
    roleKeys: [...new Set(roleKeys)],
    permissions,
  };
}

async function auditAuthorizationDecision(result) {
  if (result.context?.auditDecision === false) return;
  if (result.permission?.auditRequired !== true) return;
  if (mongoose.connection.readyState !== 1 && AuditLog.create === defaultAuditCreate) return;
  try {
    await createAuditLog(
      actorAuditType(result.actor),
      actorAuditId(result.actor),
      'authorization.decision',
      result.resource.type,
      result.resource.id,
      compact({
        permission: result.permission.id,
        registryId: PERMISSION_REGISTRY_ID,
        registryVersion: PERMISSION_REGISTRY_VERSION,
        decision: result.decision,
        reason: result.reason,
        actorType: result.actor.type,
        actorId: result.actor.id,
        organizationId: result.organizationId,
        workspaceId: result.workspaceId,
        resourceType: result.resource.type,
        resourceId: result.resource.id,
      }),
      {
        requestId: result.context.requestId,
        traceId: result.context.traceId,
        invocationId: result.context.invocationId,
      },
    );
  } catch {
    // Authorization decisions must never fail open or fail the business operation because the
    // audit sink is temporarily unavailable. The result itself remains deterministic.
  }
}

async function authorize(actorInput, permissionId, resourceInput = {}, context = {}) {
  const permission = getPermission(permissionId);
  const actor = normalizeActor(actorInput);
  const resource = normalizeResource(resourceInput);

  let result = {
    allowed: false,
    decision: 'DENY',
    reason: 'DEFAULT_DENY',
    permission: permission || {
      id: String(permissionId || ''),
      auditRequired: true,
    },
    actor,
    resource,
    context,
    organizationId: undefined,
    workspaceId: undefined,
    registryId: PERMISSION_REGISTRY_ID,
    registryVersion: PERMISSION_REGISTRY_VERSION,
  };

  if (!permission) {
    result.reason = 'UNKNOWN_PERMISSION';
    await auditAuthorizationDecision(result);
    return result;
  }
  if (!actor.type || !actor.id) {
    result.reason = 'ACTOR_REQUIRED';
    await auditAuthorizationDecision(result);
    return result;
  }

  const tenant = tenantDecision(actor, resource, context);
  result.organizationId = tenant.organizationId;
  result.workspaceId = tenant.workspaceId;
  if (!tenant.allowed) {
    result.reason = tenant.reason;
    await auditAuthorizationDecision(result);
    return result;
  }

  if (context.requireOwner === true && resource.ownerUserId && resource.ownerUserId !== actor.id) {
    result.reason = 'OWNER_MISMATCH';
    await auditAuthorizationDecision(result);
    return result;
  }

  const evaluated = await actorPermissions(actor, resource, tenant, context);
  if (!evaluated.permissions.has(permission.id)) {
    result.reason = evaluated.roleKeys.length ? 'PERMISSION_NOT_GRANTED' : 'NO_APPLICABLE_ROLE';
    result.roleKeys = evaluated.roleKeys;
    await auditAuthorizationDecision(result);
    return result;
  }

  result = {
    ...result,
    allowed: true,
    decision: 'ALLOW',
    reason: 'ROLE_PERMISSION_GRANTED',
    roleKeys: evaluated.roleKeys,
  };
  await auditAuthorizationDecision(result);
  return result;
}

async function assertAuthorized(actor, permissionId, resource, context = {}) {
  const decision = await authorize(actor, permissionId, resource, context);
  if (decision.allowed) return decision;
  const code =
    decision.reason === 'ACTOR_REQUIRED'
      ? ErrorCodes.AUTHENTICATION_REQUIRED
      : ErrorCodes.AUTHORIZATION_DENIED || ErrorCodes.FORBIDDEN;
  throw new AppError(
    code === ErrorCodes.AUTHENTICATION_REQUIRED ? 401 : 403,
    code,
    'Authorization denied.',
    [],
    {
      permission: permissionId,
      authorizationDecision: decision.decision,
      reasonCode: decision.reason,
      registryVersion: PERMISSION_REGISTRY_VERSION,
    },
  );
}

function actorFromPartner(partner, extras = {}) {
  if (!partner?._id && !extras.partnerId) return extras;
  const partnerId = idOf(partner?._id || extras.partnerId);
  return normalizeActor({
    ...extras,
    type: 'service_account',
    id: `partner:${partnerId}`,
    partnerId,
    organizationId: extras.organizationId || partnerId,
    auditActorType: 'partner',
    auditActorId: partnerId,
  });
}

function actorFromRuntimeActor(actor = {}, connection) {
  const partnerId = actor.partnerId || actor.partner?._id;
  const actorType = actor.type || actor.actorType || (connection ? 'user' : undefined);
  const actorId = actor.id || actor.actorId || (actorType === 'user' ? connection?.receivingUserId : undefined);
  const skipPersistentRoles =
    actor.skipPersistentRoles ??
    (!actor.enterpriseUserId && !actor.serviceAccountId && !partnerId);
  return normalizeActor({
    ...actor,
    type: actorType,
    id: actorId,
    partnerId,
    organizationId: actor.organizationId || partnerId,
    workspaceId:
      actor.workspaceId || actor.receivingWorkspaceId || connection?.receivingWorkspaceId,
    userId:
      actor.userId ||
      (actorType === 'user'
        ? actorId || actor.receivingUserId || connection?.receivingUserId
        : actor.receivingUserId),
    skipPersistentRoles,
    trustedSystem: actor.trustedSystem || Boolean(actor.durableWorkItemId),
  });
}

function resourceFromConnection(connection, type = 'Connection') {
  return normalizeResource({
    type,
    id: idOf(connection),
    partnerId: connection.partnerId,
    organizationId: connection.organizationId || connection.partnerId,
    workspaceId: connection.receivingWorkspaceId,
    ownerUserId: connection.receivingUserId,
  });
}

function resourceFromInvocation(invocation, connection) {
  return normalizeResource({
    type: 'Invocation',
    id: idOf(invocation),
    partnerId: connection?.partnerId,
    organizationId: connection?.organizationId || connection?.partnerId || invocation?.organizationId,
    workspaceId: invocation?.receivingWorkspaceId || connection?.receivingWorkspaceId,
    ownerUserId: connection?.receivingUserId,
  });
}

module.exports = {
  actorFromPartner,
  actorFromRuntimeActor,
  assertAuthorized,
  authorize,
  normalizeActor,
  normalizeResource,
  resourceFromConnection,
  resourceFromInvocation,
};
