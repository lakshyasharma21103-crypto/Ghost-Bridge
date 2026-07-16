const service = require('../services/secretGovernance.service');

function actor(request) {
  return {
    partner: request.partner,
    requestId: request.requestId,
    traceId: request.traceId,
  };
}

function input(request) {
  return { ...request.query, ...request.body };
}

function handler(operation, statusCode = 200) {
  return async (request, response, next) => {
    try {
      const data = await operation(request, input(request), actor(request));
      response.status(statusCode).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  activateVersion: handler((request, value, caller) =>
    service.activateVersion(request.params.secretId, request.params.versionId, value, caller),
  ),
  addVersion: handler(
    (request, value, caller) => service.addPendingVersion(request.params.secretId, value, caller),
    201,
  ),
  audit: handler((_request, value, caller) => service.secretAudit(value, caller)),
  bindings: handler((request, value, caller) =>
    service.listBindings(request.params.secretId, value, caller),
  ),
  checkHealth: handler((request, value, caller) =>
    service.checkSecretHealth(request.params.secretId, value, caller),
  ),
  create: handler((_request, value, caller) => service.createSecret(value, caller), 201),
  createBinding: handler(
    (request, value, caller) => service.createBinding(request.params.secretId, value, caller),
    201,
  ),
  destroyVersion: handler((request, value, caller) =>
    service.destroyVersion(request.params.secretId, request.params.versionId, value, caller),
  ),
  disable: handler((request, value, caller) =>
    service.disableSecret(request.params.secretId, value, caller),
  ),
  enable: handler((request, value, caller) =>
    service.enableSecret(request.params.secretId, value, caller),
  ),
  get: handler((request, value, caller) =>
    service.getSecret(request.params.secretId, value, caller),
  ),
  health: handler((request, value, caller) =>
    service.secretHealth(request.params.secretId, value, caller),
  ),
  keyUsage: handler((_request, value, caller) => service.keyVersionUsage(value, caller)),
  list: handler((_request, value, caller) => service.listSecrets(value, caller)),
  retireVersion: handler((request, value, caller) =>
    service.retireVersion(request.params.secretId, request.params.versionId, value, caller),
  ),
  rewrap: handler((_request, value, caller) => service.runRewrap(value, caller), 202),
  revoke: handler((request, value, caller) =>
    service.revokeSecret(request.params.secretId, value, caller),
  ),
  revokeBinding: handler((request, value, caller) =>
    service.revokeBinding(request.params.secretId, request.params.bindingId, value, caller),
  ),
  revokeVersion: handler((request, value, caller) =>
    service.revokeVersion(request.params.secretId, request.params.versionId, value, caller),
  ),
  rotate: handler((request, value, caller) =>
    service.rotateSecret(request.params.secretId, value, caller),
  ),
  rotations: handler((request, value, caller) =>
    service.listRotations(request.params.secretId, value, caller),
  ),
  validateVersion: handler((request, value, caller) =>
    service.validateVersion(request.params.secretId, request.params.versionId, value, caller),
  ),
  versions: handler((request, value, caller) =>
    service.listVersions(request.params.secretId, value, caller),
  ),
};
