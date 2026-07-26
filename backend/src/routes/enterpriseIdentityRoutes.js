const express = require('express');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');
const controller = require('../controllers/enterpriseIdentityController');

const enterpriseIdentityRouter = express.Router();

enterpriseIdentityRouter.use(authenticatePartner);
enterpriseIdentityRouter.get(
  '/organizations',
  requiresPermission('organization.read', { resourceType: 'Organization' }),
  controller.organizations,
);
enterpriseIdentityRouter.get(
  '/workspaces',
  requiresPermission('workspace.read', { resourceType: 'Workspace' }),
  controller.workspaces,
);
enterpriseIdentityRouter.get(
  '/teams',
  requiresPermission('team.read', { resourceType: 'Team' }),
  controller.teams,
);
enterpriseIdentityRouter.get(
  '/users',
  requiresPermission('user.read', { resourceType: 'User' }),
  controller.users,
);
enterpriseIdentityRouter.get(
  '/service-accounts',
  requiresPermission('service_account.read', { resourceType: 'ServiceAccount' }),
  controller.serviceAccounts,
);
enterpriseIdentityRouter.get(
  '/roles',
  requiresPermission('role.read', { resourceType: 'Role' }),
  controller.roles,
);
enterpriseIdentityRouter.get(
  '/permissions',
  requiresPermission('permission.read', { resourceType: 'PermissionRegistry' }),
  controller.permissions,
);
enterpriseIdentityRouter.get(
  '/permissions/:id',
  requiresPermission('permission.read', { resourceType: 'Permission' }),
  controller.inspectPermission,
);
enterpriseIdentityRouter.get(
  '/authorization-audit',
  requiresPermission('audit.read', { resourceType: 'AuthorizationAudit' }),
  controller.authorizationAudit,
);

module.exports = {
  enterpriseIdentityRouter,
};
