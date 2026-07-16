const AuditLog = require('../models/AuditLog');
const PassportConnection = require('../models/PassportConnection');
const { redactSecrets } = require('../utils/redact');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');

function auditLogPayload(
  actorType,
  actorId,
  action,
  entityType,
  entityId,
  metadata = {},
  identifiers,
) {
  const context = typeof identifiers === 'string' ? { requestId: identifiers } : identifiers || {};
  return {
    actorType,
    actorId,
    action,
    entityType,
    entityId,
    organizationId: metadata.organizationId || metadata.tenantOrganizationId,
    workspaceId: metadata.workspaceId || metadata.receivingWorkspaceId,
    metadata: redactSecrets(metadata),
    requestId: context.requestId,
    traceId: context.traceId,
    invocationId: context.invocationId,
  };
}

async function createAuditLog(
  actorType,
  actorId,
  action,
  entityType,
  entityId,
  metadata = {},
  identifiers,
) {
  const payload = auditLogPayload(
    actorType,
    actorId,
    action,
    entityType,
    entityId,
    metadata,
    identifiers,
  );
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
    traceId: log.traceId,
    invocationId: log.invocationId,
    createdAt: log.createdAt,
  };
}

async function listAuditLogs(input, actor = {}) {
  const identity = requireIdentity(input);
  const partnerId = actor?.partner?._id;
  let ownershipFilter = {};
  if (partnerId) {
    const connections = await PassportConnection.find({
      partnerId,
      receivingWorkspaceId: identity.receivingWorkspaceId,
      receivingUserId: identity.receivingUserId,
    })
      .select('_id passportId')
      .lean();
    if (!connections.length) {
      throw new AppError(404, ErrorCodes.CONNECTION_NOT_FOUND, 'Audit scope was not found.');
    }
    const connectionIds = connections.map((item) => String(item._id));
    const passportIds = [...new Set(connections.map((item) => String(item.passportId)))];
    ownershipFilter = {
      $or: [
        { 'metadata.connectionId': { $in: connectionIds } },
        { entityType: 'PassportConnection', entityId: { $in: connectionIds } },
        { 'metadata.passportId': { $in: passportIds } },
      ],
    };
  }
  const logs = await AuditLog.find({
    'metadata.receivingWorkspaceId': identity.receivingWorkspaceId,
    'metadata.receivingUserId': identity.receivingUserId,
    ...ownershipFilter,
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
