const commercial = require('../services/gaCommercial.service');

function caller(request) {
  return {
    partner: request.partner,
    requestId: request.requestId,
    traceId: request.traceId,
    observer: request.observer,
    authorization: request.authorization,
    platformAuthorized: request.platformAuthorized === true,
  };
}

function input(request, extra = {}) {
  return {
    ...(request.query || {}),
    ...(request.body || {}),
    ...extra,
    idempotencyKey: request.get('Idempotency-Key') || request.body?.idempotencyKey,
  };
}

function handler(operation, status = 200) {
  return async (request, response, next) => {
    try {
      response.status(status).json({ success: true, data: await operation(request) });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  action: handler((r) => commercial.actionResource(r.params.resource, r.params.id, r.params.action, input(r), caller(r))),
  create: handler((r) => commercial.createResource(r.params.resource, input(r), caller(r)), 201),
  evidence: handler((r) => commercial.commercialEvidence(input(r), caller(r)), 201),
  evaluateEntitlements: handler((r) => commercial.evaluateEntitlements(input(r), caller(r))),
  evaluateReadiness: handler((r) => commercial.evaluateReadiness(input(r), caller(r))),
  exportCommercial: handler((r) => commercial.commercialExport(input(r), caller(r))),
  get: handler((r) => commercial.getResource(r.params.resource, r.params.id, input(r), caller(r))),
  invoicePreview: handler((r) => commercial.invoicePreview(input(r), caller(r))),
  list: handler((r) => commercial.listResources(r.params.resource, input(r), caller(r))),
  paymentWebhook: handler((r) => commercial.paymentWebhook(r.params.provider, input(r))),
  recordUsage: handler((r) => commercial.recordUsage(input(r), caller(r)), 201),
  reconcileUsage: handler((r) => commercial.reconcileUsage(input(r), caller(r))),
  taxEstimate: handler((r) => commercial.taxEstimate(input(r), caller(r))),
  update: handler((r) => commercial.updateResource(r.params.resource, r.params.id, input(r), caller(r))),
  usageAggregates: handler((r) => commercial.usageAggregates(input(r), caller(r))),
};
