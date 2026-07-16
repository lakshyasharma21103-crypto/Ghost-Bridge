const express = require('express');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');
const controller = require('../controllers/evidenceController');

const evidenceRouter = express.Router();
evidenceRouter.use(authenticatePartner);

evidenceRouter.get(
  '/events',
  requiresPermission('evidence.read', { resourceType: 'EvidenceEvent' }),
  controller.queryEvidence,
);
evidenceRouter.get(
  '/integrity/checkpoints',
  requiresPermission('audit.integrity.read', { resourceType: 'AuditCheckpoint' }),
  controller.listCheckpoints,
);
evidenceRouter.post(
  '/integrity/checkpoints',
  requiresPermission('audit.integrity.verify', { resourceType: 'AuditCheckpoint' }),
  controller.generateCheckpoint,
);
evidenceRouter.post(
  '/integrity/verify',
  requiresPermission('audit.integrity.verify', { resourceType: 'AuditPartition' }),
  controller.verifyPartition,
);
evidenceRouter.get(
  '/exports',
  requiresPermission('evidence.read', { resourceType: 'EvidenceExport' }),
  controller.listExports,
);
evidenceRouter.post(
  '/exports',
  requiresPermission('evidence.export', { resourceType: 'EvidenceExport' }),
  controller.createExport,
);
evidenceRouter.get(
  '/exports/:evidenceExportId',
  requiresPermission('evidence.read', { resourceType: 'EvidenceExport' }),
  controller.getExport,
);
evidenceRouter.post(
  '/exports/:evidenceExportId/cancel',
  requiresPermission('evidence.export', { resourceType: 'EvidenceExport' }),
  controller.cancelExport,
);
evidenceRouter.post(
  '/exports/:evidenceExportId/verify',
  requiresPermission('evidence.verify', { resourceType: 'EvidenceExport' }),
  controller.verifyExport,
);
evidenceRouter.get(
  '/exports/:evidenceExportId/download',
  requiresPermission('evidence.download', { resourceType: 'EvidenceExport' }),
  controller.download,
);
evidenceRouter.get(
  '/retention',
  requiresPermission('audit.retention.read', { resourceType: 'RetentionPolicy' }),
  controller.listRetention,
);
evidenceRouter.post(
  '/retention',
  requiresPermission('audit.retention.manage', { resourceType: 'RetentionPolicy' }),
  controller.createRetention,
);
evidenceRouter.post(
  '/retention/preview',
  requiresPermission('audit.retention.read', { resourceType: 'RetentionPolicy' }),
  controller.retentionPreview,
);
evidenceRouter.post(
  '/retention/delete',
  requiresPermission('audit.retention.manage', { resourceType: 'RetentionPolicy' }),
  controller.retentionDelete,
);
evidenceRouter.get(
  '/legal-holds',
  requiresPermission('legal-hold.read', { resourceType: 'LegalHold' }),
  controller.listHolds,
);
evidenceRouter.post(
  '/legal-holds',
  requiresPermission('legal-hold.create', { resourceType: 'LegalHold' }),
  controller.createHold,
);
evidenceRouter.post(
  '/legal-holds/:legalHoldId/release',
  requiresPermission('legal-hold.release', { resourceType: 'LegalHold' }),
  controller.releaseHold,
);
evidenceRouter.get(
  '/controls',
  requiresPermission('control.read', { resourceType: 'ControlCatalog' }),
  controller.controlCatalog,
);
evidenceRouter.get(
  '/reports',
  requiresPermission('compliance.report.read', { resourceType: 'ComplianceReport' }),
  controller.complianceReport,
);

module.exports = { evidenceRouter };
