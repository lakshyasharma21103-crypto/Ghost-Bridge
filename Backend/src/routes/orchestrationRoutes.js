const express = require('express');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');
const controller = require('../controllers/orchestrationController');

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
  '/runs/:runId',
  requiresPermission('orchestration.run.read', { resourceType: 'OrchestrationRun' }),
  controller.getRun,
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
