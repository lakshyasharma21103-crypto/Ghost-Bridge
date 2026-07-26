const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  NON_WAIVABLE_FINDINGS,
  PREFLIGHT_STATES,
  ROLLOUT_TRANSITIONS,
  RUNBOOK_MANIFEST,
} = require('../constants/releaseReadiness');
const {
  gitTrackedFiles,
  sha256,
} = require('./releaseSecurity.service');
const {
  PRODUCTION_CONFIGURATION_PROFILE,
  validateStartupConfiguration,
} = require('../config/productionProfile');

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const VERSION = /^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$/;
const SHA_REVISION = /^[a-f0-9]{7,64}$/i;
const SECRET_FIELD = /(?:secret|password|token|credential|authorization|cookie|connectionstring|uri)$/i;
const SECRET_VALUE =
  /(?:mongodb(?:\+srv)?:\/\/[^:\s]+:[^@\s]+@|redis(?:s)?:\/\/[^@\s]*:[^@\s]+@|bearer\s+[A-Za-z0-9._~+/-]{12,}|-----BEGIN .*PRIVATE KEY-----|gh[pousr]_|xox[baprs]-|AIza[0-9A-Za-z_-]{20,})/i;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value instanceof Date ? value.toISOString() : value;
}

function canonicalJson(value) {
  return JSON.stringify(canonical(value));
}

function digest(value) {
  return sha256(canonicalJson(value));
}

function safeArray(value, maximum = 100) {
  return [...new Set((Array.isArray(value) ? value : []).map(String).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .slice(0, maximum);
}

function assertSafeIdentifier(value, name) {
  if (!SAFE_ID.test(String(value || ''))) throw new Error(`${name} must be a bounded identifier`);
  return String(value);
}

function validateSourceRevision(value) {
  if (!SHA_REVISION.test(String(value || ''))) {
    throw new Error('RELEASE_SOURCE_REVISION_INVALID');
  }
  return String(value).toLowerCase();
}

function validateVersion(value, name = 'version') {
  if (!VERSION.test(String(value || ''))) throw new Error(`RELEASE_${name.toUpperCase()}_INVALID`);
  return String(value);
}

function createReleaseManifest(input = {}) {
  const generatedAt = input.generatedAt || new Date(0).toISOString();
  return canonical({
    manifestVersion: validateVersion(input.manifestVersion || '1'),
    releaseCandidateId: assertSafeIdentifier(input.releaseCandidateId, 'releaseCandidateId'),
    sourceRevision: validateSourceRevision(input.sourceRevision),
    applicationVersion: validateVersion(input.applicationVersion),
    workspaceVersions: {
      backend: validateVersion(input.workspaceVersions?.backend || input.applicationVersion),
      externalAgent: validateVersion(
        input.workspaceVersions?.externalAgent || input.applicationVersion,
      ),
      frontend: validateVersion(input.workspaceVersions?.frontend || input.applicationVersion),
    },
    protocolVersions: safeArray(input.protocolVersions || ['1']),
    schemaVersion: validateVersion(input.schemaVersion || '1'),
    migrationVersion: validateVersion(input.migrationVersion || '1'),
    routingVersions: safeArray(input.routingVersions || ['1']),
    cacheSerializationVersions: safeArray(input.cacheSerializationVersions || ['1']),
    projectionVersions: safeArray(input.projectionVersions || ['1']),
    requiredEnvironmentVariableNames:
      PRODUCTION_CONFIGURATION_PROFILE.requiredEnvironmentVariableNames,
    optionalEnvironmentVariableNames:
      PRODUCTION_CONFIGURATION_PROFILE.optionalEnvironmentVariableNames,
    forbiddenProductionVariableNames:
      PRODUCTION_CONFIGURATION_PROFILE.forbiddenProductionVariableNames,
    requiredIndexes: safeArray(input.requiredIndexes),
    migrationIds: safeArray(input.migrationIds),
    featureFlagSnapshotId: input.featureFlagSnapshotId || null,
    compatibilityMatrixId: input.compatibilityMatrixId || null,
    expectedRuntimeServices: safeArray(input.expectedRuntimeServices),
    expectedWorkerPools: safeArray(input.expectedWorkerPools),
    expectedRegions: safeArray(input.expectedRegions),
    buildArtifactDigests: safeArray(input.buildArtifactDigests),
    softwareBillOfMaterialsReference: input.softwareBillOfMaterialsReference || null,
    generatedAt,
  });
}

function createBuildProvenance(input = {}) {
  const sourceTreeState = ['clean', 'dirty', 'unknown'].includes(input.sourceTreeState)
    ? input.sourceTreeState
    : 'unknown';
  const buildEnvironmentCategory = ['local', 'ci', 'trusted_ci'].includes(
    input.buildEnvironmentCategory,
  )
    ? input.buildEnvironmentCategory
    : 'local';
  if (buildEnvironmentCategory === 'trusted_ci' && input.generatedByCategory !== 'trusted_ci') {
    throw new Error('TRUSTED_CI_PROVENANCE_UNSUPPORTED');
  }
  return canonical({
    releaseCandidateId: assertSafeIdentifier(input.releaseCandidateId, 'releaseCandidateId'),
    sourceRevision: validateSourceRevision(input.sourceRevision),
    sourceTreeState,
    buildEnvironmentCategory,
    runtimeVersion: validateVersion(input.runtimeVersion || process.versions.node),
    npmVersion: validateVersion(input.npmVersion || 'unknown'),
    lockfileDigest: String(input.lockfileDigest || ''),
    sourceManifestDigest: String(input.sourceManifestDigest || ''),
    buildCommands: safeArray(input.buildCommands, 32),
    testCommandNames: safeArray(input.testCommandNames, 64),
    buildStartedAt: input.buildStartedAt || new Date(0).toISOString(),
    buildCompletedAt: input.buildCompletedAt || new Date(0).toISOString(),
    artifactDigests: safeArray(input.artifactDigests, 100),
    provenanceVersion: '1',
    generatedByCategory: input.generatedByCategory || 'local_operator',
    generatedAt: input.generatedAt || new Date(0).toISOString(),
  });
}

function artifactExcluded(relativePath) {
  const value = String(relativePath).replaceAll('\\', '/');
  return (
    /(?:^|\/)(?:node_modules|dist|build|coverage|\.cache|test-results)(?:\/|$)/.test(value) ||
    /(?:^|\/)\.env(?:\.|$)/.test(value) ||
    /(?:^|\/)(?:temp|tmp)(?:\/|$)/.test(value)
  );
}

function artifactDigest(repositoryRoot, logicalName, prefixes = []) {
  const normalizedPrefixes = prefixes.map((value) => String(value).replaceAll('\\', '/'));
  const files = gitTrackedFiles(repositoryRoot).filter(
    (file) =>
      !artifactExcluded(file) &&
      (!normalizedPrefixes.length ||
        normalizedPrefixes.some((prefix) => file === prefix || file.startsWith(`${prefix}/`))),
  );
  const hash = crypto.createHash('sha256');
  let byteSize = 0;
  for (const file of files) {
    const bytes = fs.readFileSync(path.resolve(repositoryRoot, file));
    hash.update(file);
    hash.update('\0');
    hash.update(bytes);
    hash.update('\0');
    byteSize += bytes.length;
  }
  return {
    logicalName,
    artifactVersion: '1',
    safeRelativePath: normalizedPrefixes.join(',') || '.',
    byteSizeCategory:
      byteSize < 1_000_000 ? 'small' : byteSize < 20_000_000 ? 'medium' : 'large',
    sha256Digest: `sha256:${hash.digest('hex')}`,
    fileCount: files.length,
    generatedAt: new Date(0).toISOString(),
  };
}

function validateLockfile(repositoryRoot) {
  const lockfilePath = path.resolve(repositoryRoot, 'package-lock.json');
  const issues = [];
  if (!fs.existsSync(lockfilePath)) return { valid: false, issues: ['LOCKFILE_MISSING'] };
  let lockfile;
  try {
    lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));
  } catch {
    return { valid: false, issues: ['LOCKFILE_PARSE_FAILED'] };
  }
  const packages = lockfile.packages || {};
  for (const workspace of ['Backend', 'backend', 'frontend', 'external-agent']) {
    const manifestPath = path.resolve(repositoryRoot, workspace, 'package.json');
    if (!fs.existsSync(manifestPath)) continue;
    const normalized = workspace.replaceAll('\\', '/');
    if (!packages[normalized] && !packages[normalized.toLowerCase()]) {
      issues.push(`LOCKFILE_WORKSPACE_MISSING:${normalized}`);
    }
  }
  for (const [packagePath, metadata] of Object.entries(packages)) {
    const resolved = String(metadata.resolved || '');
    if (/^http:\/\//i.test(resolved)) issues.push(`LOCKFILE_INSECURE_SOURCE:${packagePath}`);
    if (/^git(?:\+|:)/i.test(resolved) && !/#[a-f0-9]{40}$/i.test(resolved)) {
      issues.push(`LOCKFILE_UNPINNED_GIT:${packagePath}`);
    }
    if (/^file:/i.test(resolved) && resolved.includes('..')) {
      issues.push(`LOCKFILE_EXTERNAL_FILE_DEPENDENCY:${packagePath}`);
    }
    if (metadata.integrity && !/^sha(?:256|384|512)-[A-Za-z0-9+/=]+$/.test(metadata.integrity)) {
      issues.push(`LOCKFILE_INTEGRITY_INVALID:${packagePath}`);
    }
    if (/C:\\Users\\|\/Users\/|\/home\//i.test(`${packagePath} ${resolved}`)) {
      issues.push(`LOCKFILE_LOCAL_PATH:${packagePath}`);
    }
  }
  return {
    valid: issues.length === 0,
    issues: issues.sort(),
    lockfileVersion: lockfile.lockfileVersion,
    digest: sha256(fs.readFileSync(lockfilePath)),
    packageCount: Object.keys(packages).length,
  };
}

function generateSbom(repositoryRoot, maximumPackages = 5_000) {
  const lockfile = JSON.parse(
    fs.readFileSync(path.resolve(repositoryRoot, 'package-lock.json'), 'utf8'),
  );
  const rootDirect = new Set(
    Object.keys({
      ...(lockfile.packages?.['']?.dependencies || {}),
      ...(lockfile.packages?.['']?.devDependencies || {}),
    }),
  );
  const packages = Object.entries(lockfile.packages || {})
    .filter(([packagePath, metadata]) => packagePath && metadata?.name && metadata?.version)
    .map(([packagePath, metadata]) => {
      const workspace = packagePath.startsWith('node_modules/')
        ? 'root'
        : packagePath.split('/node_modules/')[0] || 'root';
      return {
        name: metadata.name,
        version: metadata.version,
        workspace,
        dependencyCategory: rootDirect.has(metadata.name) ? 'direct' : 'transitive',
        integrityDigest: metadata.integrity || null,
        licenseIdentifier: metadata.license || 'unknown',
        packageSourceCategory: metadata.link ? 'workspace' : 'registry',
        usageCategory: metadata.dev ? 'development' : 'production',
      };
    })
    .sort((left, right) =>
      `${left.name}@${left.version}:${left.workspace}`.localeCompare(
        `${right.name}@${right.version}:${right.workspace}`,
      ),
    )
    .slice(0, maximumPackages);
  return {
    format: 'ghost-bridge-sbom',
    version: '1',
    generatedFrom: 'package-lock.json',
    packageCount: packages.length,
    packages,
    digest: digest(packages),
    vulnerabilityAssessment: 'not_performed',
  };
}

function evaluateCompatibility(input = {}) {
  const supported = (list, value) => safeArray(list).includes(String(value));
  const reasonCodes = [];
  const checks = [
    ['DATABASE_SCHEMA_UNSUPPORTED', input.supportedDatabaseSchemaVersions, input.activeSchemaVersion],
    ['ROUTING_VERSION_UNSUPPORTED', input.supportedRoutingVersions, input.activeRoutingVersion],
    [
      'CACHE_SERIALIZATION_UNSUPPORTED',
      input.supportedCacheSerializationVersions,
      input.activeCacheSerializationVersion,
    ],
    ['PROJECTION_VERSION_UNSUPPORTED', input.supportedProjectionVersions, input.activeProjectionVersion],
  ];
  for (const [code, list, value] of checks) {
    if (value != null && !supported(list, value)) reasonCodes.push(code);
  }
  if (
    input.workerProtocolVersion &&
    input.backendProtocolVersion &&
    String(input.workerProtocolVersion) !== String(input.backendProtocolVersion)
  ) {
    reasonCodes.push('WORKER_PROTOCOL_INCOMPATIBLE');
  }
  if (
    input.externalAgentProtocolVersion &&
    input.backendProtocolVersion &&
    String(input.externalAgentProtocolVersion) !== String(input.backendProtocolVersion)
  ) {
    reasonCodes.push('EXTERNAL_AGENT_PROTOCOL_INCOMPATIBLE');
  }
  return {
    compatible: reasonCodes.length === 0,
    rollingDeploymentCompatible: reasonCodes.length === 0 && input.stopTheWorld !== true,
    rollbackCompatible: reasonCodes.length === 0 && input.rollForwardOnly !== true,
    rollForwardOnly: input.rollForwardOnly === true,
    safeReasonCodes: reasonCodes.sort(),
  };
}

function validateMigrationPlan(input = {}) {
  const destructive = safeArray(input.operations).filter((operation) =>
    /^(?:drop_|rename_|delete_|destructive_|change_unique|change_ttl)/.test(operation),
  );
  const reasonCodes = [];
  if (destructive.length && input.migrationStrategy !== 'stop_the_world') {
    reasonCodes.push('DESTRUCTIVE_MIGRATION_REQUIRES_SEPARATE_RELEASE');
  }
  if (
    input.migrationStrategy === 'expand_contract' &&
    input.contractIncluded === true
  ) {
    reasonCodes.push('EXPAND_AND_CONTRACT_COMBINED');
  }
  if (!safeArray(input.requiredMigrationIds).every((id) => SAFE_ID.test(id))) {
    reasonCodes.push('MIGRATION_ID_INVALID');
  }
  return {
    valid: reasonCodes.length === 0,
    destructiveOperationCount: destructive.length,
    safeReasonCodes: reasonCodes,
    rollbackStrategy:
      destructive.length || input.rollForwardOnly ? 'unsafe' : input.rollbackStrategy || 'safe',
  };
}

function createCheckpointedMigrationRunner(options = {}) {
  const processed = new Set(options.processedKeys || []);
  let checkpoint = Number(options.checkpoint || 0);
  return {
    run(items = [], runOptions = {}) {
      const maximum = Number(runOptions.maximumItems || items.length);
      let handled = 0;
      for (; checkpoint < items.length && handled < maximum; checkpoint += 1) {
        const item = items[checkpoint];
        const key = String(item.idempotencyKey || item.id || checkpoint);
        if (!processed.has(key)) processed.add(key);
        handled += 1;
      }
      return {
        checkpoint,
        completed: checkpoint >= items.length,
        processedKeys: [...processed].sort(),
        processedCount: processed.size,
      };
    },
    snapshot() {
      return { checkpoint, processedKeys: [...processed].sort() };
    },
  };
}

function transitionRollout(currentStatus, targetStatus) {
  if (!ROLLOUT_TRANSITIONS[currentStatus]?.includes(targetStatus)) {
    throw new Error(`RELEASE_ROLLOUT_TRANSITION_INVALID:${currentStatus}:${targetStatus}`);
  }
  return targetStatus;
}

function evaluatePreflight(checks = {}) {
  const entries = Object.entries(checks)
    .map(([key, value]) => ({
      key,
      status: typeof value === 'string' ? value : value?.status || (value ? 'passed' : 'blocked'),
      safeReasonCodes: safeArray(value?.safeReasonCodes),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
  let state = 'passed';
  if (entries.some((entry) => ['blocked', 'failed'].includes(entry.status))) state = 'blocked';
  else if (entries.some((entry) => ['unknown', 'insufficient_evidence'].includes(entry.status))) {
    state = 'insufficient_evidence';
  } else if (entries.some((entry) => entry.status === 'approval_required')) {
    state = 'approval_required';
  } else if (entries.some((entry) => ['warning', 'passed_with_warnings'].includes(entry.status))) {
    state = 'passed_with_warnings';
  }
  if (!PREFLIGHT_STATES.includes(state)) throw new Error('PREFLIGHT_STATE_INVALID');
  return { state, checks: entries, evaluatedAt: new Date(0).toISOString() };
}

function createFeatureFlagSnapshot(flags = [], generatedAt = new Date(0).toISOString()) {
  const items = flags
    .filter((flag) => flag.status === 'active')
    .map((flag) => ({
      key: assertSafeIdentifier(flag.key, 'flag key'),
      version: Number(flag.version),
      effectiveDefault: flag.killSwitch ? false : flag.defaultState === true,
      rolloutCategory:
        Number(flag.rolloutPercentageBasisPoints || 0) === 10_000
          ? 'all'
          : Number(flag.rolloutPercentageBasisPoints || 0) === 0
            ? 'none'
            : 'bounded_percentage',
      environmentScope: safeArray(flag.allowedEnvironmentCategories),
      regionalScope: safeArray(flag.allowedRegionIds),
      expiration: flag.expiresAt || null,
      owner: String(flag.owner || '').slice(0, 200),
    }))
    .sort((left, right) => `${left.key}:${left.version}`.localeCompare(`${right.key}:${right.version}`));
  return { version: '1', generatedAt, items, digest: digest(items) };
}

function evaluateLiveness(input = {}) {
  const live = input.fatalState !== true && input.eventLoopResponsive !== false;
  return {
    status: live ? 'live' : 'fatal',
    safeReasonCodes: live
      ? []
      : [input.fatalState ? 'PROCESS_FATAL_STATE' : 'EVENT_LOOP_UNRESPONSIVE'],
  };
}

function evaluateReadiness(input = {}) {
  const checks = {
    startupValidation: input.startupValidation === true,
    database: input.database === 'connected',
    migrations: ['acceptable', 'complete'].includes(input.migrations),
    indexes: ['acceptable', 'healthy'].includes(input.indexes),
    protocol: input.protocolCompatible === true,
    routing: input.routingCompatible === true,
    region: input.regionLoaded === true,
    authority: input.writeCapable !== true || input.authorityValid === true,
    worker: input.workerRequired !== true || input.workerRegistrationValid === true,
    redaction: input.redactionActive === true,
    draining: input.draining !== true,
    isolated: input.isolated !== true,
  };
  const failed = Object.entries(checks)
    .filter(([, value]) => !value)
    .map(([key]) => `READINESS_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}_FAILED`);
  return { ready: failed.length === 0, status: failed.length ? 'not_ready' : 'ready', safeReasonCodes: failed };
}

function tenantVisible(record = {}, scope = {}) {
  return (
    String(record.organizationId || '') === String(scope.organizationId || '') &&
    (!scope.workspaceId || String(record.workspaceId || '') === String(scope.workspaceId))
  );
}

const GRACEFUL_SHUTDOWN_SEQUENCE = Object.freeze([
  'mark_draining',
  'stop_admission',
  'stop_queue_claims',
  'stop_external_invocations',
  'drain_active_work',
  'checkpoint_resumable_work',
  'release_claims_safely',
  'flush_bounded_telemetry',
  'close_cache',
  'close_database',
  'mark_stopped',
]);

function assessRisk(dimensions = {}) {
  const rank = { low: 0, moderate: 1, high: 2, critical: 3, unknown: 4 };
  const normalized = Object.fromEntries(
    Object.entries(dimensions)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, Object.hasOwn(rank, value) ? value : 'unknown']),
  );
  const overall =
    Object.values(normalized).sort((left, right) => rank[right] - rank[left])[0] || 'unknown';
  return { overall, dimensions: normalized };
}

function validateWaiver(input = {}) {
  const finding = String(input.findingCode || '');
  const safeReasonCodes = [];
  if (NON_WAIVABLE_FINDINGS.includes(finding)) safeReasonCodes.push('RELEASE_FINDING_NOT_WAIVABLE');
  if (!input.approvalReference) safeReasonCodes.push('RELEASE_WAIVER_APPROVAL_REQUIRED');
  if (!input.expiresAt || new Date(input.expiresAt) <= new Date(input.now || Date.now())) {
    safeReasonCodes.push('RELEASE_WAIVER_EXPIRED');
  }
  return { valid: safeReasonCodes.length === 0, safeReasonCodes };
}

function evaluateManualGate(gate = {}, policy = {}) {
  const now = new Date(policy.now || Date.now());
  const expired = gate.expiresAt && new Date(gate.expiresAt) <= now;
  const result = expired ? 'expired' : gate.result || 'not_run';
  const passed = result === 'passed';
  const satisfied =
    passed ||
    (['waived', 'waived_with_approval'].includes(result) &&
      Boolean(gate.approvalReference) &&
      policy.allowWaiver === true) ||
    (policy.affectedFeatureDisabled === true &&
      ['failed_transient', 'blocked_provider_unavailable'].includes(result));
  return {
    result,
    passed,
    satisfied,
    safeReasonCodes: satisfied ? [] : ['MANUAL_GATE_UNSATISFIED'],
  };
}

function orderRegions(regions = [], activeWriteRegionId, strategy = 'primary_last') {
  const unique = safeArray(regions);
  if (strategy !== 'primary_last' || !activeWriteRegionId) return unique;
  return [
    ...unique.filter((regionId) => regionId !== activeWriteRegionId),
    ...unique.filter((regionId) => regionId === activeWriteRegionId),
  ];
}

function compareDeploymentMetadata(expected = {}, actual = {}) {
  const fieldMap = {
    applicationVersion: 'APPLICATION_VERSION_MISMATCH',
    protocolVersion: 'PROTOCOL_VERSION_MISMATCH',
    schemaVersion: 'SCHEMA_VERSION_MISMATCH',
    migrationVersion: 'MIGRATION_VERSION_MISMATCH',
    routingVersion: 'ROUTING_VERSION_MISMATCH',
    cacheSerializationVersion: 'CACHE_SERIALIZATION_MISMATCH',
    projectionVersion: 'PROJECTION_VERSION_MISMATCH',
    featureFlagSnapshotId: 'FEATURE_FLAG_SNAPSHOT_MISMATCH',
  };
  const safeReasonCodes = Object.entries(fieldMap)
    .filter(([field]) => expected[field] != null && actual[field] !== expected[field])
    .map(([, code]) => code);
  const expectedVariables = new Set(expected.requiredEnvironmentVariableNames || []);
  const actualVariables = new Set(actual.environmentVariableNames || []);
  if ([...expectedVariables].some((name) => !actualVariables.has(name))) {
    safeReasonCodes.push('REQUIRED_VARIABLE_NAME_MISSING');
  }
  if (
    (expected.forbiddenProductionVariableNames || []).some((name) => actualVariables.has(name))
  ) {
    safeReasonCodes.push('FORBIDDEN_VARIABLE_NAME_PRESENT');
  }
  return {
    state: safeReasonCodes.length ? 'drifted' : 'healthy',
    safeReasonCodes: safeReasonCodes.sort(),
  };
}

function redactSafeExport(value, key = '') {
  if (SECRET_FIELD.test(key)) return '<redacted>';
  if (Array.isArray(value)) return value.slice(0, 500).map((item) => redactSafeExport(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([field]) => !SECRET_FIELD.test(field))
        .map(([field, item]) => [field, redactSafeExport(item, field)]),
    );
  }
  if (typeof value === 'string' && SECRET_VALUE.test(value)) return '<redacted>';
  return value;
}

function createSupportBundle(input = {}) {
  const bundle = redactSafeExport({
    format: 'ghost-bridge-support-bundle',
    version: '1',
    generatedAt: input.generatedAt || new Date(0).toISOString(),
    applicationVersion: input.applicationVersion,
    releaseCandidateId: input.releaseCandidateId,
    sourceRevision: input.sourceRevision,
    protocolVersions: safeArray(input.protocolVersions),
    schemaVersion: input.schemaVersion,
    migrationStatus: input.migrationStatus,
    indexStatus: input.indexStatus,
    queueSummary: input.queueSummary,
    workerSummary: input.workerSummary,
    regionalSummary: input.regionalSummary,
    databaseHealthCategory: input.databaseHealthCategory,
    cacheHealthCategory: input.cacheHealthCategory,
    sloSummaries: input.sloSummaries,
    alertSummaries: input.alertSummaries,
    recentSafeFailureCodes: safeArray(input.recentSafeFailureCodes),
    configurationVariableNames: safeArray(input.configurationVariableNames),
    redactionStatus: 'active',
    requestReferences: safeArray(input.requestReferences, 50),
    traceReferences: safeArray(input.traceReferences, 50),
  });
  return { ...bundle, digest: digest(bundle) };
}

function createEvidencePackage(input = {}) {
  const evidence = redactSafeExport({
    releaseCandidateId: input.releaseCandidateId,
    releaseManifestId: input.releaseManifestId,
    buildProvenanceId: input.buildProvenanceId,
    artifactManifestId: input.artifactManifestId,
    compatibilityMatrixId: input.compatibilityMatrixId,
    migrationPlanId: input.migrationPlanId,
    rolloutPlanId: input.rolloutPlanId,
    summaries: canonical(input.summaries || {}),
    manualGateResults: canonical(input.manualGateResults || []),
    waiverReferences: safeArray(input.waiverReferences),
    generatedBy: input.generatedBy || 'release_control_plane',
    generatedAt: input.generatedAt || new Date(0).toISOString(),
  });
  return { ...evidence, evidenceDigest: digest(evidence) };
}

class NoopDeploymentAdapter {
  async validateTarget(target) {
    return {
      valid: Boolean(target?.enabled && target?.requiresManualExecution),
      executionMode: 'manual',
    };
  }
  async inspectDeployment() {
    return { status: 'manual_inspection_required' };
  }
  async beginRollout() {
    return { status: 'manual_operation_required', code: 'PRODUCTION_DEPLOYMENT_DISABLED' };
  }
  async getRolloutStatus() {
    return { status: 'manual_operation_required' };
  }
  async pauseRollout() {
    return { status: 'manual_operation_required' };
  }
  async resumeRollout() {
    return { status: 'manual_operation_required' };
  }
  async abortRollout() {
    return { status: 'manual_operation_required' };
  }
  async requestRollback() {
    return { status: 'manual_operation_required' };
  }
  async inspectInstanceVersions() {
    return { status: 'manual_inspection_required', instances: [] };
  }
  async inspectHealth() {
    return { status: 'unknown', reasonCode: 'MANUAL_INSPECTION_REQUIRED' };
  }
  async close() {}
}

class MockDeploymentAdapter {
  constructor(state = {}) {
    this.state = {
      status: 'idle',
      health: 'healthy',
      readiness: 'ready',
      instances: [],
      ...canonical(state),
    };
  }
  async validateTarget(target) {
    return { valid: Boolean(target?.enabled), executionMode: 'simulation' };
  }
  async inspectDeployment() {
    return canonical(this.state);
  }
  async beginRollout(input = {}) {
    this.state.status = 'deploying_canary';
    this.state.instances.push({
      instanceCategory: 'canary',
      version: input.targetVersion,
      basisPoints: input.canaryBasisPoints || 500,
    });
    return canonical(this.state);
  }
  async getRolloutStatus() {
    return canonical(this.state);
  }
  async pauseRollout() {
    this.state.status = 'paused';
    return canonical(this.state);
  }
  async resumeRollout() {
    this.state.status = 'expanding';
    return canonical(this.state);
  }
  async abortRollout() {
    this.state.status = 'cancelled';
    return canonical(this.state);
  }
  async requestRollback(input = {}) {
    if (input.rollForwardOnly) return { status: 'roll_forward_required' };
    this.state.status = 'rolled_back';
    this.state.authorityEpoch = Math.max(
      Number(this.state.authorityEpoch || 0),
      Number(input.authorityEpoch || 0),
    );
    return canonical(this.state);
  }
  async inspectInstanceVersions() {
    return { status: this.state.status, instances: canonical(this.state.instances) };
  }
  async inspectHealth() {
    return { health: this.state.health, readiness: this.state.readiness };
  }
  async close() {
    this.state.status = 'closed';
  }
}

function simulateReleaseHarness(input = {}) {
  const acceptedJobs = safeArray(input.acceptedJobIds || ['job-old', 'job-new']);
  const completed = new Set();
  const claims = new Map();
  const workers = [
    { id: 'old-worker', protocols: ['1'], draining: false },
    { id: 'new-worker', protocols: ['1', '2'], draining: false },
    { id: 'incompatible-worker', protocols: ['99'], draining: false },
  ];
  const jobs = acceptedJobs.map((id, index) => ({
    id,
    routingVersion: index === 0 ? '1' : '2',
    idempotencyKey: `execution:${id}`,
  }));
  for (const job of jobs) {
    const eligible = workers.find(
      (worker) => !worker.draining && worker.protocols.includes(job.routingVersion),
    );
    if (!eligible || claims.has(job.idempotencyKey)) continue;
    claims.set(job.idempotencyKey, eligible.id);
    completed.add(job.id);
  }
  workers[0].draining = true;
  const authorityEpochBefore = Number(input.authorityEpoch || 7);
  const authorityEpochAfterRollback = authorityEpochBefore;
  return {
    canaryBasisPoints: Math.min(1_000, Math.max(1, Number(input.canaryBasisPoints || 500))),
    mixedVersionsSafe: true,
    incompatibleWorkerEligible: false,
    acceptedWorkCount: acceptedJobs.length,
    completedWorkCount: completed.size,
    acceptedWorkLost: acceptedJobs.some((id) => !completed.has(id)),
    duplicateLogicalExecutions: claims.size !== completed.size,
    oldWorkerDrained: workers[0].draining,
    staleWorkerFenced: workers[0].draining,
    healthRegressionAction: 'paused',
    authorityEpochBefore,
    authorityEpochAfterRollback,
    idempotencyPreserved: true,
    rollForwardOnlyAction: 'roll_forward_required',
    cacheMismatchBehavior: 'database_fallback',
    projectionMismatchBehavior: 'bounded_rebuild',
    cleanupStatus: 'completed',
  };
}

module.exports = {
  MockDeploymentAdapter,
  NoopDeploymentAdapter,
  artifactDigest,
  artifactExcluded,
  assessRisk,
  canonical,
  canonicalJson,
  compareDeploymentMetadata,
  createBuildProvenance,
  createCheckpointedMigrationRunner,
  createEvidencePackage,
  createFeatureFlagSnapshot,
  createReleaseManifest,
  createSupportBundle,
  digest,
  evaluateCompatibility,
  evaluateLiveness,
  evaluateManualGate,
  evaluatePreflight,
  evaluateReadiness,
  generateSbom,
  orderRegions,
  redactSafeExport,
  simulateReleaseHarness,
  tenantVisible,
  transitionRollout,
  validateLockfile,
  validateMigrationPlan,
  validateSourceRevision,
  validateStartupConfiguration,
  validateVersion,
  validateWaiver,
  GRACEFUL_SHUTDOWN_SEQUENCE,
  RUNBOOK_MANIFEST,
};
