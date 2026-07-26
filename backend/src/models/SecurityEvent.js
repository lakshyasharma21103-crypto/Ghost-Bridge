const mongoose = require('mongoose');
const {
  INCIDENT_SEVERITIES,
  SECURITY_EVENT_STATUSES,
} = require('../constants/enterpriseOperations');

const securityEventSchema = new mongoose.Schema(
  {
    securityEventId: { type: String, required: true, unique: true, trim: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    type: { type: String, required: true, trim: true, index: true },
    severity: { type: String, enum: INCIDENT_SEVERITIES, required: true, index: true },
    status: { type: String, enum: SECURITY_EVENT_STATUSES, default: 'OPEN', index: true },
    firstObservedAt: { type: Date, required: true },
    lastObservedAt: { type: Date, required: true },
    occurrenceCount: { type: Number, default: 1, min: 1 },
    safeSubjectMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    relatedAuditEventReferences: { type: [String], default: undefined },
    incidentId: { type: String, trim: true, index: true },
    resolutionMetadata: { type: mongoose.Schema.Types.Mixed },
    deduplicationKey: { type: String, required: true, trim: true },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw' },
);

securityEventSchema.index({ organizationId: 1, deduplicationKey: 1 }, { unique: true });
securityEventSchema.index({
  organizationId: 1,
  workspaceId: 1,
  status: 1,
  type: 1,
  lastObservedAt: -1,
});

module.exports =
  mongoose.models.SecurityEvent || mongoose.model('SecurityEvent', securityEventSchema);
