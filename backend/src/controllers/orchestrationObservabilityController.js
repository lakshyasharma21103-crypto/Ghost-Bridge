const service = require('../services/orchestrationObservability.service');

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
  overview: handler((request) => service.operationsOverview(input(request), caller(request))),
  runObservability: handler((request) =>
    service.getRunObservability(request.params.runId, input(request), caller(request)),
  ),
  runTimeline: handler((request) =>
    service.listRunTimeline(request.params.runId, input(request), caller(request)),
  ),
  rebuildTimeline: handler((request) =>
    service.rebuildTimelineForRun(request.params.runId, input(request), caller(request)),
  ),
  runTrace: handler((request) =>
    service.getRunTrace(request.params.runId, input(request), caller(request)),
  ),
  rebuildTrace: handler((request) =>
    service.rebuildTraceForRun(request.params.runId, input(request), caller(request)),
  ),
  runHealth: handler((request) =>
    service.getRunHealth(request.params.runId, input(request), caller(request)),
  ),
  runCriticalPath: handler((request) =>
    service.getRunCriticalPath(request.params.runId, input(request), caller(request)),
  ),
  createDiagnosticExport: handler(
    (request) => service.createDiagnosticExport(request.params.runId, input(request), caller(request)),
    201,
  ),
  listSloPolicies: handler((request) => service.listSloPolicies(input(request), caller(request))),
  createSloPolicy: handler(
    (request) => service.createSloPolicy(input(request), caller(request)),
    201,
  ),
  updateSloPolicy: handler((request) =>
    service.updateSloPolicy(request.params.policyId, input(request), caller(request)),
  ),
  activateSloPolicy: handler((request) =>
    service.activateSloPolicy(request.params.policyId, input(request), caller(request)),
  ),
  evaluateSloPolicy: handler((request) =>
    service.evaluateSloPolicyById(request.params.policyId, input(request), caller(request)),
  ),
  listAllSloEvaluations: handler((request) =>
    service.listSloEvaluations(null, input(request), caller(request)),
  ),
  listSloEvaluations: handler((request) =>
    service.listSloEvaluations(request.params.policyId, input(request), caller(request)),
  ),
  listAlertRules: handler((request) => service.listAlertRules(input(request), caller(request))),
  createAlertRule: handler(
    (request) => service.createAlertRule(input(request), caller(request)),
    201,
  ),
  activateAlertRule: handler((request) =>
    service.activateAlertRule(request.params.ruleId, input(request), caller(request)),
  ),
  listAlerts: handler((request) => service.listAlerts(input(request), caller(request))),
  acknowledgeAlert: handler((request) =>
    service.transitionAlert(request.params.alertId, 'acknowledge', input(request), caller(request)),
  ),
  suppressAlert: handler((request) =>
    service.transitionAlert(request.params.alertId, 'suppress', input(request), caller(request)),
  ),
  resolveAlert: handler((request) =>
    service.transitionAlert(request.params.alertId, 'resolve', input(request), caller(request)),
  ),
  fleetControl: (action) =>
    handler((request) => service.createOrReleaseControl(action, input(request), caller(request))),
  cleanupRetention: handler((request) => service.cleanupRetention(input(request), caller(request))),
};
