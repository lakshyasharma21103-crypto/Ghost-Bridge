const express = require('express');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');
const controller = require('../controllers/agentSelectionController');

const agentSelectionRouter = express.Router();
agentSelectionRouter.use(authenticatePartner);

agentSelectionRouter.post('/policies', requiresPermission('agentSelectionPolicy.create', { resourceType: 'AgentSelectionPolicy' }), controller.createPolicy);
agentSelectionRouter.get('/policies', requiresPermission('agentSelectionPolicy.read', { resourceType: 'AgentSelectionPolicy' }), controller.listPolicies);
agentSelectionRouter.get('/policies/:policyId', requiresPermission('agentSelectionPolicy.read', { resourceType: 'AgentSelectionPolicy' }), controller.getPolicy);
agentSelectionRouter.patch('/policies/:policyId', requiresPermission('agentSelectionPolicy.update', { resourceType: 'AgentSelectionPolicy' }), controller.updatePolicy);
agentSelectionRouter.post('/policies/:policyId/validate', requiresPermission('agentSelectionPolicy.update', { resourceType: 'AgentSelectionPolicy' }), controller.validatePolicy);
agentSelectionRouter.post('/policies/:policyId/activate', requiresPermission('agentSelectionPolicy.activate', { resourceType: 'AgentSelectionPolicy' }), controller.activatePolicy);
agentSelectionRouter.post('/policies/:policyId/archive', requiresPermission('agentSelectionPolicy.update', { resourceType: 'AgentSelectionPolicy' }), controller.archivePolicy);
agentSelectionRouter.post('/evaluate', requiresPermission('agentSelection.evaluate', { resourceType: 'AgentSelectionDecision' }), controller.evaluate);
agentSelectionRouter.get('/decisions', requiresPermission('agentSelectionDecision.read', { resourceType: 'AgentSelectionDecision' }), controller.listDecisions);
agentSelectionRouter.get('/decisions/:decisionId', requiresPermission('agentSelectionDecision.read', { resourceType: 'AgentSelectionDecision' }), controller.getDecision);
agentSelectionRouter.post('/agents/:connectionId/verify', requiresPermission('agentTrust.manage', { resourceType: 'CapabilityCatalogEntry' }), controller.verifyAgent);
agentSelectionRouter.post('/agents/:connectionId/trust-tier', requiresPermission('agentTrust.manage', { resourceType: 'CapabilityCatalogEntry' }), controller.updateTrustTier);

module.exports = { agentSelectionRouter };
