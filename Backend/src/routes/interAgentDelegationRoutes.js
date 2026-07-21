const express = require('express');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');
const controller = require('../controllers/interAgentDelegationController');

const interAgentContractRouter = express.Router();
interAgentContractRouter.use(authenticatePartner);
interAgentContractRouter.post('/', requiresPermission('interAgentContract.create', { resourceType: 'InterAgentDataContract' }), controller.createContract);
interAgentContractRouter.get('/', requiresPermission('interAgentContract.read', { resourceType: 'InterAgentDataContract' }), controller.listContracts);
interAgentContractRouter.get('/:contractId', requiresPermission('interAgentContract.read', { resourceType: 'InterAgentDataContract' }), controller.getContract);
interAgentContractRouter.patch('/:contractId', requiresPermission('interAgentContract.update', { resourceType: 'InterAgentDataContract' }), controller.updateContract);
interAgentContractRouter.post('/:contractId/validate', requiresPermission('interAgentContract.validate', { resourceType: 'InterAgentDataContract' }), controller.validateContract);
interAgentContractRouter.post('/:contractId/activate', requiresPermission('interAgentContract.activate', { resourceType: 'InterAgentDataContract' }), controller.activateContract);
interAgentContractRouter.post('/:contractId/archive', requiresPermission('interAgentContract.archive', { resourceType: 'InterAgentDataContract' }), controller.archiveContract);

const interAgentDelegationRouter = express.Router();
interAgentDelegationRouter.use(authenticatePartner);
interAgentDelegationRouter.post('/grants', requiresPermission('interAgentDelegation.create', { resourceType: 'InterAgentDelegationGrant' }), controller.createGrant);
interAgentDelegationRouter.get('/grants', requiresPermission('interAgentDelegation.read', { resourceType: 'InterAgentDelegationGrant' }), controller.listGrants);
interAgentDelegationRouter.get('/grants/:grantId', requiresPermission('interAgentDelegation.read', { resourceType: 'InterAgentDelegationGrant' }), controller.getGrant);
interAgentDelegationRouter.post('/grants/:grantId/revoke', requiresPermission('interAgentDelegation.revoke', { resourceType: 'InterAgentDelegationGrant' }), controller.revokeGrant);
interAgentDelegationRouter.post('/evaluate', requiresPermission('interAgentDelegation.evaluate', { resourceType: 'InterAgentDataContract' }), controller.evaluate);
interAgentDelegationRouter.post('/preview', requiresPermission('interAgentDelegation.preview', { resourceType: 'InterAgentDataContract' }), controller.preview);
interAgentDelegationRouter.get('/invocations', requiresPermission('interAgentDelegationInvocation.read', { resourceType: 'InterAgentDelegationInvocation' }), controller.listInvocations);
interAgentDelegationRouter.get('/invocations/:invocationId', requiresPermission('interAgentDelegationInvocation.readDetails', { resourceType: 'InterAgentDelegationInvocation' }), controller.getInvocation);

module.exports = { interAgentContractRouter, interAgentDelegationRouter };
