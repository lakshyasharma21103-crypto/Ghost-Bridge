const core = require('../services/productionScale.service');
const operations = require('../services/productionScaleOperations.service');

function caller(request) {
  return {
    partner: request.partner,
    requestId: request.requestId,
    traceId: request.traceId,
    observer: request.observer,
    platformAuthorized: request.platformAuthorized === true,
  };
}

function input(request, extra = {}) {
  return {
    ...request.query,
    ...request.body,
    ...extra,
    idempotencyKey: request.get('Idempotency-Key') || request.body?.idempotencyKey,
  };
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

async function evaluateAdmission(request, response, next) {
  try {
    const data = await core.evaluateAdmission(input(request), caller(request));
    response.status(data.httpStatus || 200).json({ success: ['accepted', 'accepted_deferred'].includes(data.decision), data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  activateConfiguration: handler((request) => operations.activateScaleConfiguration(request.params.configurationId, input(request), caller(request))),
  activateQuotaPolicy: handler((request) => operations.activateQuotaPolicy(request.params.policyId, input(request), caller(request))),
  archiveConfiguration: handler((request) => operations.archiveScaleConfiguration(request.params.configurationId, input(request), caller(request))),
  archiveDeadLetter: handler((request) => operations.archiveDeadLetter(request.params.jobId, input(request), caller(request))),
  archiveQuotaPolicy: handler((request) => operations.archiveQuotaPolicy(request.params.policyId, input(request), caller(request))),
  capacity: handler((request) => operations.getCapacity(input(request), caller(request))),
  createConfiguration: handler((request) => operations.createScaleConfiguration(input(request), caller(request)), 201),
  createDeadLetterIntervention: handler((request) => operations.createDeadLetterIntervention(request.params.jobId, input(request), caller(request)), 201),
  createQuotaPolicy: handler((request) => operations.createQuotaPolicy(input(request), caller(request)), 201),
  drainPartition: handler((request) => operations.controlPartition(request.params.partitionKey, 'drain', input(request), caller(request))),
  drainWorker: handler((request) => operations.drainWorker(request.params.workerId, input(request), caller(request))),
  evaluateAdmission,
  getAdmissionDecision: handler((request) => operations.getAdmissionDecision(request.params.decisionId, input(request), caller(request))),
  getBackpressure: handler((request) => operations.getBackpressure(input(request), caller(request))),
  getConfiguration: handler((request) => operations.getScaleConfiguration(request.params.configurationId, input(request), caller(request))),
  getPartition: handler((request) => operations.getPartition(request.params.partitionKey, input(request), caller(request))),
  getQuotaPolicy: handler((request) => operations.getQuotaPolicy(request.params.policyId, input(request), caller(request))),
  getWorker: handler((request) => operations.getWorker(request.params.workerId, input(request), caller(request))),
  listAdmissionDecisions: handler((request) => operations.listAdmissionDecisions(input(request), caller(request))),
  listConfigurations: handler((request) => operations.listScaleConfigurations(input(request), caller(request))),
  listDeadLetters: handler((request) => operations.listDeadLetters(input(request), caller(request))),
  listPartitions: handler((request) => operations.listPartitions(input(request), caller(request))),
  listQuotaPolicies: handler((request) => operations.listQuotaPolicies(input(request), caller(request))),
  listWorkers: handler((request) => operations.listWorkers(input(request), caller(request))),
  pausePartition: handler((request) => operations.controlPartition(request.params.partitionKey, 'pause', input(request), caller(request))),
  queues: handler((request) => operations.getQueueSummary(input(request), caller(request))),
  rebalancePartitions: handler((request) => core.rebalancePartitions(input(request), caller(request))),
  resumePartition: handler((request) => operations.controlPartition(request.params.partitionKey, 'resume', input(request), caller(request))),
  retryDeadLetter: handler((request) => operations.retryDeadLetter(request.params.jobId, input(request), caller(request))),
  signals: handler((request) => operations.getAutoscalingSignals(input(request), caller(request))),
  stopWorkerClaims: handler((request) => operations.stopWorkerClaims(request.params.workerId, input(request), caller(request))),
  updateConfiguration: handler((request) => operations.updateScaleConfiguration(request.params.configurationId, input(request), caller(request))),
  updateQuotaPolicy: handler((request) => operations.updateQuotaPolicy(request.params.policyId, input(request), caller(request))),
  validateConfiguration: handler((request) => operations.validateScaleConfigurationRecord(request.params.configurationId, input(request), caller(request))),
  validateQuotaPolicy: handler((request) => operations.validateQuotaPolicyRecord(request.params.policyId, input(request), caller(request))),
};
