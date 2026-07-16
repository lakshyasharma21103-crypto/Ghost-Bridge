const mongoose = require('mongoose');
const {
  CONFIGURATION_CATEGORIES,
  CONFIGURATION_STATUSES,
} = require('../constants/enterpriseOperations');

const operationalConfigurationSchema = new mongoose.Schema(
  {
    configurationId: { type: String, required: true, trim: true },
    version: { type: Number, required: true, min: 1 },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    category: { type: String, enum: CONFIGURATION_CATEGORIES, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    values: { type: mongoose.Schema.Types.Mixed, required: true },
    valuesDigest: { type: String, required: true, trim: true },
    status: { type: String, enum: CONFIGURATION_STATUSES, default: 'DRAFT', index: true },
    createdBy: { type: String, required: true, trim: true },
    validatedBy: { type: String, trim: true },
    activatedBy: { type: String, trim: true },
    approvalRequestId: { type: String, trim: true },
    validatedAt: { type: Date },
    activatedAt: { type: Date },
    retiredAt: { type: Date },
    rolledBackFromVersion: { type: Number, min: 1 },
    revision: { type: Number, default: 0, min: 0 },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
);

operationalConfigurationSchema.index(
  { organizationId: 1, workspaceId: 1, configurationId: 1, version: 1 },
  { unique: true, name: 'unique_tenant_operational_configuration_version' },
);
operationalConfigurationSchema.index({ organizationId: 1, workspaceId: 1, category: 1, status: 1 });

module.exports =
  mongoose.models.OperationalConfiguration ||
  mongoose.model('OperationalConfiguration', operationalConfigurationSchema);
