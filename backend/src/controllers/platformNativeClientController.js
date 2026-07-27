'use strict';

const {
  FIXTURE_OPT_IN_HEADER,
  getPlatformNativeClientAdapter,
} = require('../services/platformNativeClient.service');

function adapterFor(request) {
  return request.app?.locals?.platformNativeClientAdapter || getPlatformNativeClientAdapter();
}

function context(request) {
  return {
    principal: request.authenticatedPrincipal,
    requestId: request.requestId,
    traceId: request.traceId,
    observer: request.observer,
    fixtureOptIn: request.get(FIXTURE_OPT_IN_HEADER) === '1',
  };
}

function handler(method, statusCode = 200) {
  return async (request, response, next) => {
    try {
      const data = await adapterFor(request)[method](request.body || {}, context(request));
      response.status(statusCode).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  cancelTask: handler('cancelTask'),
  checkRevocation: handler('checkRevocation'),
  continueApproval: handler('continueApproval'),
  discover: handler('discover'),
  getReceipt: handler('getReceipt'),
  getTask: handler('getTask'),
  getTaskResult: handler('getTaskResult'),
  install: handler('install', 201),
  invoke: handler('invoke'),
  verifyReceipt: handler('verifyReceipt'),
};
