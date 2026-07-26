const mongoose = require('mongoose');
const {
  AGENT_SELECTION_LIMITS,
  COST_CLASSES,
  DATA_CLASSIFICATIONS,
  DEFAULT_SCORE_WEIGHTS,
  DEFAULT_TIE_BREAKER,
  LATENCY_CLASSES,
  SCORE_COMPONENTS,
  SELECTION_POLICY_STATUSES,
  TRUST_TIERS,
  VERIFICATION_STATUSES,
} = require('../constants/agentSelection');

const scoreWeightsSchema = new mongoose.Schema(
  Object.fromEntries(
    SCORE_COMPONENTS.map((key) => [
      key,
      {
        type: Number,
        min: 0,
        max: AGENT_SELECTION_LIMITS.maximumScoreWeight,
        default: DEFAULT_SCORE_WEIGHTS[key],
      },
    ]),
  ),
  { _id: false, strict: 'throw' },
);

const approvalRulesSchema = new mongoose.Schema(
  {
    manualReview: { type: Boolean, default: false },
    trustBelow: { type: String, enum: TRUST_TIERS },
    unverifiedPublisher: { type: Boolean, default: false },
    dataClassifications: [{ type: String, enum: DATA_CLASSIFICATIONS }],
    costClasses: [{ type: String, enum: COST_CLASSES }],
    uncertainResidency: { type: Boolean, default: false },
  },
  { _id: false, strict: 'throw' },
);

const agentSelectionPolicySchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2_000, default: '' },
    version: { type: Number, required: true, min: 1, default: 1 },
    status: { type: String, enum: SELECTION_POLICY_STATUSES, default: 'draft', required: true, index: true },
    capabilityRequirements: [{ type: String, trim: true, maxlength: 128 }],
    allowedCapabilityCategories: [{ type: String, trim: true, maxlength: 64 }],
    allowedPassportIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport' }],
    deniedPassportIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport' }],
    allowedPublishers: [{ type: String, trim: true, maxlength: 200 }],
    deniedPublishers: [{ type: String, trim: true, maxlength: 200 }],
    minimumTrustTier: { type: String, enum: TRUST_TIERS, default: 'registered' },
    requiredVerificationStatuses: [{ type: String, enum: VERIFICATION_STATUSES }],
    allowedRegions: [{ type: String, trim: true, uppercase: true, maxlength: 16 }],
    requiredResidencyRegions: [{ type: String, trim: true, uppercase: true, maxlength: 16 }],
    allowedDataClassifications: [{ type: String, enum: DATA_CLASSIFICATIONS }],
    maximumCostClass: { type: String, enum: COST_CLASSES, default: 'high' },
    maximumLatencyClass: { type: String, enum: LATENCY_CLASSES, default: 'slow' },
    requireHealthy: { type: Boolean, default: true },
    requireReady: { type: Boolean, default: true },
    allowOpenCircuit: { type: Boolean, default: false },
    allowRateLimitedCandidate: { type: Boolean, default: false },
    allowUncertainSchemaCompatibility: { type: Boolean, default: false },
    requireApprovalWhen: { type: approvalRulesSchema, default: () => ({}) },
    scoreWeights: { type: scoreWeightsSchema, default: () => ({}) },
    fallbackCandidateCount: {
      type: Number,
      min: 0,
      max: AGENT_SELECTION_LIMITS.maximumFallbackCandidates,
      default: 3,
    },
    fallbackCandidatesPermitted: { type: Boolean, default: true },
    userPreferenceOverridesPermitted: { type: Boolean, default: true },
    tieBreaker: { type: String, enum: [DEFAULT_TIE_BREAKER], default: DEFAULT_TIE_BREAKER },
    createdBy: { type: String, required: true, trim: true },
    updatedBy: { type: String, required: true, trim: true },
    activatedBy: { type: String, trim: true },
    activatedAt: { type: Date },
    archivedAt: { type: Date },
    validatedAt: { type: Date },
    validationDigest: { type: String, trim: true, maxlength: 128 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

agentSelectionPolicySchema.index(
  { organizationId: 1, workspaceId: 1, name: 1, version: 1 },
  { unique: true, name: 'unique_tenant_agent_selection_policy_version' },
);
agentSelectionPolicySchema.index({ organizationId: 1, workspaceId: 1, status: 1, updatedAt: -1 });
agentSelectionPolicySchema.index({ organizationId: 1, workspaceId: 1, capabilityRequirements: 1, status: 1 });

module.exports =
  mongoose.models.AgentSelectionPolicy ||
  mongoose.model('AgentSelectionPolicy', agentSelectionPolicySchema);
