const express = require('express');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');
const controller = require('../controllers/orchestrationController');
const observability = require('../controllers/orchestrationObservabilityController');

const orchestrationRouter = express.Router();
orchestrationRouter.use(authenticatePartner);

orchestrationRouter.post(
  '/definitions',
  requiresPermission('orchestration.definition.create', { resourceType: 'OrchestrationDefinition' }),
  controller.createDefinition,
);
orchestrationRouter.get(
  '/definitions',
  requiresPermission('orchestration.definition.read', { resourceType: 'OrchestrationDefinition' }),
  controller.listDefinitions,
);
orchestrationRouter.get(
  '/definitions/:definitionId',
  requiresPermission('orchestration.definition.read', { resourceType: 'OrchestrationDefinition' }),
  controller.getDefinition,
);
orchestrationRouter.patch(
  '/definitions/:definitionId',
  requiresPermission('orchestration.definition.update', { resourceType: 'OrchestrationDefinition' }),
  controller.updateDefinition,
);
orchestrationRouter.post(
  '/definitions/:definitionId/validate',
  requiresPermission('orchestration.definition.validate', { resourceType: 'OrchestrationDefinition' }),
  controller.validateDefinition,
);
orchestrationRouter.post(
  '/definitions/:definitionId/activate',
  requiresPermission('orchestration.definition.activate', { resourceType: 'OrchestrationDefinition' }),
  controller.activateDefinition,
);
orchestrationRouter.post(
  '/definitions/:definitionId/archive',
  requiresPermission('orchestration.definition.archive', { resourceType: 'OrchestrationDefinition' }),
  controller.archiveDefinition,
);
orchestrationRouter.post(
  '/definitions/:definitionId/runs',
  requiresPermission('orchestration.run.create', { resourceType: 'OrchestrationRun' }),
  controller.startRun,
);
orchestrationRouter.get(
  '/runs',
  requiresPermission('orchestration.run.read', { resourceType: 'OrchestrationRun' }),
  controller.listRuns,
);
orchestrationRouter.get(
  '/operations/overview',
  requiresPermission('orchestrationObservability.read', { resourceType: 'OrchestrationOperationalSnapshot' }),
  observability.overview,
);
orchestrationRouter.get(
  '/slo-policies',
  requiresPermission('orchestrationSloPolicy.read', { resourceType: 'OrchestrationSloPolicy' }),
  observability.listSloPolicies,
);
orchestrationRouter.post(
  '/slo-policies',
  requiresPermission('orchestrationSloPolicy.create', { resourceType: 'OrchestrationSloPolicy' }),
  observability.createSloPolicy,
);
orchestrationRouter.patch(
  '/slo-policies/:policyId',
  requiresPermission('orchestrationSloPolicy.update', { resourceType: 'OrchestrationSloPolicy' }),
  observability.updateSloPolicy,
);
orchestrationRouter.post(
  '/slo-policies/:policyId/activate',
  requiresPermission('orchestrationSloPolicy.activate', { resourceType: 'OrchestrationSloPolicy' }),
  observability.activateSloPolicy,
);
orchestrationRouter.post(
  '/slo-policies/:policyId/evaluate',
  requiresPermission('orchestrationSloPolicy.evaluate', { resourceType: 'OrchestrationSloPolicy' }),
  observability.evaluateSloPolicy,
);
orchestrationRouter.get(
  '/slo-evaluations',
  requiresPermission('orchestrationSloPolicy.read', { resourceType: 'OrchestrationSloEvaluation' }),
  observability.listAllSloEvaluations,
);
orchestrationRouter.get(
  '/slo-policies/:policyId/evaluations',
  requiresPermission('orchestrationSloPolicy.read', { resourceType: 'OrchestrationSloEvaluation' }),
  observability.listSloEvaluations,
);
orchestrationRouter.get(
  '/alert-rules',
  requiresPermission('orchestrationAlertRule.read', { resourceType: 'OrchestrationAlertRule' }),
  observability.listAlertRules,
);
orchestrationRouter.post(
  '/alert-rules',
  requiresPermission('orchestrationAlertRule.create', { resourceType: 'OrchestrationAlertRule' }),
  observability.createAlertRule,
);
orchestrationRouter.post(
  '/alert-rules/:ruleId/activate',
  requiresPermission('orchestrationAlertRule.activate', { resourceType: 'OrchestrationAlertRule' }),
  observability.activateAlertRule,
);
orchestrationRouter.get(
  '/alerts',
  requiresPermission('orchestrationAlert.read', { resourceType: 'OrchestrationAlert' }),
  observability.listAlerts,
);
orchestrationRouter.post(
  '/alerts/:alertId/acknowledge',
  requiresPermission('orchestrationAlert.manage', { resourceType: 'OrchestrationAlert' }),
  observability.acknowledgeAlert,
);
orchestrationRouter.post(
  '/alerts/:alertId/suppress',
  requiresPermission('orchestrationAlert.suppress', { resourceType: 'OrchestrationAlert' }),
  observability.suppressAlert,
);
orchestrationRouter.post(
  '/alerts/:alertId/resolve',
  requiresPermission('orchestrationAlert.manage', { resourceType: 'OrchestrationAlert' }),
  observability.resolveAlert,
);
orchestrationRouter.post(
  '/controls/workspace/pause',
  requiresPermission('orchestrationOperations.control', { resourceType: 'OrchestrationFleetControl' }),
  observability.fleetControl('pause_workspace'),
);
orchestrationRouter.post(
  '/controls/workspace/resume',
  requiresPermission('orchestrationOperations.control', { resourceType: 'OrchestrationFleetControl' }),
  observability.fleetControl('resume_workspace'),
);
orchestrationRouter.post(
  '/controls/workers/drain',
  requiresPermission('orchestrationOperations.control', { resourceType: 'OrchestrationFleetControl' }),
  observability.fleetControl('drain_workers'),
);
orchestrationRouter.post(
  '/controls/workers/resume',
  requiresPermission('orchestrationOperations.control', { resourceType: 'OrchestrationFleetControl' }),
  observability.fleetControl('resume_workers'),
);
orchestrationRouter.post(
  '/controls/definitions/:definitionId/pause',
  requiresPermission('orchestrationOperations.control', { resourceType: 'OrchestrationFleetControl' }),
  (request, response, next) => {
    request.body = { ...request.body, definitionId: request.params.definitionId };
    observability.fleetControl('pause_definition')(request, response, next);
  },
);
orchestrationRouter.post(
  '/controls/definitions/:definitionId/resume',
  requiresPermission('orchestrationOperations.control', { resourceType: 'OrchestrationFleetControl' }),
  (request, response, next) => {
    request.body = { ...request.body, definitionId: request.params.definitionId };
    observability.fleetControl('resume_definition')(request, response, next);
  },
);
orchestrationRouter.post(
  '/controls/connections/:connectionId/quarantine',
  requiresPermission('orchestrationOperations.control', { resourceType: 'OrchestrationFleetControl' }),
  (request, response, next) => {
    request.body = { ...request.body, connectionId: request.params.connectionId };
    observability.fleetControl('quarantine_connection')(request, response, next);
  },
);
orchestrationRouter.post(
  '/controls/connections/:connectionId/unquarantine',
  requiresPermission('orchestrationOperations.control', { resourceType: 'OrchestrationFleetControl' }),
  (request, response, next) => {
    request.body = { ...request.body, connectionId: request.params.connectionId };
    observability.fleetControl('unquarantine_connection')(request, response, next);
  },
);
orchestrationRouter.post(
  '/retention/cleanup',
  requiresPermission('orchestrationRetention.manage', { resourceType: 'OrchestrationTimelineEvent' }),
  observability.cleanupRetention,
);
orchestrationRouter.get(
  '/runs/:runId',
  requiresPermission('orchestration.run.read', { resourceType: 'OrchestrationRun' }),
  controller.getRun,
);
orchestrationRouter.get(
  '/runs/:runId/observability',
  requiresPermission('orchestrationObservability.read', { resourceType: 'OrchestrationRun' }),
  observability.runObservability,
);
orchestrationRouter.get(
  '/runs/:runId/timeline',
  requiresPermission('orchestrationObservability.read', { resourceType: 'OrchestrationTimelineEvent' }),
  observability.runTimeline,
);
orchestrationRouter.post(
  '/runs/:runId/timeline/rebuild',
  requiresPermission('orchestrationObservability.read', { resourceType: 'OrchestrationTimelineEvent' }),
  observability.rebuildTimeline,
);
orchestrationRouter.get(
  '/runs/:runId/trace',
  requiresPermission('orchestrationObservability.trace.read', { resourceType: 'OrchestrationTraceSpan' }),
  observability.runTrace,
);
orchestrationRouter.post(
  '/runs/:runId/trace/rebuild',
  requiresPermission('orchestrationObservability.trace.read', { resourceType: 'OrchestrationTraceSpan' }),
  observability.rebuildTrace,
);
orchestrationRouter.get(
  '/runs/:runId/health',
  requiresPermission('orchestrationObservability.read', { resourceType: 'OrchestrationRunHealthSummary' }),
  observability.runHealth,
);
orchestrationRouter.get(
  '/runs/:runId/critical-path',
  requiresPermission('orchestrationObservability.read', { resourceType: 'OrchestrationRun' }),
  observability.runCriticalPath,
);
orchestrationRouter.post(
  '/runs/:runId/diagnostic-export',
  requiresPermission('orchestrationDiagnostic.export', { resourceType: 'OrchestrationDiagnosticExport' }),
  observability.createDiagnosticExport,
);
orchestrationRouter.get(
  '/runs/:runId/nodes',
  requiresPermission('orchestration.run.read', { resourceType: 'OrchestrationNodeRun' }),
  controller.listRunNodes,
);
orchestrationRouter.post(
  '/runs/:runId/cancel',
  requiresPermission('orchestration.run.cancel', { resourceType: 'OrchestrationRun' }),
  controller.cancelRun,
);

module.exports = { orchestrationRouter };
