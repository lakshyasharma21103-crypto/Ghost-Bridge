const service = require('../services/agentSelection.service');

function caller(request) {
  return {
    partner: request.partner,
    requestId: request.requestId,
    traceId: request.traceId,
    observer: request.observer,
  };
}

function input(request, extra = {}) {
  return { ...request.query, ...request.body, ...extra };
}

function handler(operation, statusCode = 200) {
  return async (request, response, next) => {
    try {
      const data = await operation(request);
      response.status(statusCode).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  listCapabilities: handler((request) => service.listCapabilities(input(request), caller(request))),
  listAgents: handler((request) => service.listAgents(input(request), caller(request))),
  getAgent: handler((request) => service.getAgent(request.params.connectionId, input(request), caller(request))),
  compatibilityCheck: handler((request) => service.compatibilityCheck(input(request), caller(request))),
  createPolicy: handler((request) => service.createPolicy(input(request), caller(request)), 201),
  listPolicies: handler((request) => service.listPolicies(input(request), caller(request))),
  getPolicy: handler((request) => service.getPolicy(request.params.policyId, input(request), caller(request))),
  updatePolicy: handler((request) => service.updatePolicy(request.params.policyId, input(request), caller(request))),
  validatePolicy: handler((request) => service.validatePolicy(request.params.policyId, input(request), caller(request))),
  activatePolicy: handler((request) => service.activatePolicy(request.params.policyId, input(request), caller(request))),
  archivePolicy: handler((request) => service.archivePolicy(request.params.policyId, input(request), caller(request))),
  evaluate: handler((request) => service.evaluateSelection(input(request), caller(request)), 201),
  listDecisions: handler((request) => service.listDecisions(input(request), caller(request))),
  getDecision: handler((request) => service.getDecision(request.params.decisionId, input(request), caller(request))),
  verifyAgent: handler((request) => service.updateTrust(request.params.connectionId, input(request), caller(request), 'verification')),
  updateTrustTier: handler((request) => service.updateTrust(request.params.connectionId, input(request), caller(request), 'trust')),
};
