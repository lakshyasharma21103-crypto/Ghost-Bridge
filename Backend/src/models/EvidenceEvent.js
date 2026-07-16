const mongoose = require('mongoose');
const { EVIDENCE_RETENTION_CLASSES } = require('../constants/compliance');

const integritySchema = new mongoose.Schema(
  {
    chainId: { type: String, required: true, trim: true },
    partitionId: { type: String, required: true, trim: true },
    sequence: { type: Number, required: true, min: 1 },
    previousDigest: { type: String, trim: true },
    eventDigest: { type: String, required: true, trim: true },
    algorithm: { type: String, enum: ['sha256'], default: 'sha256' },
    algorithmVersion: { type: Number, enum: [1], default: 1 },
  },
  { _id: false, strict: 'throw' },
);

const evidenceEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, trim: true },
    sourceAuditLogId: { type: String, trim: true, index: true },
    eventType: { type: String, required: true, trim: true, index: true },
    eventSchemaVersion: { type: Number, enum: [1], default: 1 },
    occurredAt: { type: Date, required: true, index: true },
    recordedAt: { type: Date, required: true, default: Date.now },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    actorId: { type: String, trim: true },
    actorType: { type: String, trim: true },
    action: { type: String, trim: true },
    permission: { type: String, trim: true },
    resourceType: { type: String, trim: true },
    resourceId: { type: String, trim: true },
    decision: { type: String, trim: true },
    reasonCode: { type: String, trim: true },
    traceId: { type: String, trim: true },
    requestId: { type: String, trim: true },
    invocationId: { type: String, trim: true, index: true },
    approvalRequestId: { type: String, trim: true, index: true },
    policyReferences: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    stateTransition: { type: mongoose.Schema.Types.Mixed, default: undefined },
    sourceSubsystem: { type: String, required: true, trim: true },
    safeMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    integrity: { type: integritySchema, required: true },
    retentionClass: {
      type: String,
      enum: EVIDENCE_RETENTION_CLASSES,
      required: true,
      index: true,
    },
    legalHold: { type: Boolean, default: false, index: true },
    ownershipStatus: { type: String, enum: ['VERIFIED', 'AMBIGUOUS'], default: 'VERIFIED' },
  },
  { timestamps: false, strict: 'throw' },
);

evidenceEventSchema.index({ organizationId: 1, occurredAt: -1 });
evidenceEventSchema.index(
  { sourceAuditLogId: 1 },
  {
    unique: true,
    partialFilterExpression: { sourceAuditLogId: { $type: 'string' } },
    name: 'unique_normalized_source_audit_log',
  },
);
evidenceEventSchema.index(
  { organizationId: 1, 'integrity.partitionId': 1, 'integrity.sequence': 1 },
  { unique: true, name: 'unique_tenant_evidence_partition_sequence' },
);
evidenceEventSchema.index({ organizationId: 1, retentionClass: 1, occurredAt: 1 });
evidenceEventSchema.index({ organizationId: 1, resourceType: 1, resourceId: 1, occurredAt: -1 });

module.exports =
  mongoose.models.EvidenceEvent || mongoose.model('EvidenceEvent', evidenceEventSchema);
