const mongoose = require('mongoose');
const { CHECKPOINT_STATUSES, RECOVERY_LIMITS } = require('../constants/orchestrationRecovery');

const SAFE_HASH = /^(?:sha256|hmac-sha256):[a-f0-9]{64}$/;
const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_NODE_KEY = /^[A-Za-z][A-Za-z0-9_-]{0,99}$/;
const SAFE_REASON_CODE = /^[A-Z][A-Z0-9_]{0,127}$/;

const orchestrationCheckpointSchema = new mongoose.Schema(
  {
    organizationId: { type: String, required: true, trim: true, immutable: true, index: true },
    workspaceId: { type: String, required: true, trim: true, immutable: true, index: true },
    orchestrationRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationRun',
      required: true,
      immutable: true,
      index: true,
    },
    checkpointKey: { type: String, required: true, trim: true, match: SAFE_KEY, immutable: true },
    sequence: { type: Number, required: true, min: 1, immutable: true },
    status: { type: String, enum: CHECKPOINT_STATUSES, required: true, default: 'created', index: true },
    runStatus: { type: String, required: true, trim: true, maxlength: 64, immutable: true },
    completedNodeKeys: { type: [{ type: String, trim: true, match: SAFE_NODE_KEY }], default: [], immutable: true },
    activeNodeKeys: { type: [{ type: String, trim: true, match: SAFE_NODE_KEY }], default: [], immutable: true },
    compensatedNodeKeys: { type: [{ type: String, trim: true, match: SAFE_NODE_KEY }], default: [], immutable: true },
    skippedNodeKeys: { type: [{ type: String, trim: true, match: SAFE_NODE_KEY }], default: [], immutable: true },
    failedNodeKeys: { type: [{ type: String, trim: true, match: SAFE_NODE_KEY }], default: [], immutable: true },
    definitionSnapshotHash: { type: String, required: true, trim: true, match: SAFE_HASH, immutable: true },
    selectionSnapshotHash: { type: String, trim: true, match: SAFE_HASH, immutable: true },
    contractSnapshotHash: { type: String, trim: true, match: SAFE_HASH, immutable: true },
    recoveryPolicySnapshotHash: { type: String, trim: true, match: SAFE_HASH, immutable: true },
    safeStateHash: { type: String, required: true, trim: true, match: SAFE_HASH, immutable: true },
    traceId: { type: String, required: true, trim: true, maxlength: 128, immutable: true, index: true },
    requestId: { type: String, required: true, trim: true, maxlength: 128, immutable: true, index: true },
    createdBy: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    verifiedAt: { type: Date },
    invalidatedAt: { type: Date },
    invalidationReasonCode: { type: String, trim: true, match: SAFE_REASON_CODE },
    resumedAt: { type: Date },
    resumedByDecisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationRecoveryDecision',
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw' },
);

for (const field of ['completedNodeKeys', 'activeNodeKeys', 'compensatedNodeKeys', 'skippedNodeKeys', 'failedNodeKeys']) {
  orchestrationCheckpointSchema.path(field).validate(
    (entries) =>
      entries.length <= RECOVERY_LIMITS.maximumPlanSteps &&
      new Set(entries).size === entries.length,
    `${field} exceeds the bounded checkpoint node limit`,
  );
}

orchestrationCheckpointSchema.index(
  { organizationId: 1, workspaceId: 1, orchestrationRunId: 1, sequence: 1 },
  { unique: true, name: 'unique_tenant_run_checkpoint_sequence' },
);
orchestrationCheckpointSchema.index(
  { organizationId: 1, workspaceId: 1, orchestrationRunId: 1, checkpointKey: 1 },
  { unique: true, name: 'unique_tenant_run_checkpoint_key' },
);
orchestrationCheckpointSchema.index({ organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 });
orchestrationCheckpointSchema.index({ orchestrationRunId: 1, createdAt: -1 });

module.exports =
  mongoose.models.OrchestrationCheckpoint ||
  mongoose.model('OrchestrationCheckpoint', orchestrationCheckpointSchema);
