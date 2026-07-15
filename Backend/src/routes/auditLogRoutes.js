const express = require('express');
const { listLogs } = require('../controllers/auditLogController');
const { authenticatePartner } = require('../middleware/authenticatePartner');

const auditLogRouter = express.Router();

auditLogRouter.get('/', authenticatePartner, listLogs);

module.exports = {
  auditLogRouter,
};
