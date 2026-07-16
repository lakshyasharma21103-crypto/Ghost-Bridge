const express = require('express');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');
const controller = require('../controllers/enterpriseOperationsController');

const enterpriseOperationsRouter = express.Router();
enterpriseOperationsRouter.use(authenticatePartner);

enterpriseOperationsRouter.get(
  '/dashboard',
  requiresPermission('operations.admin.read', { resourceType: 'EnterpriseOperations' }),
  controller.dashboard,
);
enterpriseOperationsRouter.get(
  '/lifecycle',
  requiresPermission(
    (request) =>
      request.query.workspaceId ? 'workspace.lifecycle.read' : 'organization.lifecycle.read',
    { resourceType: 'Lifecycle' },
  ),
  controller.getLifecycle,
);
enterpriseOperationsRouter.post(
  '/organization/suspend/request',
  requiresPermission('organization.suspend', { resourceType: 'Organization' }),
  controller.organizationTransition('suspending'),
);
enterpriseOperationsRouter.post(
  '/organization/suspend/complete',
  requiresPermission('organization.suspend', { resourceType: 'Organization' }),
  controller.organizationTransition('suspended'),
);
enterpriseOperationsRouter.post(
  '/organization/reactivate/request',
  requiresPermission('organization.reactivate', { resourceType: 'Organization' }),
  controller.organizationTransition('reactivating'),
);
enterpriseOperationsRouter.post(
  '/organization/reactivate/complete',
  requiresPermission('organization.reactivate', { resourceType: 'Organization' }),
  controller.organizationTransition('active'),
);
enterpriseOperationsRouter.post(
  '/organization/archive/request',
  requiresPermission('organization.archive', { resourceType: 'Organization' }),
  controller.organizationTransition('archiving'),
);
enterpriseOperationsRouter.post(
  '/organization/archive/complete',
  requiresPermission('organization.archive', { resourceType: 'Organization' }),
  controller.organizationTransition('archived'),
);
enterpriseOperationsRouter.post(
  '/organization/resume-work',
  requiresPermission('maintenance.release', { resourceType: 'RuntimeWorkItem' }),
  controller.controlledResume,
);

enterpriseOperationsRouter.post(
  '/workspaces/:workspaceId/suspend/request',
  requiresPermission('workspace.suspend', { resourceType: 'Workspace' }),
  controller.workspaceTransition('suspending'),
);
enterpriseOperationsRouter.post(
  '/workspaces/:workspaceId/suspend/complete',
  requiresPermission('workspace.suspend', { resourceType: 'Workspace' }),
  controller.workspaceTransition('suspended'),
);
enterpriseOperationsRouter.post(
  '/workspaces/:workspaceId/reactivate',
  requiresPermission('workspace.reactivate', { resourceType: 'Workspace' }),
  controller.workspaceTransition('active'),
);
enterpriseOperationsRouter.post(
  '/workspaces/:workspaceId/read-only',
  requiresPermission('workspace.suspend', { resourceType: 'Workspace' }),
  controller.workspaceTransition('read_only'),
);
enterpriseOperationsRouter.post(
  '/workspaces/:workspaceId/archive',
  requiresPermission('workspace.archive', { resourceType: 'Workspace' }),
  controller.workspaceTransition('archived'),
);
enterpriseOperationsRouter.post(
  '/workspaces/:workspaceId/resume-work',
  requiresPermission('maintenance.release', { resourceType: 'RuntimeWorkItem' }),
  controller.controlledResume,
);

enterpriseOperationsRouter.get(
  '/maintenance',
  requiresPermission('maintenance.read', { resourceType: 'MaintenanceWindow' }),
  controller.listMaintenance,
);
enterpriseOperationsRouter.post(
  '/maintenance',
  requiresPermission('maintenance.manage', { resourceType: 'MaintenanceWindow' }),
  controller.createMaintenance,
);
enterpriseOperationsRouter.post(
  '/maintenance/:maintenanceId/validate',
  requiresPermission('maintenance.manage', { resourceType: 'MaintenanceWindow' }),
  controller.validateMaintenance,
);
enterpriseOperationsRouter.post(
  '/maintenance/:maintenanceId/activate',
  requiresPermission('maintenance.activate', { resourceType: 'MaintenanceWindow' }),
  controller.activateMaintenance,
);
enterpriseOperationsRouter.post(
  '/maintenance/:maintenanceId/release',
  requiresPermission('maintenance.release', { resourceType: 'MaintenanceWindow' }),
  controller.releaseMaintenance,
);
enterpriseOperationsRouter.post(
  '/maintenance/:maintenanceId/cancel',
  requiresPermission('maintenance.manage', { resourceType: 'MaintenanceWindow' }),
  controller.cancelMaintenance,
);
enterpriseOperationsRouter.get(
  '/drain-status',
  requiresPermission('dr-status.read', { resourceType: 'RuntimeWorkItem' }),
  controller.drainStatus,
);

enterpriseOperationsRouter.get(
  '/members/:userId/history',
  requiresPermission('membership.lifecycle.read', { resourceType: 'EnterpriseUser' }),
  controller.membershipHistory,
);
enterpriseOperationsRouter.post(
  '/members',
  requiresPermission('user.manage', { resourceType: 'EnterpriseUser' }),
  controller.provisionMembership,
);
enterpriseOperationsRouter.post(
  '/members/:userId/suspend',
  requiresPermission('membership.suspend', { resourceType: 'EnterpriseUser' }),
  controller.membershipTransition('suspended'),
);
enterpriseOperationsRouter.post(
  '/members/:userId/restore',
  requiresPermission('membership.restore', { resourceType: 'EnterpriseUser' }),
  controller.membershipTransition('active'),
);
enterpriseOperationsRouter.post(
  '/members/:userId/removal/request',
  requiresPermission('membership.remove', { resourceType: 'EnterpriseUser' }),
  controller.membershipTransition('removal_pending'),
);
enterpriseOperationsRouter.post(
  '/members/:userId/removal/execute',
  requiresPermission('membership.remove', { resourceType: 'EnterpriseUser' }),
  controller.membershipTransition('removed'),
);

enterpriseOperationsRouter.get(
  '/service-accounts/:accountId/history',
  requiresPermission('service-account.lifecycle.read', { resourceType: 'ServiceAccount' }),
  controller.serviceAccountHistory,
);
enterpriseOperationsRouter.post(
  '/service-accounts',
  requiresPermission('service_account.manage', { resourceType: 'ServiceAccount' }),
  controller.createServiceAccount,
);
enterpriseOperationsRouter.post(
  '/service-accounts/:accountId/disable',
  requiresPermission('service-account.disable', { resourceType: 'ServiceAccount' }),
  controller.serviceAccountTransition('disabled'),
);
enterpriseOperationsRouter.post(
  '/service-accounts/:accountId/rotation-required',
  requiresPermission('service-account.rotate', { resourceType: 'ServiceAccount' }),
  controller.serviceAccountTransition('rotation_required'),
);
enterpriseOperationsRouter.post(
  '/service-accounts/:accountId/rotation-complete',
  requiresPermission('service-account.rotate', { resourceType: 'ServiceAccount' }),
  controller.serviceAccountTransition('active'),
);
enterpriseOperationsRouter.post(
  '/service-accounts/:accountId/revoke',
  requiresPermission('service-account.revoke', { resourceType: 'ServiceAccount' }),
  controller.serviceAccountTransition('revoked'),
);
enterpriseOperationsRouter.post(
  '/service-accounts/:accountId/delete',
  requiresPermission('service-account.revoke', { resourceType: 'ServiceAccount' }),
  controller.serviceAccountTransition('deleted'),
);

enterpriseOperationsRouter.get(
  '/access-reviews',
  requiresPermission('access-review.read', { resourceType: 'AccessReviewCampaign' }),
  controller.listAccessReviews,
);
enterpriseOperationsRouter.post(
  '/access-reviews',
  requiresPermission('access-review.create', { resourceType: 'AccessReviewCampaign' }),
  controller.createAccessReview,
);
enterpriseOperationsRouter.get(
  '/access-reviews/:campaignId',
  requiresPermission('access-review.read', { resourceType: 'AccessReviewCampaign' }),
  controller.getAccessReview,
);
enterpriseOperationsRouter.post(
  '/access-reviews/:campaignId/activate',
  requiresPermission('access-review.manage', { resourceType: 'AccessReviewCampaign' }),
  controller.activateAccessReview,
);
enterpriseOperationsRouter.post(
  '/access-reviews/:campaignId/close',
  requiresPermission('access-review.manage', { resourceType: 'AccessReviewCampaign' }),
  controller.closeAccessReview,
);
enterpriseOperationsRouter.post(
  '/access-review-items/:reviewItemId/decision',
  requiresPermission('access-review.decide', { resourceType: 'AccessReviewItem' }),
  controller.decideAccessReviewItem,
);
enterpriseOperationsRouter.post(
  '/access-review-items/:reviewItemId/remediate',
  requiresPermission('access-review.remediate', { resourceType: 'AccessReviewItem' }),
  controller.remediateAccessReviewItem,
);

enterpriseOperationsRouter.get(
  '/configurations',
  requiresPermission('configuration.read', { resourceType: 'OperationalConfiguration' }),
  controller.listConfigurations,
);
enterpriseOperationsRouter.post(
  '/configurations',
  requiresPermission('configuration.create', { resourceType: 'OperationalConfiguration' }),
  controller.createConfiguration,
);
enterpriseOperationsRouter.post(
  '/configurations/:configurationId/versions/:version/validate',
  requiresPermission('configuration.validate', { resourceType: 'OperationalConfiguration' }),
  controller.validateConfiguration,
);
enterpriseOperationsRouter.post(
  '/configurations/:configurationId/versions/:version/activate',
  requiresPermission('configuration.activate', { resourceType: 'OperationalConfiguration' }),
  controller.activateConfiguration,
);
enterpriseOperationsRouter.post(
  '/configurations/:configurationId/versions/:version/rollback',
  requiresPermission('configuration.rollback', { resourceType: 'OperationalConfiguration' }),
  controller.rollbackConfiguration,
);

enterpriseOperationsRouter.get(
  '/incidents',
  requiresPermission('incident.read', { resourceType: 'OperationalIncident' }),
  controller.listIncidents,
);
enterpriseOperationsRouter.post(
  '/incidents',
  requiresPermission('incident.create', { resourceType: 'OperationalIncident' }),
  controller.createIncident,
);
enterpriseOperationsRouter.get(
  '/incidents/:incidentId',
  requiresPermission('incident.read', { resourceType: 'OperationalIncident' }),
  controller.getIncident,
);
enterpriseOperationsRouter.post(
  '/incidents/:incidentId/actions/:action',
  requiresPermission('incident.manage', { resourceType: 'OperationalIncident' }),
  controller.updateIncident,
);
enterpriseOperationsRouter.post(
  '/incidents/:incidentId/respond',
  requiresPermission('incident.respond', { resourceType: 'OperationalIncident' }),
  controller.respondToIncident,
);
enterpriseOperationsRouter.get(
  '/security-events',
  requiresPermission('security-event.read', { resourceType: 'SecurityEvent' }),
  controller.listSecurityEvents,
);
enterpriseOperationsRouter.post(
  '/security-events/:securityEventId',
  requiresPermission('security-event.manage', { resourceType: 'SecurityEvent' }),
  controller.manageSecurityEvent,
);

enterpriseOperationsRouter.get(
  '/notifications',
  requiresPermission('operations.admin.read', { resourceType: 'ComplianceNotification' }),
  controller.listNotifications,
);
enterpriseOperationsRouter.post(
  '/notifications/:notificationId/read',
  requiresPermission('operations.admin.read', { resourceType: 'ComplianceNotification' }),
  controller.markNotificationRead,
);

enterpriseOperationsRouter.get(
  '/tenant-exports',
  requiresPermission('tenant-export.read', { resourceType: 'TenantDataExport' }),
  controller.listTenantExports,
);
enterpriseOperationsRouter.post(
  '/tenant-exports',
  requiresPermission('tenant-export.create', { resourceType: 'TenantDataExport' }),
  controller.createTenantExport,
);
enterpriseOperationsRouter.get(
  '/tenant-exports/:tenantExportId',
  requiresPermission('tenant-export.read', { resourceType: 'TenantDataExport' }),
  controller.getTenantExport,
);
enterpriseOperationsRouter.post(
  '/tenant-exports/:tenantExportId/cancel',
  requiresPermission('tenant-export.create', { resourceType: 'TenantDataExport' }),
  controller.cancelTenantExport,
);
enterpriseOperationsRouter.post(
  '/tenant-exports/:tenantExportId/download-token',
  requiresPermission('tenant-export.download', { resourceType: 'TenantDataExport' }),
  controller.issueTenantExportDownload,
);
enterpriseOperationsRouter.get(
  '/tenant-exports/:tenantExportId/download',
  requiresPermission('tenant-export.download', { resourceType: 'TenantDataExport' }),
  controller.downloadTenantExport,
);

enterpriseOperationsRouter.post(
  '/tenant-deletion/preview',
  requiresPermission('tenant-deletion.read', { resourceType: 'TenantDeletionJob' }),
  controller.deletionPreview,
);
enterpriseOperationsRouter.post(
  '/tenant-deletion',
  requiresPermission('tenant-deletion.request', { resourceType: 'TenantDeletionJob' }),
  controller.requestDeletion,
);
enterpriseOperationsRouter.get(
  '/tenant-deletion/:deletionJobId',
  requiresPermission('tenant-deletion.read', { resourceType: 'TenantDeletionJob' }),
  controller.getDeletion,
);
enterpriseOperationsRouter.post(
  '/tenant-deletion/:deletionJobId/approve',
  requiresPermission('tenant-deletion.approve', { resourceType: 'TenantDeletionJob' }),
  controller.approveDeletion,
);
enterpriseOperationsRouter.post(
  '/tenant-deletion/:deletionJobId/execute',
  requiresPermission('tenant-deletion.execute', { resourceType: 'TenantDeletionJob' }),
  controller.executeDeletion,
);

enterpriseOperationsRouter.get(
  '/recoveries',
  requiresPermission('recovery.read', { resourceType: 'OperationalRecovery' }),
  controller.listRecoveries,
);
enterpriseOperationsRouter.post(
  '/recoveries/:recoveryId',
  requiresPermission('recovery.manage', { resourceType: 'OperationalRecovery' }),
  controller.manageRecovery,
);
enterpriseOperationsRouter.get(
  '/dr-status',
  requiresPermission('dr-status.read', { resourceType: 'DisasterRecoveryStatus' }),
  controller.listDrStatus,
);
enterpriseOperationsRouter.post(
  '/dr-status',
  requiresPermission('recovery.manage', { resourceType: 'DisasterRecoveryStatus' }),
  controller.updateDrStatus,
);

module.exports = { enterpriseOperationsRouter };
