'use strict';

const mongoose = require('mongoose');

const nativeClientApprovalReplaySchema = new mongoose.Schema(
  {
    _id: { type: String, required: true, maxlength: 64 },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

nativeClientApprovalReplaySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.NativeClientApprovalReplay ||
  mongoose.model('NativeClientApprovalReplay', nativeClientApprovalReplaySchema);
