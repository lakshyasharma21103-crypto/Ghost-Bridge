const { assertAuthorized, actorFromPartner } = require('../services/authorization.service');

function pickWorkspace(request) {
  return (
    request.body?.receivingWorkspaceId ||
    request.query?.receivingWorkspaceId ||
    request.body?.workspaceId ||
    request.query?.workspaceId
  );
}

function pickUser(request) {
  return request.body?.receivingUserId || request.query?.receivingUserId;
}

function actorFromRequest(request) {
  if (request.partner) {
    return actorFromPartner(request.partner, {
      workspaceId: pickWorkspace(request),
      requestId: request.requestId,
      traceId: request.traceId,
    });
  }
  const userId = pickUser(request);
  if (!userId) return {};
  return {
    type: 'user',
    id: userId,
    userId,
    workspaceId: pickWorkspace(request),
    requestId: request.requestId,
    traceId: request.traceId,
  };
}

function resourceFromRequest(request, options = {}) {
  return {
    type: options.resourceType || 'Request',
    id: request.params?.id || request.params?.passportId || request.params?.keyId || request.path,
    partnerId: request.partner?._id,
    organizationId: request.body?.organizationId || request.query?.organizationId || request.partner?._id,
    workspaceId: pickWorkspace(request),
    ownerUserId: pickUser(request),
  };
}

function requiresPermission(permissionId, options = {}) {
  return async (request, _response, next) => {
    try {
      request.authorization = await assertAuthorized(
        actorFromRequest(request),
        typeof permissionId === 'function' ? permissionId(request) : permissionId,
        typeof options.resource === 'function'
          ? options.resource(request)
          : resourceFromRequest(request, options),
        {
          requestId: request.requestId,
          traceId: request.traceId,
          workspaceId: pickWorkspace(request),
          allowLegacyOwner: options.allowLegacyOwner === true,
          allowWorkspaceUser: options.allowWorkspaceUser === true,
        },
      );
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  actorFromRequest,
  requiresPermission,
  resourceFromRequest,
};
