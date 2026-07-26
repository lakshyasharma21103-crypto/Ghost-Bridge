const express = require('express');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');
const controller = require('../controllers/agentSelectionController');

const agentDiscoveryRouter = express.Router();
agentDiscoveryRouter.use(authenticatePartner);
agentDiscoveryRouter.get('/capabilities', requiresPermission('agentDiscovery.read', { resourceType: 'CapabilityCatalogEntry' }), controller.listCapabilities);
agentDiscoveryRouter.get('/agents', requiresPermission('agentDiscovery.read', { resourceType: 'CapabilityCatalogEntry' }), controller.listAgents);
agentDiscoveryRouter.get('/agents/:connectionId', requiresPermission('agentDiscovery.read', { resourceType: 'CapabilityCatalogEntry' }), controller.getAgent);
agentDiscoveryRouter.post('/compatibility/check', requiresPermission('agentDiscovery.read', { resourceType: 'CapabilityCatalogEntry' }), controller.compatibilityCheck);

module.exports = { agentDiscoveryRouter };
