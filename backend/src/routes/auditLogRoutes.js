const express = require('express');
const { listLogs } = require('../controllers/auditLogController');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');

const auditLogRouter = express.Router();

auditLogRouter.get(
  '/',
  authenticatePartner,
  requiresPermission('audit.read', { resourceType: 'AuditLog' }),
  listLogs,
);

module.exports = {
  auditLogRouter,
};
