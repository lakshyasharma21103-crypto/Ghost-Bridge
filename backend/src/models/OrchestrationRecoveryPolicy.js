const mongoose = require('mongoose');
const {
  COMPENSATION_ORDERINGS,
  FAILURE_CATEGORIES,
  FAILURE_STRATEGIES,
  RECOVERY_LIMITS,
  RECOVERY_POLICY_STATUSES,
} = require('../constants/orchestrationRecovery');

const backoffPolicySchema = new mongoose.Schema(
  {
    baseDelayMs: {
      type: Number,
      required: true,
      min: 1,
      max: RECOVERY_LIMITS.maximumBackoffMs,
      default: 1_000,
    },
    maxDelayMs: {
      type: Number,
      required: true,
      min: 1,
      max: RECOVERY_LIMITS.maximumBackoffMs,
      default: 30_000,
    },
    multiplier: { type: Number, required: true, min: 1, max: 10, default: 2 },
    jitterRatio: { type: Number, required: true, min: 0, max: 0.5, default: 0.2 },
  },
  { _id: false, strict: 'throw' },
);

const IMMUTABLE_ACTIVE_FIELDS = new Set([
  'name',
  'description',
  'defaultFailureStrategy',
  'maximumRecoveryAttempts',
  'maximumCompensationAttempts',
  'recoveryBackoffPolicy',
  'compensationBackoffPolicy',
  'recoveryDeadlineMs',
  'compensationDeadlineMs',
  'allowOperatorRetry',
  'allowOperatorSkip',
  'allowOperatorResume',
  'allowOperatorCompensate',
  'allowOperatorTerminate',
  'allowOperatorAgentReplacement',
  'allowOperatorInputCorrection',
  'requireApprovalForRetry',
  'requireApprovalForSkip',
  'requireApprovalForCompensation',
  'requireApprovalForAgentReplacement',
  'requireApprovalForInputCorrection',
  'requireApprovalForForceTermination',
  'permittedFailureCategories',
  'nonRecoverableFailureCategories',
  'automaticCompensation',
  'compensateOnCancellation',
  'compensateOnTimeout',
  'compensateOnPolicyRevocation',
  'compensateOnConnectionRevocation',
  'compensationOrdering',
  'continueCompensationAfterFailure',
  'maximumParallelCompensations',
  'validationDigest',
  'validatedAt',
  'activatedBy',
  'activatedAt',
]);

function protectedPolicyUpdate(update = {}) {
  const paths = new Set();
  for (const [key, value] of Object.entries(update || {})) {
    if (key.startsWith('$') && value && typeof value === 'object') {
      Object.keys(value).forEach((path) => paths.add(path.split('.')[0]));
    } else if (!key.startsWith('$')) {
      paths.add(key.split('.')[0]);
    }
  }
  return [...paths].some((path) => IMMUTABLE_ACTIVE_FIELDS.has(path));
}

const orchestrationRecoveryPolicySchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, immutable: true, index: true },
    workspaceId: { type: String, required: true, trim: true, immutable: true, index: true },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: RECOVERY_LIMITS.maximumNameLength,
    },
    description: {
      type: String,
      trim: true,
      maxlength: RECOVERY_LIMITS.maximumDescriptionLength,
      default: '',
    },
    version: { type: Number, required: true, min: 1, immutable: true },
    status: {
      type: String,
      enum: RECOVERY_POLICY_STATUSES,
      required: true,
      default: 'draft',
      index: true,
    },
    defaultFailureStrategy: {
      type: String,
      enum: FAILURE_STRATEGIES,
      required: true,
      default: 'fail',
    },
    maximumRecoveryAttempts: {
      type: Number,
      required: true,
      min: 0,
      max: RECOVERY_LIMITS.maximumRecoveryAttempts,
      default: 3,
    },
    maximumCompensationAttempts: {
      type: Number,
      required: true,
      min: 0,
      max: RECOVERY_LIMITS.maximumCompensationAttempts,
      default: 3,
    },
    recoveryBackoffPolicy: { type: backoffPolicySchema, required: true, default: () => ({}) },
    compensationBackoffPolicy: {
      type: backoffPolicySchema,
      required: true,
      default: () => ({ baseDelayMs: 1_000, maxDelayMs: 30_000 }),
    },
    recoveryDeadlineMs: {
      type: Number,
      required: true,
      min: RECOVERY_LIMITS.minimumDeadlineMs,
      max: RECOVERY_LIMITS.maximumDeadlineMs,
      default: 60 * 60 * 1_000,
    },
    compensationDeadlineMs: {
      type: Number,
      required: true,
      min: RECOVERY_LIMITS.minimumDeadlineMs,
      max: RECOVERY_LIMITS.maximumDeadlineMs,
      default: 60 * 60 * 1_000,
    },
    allowOperatorRetry: { type: Boolean, default: true },
    allowOperatorSkip: { type: Boolean, default: false },
    allowOperatorResume: { type: Boolean, default: true },
    allowOperatorCompensate: { type: Boolean, default: true },
    allowOperatorTerminate: { type: Boolean, default: false },
    allowOperatorAgentReplacement: { type: Boolean, default: false },
    allowOperatorInputCorrection: { type: Boolean, default: false },
    requireApprovalForRetry: { type: Boolean, default: false },
    requireApprovalForSkip: { type: Boolean, default: true },
    requireApprovalForCompensation: { type: Boolean, default: false },
    requireApprovalForAgentReplacement: { type: Boolean, default: true },
    requireApprovalForInputCorrection: { type: Boolean, default: true },
    requireApprovalForForceTermination: { type: Boolean, default: true },
    permittedFailureCategories: {
      type: [{ type: String, enum: FAILURE_CATEGORIES }],
      default: [],
      validate: (entries) =>
        entries.length <= FAILURE_CATEGORIES.length &&
        new Set(entries).size === entries.length,
    },
    nonRecoverableFailureCategories: {
      type: [{ type: String, enum: FAILURE_CATEGORIES }],
      default: [],
      validate: {
        validator(entries) {
          return (
            entries.length <= FAILURE_CATEGORIES.length &&
            new Set(entries).size === entries.length &&
            entries.every((category) => !(this.permittedFailureCategories || []).includes(category))
          );
        },
        message: 'Failure categories must be unique and cannot conflict across policy lists',
      },
    },
    automaticCompensation: { type: Boolean, default: false },
    compensateOnCancellation: { type: Boolean, default: false },
    compensateOnTimeout: { type: Boolean, default: false },
    compensateOnPolicyRevocation: { type: Boolean, default: false },
    compensateOnConnectionRevocation: { type: Boolean, default: false },
    compensationOrdering: {
      type: String,
      enum: COMPENSATION_ORDERINGS,
      required: true,
      default: 'reverse_topological',
    },
    continueCompensationAfterFailure: { type: Boolean, default: false },
    maximumParallelCompensations: {
      type: Number,
      required: true,
      min: 1,
      max: RECOVERY_LIMITS.maximumParallelCompensations,
      default: 1,
    },
    validationDigest: { type: String, trim: true, maxlength: 128, select: false },
    validatedAt: { type: Date },
    createdBy: { type: String, required: true, trim: true, immutable: true, maxlength: 128 },
    updatedBy: { type: String, required: true, trim: true, maxlength: 128 },
    activatedBy: { type: String, trim: true, maxlength: 128 },
    activatedAt: { type: Date },
    archivedBy: { type: String, trim: true, maxlength: 128 },
    archivedAt: { type: Date },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

orchestrationRecoveryPolicySchema.post('init', function rememberLoadedPolicyStatus(document) {
  document.$locals.recoveryPolicyOriginalStatus = document.status;
});

orchestrationRecoveryPolicySchema.post('save', function rememberSavedPolicyStatus(document) {
  document.$locals.recoveryPolicyOriginalStatus = document.status;
});

orchestrationRecoveryPolicySchema.pre('validate', function protectActivePolicyVersion(next) {
  const originalStatus = this.$locals.recoveryPolicyOriginalStatus;
  if (!this.isNew && originalStatus === 'archived' && this.isModified()) {
    this.invalidate('status', 'Archived recovery-policy versions are immutable.');
  }
  if (
    !this.isNew &&
    originalStatus === 'active' &&
    this.isModified('status') &&
    this.status !== 'archived'
  ) {
    this.invalidate('status', 'Active recovery-policy versions may only transition to archived.');
  }
  if (
    !this.isNew &&
    originalStatus === 'active' &&
    this.modifiedPaths().some((path) => IMMUTABLE_ACTIVE_FIELDS.has(path.split('.')[0]))
  ) {
    this.invalidate('status', 'Active recovery-policy versions are immutable; create a new version.');
  }
  next();
});

for (const operation of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne']) {
  orchestrationRecoveryPolicySchema.pre(operation, function protectActivePolicyQuery(next) {
    if (protectedPolicyUpdate(this.getUpdate())) this.where({ status: { $ne: 'active' } });
    next();
  });
}

orchestrationRecoveryPolicySchema.index(
  { organizationId: 1, workspaceId: 1, name: 1, version: 1 },
  { unique: true, name: 'unique_tenant_recovery_policy_version' },
);
orchestrationRecoveryPolicySchema.index({ organizationId: 1, workspaceId: 1, status: 1, updatedAt: -1 });
orchestrationRecoveryPolicySchema.index({ organizationId: 1, workspaceId: 1, name: 1, status: 1 });

module.exports =
  mongoose.models.OrchestrationRecoveryPolicy ||
  mongoose.model('OrchestrationRecoveryPolicy', orchestrationRecoveryPolicySchema);
