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
        'TENANT_SUSPENDED',
        'TENANT_REACTIVATED',
        'WORKSPACE_SUSPENDED',
        'WORKSPACE_REACTIVATED',
        'MAINTENANCE_SCHEDULED',
        'MAINTENANCE_ACTIVATED',
        'MAINTENANCE_COMPLETED',
        'ACCESS_REVIEW_ASSIGNED',
        'ACCESS_REVIEW_OVERDUE',
        'ACCESS_REVOKED',
        'SERVICE_ACCOUNT_EXPIRING',
        'SECURITY_INCIDENT_OPENED',
        'SECURITY_INCIDENT_ESCALATED',
        'EVIDENCE_EXPORT_COMPLETED',
        'TENANT_EXPORT_COMPLETED',
        'DELETION_REQUEST_BLOCKED',
        'DELETION_COMPLETED',
        'CONFIGURATION_ACTIVATED',
        'CONFIGURATION_ROLLBACK_COMPLETED',
      ],
      required: true,
      index: true,
    },
    approvalRequestId: { type: String, trim: true, index: true },
    resourceType: { type: String, trim: true },
    resourceId: { type: String, trim: true, index: true },
    deduplicationKey: { type: String, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    safeSummary: { type: String, required: true, trim: true, maxlength: 500 },
    readAt: { type: Date },
    deliveryStatus: { type: String, enum: ['PENDING', 'DELIVERED'], default: 'PENDING' },
    schemaVersion: { type: Number, enum: [1], default: 1 },
  },
  { timestamps: true, strict: 'throw' },
);

complianceNotificationSchema.index({
  organizationId: 1,
  recipientActorId: 1,
  readAt: 1,
  createdAt: -1,
});
complianceNotificationSchema.index(
  { organizationId: 1, deduplicationKey: 1 },
  {
    unique: true,
    partialFilterExpression: { deduplicationKey: { $type: 'string' } },
    name: 'unique_tenant_administrative_notification_deduplication',
  },
);

module.exports =
  mongoose.models.ComplianceNotification ||
  mongoose.model('ComplianceNotification', complianceNotificationSchema);
