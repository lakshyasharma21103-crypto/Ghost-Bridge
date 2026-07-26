const analytics = require('../services/pilotAnalytics.service');

function caller(request) {
  return {
    partner: request.partner,
    authorization: request.authorization,
    platformAuthorized: request.platformAuthorized === true,
    requestId: request.requestId,
    traceId: request.traceId,
  };
}

function input(request) {
  return {
    ...(request.query || {}),
    ...(request.body || {}),
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
  adoption: handler((r) => analytics.adoption(input(r), caller(r))),
  backfillCancel: handler((r) => analytics.backfillAction(r.params.backfillId, 'cancel', input(r), caller(r))),
  backfillPause: handler((r) => analytics.backfillAction(r.params.backfillId, 'pause', input(r), caller(r))),
  backfillResume: handler((r) => analytics.backfillAction(r.params.backfillId, 'resume', input(r), caller(r))),
  capabilityAdoption: handler((r) => analytics.capabilityAdoption(input(r), caller(r))),
  cohortEvaluate: handler((r) => analytics.evaluateCohort(r.params.cohortKey, input(r), caller(r))),
  createBackfill: handler((r) => analytics.createBackfill(input(r), caller(r)), 201),
  createCohort: handler((r) => analytics.createCohort(input(r), caller(r)), 201),
  createEvidence: handler((r) => analytics.createEvidence(input(r), caller(r)), 201),
  createExperiment: handler((r) => analytics.createExperiment(input(r), caller(r)), 201),
  createFeedbackTheme: handler((r) => analytics.createFeedbackTheme(input(r), caller(r)), 201),
  createFunnel: handler((r) => analytics.createFunnel(input(r), caller(r)), 201),
  createHypothesis: handler((r) => analytics.createHypothesis(input(r), caller(r)), 201),
  createMetric: handler((r) => analytics.createMetricDefinition(input(r), caller(r)), 201),
  createOpportunity: handler((r) => analytics.createOpportunity(input(r), caller(r)), 201),
  createSnapshot: handler((r) => analytics.createSnapshot(input(r), caller(r)), 201),
  createTrackingPlan: handler((r) => analytics.createTrackingPlan(input(r), caller(r)), 201),
  dataQuality: handler((r) => analytics.getDataQuality(input(r), caller(r))),
  deleteAnalytics: handler((r) => analytics.deleteAnalytics(input(r), caller(r))),
  eventDefinition: handler((r) => analytics.getEventDefinition(r.params.eventKey)),
  eventDefinitions: handler((r) => analytics.listEventDefinitions(input(r))),
  experimentApprove: handler((r) => analytics.experimentAction(r.params.experimentId, 'approve', input(r), caller(r))),
  experimentEvaluate: handler((r) => analytics.experimentAction(r.params.experimentId, 'evaluate', input(r), caller(r))),
  experimentPause: handler((r) => analytics.experimentAction(r.params.experimentId, 'pause', input(r), caller(r))),
  experimentResume: handler((r) => analytics.experimentAction(r.params.experimentId, 'resume', input(r), caller(r))),
  experimentStart: handler((r) => analytics.experimentAction(r.params.experimentId, 'start', input(r), caller(r))),
  experimentStop: handler((r) => analytics.experimentAction(r.params.experimentId, 'stop', input(r), caller(r))),
  experimentValidate: handler((r) => analytics.experimentAction(r.params.experimentId, 'validate', input(r), caller(r))),
  expansion: handler((r) => analytics.expansion(input(r), caller(r))),
  exportAnalytics: handler((r) => analytics.exportAnalytics(input(r), caller(r))),
  feedbackTrends: handler((r) => analytics.feedbackTrends(input(r), caller(r))),
  friction: handler((r) => analytics.friction(input(r), caller(r))),
  funnelEvaluate: handler((r) => analytics.evaluateFunnel(r.params.funnelKey, input(r), caller(r))),
  getBackfill: handler((r) => analytics.getBackfill(r.params.backfillId, input(r), caller(r))),
  getCohort: handler((r) => analytics.getCohort(r.params.cohortKey, input(r), caller(r))),
  getEvidence: handler((r) => analytics.getEvidence(r.params.evidenceId, input(r), caller(r))),
  getExperiment: handler((r) => analytics.getExperiment(r.params.experimentId, input(r), caller(r))),
  getFunnel: handler((r) => analytics.getFunnel(r.params.funnelKey, input(r), caller(r))),
  getHypothesis: handler((r) => analytics.getHypothesis(r.params.hypothesisId, input(r), caller(r))),
  getMetric: handler((r) => analytics.getMetricDefinition(r.params.metricKey, input(r), caller(r))),
  getOpportunity: handler((r) => analytics.getOpportunity(r.params.opportunityId, input(r), caller(r))),
  getSnapshot: handler((r) => analytics.getSnapshot(r.params.snapshotId, input(r), caller(r))),
  getTrackingPlan: handler((r) => analytics.getTrackingPlan(r.params.planId, input(r), caller(r))),
  hypothesisApprove: handler((r) => analytics.hypothesisAction(r.params.hypothesisId, 'approve', input(r), caller(r))),
  hypothesisValidate: handler((r) => analytics.hypothesisAction(r.params.hypothesisId, 'validate', input(r), caller(r))),
  ingestEvent: handler((r) => analytics.ingestEvent(input(r), caller(r)), 202),
  instrumentation: handler((r) => analytics.getInstrumentationCoverage(input(r), caller(r))),
  listBackfills: handler((r) => analytics.listBackfills(input(r), caller(r))),
  listCohorts: handler((r) => analytics.listCohorts(input(r), caller(r))),
  listExperiments: handler((r) => analytics.listExperiments(input(r), caller(r))),
  listFeedbackThemes: handler((r) => analytics.listFeedbackThemes(input(r), caller(r))),
  listFunnels: handler((r) => analytics.listFunnels(input(r), caller(r))),
  listHypotheses: handler((r) => analytics.listHypotheses(input(r), caller(r))),
  listMetrics: handler((r) => analytics.listMetricDefinitions(input(r), caller(r))),
  listOpportunities: handler((r) => analytics.listOpportunities(input(r), caller(r))),
  listSnapshots: handler((r) => analytics.listSnapshots(input(r), caller(r))),
  listTrackingPlans: handler((r) => analytics.listTrackingPlans(input(r), caller(r))),
  metricActivate: handler((r) => analytics.metricAction(r.params.metricKey, 'activate', input(r), caller(r))),
  metricArchive: handler((r) => analytics.metricAction(r.params.metricKey, 'archive', input(r), caller(r))),
  metricUpdate: handler((r) => analytics.metricAction(r.params.metricKey, 'update', input(r), caller(r))),
  metricValidate: handler((r) => analytics.metricAction(r.params.metricKey, 'validate', input(r), caller(r))),
  opportunityApprove: handler((r) => analytics.opportunityAction(r.params.opportunityId, 'approve', input(r), caller(r))),
  opportunityArchive: handler((r) => analytics.opportunityAction(r.params.opportunityId, 'archive', input(r), caller(r))),
  opportunityUpdate: handler((r) => analytics.opportunityAction(r.params.opportunityId, 'update', input(r), caller(r))),
  providerImpact: handler((r) => analytics.providerImpact(input(r), caller(r))),
  recommendations: handler((r) => analytics.recommendations(input(r), caller(r))),
  retention: handler((r) => analytics.getRetention(input(r), caller(r))),
  supportTrends: handler((r) => analytics.supportTrends(input(r), caller(r))),
  trackingPlanActivate: handler((r) => analytics.trackingPlanAction(r.params.planId, 'activate', input(r), caller(r))),
  trackingPlanArchive: handler((r) => analytics.trackingPlanAction(r.params.planId, 'archive', input(r), caller(r))),
  trackingPlanUpdate: handler((r) => analytics.trackingPlanAction(r.params.planId, 'update', input(r), caller(r))),
  trackingPlanValidate: handler((r) => analytics.trackingPlanAction(r.params.planId, 'validate', input(r), caller(r))),
};
