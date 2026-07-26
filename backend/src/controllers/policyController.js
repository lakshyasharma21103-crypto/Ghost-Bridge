const service = require('../services/policy.service');

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
  activate: handler((request, value, caller) =>
    service.activateDraft(request.params.stablePolicyId, request.params.version, value, caller),
  ),
  attributes: handler((_request, value, caller) => service.attributeRegistry(value, caller)),
  capabilityGovernance: handler((request, value, caller) =>
    service.capabilityGovernance(request.params.passportId, value, caller),
  ),
  create: handler((_request, value, caller) => service.createDraft(value, caller), 201),
  createVersion: handler(
    (request, value, caller) =>
      service.createNewVersion(request.params.stablePolicyId, value, caller),
    201,
  ),
  get: handler((request, value, caller) =>
    service.getPolicy(request.params.stablePolicyId, value, caller),
  ),
  history: handler((request, value, caller) =>
    service.policyHistory(request.params.stablePolicyId, value, caller),
  ),
  list: handler((_request, value, caller) => service.listPolicies(value, caller)),
  audit: handler((_request, value, caller) => service.policyAudit(value, caller)),
  retire: handler((request, value, caller) =>
    service.retirePolicy(request.params.stablePolicyId, request.params.version, value, caller),
  ),
  simulate: handler((request, value, caller) =>
    service.simulateDraft(request.params.stablePolicyId, request.params.version, value, caller),
  ),
  update: handler((request, value, caller) =>
    service.updateDraft(request.params.stablePolicyId, request.params.version, value, caller),
  ),
  validate: handler((request, value, caller) =>
    service.validateDraft(request.params.stablePolicyId, request.params.version, value, caller),
  ),
};
