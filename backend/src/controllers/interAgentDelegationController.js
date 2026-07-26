const service = require('../services/interAgentDelegation.service');

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
      response.status(statusCode).json({ success: true, data: await operation(request) });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  createContract: handler((request) => service.createContract(input(request), caller(request)), 201),
  listContracts: handler((request) => service.listContracts(input(request), caller(request))),
  getContract: handler((request) => service.getContract(request.params.contractId, input(request), caller(request))),
  updateContract: handler((request) => service.updateContract(request.params.contractId, input(request), caller(request))),
  validateContract: handler((request) => service.validateContract(request.params.contractId, input(request), caller(request))),
  activateContract: handler((request) => service.activateContract(request.params.contractId, input(request), caller(request))),
  archiveContract: handler((request) => service.archiveContract(request.params.contractId, input(request), caller(request))),
  createGrant: handler((request) => service.createGrant(input(request), caller(request)), 201),
  listGrants: handler((request) => service.listGrants(input(request), caller(request))),
  getGrant: handler((request) => service.getGrant(request.params.grantId, input(request), caller(request))),
  revokeGrant: handler((request) => service.revokeGrant(request.params.grantId, input(request), caller(request))),
  evaluate: handler((request) => service.evaluateDelegation(input(request), caller(request))),
  preview: handler((request) => service.previewDelegation(input(request), caller(request))),
  listInvocations: handler((request) => service.listInvocations(input(request), caller(request))),
  getInvocation: handler((request) => service.getInvocation(request.params.invocationId, input(request), caller(request))),
};
