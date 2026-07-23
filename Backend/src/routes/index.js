const express = require('express');
const { env } = require('../config/env');
const { healthRouter, readinessRouter } = require('./healthRoutes');
const { passportRouter } = require('./passportRoutes');
const { partnerRouter } = require('./partnerRoutes');
const { connectionRouter } = require('./connectionRoutes');
const { invocationRouter } = require('./invocationRoutes');
const { demoRouter } = require('./demoRoutes');
const { auditLogRouter } = require('./auditLogRoutes');
const { developerSandboxRouter } = require('./developerSandboxRoutes');
const { operationsRouter } = require('./operationsRoutes');
const { enterpriseIdentityRouter } = require('./enterpriseIdentityRoutes');
const { policyRouter } = require('./policyRoutes');
const { secretRouter } = require('./secretRoutes');
const { approvalRouter } = require('./approvalRoutes');
const { evidenceRouter } = require('./evidenceRoutes');
const { enterpriseOperationsRouter } = require('./enterpriseOperationsRoutes');
const { orchestrationRouter } = require('./orchestrationRoutes');
const { agentDiscoveryRouter } = require('./agentDiscoveryRoutes');
const { agentSelectionRouter } = require('./agentSelectionRoutes');
const {
  interAgentContractRouter,
  interAgentDelegationRouter,
} = require('./interAgentDelegationRoutes');
const { productionScaleRouter } = require('./productionScaleRoutes');
const { dataAccessPerformanceRouter } = require('./dataAccessPerformanceRoutes');
const { regionalResilienceRouter } = require('./regionalResilienceRoutes');
const { performanceCapacityRouter } = require('./performanceCapacityRoutes');
const { releaseReadinessRouter } = require('./releaseReadinessRoutes');
const { stagingPilotRouter } = require('./stagingPilotRoutes');

const API_PREFIX = '/api/v1';
const router = express.Router();

router.get('/', (_request, response) => {
  response.json({
    success: true,
    data: {
      product: 'Agent Passport Runtime Gateway',
      line: 'One key to discover, connect, and invoke any compatible AI agent.',
      apiVersion: 'v1',
    },
  });
});

router.use('/health', healthRouter);
router.use('/ready', readinessRouter);
router.use(`${API_PREFIX}/health`, healthRouter);
router.use(`${API_PREFIX}/ready`, readinessRouter);
router.use(`${API_PREFIX}/passports`, passportRouter);
router.use(`${API_PREFIX}/partner`, partnerRouter);
router.use(`${API_PREFIX}/connections`, connectionRouter);
router.use(`${API_PREFIX}/invocations`, invocationRouter);
router.use(`${API_PREFIX}/audit-logs`, auditLogRouter);
router.use(`${API_PREFIX}/operations`, operationsRouter);
router.use(`${API_PREFIX}/enterprise`, enterpriseIdentityRouter);
router.use(`${API_PREFIX}/policies`, policyRouter);
router.use(`${API_PREFIX}/secrets`, secretRouter);
router.use(`${API_PREFIX}/approvals`, approvalRouter);
router.use(`${API_PREFIX}/evidence`, evidenceRouter);
router.use(`${API_PREFIX}/admin/operations`, enterpriseOperationsRouter);
router.use(`${API_PREFIX}/orchestrations`, orchestrationRouter);
router.use(`${API_PREFIX}/agent-discovery`, agentDiscoveryRouter);
router.use(`${API_PREFIX}/agent-selection`, agentSelectionRouter);
router.use(`${API_PREFIX}/inter-agent-contracts`, interAgentContractRouter);
router.use(`${API_PREFIX}/inter-agent-delegations`, interAgentDelegationRouter);
router.use(`${API_PREFIX}/production-scale`, productionScaleRouter);
router.use(`${API_PREFIX}/data-performance`, dataAccessPerformanceRouter);
router.use(`${API_PREFIX}/regional-resilience`, regionalResilienceRouter);
router.use(`${API_PREFIX}/performance`, performanceCapacityRouter);
router.use(`${API_PREFIX}/releases`, releaseReadinessRouter);
router.use('/api/releases', releaseReadinessRouter);
router.use(`${API_PREFIX}/launch`, stagingPilotRouter);
router.use('/api/launch', stagingPilotRouter);
if (env.NODE_ENV === 'development') {
  router.use(`${API_PREFIX}/demo`, demoRouter);
  router.use(`${API_PREFIX}/developer-sandbox`, developerSandboxRouter);
}

module.exports = {
  API_PREFIX,
  router,
};
