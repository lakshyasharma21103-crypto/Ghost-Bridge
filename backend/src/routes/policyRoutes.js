const express = require('express');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');
const controller = require('../controllers/policyController');

const policyRouter = express.Router();
policyRouter.use(authenticatePartner);

policyRouter.get(
  '/',
  requiresPermission('policy.read', { resourceType: 'Policy' }),
  controller.list,
);
policyRouter.get(
  '/attributes',
  requiresPermission('policy.read', { resourceType: 'PolicyAttributeRegistry' }),
  controller.attributes,
);
policyRouter.get(
  '/audit',
  requiresPermission('policy.audit.read', { resourceType: 'PolicyAudit' }),
  controller.audit,
);
policyRouter.get(
  '/capabilities/:passportId/governance',
  requiresPermission('policy.read', { resourceType: 'CapabilityGovernance' }),
  controller.capabilityGovernance,
);
policyRouter.post(
  '/',
  requiresPermission('policy.create', { resourceType: 'Policy' }),
  controller.create,
);
policyRouter.get(
  '/:stablePolicyId/history',
  requiresPermission('policy.read', { resourceType: 'Policy' }),
  controller.history,
);
policyRouter.post(
  '/:stablePolicyId/versions',
  requiresPermission('policy.update', { resourceType: 'Policy' }),
  controller.createVersion,
);
policyRouter.patch(
  '/:stablePolicyId/versions/:version',
  requiresPermission('policy.update', { resourceType: 'Policy' }),
  controller.update,
);
policyRouter.post(
  '/:stablePolicyId/versions/:version/validate',
  requiresPermission('policy.validate', { resourceType: 'Policy' }),
  controller.validate,
);
policyRouter.post(
  '/:stablePolicyId/versions/:version/simulate',
  requiresPermission('policy.simulate', { resourceType: 'Policy' }),
  controller.simulate,
);
policyRouter.post(
  '/:stablePolicyId/versions/:version/activate',
  requiresPermission('policy.activate', { resourceType: 'Policy' }),
  controller.activate,
);
policyRouter.post(
  '/:stablePolicyId/versions/:version/retire',
  requiresPermission('policy.retire', { resourceType: 'Policy' }),
  controller.retire,
);
policyRouter.get(
  '/:stablePolicyId',
  requiresPermission('policy.read', { resourceType: 'Policy' }),
  controller.get,
);

module.exports = { policyRouter };
