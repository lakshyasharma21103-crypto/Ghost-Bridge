const launch = require('../services/stagingPilot.service');

function caller(request) {
  return {
    partner: request.partner,
    requestId: request.requestId,
    traceId: request.traceId,
    observer: request.observer,
    authorization: request.authorization,
    platformAuthorized: request.platformAuthorized === true,
  };
}

function input(request, extra = {}) {
  return {
    ...(request.query || {}),
    ...(request.body || {}),
    ...extra,
    idempotencyKey: request.get('Idempotency-Key') || request.body?.idempotencyKey,
  };
}

function handler(operation, status = 200) {
  return async (request, response, next) => {
    try {
      response.status(status).json({ success: true, data: await operation(request) });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  capabilityGateDisable: handler((r) => launch.capabilityGateAction(r.params.capabilityKey, 'disable', input(r), caller(r))),
  capabilityGateEvaluate: handler((r) => launch.capabilityGateAction(r.params.capabilityKey, 'evaluate', input(r), caller(r))),
  capabilityGateWaive: handler((r) => launch.capabilityGateAction(r.params.capabilityKey, 'waive', input(r), caller(r))),
  communicationCreate: handler((r) => launch.createCommunication(input(r), caller(r)), 201),
  communicationDelivery: handler((r) => launch.recordCommunicationDelivery(r.params.communicationId, input(r), caller(r))),
  communicationList: handler((r) => launch.listCommunications(input(r), caller(r))),
  createLaunchDecision: handler((r) => launch.createLaunchDecision(r.params.programId, input(r), caller(r)), 201),
  createObservation: handler((r) => launch.createObservation(r.params.programId, input(r), caller(r)), 201),
  createOnboardingRun: handler((r) => launch.createOnboardingRun(input(r), caller(r)), 201),
  createOperationalReview: handler((r) => launch.createOperationalReview(input(r), caller(r)), 201),
  createPilotPolicy: handler((r) => launch.createPilotPolicy(input(r), caller(r)), 201),
  createPilotProgram: handler((r) => launch.createPilotProgram(input(r), caller(r)), 201),
  createSmokePlan: handler((r) => launch.createSmokePlan(input(r), caller(r)), 201),
  createSmokeRun: handler((r) => launch.createSmokeRun(input(r), caller(r)), 201),
  createStagingDeployment: handler((r) => launch.createStagingDeployment(input(r), caller(r)), 201),
  createSupportCase: handler((r) => launch.createSupportCase(input(r), caller(r)), 201),
  enrollOrganization: handler((r) => launch.enrollOrganization(r.params.programId, input(r), caller(r)), 201),
  enrollUser: handler((r) => launch.enrollUser(r.params.programId, input(r), caller(r)), 201),
  enrollWorkspace: handler((r) => launch.enrollWorkspace(r.params.programId, input(r), caller(r)), 201),
  feedbackResolve: handler((r) => launch.feedbackAction(r.params.feedbackId, 'resolve', input(r), caller(r))),
  feedbackTriage: handler((r) => launch.feedbackAction(r.params.feedbackId, 'triage', input(r), caller(r))),
  getCapabilityGate: handler((r) => launch.getCapabilityGate(r.params.capabilityKey, input(r), caller(r))),
  getFeedback: handler((r) => launch.getFeedback(r.params.feedbackId, input(r), caller(r))),
  getOnboardingRun: handler((r) => launch.getOnboardingRun(r.params.runId, input(r), caller(r))),
  getOrganization: handler((r) => launch.getOrganization(r.params.programId, r.params.organizationId, input(r), caller(r))),
  getPilotPolicy: handler((r) => launch.getPilotPolicy(r.params.policyId, input(r), caller(r))),
  getPilotProgram: handler((r) => launch.getPilotProgram(r.params.programId, input(r), caller(r))),
  getSmokePlan: handler((r) => launch.getSmokePlan(r.params.planId, input(r), caller(r))),
  getSmokeRun: handler((r) => launch.getSmokeRun(r.params.runId, input(r), caller(r))),
  getStagingDeployment: handler((r) => launch.getStagingDeployment(r.params.deploymentId, input(r), caller(r))),
  getSupportCase: handler((r) => launch.getSupportCase(r.params.caseId, input(r), caller(r))),
  killSwitchActivate: handler((r) => launch.killSwitchAction(r.params.switchKey, 'activate', input(r), caller(r))),
  killSwitchDeactivate: handler((r) => launch.killSwitchAction(r.params.switchKey, 'deactivate', input(r), caller(r))),
  listBlockers: handler((r) => launch.listBlockers(r.params.programId, input(r), caller(r))),
  listCapabilityGates: handler((r) => launch.listCapabilityGates(input(r), caller(r))),
  listFeedback: handler((r) => launch.listFeedback(input(r), caller(r))),
  listOnboardingChecklists: handler((r) => launch.listOnboardingChecklists(input(r), caller(r))),
  listObservations: handler((r) => launch.listObservations(r.params.programId, input(r), caller(r))),
  listOperationalReviews: handler((r) => launch.listOperationalReviews(input(r), caller(r))),
  listOrganizations: handler((r) => launch.listOrganizations(r.params.programId, input(r), caller(r))),
  listPilotPolicies: handler((r) => launch.listPilotPolicies(input(r), caller(r))),
  listPilotPrograms: handler((r) => launch.listPilotPrograms(input(r), caller(r))),
  listSmokePlans: handler((r) => launch.listSmokePlans(input(r), caller(r))),
  listSmokeRuns: handler((r) => launch.listSmokeRuns(input(r), caller(r))),
  listStagingDeployments: handler((r) => launch.listStagingDeployments(input(r), caller(r))),
  listSupportCases: handler((r) => launch.listSupportCases(input(r), caller(r))),
  listUsers: handler((r) => launch.listUsers(r.params.programId, input(r), caller(r))),
  listWorkspaces: handler((r) => launch.listWorkspaces(r.params.programId, input(r), caller(r))),
  onboardingApprove: handler((r) => launch.onboardingAction(r.params.runId, 'approve', input(r), caller(r))),
  onboardingCompleteItem: handler((r) => launch.onboardingAction(r.params.runId, 'completeItem', input(r), caller(r))),
  organizationActivate: handler((r) => launch.organizationAction(r.params.programId, r.params.organizationId, 'activate', input(r), caller(r))),
  organizationApprove: handler((r) => launch.organizationAction(r.params.programId, r.params.organizationId, 'approve', input(r), caller(r))),
  organizationGraduate: handler((r) => launch.organizationAction(r.params.programId, r.params.organizationId, 'graduate', input(r), caller(r))),
  organizationPause: handler((r) => launch.organizationAction(r.params.programId, r.params.organizationId, 'pause', input(r), caller(r))),
  organizationResume: handler((r) => launch.organizationAction(r.params.programId, r.params.organizationId, 'resume', input(r), caller(r))),
  organizationWithdraw: handler((r) => launch.organizationAction(r.params.programId, r.params.organizationId, 'withdraw', input(r), caller(r))),
  pilotEvidence: handler((r) => launch.getPilotEvidence(r.params.programId, input(r), caller(r))),
  pilotHealth: handler((r) => launch.pilotHealth(r.params.programId, input(r), caller(r))),
  pilotPolicyActivate: handler((r) => launch.pilotPolicyAction(r.params.policyId, 'activate', input(r), caller(r))),
  pilotPolicyArchive: handler((r) => launch.pilotPolicyAction(r.params.policyId, 'archive', input(r), caller(r))),
  pilotPolicyUpdate: handler((r) => launch.pilotPolicyAction(r.params.policyId, 'update', input(r), caller(r))),
  pilotPolicyValidate: handler((r) => launch.pilotPolicyAction(r.params.policyId, 'validate', input(r), caller(r))),
  pilotProgramApprove: handler((r) => launch.pilotProgramAction(r.params.programId, 'approve', input(r), caller(r))),
  pilotProgramCancel: handler((r) => launch.pilotProgramAction(r.params.programId, 'cancel', input(r), caller(r))),
  pilotProgramComplete: handler((r) => launch.pilotProgramAction(r.params.programId, 'complete', input(r), caller(r))),
  pilotProgramPause: handler((r) => launch.pilotProgramAction(r.params.programId, 'pause', input(r), caller(r))),
  pilotProgramResume: handler((r) => launch.pilotProgramAction(r.params.programId, 'resume', input(r), caller(r))),
  pilotProgramStart: handler((r) => launch.pilotProgramAction(r.params.programId, 'start', input(r), caller(r))),
  pilotProgramUpdate: handler((r) => launch.pilotProgramAction(r.params.programId, 'update', input(r), caller(r))),
  pilotProgramValidate: handler((r) => launch.pilotProgramAction(r.params.programId, 'validate', input(r), caller(r))),
  pilotReadiness: handler((r) => launch.pilotReadiness(r.params.programId, input(r), caller(r))),
  smokePlanActivate: handler((r) => launch.smokePlanAction(r.params.planId, 'activate', input(r), caller(r))),
  smokePlanArchive: handler((r) => launch.smokePlanAction(r.params.planId, 'archive', input(r), caller(r))),
  smokePlanUpdate: handler((r) => launch.smokePlanAction(r.params.planId, 'update', input(r), caller(r))),
  smokePlanValidate: handler((r) => launch.smokePlanAction(r.params.planId, 'validate', input(r), caller(r))),
  smokeRunAbort: handler((r) => launch.smokeRunAction(r.params.runId, 'abort', input(r), caller(r))),
  smokeRunCleanup: handler((r) => launch.smokeRunAction(r.params.runId, 'cleanup', input(r), caller(r))),
  smokeRunExecute: handler((r) => launch.smokeRunAction(r.params.runId, 'execute', input(r), caller(r))),
  stagingArchive: handler((r) => launch.stagingDeploymentAction(r.params.deploymentId, 'archive', input(r), caller(r))),
  stagingApprove: handler((r) => launch.stagingDeploymentAction(r.params.deploymentId, 'approve', input(r), caller(r))),
  stagingRecordExternal: handler((r) => launch.stagingDeploymentAction(r.params.deploymentId, 'recordExternal', input(r), caller(r))),
  stagingRollback: handler((r) => launch.stagingDeploymentAction(r.params.deploymentId, 'rollback', input(r), caller(r))),
  stagingValidate: handler((r) => launch.stagingDeploymentAction(r.params.deploymentId, 'validate', input(r), caller(r))),
  stagingVerify: handler((r) => launch.stagingDeploymentAction(r.params.deploymentId, 'verify', input(r), caller(r))),
  submitFeedback: handler((r) => launch.submitFeedback(input(r), caller(r)), 201),
  supportAcknowledge: handler((r) => launch.supportCaseAction(r.params.caseId, 'acknowledge', input(r), caller(r))),
  supportEscalate: handler((r) => launch.supportCaseAction(r.params.caseId, 'escalate', input(r), caller(r))),
  supportResolve: handler((r) => launch.supportCaseAction(r.params.caseId, 'resolve', input(r), caller(r))),
};
