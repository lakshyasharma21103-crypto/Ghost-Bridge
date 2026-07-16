const mongoose = require('mongoose');
const { INCIDENT_SEVERITIES, INCIDENT_STATUSES } = require('../constants/enterpriseOperations');

const timelineSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true },
    actorId: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    safeNote: { type: String, trim: true, maxlength: 1_000 },
    reasonCode: { type: String, trim: true },
  },
  { _id: false, strict: 'throw' },
);

const operationalIncidentSchema = new mongoose.Schema(
  {
    incidentId: { type: String, required: true, unique: true, trim: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    severity: { type: String, enum: INCIDENT_SEVERITIES, required: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    safeDescription: { type: String, required: true, trim: true, maxlength: 2_000 },
    status: { type: String, enum: INCIDENT_STATUSES, default: 'OPEN', index: true },
    detectedAt: { type: Date, required: true, default: Date.now },
    acknowledgedAt: { type: Date },
    mitigatedAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    ownerActorId: { type: String, trim: true },
    affectedScopes: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    relatedAlertIds: { type: [String], default: undefined },
    traceReferences: { type: [String], default: undefined },
    invocationReferences: { type: [String], default: undefined },
    connectionReferences: { type: [String], default: undefined },
    secretReferences: { type: [String], select: false, default: undefined },
    timeline: { type: [timelineSchema], default: [] },
    evidenceReferences: { type: [String], default: undefined },
    revision: { type: Number, default: 0, min: 0 },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

operationalIncidentSchema.index({
  organizationId: 1,
  workspaceId: 1,
  status: 1,
  severity: 1,
  detectedAt: -1,
});

module.exports =
  mongoose.models.OperationalIncident ||
  mongoose.model('OperationalIncident', operationalIncidentSchema);
