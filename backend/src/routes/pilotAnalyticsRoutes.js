const express = require('express');
const controller = require('../controllers/pilotAnalyticsController');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');

const pilotAnalyticsRouter = express.Router();
pilotAnalyticsRouter.use(authenticatePartner);

function protect(method, route, permission, resourceType, handler) {
  pilotAnalyticsRouter[method](route, requiresPermission(permission, { resourceType }), handler);
}

protect('post', '/tracking-plans', 'analyticsTrackingPlan.create', 'AnalyticsTrackingPlan', controller.createTrackingPlan);
protect('get', '/tracking-plans', 'analyticsTrackingPlan.read', 'AnalyticsTrackingPlan', controller.listTrackingPlans);
protect('get', '/tracking-plans/:planId', 'analyticsTrackingPlan.read', 'AnalyticsTrackingPlan', controller.getTrackingPlan);
protect('patch', '/tracking-plans/:planId', 'analyticsTrackingPlan.update', 'AnalyticsTrackingPlan', controller.trackingPlanUpdate);
for (const [action, permission, handler] of [
  ['validate', 'analyticsTrackingPlan.validate', controller.trackingPlanValidate],
  ['activate', 'analyticsTrackingPlan.activate', controller.trackingPlanActivate],
  ['archive', 'analyticsTrackingPlan.archive', controller.trackingPlanArchive],
]) protect('post', `/tracking-plans/:planId/${action}`, permission, 'AnalyticsTrackingPlan', handler);

protect('get', '/event-definitions', 'analyticsEventDefinition.read', 'AnalyticsEventDefinition', controller.eventDefinitions);
protect('get', '/event-definitions/:eventKey', 'analyticsEventDefinition.read', 'AnalyticsEventDefinition', controller.eventDefinition);
protect('post', '/events', 'analyticsEvent.ingest', 'PilotAnalyticsEvent', controller.ingestEvent);
protect('get', '/events/quality', 'analyticsDataQuality.read', 'PilotAnalyticsEvent', controller.dataQuality);
protect('post', '/events/delete', 'pilotAnalyticsBackfill.create', 'PilotAnalyticsEvent', controller.deleteAnalytics);
protect('get', '/instrumentation-coverage', 'analyticsInstrumentation.read', 'AnalyticsInstrumentationCoverage', controller.instrumentation);

protect('post', '/metric-definitions', 'pilotMetricDefinition.create', 'PilotMetricDefinition', controller.createMetric);
protect('get', '/metric-definitions', 'pilotMetricDefinition.read', 'PilotMetricDefinition', controller.listMetrics);
protect('get', '/metric-definitions/:metricKey', 'pilotMetricDefinition.read', 'PilotMetricDefinition', controller.getMetric);
protect('patch', '/metric-definitions/:metricKey', 'pilotMetricDefinition.update', 'PilotMetricDefinition', controller.metricUpdate);
for (const [action, permission, handler] of [
  ['validate', 'pilotMetricDefinition.validate', controller.metricValidate],
  ['activate', 'pilotMetricDefinition.activate', controller.metricActivate],
  ['archive', 'pilotMetricDefinition.archive', controller.metricArchive],
]) protect('post', `/metric-definitions/:metricKey/${action}`, permission, 'PilotMetricDefinition', handler);

protect('post', '/funnels', 'pilotFunnel.create', 'PilotFunnelDefinition', controller.createFunnel);
protect('get', '/funnels', 'pilotFunnel.read', 'PilotFunnelDefinition', controller.listFunnels);
protect('get', '/funnels/:funnelKey', 'pilotFunnel.read', 'PilotFunnelDefinition', controller.getFunnel);
protect('post', '/funnels/:funnelKey/evaluate', 'pilotFunnel.evaluate', 'PilotFunnelDefinition', controller.funnelEvaluate);

protect('post', '/cohorts', 'pilotCohort.create', 'PilotCohortDefinition', controller.createCohort);
protect('get', '/cohorts', 'pilotCohort.read', 'PilotCohortDefinition', controller.listCohorts);
protect('get', '/cohorts/:cohortKey', 'pilotCohort.read', 'PilotCohortDefinition', controller.getCohort);
protect('post', '/cohorts/:cohortKey/evaluate', 'pilotCohort.evaluate', 'PilotCohortDefinition', controller.cohortEvaluate);
protect('get', '/retention', 'pilotRetention.read', 'PilotCohortDefinition', controller.retention);

protect('get', '/adoption', 'pilotAdoption.read', 'PilotAnalyticsProjection', controller.adoption);
protect('get', '/adoption/capabilities', 'pilotAdoption.readDetails', 'PilotAnalyticsProjection', controller.capabilityAdoption);
protect('get', '/adoption/friction', 'pilotAdoption.readDetails', 'PilotAnalyticsProjection', controller.friction);
protect('get', '/adoption/provider-impact', 'pilotAdoption.readDetails', 'PilotAnalyticsProjection', controller.providerImpact);
protect('get', '/adoption/recommendations', 'pilotAdoption.read', 'PilotAnalyticsProjection', controller.recommendations);
protect('get', '/expansion-readiness', 'pilotExpansionReadiness.read', 'PilotAnalyticsProjection', controller.expansion);

protect('get', '/feedback/themes', 'pilotFeedbackAnalytics.read', 'PilotFeedbackTheme', controller.listFeedbackThemes);
protect('post', '/feedback/themes', 'pilotFeedbackTheme.create', 'PilotFeedbackTheme', controller.createFeedbackTheme);
protect('get', '/feedback/trends', 'pilotFeedbackAnalytics.read', 'PilotFeedbackTheme', controller.feedbackTrends);
protect('get', '/support/trends', 'pilotFeedbackAnalytics.read', 'PilotSupportCase', controller.supportTrends);

protect('post', '/opportunities', 'pilotProductOpportunity.create', 'PilotProductOpportunity', controller.createOpportunity);
protect('get', '/opportunities', 'pilotProductOpportunity.read', 'PilotProductOpportunity', controller.listOpportunities);
protect('get', '/opportunities/:opportunityId', 'pilotProductOpportunity.read', 'PilotProductOpportunity', controller.getOpportunity);
protect('patch', '/opportunities/:opportunityId', 'pilotProductOpportunity.update', 'PilotProductOpportunity', controller.opportunityUpdate);
protect('post', '/opportunities/:opportunityId/approve', 'pilotProductOpportunity.approve', 'PilotProductOpportunity', controller.opportunityApprove);
protect('post', '/opportunities/:opportunityId/archive', 'pilotProductOpportunity.archive', 'PilotProductOpportunity', controller.opportunityArchive);

protect('post', '/hypotheses', 'pilotHypothesis.create', 'PilotProductHypothesis', controller.createHypothesis);
protect('get', '/hypotheses', 'pilotHypothesis.read', 'PilotProductHypothesis', controller.listHypotheses);
protect('get', '/hypotheses/:hypothesisId', 'pilotHypothesis.read', 'PilotProductHypothesis', controller.getHypothesis);
protect('post', '/hypotheses/:hypothesisId/validate', 'pilotHypothesis.validate', 'PilotProductHypothesis', controller.hypothesisValidate);
protect('post', '/hypotheses/:hypothesisId/approve', 'pilotHypothesis.approve', 'PilotProductHypothesis', controller.hypothesisApprove);

protect('post', '/experiments', 'pilotExperiment.create', 'PilotExperiment', controller.createExperiment);
protect('get', '/experiments', 'pilotExperiment.read', 'PilotExperiment', controller.listExperiments);
protect('get', '/experiments/:experimentId', 'pilotExperiment.read', 'PilotExperiment', controller.getExperiment);
for (const [action, permission, handler] of [
  ['validate', 'pilotExperiment.validate', controller.experimentValidate],
  ['approve', 'pilotExperiment.approve', controller.experimentApprove],
  ['start', 'pilotExperiment.start', controller.experimentStart],
  ['pause', 'pilotExperiment.pause', controller.experimentPause],
  ['resume', 'pilotExperiment.resume', controller.experimentResume],
  ['stop', 'pilotExperiment.stop', controller.experimentStop],
  ['evaluate', 'pilotExperiment.evaluate', controller.experimentEvaluate],
]) protect('post', `/experiments/:experimentId/${action}`, permission, 'PilotExperiment', handler);

protect('post', '/snapshots', 'pilotAnalyticsSnapshot.create', 'PilotAnalyticsSnapshot', controller.createSnapshot);
protect('get', '/snapshots', 'pilotAnalyticsSnapshot.read', 'PilotAnalyticsSnapshot', controller.listSnapshots);
protect('get', '/snapshots/:snapshotId', 'pilotAnalyticsSnapshot.read', 'PilotAnalyticsSnapshot', controller.getSnapshot);
protect('post', '/evidence', 'pilotProductEvidence.create', 'PilotProductLearningEvidence', controller.createEvidence);
protect('get', '/evidence/:evidenceId', 'pilotProductEvidence.read', 'PilotProductLearningEvidence', controller.getEvidence);
protect('get', '/export', 'pilotAnalytics.export', 'PilotAnalyticsExport', controller.exportAnalytics);

protect('post', '/backfills', 'pilotAnalyticsBackfill.create', 'PilotAnalyticsBackfill', controller.createBackfill);
protect('get', '/backfills', 'pilotAnalyticsBackfill.read', 'PilotAnalyticsBackfill', controller.listBackfills);
protect('get', '/backfills/:backfillId', 'pilotAnalyticsBackfill.read', 'PilotAnalyticsBackfill', controller.getBackfill);
protect('post', '/backfills/:backfillId/pause', 'pilotAnalyticsBackfill.pause', 'PilotAnalyticsBackfill', controller.backfillPause);
protect('post', '/backfills/:backfillId/resume', 'pilotAnalyticsBackfill.resume', 'PilotAnalyticsBackfill', controller.backfillResume);
protect('post', '/backfills/:backfillId/cancel', 'pilotAnalyticsBackfill.cancel', 'PilotAnalyticsBackfill', controller.backfillCancel);

module.exports = { pilotAnalyticsRouter };
