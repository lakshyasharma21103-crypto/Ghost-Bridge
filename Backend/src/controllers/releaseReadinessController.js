const releases = require('../services/releaseReadiness.service');

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
    idempotencyKey:
      request.get('Idempotency-Key') || request.body?.idempotencyKey,
  };
}

function handler(operation, statusCode = 200) {
  return async (request, response, next) => {
    try {
      response.status(statusCode).json({
        success: true,
        data: await operation(request),
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  activateRolloutPolicy: handler((request) =>
    releases.activateRolloutPolicy(request.params.policyId, input(request), caller(request))),
  approveCandidate: handler((request) =>
    releases.approveCandidate(request.params.candidateId, input(request), caller(request))),
  archiveCandidate: handler((request) =>
    releases.archiveCandidate(request.params.candidateId, input(request), caller(request))),
  archiveRolloutPolicy: handler((request) =>
    releases.archiveRolloutPolicy(request.params.policyId, input(request), caller(request))),
  createCandidate: handler((request) => releases.createCandidate(input(request), caller(request)), 201),
  createFeatureFlag: handler((request) => releases.createFeatureFlag(input(request), caller(request)), 201),
  createFreeze: handler((request) => releases.createFreeze(input(request), caller(request)), 201),
  createRollout: handler((request) => releases.createRollout(input(request), caller(request)), 201),
  createRolloutPolicy: handler((request) => releases.createRolloutPolicy(input(request), caller(request)), 201),
  createSupportBundle: handler((request) => releases.createSupportBundle(input(request), caller(request)), 201),
  createWaiver: handler((request) => releases.createWaiver(input(request), caller(request)), 201),
  evaluatePreflight: handler((request) => releases.evaluateReadiness(input(request), caller(request))),
  featureFlagActivate: handler((request) =>
    releases.featureFlagAction(request.params.flagKey, 'activate', input(request), caller(request))),
  featureFlagArchive: handler((request) =>
    releases.featureFlagAction(request.params.flagKey, 'archive', input(request), caller(request))),
  featureFlagKillSwitch: handler((request) =>
    releases.featureFlagAction(request.params.flagKey, 'killSwitch', input(request), caller(request))),
  featureFlagUpdate: handler((request) =>
    releases.featureFlagAction(request.params.flagKey, 'update', input(request), caller(request))),
  featureFlagValidate: handler((request) =>
    releases.featureFlagAction(request.params.flagKey, 'validate', input(request), caller(request))),
  getCandidate: handler((request) =>
    releases.getCandidate(request.params.candidateId, input(request), caller(request))),
  getCandidateEvidence: handler((request) =>
    releases.getCandidateEvidence(request.params.candidateId, input(request), caller(request))),
  getFeatureFlag: handler((request) =>
    releases.getFeatureFlag(request.params.flagKey, input(request), caller(request))),
  getMigration: handler((request) =>
    releases.getMigration(request.params.migrationId, input(request), caller(request))),
  getRollout: handler((request) =>
    releases.getRollout(request.params.rolloutId, input(request), caller(request))),
  getRolloutPolicy: handler((request) =>
    releases.getRolloutPolicy(request.params.policyId, input(request), caller(request))),
  getTarget: handler((request) =>
    releases.getTarget(request.params.targetId, input(request), caller(request))),
  getTargetDrift: handler((request) =>
    releases.getTargetDrift(request.params.targetId, input(request), caller(request))),
  listCandidates: handler((request) => releases.listCandidates(input(request), caller(request))),
  listFeatureFlags: handler((request) => releases.listFeatureFlags(input(request), caller(request))),
  listFreezes: handler((request) => releases.listFreezes(input(request), caller(request))),
  listManualGates: handler((request) => releases.listManualGates(input(request), caller(request))),
  listMigrations: handler((request) => releases.listMigrations(input(request), caller(request))),
  listOwnership: handler((request) => releases.listOwnership(input(request), caller(request))),
  listRolloutPolicies: handler((request) => releases.listRolloutPolicies(input(request), caller(request))),
  listRollouts: handler((request) => releases.listRollouts(input(request), caller(request))),
  listRunbooks: handler((request) => releases.listRunbooks(input(request), caller(request))),
  listTargets: handler((request) => releases.listTargets(input(request), caller(request))),
  listWaivers: handler((request) => releases.listWaivers(input(request), caller(request))),
  migrationExecute: handler((request) =>
    releases.migrationAction(request.params.migrationId, 'execute', input(request), caller(request)), 202),
  migrationPause: handler((request) =>
    releases.migrationAction(request.params.migrationId, 'pause', input(request), caller(request)), 202),
  migrationResume: handler((request) =>
    releases.migrationAction(request.params.migrationId, 'resume', input(request), caller(request)), 202),
  migrationValidate: handler((request) =>
    releases.migrationAction(request.params.migrationId, 'validate', input(request), caller(request))),
  readiness: handler((request) => releases.evaluateReadiness(input(request), caller(request))),
  recordManualGate: handler((request) => releases.recordManualGate(input(request), caller(request)), 201),
  rejectCandidate: handler((request) =>
    releases.rejectCandidate(request.params.candidateId, input(request), caller(request))),
  releaseHealth: handler((request) => releases.releaseHealth(input(request), caller(request))),
  rolloutAbort: handler((request) =>
    releases.rolloutAction(request.params.rolloutId, 'abort', input(request), caller(request)), 202),
  rolloutApprove: handler((request) =>
    releases.rolloutAction(request.params.rolloutId, 'approve', input(request), caller(request))),
  rolloutPause: handler((request) =>
    releases.rolloutAction(request.params.rolloutId, 'pause', input(request), caller(request)), 202),
  rolloutResume: handler((request) =>
    releases.rolloutAction(request.params.rolloutId, 'resume', input(request), caller(request)), 202),
  rolloutRollback: handler((request) =>
    releases.rolloutAction(request.params.rolloutId, 'rollback', input(request), caller(request)), 202),
  rolloutRollForward: handler((request) =>
    releases.rolloutAction(request.params.rolloutId, 'rollForward', input(request), caller(request)), 202),
  rolloutStart: handler((request) =>
    releases.rolloutAction(request.params.rolloutId, 'start', input(request), caller(request)), 202),
  rolloutValidate: handler((request) =>
    releases.rolloutAction(request.params.rolloutId, 'validate', input(request), caller(request))),
  rolloutVerify: handler((request) =>
    releases.rolloutAction(request.params.rolloutId, 'verify', input(request), caller(request))),
  updateRolloutPolicy: handler((request) =>
    releases.updateRolloutPolicy(request.params.policyId, input(request), caller(request))),
  validateCandidate: handler((request) =>
    releases.validateCandidate(request.params.candidateId, input(request), caller(request))),
  validateRolloutPolicy: handler((request) =>
    releases.validateRolloutPolicy(request.params.policyId, input(request), caller(request))),
};
