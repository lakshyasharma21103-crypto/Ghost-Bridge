const mongoose = require('mongoose');
const {
  DEFAULT_ORCHESTRATION_SETTINGS,
  ORCHESTRATION_DEFINITION_STATUSES,
  ORCHESTRATION_LIMITS,
} = require('../constants/orchestration');
const { TARGETING_MODES, SELECTION_TIMINGS, AGENT_SELECTION_LIMITS } = require('../constants/agentSelection');
const { MAPPING_MODES } = require('../constants/interAgentDelegation');
const {
  EXPECTED_IDEMPOTENCY_BEHAVIORS,
  FAILURE_STRATEGIES,
  RECOVERABILITIES,
  RECOVERY_LIMITS,
} = require('../constants/orchestrationRecovery');

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

const recoveryOverrideSchema = new mongoose.Schema(
  {
    maximumRecoveryAttempts: { type: Number, min: 0, max: RECOVERY_LIMITS.maximumRecoveryAttempts },
    maximumCompensationAttempts: { type: Number, min: 0, max: RECOVERY_LIMITS.maximumCompensationAttempts },
    recoveryDeadlineMs: { type: Number, min: RECOVERY_LIMITS.minimumDeadlineMs, max: RECOVERY_LIMITS.maximumDeadlineMs },
    compensationDeadlineMs: { type: Number, min: RECOVERY_LIMITS.minimumDeadlineMs, max: RECOVERY_LIMITS.maximumDeadlineMs },
  },
  { _id: false, strict: 'throw' },
);

const interventionRequirementSchema = new mongoose.Schema(
  {
    required: { type: Boolean, default: false },
    mandatoryForSensitiveOperation: { type: Boolean, default: false },
    allowedActions: [{ type: String, trim: true, maxlength: 64 }],
    assignedRoleIds: [{ type: String, trim: true, maxlength: 128 }],
    timeoutMs: { type: Number, min: RECOVERY_LIMITS.minimumDeadlineMs, max: RECOVERY_LIMITS.maximumInterventionMs },
  },
  { _id: false, strict: 'throw' },
);

const checkpointPolicySchema = new mongoose.Schema(
  {
    afterSuccess: { type: Boolean, default: true },
    afterFailure: { type: Boolean, default: true },
    afterRecoveryDecision: { type: Boolean, default: true },
  },
  { _id: false, strict: 'throw' },
);

const compensationDefinitionSchema = new mongoose.Schema(
  {
    targetingMode: { type: String, enum: TARGETING_MODES, default: 'pinned', required: true },
    connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PassportConnection' },
    passportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport' },
    selectionPolicyId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentSelectionPolicy' },
    selectionConstraints: { type: mongoose.Schema.Types.Mixed },
    preferredPassportIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport' }],
    excludedPassportIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport' }],
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
    dataContractId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterAgentDataContract' },
    dataContractVersion: { type: Number, min: 1 },
    approvalRequirement: { type: approvalRequirementSchema, default: () => ({}) },
    expectedIdempotencyBehavior: {
      type: String,
      enum: EXPECTED_IDEMPOTENCY_BEHAVIORS,
      default: 'ghost_bridge_keyed',
    },
    successCriteria: { type: mongoose.Schema.Types.Mixed, default: {} },
    continueAfterCompensationFailure: { type: Boolean, default: false },
    parallelSafe: { type: Boolean, default: false },
    dependencies: [{ type: String, trim: true, maxlength: 100 }],
  },
  { _id: false, strict: 'throw' },
);

const nodeDefinitionSchema = new mongoose.Schema(
  {
    nodeKey: { type: String, required: true, trim: true, maxlength: 100 },
    displayName: { type: String, required: true, trim: true, maxlength: 200 },
    targetingMode: { type: String, enum: TARGETING_MODES, default: 'pinned', required: true },
    connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PassportConnection' },
    passportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport' },
    selectionPolicyId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentSelectionPolicy' },
    selectionConstraints: { type: mongoose.Schema.Types.Mixed },
    preferredPassportIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport' }],
    excludedPassportIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport' }],
    fallbackCandidateCount: { type: Number, min: 0, max: AGENT_SELECTION_LIMITS.maximumFallbackCandidates },
    selectionTiming: { type: String, enum: SELECTION_TIMINGS, default: 'run_creation' },
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
    recoverability: { type: String, enum: RECOVERABILITIES, default: 'retryable' },
    failureStrategy: { type: String, enum: FAILURE_STRATEGIES },
    compensationDefinition: { type: compensationDefinitionSchema, default: undefined },
    recoveryOverrides: { type: recoveryOverrideSchema, default: () => ({}) },
    interventionRequirement: { type: interventionRequirementSchema, default: () => ({}) },
    checkpointPolicy: { type: checkpointPolicySchema, default: () => ({}) },
  },
  { _id: false, strict: 'throw' },
);

const edgeSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, trim: true, maxlength: 100 },
    to: { type: String, required: true, trim: true, maxlength: 100 },
    mappingMode: { type: String, enum: MAPPING_MODES, default: 'direct', required: true },
    dataContractId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterAgentDataContract' },
    dataContractVersion: { type: Number, min: 1 },
    sourceNodeKey: { type: String, trim: true, maxlength: 100 },
    targetNodeKey: { type: String, trim: true, maxlength: 100 },
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
    recoveryPolicyId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationRecoveryPolicy', index: true },
    recoveryPolicyVersion: { type: Number, min: 1 },
    failureStrategy: { type: String, enum: FAILURE_STRATEGIES, default: 'fail' },
    compensationEnabled: { type: Boolean, default: false },
    compensateOnCancellation: { type: Boolean, default: false },
    maximumRecoveryAttempts: { type: Number, min: 0, max: RECOVERY_LIMITS.maximumRecoveryAttempts, default: 0 },
    maximumCompensationAttempts: { type: Number, min: 0, max: RECOVERY_LIMITS.maximumCompensationAttempts, default: 0 },
    recoveryDeadlineMs: { type: Number, min: RECOVERY_LIMITS.minimumDeadlineMs, max: RECOVERY_LIMITS.maximumDeadlineMs },
    compensationDeadlineMs: { type: Number, min: RECOVERY_LIMITS.minimumDeadlineMs, max: RECOVERY_LIMITS.maximumDeadlineMs },
    interventionTimeoutMs: { type: Number, min: RECOVERY_LIMITS.minimumDeadlineMs, max: RECOVERY_LIMITS.maximumInterventionMs },
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
orchestrationDefinitionSchema.index({ organizationId: 1, workspaceId: 1, 'edges.dataContractId': 1 });
orchestrationDefinitionSchema.index({ organizationId: 1, workspaceId: 1, recoveryPolicyId: 1, recoveryPolicyVersion: 1 });

module.exports =
  mongoose.models.OrchestrationDefinition ||
  mongoose.model('OrchestrationDefinition', orchestrationDefinitionSchema);
