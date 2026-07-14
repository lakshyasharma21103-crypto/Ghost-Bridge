const mongoose = require('mongoose');

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const circuitBreakerSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, trim: true, index: true },
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PassportConnection',
      required: true,
      index: true,
    },
    runtimeType: { type: String, enum: ['rest', 'mcp'], required: true },
    runtimeIdentityHash: { type: String, required: true, match: SAFE_HASH_PATTERN, select: false },
    capabilityName: { type: String, required: true, trim: true, maxlength: 128 },
    state: { type: String, enum: ['closed', 'open', 'half_open'], default: 'closed', index: true },
    consecutiveFailureCount: { type: Number, default: 0, min: 0 },
    successCountSinceClose: { type: Number, default: 0, min: 0 },
    failureCountInWindow: { type: Number, default: 0, min: 0 },
    failureWindowStartedAt: { type: Date },
    openedAt: { type: Date },
    openUntil: { type: Date, index: true },
    halfOpenProbeInFlight: { type: Boolean, default: false },
    halfOpenProbesInFlight: { type: Number, default: 0, min: 0 },
    halfOpenProbeCount: { type: Number, default: 0, min: 0 },
    rateLimitedUntil: { type: Date, index: true },
    lastFailureAt: { type: Date },
    lastSuccessAt: { type: Date },
    lastErrorCode: { type: String, trim: true, match: SAFE_CODE_PATTERN },
    lastFailureStage: { type: String, trim: true, maxlength: 128 },
    lastProviderHttpStatus: { type: Number, min: 100, max: 599 },
    version: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, strict: 'throw' },
);

circuitBreakerSchema.index({ workspaceId: 1, connectionId: 1 });
circuitBreakerSchema.index({ state: 1, openUntil: 1 });
circuitBreakerSchema.index({ updatedAt: -1 });
circuitBreakerSchema.index(
  { workspaceId: 1, connectionId: 1, runtimeType: 1, capabilityName: 1, runtimeIdentityHash: 1 },
  { unique: true, name: 'unique_runtime_circuit_scope' },
);

module.exports =
  mongoose.models.CircuitBreaker || mongoose.model('CircuitBreaker', circuitBreakerSchema);
