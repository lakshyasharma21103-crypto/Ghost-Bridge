const mongoose = require('mongoose');
const { DATA_CLASSIFICATIONS } = require('../constants/interAgentDelegation');
const { RECOVERY_LIMITS } = require('../constants/orchestrationRecovery');

const SAFE_HASH = /^(?:sha256|hmac-sha256):[a-f0-9]{64}$/;
const SAFE_FIELD_PATH = /^[A-Za-z][A-Za-z0-9_-]{0,127}(?:\.[A-Za-z][A-Za-z0-9_-]{0,127})*$/;
const PRIVATE_FIELD = /^(?:authorization|api[_-]?key|access[_-]?token|credentials?|provider[_-]?key|install[_-]?key|runtime[_-]?credential|encrypted[_-]?delegated[_-]?credential|system[_-]?prompt|chain[_-]?of[_-]?thought|hidden[_-]?reasoning|private[_-]?memory)$/i;

function safeChangedField(path) {
  return (
    SAFE_FIELD_PATH.test(String(path || '')) &&
    String(path).split('.').every((segment) => !PRIVATE_FIELD.test(segment))
  );
}

const encryptedPayloadSchema = new mongoose.Schema(
  {
    algorithm: { type: String, enum: ['aes-256-gcm'], required: true },
    iv: { type: String, required: true, maxlength: 64 },
    tag: { type: String, required: true, maxlength: 64 },
    ciphertext: { type: String, required: true, maxlength: 2_000_000 },
  },
  { _id: false, strict: 'throw' },
);

const orchestrationCorrectedInputSchema = new mongoose.Schema(
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
    nodeRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationNodeRun',
      required: true,
      immutable: true,
      index: true,
    },
    recoveryDecisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrchestrationRecoveryDecision',
      required: true,
      immutable: true,
      index: true,
    },
    version: { type: Number, required: true, min: 1, immutable: true },
    baseVersion: { type: Number, min: 0, default: 0, immutable: true },
    inputSchemaHash: { type: String, required: true, trim: true, match: SAFE_HASH, immutable: true },
    payloadHash: { type: String, required: true, trim: true, match: SAFE_HASH, immutable: true, select: false },
    dataClassification: { type: String, enum: DATA_CLASSIFICATIONS, required: true, immutable: true },
    changedFieldNames: {
      type: [{ type: String, trim: true, maxlength: 512, validate: safeChangedField }],
      required: true,
      immutable: true,
      validate: (entries) =>
        entries.length <= RECOVERY_LIMITS.maximumChangedFields &&
        new Set(entries).size === entries.length,
    },
    changedFieldCount: {
      type: Number,
      required: true,
      min: 1,
      max: RECOVERY_LIMITS.maximumChangedFields,
      immutable: true,
      validate: {
        validator(value) {
          return (this.changedFieldNames || []).length === Number(value);
        },
        message: 'changedFieldCount must equal the immutable changed-field name count',
      },
    },
    approximatePayloadBytes: {
      type: Number,
      required: true,
      min: 1,
      max: RECOVERY_LIMITS.maximumCorrectedInputBytes,
      immutable: true,
    },
    encryptedPayload: {
      type: encryptedPayloadSchema,
      required: true,
      immutable: true,
      select: false,
    },
    requestedBy: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    requestId: { type: String, required: true, trim: true, maxlength: 128, immutable: true, index: true },
    traceId: { type: String, required: true, trim: true, maxlength: 128, immutable: true, index: true },
    expiresAt: { type: Date, index: true, immutable: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw' },
);

orchestrationCorrectedInputSchema.index(
  { organizationId: 1, workspaceId: 1, orchestrationRunId: 1, nodeRunId: 1, version: 1 },
  { unique: true, name: 'unique_tenant_node_corrected_input_version' },
);
orchestrationCorrectedInputSchema.index(
  { recoveryDecisionId: 1 },
  { unique: true, name: 'unique_corrected_input_recovery_decision' },
);
orchestrationCorrectedInputSchema.index({ organizationId: 1, workspaceId: 1, createdAt: -1 });

module.exports =
  mongoose.models.OrchestrationCorrectedInput ||
  mongoose.model('OrchestrationCorrectedInput', orchestrationCorrectedInputSchema);
