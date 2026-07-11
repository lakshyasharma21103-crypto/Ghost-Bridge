const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorType: { type: String, enum: ['partner', 'user', 'system'], required: true, index: true },
    actorId: { type: String, trim: true, index: true },
    action: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, trim: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    requestId: { type: String, trim: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
