const service = require('../services/enterpriseIdentity.service');

function handler(operation) {
  return async (request, response, next) => {
    try {
      const data = await operation(request.query, {
        partner: request.partner,
        requestId: request.requestId,
        traceId: request.traceId,
      });
      response.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

async function inspectPermission(request, response, next) {
  try {
    const data = await service.inspectPermission(request.params.id, request.query, {
      partner: request.partner,
      requestId: request.requestId,
      traceId: request.traceId,
    });
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  authorizationAudit: handler(service.listAuthorizationAudit),
  inspectPermission,
  organizations: handler(service.listOrganizations),
  permissions: handler(service.listPermissions),
  roles: handler(service.listRoles),
  serviceAccounts: handler(service.listServiceAccounts),
  teams: handler(service.listTeams),
  users: handler(service.listUsers),
  workspaces: handler(service.listWorkspaces),
};
