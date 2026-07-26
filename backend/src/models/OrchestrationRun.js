const mongoose = require('mongoose');
const {
  ORCHESTRATION_LIMITS,
  ORCHESTRATION_RUN_STATUSES,
} = require('../constants/orchestration');

const safeFailureSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true, maxlength: 128 },
    message: { type: String, trim: true, maxlength: 500 },
    category: { type: String, trim: true, maxlength: 64 },
    requestId: { type: String, trim: true, maxlength: 128 },
    traceId: { type: String, trim: true, maxlength: 128 },
    occurredAt: { type: Date },
  },
  { _id: false, strict: 'throw' },
);

const orchestrationRunSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, required: true, trim: true, index: true },
    definitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationDefinition',
      required: true,
      index: true,
    },
    definitionName: { type: String, required: true, trim: true, maxlength: 200 },
    definitionVersion: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ORCHESTRATION_RUN_STATUSES,
      default: 'queued',
      required: true,
      index: true,
    },
    input: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
    finalOutput: { type: mongoose.Schema.Types.Mixed, select: false },
    failureSummary: { type: safeFailureSchema },
    requestedBy: { type: String, required: true, trim: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelRequestedAt: { type: Date },
    traceId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    requestId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    idempotencyKeyHash: { type: String, required: true, trim: true, select: false },
    requestFingerprint: { type: String, required: true, trim: true, select: false },
    clientIdempotencyProvided: { type: Boolean, default: false, select: false },
    admissionDecisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkloadAdmissionDecision',
      index: true,
    },
    quotaReservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkloadQuotaReservation',
      index: true,
    },
    routingVersion: { type: Number, default: 1, required: true, min: 1, max: 1_000 },
    homeRegionId: { type: String, trim: true, maxlength: 128, index: true },
    executionRegionId: { type: String, trim: true, maxlength: 128, index: true },
    authorityEpoch: { type: Number, min: 0 },
    failoverPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'RegionalFailoverPlan', index: true },
    resumedFromRegionId: { type: String, trim: true, maxlength: 128 },
    concurrencyLimit: {
      type: Number,
      required: true,
      min: 1,
      max: ORCHESTRATION_LIMITS.maximumConcurrency,
    },
    maxRunDurationMs: {
      type: Number,
      required: true,
      min: ORCHESTRATION_LIMITS.minimumRunDurationMs,
      max: ORCHESTRATION_LIMITS.maximumRunDurationMs,
    },
    maxNodeExecutions: {
      type: Number,
      required: true,
      min: 1,
      max: ORCHESTRATION_LIMITS.maximumNodeExecutions,
    },
    nodeExecutionCount: { type: Number, default: 0, min: 0 },
    activeNodeCount: { type: Number, default: 0, min: 0 },
    definitionSnapshot: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
    recoveryPolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationRecoveryPolicy',
      index: true,
    },
    recoveryPolicyVersion: { type: Number, min: 1 },
    recoveryPolicySnapshot: { type: mongoose.Schema.Types.Mixed, select: false },
    recoveryPolicySnapshotHash: { type: String, trim: true, maxlength: 128 },
    recoveryAttempt: { type: Number, default: 0, min: 0 },
    maximumRecoveryAttempts: { type: Number, default: 0, min: 0, max: 20 },
    maximumCompensationAttempts: { type: Number, default: 0, min: 0, max: 10 },
    recoveryDeadlineAt: { type: Date, index: true },
    compensationDeadlineAt: { type: Date, index: true },
    interventionDeadlineAt: { type: Date, index: true },
    currentRecoveryDecisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationRecoveryDecision',
      index: true,
    },
    compensationPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationCompensationPlan',
      index: true,
    },
    interventionRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationInterventionRequest',
      index: true,
    },
    checkpointSequence: { type: Number, default: 0, min: 0 },
    unresolvedSideEffects: {
      type: [
        new mongoose.Schema(
          {
            nodeRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationNodeRun' },
            nodeKey: { type: String, trim: true, maxlength: 100 },
            recoverability: { type: String, trim: true, maxlength: 64 },
            status: { type: String, trim: true, maxlength: 64 },
            safeReasonCode: { type: String, trim: true, maxlength: 128 },
            classification: { type: String, trim: true, maxlength: 64 },
            acceptedRisk: { type: Boolean, default: false },
          },
          { _id: false, strict: 'throw' },
        ),
      ],
      default: [],
    },
    recoveredAt: { type: Date },
    terminationRequestedAt: { type: Date },
    terminatedAt: { type: Date },
    terminationReasonCode: { type: String, trim: true, maxlength: 128 },
    recoveryIncidentId: { type: String, trim: true, maxlength: 128, index: true },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

orchestrationRunSchema.index(
  { organizationId: 1, workspaceId: 1, idempotencyKeyHash: 1 },
  { unique: true, name: 'unique_tenant_orchestration_run_idempotency' },
);
orchestrationRunSchema.index({ organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 });
orchestrationRunSchema.index({ definitionId: 1, definitionVersion: 1, createdAt: -1 });
orchestrationRunSchema.index({ status: 1, updatedAt: 1 });
orchestrationRunSchema.index({ traceId: 1, createdAt: -1 });
orchestrationRunSchema.index({ requestId: 1, createdAt: -1 });
orchestrationRunSchema.index({ organizationId: 1, workspaceId: 1, recoveryDeadlineAt: 1, status: 1 });
orchestrationRunSchema.index({ organizationId: 1, workspaceId: 1, interventionDeadlineAt: 1, status: 1 });

module.exports =
  mongoose.models.OrchestrationRun ||
  mongoose.model('OrchestrationRun', orchestrationRunSchema);
