const mongoose = require('mongoose');

const capabilitySchema = new mongoose.Schema(
  {
    passportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentPassport',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    inputSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    outputSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium', index: true },
    classification: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNCLASSIFIED'],
      index: true,
    },
    category: {
      type: String,
      enum: [
        'SEARCH',
        'DOCUMENT',
        'DATABASE',
        'CRM',
        'EMAIL',
        'FILESYSTEM',
        'FINANCE',
        'PAYMENT',
        'ADMINISTRATION',
        'OTHER',
        'UNCLASSIFIED',
      ],
      index: true,
    },
    sideEffect: {
      type: String,
      enum: ['READ_ONLY', 'LOCAL_CHANGE', 'REMOTE_WRITE', 'IRREVERSIBLE', 'UNKNOWN'],
      index: true,
    },
    requiredPermission: { type: String, trim: true },
    retrySafety: { type: String, enum: ['SAFE', 'UNSAFE', 'UNKNOWN'] },
    cancellationSupport: { type: String, enum: ['SUPPORTED', 'UNSUPPORTED', 'UNKNOWN'] },
    idempotencySupport: { type: String, enum: ['SUPPORTED', 'UNSUPPORTED', 'UNKNOWN'] },
    runtimeToolName: { type: String, trim: true, index: true },
    enabled: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

capabilitySchema.index({ passportId: 1, name: 1 }, { unique: true });
capabilitySchema.index({ passportId: 1, classification: 1, category: 1, sideEffect: 1 });

module.exports = mongoose.models.Capability || mongoose.model('Capability', capabilitySchema);
