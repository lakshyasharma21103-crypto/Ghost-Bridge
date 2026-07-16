const service = require('../services/evidence.service');

function caller(request) {
  return { partner: request.partner, requestId: request.requestId, traceId: request.traceId };
}

function input(request) {
  return { ...request.query, ...request.body };
}

function handler(operation, statusCode = 200) {
  return async (request, response, next) => {
    try {
      const data = await operation(request, input(request), caller(request));
      response.status(statusCode).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

async function download(request, response, next) {
  try {
    const fileName = request.query.file || 'manifest.json';
    const buffer = await service.readEvidencePackageFile(
      request.params.evidenceExportId,
      fileName,
      input(request),
      caller(request),
    );
    response.setHeader(
      'Content-Type',
      fileName.endsWith('.jsonl')
        ? 'application/x-ndjson'
        : fileName.endsWith('.csv')
          ? 'text/csv'
          : 'application/json',
    );
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    response.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  cancelExport: handler((request, value, actor) =>
    service.cancelEvidenceExport(request.params.evidenceExportId, value, actor),
  ),
  complianceReport: handler((_request, value, actor) => service.complianceReport(value, actor)),
  controlCatalog: handler((_request, value, actor) => service.controlCatalog(value, actor)),
  createExport: handler(
    (_request, value, actor) => service.createEvidenceExport(value, actor),
    202,
  ),
  createHold: handler((_request, value, actor) => service.createLegalHold(value, actor), 201),
  createRetention: handler(
    (_request, value, actor) => service.createRetentionPolicy(value, actor),
    201,
  ),
  download,
  generateCheckpoint: handler(
    (_request, value, actor) => service.generateCheckpoint(value, actor),
    201,
  ),
  getExport: handler((request, value, actor) =>
    service.getEvidenceExport(request.params.evidenceExportId, value, actor),
  ),
  listCheckpoints: handler((_request, value, actor) => service.listCheckpoints(value, actor)),
  listExports: handler((_request, value, actor) => service.listEvidenceExports(value, actor)),
  listHolds: handler((_request, value, actor) => service.listLegalHolds(value, actor)),
  listRetention: handler((_request, value, actor) => service.listRetentionPolicies(value, actor)),
  queryEvidence: handler((_request, value, actor) => service.queryEvidence(value, actor)),
  releaseHold: handler((request, value, actor) =>
    service.releaseLegalHold(request.params.legalHoldId, value, actor),
  ),
  retentionDelete: handler((_request, value, actor) =>
    service.executeRetentionDeletion(value, actor),
  ),
  retentionPreview: handler((_request, value, actor) => service.retentionPreview(value, actor)),
  verifyExport: handler((request, value, actor) =>
    service.verifyEvidenceExport(request.params.evidenceExportId, value, actor),
  ),
  verifyPartition: handler((_request, value, actor) => service.verifyPartition(value, actor)),
};
