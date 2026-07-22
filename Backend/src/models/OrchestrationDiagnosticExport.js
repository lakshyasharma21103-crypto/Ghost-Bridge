const mongoose = require('mongoose');
const {
  DIAGNOSTIC_EXPORT_STATUSES,
  SAFE_CODE_PATTERN,
  SAFE_IDENTIFIER_PATTERN,
} = require('../constants/orchestrationObservability');

const orchestrationDiagnosticExportSchema = new mongoose.Schema(
  {
    exportId: { type: String, required: true, trim: true, maxlength: 128, unique: true, index: true },
    organizationId: { type: String, required: true, trim: true, index: true, immutable: true },
    workspaceId: { type: String, required: true, trim: true, index: true, immutable: true },
    orchestrationRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationRun', index: true },
    status: { type: String, enum: DIAGNOSTIC_EXPORT_STATUSES, required: true, default: 'created', index: true },
    safeManifest: { type: mongoose.Schema.Types.Mixed, required: true },
    contentHash: { type: String, required: true, trim: true, maxlength: 128 },
    recordCounts: { type: mongoose.Schema.Types.Mixed, default: {} },
    safeReasonCode: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    createdBy: { type: String, required: true, trim: true, maxlength: 128 },
    downloadedBy: { type: String, trim: true, maxlength: 128 },
    downloadedAt: { type: Date },
    expiresAt: { type: Date, required: true, index: true },
    traceId: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN, maxlength: 128 },
    requestId: { type: String, trim: true, match: SAFE_IDENTIFIER_PATTERN, maxlength: 128 },
  },
  { timestamps: true, strict: 'throw' },
);

orchestrationDiagnosticExportSchema.index({ organizationId: 1, workspaceId: 1, createdAt: -1 });
orchestrationDiagnosticExportSchema.index({ organizationId: 1, workspaceId: 1, status: 1, expiresAt: 1 });

module.exports =
  mongoose.models.OrchestrationDiagnosticExport ||
  mongoose.model('OrchestrationDiagnosticExport', orchestrationDiagnosticExportSchema);
