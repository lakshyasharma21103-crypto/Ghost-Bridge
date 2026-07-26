const express = require('express');
const controller = require('../controllers/productionScaleController');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');

const productionScaleRouter = express.Router();
productionScaleRouter.use(authenticatePartner);

function protect(method, path, permission, resourceType, handler) {
  productionScaleRouter[method](path, requiresPermission(permission, { resourceType }), handler);
}

protect('post', '/configurations', 'productionScaleConfiguration.create', 'WorkloadScaleConfiguration', controller.createConfiguration);
protect('get', '/configurations', 'productionScaleConfiguration.read', 'WorkloadScaleConfiguration', controller.listConfigurations);
protect('get', '/configurations/:configurationId', 'productionScaleConfiguration.read', 'WorkloadScaleConfiguration', controller.getConfiguration);
protect('patch', '/configurations/:configurationId', 'productionScaleConfiguration.update', 'WorkloadScaleConfiguration', controller.updateConfiguration);
protect('post', '/configurations/:configurationId/validate', 'productionScaleConfiguration.validate', 'WorkloadScaleConfiguration', controller.validateConfiguration);
protect('post', '/configurations/:configurationId/activate', 'productionScaleConfiguration.activate', 'WorkloadScaleConfiguration', controller.activateConfiguration);
protect('post', '/configurations/:configurationId/archive', 'productionScaleConfiguration.archive', 'WorkloadScaleConfiguration', controller.archiveConfiguration);

protect('post', '/quota-policies', 'workloadQuotaPolicy.create', 'WorkloadQuotaPolicy', controller.createQuotaPolicy);
protect('get', '/quota-policies', 'workloadQuotaPolicy.read', 'WorkloadQuotaPolicy', controller.listQuotaPolicies);
protect('get', '/quota-policies/:policyId', 'workloadQuotaPolicy.read', 'WorkloadQuotaPolicy', controller.getQuotaPolicy);
protect('patch', '/quota-policies/:policyId', 'workloadQuotaPolicy.update', 'WorkloadQuotaPolicy', controller.updateQuotaPolicy);
protect('post', '/quota-policies/:policyId/validate', 'workloadQuotaPolicy.validate', 'WorkloadQuotaPolicy', controller.validateQuotaPolicy);
protect('post', '/quota-policies/:policyId/activate', 'workloadQuotaPolicy.activate', 'WorkloadQuotaPolicy', controller.activateQuotaPolicy);
protect('post', '/quota-policies/:policyId/archive', 'workloadQuotaPolicy.archive', 'WorkloadQuotaPolicy', controller.archiveQuotaPolicy);

protect('get', '/partitions', 'queuePartition.read', 'QueuePartition', controller.listPartitions);
protect('post', '/partitions/rebalance', 'queuePartition.rebalance', 'QueuePartition', controller.rebalancePartitions);
protect('get', '/partitions/:partitionKey', 'queuePartition.read', 'QueuePartition', controller.getPartition);
protect('post', '/partitions/:partitionKey/pause', 'queuePartition.pause', 'QueuePartition', controller.pausePartition);
protect('post', '/partitions/:partitionKey/resume', 'queuePartition.resume', 'QueuePartition', controller.resumePartition);
protect('post', '/partitions/:partitionKey/drain', 'queuePartition.drain', 'QueuePartition', controller.drainPartition);

protect('get', '/workers', 'workerFleet.read', 'WorkerRegistration', controller.listWorkers);
protect('get', '/workers/:workerId', 'workerFleet.read', 'WorkerRegistration', controller.getWorker);
protect('post', '/workers/:workerId/drain', 'workerFleet.drain', 'WorkerRegistration', controller.drainWorker);
protect('post', '/workers/:workerId/stop-claims', 'workerFleet.stopClaims', 'WorkerRegistration', controller.stopWorkerClaims);

protect('post', '/admission/evaluate', 'workloadAdmission.evaluate', 'WorkloadAdmissionDecision', controller.evaluateAdmission);
protect('get', '/admission/decisions', 'workloadAdmission.read', 'WorkloadAdmissionDecision', controller.listAdmissionDecisions);
protect('get', '/admission/decisions/:decisionId', 'workloadAdmission.read', 'WorkloadAdmissionDecision', controller.getAdmissionDecision);

protect('get', '/capacity', 'productionScale.read', 'CapacitySummary', controller.capacity);
protect('get', '/autoscaling-signals', 'autoscalingSignal.read', 'AutoscalingSignal', controller.signals);
protect('get', '/backpressure', 'backpressureControl.read', 'WorkloadBackpressureState', controller.getBackpressure);
protect('get', '/queues', 'productionScale.read', 'QueueSummary', controller.queues);
protect('get', '/dead-letter', 'deadLetter.read', 'WorkloadDeadLetter', controller.listDeadLetters);
protect('post', '/dead-letter/:jobId/retry', 'deadLetter.retry', 'WorkloadDeadLetter', controller.retryDeadLetter);
protect('post', '/dead-letter/:jobId/archive', 'deadLetter.archive', 'WorkloadDeadLetter', controller.archiveDeadLetter);
protect('post', '/dead-letter/:jobId/create-intervention', 'deadLetter.createIntervention', 'WorkloadDeadLetter', controller.createDeadLetterIntervention);

module.exports = { productionScaleRouter };
