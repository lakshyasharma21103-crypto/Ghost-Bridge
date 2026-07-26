const mongoose = require('mongoose');

const runtimeCapacitySlotSchema = new mongoose.Schema(
  {
    workspaceId: { type: String, required: true, trim: true, index: true },
    scopeType: { type: String, enum: ['workspace', 'connection'], required: true },
    scopeId: { type: String, required: true, trim: true },
    slotNumber: { type: Number, required: true, min: 1 },
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PassportConnection',
      required: true,
      index: true,
    },
    invocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invocation',
      required: true,
      index: true,
    },
    leaseId: { type: String, required: true, trim: true, maxlength: 128, index: true },
    acquiredAt: { type: Date, required: true },
    leaseExpiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, strict: 'throw' },
);

runtimeCapacitySlotSchema.index(
  { workspaceId: 1, scopeType: 1, scopeId: 1, slotNumber: 1 },
  { unique: true, name: 'unique_runtime_capacity_slot' },
);
runtimeCapacitySlotSchema.index({ workspaceId: 1, leaseExpiresAt: 1 });
runtimeCapacitySlotSchema.index({ invocationId: 1, leaseId: 1 });

module.exports =
  mongoose.models.RuntimeCapacitySlot ||
  mongoose.model('RuntimeCapacitySlot', runtimeCapacitySlotSchema);
