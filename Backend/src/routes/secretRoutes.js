const express = require('express');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');
const controller = require('../controllers/secretController');

const secretRouter = express.Router();
secretRouter.use(authenticatePartner);

secretRouter.get(
  '/encryption-keys/usage',
  requiresPermission('encryption-key.metadata.read', { resourceType: 'EncryptionKey' }),
  controller.keyUsage,
);
secretRouter.post(
  '/encryption-keys/rewrap',
  requiresPermission('encryption-key.rotate', { resourceType: 'EncryptionKey' }),
  controller.rewrap,
);
secretRouter.get(
  '/audit',
  requiresPermission('secret.audit.read', { resourceType: 'SecretAudit' }),
  controller.audit,
);
secretRouter.get(
  '/',
  requiresPermission('secret.metadata.read', { resourceType: 'Secret' }),
  controller.list,
);
secretRouter.post(
  '/',
  requiresPermission('secret.create', { resourceType: 'Secret' }),
  controller.create,
);
secretRouter.get(
  '/:secretId',
  requiresPermission('secret.metadata.read', { resourceType: 'Secret' }),
  controller.get,
);
secretRouter.get(
  '/:secretId/versions',
  requiresPermission('secret.metadata.read', { resourceType: 'SecretVersion' }),
  controller.versions,
);
secretRouter.post(
  '/:secretId/versions',
  requiresPermission('secret.update', { resourceType: 'SecretVersion' }),
  controller.addVersion,
);
secretRouter.post(
  '/:secretId/versions/:versionId/validate',
  requiresPermission('secret.rotate', { resourceType: 'SecretVersion' }),
  controller.validateVersion,
);
secretRouter.post(
  '/:secretId/versions/:versionId/activate',
  requiresPermission('secret.rotate', { resourceType: 'SecretVersion' }),
  controller.activateVersion,
);
secretRouter.post(
  '/:secretId/versions/:versionId/retire',
  requiresPermission('secret.rotate', { resourceType: 'SecretVersion' }),
  controller.retireVersion,
);
secretRouter.post(
  '/:secretId/versions/:versionId/revoke',
  requiresPermission('secret.revoke', { resourceType: 'SecretVersion' }),
  controller.revokeVersion,
);
secretRouter.post(
  '/:secretId/versions/:versionId/destroy',
  requiresPermission('secret.destroy', { resourceType: 'SecretVersion' }),
  controller.destroyVersion,
);
secretRouter.post(
  '/:secretId/rotate',
  requiresPermission('secret.rotate', { resourceType: 'Secret' }),
  controller.rotate,
);
secretRouter.get(
  '/:secretId/rotations',
  requiresPermission('secret.metadata.read', { resourceType: 'SecretRotation' }),
  controller.rotations,
);
secretRouter.post(
  '/:secretId/revoke',
  requiresPermission('secret.revoke', { resourceType: 'Secret' }),
  controller.revoke,
);
secretRouter.post(
  '/:secretId/disable',
  requiresPermission('secret.revoke', { resourceType: 'Secret' }),
  controller.disable,
);
secretRouter.post(
  '/:secretId/enable',
  requiresPermission('secret.update', { resourceType: 'Secret' }),
  controller.enable,
);
secretRouter.get(
  '/:secretId/bindings',
  requiresPermission('secret.binding.read', { resourceType: 'CredentialBinding' }),
  controller.bindings,
);
secretRouter.post(
  '/:secretId/bindings',
  requiresPermission('secret.binding.manage', { resourceType: 'CredentialBinding' }),
  controller.createBinding,
);
secretRouter.post(
  '/:secretId/bindings/:bindingId/revoke',
  requiresPermission('secret.binding.manage', { resourceType: 'CredentialBinding' }),
  controller.revokeBinding,
);
secretRouter.get(
  '/:secretId/health',
  requiresPermission('secret.health.read', { resourceType: 'SecretHealth' }),
  controller.health,
);
secretRouter.post(
  '/:secretId/health/check',
  requiresPermission('secret.health.check', { resourceType: 'SecretHealth' }),
  controller.checkHealth,
);

module.exports = { secretRouter };
