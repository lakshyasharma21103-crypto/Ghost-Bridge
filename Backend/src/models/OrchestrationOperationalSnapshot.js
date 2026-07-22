const mongoose = require('mongoose');

const orchestrationOperationalSnapshotSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true, immutable: true },
    workspaceId: { type: String, required: true, trim: true, index: true, immutable: true },
    snapshotAt: { type: Date, required: true, default: Date.now, index: true },
    workerSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    queueSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    runSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    alertSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    sloSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    safeReasonCodes: [{ type: String, trim: true, maxlength: 128 }],
  },
  { timestamps: true, strict: 'throw' },
);

orchestrationOperationalSnapshotSchema.index({ organizationId: 1, workspaceId: 1, snapshotAt: -1 });
orchestrationOperationalSnapshotSchema.index({ organizationId: 1, workspaceId: 1, 'workerSummary.status': 1 });

module.exports =
  mongoose.models.OrchestrationOperationalSnapshot ||
  mongoose.model('OrchestrationOperationalSnapshot', orchestrationOperationalSnapshotSchema);
