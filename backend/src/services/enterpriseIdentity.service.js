const AuditLog = require('../models/AuditLog');
const EnterpriseUser = require('../models/EnterpriseUser');
const Organization = require('../models/Organization');
const Role = require('../models/Role');
const ServiceAccount = require('../models/ServiceAccount');
const Team = require('../models/Team');
const Workspace = require('../models/Workspace');
const { listBuiltInRoles } = require('../constants/builtInRoles');
const {
  PERMISSION_REGISTRY_VERSION,
  getPermission,
  getPermissionRegistry,
} = require('../constants/permissionRegistry');
const { actorFromPartner, assertAuthorized } = require('./authorization.service');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function partnerIdFrom(actor = {}) {
  return actor?.partner?._id || actor?.partnerId;
}

function identityScope(input = {}, actor = {}) {
  const partnerId = partnerIdFrom(actor);
  if (!partnerId) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      'Authenticated Partner access is required.',
    );
  }
  const workspaceId = String(input.receivingWorkspaceId || input.workspaceId || '').trim();
  return {
    partnerId: idOf(partnerId),
    organizationId: idOf(input.organizationId || partnerId),
    workspaceId: workspaceId || undefined,
  };
}

async function authorizeEnterpriseRead(permission, input, actor) {
  const scope = identityScope(input, actor);
  await assertAuthorized(
    actorFromPartner(actor.partner || { _id: scope.partnerId }, { workspaceId: scope.workspaceId }),
    permission,
    {
      type: 'Enterprise',
      id: scope.workspaceId || scope.organizationId,
      partnerId: scope.partnerId,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
    },
    {
      requestId: actor.requestId,
      traceId: actor.traceId,
      workspaceId: scope.workspaceId,
    },
  );
  return scope;
}

function syntheticOrganization(actor, scope) {
  const partner = actor.partner || {};
  return {
    id: `partner:${scope.partnerId}`,
    partnerId: scope.partnerId,
    name: partner.name || 'Partner Organization',
    slug: partner.slug || `partner-${scope.partnerId}`,
    status: partner.status || 'active',
    source: 'partner',
    registryVersion: PERMISSION_REGISTRY_VERSION,
  };
}

function serializeOrganization(organization) {
  return {
    id: idOf(organization),
    partnerId: idOf(organization.partnerId),
    name: organization.name,
    slug: organization.slug,
    status: organization.status,
    source: 'enterprise',
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
}

function serializeWorkspace(workspace) {
  return {
    id: idOf(workspace),
    organizationId: idOf(workspace.organizationId || workspace.partnerId),
    partnerId: idOf(workspace.partnerId),
    externalWorkspaceId: workspace.externalWorkspaceId,
    name: workspace.name,
    slug: workspace.slug,
    status: workspace.status,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

function serializeTeam(team) {
  return {
    id: idOf(team),
    organizationId: idOf(team.organizationId || team.partnerId),
    partnerId: idOf(team.partnerId),
    workspaceId: idOf(team.workspaceId),
    externalWorkspaceId: team.externalWorkspaceId,
    name: team.name,
    slug: team.slug,
    memberCount: Array.isArray(team.memberUserIds) ? team.memberUserIds.length : 0,
    status: team.status,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

function serializeUser(user) {
  return {
    id: idOf(user),
    organizationId: idOf(user.organizationId || user.partnerId),
    partnerId: idOf(user.partnerId),
    externalUserId: user.externalUserId,
    email: user.email,
    displayName: user.displayName,
    externalWorkspaceIds: user.externalWorkspaceIds || [],
    roleBindings: user.roleBindings || [],
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function serializeServiceAccount(account) {
  return {
    id: idOf(account),
    organizationId: idOf(account.organizationId || account.partnerId),
    partnerId: idOf(account.partnerId),
    workspaceId: idOf(account.workspaceId),
    externalWorkspaceId: account.externalWorkspaceId,
    name: account.name,
    keyId: account.keyId,
    roleBindings: account.roleBindings || [],
    status: account.status,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

function serializeRole(role) {
  return {
    id: idOf(role._id || role.key),
    key: role.key,
    name: role.name,
    description: role.description,
    scope: role.scope,
    builtIn: role.builtIn === true,
    registryVersion: role.registryVersion || PERMISSION_REGISTRY_VERSION,
    permissions: role.permissions || [],
    status: role.status || 'active',
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

async function listOrganizations(input = {}, actor = {}) {
  const scope = await authorizeEnterpriseRead('organization.read', input, actor);
  const organizations = await Organization.find({ partnerId: scope.partnerId, status: { $ne: 'deleted' } })
    .sort({ name: 1 })
    .lean();
  return {
    items: organizations.length
      ? organizations.map(serializeOrganization)
      : [syntheticOrganization(actor, scope)],
  };
}

async function listWorkspaces(input = {}, actor = {}) {
  const scope = await authorizeEnterpriseRead('workspace.read', input, actor);
  const filter = {
    partnerId: scope.partnerId,
    status: { $ne: 'deleted' },
    ...(scope.workspaceId ? { externalWorkspaceId: scope.workspaceId } : {}),
  };
  const workspaces = await Workspace.find(filter).sort({ name: 1 }).lean();
  if (!workspaces.length && scope.workspaceId) {
    return {
      items: [
        {
          id: `workspace:${scope.workspaceId}`,
          organizationId: scope.organizationId,
          partnerId: scope.partnerId,
          externalWorkspaceId: scope.workspaceId,
          name: scope.workspaceId,
          slug: scope.workspaceId.toLowerCase(),
          status: 'active',
          source: 'receivingWorkspaceId',
        },
      ],
    };
  }
  return { items: workspaces.map(serializeWorkspace) };
}

async function listTeams(input = {}, actor = {}) {
  const scope = await authorizeEnterpriseRead('team.read', input, actor);
  const teams = await Team.find({
    partnerId: scope.partnerId,
    ...(scope.workspaceId ? { externalWorkspaceId: scope.workspaceId } : {}),
  })
    .sort({ name: 1 })
    .lean();
  return { items: teams.map(serializeTeam) };
}

async function listUsers(input = {}, actor = {}) {
  const scope = await authorizeEnterpriseRead('user.read', input, actor);
  const users = await EnterpriseUser.find({
    partnerId: scope.partnerId,
    status: { $ne: 'deleted' },
    ...(scope.workspaceId ? { externalWorkspaceIds: scope.workspaceId } : {}),
  })
    .sort({ displayName: 1 })
    .lean();
  return { items: users.map(serializeUser) };
}

async function listServiceAccounts(input = {}, actor = {}) {
  const scope = await authorizeEnterpriseRead('service_account.read', input, actor);
  const accounts = await ServiceAccount.find({
    partnerId: scope.partnerId,
    status: { $ne: 'deleted' },
    ...(scope.workspaceId ? { externalWorkspaceId: scope.workspaceId } : {}),
  })
    .sort({ name: 1 })
    .lean();
  return { items: accounts.map(serializeServiceAccount) };
}

async function listRoles(input = {}, actor = {}) {
  const scope = await authorizeEnterpriseRead('role.read', input, actor);
  const customRoles = await Role.find({ partnerId: scope.partnerId, status: 'active' })
    .sort({ name: 1 })
    .lean();
  return {
    registryVersion: PERMISSION_REGISTRY_VERSION,
    items: [...listBuiltInRoles(), ...customRoles].map(serializeRole),
  };
}

async function listPermissions(input = {}, actor = {}) {
  await authorizeEnterpriseRead('permission.read', input, actor);
  return getPermissionRegistry();
}

async function inspectPermission(permissionId, input = {}, actor = {}) {
  await authorizeEnterpriseRead('permission.read', input, actor);
  const permission = getPermission(permissionId);
  if (!permission) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Permission was not found.');
  }
  return permission;
}

function serializeAuthorizationAudit(log) {
  const metadata = log.metadata || {};
  return {
    id: idOf(log),
    actorType: log.actorType,
    actorId: log.actorId,
    permission: metadata.permission,
    registryVersion: metadata.registryVersion,
    resourceType: metadata.resourceType || log.entityType,
    resourceId: metadata.resourceId || log.entityId,
    organizationId: metadata.organizationId || log.organizationId,
    workspaceId: metadata.workspaceId || log.workspaceId,
    decision: metadata.decision,
    reason: metadata.reason,
    requestId: log.requestId,
    traceId: log.traceId,
    createdAt: log.createdAt,
  };
}

async function listAuthorizationAudit(input = {}, actor = {}) {
  const scope = await authorizeEnterpriseRead('audit.read', input, actor);
  const filter = {
    action: 'authorization.decision',
    $or: [
      { organizationId: scope.organizationId },
      { 'metadata.organizationId': scope.organizationId },
      { 'metadata.organizationId': scope.partnerId },
    ],
    ...(scope.workspaceId
      ? {
          $and: [
            {
              $or: [
                { workspaceId: scope.workspaceId },
                { 'metadata.workspaceId': scope.workspaceId },
                { 'metadata.receivingWorkspaceId': scope.workspaceId },
              ],
            },
          ],
        }
      : {}),
  };
  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return { items: logs.map(serializeAuthorizationAudit) };
}

module.exports = {
  inspectPermission,
  listAuthorizationAudit,
  listOrganizations,
  listPermissions,
  listRoles,
  listServiceAccounts,
  listTeams,
  listUsers,
  listWorkspaces,
};
