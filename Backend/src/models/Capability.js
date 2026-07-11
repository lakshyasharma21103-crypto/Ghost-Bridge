const mongoose = require('mongoose');

const capabilitySchema = new mongoose.Schema(
  {
    passportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentPassport', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    inputSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    outputSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium', index: true },
    runtimeToolName: { type: String, trim: true, index: true },
    enabled: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

capabilitySchema.index({ passportId: 1, name: 1 }, { unique: true });

module.exports = mongoose.models.Capability || mongoose.model('Capability', capabilitySchema);
