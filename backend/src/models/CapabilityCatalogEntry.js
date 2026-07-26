const mongoose = require('mongoose');
const {
  AGENT_SELECTION_LIMITS,
  CIRCUIT_STATES,
  COST_CLASSES,
  DATA_CLASSIFICATIONS,
  HEALTH_STATUSES,
  LATENCY_CLASSES,
  READINESS_STATUSES,
  TRUST_TIERS,
  VERIFICATION_STATUSES,
} = require('../constants/agentSelection');

const normalizedCapabilitySchema = new mongoose.Schema(
  {
    capabilityKey: { type: String, required: true, trim: true, maxlength: 128 },
    displayName: { type: String, required: true, trim: true, maxlength: 200 },
    description: {
      type: String,
      trim: true,
      maxlength: AGENT_SELECTION_LIMITS.maximumCapabilityDescriptionLength,
      default: '',
    },
    operationKeys: [{ type: String, required: true, trim: true, maxlength: 128 }],
    inputSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    outputSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    semanticVersion: { type: String, required: true, trim: true, maxlength: 64 },
    categories: [{ type: String, trim: true, maxlength: 64 }],
    dataHandlingDeclarations: [{ type: String, trim: true, maxlength: 64 }],
    supportedRegions: [{ type: String, trim: true, maxlength: 16 }],
    costClass: { type: String, enum: COST_CLASSES, default: 'unknown' },
    latencyClass: { type: String, enum: LATENCY_CLASSES, default: 'unknown' },
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: 'passport_validated' },
  },
  { _id: false, strict: 'throw' },
);

const capabilityCatalogEntrySchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, required: true, trim: true, index: true },
    passportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport', required: true, index: true },
    passportVersion: { type: String, required: true, trim: true, maxlength: 64 },
    connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PassportConnection', required: true, index: true },
    agentName: { type: String, required: true, trim: true, maxlength: 200 },
    agentDescription: {
      type: String,
      trim: true,
      maxlength: AGENT_SELECTION_LIMITS.maximumDescriptionLength,
      default: '',
    },
    publisherName: { type: String, required: true, trim: true, maxlength: 200 },
    capabilities: { type: [normalizedCapabilitySchema], required: true, default: [] },
    capabilityKeys: [{ type: String, trim: true, maxlength: 128 }],
    operationKeys: [{ type: String, trim: true, maxlength: 128 }],
    categories: [{ type: String, trim: true, maxlength: 64 }],
    tags: [{ type: String, trim: true, maxlength: AGENT_SELECTION_LIMITS.maximumTagLength }],
    availabilityStatus: { type: String, enum: ['available', 'unavailable'], default: 'available', index: true },
    lifecycleStatus: { type: String, required: true, trim: true, maxlength: 32 },
    connectionStatus: { type: String, required: true, trim: true, maxlength: 32 },
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: 'passport_validated', index: true },
    trustTier: { type: String, enum: TRUST_TIERS, default: 'registered', index: true },
    dataClassificationsAllowed: [{ type: String, enum: DATA_CLASSIFICATIONS }],
    supportedRegions: [{ type: String, trim: true, uppercase: true, maxlength: 16 }],
    residencyRegions: [{ type: String, trim: true, uppercase: true, maxlength: 16 }],
    estimatedCostClass: { type: String, enum: COST_CLASSES, default: 'unknown', index: true },
    estimatedLatencyClass: { type: String, enum: LATENCY_CLASSES, default: 'unknown', index: true },
    healthStatus: { type: String, enum: HEALTH_STATUSES, default: 'unknown', index: true },
    readinessStatus: { type: String, enum: READINESS_STATUSES, default: 'unknown', index: true },
    circuitState: { type: String, enum: CIRCUIT_STATES, default: 'closed' },
    rateLimitedUntil: { type: Date },
    lastHealthyAt: { type: Date },
    healthSnapshotAt: { type: Date },
    healthSnapshotStale: { type: Boolean, default: true },
    reliabilityScore: { type: Number, min: 0, max: 10_000, default: 5_000 },
    administrativelyPreferred: { type: Boolean, default: false },
    lastCatalogRefreshAt: { type: Date, required: true, index: true },
    sourceVersion: { type: String, required: true, trim: true, maxlength: 128 },
    trustUpdatedBy: { type: String, trim: true, maxlength: 200, select: false },
    trustUpdatedAt: { type: Date },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

capabilityCatalogEntrySchema.index(
  { organizationId: 1, workspaceId: 1, connectionId: 1 },
  { unique: true, name: 'unique_tenant_agent_catalog_connection' },
);
capabilityCatalogEntrySchema.index({ organizationId: 1, workspaceId: 1, capabilityKeys: 1, operationKeys: 1 });
capabilityCatalogEntrySchema.index({ organizationId: 1, workspaceId: 1, trustTier: 1, updatedAt: -1 });
capabilityCatalogEntrySchema.index({ organizationId: 1, workspaceId: 1, healthStatus: 1, readinessStatus: 1 });
capabilityCatalogEntrySchema.index({ passportId: 1, connectionId: 1 });
capabilityCatalogEntrySchema.index({ availabilityStatus: 1, lastCatalogRefreshAt: 1 });

module.exports =
  mongoose.models.CapabilityCatalogEntry ||
  mongoose.model('CapabilityCatalogEntry', capabilityCatalogEntrySchema);
