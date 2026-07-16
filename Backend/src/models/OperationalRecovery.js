const mongoose = require('mongoose');
const { RECOVERY_STATUSES } = require('../constants/enterpriseOperations');

const operationalRecoverySchema = new mongoose.Schema(
  {
    recoveryId: { type: String, required: true, unique: true, trim: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    operationType: { type: String, required: true, trim: true, index: true },
    operationId: { type: String, required: true, trim: true, index: true },
    status: { type: String, enum: RECOVERY_STATUSES, default: 'OPEN', index: true },
    lastSuccessfulStage: { type: String, trim: true },
    nextPermittedStage: { type: String, trim: true },
    retryable: { type: Boolean, default: false },
    safeReason: { type: String, required: true, trim: true, maxlength: 1_000 },
    assignedOperator: { type: String, trim: true },
    traceReferences: { type: [String], default: undefined },
    auditReferences: { type: [String], default: undefined },
    revision: { type: Number, default: 0, min: 0 },
    resolvedAt: { type: Date },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

operationalRecoverySchema.index({ organizationId: 1, status: 1, operationType: 1, updatedAt: -1 });
operationalRecoverySchema.index({ organizationId: 1, operationId: 1 }, { unique: true });

module.exports =
  mongoose.models.OperationalRecovery ||
  mongoose.model('OperationalRecovery', operationalRecoverySchema);
