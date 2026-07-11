const express = require('express');
const { listLogs } = require('../controllers/auditLogController');

const auditLogRouter = express.Router();

auditLogRouter.get('/', listLogs);

module.exports = {
  auditLogRouter,
};
