const mongoose = require('mongoose');
const { ORCHESTRATION_NODE_STATUSES } = require('../constants/orchestration');
const { TARGETING_MODES } = require('../constants/agentSelection');
const {
  FAILURE_CATEGORIES,
  RECOVERABILITIES,
} = require('../constants/orchestrationRecovery');
const {
  ADMISSION_CLASSES,
  PRIORITY_CLASSES,
  WORKER_POOLS,
  WORKLOAD_CATEGORIES,
} = require('../constants/productionScale');

const safeFailureSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, maxlength: 128 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    httpStatusCategory: { type: String, trim: true, maxlength: 32 },
    timeoutCategory: { type: String, trim: true, maxlength: 64 },
    retryable: { type: Boolean, required: true, default: false },
    requestId: { type: String, trim: true, maxlength: 128 },
    traceId: { type: String, trim: true, maxlength: 128 },
    attempt: { type: Number, min: 0 },
    occurredAt: { type: Date, required: true },
  },
  { _id: false, strict: 'throw' },
);

const orchestrationNodeRunSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, required: true, trim: true, index: true },
    orchestrationRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationRun',
      required: true,
      index: true,
    },
    nodeKey: { type: String, required: true, trim: true, maxlength: 100 },
    targetingMode: { type: String, enum: TARGETING_MODES, required: true, default: 'pinned' },
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PassportConnection',
      required: true,
      index: true,
    },
    passportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport', required: true },
    passportVersion: { type: String, required: true, trim: true, maxlength: 100 },
    capability: { type: String, required: true, trim: true, maxlength: 200 },
    operation: { type: String, required: true, trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: ORCHESTRATION_NODE_STATUSES,
      required: true,
      default: 'blocked',
      index: true,
    },
    dependencyNodeKeys: [{ type: String, trim: true, maxlength: 100 }],
    resolvedInput: { type: mongoose.Schema.Types.Mixed, select: false },
    validatedOutput: { type: mongoose.Schema.Types.Mixed, select: false },
    safeFailure: { type: safeFailureSchema },
    continueOnFailure: { type: Boolean, default: false },
    attempt: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, required: true, min: 1, max: 5 },
    nextAttemptAt: { type: Date, index: true },
    timeoutMs: { type: Number, required: true, min: 100, max: 1_800_000 },
    leaseOwner: { type: String, trim: true, maxlength: 128, index: true },
    leaseToken: { type: String, trim: true, maxlength: 128, select: false },
    leaseExpiresAt: { type: Date, index: true },
    heartbeatAt: { type: Date },
    claimedAt: { type: Date, index: true },
    resumeAttempt: { type: Boolean, default: false, select: false },
    operationallyBlocked: { type: Boolean, default: false, select: false },
    operationalBlockReasonCode: { type: String, trim: true, maxlength: 128, select: false },
    operationalResumeStatus: { type: String, enum: ['ready', 'retry_wait'], select: false },
    invocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invocation', index: true },
    requestId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    traceId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    parentTraceId: { type: String, required: true, trim: true, maxlength: 128 },
    workloadCategory: { type: String, enum: WORKLOAD_CATEGORIES, default: 'orchestration_node', required: true, index: true },
    routingVersion: { type: Number, default: 1, required: true, min: 1, max: 1_000 },
    partitionNumber: { type: Number, default: 0, required: true, min: 0, max: 255 },
    partitionKey: { type: String, trim: true, maxlength: 200, index: true },
    admissionClass: { type: String, enum: ADMISSION_CLASSES, default: 'standard', required: true },
    priorityClass: { type: String, enum: PRIORITY_CLASSES, default: 'standard', required: true, index: true },
    workerPool: { type: String, enum: WORKER_POOLS, default: 'execution', required: true },
    leaseEpoch: { type: Number, default: 0, required: true, min: 0 },
    partitionOwnershipEpoch: { type: Number, min: 0 },
    approvalRequestId: { type: String, trim: true, maxlength: 128, index: true },
    selectionDecisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentSelectionDecision', index: true },
    selectionApprovalRequestId: { type: String, trim: true, maxlength: 128, index: true },
    delegationGrantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterAgentDelegationGrant',
      index: true,
    },
    dataContractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterAgentDataContract',
      index: true,
    },
    dataContractVersion: { type: Number, min: 1 },
    recoverability: { type: String, enum: RECOVERABILITIES, default: 'retryable', index: true },
    failureCategory: { type: String, enum: FAILURE_CATEGORIES, index: true },
    recoveryAttempt: { type: Number, default: 0, min: 0 },
    maximumRecoveryAttempts: { type: Number, default: 0, min: 0, max: 20 },
    compensationStatus: {
      type: String,
      enum: ['not_required', 'pending', 'running', 'succeeded', 'failed', 'waived', 'non_reversible'],
      default: 'not_required',
      index: true,
    },
    compensationAttempt: { type: Number, default: 0, min: 0 },
    maximumCompensationAttempts: { type: Number, default: 0, min: 0, max: 10 },
    compensationRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationCompensationRun',
      index: true,
    },
    originalNodeRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationNodeRun' },
    recoveryDecisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationRecoveryDecision',
      index: true,
    },
    interventionRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationInterventionRequest',
      index: true,
    },
    checkpointId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrchestrationCheckpoint', index: true },
    correctedInputId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationCorrectedInput',
      index: true,
    },
    correctedInputVersion: { type: Number, min: 1 },
    correctedInputSchemaHash: { type: String, trim: true, maxlength: 128 },
    recoveryTargetSnapshot: { type: mongoose.Schema.Types.Mixed, select: false },
    replacementSelectionDecisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentSelectionDecision',
      index: true,
    },
    replacementAppliedAt: { type: Date },
    lastSafeFailure: { type: safeFailureSchema },
    completedSideEffectAt: { type: Date },
    compensatedAt: { type: Date },
    skippedAt: { type: Date },
    terminatedAt: { type: Date },
    compensationWaivedAt: { type: Date },
    compensationWaiverReasonCode: { type: String, trim: true, maxlength: 128 },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

orchestrationNodeRunSchema.index(
  { orchestrationRunId: 1, nodeKey: 1 },
  { unique: true, name: 'unique_orchestration_run_node' },
);
orchestrationNodeRunSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
orchestrationNodeRunSchema.index({ workloadCategory: 1, routingVersion: 1, partitionNumber: 1, status: 1, nextAttemptAt: 1 });
orchestrationNodeRunSchema.index({ organizationId: 1, workspaceId: 1, status: 1, priorityClass: 1, createdAt: 1 });
orchestrationNodeRunSchema.index({ organizationId: 1, workspaceId: 1, claimedAt: -1 });
orchestrationNodeRunSchema.index({ status: 1, leaseExpiresAt: 1 });
orchestrationNodeRunSchema.index({ orchestrationRunId: 1, status: 1, nodeKey: 1 });
orchestrationNodeRunSchema.index({ organizationId: 1, workspaceId: 1, status: 1, updatedAt: -1 });
orchestrationNodeRunSchema.index({ approvalRequestId: 1, status: 1 });
orchestrationNodeRunSchema.index({ selectionApprovalRequestId: 1, status: 1 });
orchestrationNodeRunSchema.index({ selectionDecisionId: 1, orchestrationRunId: 1 });
orchestrationNodeRunSchema.index({ delegationGrantId: 1, orchestrationRunId: 1 });
orchestrationNodeRunSchema.index({ orchestrationRunId: 1, recoveryDecisionId: 1 });
orchestrationNodeRunSchema.index({ orchestrationRunId: 1, compensationStatus: 1, completedSideEffectAt: -1 });

module.exports =
  mongoose.models.OrchestrationNodeRun ||
  mongoose.model('OrchestrationNodeRun', orchestrationNodeRunSchema);
