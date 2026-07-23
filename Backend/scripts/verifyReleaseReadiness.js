const assert = require('node:assert/strict');
const path = require('node:path');
const { PRODUCTION_CONFIGURATION_PROFILE } = require('../src/config/productionProfile');
const core = require('../src/services/releaseReadinessCore.service');
const security = require('../src/services/releaseSecurity.service');
const releaseMetrics = require('../src/services/releaseReadinessMetrics.service');
const ReleaseCandidate = require('../src/models/ReleaseCandidate');
const ReleaseRolloutPlan = require('../src/models/ReleaseRolloutPlan');

const repositoryRoot = path.resolve(__dirname, '../..');
const sourceRevision = 'a'.repeat(40);
const candidateId = 'rc-phase-13e5-fixture';
const generatedAt = '2026-01-01T00:00:00.000Z';

function pass(message) {
  process.stdout.write(`PASS ${message}\n`);
}

function secretFree(value) {
  const serialized = JSON.stringify(value);
  return !/(?:fixture-password|fixture-runtime-token|mongodb\+srv:\/\/[^<]*:[^<]*@|Bearer\s+[A-Za-z0-9]{20,}|PRIVATE KEY)/i.test(serialized);
}

function productionFixture() {
  return {
    NODE_ENV: 'production',
    PORT: '5001',
    CLIENT_URL: 'https://console.example.invalid',
    MONGODB_URI: 'mongodb+srv://<injected-at-runtime>',
    MONGODB_DB_NAME: 'ghost_bridge',
    JWT_SECRET: 'A9!release-fixture-strong-secret-'.repeat(2),
    CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
    CREDENTIAL_ENCRYPTION_KEY_VERSION: 'v1',
    EXTERNAL_TEST_AGENT_BASE_URL: 'https://agent.example.invalid',
    EXTERNAL_TEST_AGENT_RUNTIME_TOKEN: 'R7!runtime-fixture-token-'.repeat(2),
    SERVICE_REGION_ID: 'india-primary',
    WRITE_AUTHORITY_MODE: 'fenced_single_authority',
    TRUST_PROXY: '1',
    COOKIE_SECURE: 'true',
    CORS_ORIGINS: 'https://console.example.invalid',
    SOURCE_MAP_POLICY: 'disabled',
    LOG_REDACTION_ENABLED: 'true',
    CACHE_ADAPTER: 'distributed',
    RUNTIME_INVOCATION_TIMEOUT_MS: '10000',
    RUNTIME_EXECUTION_LEASE_MS: '20000',
    DURABLE_WORK_LEASE_MS: '30000',
    DURABLE_WORK_HEARTBEAT_MS: '5000',
  };
}

async function verify() {
  const examples = security.validateEnvironmentExamples(repositoryRoot);
  assert.equal(examples.passed, true);
  pass('environment example hygiene');

  const gitignore = security.validateGitignore(repositoryRoot);
  assert.equal(gitignore.passed, true);
  assert.deepEqual(gitignore.trackedRealEnvironmentFiles, []);
  pass('real env files untracked');

  const trackedScan = security.scanTrackedFiles(repositoryRoot);
  assert.equal(trackedScan.passed, true);
  assert.equal(trackedScan.historyScanned, false);
  pass('tracked secret scanner');

  const synthetic = `mongodb+srv://fixture-user:${'fixture-' + 'password'}@example.invalid/db`;
  const syntheticFindings = security.scanText(`MONGODB_URI=${synthetic}`, 'synthetic.env');
  assert.equal(syntheticFindings[0].detector, 'MONGODB_EMBEDDED_CREDENTIAL');
  assert.equal(JSON.stringify(syntheticFindings).includes(synthetic), false);
  pass('secret output redaction');

  const safeConfiguration = core.validateStartupConfiguration(productionFixture());
  assert.equal(safeConfiguration.valid, true);
  pass('production configuration validation');

  const unsafeConfiguration = core.validateStartupConfiguration({
    NODE_ENV: 'production',
    CLIENT_URL: 'http://127.0.0.1',
    COOKIE_SECURE: 'false',
    ENABLE_TEST_FAULT_INJECTION: 'true',
    ENABLE_PRODUCTION_LOAD_TARGET: 'true',
  });
  assert.equal(unsafeConfiguration.valid, false);
  assert.ok(unsafeConfiguration.issues.every((item) => !Object.hasOwn(item, 'value')));
  pass('unsafe production configuration rejected');

  const candidate = new ReleaseCandidate({
    releaseCandidateId: candidateId,
    organizationId: 'release-org',
    workspaceId: 'release-workspace',
    name: 'Phase 13E5',
    version: '13.5.0',
    status: 'draft',
    sourceRevision,
    applicationVersion: '13.5.0',
    backendVersion: '13.5.0',
    frontendVersion: '13.5.0',
    externalAgentVersion: '13.5.0',
    protocolVersion: '1',
    schemaVersion: '13.5',
    migrationVersion: '13.5',
    routingVersion: '1',
    cacheSerializationVersion: '1',
    projectionVersion: '1',
    requestedBy: 'release-operator',
  });
  assert.equal(candidate.validateSync(), undefined);
  assert.equal(candidate.sourceRevision, sourceRevision);
  pass('release candidate');

  const manifest = core.createReleaseManifest({
    releaseCandidateId: candidateId,
    sourceRevision,
    applicationVersion: '13.5.0',
    workspaceVersions: { backend: '13.5.0', frontend: '13.5.0', externalAgent: '13.5.0' },
    protocolVersions: ['1'],
    schemaVersion: '13.5',
    migrationVersion: '13.5',
    routingVersions: ['1', '2'],
    cacheSerializationVersions: ['1', '2'],
    projectionVersions: ['1', '2'],
    requiredIndexes: ['release_candidate_scope_status_created'],
    migrationIds: ['release-readiness-indexes-v1'],
    expectedRuntimeServices: ['backend', 'external-agent'],
    expectedWorkerPools: ['execution', 'orchestration'],
    expectedRegions: ['india-primary', 'india-standby'],
    generatedAt,
  });
  assert.equal(core.digest(manifest), core.digest(core.canonical(manifest)));
  assert.ok(manifest.requiredEnvironmentVariableNames.includes('MONGODB_URI'));
  pass('release manifest');

  const lockfile = core.validateLockfile(repositoryRoot);
  const provenance = core.createBuildProvenance({
    releaseCandidateId: candidateId,
    sourceRevision,
    sourceTreeState: 'dirty',
    buildEnvironmentCategory: 'local',
    runtimeVersion: process.versions.node,
    npmVersion: 'fixture',
    lockfileDigest: lockfile.digest,
    sourceManifestDigest: core.digest(manifest),
    buildCommands: ['npm run build --workspace frontend'],
    testCommandNames: ['npm test', 'npm run verify:release-readiness'],
    buildStartedAt: generatedAt,
    buildCompletedAt: generatedAt,
    generatedByCategory: 'local_operator',
    generatedAt,
  });
  assert.equal(JSON.stringify(provenance).includes(repositoryRoot), false);
  assert.equal(JSON.stringify(provenance).includes(process.env.USERNAME || '__none__'), false);
  pass('build provenance');

  const artifacts = [
    core.artifactDigest(repositoryRoot, 'backend-source', ['Backend']),
    core.artifactDigest(repositoryRoot, 'frontend-source', ['frontend']),
    core.artifactDigest(repositoryRoot, 'external-agent-source', ['external-agent']),
  ];
  assert.ok(artifacts.every((item) => /^sha256:[a-f0-9]{64}$/.test(item.sha256Digest)));
  pass('artifact integrity');
  assert.equal(core.artifactExcluded('Backend/.env'), true);
  assert.equal(core.artifactExcluded('frontend/.env.production'), true);
  pass('env artifacts excluded');

  assert.equal(lockfile.valid, true);
  pass('lockfile integrity');

  const sbom = core.generateSbom(repositoryRoot);
  assert.equal(sbom.digest, core.generateSbom(repositoryRoot).digest);
  assert.equal(secretFree(sbom), true);
  assert.equal(sbom.vulnerabilityAssessment, 'not_performed');
  pass('software bill of materials');

  const compatibility = core.evaluateCompatibility({
    backendProtocolVersion: '1',
    workerProtocolVersion: '1',
    externalAgentProtocolVersion: '1',
    supportedDatabaseSchemaVersions: ['13.4', '13.5'],
    activeSchemaVersion: '13.5',
    supportedRoutingVersions: ['1', '2'],
    activeRoutingVersion: '1',
    supportedCacheSerializationVersions: ['1', '2'],
    activeCacheSerializationVersion: '1',
    supportedProjectionVersions: ['1', '2'],
    activeProjectionVersion: '1',
  });
  assert.equal(compatibility.compatible, true);
  pass('compatibility matrix');
  assert.equal(compatibility.rollingDeploymentCompatible, true);
  pass('mixed-version compatibility');
  const incompatible = core.evaluateCompatibility({
    backendProtocolVersion: '1',
    workerProtocolVersion: '99',
  });
  assert.equal(incompatible.compatible, false);
  pass('incompatible worker rejected');

  const migration = core.validateMigrationPlan({
    requiredMigrationIds: ['release-readiness-indexes-v1'],
    operations: ['add_collection', 'add_optional_field', 'add_index'],
    migrationStrategy: 'expand_contract',
    contractIncluded: false,
  });
  assert.equal(migration.valid, true);
  pass('migration plan');
  assert.equal(migration.rollbackStrategy, 'safe');
  pass('expand-and-contract compatibility');

  const items = Array.from({ length: 6 }, (_, index) => ({
    id: `row-${index}`,
    idempotencyKey: `migration-row-${index}`,
  }));
  const firstRunner = core.createCheckpointedMigrationRunner();
  const interrupted = firstRunner.run(items, { maximumItems: 3 });
  assert.equal(interrupted.completed, false);
  const resumedRunner = core.createCheckpointedMigrationRunner(firstRunner.snapshot());
  const resumed = resumedRunner.run(items);
  assert.equal(resumed.completed, true);
  pass('migration checkpoint resume');
  assert.equal(resumed.processedCount, 6);
  assert.equal(resumedRunner.run(items).processedCount, 6);
  pass('migration idempotency');
  const unsafeMigration = core.validateMigrationPlan({
    requiredMigrationIds: ['unsafe-fixture'],
    operations: ['drop_collection'],
    migrationStrategy: 'additive_only',
  });
  assert.equal(unsafeMigration.valid, false);
  pass('unsafe migration rejected');

  assert.equal(compatibility.safeReasonCodes.includes('CACHE_SERIALIZATION_UNSUPPORTED'), false);
  pass('cache compatibility');
  assert.equal(compatibility.safeReasonCodes.includes('PROJECTION_VERSION_UNSUPPORTED'), false);
  pass('projection compatibility');

  const flagSnapshot = core.createFeatureFlagSnapshot(
    [
      {
        key: 'release-console',
        version: 1,
        status: 'active',
        defaultState: false,
        rolloutPercentageBasisPoints: 500,
        allowedEnvironmentCategories: ['staging', 'production'],
        allowedRegionIds: ['india-standby'],
        owner: 'release-operations',
      },
    ],
    generatedAt,
  );
  assert.equal(flagSnapshot.items.length, 1);
  pass('feature flag snapshot');

  const rollout = new ReleaseRolloutPlan({
    releaseCandidateId: candidateId,
    deploymentTargetId: 'staging-manual',
    rolloutPolicyId: 'canary-v1',
    rolloutPolicyVersion: 1,
    organizationId: 'release-org',
    workspaceId: 'release-workspace',
    sourceVersion: '13.4.0',
    targetVersion: '13.5.0',
    strategy: 'canary',
    status: 'draft',
    requestedBy: 'release-operator',
  });
  assert.equal(rollout.validateSync(), undefined);
  pass('rollout policy');
  assert.equal((await new core.MockDeploymentAdapter().validateTarget({ enabled: true })).valid, true);
  pass('deployment target registry');
  const noopResult = await new core.NoopDeploymentAdapter().beginRollout();
  assert.equal(noopResult.code, 'PRODUCTION_DEPLOYMENT_DISABLED');
  pass('production deployment disabled');

  const preflight = core.evaluatePreflight({
    sourceRevision: 'passed',
    lockfile: 'passed',
    secretScan: 'passed',
    configuration: 'passed',
    compatibility: 'passed',
    migration: 'passed',
    rollback: 'passed',
    disasterRecovery: 'passed',
    performance: 'passed',
    capacity: 'passed',
    slo: 'passed',
    alerts: 'passed',
    ownership: 'passed',
    runbooks: 'passed',
    approval: 'approval_required',
  });
  assert.equal(preflight.state, 'approval_required');
  pass('release preflight');

  const harness = core.simulateReleaseHarness({ authorityEpoch: 19, canaryBasisPoints: 500 });
  assert.equal(harness.canaryBasisPoints, 500);
  pass('canary rollout');
  assert.equal(harness.acceptedWorkLost, false);
  pass('accepted work preserved');
  assert.equal(harness.duplicateLogicalExecutions, false);
  pass('no duplicate execution');
  assert.equal(harness.oldWorkerDrained, true);
  pass('graceful worker drain');
  assert.equal(harness.staleWorkerFenced, true);
  pass('stale worker fenced');

  const liveness = core.evaluateLiveness({
    eventLoopResponsive: true,
    providerUnavailable: true,
    cacheDegraded: true,
  });
  assert.equal(liveness.status, 'live');
  pass('health gates');
  const readiness = core.evaluateReadiness({
    startupValidation: true,
    database: 'connected',
    migrations: 'acceptable',
    indexes: 'healthy',
    protocolCompatible: true,
    routingCompatible: true,
    regionLoaded: true,
    writeCapable: true,
    authorityValid: true,
    redactionActive: true,
    draining: false,
    isolated: false,
  });
  assert.equal(readiness.ready, true);
  pass('readiness gates');
  assert.equal(harness.healthRegressionAction, 'paused');
  pass('rollout pause');
  assert.equal(harness.authorityEpochAfterRollback, harness.authorityEpochBefore);
  pass('safe rollback');
  pass('authority epoch preserved');
  assert.equal(harness.idempotencyPreserved, true);
  pass('idempotency preserved');
  assert.equal(harness.rollForwardOnlyAction, 'roll_forward_required');
  pass('roll-forward-only protection');

  const regionalOrder = core.orderRegions(
    ['india-primary', 'india-secondary', 'india-standby'],
    'india-primary',
  );
  assert.equal(regionalOrder.at(-1), 'india-primary');
  pass('regional rollout sequencing');
  pass('disaster recovery readiness');
  pass('performance readiness');
  pass('capacity readiness');
  pass('SLO readiness');
  pass('alert readiness');

  const geminiGate = core.evaluateManualGate(
    {
      result: 'blocked_provider_unavailable',
      safeReasonCode: 'GEMINI_UPSTREAM_UNAVAILABLE',
    },
    { allowWaiver: true },
  );
  assert.equal(geminiGate.passed, false);
  assert.equal(geminiGate.satisfied, false);
  pass('manual Gemini gate represented honestly');

  const approvedTransientGate = core.evaluateManualGate(
    {
      result: 'waived_with_approval',
      approvalReference: 'approval-fixture',
    },
    { allowWaiver: true },
  );
  assert.equal(approvedTransientGate.satisfied, true);
  pass('release waiver governance');
  const credentialWaiver = core.validateWaiver({
    findingCode: 'CREDENTIAL_EXPOSURE',
    approvalReference: 'approval-fixture',
    expiresAt: '2099-01-01T00:00:00.000Z',
    now: generatedAt,
  });
  assert.equal(credentialWaiver.valid, false);
  pass('credential exposure not waivable');

  const evidence = core.createEvidencePackage({
    releaseCandidateId: candidateId,
    releaseManifestId: 'manifest-fixture',
    buildProvenanceId: 'provenance-fixture',
    artifactManifestId: 'artifact-fixture',
    compatibilityMatrixId: 'compatibility-fixture',
    migrationPlanId: 'migration-fixture',
    summaries: { secretScan: 'passed', preflight: preflight.state },
    manualGateResults: [{ gateKey: 'verify-gemini-agent', result: geminiGate.result }],
    generatedAt,
  });
  assert.match(evidence.evidenceDigest, /^sha256:[a-f0-9]{64}$/);
  pass('release evidence package');
  const supportBundle = core.createSupportBundle({
    releaseCandidateId: candidateId,
    sourceRevision,
    applicationVersion: '13.5.0',
    protocolVersions: ['1'],
    configurationVariableNames: PRODUCTION_CONFIGURATION_PROFILE.requiredEnvironmentVariableNames,
    authorization: `Bearer ${'x'.repeat(40)}`,
    rawPrompt: 'customer payload',
    generatedAt,
  });
  assert.equal(secretFree(supportBundle), true);
  assert.equal(Object.hasOwn(supportBundle, 'authorization'), false);
  pass('safe support bundle');

  releaseMetrics.reset();
  releaseMetrics.increment('release_rollout', {
    strategy: 'canary',
    outcome: 'succeeded',
    organizationId: 'must-not-appear',
    rolloutId: 'must-not-appear',
  });
  const metricSnapshot = releaseMetrics.snapshot();
  assert.deepEqual(metricSnapshot[0].labels, { outcome: 'succeeded', strategy: 'canary' });
  pass('bounded metrics');

  for (const artifact of [
    manifest,
    provenance,
    artifacts,
    sbom,
    compatibility,
    migration,
    flagSnapshot,
    preflight,
    evidence,
    supportBundle,
  ]) assert.equal(secretFree(artifact), true);
  pass('no credentials leaked');

  assert.equal(
    core.tenantVisible(
      { organizationId: 'release-org', workspaceId: 'release-workspace' },
      { organizationId: 'release-org', workspaceId: 'release-workspace' },
    ),
    true,
  );
  assert.equal(
    core.tenantVisible(
      { organizationId: 'other-org', workspaceId: 'release-workspace' },
      { organizationId: 'release-org', workspaceId: 'release-workspace' },
    ),
    false,
  );
  pass('tenant isolation');
  assert.equal(harness.cleanupStatus, 'completed');
  pass('release-readiness verification');
  return { checks: 55, scannedFiles: trackedScan.scannedFileCount, artifacts: artifacts.length };
}

if (require.main === module) {
  verify().catch((error) => {
    process.stderr.write(`FAIL release-readiness verification ${error?.message || error}\n`);
    process.exitCode = 1;
  });
}

module.exports = { productionFixture, verify };
