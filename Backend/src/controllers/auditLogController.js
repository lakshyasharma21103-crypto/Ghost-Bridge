const { listAuditLogs } = require('../services/auditService');

async function listLogs(request, response, next) {
  try {
    const data = await listAuditLogs(request.query);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listLogs,
};
