const mongoose = require('mongoose');
const {
  DATA_CLASSIFICATIONS,
  DATA_CONTRACT_STATUSES,
  INTER_AGENT_LIMITS,
  RETENTION_MODES,
} = require('../constants/interAgentDelegation');

const selectorSchema = new mongoose.Schema(
  {
    passportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport' },
    connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PassportConnection' },
    publisher: { type: String, trim: true, maxlength: 200 },
    capabilityCategory: { type: String, trim: true, maxlength: 64 },
    minimumTrustTier: { type: String, trim: true, maxlength: 64 },
    selectionPolicyId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentSelectionPolicy' },
    orchestrationDefinitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationDefinition',
    },
    orchestrationNodeKey: { type: String, trim: true, maxlength: 100 },
  },
  { _id: false, strict: 'throw' },
);

const retentionPolicySchema = new mongoose.Schema(
  {
    mode: { type: String, enum: RETENTION_MODES, default: 'metadata_only' },
    durationDays: { type: Number, min: 0, max: 3650, default: 0 },
  },
  { _id: false, strict: 'throw' },
);

const dataContractSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, immutable: true, index: true },
    workspaceId: { type: String, required: true, trim: true, immutable: true, index: true },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: INTER_AGENT_LIMITS.maximumNameLength,
    },
    description: {
      type: String,
      trim: true,
      maxlength: INTER_AGENT_LIMITS.maximumDescriptionLength,
      default: '',
    },
    version: { type: Number, required: true, min: 1, immutable: true },
    status: { type: String, enum: DATA_CONTRACT_STATUSES, default: 'draft', index: true },
    sourceSelector: { type: selectorSchema, required: true },
    targetSelector: { type: selectorSchema, required: true },
    sourceCapability: { type: String, required: true, trim: true, maxlength: 200 },
    sourceOperation: { type: String, required: true, trim: true, maxlength: 200 },
    targetCapability: { type: String, required: true, trim: true, maxlength: 200 },
    targetOperation: { type: String, required: true, trim: true, maxlength: 200 },
    purpose: {
      type: String,
      required: true,
      trim: true,
      maxlength: INTER_AGENT_LIMITS.maximumPurposeLength,
    },
    purposeCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: /^[A-Z][A-Z0-9_]{0,127}$/,
    },
    allowedInputSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    allowedOutputSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    sourceOutputMapping: { type: mongoose.Schema.Types.Mixed, default: {} },
    targetInputMapping: { type: mongoose.Schema.Types.Mixed, default: {} },
    downstreamOutputMapping: { type: mongoose.Schema.Types.Mixed, default: {} },
    allowedInputFields: [{ type: String, trim: true, maxlength: 512 }],
    deniedInputFields: [{ type: String, trim: true, maxlength: 512 }],
    allowedOutputFields: [{ type: String, trim: true, maxlength: 512 }],
    deniedOutputFields: [{ type: String, trim: true, maxlength: 512 }],
    allowedDataClassifications: [{ type: String, enum: DATA_CLASSIFICATIONS }],
    maximumDataClassification: {
      type: String,
      enum: DATA_CLASSIFICATIONS,
      required: true,
      default: 'internal',
    },
    allowedRegions: [{ type: String, trim: true, uppercase: true, maxlength: 16 }],
    residencyRequirements: [{ type: String, trim: true, uppercase: true, maxlength: 16 }],
    transformationRules: { type: [mongoose.Schema.Types.Mixed], default: [] },
    redactionRules: { type: [mongoose.Schema.Types.Mixed], default: [] },
    minimizationRules: { type: [mongoose.Schema.Types.Mixed], default: [] },
    maximumPayloadBytes: {
      type: Number,
      min: 1,
      max: INTER_AGENT_LIMITS.maximumPayloadBytes,
      default: 256_000,
    },
    maximumArrayItems: {
      type: Number,
      min: 1,
      max: INTER_AGENT_LIMITS.maximumArrayItems,
      default: 100,
    },
    maximumStringLength: {
      type: Number,
      min: 1,
      max: INTER_AGENT_LIMITS.maximumStringLength,
      default: 10_000,
    },
    maximumObjectDepth: {
      type: Number,
      min: 1,
      max: INTER_AGENT_LIMITS.maximumObjectDepth,
      default: 10,
    },
    allowAttachments: { type: Boolean, default: false },
    allowedAttachmentTypes: [{ type: String, trim: true, lowercase: true, maxlength: 128 }],
    maximumAttachmentBytes: {
      type: Number,
      min: 0,
      max: INTER_AGENT_LIMITS.maximumAttachmentBytes,
      default: 0,
    },
    allowFurtherDelegation: { type: Boolean, default: false },
    maximumDelegationDepth: {
      type: Number,
      min: 1,
      max: INTER_AGENT_LIMITS.platformMaximumDelegationDepth,
      default: 1,
    },
    requireApproval: { type: Boolean, default: false },
    approvalConditions: { type: mongoose.Schema.Types.Mixed, default: {} },
    retentionPolicy: { type: retentionPolicySchema, default: () => ({}) },
    validFrom: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    inputSchemaHash: { type: String, trim: true, select: false },
    outputSchemaHash: { type: String, trim: true, select: false },
    validationDigest: { type: String, trim: true, select: false },
    validatedAt: { type: Date },
    createdBy: { type: String, required: true, trim: true, immutable: true },
    updatedBy: { type: String, required: true, trim: true },
    activatedBy: { type: String, trim: true },
    activatedAt: { type: Date },
    archivedBy: { type: String, trim: true },
    archivedAt: { type: Date },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

dataContractSchema.index(
  { organizationId: 1, workspaceId: 1, name: 1, version: 1 },
  { unique: true, name: 'unique_tenant_inter_agent_contract_version' },
);
dataContractSchema.index({ organizationId: 1, workspaceId: 1, status: 1, updatedAt: -1 });
dataContractSchema.index({ organizationId: 1, workspaceId: 1, sourceCapability: 1, targetCapability: 1 });
dataContractSchema.index({ organizationId: 1, workspaceId: 1, 'sourceSelector.passportId': 1 });
dataContractSchema.index({ organizationId: 1, workspaceId: 1, 'targetSelector.passportId': 1 });
dataContractSchema.index({ organizationId: 1, workspaceId: 1, expiresAt: 1 });

module.exports =
  mongoose.models.InterAgentDataContract ||
  mongoose.model('InterAgentDataContract', dataContractSchema);
