const { listPermissions, PERMISSION_REGISTRY_VERSION } = require('./permissionRegistry');

const BUILT_IN_ROLE_DEFINITIONS = Object.freeze([
  {
    key: 'organization_owner',
    name: 'Organization Owner',
    description: 'Full organization owner with all registry permissions.',
    scope: 'organization',
  },
  {
    key: 'organization_admin',
    name: 'Organization Admin',
    description: 'Organization administrator for workspace, identity, and runtime operations.',
    scope: 'organization',
  },
  {
    key: 'security_admin',
    name: 'Security Admin',
    description: 'Security and governance administrator for roles, users, credentials, and audits.',
    scope: 'organization',
  },
  {
    key: 'workspace_admin',
    name: 'Workspace Admin',
    description: 'Workspace administrator for teams, connections, invocations, and operations.',
    scope: 'workspace',
  },
  {
    key: 'operator',
    name: 'Operator',
    description: 'Runtime operator for invocations, recovery, workers, and operational alerts.',
    scope: 'workspace',
  },
  {
    key: 'developer',
    name: 'Developer',
    description: 'Developer that can create passports, configure connections, and invoke agents.',
    scope: 'workspace',
  },
  {
    key: 'auditor',
    name: 'Auditor',
    description: 'Governance reader for audits, permissions, operations, and runtime state.',
    scope: 'organization',
  },
  {
    key: 'viewer',
    name: 'Viewer',
    description: 'Read-only user for low-risk workspace and runtime metadata.',
    scope: 'workspace',
  },
]);

const roleMetadataByKey = new Map(BUILT_IN_ROLE_DEFINITIONS.map((role) => [role.key, role]));

function permissionsForBuiltInRole(roleKey) {
  if (roleKey === 'organization_owner') return listPermissions().map((permission) => permission.id);
  return listPermissions()
    .filter((permission) => permission.defaultRoles.includes(roleKey))
    .map((permission) => permission.id);
}

function getBuiltInRole(roleKey) {
  const metadata = roleMetadataByKey.get(roleKey);
  if (!metadata) return undefined;
  return {
    ...metadata,
    builtIn: true,
    registryVersion: PERMISSION_REGISTRY_VERSION,
    permissions: permissionsForBuiltInRole(roleKey),
  };
}

function listBuiltInRoles() {
  return BUILT_IN_ROLE_DEFINITIONS.map((role) => getBuiltInRole(role.key));
}

function hasBuiltInRole(roleKey) {
  return roleMetadataByKey.has(roleKey);
}

module.exports = {
  getBuiltInRole,
  hasBuiltInRole,
  listBuiltInRoles,
  permissionsForBuiltInRole,
};
