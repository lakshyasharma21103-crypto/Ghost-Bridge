const operations = require('../services/performanceCapacityOperations.service');

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
    idempotencyKey:
      request.get('Idempotency-Key') || request.body?.idempotencyKey,
  };
}

function handler(operation, statusCode = 200) {
  return async (request, response, next) => {
    try {
      response
        .status(statusCode)
        .json({ success: true, data: await operation(request) });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  abortRun: handler(
    (request) =>
      operations.abortRun(
        request.params.runId,
        input(request),
        caller(request),
      ),
    202,
  ),
  activateBudget: handler((request) =>
    operations.activateBudget(
      request.params.budgetId,
      input(request),
      caller(request),
    ),
  ),
  activateCapacityPlan: handler((request) =>
    operations.activateCapacityPlan(
      request.params.planId,
      input(request),
      caller(request),
    ),
  ),
  activateScenario: handler((request) =>
    operations.activateScenario(
      request.params.scenarioId,
      input(request),
      caller(request),
    ),
  ),
  archiveBaseline: handler((request) =>
    operations.archiveBaseline(
      request.params.baselineId,
      input(request),
      caller(request),
    ),
  ),
  archiveBudget: handler((request) =>
    operations.archiveBudget(
      request.params.budgetId,
      input(request),
      caller(request),
    ),
  ),
  archiveCapacityPlan: handler((request) =>
    operations.archiveCapacityPlan(
      request.params.planId,
      input(request),
      caller(request),
    ),
  ),
  archiveScenario: handler((request) =>
    operations.archiveScenario(
      request.params.scenarioId,
      input(request),
      caller(request),
    ),
  ),
  cancelRun: handler(
    (request) =>
      operations.cancelRun(
        request.params.runId,
        input(request),
        caller(request),
      ),
    202,
  ),
  cleanupRun: handler(
    (request) =>
      operations.cleanupRun(
        request.params.runId,
        input(request),
        caller(request),
      ),
    202,
  ),
  createBaseline: handler(
    (request) => operations.createBaseline(input(request), caller(request)),
    201,
  ),
  createBudget: handler(
    (request) => operations.createBudget(input(request), caller(request)),
    201,
  ),
  createCapacityModel: handler(
    (request) =>
      operations.createCapacityModel(
        request.params.runId,
        input(request),
        caller(request),
      ),
    201,
  ),
  createCapacityPlan: handler(
    (request) =>
      operations.createCapacityPlan(input(request), caller(request)),
    201,
  ),
  createRun: handler(
    (request) => operations.createRun(input(request), caller(request)),
    201,
  ),
  createScenario: handler(
    (request) => operations.createScenario(input(request), caller(request)),
    201,
  ),
  executeRun: handler(
    (request) =>
      operations.executeRun(
        request.params.runId,
        input(request),
        caller(request),
      ),
    202,
  ),
  exportRun: handler((request) =>
    operations.exportRun(
      request.params.runId,
      input(request),
      caller(request),
    ),
  ),
  getBaseline: handler((request) =>
    operations.getBaseline(
      request.params.baselineId,
      input(request),
      caller(request),
    ),
  ),
  getBudget: handler((request) =>
    operations.getBudget(
      request.params.budgetId,
      input(request),
      caller(request),
    ),
  ),
  getBudgetEvaluation: handler((request) =>
    operations.getBudgetEvaluation(
      request.params.runId,
      input(request),
      caller(request),
    ),
  ),
  getCapacityModel: handler((request) =>
    operations.getCapacityModel(
      request.params.modelId,
      input(request),
      caller(request),
    ),
  ),
  getCapacityOverview: handler((request) =>
    operations.getCapacityOverview(input(request), caller(request)),
  ),
  getCapacityPlan: handler((request) =>
    operations.getCapacityPlan(
      request.params.planId,
      input(request),
      caller(request),
    ),
  ),
  getEnvironment: handler((request) =>
    operations.getEnvironment(input(request), caller(request)),
  ),
  getRecommendations: handler((request) =>
    operations.getRecommendations(input(request), caller(request)),
  ),
  getRegressionEvaluation: handler((request) =>
    operations.getRegressionEvaluation(
      request.params.runId,
      input(request),
      caller(request),
    ),
  ),
  getRun: handler((request) =>
    operations.getRun(
      request.params.runId,
      input(request),
      caller(request),
    ),
  ),
  getScenario: handler((request) =>
    operations.getScenario(
      request.params.scenarioId,
      input(request),
      caller(request),
    ),
  ),
  listBaselines: handler((request) =>
    operations.listBaselines(input(request), caller(request)),
  ),
  listBudgets: handler((request) =>
    operations.listBudgets(input(request), caller(request)),
  ),
  listCapacityModels: handler((request) =>
    operations.listCapacityModels(input(request), caller(request)),
  ),
  listCapacityPlans: handler((request) =>
    operations.listCapacityPlans(input(request), caller(request)),
  ),
  listMeasurementWindows: handler((request) =>
    operations.listMeasurementWindows(
      request.params.runId,
      input(request),
      caller(request),
    ),
  ),
  listRuns: handler((request) =>
    operations.listRuns(input(request), caller(request)),
  ),
  listScenarios: handler((request) =>
    operations.listScenarios(input(request), caller(request)),
  ),
  listTargets: handler((request) =>
    operations.listTargets(input(request), caller(request)),
  ),
  promoteBaseline: handler((request) =>
    operations.promoteBaseline(
      request.params.baselineId,
      input(request),
      caller(request),
    ),
  ),
  updateBudget: handler((request) =>
    operations.updateBudget(
      request.params.budgetId,
      input(request),
      caller(request),
    ),
  ),
  updateCapacityPlan: handler((request) =>
    operations.updateCapacityPlan(
      request.params.planId,
      input(request),
      caller(request),
    ),
  ),
  updateScenario: handler((request) =>
    operations.updateScenario(
      request.params.scenarioId,
      input(request),
      caller(request),
    ),
  ),
  validateBudget: handler((request) =>
    operations.validateBudget(
      request.params.budgetId,
      input(request),
      caller(request),
    ),
  ),
  validateCapacityPlan: handler((request) =>
    operations.validateCapacityPlan(
      request.params.planId,
      input(request),
      caller(request),
    ),
  ),
  validateScenario: handler((request) =>
    operations.validateScenario(
      request.params.scenarioId,
      input(request),
      caller(request),
    ),
  ),
};
