const mongoose = require('mongoose');

const complianceNotificationSchema = new mongoose.Schema(
  {
    notificationId: { type: String, required: true, unique: true, trim: true },
    organizationId: { type: String, required: true, trim: true, index: true },
    workspaceId: { type: String, trim: true, index: true },
    recipientActorId: { type: String, trim: true, index: true },
    type: {
      type: String,
      enum: [
        'APPROVAL_REQUESTED',
        'APPROVAL_DECISION_RECORDED',
        'APPROVAL_REJECTED',
        'APPROVAL_EXPIRED',
        'APPROVAL_INVALIDATED',
        'APPROVAL_COMPLETED',
        'EXECUTION_FAILED_AFTER_APPROVAL',
        'RECOVERY_REQUIRED',
      ],
      required: true,
      index: true,
    },
    approvalRequestId: { type: String, trim: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    safeSummary: { type: String, required: true, trim: true, maxlength: 500 },
    readAt: { type: Date },
    deliveryStatus: { type: String, enum: ['PENDING', 'DELIVERED'], default: 'PENDING' },
  },
  { timestamps: true, strict: 'throw' },
);

complianceNotificationSchema.index({
  organizationId: 1,
  recipientActorId: 1,
  readAt: 1,
  createdAt: -1,
});

module.exports =
  mongoose.models.ComplianceNotification ||
  mongoose.model('ComplianceNotification', complianceNotificationSchema);
