const mongoose = require('mongoose');
const {
  DEFAULT_ORCHESTRATION_SETTINGS,
  ORCHESTRATION_DEFINITION_STATUSES,
  ORCHESTRATION_LIMITS,
} = require('../constants/orchestration');

const retryPolicySchema = new mongoose.Schema(
  {
    maxAttempts: {
      type: Number,
      min: 1,
      max: ORCHESTRATION_LIMITS.maximumRetryAttempts,
      default: DEFAULT_ORCHESTRATION_SETTINGS.retryPolicy.maxAttempts,
    },
    baseDelayMs: { type: Number, min: 1, max: 300_000, default: 1_000 },
    maxDelayMs: { type: Number, min: 1, max: 3_600_000, default: 30_000 },
  },
  { _id: false, strict: 'throw' },
);

const approvalRequirementSchema = new mongoose.Schema(
  {
    required: { type: Boolean, default: false },
    workflowId: { type: String, trim: true, maxlength: 200 },
    reason: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false, strict: 'throw' },
);

const nodeDefinitionSchema = new mongoose.Schema(
  {
    nodeKey: { type: String, required: true, trim: true, maxlength: 100 },
    displayName: { type: String, required: true, trim: true, maxlength: 200 },
    connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PassportConnection', required: true },
    passportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport', required: true },
    capability: { type: String, required: true, trim: true, maxlength: 200 },
    operation: { type: String, required: true, trim: true, maxlength: 200 },
    inputSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    outputSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    inputMapping: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    timeoutMs: {
      type: Number,
      min: ORCHESTRATION_LIMITS.minimumNodeTimeoutMs,
      max: ORCHESTRATION_LIMITS.maximumNodeTimeoutMs,
    },
    retryPolicy: { type: retryPolicySchema, default: () => ({}) },
    approvalRequirement: { type: approvalRequirementSchema, default: () => ({}) },
    policyContext: { type: mongoose.Schema.Types.Mixed, default: {} },
    continueOnFailure: { type: Boolean, default: false },
    dependencies: [{ type: String, trim: true, maxlength: 100 }],
  },
  { _id: false, strict: 'throw' },
);

const edgeSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, trim: true, maxlength: 100 },
    to: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { _id: false, strict: 'throw' },
);

const orchestrationDefinitionSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, required: true, trim: true, index: true },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: ORCHESTRATION_LIMITS.maximumDefinitionNameLength,
    },
    description: {
      type: String,
      trim: true,
      maxlength: ORCHESTRATION_LIMITS.maximumDescriptionLength,
      default: '',
    },
    version: { type: Number, required: true, min: 1, default: 1 },
    status: {
      type: String,
      enum: ORCHESTRATION_DEFINITION_STATUSES,
      default: 'draft',
      required: true,
      index: true,
    },
    inputSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    outputSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    nodes: {
      type: [nodeDefinitionSchema],
      validate: (value) => value.length > 0 && value.length <= ORCHESTRATION_LIMITS.maximumNodes,
      required: true,
    },
    edges: { type: [edgeSchema], default: [] },
    concurrencyLimit: {
      type: Number,
      min: 1,
      max: ORCHESTRATION_LIMITS.maximumConcurrency,
      default: DEFAULT_ORCHESTRATION_SETTINGS.concurrencyLimit,
    },
    maxRunDurationMs: {
      type: Number,
      min: ORCHESTRATION_LIMITS.minimumRunDurationMs,
      max: ORCHESTRATION_LIMITS.maximumRunDurationMs,
      default: DEFAULT_ORCHESTRATION_SETTINGS.maxRunDurationMs,
    },
    maxNodeExecutions: {
      type: Number,
      min: 1,
      max: ORCHESTRATION_LIMITS.maximumNodeExecutions,
      default: DEFAULT_ORCHESTRATION_SETTINGS.maxNodeExecutions,
    },
    defaultNodeTimeoutMs: {
      type: Number,
      min: ORCHESTRATION_LIMITS.minimumNodeTimeoutMs,
      max: ORCHESTRATION_LIMITS.maximumNodeTimeoutMs,
      default: DEFAULT_ORCHESTRATION_SETTINGS.defaultNodeTimeoutMs,
    },
    createdBy: { type: String, required: true, trim: true },
    updatedBy: { type: String, required: true, trim: true },
    activatedBy: { type: String, trim: true },
    activatedAt: { type: Date },
    archivedAt: { type: Date },
    validationDigest: { type: String, trim: true },
    validatedAt: { type: Date },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

orchestrationDefinitionSchema.index(
  { organizationId: 1, workspaceId: 1, name: 1, version: 1 },
  { unique: true, name: 'unique_tenant_orchestration_name_version' },
);
orchestrationDefinitionSchema.index({ organizationId: 1, workspaceId: 1, status: 1, updatedAt: -1 });
orchestrationDefinitionSchema.index({ organizationId: 1, workspaceId: 1, updatedAt: -1, _id: -1 });

module.exports =
  mongoose.models.OrchestrationDefinition ||
  mongoose.model('OrchestrationDefinition', orchestrationDefinitionSchema);
