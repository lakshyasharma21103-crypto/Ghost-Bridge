const crypto = require('node:crypto');
const path = require('node:path');
const {
  BuildProvenance,
  DeploymentTarget,
  ReleaseArtifactManifest,
  ReleaseCandidate,
  ReleaseCompatibilityMatrix,
  ReleaseEvidencePackage,
  ReleaseFeatureFlag,
  ReleaseFreeze,
  ReleaseManualGate,
  ReleaseMigrationCheckpoint,
  ReleaseMigrationPlan,
  ReleaseObservationWindow,
  ReleaseOperationalOwnership,
  ReleaseManifest,
  ReleaseRolloutPlan,
  ReleaseRolloutPolicy,
  ReleaseWaiver,
} = require('../models');
const { assertAuthorized, actorFromPartner } = require('./authorization.service');
const { assertOperationalAccess } = require('./operationalState.service');
const { consumeApprovalGrants, enforceApproval } = require('./approval.service');
const { createAuditLog } = require('./auditService');
const { secureDigest } = require('../utils/idempotency');
const { AppError } = require('../utils/AppError');
const core = require('./releaseReadinessCore.service');
const security = require('./releaseSecurity.service');
const metrics = require('./releaseReadinessMetrics.service');
const { PRODUCTION_CONFIGURATION_PROFILE } = require('../config/productionProfile');
const { RUNBOOK_MANIFEST } = require('../constants/releaseReadiness');

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
const IMMUTABLE_CANDIDATE_STATUSES = new Set(['approved', 'released']);
const CODE_MIGRATIONS = Object.freeze({
  'release-readiness-indexes-v1': {
    classification: 'additive_only',
    startupSafe: false,
    resumable: true,
  },
});

const CODE_DEPLOYMENT_TARGETS = Object.freeze([
  {
    targetId: 'local-simulation',
    displayName: 'Local release simulation',
    category: 'local',
    enabled: true,
    regionIds: ['local-primary'],
    serviceCategories: ['backend', 'frontend', 'external-agent', 'worker'],
    expectedInstanceCategories: ['simulated'],
    expectedWorkerPoolCategories: ['execution'],
    allowedReleaseStrategies: ['canary', 'rolling', 'regional_sequential'],
    requiresApproval: false,
    requiresManualExecution: false,
    allowsSmokeTests: true,
    allowsSyntheticTraffic: true,
    maximumSyntheticTrafficCategory: 'tiny',
    dataResidencyTags: ['synthetic-only'],
    safeProviderCategory: 'mock',
  },
  {
    targetId: 'staging-manual',
    displayName: 'Provider-neutral staging boundary',
    category: 'staging',
    enabled: true,
    regionIds: [],
    serviceCategories: ['backend', 'frontend', 'external-agent', 'worker'],
    expectedInstanceCategories: ['provider-managed'],
    expectedWorkerPoolCategories: ['provider-managed'],
    allowedReleaseStrategies: ['canary', 'rolling', 'manual'],
    requiresApproval: true,
    requiresManualExecution: true,
    allowsSmokeTests: true,
    allowsSyntheticTraffic: true,
    maximumSyntheticTrafficCategory: 'tiny',
    dataResidencyTags: [],
    safeProviderCategory: 'provider-boundary',
  },
  {
    targetId: 'production-manual',
    displayName: 'Provider-neutral production boundary',
    category: 'production',
    enabled: true,
    regionIds: [],
    serviceCategories: ['backend', 'frontend', 'external-agent', 'worker'],
    expectedInstanceCategories: ['provider-managed'],
    expectedWorkerPoolCategories: ['provider-managed'],
    allowedReleaseStrategies: ['canary', 'rolling', 'regional_sequential', 'manual'],
    requiresApproval: true,
    requiresManualExecution: true,
    allowsSmokeTests: false,
    allowsSyntheticTraffic: false,
    maximumSyntheticTrafficCategory: 'none',
    dataResidencyTags: [],
    safeProviderCategory: 'noop',
  },
]);

const CODE_OPERATIONAL_OWNERSHIP = Object.freeze([
  'application-availability',
  'database-incidents',
  'cache-incidents',
  'queue-backlog',
  'worker-failure',
  'runtime-gateway-failure',
  'provider-outage',
  'regional-outage',
  'failover',
  'backup-restore',
  'credential-leak',
  'release-rollback',
  'security-incident',
].map((operationalDomain) => Object.freeze({
  serviceCategory: 'ghost-bridge',
  operationalDomain,
  version: 1,
  primaryOwnerReference: 'operations-primary',
  secondaryOwnerReference: 'operations-secondary',
  escalationPolicyReference: 'incident-escalation-v1',
  runbookReference: operationalDomain,
  supportWindowCategory: 'continuous',
  status: 'active',
})));

function dependencies(overrides = {}) {
  return {
    BuildProvenance,
    DeploymentTarget,
    ReleaseArtifactManifest,
    ReleaseCandidate,
    ReleaseCompatibilityMatrix,
    ReleaseEvidencePackage,
    ReleaseFeatureFlag,
    ReleaseFreeze,
    ReleaseManualGate,
    ReleaseMigrationCheckpoint,
    ReleaseMigrationPlan,
    ReleaseObservationWindow,
    ReleaseOperationalOwnership,
    ReleaseManifest,
    ReleaseRolloutPlan,
    ReleaseRolloutPolicy,
    ReleaseWaiver,
    assertAuthorized,
    assertOperationalAccess,
    consumeApprovalGrants,
    createAuditLog,
    enforceApproval,
    ...overrides,
  };
}

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function plain(value) {
  if (!value) return value;
  const data = typeof value.toObject === 'function' ? value.toObject({ depopulate: true }) : { ...value };
  data.id = idOf(value);
  delete data._id;
  delete data.__v;
  delete data.idempotencyKeyHash;
  delete data.requestFingerprint;
  return data;
}

function scopeFrom(input = {}, caller = {}) {
  const organizationId = idOf(
    input.organizationId || caller.partner?.organizationId || caller.partner?._id,
  );
  if (!organizationId) throw new AppError(400, 'RELEASE_SCOPE_REQUIRED', 'Organization scope is required.');
  const requestedOrganization = idOf(input.organizationId);
  if (requestedOrganization && requestedOrganization !== organizationId) {
    throw new AppError(403, 'AUTHORIZATION_DENIED', 'Release data is not available.');
  }
  return {
    organizationId,
    workspaceId: idOf(input.workspaceId || input.receivingWorkspaceId) || undefined,
    actorId: idOf(caller.partner?._id || caller.authorization?.actorId || 'system'),
    actorType: caller.partner ? 'partner' : 'system',
    requestId: caller.requestId,
    traceId: caller.traceId,
  };
}

function tenantFilter(scope) {
  return {
    organizationId: scope.organizationId,
    ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
  };
}

async function authorize(permission, resourceType, resource, scope, caller, deps, context = {}) {
  if (caller.platformAuthorized === true) return;
  const actor = actorFromPartner(caller.partner, {
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    requestId: scope.requestId,
    traceId: scope.traceId,
  });
  await deps.assertAuthorized(
    actor,
    permission,
    {
      type: resourceType,
      id: idOf(resource) || resourceType,
      organizationId: scope.organizationId,
      workspaceId: resource?.workspaceId || scope.workspaceId,
    },
    {
      requestId: scope.requestId,
      traceId: scope.traceId,
      policyContext: {
        requestedAction: permission,
        releaseVersion: resource?.version || resource?.targetVersion,
        targetCategory: context.targetCategory,
        rolloutStrategy: resource?.strategy,
        migrationStrategy: resource?.migrationStrategy,
        riskCategory: resource?.riskSummary?.status,
        liveGateStatus: context.liveGateStatus,
        secretScanStatus: context.secretScanStatus,
        compatibilityStatus: context.compatibilityStatus,
      },
    },
  );
}

async function operational(scope, deps, operation = 'PRIVILEGED_CONFIGURATION') {
  return deps.assertOperationalAccess({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    operation,
  });
}

async function audit(action, type, record, scope, metadata = {}, deps) {
  return deps.createAuditLog(
    scope.actorType,
    scope.actorId,
    action,
    type,
    idOf(record),
    {
      organizationId: scope.organizationId,
      workspaceId: record?.workspaceId || scope.workspaceId,
      ...core.redactSafeExport(metadata),
    },
    { requestId: scope.requestId, traceId: scope.traceId },
  );
}

function mutationDigests(input, purpose, scopeKey) {
  if (!input.idempotencyKey) {
    throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required.');
  }
  return {
    idempotencyKeyHash: secureDigest(`${purpose}:key`, `${scopeKey}:${input.idempotencyKey}`),
    requestFingerprint: secureDigest(
      `${purpose}:request`,
      core.canonicalJson(
        Object.fromEntries(
          Object.entries(input).filter(
            ([key]) => !['idempotencyKey', 'approvalRequestId', 'approvalRequestIds'].includes(key),
          ),
        ),
      ),
    ),
  };
}

async function governedApproval(input, scope, permission, resourceType, record, operationType, deps) {
  const enforcement = await deps.enforceApproval({
    organizationId: scope.organizationId,
    workspaceId: record?.workspaceId || scope.workspaceId,
    requesterActorId: scope.actorId,
    requesterActorType: scope.actorType,
    permission,
    resourceType,
    resourceId: idOf(record),
    operationType,
    environment: process.env.NODE_ENV,
    safeRequestAttributes: {
      releaseVersion: record?.version || record?.targetVersion,
      sourceRevision: record?.sourceRevision,
      rolloutStrategy: record?.strategy,
      migrationStrategy: record?.migrationStrategy,
    },
    approvalRequestId: input.approvalRequestId,
    approvalRequestIds: input.approvalRequestIds,
  });
  return deps.consumeApprovalGrants(enforcement, {
    actorId: scope.actorId,
    actorType: scope.actorType,
    requestId: scope.requestId,
    traceId: scope.traceId,
  });
}

async function page(Model, filter, input = {}, sort = { createdAt: -1, _id: -1 }) {
  const limit = Math.min(100, Math.max(1, Number(input.limit || 50)));
  const items = await Model.find(filter).sort(sort).limit(limit).lean();
  return { items: items.map(plain), limit, nextCursor: items.length === limit ? idOf(items.at(-1)) : null };
}

async function scoped(Model, recordId, scope, code) {
  const record = await Model.findOne({ _id: recordId, ...tenantFilter(scope) });
  if (!record) throw new AppError(404, code, 'The requested release record was not found.');
  return record;
}

function candidatePayload(input, scope, digests) {
  const version = core.validateVersion(input.version || input.applicationVersion);
  const sourceRevision = core.validateSourceRevision(input.sourceRevision);
  return {
    releaseCandidateId: input.releaseCandidateId || `rc-${crypto.randomUUID()}`,
    ...tenantFilter(scope),
    name: String(input.name || `Release ${version}`).slice(0, 120),
    version,
    status: 'draft',
    sourceRevision,
    sourceBranchCategory: input.sourceBranchCategory || 'unknown',
    sourceRepositoryCategory: input.sourceRepositoryCategory || 'primary',
    applicationVersion: core.validateVersion(input.applicationVersion || version),
    backendVersion: core.validateVersion(input.backendVersion || version),
    frontendVersion: core.validateVersion(input.frontendVersion || version),
    externalAgentVersion: core.validateVersion(input.externalAgentVersion || version),
    protocolVersion: core.validateVersion(input.protocolVersion || '1'),
    schemaVersion: core.validateVersion(input.schemaVersion || '1'),
    migrationVersion: core.validateVersion(input.migrationVersion || '1'),
    routingVersion: core.validateVersion(input.routingVersion || '1'),
    cacheSerializationVersion: core.validateVersion(input.cacheSerializationVersion || '1'),
    projectionVersion: core.validateVersion(input.projectionVersion || '1'),
    requestedBy: scope.actorId,
    requestId: scope.requestId,
    traceId: scope.traceId,
    ...digests,
  };
}

async function createCandidate(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  await authorize('releaseCandidate.create', 'ReleaseCandidate', null, scope, caller, deps);
  await operational(scope, deps);
  const digests = mutationDigests(input, 'release-candidate-create', scope.organizationId);
  const replay = await deps.ReleaseCandidate.findOne({
    ...tenantFilter(scope),
    idempotencyKeyHash: digests.idempotencyKeyHash,
  }).select('+idempotencyKeyHash +requestFingerprint');
  if (replay) {
    if (replay.requestFingerprint !== digests.requestFingerprint) {
      throw new AppError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency-Key was used for another request.');
    }
    return plain(replay);
  }
  const record = await deps.ReleaseCandidate.create(candidatePayload(input, scope, digests));
  metrics.increment('release_candidate', { status: 'draft' });
  await audit('release.candidate.created', 'ReleaseCandidate', record, scope, {
    version: record.version,
    sourceRevision: record.sourceRevision,
  }, deps);
  return plain(record);
}

async function listCandidates(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  await authorize('releaseCandidate.read', 'ReleaseCandidate', null, scope, caller, deps);
  const filter = tenantFilter(scope);
  if (input.status) filter.status = String(input.status);
  return page(deps.ReleaseCandidate, filter, input);
}

async function getCandidate(candidateId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  const record = await scoped(deps.ReleaseCandidate, candidateId, scope, 'RELEASE_CANDIDATE_NOT_FOUND');
  await authorize('releaseCandidate.read', 'ReleaseCandidate', record, scope, caller, deps);
  return plain(record);
}

async function buildCandidateEvidence(record, input, deps) {
  const lockfile = core.validateLockfile(REPOSITORY_ROOT);
  const artifacts = [
    core.artifactDigest(REPOSITORY_ROOT, 'backend-source', ['Backend']),
    core.artifactDigest(REPOSITORY_ROOT, 'frontend-source', ['frontend']),
    core.artifactDigest(REPOSITORY_ROOT, 'external-agent-source', ['external-agent']),
    core.artifactDigest(REPOSITORY_ROOT, 'release-documentation', [
      'README.md',
      'OPERATIONS.md',
      'RELEASE_READINESS.md',
    ]),
  ];
  const aggregateDigest = core.digest(artifacts);
  const manifestData = core.createReleaseManifest({
    releaseCandidateId: record.releaseCandidateId,
    sourceRevision: record.sourceRevision,
    applicationVersion: record.applicationVersion,
    workspaceVersions: {
      backend: record.backendVersion,
      frontend: record.frontendVersion,
      externalAgent: record.externalAgentVersion,
    },
    protocolVersions: [record.protocolVersion],
    schemaVersion: record.schemaVersion,
    migrationVersion: record.migrationVersion,
    routingVersions: [record.routingVersion],
    cacheSerializationVersions: [record.cacheSerializationVersion],
    projectionVersions: [record.projectionVersion],
    requiredIndexes: input.requiredIndexes || [],
    migrationIds: input.requiredMigrationIds || [],
    expectedRuntimeServices: ['backend', 'external-agent'],
    expectedWorkerPools: ['execution', 'orchestration', 'recovery', 'projection'],
    expectedRegions: input.expectedRegions || [],
    buildArtifactDigests: artifacts.map((artifact) => artifact.sha256Digest),
    softwareBillOfMaterialsReference: `sbom-${record.releaseCandidateId}`,
    generatedAt: input.generatedAt || new Date(),
  });
  const manifest = await deps.ReleaseManifest.findOneAndUpdate(
    { releaseCandidateId: record.releaseCandidateId },
    { $setOnInsert: manifestData },
    { new: true, upsert: true, runValidators: true },
  );
  const provenanceData = core.createBuildProvenance({
    releaseCandidateId: record.releaseCandidateId,
    sourceRevision: record.sourceRevision,
    sourceTreeState: input.sourceTreeState || 'unknown',
    buildEnvironmentCategory: input.buildEnvironmentCategory || 'local',
    generatedByCategory: input.generatedByCategory || 'local_operator',
    runtimeVersion: process.versions.node,
    npmVersion: input.npmVersion || 'unknown',
    lockfileDigest: lockfile.digest,
    sourceManifestDigest: aggregateDigest,
    buildCommands: ['npm run build --workspace frontend'],
    testCommandNames: ['npm test', 'npm run verify:release-readiness'],
    artifactDigests: artifacts.map((artifact) => artifact.sha256Digest),
    buildStartedAt: input.buildStartedAt || new Date(0),
    buildCompletedAt: input.buildCompletedAt || new Date(0),
    generatedAt: input.generatedAt || new Date(),
  });
  const provenance = await deps.BuildProvenance.findOneAndUpdate(
    { releaseCandidateId: record.releaseCandidateId },
    { $setOnInsert: provenanceData },
    { new: true, upsert: true, runValidators: true },
  );
  const artifactManifest = await deps.ReleaseArtifactManifest.findOneAndUpdate(
    { releaseCandidateId: record.releaseCandidateId },
    {
      $setOnInsert: {
        releaseCandidateId: record.releaseCandidateId,
        manifestVersion: '1',
        artifacts,
        aggregateDigest,
        generatedAt: input.generatedAt || new Date(),
      },
    },
    { new: true, upsert: true, runValidators: true },
  );
  const compatibilityResult = core.evaluateCompatibility({
    backendProtocolVersion: record.protocolVersion,
    workerProtocolVersion: input.workerProtocolVersion || record.protocolVersion,
    externalAgentProtocolVersion: input.externalAgentProtocolVersion || record.protocolVersion,
    supportedDatabaseSchemaVersions: input.supportedDatabaseSchemaVersions || [record.schemaVersion],
    activeSchemaVersion: record.schemaVersion,
    supportedRoutingVersions: input.supportedRoutingVersions || [record.routingVersion],
    activeRoutingVersion: record.routingVersion,
    supportedCacheSerializationVersions:
      input.supportedCacheSerializationVersions || [record.cacheSerializationVersion],
    activeCacheSerializationVersion: record.cacheSerializationVersion,
    supportedProjectionVersions: input.supportedProjectionVersions || [record.projectionVersion],
    activeProjectionVersion: record.projectionVersion,
    rollForwardOnly: input.rollForwardOnly === true,
  });
  const compatibility = await deps.ReleaseCompatibilityMatrix.findOneAndUpdate(
    { releaseCandidateId: record.releaseCandidateId },
    {
      $setOnInsert: {
        releaseCandidateId: record.releaseCandidateId,
        matrixVersion: '1',
        backendProtocolVersion: record.protocolVersion,
        externalAgentProtocolVersion: input.externalAgentProtocolVersion || record.protocolVersion,
        frontendApiVersion: input.frontendApiVersion || '1',
        supportedDatabaseSchemaVersions: input.supportedDatabaseSchemaVersions || [record.schemaVersion],
        supportedMigrationVersions: [record.migrationVersion],
        supportedRoutingVersions: input.supportedRoutingVersions || [record.routingVersion],
        supportedQueueOwnershipVersions: input.supportedQueueOwnershipVersions || ['1'],
        supportedAuthorityEpochFormatVersions: input.supportedAuthorityEpochFormatVersions || ['1'],
        supportedCacheSerializationVersions:
          input.supportedCacheSerializationVersions || [record.cacheSerializationVersion],
        supportedProjectionVersions: input.supportedProjectionVersions || [record.projectionVersion],
        supportedPassportVersions: input.supportedPassportVersions || ['1'],
        supportedDataContractVersions: input.supportedDataContractVersions || ['1'],
        minimumCompatibleBackendVersion: input.minimumCompatibleBackendVersion || record.backendVersion,
        minimumCompatibleWorkerVersion: input.minimumCompatibleWorkerVersion || record.backendVersion,
        minimumCompatibleExternalAgentVersion:
          input.minimumCompatibleExternalAgentVersion || record.externalAgentVersion,
        ...compatibilityResult,
        generatedAt: input.generatedAt || new Date(),
      },
    },
    { new: true, upsert: true, runValidators: true },
  );
  const migrationEvaluation = core.validateMigrationPlan({
    requiredMigrationIds: input.requiredMigrationIds || [],
    operations: input.migrationOperations || [],
    migrationStrategy: input.migrationStrategy || 'none',
    rollbackStrategy: input.rollbackStrategy || 'safe',
    rollForwardOnly: input.rollForwardOnly === true,
    contractIncluded: input.contractIncluded === true,
  });
  const migration = await deps.ReleaseMigrationPlan.findOneAndUpdate(
    {
      releaseCandidateId: record.releaseCandidateId,
      migrationPlanVersion: input.migrationPlanVersion || '1',
    },
    {
      $setOnInsert: {
        releaseCandidateId: record.releaseCandidateId,
        ...tenantFilter({ organizationId: record.organizationId, workspaceId: record.workspaceId }),
        migrationPlanVersion: input.migrationPlanVersion || '1',
        requiredMigrationIds: input.requiredMigrationIds || [],
        requiredIndexChanges: input.requiredIndexChanges || [],
        requiredBackfills: input.requiredBackfills || [],
        requiredProjectionRebuilds: input.requiredProjectionRebuilds || [],
        migrationStrategy: input.migrationStrategy || 'none',
        rollbackStrategy: migrationEvaluation.rollbackStrategy,
        preflightChecks: ['compatibility', 'index-manifest', 'single-migration-lease'],
        postMigrationChecks: ['schema-version', 'index-drift', 'readiness'],
        rollbackChecks: ['schema-compatibility', 'routing-compatibility'],
        requiresApproval: (input.requiredMigrationIds || []).length > 0,
        status: migrationEvaluation.valid ? 'validated' : 'blocked',
        safeReasonCodes: migrationEvaluation.safeReasonCodes,
      },
    },
    { new: true, upsert: true, runValidators: true },
  );
  return { lockfile, artifacts, manifest, provenance, artifactManifest, compatibility, migration, compatibilityResult, migrationEvaluation };
}

async function validateCandidate(candidateId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  let record = await scoped(deps.ReleaseCandidate, candidateId, scope, 'RELEASE_CANDIDATE_NOT_FOUND');
  await authorize('releaseCandidate.validate', 'ReleaseCandidate', record, scope, caller, deps);
  await operational(scope, deps);
  if (IMMUTABLE_CANDIDATE_STATUSES.has(record.status)) return plain(record);
  record = await deps.ReleaseCandidate.findOneAndUpdate(
    { _id: record._id, status: { $nin: [...IMMUTABLE_CANDIDATE_STATUSES] } },
    { $set: { status: 'validating', validatedBy: scope.actorId } },
    { new: true },
  );
  await audit('release.candidate.validation_started', 'ReleaseCandidate', record, scope, {}, deps);
  const secretScan = security.scanTrackedFiles(REPOSITORY_ROOT);
  const examples = security.validateEnvironmentExamples(REPOSITORY_ROOT);
  const gitignore = security.validateGitignore(REPOSITORY_ROOT);
  const evidence = await buildCandidateEvidence(record, input, deps);
  const safeProductionFixture = input.productionConfiguration
    ? core.validateStartupConfiguration(input.productionConfiguration)
    : { valid: false, issues: [{ code: 'PRODUCTION_CONFIGURATION_REVIEW_REQUIRED' }] };
  const manualGate = core.evaluateManualGate(
    input.geminiGate || {
      result: 'blocked_provider_unavailable',
      safeReasonCode: 'GEMINI_UPSTREAM_UNAVAILABLE',
    },
    {
      allowWaiver: true,
      affectedFeatureDisabled: input.geminiFeatureDisabled === true,
    },
  );
  const checks = {
    trackedSecretScan: secretScan.passed ? 'passed' : 'blocked',
    environmentExamples: examples.passed ? 'passed' : 'blocked',
    gitignore: gitignore.passed ? 'passed' : 'blocked',
    dependencyIntegrity: evidence.lockfile.valid ? 'passed' : 'blocked',
    compatibility: evidence.compatibilityResult.compatible ? 'passed' : 'blocked',
    migration: evidence.migrationEvaluation.valid ? 'passed' : 'blocked',
    productionConfiguration: safeProductionFixture.valid ? 'passed' : 'insufficient_evidence',
    geminiLiveGate: manualGate.satisfied ? 'passed_with_warnings' : 'approval_required',
    rollback: evidence.compatibilityResult.rollForwardOnly ? 'approval_required' : 'passed',
    performance: input.performanceStatus || 'insufficient_evidence',
    capacity: input.capacityStatus || 'insufficient_evidence',
    disasterRecovery: input.disasterRecoveryStatus || 'insufficient_evidence',
    slo: input.sloStatus || 'insufficient_evidence',
    alertReadiness: input.alertReadinessStatus || 'insufficient_evidence',
    incidentOwnership: input.incidentOwnershipStatus || 'insufficient_evidence',
    runbooks: RUNBOOK_MANIFEST.length >= 22 ? 'passed' : 'blocked',
  };
  const preflight = core.evaluatePreflight(checks);
  const blocked = preflight.state === 'blocked';
  const nextStatus = blocked
    ? 'validation_failed'
    : preflight.state === 'approval_required'
      ? 'approval_required'
      : 'ready_for_approval';
  const update = {
    status: nextStatus,
    releaseManifestId: idOf(evidence.manifest),
    buildProvenanceId: idOf(evidence.provenance),
    artifactManifestId: idOf(evidence.artifactManifest),
    compatibilityMatrixId: idOf(evidence.compatibility),
    validatedBy: scope.actorId,
    validatedAt: new Date(),
    testSummary: { status: blocked ? 'blocked' : 'passed', safeReasonCodes: [] },
    securitySummary: {
      status: secretScan.passed && examples.passed ? 'passed' : 'blocked',
      safeReasonCodes: secretScan.findings.map((item) => item.detector).slice(0, 100),
    },
    migrationSummary: {
      status: evidence.migrationEvaluation.valid ? 'passed' : 'blocked',
      safeReasonCodes: evidence.migrationEvaluation.safeReasonCodes,
    },
    readinessSummary: {
      status: preflight.state === 'passed' ? 'passed' : preflight.state === 'blocked' ? 'blocked' : 'warning',
      safeReasonCodes: preflight.checks
        .filter((check) => check.status !== 'passed')
        .map((check) => check.key)
        .slice(0, 100),
    },
  };
  const updated = await deps.ReleaseCandidate.findByIdAndUpdate(record._id, { $set: update }, { new: true, runValidators: true });
  metrics.increment('release_secret_scan', { result: secretScan.passed ? 'passed' : 'failed' });
  metrics.increment('release_preflight', { result: preflight.state });
  metrics.increment('release_compatibility', { result: evidence.compatibilityResult.compatible ? 'passed' : 'failed' });
  await audit(
    blocked ? 'release.candidate.validation_failed' : 'release.candidate.validation_passed',
    'ReleaseCandidate',
    updated,
    scope,
    {
      preflightState: preflight.state,
      secretScanPassed: secretScan.passed,
      compatibilityPassed: evidence.compatibilityResult.compatible,
      safeReasonCodes: update.readinessSummary.safeReasonCodes,
    },
    deps,
  );
  return { candidate: plain(updated), preflight, manualGate, secretScan: { ...secretScan, findings: secretScan.findings }, lockfile: evidence.lockfile };
}

async function approveCandidate(candidateId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  const record = await scoped(deps.ReleaseCandidate, candidateId, scope, 'RELEASE_CANDIDATE_NOT_FOUND');
  await authorize('releaseCandidate.approve', 'ReleaseCandidate', record, scope, caller, deps, {
    secretScanStatus: record.securitySummary?.status,
    compatibilityStatus: record.migrationSummary?.status,
  });
  await operational(scope, deps);
  mutationDigests(input, 'release-candidate-approve', candidateId);
  if (record.status === 'approved') return plain(record);
  if (!['ready_for_approval', 'approval_required'].includes(record.status)) {
    throw new AppError(409, 'RELEASE_CANDIDATE_NOT_APPROVABLE', 'Candidate validation is not ready for approval.');
  }
  if (record.securitySummary?.status !== 'passed') {
    throw new AppError(409, 'RELEASE_CREDENTIAL_EXPOSURE_NOT_WAIVABLE', 'Security findings block release approval.');
  }
  await governedApproval(input, scope, 'releaseCandidate.approve', 'ReleaseCandidate', record, 'RELEASE_CANDIDATE_APPROVAL', deps);
  const approved = await deps.ReleaseCandidate.findOneAndUpdate(
    { _id: record._id, status: { $in: ['ready_for_approval', 'approval_required'] } },
    { $set: { status: 'approved', approvedBy: scope.actorId, approvedAt: new Date() } },
    { new: true, runValidators: true },
  );
  await audit('release.candidate.approved', 'ReleaseCandidate', approved, scope, {
    version: approved.version,
    sourceRevision: approved.sourceRevision,
  }, deps);
  return plain(approved);
}

async function rejectCandidate(candidateId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  const record = await scoped(deps.ReleaseCandidate, candidateId, scope, 'RELEASE_CANDIDATE_NOT_FOUND');
  await authorize('releaseCandidate.reject', 'ReleaseCandidate', record, scope, caller, deps);
  await operational(scope, deps);
  if (IMMUTABLE_CANDIDATE_STATUSES.has(record.status)) throw new AppError(409, 'RELEASE_CANDIDATE_IMMUTABLE', 'Approved and released candidates are immutable.');
  const updated = await deps.ReleaseCandidate.findByIdAndUpdate(record._id, { $set: { status: 'rejected' } }, { new: true });
  await audit('release.candidate.rejected', 'ReleaseCandidate', updated, scope, { reasonCode: input.reasonCode }, deps);
  return plain(updated);
}

async function archiveCandidate(candidateId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  const record = await scoped(deps.ReleaseCandidate, candidateId, scope, 'RELEASE_CANDIDATE_NOT_FOUND');
  await authorize('releaseCandidate.archive', 'ReleaseCandidate', record, scope, caller, deps);
  if (IMMUTABLE_CANDIDATE_STATUSES.has(record.status)) throw new AppError(409, 'RELEASE_CANDIDATE_IMMUTABLE', 'Approved and released candidates are immutable.');
  const updated = await deps.ReleaseCandidate.findByIdAndUpdate(record._id, { $set: { status: 'archived' } }, { new: true });
  await audit('release.candidate.archived', 'ReleaseCandidate', updated, scope, {}, deps);
  return plain(updated);
}

async function getCandidateEvidence(candidateId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  const candidate = await scoped(deps.ReleaseCandidate, candidateId, scope, 'RELEASE_CANDIDATE_NOT_FOUND');
  await authorize('releaseReadiness.exportEvidence', 'ReleaseCandidate', candidate, scope, caller, deps);
  const existing = await deps.ReleaseEvidencePackage.findOne({
    releaseCandidateId: candidate.releaseCandidateId,
    ...tenantFilter(scope),
  }).lean();
  if (existing) return plain(existing);
  const links = await Promise.all([
    deps.ReleaseManifest.findOne({ releaseCandidateId: candidate.releaseCandidateId }).lean(),
    deps.BuildProvenance.findOne({ releaseCandidateId: candidate.releaseCandidateId }).lean(),
    deps.ReleaseArtifactManifest.findOne({ releaseCandidateId: candidate.releaseCandidateId }).lean(),
    deps.ReleaseCompatibilityMatrix.findOne({ releaseCandidateId: candidate.releaseCandidateId }).lean(),
    deps.ReleaseMigrationPlan.findOne({ releaseCandidateId: candidate.releaseCandidateId }).lean(),
    deps.ReleaseManualGate.find({ releaseCandidateId: candidate.releaseCandidateId, ...tenantFilter(scope) }).sort({ performedAt: -1 }).limit(100).lean(),
    deps.ReleaseWaiver.find({ releaseCandidateId: candidate.releaseCandidateId, ...tenantFilter(scope), status: 'approved' }).sort({ createdAt: -1 }).limit(100).lean(),
  ]);
  const evidenceData = core.createEvidencePackage({
    releaseCandidateId: candidate.releaseCandidateId,
    releaseManifestId: idOf(links[0]),
    buildProvenanceId: idOf(links[1]),
    artifactManifestId: idOf(links[2]),
    compatibilityMatrixId: idOf(links[3]),
    migrationPlanId: idOf(links[4]),
    summaries: {
      test: candidate.testSummary,
      security: candidate.securitySummary,
      migration: candidate.migrationSummary,
      readiness: candidate.readinessSummary,
      risk: candidate.riskSummary,
    },
    manualGateResults: links[5].map((gate) => ({
      gateKey: gate.gateKey,
      result: gate.result,
      safeReasonCode: gate.safeReasonCode,
      performedAt: gate.performedAt,
      expiresAt: gate.expiresAt,
    })),
    waiverReferences: links[6].map(idOf),
    generatedBy: scope.actorId,
    generatedAt: input.generatedAt || new Date(),
  });
  const created = await deps.ReleaseEvidencePackage.create({
    ...evidenceData,
    ...tenantFilter(scope),
    summaries: evidenceData.summaries || {},
  });
  await audit('release.artifact.generated', 'ReleaseEvidencePackage', created, scope, {
    evidenceDigest: created.evidenceDigest,
  }, deps);
  return plain(created);
}

function normalizePolicy(input, scope) {
  return {
    name: input.name,
    description: input.description || '',
    version: Number(input.version || 1),
    scope: input.scope || (scope.workspaceId ? 'workspace' : 'organization'),
    ...tenantFilter(scope),
    status: 'draft',
    strategy: input.strategy || 'canary',
    initialCanaryBasisPoints: Number(input.initialCanaryBasisPoints || 500),
    canaryObservationMs: Number(input.canaryObservationMs || 300_000),
    rolloutBatchBasisPoints: Number(input.rolloutBatchBasisPoints || 2_500),
    batchObservationMs: Number(input.batchObservationMs || 300_000),
    maximumUnavailableBasisPoints: Number(input.maximumUnavailableBasisPoints || 1_000),
    maximumSurgeBasisPoints: Number(input.maximumSurgeBasisPoints || 1_000),
    healthGatePolicy: input.healthGatePolicy || 'strict',
    readinessGatePolicy: input.readinessGatePolicy || 'strict',
    sloGatePolicy: input.sloGatePolicy || 'strict',
    errorBudgetGatePolicy: input.errorBudgetGatePolicy || 'strict',
    performanceGatePolicy: input.performanceGatePolicy || 'compatible-evidence',
    rollbackPolicy: input.rollbackPolicy || 'validate-before-start',
    rollForwardPolicy: input.rollForwardPolicy || 'approval-required',
    migrationFailurePolicy: input.migrationFailurePolicy || 'pause',
    requireApprovalBeforeStart: input.requireApprovalBeforeStart !== false,
    requireApprovalBeforeProduction: input.requireApprovalBeforeProduction !== false,
    requireApprovalBeforeRollback: input.requireApprovalBeforeRollback !== false,
    requireApprovalBeforeUnsafeRollForward: input.requireApprovalBeforeUnsafeRollForward !== false,
    createdBy: scope.actorId,
    updatedBy: scope.actorId,
  };
}

async function createRolloutPolicy(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  await authorize('releaseRolloutPolicy.create', 'ReleaseRolloutPolicy', null, scope, caller, deps);
  await operational(scope, deps);
  mutationDigests(input, 'release-rollout-policy-create', scope.organizationId);
  return plain(await deps.ReleaseRolloutPolicy.create(normalizePolicy(input, scope)));
}

async function listRolloutPolicies(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies);
  const scope = scopeFrom(input, caller);
  await authorize('releaseRolloutPolicy.read', 'ReleaseRolloutPolicy', null, scope, caller, deps);
  return page(deps.ReleaseRolloutPolicy, tenantFilter(scope), input);
}

async function getRolloutPolicy(policyId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  const record = await scoped(deps.ReleaseRolloutPolicy, policyId, scope, 'RELEASE_ROLLOUT_POLICY_NOT_FOUND');
  await authorize('releaseRolloutPolicy.read', 'ReleaseRolloutPolicy', record, scope, caller, deps);
  return plain(record);
}

async function updateRolloutPolicy(policyId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  const record = await scoped(deps.ReleaseRolloutPolicy, policyId, scope, 'RELEASE_ROLLOUT_POLICY_NOT_FOUND');
  await authorize('releaseRolloutPolicy.update', 'ReleaseRolloutPolicy', record, scope, caller, deps);
  if (record.status !== 'draft') throw new AppError(409, 'RELEASE_ROLLOUT_POLICY_IMMUTABLE', 'Active rollout policies are immutable.');
  const allowed = ['description', 'strategy', 'initialCanaryBasisPoints', 'canaryObservationMs', 'rolloutBatchBasisPoints', 'batchObservationMs', 'maximumUnavailableBasisPoints', 'maximumSurgeBasisPoints'];
  const patch = Object.fromEntries(allowed.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]));
  return plain(await deps.ReleaseRolloutPolicy.findByIdAndUpdate(record._id, { $set: { ...patch, updatedBy: scope.actorId } }, { new: true, runValidators: true }));
}

async function validateRolloutPolicy(policyId, input = {}, caller = {}, options = {}) {
  const policy = await getRolloutPolicy(policyId, input, caller, options);
  const safeReasonCodes = [];
  if (policy.strategy === 'canary' && policy.initialCanaryBasisPoints > 5_000) safeReasonCodes.push('CANARY_TOO_LARGE');
  if (policy.maximumUnavailableBasisPoints + policy.maximumSurgeBasisPoints > 10_000) safeReasonCodes.push('ROLLOUT_AVAILABILITY_BOUNDS_INVALID');
  return { policyId, valid: safeReasonCodes.length === 0, safeReasonCodes };
}

async function activateRolloutPolicy(policyId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  const record = await scoped(deps.ReleaseRolloutPolicy, policyId, scope, 'RELEASE_ROLLOUT_POLICY_NOT_FOUND');
  await authorize('releaseRolloutPolicy.activate', 'ReleaseRolloutPolicy', record, scope, caller, deps);
  const validation = await validateRolloutPolicy(policyId, input, caller, options);
  if (!validation.valid) throw new AppError(409, 'RELEASE_ROLLOUT_POLICY_INVALID', 'Rollout policy is invalid.');
  await governedApproval(input, scope, 'releaseRolloutPolicy.activate', 'ReleaseRolloutPolicy', record, 'RELEASE_ROLLOUT_POLICY_ACTIVATION', deps);
  await deps.ReleaseRolloutPolicy.updateMany({ ...tenantFilter(scope), name: record.name, status: 'active', _id: { $ne: record._id } }, { $set: { status: 'archived' } });
  return plain(await deps.ReleaseRolloutPolicy.findOneAndUpdate({ _id: record._id, status: 'draft' }, { $set: { status: 'active', activatedBy: scope.actorId } }, { new: true }));
}

async function archiveRolloutPolicy(policyId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  const record = await scoped(deps.ReleaseRolloutPolicy, policyId, scope, 'RELEASE_ROLLOUT_POLICY_NOT_FOUND');
  await authorize('releaseRolloutPolicy.archive', 'ReleaseRolloutPolicy', record, scope, caller, deps);
  return plain(await deps.ReleaseRolloutPolicy.findByIdAndUpdate(record._id, { $set: { status: 'archived', archivedBy: scope.actorId } }, { new: true }));
}

async function createRollout(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseRollout.create', 'ReleaseRolloutPlan', null, scope, caller, deps);
  await operational(scope, deps);
  const candidate = await deps.ReleaseCandidate.findOne({ _id: input.releaseCandidateId, ...tenantFilter(scope) });
  if (!candidate || candidate.status !== 'approved') throw new AppError(409, 'RELEASE_CANDIDATE_APPROVAL_REQUIRED', 'An approved release candidate is required.');
  const policy = await deps.ReleaseRolloutPolicy.findOne({ _id: input.rolloutPolicyId, ...tenantFilter(scope), status: 'active' });
  if (!policy) throw new AppError(404, 'RELEASE_ROLLOUT_POLICY_NOT_FOUND', 'An active rollout policy is required.');
  const target = CODE_DEPLOYMENT_TARGETS.find((item) => item.targetId === input.deploymentTargetId);
  if (!target) throw new AppError(400, 'RELEASE_DEPLOYMENT_TARGET_NOT_ALLOWED', 'Deployment target is not registered.');
  if (!target.allowedReleaseStrategies.includes(policy.strategy)) throw new AppError(409, 'RELEASE_STRATEGY_NOT_ALLOWED', 'Rollout strategy is not allowed for the target.');
  const digests = mutationDigests(input, 'release-rollout-create', scope.organizationId);
  const replay = await deps.ReleaseRolloutPlan.findOne({ ...tenantFilter(scope), idempotencyKeyHash: digests.idempotencyKeyHash }).select('+idempotencyKeyHash +requestFingerprint');
  if (replay) return plain(replay);
  const record = await deps.ReleaseRolloutPlan.create({
    releaseCandidateId: candidate.releaseCandidateId,
    deploymentTargetId: target.targetId,
    rolloutPolicyId: idOf(policy),
    rolloutPolicyVersion: policy.version,
    ...tenantFilter(scope),
    sourceVersion: input.sourceVersion || candidate.version,
    targetVersion: candidate.version,
    strategy: policy.strategy,
    regionOrder: core.orderRegions(input.regionIds || target.regionIds, input.activeWriteRegionId, input.regionStrategy || 'primary_last'),
    serviceOrder: input.serviceOrder || ['backend', 'worker', 'external-agent', 'frontend'],
    workerPoolOrder: input.workerPoolOrder || ['standby', 'non-authoritative', 'write-authority'],
    status: 'draft',
    currentStage: 'draft',
    healthGateStatus: 'not_run',
    readinessGateStatus: 'not_run',
    migrationStatus: 'not_run',
    smokeTestStatus: 'not_run',
    sloGateStatus: 'not_run',
    performanceGateStatus: 'not_run',
    rollbackReadinessStatus: candidate.migrationSummary?.status === 'passed' ? 'ready' : 'unknown',
    requestedBy: scope.actorId,
    requestId: scope.requestId,
    traceId: scope.traceId,
    ...digests,
  });
  await audit('release.rollout.created', 'ReleaseRolloutPlan', record, scope, { targetCategory: target.category, strategy: record.strategy }, deps);
  return plain(record);
}

async function listRollouts(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseRollout.read', 'ReleaseRolloutPlan', null, scope, caller, deps);
  const filter = tenantFilter(scope); if (input.status) filter.status = input.status;
  return page(deps.ReleaseRolloutPlan, filter, input);
}

async function getRollout(rolloutId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  const record = await scoped(deps.ReleaseRolloutPlan, rolloutId, scope, 'RELEASE_ROLLOUT_NOT_FOUND');
  await authorize('releaseRollout.read', 'ReleaseRolloutPlan', record, scope, caller, deps);
  return plain(record);
}

async function rolloutAction(rolloutId, action, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  const record = await scoped(deps.ReleaseRolloutPlan, rolloutId, scope, 'RELEASE_ROLLOUT_NOT_FOUND');
  const permission = {
    validate: 'releaseRollout.validate', approve: 'releaseRollout.approve', start: 'releaseRollout.execute',
    pause: 'releaseRollout.pause', resume: 'releaseRollout.resume', abort: 'releaseRollout.abort',
    rollback: 'releaseRollout.rollback', rollForward: 'releaseRollout.rollForward', verify: 'releaseRollout.verify',
  }[action];
  await authorize(permission, 'ReleaseRolloutPlan', record, scope, caller, deps, {
    targetCategory: CODE_DEPLOYMENT_TARGETS.find((item) => item.targetId === record.deploymentTargetId)?.category,
  });
  await operational(scope, deps, action === 'start' ? 'EXECUTION' : 'PRIVILEGED_CONFIGURATION');
  mutationDigests(input, `release-rollout-${action}`, rolloutId);
  const target = CODE_DEPLOYMENT_TARGETS.find((item) => item.targetId === record.deploymentTargetId);
  let next;
  if (action === 'validate') next = 'validating';
  if (action === 'approve') next = 'approved';
  if (action === 'start') next = 'preparing';
  if (action === 'pause') next = 'paused';
  if (action === 'resume') next = ['deploying_canary', 'observing_canary'].includes(record.currentStage) ? record.currentStage : 'expanding';
  if (action === 'abort') next = 'aborting';
  if (action === 'rollback') next = record.status === 'rollback_required' ? 'rolling_back' : 'rollback_required';
  if (action === 'rollForward') next = record.status === 'roll_forward_required' ? 'approved' : 'roll_forward_required';
  if (action === 'verify') next = record.status === 'verifying' ? 'succeeded' : 'verifying';
  if (action === 'approve' || action === 'start' || action === 'rollback' || action === 'rollForward') {
    await governedApproval(input, scope, permission, 'ReleaseRolloutPlan', record, `RELEASE_ROLLOUT_${action.toUpperCase()}`, deps);
  }
  if (action === 'start' && target.category === 'production') {
    const result = await new core.NoopDeploymentAdapter().beginRollout();
    await audit('release.rollout.paused', 'ReleaseRolloutPlan', record, scope, { reasonCode: result.code }, deps);
    return { rollout: plain(record), deployment: result };
  }
  core.transitionRollout(record.status, next);
  const updated = await deps.ReleaseRolloutPlan.findOneAndUpdate(
    { _id: record._id, status: record.status },
    { $set: {
      status: next,
      currentStage: next,
      ...(action === 'approve' ? { approvedBy: scope.actorId } : {}),
      ...(action === 'start' ? { startedAt: new Date() } : {}),
      ...(next === 'succeeded' ? { completedAt: new Date() } : {}),
    } },
    { new: true, runValidators: true },
  );
  metrics.increment('release_rollout', { strategy: record.strategy, outcome: next });
  await audit(`release.rollout.${action === 'rollForward' ? 'roll_forward_requested' : action}`, 'ReleaseRolloutPlan', updated, scope, { status: next }, deps);
  return plain(updated);
}

async function listMigrations(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseMigration.read', 'ReleaseMigrationPlan', null, scope, caller, deps);
  return page(deps.ReleaseMigrationPlan, tenantFilter(scope), input);
}
async function getMigration(migrationId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  const record = await scoped(deps.ReleaseMigrationPlan, migrationId, scope, 'RELEASE_MIGRATION_NOT_FOUND');
  await authorize('releaseMigration.read', 'ReleaseMigrationPlan', record, scope, caller, deps); return plain(record);
}
async function migrationAction(migrationId, action, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  const record = await scoped(deps.ReleaseMigrationPlan, migrationId, scope, 'RELEASE_MIGRATION_NOT_FOUND');
  const permission = `releaseMigration.${action}`;
  await authorize(permission, 'ReleaseMigrationPlan', record, scope, caller, deps);
  await operational(scope, deps, action === 'execute' ? 'EXECUTION' : 'PRIVILEGED_CONFIGURATION');
  mutationDigests(input, `release-migration-${action}`, migrationId);
  const unknown = record.requiredMigrationIds.filter((id) => !CODE_MIGRATIONS[id]);
  if (unknown.length) throw new AppError(409, 'RELEASE_MIGRATION_CODE_REFERENCE_UNKNOWN', 'Migration IDs must reference code-defined migrations.');
  const transitions = { validate: 'validated', execute: 'executing', pause: 'paused', resume: 'executing' };
  if (action === 'execute') await governedApproval(input, scope, permission, 'ReleaseMigrationPlan', record, 'RELEASE_MIGRATION_EXECUTION', deps);
  const updated = await deps.ReleaseMigrationPlan.findByIdAndUpdate(record._id, { $set: { status: transitions[action] } }, { new: true });
  if (action === 'execute' && record.requiredMigrationIds[0]) {
    await deps.ReleaseMigrationCheckpoint.findOneAndUpdate(
      { migrationPlanId: idOf(record), migrationId: record.requiredMigrationIds[0] },
      { $setOnInsert: { migrationPlanId: idOf(record), migrationId: record.requiredMigrationIds[0], ...tenantFilter(scope), fencingToken: 1, checkpoint: 0, status: 'executing' } },
      { upsert: true, new: true },
    );
  }
  await audit(`release.migration.${action === 'execute' ? 'started' : action}`, 'ReleaseMigrationPlan', updated, scope, {}, deps);
  return plain(updated);
}

async function createFeatureFlag(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseFeatureFlag.create', 'ReleaseFeatureFlag', null, scope, caller, deps);
  await operational(scope, deps); mutationDigests(input, 'release-feature-flag-create', scope.organizationId);
  return plain(await deps.ReleaseFeatureFlag.create({
    key: input.key, displayName: input.displayName || input.key, description: input.description || '',
    version: Number(input.version || 1), scope: input.scope || (scope.workspaceId ? 'workspace' : 'organization'),
    ...tenantFilter(scope), status: 'draft', defaultState: input.defaultState === true,
    rolloutPercentageBasisPoints: Number(input.rolloutPercentageBasisPoints || 0),
    allowedEnvironmentCategories: input.allowedEnvironmentCategories || ['development', 'test', 'ci', 'integration', 'staging'],
    allowedRegionIds: input.allowedRegionIds || [], allowedTenantCategories: input.allowedTenantCategories || [],
    requiredReleaseCandidateId: input.requiredReleaseCandidateId, killSwitch: false, expiresAt: input.expiresAt,
    owner: input.owner || scope.actorId, createdBy: scope.actorId,
  }));
}
async function listFeatureFlags(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseFeatureFlag.read', 'ReleaseFeatureFlag', null, scope, caller, deps);
  return page(deps.ReleaseFeatureFlag, tenantFilter(scope), input, { key: 1, version: -1 });
}
async function getFeatureFlag(flagKey, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  const record = await deps.ReleaseFeatureFlag.findOne({ key: flagKey, ...tenantFilter(scope) }).sort({ version: -1 });
  if (!record) throw new AppError(404, 'RELEASE_FEATURE_FLAG_NOT_FOUND', 'Feature flag was not found.');
  await authorize('releaseFeatureFlag.read', 'ReleaseFeatureFlag', record, scope, caller, deps); return plain(record);
}
async function featureFlagAction(flagKey, action, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  const record = await deps.ReleaseFeatureFlag.findOne({ key: flagKey, ...tenantFilter(scope) }).sort({ version: -1 });
  if (!record) throw new AppError(404, 'RELEASE_FEATURE_FLAG_NOT_FOUND', 'Feature flag was not found.');
  const permission = action === 'killSwitch' ? 'releaseFeatureFlag.killSwitch' : `releaseFeatureFlag.${action}`;
  await authorize(permission, 'ReleaseFeatureFlag', record, scope, caller, deps);
  if (record.status !== 'draft' && ['update', 'validate'].includes(action)) throw new AppError(409, 'RELEASE_FEATURE_FLAG_IMMUTABLE', 'Active flag versions are immutable.');
  if (['activate', 'killSwitch'].includes(action)) await governedApproval(input, scope, permission, 'ReleaseFeatureFlag', record, `RELEASE_FEATURE_FLAG_${action.toUpperCase()}`, deps);
  if (action === 'validate') return { flagKey, valid: !record.expiresAt || record.expiresAt > new Date(), safeReasonCodes: [] };
  const status = action === 'archive' ? 'archived' : action === 'activate' ? 'active' : record.status;
  const patch = action === 'update'
    ? Object.fromEntries(['description', 'defaultState', 'rolloutPercentageBasisPoints', 'expiresAt'].filter((key) => input[key] !== undefined).map((key) => [key, input[key]]))
    : { status, ...(action === 'killSwitch' ? { killSwitch: true, defaultState: false } : {}), ...(action === 'activate' ? { activatedBy: scope.actorId } : {}) };
  const updated = await deps.ReleaseFeatureFlag.findByIdAndUpdate(record._id, { $set: patch }, { new: true, runValidators: true });
  if (action === 'killSwitch') await audit('release.feature_flag.kill_switch_activated', 'ReleaseFeatureFlag', updated, scope, {}, deps);
  return plain(updated);
}

async function listTargets(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseDeploymentTarget.read', 'DeploymentTarget', null, scope, caller, deps);
  return { items: CODE_DEPLOYMENT_TARGETS.map(core.canonical) };
}
async function getTarget(targetId, input = {}, caller = {}, options = {}) {
  const result = await listTargets(input, caller, options); const target = result.items.find((item) => item.targetId === targetId);
  if (!target) throw new AppError(404, 'RELEASE_DEPLOYMENT_TARGET_NOT_FOUND', 'Deployment target was not found.'); return target;
}
async function getTargetDrift(targetId, input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  const target = await getTarget(targetId, input, caller, options);
  await authorize('releaseDeploymentTarget.readDrift', 'DeploymentTarget', target, scope, caller, deps);
  return core.compareDeploymentMetadata(input.expected || {}, input.actual || {});
}

async function evaluateReadiness(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseReadiness.read', 'ReleaseReadiness', null, scope, caller, deps);
  const [candidate, manualGates, ownership] = await Promise.all([
    deps.ReleaseCandidate.findOne(tenantFilter(scope)).sort({ createdAt: -1 }).lean(),
    deps.ReleaseManualGate.find(tenantFilter(scope)).sort({ performedAt: -1 }).limit(100).lean(),
    deps.ReleaseOperationalOwnership.find({ status: 'active' }).sort({ serviceCategory: 1 }).limit(100).lean(),
  ]);
  return {
    state: candidate?.status === 'approved' ? 'approval_complete' : candidate?.status || 'no_candidate',
    candidate: plain(candidate),
    manualGates: manualGates.map(plain),
    ownership: ownership.length ? ownership.map(plain) : CODE_OPERATIONAL_OWNERSHIP.map(core.canonical),
    productionDeploymentMode: 'manual_noop',
    liveProviderVerification: 'manual_only',
    heavyPerformanceTesting: 'manual_only',
    metrics: metrics.snapshot(),
    generatedAt: new Date().toISOString(),
  };
}
async function releaseHealth(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseReadiness.readDetails', 'ReleaseReadiness', null, scope, caller, deps);
  return { status: 'operational', serviceCategory: 'release-control-plane', readinessCategory: 'manual-deployment-boundary', redactionStatus: 'active', generatedAt: new Date().toISOString() };
}
async function listRunbooks(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseRunbook.read', 'ReleaseRunbook', null, scope, caller, deps);
  return { items: RUNBOOK_MANIFEST.map(core.canonical) };
}
async function listOwnership(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseOwnership.read', 'ReleaseOperationalOwnership', null, scope, caller, deps);
  const records = await page(deps.ReleaseOperationalOwnership, {}, input, { serviceCategory: 1, operationalDomain: 1 });
  return records.items.length
    ? records
    : { items: CODE_OPERATIONAL_OWNERSHIP.map(core.canonical), limit: records.limit, nextCursor: null };
}
async function listManualGates(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseManualGate.read', 'ReleaseManualGate', null, scope, caller, deps);
  return page(deps.ReleaseManualGate, tenantFilter(scope), input, { performedAt: -1 });
}
async function recordManualGate(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseManualGate.record', 'ReleaseManualGate', null, scope, caller, deps);
  await operational(scope, deps); mutationDigests(input, 'release-manual-gate', scope.organizationId);
  const record = await deps.ReleaseManualGate.create({
    releaseCandidateId: input.releaseCandidateId, ...tenantFilter(scope), gateKey: input.gateKey,
    result: input.result, safeReasonCode: input.safeReasonCode, evidenceReference: input.evidenceReference,
    performedBy: scope.actorId, performedAt: input.performedAt || new Date(), expiresAt: input.expiresAt,
    approvalReference: input.approvalReference,
  });
  metrics.increment('release_manual_gate', { result: record.result });
  await audit('release.manual_gate.recorded', 'ReleaseManualGate', record, scope, { gateKey: record.gateKey, result: record.result, safeReasonCode: record.safeReasonCode }, deps);
  return plain(record);
}
async function listWaivers(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseWaiver.read', 'ReleaseWaiver', null, scope, caller, deps);
  return page(deps.ReleaseWaiver, tenantFilter(scope), input);
}
async function createWaiver(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseWaiver.create', 'ReleaseWaiver', null, scope, caller, deps);
  await operational(scope, deps); mutationDigests(input, 'release-waiver-create', scope.organizationId);
  const validation = core.validateWaiver({ ...input, approvalReference: input.approvalReference });
  if (!validation.valid) throw new AppError(409, validation.safeReasonCodes[0], 'Release finding cannot be waived.');
  await governedApproval(input, scope, 'releaseWaiver.approve', 'ReleaseWaiver', input.releaseCandidateId, 'RELEASE_WAIVER_APPROVAL', deps);
  const record = await deps.ReleaseWaiver.create({
    releaseCandidateId: input.releaseCandidateId, ...tenantFilter(scope), findingCode: input.findingCode,
    boundedReason: input.boundedReason, riskCategory: input.riskCategory || 'unknown', mitigation: input.mitigation,
    expiresAt: input.expiresAt, approver: scope.actorId, approvalReference: input.approvalReference,
    linkedIncidentOrChangeRequest: input.linkedIncidentOrChangeRequest, scope: input.scope || 'finding', status: 'approved',
  });
  await audit('release.waiver.approved', 'ReleaseWaiver', record, scope, { findingCode: record.findingCode, riskCategory: record.riskCategory }, deps);
  return plain(record);
}
async function listFreezes(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseFreeze.read', 'ReleaseFreeze', null, scope, caller, deps);
  return page(deps.ReleaseFreeze, tenantFilter(scope), input);
}
async function createFreeze(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize(input.override === true ? 'releaseFreeze.override' : 'releaseFreeze.create', 'ReleaseFreeze', null, scope, caller, deps);
  await operational(scope, deps); mutationDigests(input, 'release-freeze-create', scope.organizationId);
  if (input.override === true) await governedApproval(input, scope, 'releaseFreeze.override', 'ReleaseFreeze', input.scopeReference, 'RELEASE_FREEZE_OVERRIDE', deps);
  const record = await deps.ReleaseFreeze.create({
    scope: input.scope || 'organization', scopeReference: input.scopeReference || scope.organizationId,
    ...tenantFilter(scope), status: input.status || 'frozen', safeReason: input.safeReason,
    effectiveAt: input.effectiveAt || new Date(), expiresAt: input.expiresAt,
    approvalReference: input.approvalReference, createdBy: scope.actorId,
  });
  await audit(input.override === true ? 'release.freeze.overridden' : 'release.freeze.activated', 'ReleaseFreeze', record, scope, { status: record.status }, deps);
  return plain(record);
}
async function createSupportBundle(input = {}, caller = {}, options = {}) {
  const deps = dependencies(options.dependencies); const scope = scopeFrom(input, caller);
  await authorize('releaseSupportBundle.create', 'ReleaseSupportBundle', null, scope, caller, deps);
  await operational(scope, deps); mutationDigests(input, 'release-support-bundle', scope.organizationId);
  const bundle = core.createSupportBundle({
    ...input,
    configurationVariableNames: PRODUCTION_CONFIGURATION_PROFILE.requiredEnvironmentVariableNames,
    generatedAt: new Date(),
  });
  metrics.increment('release_support_bundle', { result: 'generated' });
  await audit('release.support_bundle.generated', 'ReleaseSupportBundle', bundle.digest, scope, { digest: bundle.digest }, deps);
  return bundle;
}

async function ensureReleaseReadinessIndexes() {
  const models = [
    ReleaseCandidate, ReleaseManifest, BuildProvenance, ReleaseArtifactManifest,
    ReleaseCompatibilityMatrix, ReleaseMigrationPlan, ReleaseMigrationCheckpoint,
    ReleaseFeatureFlag, DeploymentTarget, ReleaseRolloutPolicy, ReleaseRolloutPlan,
    ReleaseEvidencePackage, ReleaseManualGate, ReleaseWaiver, ReleaseFreeze,
    ReleaseOperationalOwnership, ReleaseObservationWindow,
  ];
  const results = [];
  for (const Model of models) results.push({ model: Model.modelName, indexes: await Model.createIndexes() });
  return results;
}

module.exports = {
  CODE_DEPLOYMENT_TARGETS,
  CODE_MIGRATIONS,
  CODE_OPERATIONAL_OWNERSHIP,
  approveCandidate,
  archiveCandidate,
  archiveRolloutPolicy,
  createCandidate,
  createFeatureFlag,
  createFreeze,
  createRollout,
  createRolloutPolicy,
  createSupportBundle,
  createWaiver,
  ensureReleaseReadinessIndexes,
  evaluateReadiness,
  featureFlagAction,
  getCandidate,
  getCandidateEvidence,
  getFeatureFlag,
  getMigration,
  getRollout,
  getRolloutPolicy,
  getTarget,
  getTargetDrift,
  listCandidates,
  listFeatureFlags,
  listFreezes,
  listManualGates,
  listMigrations,
  listOwnership,
  listRolloutPolicies,
  listRollouts,
  listRunbooks,
  listTargets,
  listWaivers,
  migrationAction,
  recordManualGate,
  rejectCandidate,
  releaseHealth,
  rolloutAction,
  updateRolloutPolicy,
  validateCandidate,
  validateRolloutPolicy,
  activateRolloutPolicy,
};
