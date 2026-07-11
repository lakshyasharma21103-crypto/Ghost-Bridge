const AuditLog = require('../models/AuditLog');
const { redactSecrets } = require('../utils/redact');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');

function auditLogPayload(actorType, actorId, action, entityType, entityId, metadata = {}, requestId) {
  return {
    actorType,
    actorId,
    action,
    entityType,
    entityId,
    metadata: redactSecrets(metadata),
    requestId,
  };
}

async function createAuditLog(actorType, actorId, action, entityType, entityId, metadata = {}, requestId) {
  const payload = auditLogPayload(actorType, actorId, action, entityType, entityId, metadata, requestId);
  return AuditLog.create(payload);
}

function requireIdentity(input) {
  const receivingWorkspaceId = String(input?.receivingWorkspaceId || '').trim();
  const receivingUserId = String(input?.receivingUserId || '').trim();
  if (!receivingWorkspaceId || !receivingUserId) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path: 'receivingWorkspaceId', message: 'receivingWorkspaceId is required.' },
      { path: 'receivingUserId', message: 'receivingUserId is required.' },
    ]);
  }
  return { receivingWorkspaceId, receivingUserId };
}

function limitFromInput(value) {
  const limit = Number(value || 50);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path: 'limit', message: 'limit must be an integer between 1 and 100.' },
    ]);
  }
  return limit;
}

function serializeAuditLog(log) {
  return {
    id: String(log._id || log.id),
    actorType: log.actorType,
    actorId: log.actorId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    metadata: redactSecrets(log.metadata || {}),
    requestId: log.requestId,
    createdAt: log.createdAt,
  };
}

async function listAuditLogs(input) {
  const identity = requireIdentity(input);
  const logs = await AuditLog.find({
    'metadata.receivingWorkspaceId': identity.receivingWorkspaceId,
    'metadata.receivingUserId': identity.receivingUserId,
  })
    .sort({ createdAt: -1 })
    .limit(limitFromInput(input?.limit))
    .lean();

  return { items: logs.map(serializeAuditLog) };
}

module.exports = {
  createAuditLog,
  auditLogPayload,
  listAuditLogs,
  serializeAuditLog,
};
