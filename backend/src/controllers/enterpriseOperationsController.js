const service = require('../services/enterpriseOperations.service');

function inputFrom(request, extra = {}) {
  return { ...request.query, ...request.body, ...extra };
}

function callerFrom(request) {
  return { partner: request.partner, requestId: request.requestId, traceId: request.traceId };
}

function handler(operation, status = 200) {
  return async (request, response, next) => {
    try {
      const data = await operation(request);
      response.status(status).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

const getLifecycle = handler((request) =>
  service.getLifecycle(inputFrom(request), callerFrom(request)),
);
const organizationTransition = (targetState) =>
  handler((request) =>
    service.transitionOrganization(targetState, inputFrom(request), callerFrom(request)),
  );
const workspaceTransition = (targetState) =>
  handler((request) =>
    service.transitionWorkspace(
      request.params.workspaceId,
      targetState,
      inputFrom(request, { workspaceId: request.params.workspaceId }),
      callerFrom(request),
    ),
  );
const controlledResume = handler((request) =>
  service.controlledResume(inputFrom(request), callerFrom(request)),
);

const listMaintenance = handler((request) =>
  service.listMaintenance(inputFrom(request), callerFrom(request)),
);
const createMaintenance = handler(
  (request) => service.createMaintenance(inputFrom(request), callerFrom(request)),
  201,
);
const validateMaintenance = handler((request) =>
  service.validateMaintenance(
    request.params.maintenanceId,
    inputFrom(request),
    callerFrom(request),
  ),
);
const activateMaintenance = handler((request) =>
  service.activateMaintenance(
    request.params.maintenanceId,
    inputFrom(request),
    callerFrom(request),
  ),
);
const releaseMaintenance = handler((request) =>
  service.releaseMaintenance(request.params.maintenanceId, inputFrom(request), callerFrom(request)),
);
const cancelMaintenance = handler((request) =>
  service.cancelMaintenance(request.params.maintenanceId, inputFrom(request), callerFrom(request)),
);
const drainStatus = handler((request) =>
  service.drainStatus(inputFrom(request), callerFrom(request)),
);

const membershipHistory = handler((request) =>
  service.listMembershipHistory(
    inputFrom(request, { userId: request.params.userId }),
    callerFrom(request),
  ),
);
const provisionMembership = handler(
  (request) => service.provisionMembership(inputFrom(request), callerFrom(request)),
  201,
);
const membershipTransition = (targetState) =>
  handler((request) =>
    service.transitionMembership(
      request.params.userId,
      targetState,
      inputFrom(request),
      callerFrom(request),
    ),
  );
const serviceAccountHistory = handler((request) =>
  service.listServiceAccountHistory(
    inputFrom(request, { accountId: request.params.accountId }),
    callerFrom(request),
  ),
);
const createServiceAccount = handler(
  (request) => service.createServiceAccount(inputFrom(request), callerFrom(request)),
  201,
);
const serviceAccountTransition = (targetState) =>
  handler((request) =>
    service.transitionServiceAccount(
      request.params.accountId,
      targetState,
      inputFrom(request),
      callerFrom(request),
    ),
  );

const listAccessReviews = handler((request) =>
  service.listAccessReviews(inputFrom(request), callerFrom(request)),
);
const createAccessReview = handler(
  (request) => service.createAccessReview(inputFrom(request), callerFrom(request)),
  201,
);
const getAccessReview = handler((request) =>
  service.getAccessReview(request.params.campaignId, inputFrom(request), callerFrom(request)),
);
const activateAccessReview = handler((request) =>
  service.activateAccessReview(request.params.campaignId, inputFrom(request), callerFrom(request)),
);
const decideAccessReviewItem = handler((request) =>
  service.decideAccessReviewItem(
    request.params.reviewItemId,
    inputFrom(request),
    callerFrom(request),
  ),
);
const remediateAccessReviewItem = handler((request) =>
  service.remediateAccessReviewItem(
    request.params.reviewItemId,
    inputFrom(request),
    callerFrom(request),
  ),
);
const closeAccessReview = handler((request) =>
  service.closeAccessReview(request.params.campaignId, inputFrom(request), callerFrom(request)),
);

const listConfigurations = handler((request) =>
  service.listConfigurations(inputFrom(request), callerFrom(request)),
);
const createConfiguration = handler(
  (request) => service.createConfiguration(inputFrom(request), callerFrom(request)),
  201,
);
const validateConfiguration = handler((request) =>
  service.validateConfiguration(
    request.params.configurationId,
    request.params.version,
    inputFrom(request),
    callerFrom(request),
  ),
);
const activateConfiguration = handler((request) =>
  service.activateConfiguration(
    request.params.configurationId,
    request.params.version,
    inputFrom(request),
    callerFrom(request),
  ),
);
const rollbackConfiguration = handler((request) =>
  service.rollbackConfiguration(
    request.params.configurationId,
    request.params.version,
    inputFrom(request),
    callerFrom(request),
  ),
);

const listIncidents = handler((request) =>
  service.listIncidents(inputFrom(request), callerFrom(request)),
);
const createIncident = handler(
  (request) => service.createIncident(inputFrom(request), callerFrom(request)),
  201,
);
const getIncident = handler((request) =>
  service.getIncident(request.params.incidentId, inputFrom(request), callerFrom(request)),
);
const updateIncident = handler((request) =>
  service.updateIncident(
    request.params.incidentId,
    request.params.action,
    inputFrom(request),
    callerFrom(request),
  ),
);
const respondToIncident = handler((request) =>
  service.respondToIncident(request.params.incidentId, inputFrom(request), callerFrom(request)),
);

const listSecurityEvents = handler((request) =>
  service.listSecurityEvents(inputFrom(request), callerFrom(request)),
);
const manageSecurityEvent = handler((request) =>
  service.manageSecurityEvent(
    request.params.securityEventId,
    inputFrom(request),
    callerFrom(request),
  ),
);
const listNotifications = handler((request) =>
  service.listAdministrativeNotifications(inputFrom(request), callerFrom(request)),
);
const markNotificationRead = handler((request) =>
  service.markNotificationRead(
    request.params.notificationId,
    inputFrom(request),
    callerFrom(request),
  ),
);

const listTenantExports = handler((request) =>
  service.listTenantExports(inputFrom(request), callerFrom(request)),
);
const createTenantExport = handler(
  (request) => service.createTenantExport(inputFrom(request), callerFrom(request)),
  202,
);
const getTenantExport = handler((request) =>
  service.getTenantExport(request.params.tenantExportId, inputFrom(request), callerFrom(request)),
);
const cancelTenantExport = handler((request) =>
  service.cancelTenantExport(
    request.params.tenantExportId,
    inputFrom(request),
    callerFrom(request),
  ),
);
const issueTenantExportDownload = handler((request) =>
  service.issueTenantExportDownload(
    request.params.tenantExportId,
    inputFrom(request),
    callerFrom(request),
  ),
);
const downloadTenantExport = async (request, response, next) => {
  try {
    const file = await service.readTenantExportFile(
      request.params.tenantExportId,
      request.query.token,
      inputFrom(request),
      callerFrom(request),
    );
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    response.send(file.data);
  } catch (error) {
    next(error);
  }
};

const deletionPreview = handler((request) =>
  service.tenantDeletionPreview(inputFrom(request), callerFrom(request)),
);
const requestDeletion = handler(
  (request) => service.requestTenantDeletion(inputFrom(request), callerFrom(request)),
  202,
);
const approveDeletion = handler((request) =>
  service.approveTenantDeletion(
    request.params.deletionJobId,
    inputFrom(request),
    callerFrom(request),
  ),
);
const executeDeletion = handler(
  (request) =>
    service.executeTenantDeletion(
      request.params.deletionJobId,
      inputFrom(request),
      callerFrom(request),
    ),
  202,
);
const getDeletion = handler((request) =>
  service.getTenantDeletion(request.params.deletionJobId, inputFrom(request), callerFrom(request)),
);

const listRecoveries = handler((request) =>
  service.listRecoveries(inputFrom(request), callerFrom(request)),
);
const manageRecovery = handler((request) =>
  service.manageRecovery(request.params.recoveryId, inputFrom(request), callerFrom(request)),
);
const listDrStatus = handler((request) =>
  service.listDisasterRecoveryStatus(inputFrom(request), callerFrom(request)),
);
const updateDrStatus = handler((request) =>
  service.updateDisasterRecoveryStatus(inputFrom(request), callerFrom(request)),
);
const dashboard = handler((request) =>
  service.operationsDashboard(inputFrom(request), callerFrom(request)),
);

module.exports = {
  activateAccessReview,
  activateConfiguration,
  activateMaintenance,
  approveDeletion,
  cancelMaintenance,
  cancelTenantExport,
  closeAccessReview,
  controlledResume,
  createServiceAccount,
  createAccessReview,
  createConfiguration,
  createIncident,
  createMaintenance,
  createTenantExport,
  dashboard,
  decideAccessReviewItem,
  deletionPreview,
  downloadTenantExport,
  drainStatus,
  executeDeletion,
  getAccessReview,
  getConfiguration: listConfigurations,
  getDeletion,
  getIncident,
  getLifecycle,
  getTenantExport,
  issueTenantExportDownload,
  listAccessReviews,
  listConfigurations,
  listDrStatus,
  listIncidents,
  listMaintenance,
  listNotifications,
  listRecoveries,
  listSecurityEvents,
  listTenantExports,
  manageRecovery,
  manageSecurityEvent,
  markNotificationRead,
  membershipHistory,
  membershipTransition,
  organizationTransition,
  provisionMembership,
  releaseMaintenance,
  remediateAccessReviewItem,
  requestDeletion,
  respondToIncident,
  rollbackConfiguration,
  serviceAccountHistory,
  serviceAccountTransition,
  updateDrStatus,
  updateIncident,
  validateConfiguration,
  validateMaintenance,
  workspaceTransition,
};
