const mongoose = require('mongoose');

const operationalAlertSchema = new mongoose.Schema(
  {
    receivingWorkspaceId: { type: String, required: true, trim: true, index: true },
    type: { type: String, required: true, trim: true },
    dedupeKey: { type: String, required: true, unique: true, index: true },
    severity: { type: String, enum: ['critical', 'warning', 'info'], required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved'],
      default: 'active',
      index: true,
    },
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    metricName: { type: String, required: true, trim: true },
    observedValue: { type: mongoose.Schema.Types.Mixed, required: true },
    thresholdValue: { type: mongoose.Schema.Types.Mixed, required: true },
    safeValues: { type: mongoose.Schema.Types.Mixed, default: {} },
    occurrenceCount: { type: Number, default: 1, min: 1 },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    acknowledgedAt: { type: Date },
    acknowledgedByUserId: { type: String, trim: true },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

operationalAlertSchema.index({ receivingWorkspaceId: 1, status: 1, severity: 1, lastSeenAt: -1 });

module.exports =
  mongoose.models.OperationalAlert || mongoose.model('OperationalAlert', operationalAlertSchema);
