const express = require('express');
const controller = require('../controllers/stagingPilotController');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');

const stagingPilotRouter = express.Router();
stagingPilotRouter.use(authenticatePartner);

function protect(method, route, permission, resourceType, handler) {
  stagingPilotRouter[method](route, requiresPermission(permission, { resourceType }), handler);
}

protect('post', '/staging-deployments', 'stagingDeployment.create', 'StagingDeployment', controller.createStagingDeployment);
protect('get', '/staging-deployments', 'stagingDeployment.read', 'StagingDeployment', controller.listStagingDeployments);
protect('get', '/staging-deployments/:deploymentId', 'stagingDeployment.readDetails', 'StagingDeployment', controller.getStagingDeployment);
for (const [path, permission, handler] of [
  ['validate', 'stagingDeployment.validate', controller.stagingValidate],
  ['approve', 'stagingDeployment.approve', controller.stagingApprove],
  ['record-external-deployment', 'stagingDeployment.recordExternal', controller.stagingRecordExternal],
  ['verify', 'stagingDeployment.verify', controller.stagingVerify],
  ['rollback', 'stagingDeployment.rollback', controller.stagingRollback],
  ['archive', 'stagingDeployment.archive', controller.stagingArchive],
]) protect('post', `/staging-deployments/:deploymentId/${path}`, permission, 'StagingDeployment', handler);

protect('post', '/smoke-test-plans', 'stagingSmokeTest.create', 'StagingSmokeTestPlan', controller.createSmokePlan);
protect('get', '/smoke-test-plans', 'stagingSmokeTest.read', 'StagingSmokeTestPlan', controller.listSmokePlans);
protect('get', '/smoke-test-plans/:planId', 'stagingSmokeTest.read', 'StagingSmokeTestPlan', controller.getSmokePlan);
protect('patch', '/smoke-test-plans/:planId', 'stagingSmokeTest.update', 'StagingSmokeTestPlan', controller.smokePlanUpdate);
for (const [path, permission, handler] of [
  ['validate', 'stagingSmokeTest.validate', controller.smokePlanValidate],
  ['activate', 'stagingSmokeTest.activate', controller.smokePlanActivate],
  ['archive', 'stagingSmokeTest.update', controller.smokePlanArchive],
]) protect('post', `/smoke-test-plans/:planId/${path}`, permission, 'StagingSmokeTestPlan', handler);
protect('post', '/smoke-test-runs', 'stagingSmokeTest.create', 'StagingSmokeTestRun', controller.createSmokeRun);
protect('get', '/smoke-test-runs', 'stagingSmokeTest.read', 'StagingSmokeTestRun', controller.listSmokeRuns);
protect('get', '/smoke-test-runs/:runId', 'stagingSmokeTest.read', 'StagingSmokeTestRun', controller.getSmokeRun);
protect('post', '/smoke-test-runs/:runId/execute', 'stagingSmokeTest.execute', 'StagingSmokeTestRun', controller.smokeRunExecute);
protect('post', '/smoke-test-runs/:runId/abort', 'stagingSmokeTest.abort', 'StagingSmokeTestRun', controller.smokeRunAbort);
protect('post', '/smoke-test-runs/:runId/cleanup', 'stagingSmokeTest.cleanup', 'StagingSmokeTestRun', controller.smokeRunCleanup);

protect('get', '/capability-gates', 'capabilityLaunchGate.read', 'CapabilityLaunchGate', controller.listCapabilityGates);
protect('get', '/capability-gates/:capabilityKey', 'capabilityLaunchGate.read', 'CapabilityLaunchGate', controller.getCapabilityGate);
protect('post', '/capability-gates/:capabilityKey/evaluate', 'capabilityLaunchGate.evaluate', 'CapabilityLaunchGate', controller.capabilityGateEvaluate);
protect('post', '/capability-gates/:capabilityKey/waive', 'capabilityLaunchGate.waive', 'CapabilityLaunchGate', controller.capabilityGateWaive);
protect('post', '/capability-gates/:capabilityKey/disable', 'capabilityLaunchGate.disable', 'CapabilityLaunchGate', controller.capabilityGateDisable);

protect('post', '/pilot-programs', 'pilotProgram.create', 'PilotProgram', controller.createPilotProgram);
protect('get', '/pilot-programs', 'pilotProgram.read', 'PilotProgram', controller.listPilotPrograms);
protect('get', '/pilot-programs/:programId', 'pilotProgram.read', 'PilotProgram', controller.getPilotProgram);
protect('patch', '/pilot-programs/:programId', 'pilotProgram.update', 'PilotProgram', controller.pilotProgramUpdate);
for (const [path, permission, handler] of [
  ['validate', 'pilotProgram.validate', controller.pilotProgramValidate],
  ['approve', 'pilotProgram.approve', controller.pilotProgramApprove],
  ['start', 'pilotProgram.start', controller.pilotProgramStart],
  ['pause', 'pilotProgram.pause', controller.pilotProgramPause],
  ['resume', 'pilotProgram.resume', controller.pilotProgramResume],
  ['complete', 'pilotProgram.complete', controller.pilotProgramComplete],
  ['cancel', 'pilotProgram.cancel', controller.pilotProgramCancel],
]) protect('post', `/pilot-programs/:programId/${path}`, permission, 'PilotProgram', handler);

protect('post', '/pilot-policies', 'pilotPolicy.create', 'PilotPolicy', controller.createPilotPolicy);
protect('get', '/pilot-policies', 'pilotPolicy.read', 'PilotPolicy', controller.listPilotPolicies);
protect('get', '/pilot-policies/:policyId', 'pilotPolicy.read', 'PilotPolicy', controller.getPilotPolicy);
protect('patch', '/pilot-policies/:policyId', 'pilotPolicy.update', 'PilotPolicy', controller.pilotPolicyUpdate);
for (const [path, permission, handler] of [
  ['validate', 'pilotPolicy.validate', controller.pilotPolicyValidate],
  ['activate', 'pilotPolicy.activate', controller.pilotPolicyActivate],
  ['archive', 'pilotPolicy.archive', controller.pilotPolicyArchive],
]) protect('post', `/pilot-policies/:policyId/${path}`, permission, 'PilotPolicy', handler);

protect('post', '/pilot-programs/:programId/organizations', 'pilotEnrollment.create', 'PilotTenantEnrollment', controller.enrollOrganization);
protect('get', '/pilot-programs/:programId/organizations', 'pilotEnrollment.read', 'PilotTenantEnrollment', controller.listOrganizations);
protect('get', '/pilot-programs/:programId/organizations/:organizationId', 'pilotEnrollment.read', 'PilotTenantEnrollment', controller.getOrganization);
for (const [path, permission, handler] of [
  ['approve', 'pilotEnrollment.approve', controller.organizationApprove],
  ['activate', 'pilotEnrollment.activate', controller.organizationActivate],
  ['pause', 'pilotEnrollment.pause', controller.organizationPause],
  ['resume', 'pilotEnrollment.resume', controller.organizationResume],
  ['withdraw', 'pilotEnrollment.withdraw', controller.organizationWithdraw],
  ['graduate', 'pilotEnrollment.graduate', controller.organizationGraduate],
]) protect('post', `/pilot-programs/:programId/organizations/:organizationId/${path}`, permission, 'PilotTenantEnrollment', handler);
protect('post', '/pilot-programs/:programId/workspaces', 'pilotEnrollment.create', 'PilotWorkspaceEnrollment', controller.enrollWorkspace);
protect('get', '/pilot-programs/:programId/workspaces', 'pilotEnrollment.read', 'PilotWorkspaceEnrollment', controller.listWorkspaces);
protect('post', '/pilot-programs/:programId/users', 'pilotEnrollment.create', 'PilotUserMembership', controller.enrollUser);
protect('get', '/pilot-programs/:programId/users', 'pilotEnrollment.read', 'PilotUserMembership', controller.listUsers);

protect('get', '/onboarding/checklists', 'pilotOnboarding.read', 'PilotOnboardingChecklist', controller.listOnboardingChecklists);
protect('post', '/onboarding/runs', 'pilotOnboarding.manage', 'PilotOnboardingRun', controller.createOnboardingRun);
protect('get', '/onboarding/runs/:runId', 'pilotOnboarding.read', 'PilotOnboardingRun', controller.getOnboardingRun);
protect('post', '/onboarding/runs/:runId/complete-item', 'pilotOnboarding.manage', 'PilotOnboardingRun', controller.onboardingCompleteItem);
protect('post', '/onboarding/runs/:runId/approve', 'pilotOnboarding.approve', 'PilotOnboardingRun', controller.onboardingApprove);

protect('get', '/pilot-programs/:programId/health', 'pilotObservation.read', 'PilotObservationWindow', controller.pilotHealth);
protect('get', '/pilot-programs/:programId/observation-windows', 'pilotObservation.read', 'PilotObservationWindow', controller.listObservations);
protect('post', '/pilot-programs/:programId/observation-windows', 'pilotObservation.create', 'PilotObservationWindow', controller.createObservation);
protect('get', '/pilot-programs/:programId/readiness', 'pilotReadiness.read', 'PilotLaunchBlocker', controller.pilotReadiness);
protect('post', '/pilot-programs/:programId/readiness/evaluate', 'pilotReadiness.evaluate', 'PilotLaunchBlocker', controller.pilotReadiness);
protect('get', '/pilot-programs/:programId/blockers', 'pilotReadiness.read', 'PilotLaunchBlocker', controller.listBlockers);
protect('post', '/pilot-programs/:programId/decisions', 'pilotLaunchDecision.create', 'PilotLaunchDecision', controller.createLaunchDecision);
protect('get', '/pilot-programs/:programId/evidence', 'pilotEvidence.export', 'PilotEvidencePackage', controller.pilotEvidence);

protect('post', '/feedback', 'pilotFeedback.create', 'PilotFeedback', controller.submitFeedback);
protect('get', '/feedback', 'pilotFeedback.read', 'PilotFeedback', controller.listFeedback);
protect('get', '/feedback/:feedbackId', 'pilotFeedback.read', 'PilotFeedback', controller.getFeedback);
protect('post', '/feedback/:feedbackId/triage', 'pilotFeedback.triage', 'PilotFeedback', controller.feedbackTriage);
protect('post', '/feedback/:feedbackId/resolve', 'pilotFeedback.resolve', 'PilotFeedback', controller.feedbackResolve);
protect('post', '/support-cases', 'pilotSupportCase.create', 'PilotSupportCase', controller.createSupportCase);
protect('get', '/support-cases', 'pilotSupportCase.read', 'PilotSupportCase', controller.listSupportCases);
protect('get', '/support-cases/:caseId', 'pilotSupportCase.read', 'PilotSupportCase', controller.getSupportCase);
protect('post', '/support-cases/:caseId/acknowledge', 'pilotSupportCase.acknowledge', 'PilotSupportCase', controller.supportAcknowledge);
protect('post', '/support-cases/:caseId/escalate', 'pilotSupportCase.escalate', 'PilotSupportCase', controller.supportEscalate);
protect('post', '/support-cases/:caseId/resolve', 'pilotSupportCase.resolve', 'PilotSupportCase', controller.supportResolve);

protect('post', '/kill-switches/:switchKey/activate', 'pilotKillSwitch.activate', 'PilotKillSwitch', controller.killSwitchActivate);
protect('post', '/kill-switches/:switchKey/deactivate', 'pilotKillSwitch.deactivate', 'PilotKillSwitch', controller.killSwitchDeactivate);
protect('get', '/operational-reviews', 'pilotOperationalReview.read', 'PilotOperationalReview', controller.listOperationalReviews);
protect('post', '/operational-reviews', 'pilotOperationalReview.create', 'PilotOperationalReview', controller.createOperationalReview);
protect('get', '/communications', 'pilotCommunication.read', 'PilotCommunication', controller.communicationList);
protect('post', '/communications', 'pilotCommunication.create', 'PilotCommunication', controller.communicationCreate);
protect('post', '/communications/:communicationId/record-delivery', 'pilotCommunication.recordDelivery', 'PilotCommunication', controller.communicationDelivery);

module.exports = { stagingPilotRouter };
