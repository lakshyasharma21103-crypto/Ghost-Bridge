const express = require('express');
const controller = require('../controllers/releaseReadinessController');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');

const releaseReadinessRouter = express.Router();
releaseReadinessRouter.use(authenticatePartner);

function protect(method, routePath, permission, resourceType, handler) {
  releaseReadinessRouter[method](
    routePath,
    requiresPermission(permission, { resourceType }),
    handler,
  );
}

protect('post', '/candidates', 'releaseCandidate.create', 'ReleaseCandidate', controller.createCandidate);
protect('get', '/candidates', 'releaseCandidate.read', 'ReleaseCandidate', controller.listCandidates);
protect('get', '/candidates/:candidateId', 'releaseCandidate.read', 'ReleaseCandidate', controller.getCandidate);
protect('post', '/candidates/:candidateId/validate', 'releaseCandidate.validate', 'ReleaseCandidate', controller.validateCandidate);
protect('post', '/candidates/:candidateId/approve', 'releaseCandidate.approve', 'ReleaseCandidate', controller.approveCandidate);
protect('post', '/candidates/:candidateId/reject', 'releaseCandidate.reject', 'ReleaseCandidate', controller.rejectCandidate);
protect('post', '/candidates/:candidateId/archive', 'releaseCandidate.archive', 'ReleaseCandidate', controller.archiveCandidate);
protect('get', '/candidates/:candidateId/evidence', 'releaseReadiness.exportEvidence', 'ReleaseEvidencePackage', controller.getCandidateEvidence);

protect('post', '/rollout-policies', 'releaseRolloutPolicy.create', 'ReleaseRolloutPolicy', controller.createRolloutPolicy);
protect('get', '/rollout-policies', 'releaseRolloutPolicy.read', 'ReleaseRolloutPolicy', controller.listRolloutPolicies);
protect('get', '/rollout-policies/:policyId', 'releaseRolloutPolicy.read', 'ReleaseRolloutPolicy', controller.getRolloutPolicy);
protect('patch', '/rollout-policies/:policyId', 'releaseRolloutPolicy.update', 'ReleaseRolloutPolicy', controller.updateRolloutPolicy);
protect('post', '/rollout-policies/:policyId/validate', 'releaseRolloutPolicy.validate', 'ReleaseRolloutPolicy', controller.validateRolloutPolicy);
protect('post', '/rollout-policies/:policyId/activate', 'releaseRolloutPolicy.activate', 'ReleaseRolloutPolicy', controller.activateRolloutPolicy);
protect('post', '/rollout-policies/:policyId/archive', 'releaseRolloutPolicy.archive', 'ReleaseRolloutPolicy', controller.archiveRolloutPolicy);

protect('post', '/rollouts', 'releaseRollout.create', 'ReleaseRolloutPlan', controller.createRollout);
protect('get', '/rollouts', 'releaseRollout.read', 'ReleaseRolloutPlan', controller.listRollouts);
protect('get', '/rollouts/:rolloutId', 'releaseRollout.read', 'ReleaseRolloutPlan', controller.getRollout);
for (const [path, permission, handler] of [
  ['validate', 'releaseRollout.validate', controller.rolloutValidate],
  ['approve', 'releaseRollout.approve', controller.rolloutApprove],
  ['start', 'releaseRollout.execute', controller.rolloutStart],
  ['pause', 'releaseRollout.pause', controller.rolloutPause],
  ['resume', 'releaseRollout.resume', controller.rolloutResume],
  ['abort', 'releaseRollout.abort', controller.rolloutAbort],
  ['rollback', 'releaseRollout.rollback', controller.rolloutRollback],
  ['roll-forward', 'releaseRollout.rollForward', controller.rolloutRollForward],
  ['verify', 'releaseRollout.verify', controller.rolloutVerify],
]) protect('post', `/rollouts/:rolloutId/${path}`, permission, 'ReleaseRolloutPlan', handler);

protect('get', '/preflight', 'releaseReadiness.read', 'ReleaseReadiness', controller.readiness);
protect('post', '/preflight/evaluate', 'releaseReadiness.readDetails', 'ReleaseReadiness', controller.evaluatePreflight);

protect('get', '/migrations', 'releaseMigration.read', 'ReleaseMigrationPlan', controller.listMigrations);
protect('get', '/migrations/:migrationId', 'releaseMigration.read', 'ReleaseMigrationPlan', controller.getMigration);
for (const [path, permission, handler] of [
  ['validate', 'releaseMigration.validate', controller.migrationValidate],
  ['execute', 'releaseMigration.execute', controller.migrationExecute],
  ['pause', 'releaseMigration.pause', controller.migrationPause],
  ['resume', 'releaseMigration.resume', controller.migrationResume],
]) protect('post', `/migrations/:migrationId/${path}`, permission, 'ReleaseMigrationPlan', handler);

protect('post', '/feature-flags', 'releaseFeatureFlag.create', 'ReleaseFeatureFlag', controller.createFeatureFlag);
protect('get', '/feature-flags', 'releaseFeatureFlag.read', 'ReleaseFeatureFlag', controller.listFeatureFlags);
protect('get', '/feature-flags/:flagKey', 'releaseFeatureFlag.read', 'ReleaseFeatureFlag', controller.getFeatureFlag);
protect('patch', '/feature-flags/:flagKey', 'releaseFeatureFlag.update', 'ReleaseFeatureFlag', controller.featureFlagUpdate);
for (const [path, permission, handler] of [
  ['validate', 'releaseFeatureFlag.validate', controller.featureFlagValidate],
  ['activate', 'releaseFeatureFlag.activate', controller.featureFlagActivate],
  ['archive', 'releaseFeatureFlag.archive', controller.featureFlagArchive],
  ['kill-switch', 'releaseFeatureFlag.killSwitch', controller.featureFlagKillSwitch],
]) protect('post', `/feature-flags/:flagKey/${path}`, permission, 'ReleaseFeatureFlag', handler);

protect('get', '/targets', 'releaseDeploymentTarget.read', 'DeploymentTarget', controller.listTargets);
protect('get', '/targets/:targetId', 'releaseDeploymentTarget.read', 'DeploymentTarget', controller.getTarget);
protect('get', '/targets/:targetId/drift', 'releaseDeploymentTarget.readDrift', 'DeploymentTarget', controller.getTargetDrift);
protect('get', '/readiness', 'releaseReadiness.read', 'ReleaseReadiness', controller.readiness);
protect('get', '/health', 'releaseReadiness.readDetails', 'ReleaseReadiness', controller.releaseHealth);
protect('get', '/runbooks', 'releaseRunbook.read', 'ReleaseRunbook', controller.listRunbooks);
protect('get', '/ownership', 'releaseOwnership.read', 'ReleaseOperationalOwnership', controller.listOwnership);
protect('get', '/manual-gates', 'releaseManualGate.read', 'ReleaseManualGate', controller.listManualGates);
protect('post', '/manual-gates', 'releaseManualGate.record', 'ReleaseManualGate', controller.recordManualGate);
protect('get', '/waivers', 'releaseWaiver.read', 'ReleaseWaiver', controller.listWaivers);
protect('post', '/waivers', 'releaseWaiver.create', 'ReleaseWaiver', controller.createWaiver);
protect('get', '/freezes', 'releaseFreeze.read', 'ReleaseFreeze', controller.listFreezes);
protect('post', '/freezes', 'releaseFreeze.create', 'ReleaseFreeze', controller.createFreeze);
protect('post', '/support-bundle', 'releaseSupportBundle.create', 'ReleaseSupportBundle', controller.createSupportBundle);

module.exports = { releaseReadinessRouter };
