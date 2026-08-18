const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const core = require('../services/releaseReadinessCore.service');
const security = require('../services/releaseSecurity.service');
const {
  PERMISSION_REGISTRY_VERSION,
  getPermission,
} = require('../constants/permissionRegistry');
const { permissionsForBuiltInRole } = require('../constants/builtInRoles');

const repositoryRoot = path.resolve(__dirname, '../../..');

function safeScannerDiagnostic(findings) {
  return JSON.stringify(
    findings.map(({ detector, filePath, lineNumber }) => ({
      detector,
      filePath,
      lineNumber,
      redacted: `<redacted:${detector}>`,
    })),
  );
}

test('production validation returns stable safe codes without values', () => {
  const result = core.validateStartupConfiguration({
    NODE_ENV: 'production',
    JWT_SECRET: 'weak',
    COOKIE_SECURE: 'false',
    ENABLE_TEST_FAULT_INJECTION: 'true',
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === 'CONFIG_SECRET_TOO_WEAK'));
  assert.ok(
    result.issues.some(
      (issue) => issue.code === 'CONFIG_PRODUCTION_FAULT_INJECTION_ENABLED',
    ),
  );
  assert.ok(result.issues.every((issue) => Object.keys(issue).sort().join(',') === 'category,code,variableName'));
});

test('tracked secret detector identifies and redacts synthetic credentials', () => {
  const value = `mongodb+srv://fixture:${'synthetic-' + 'password'}@example.invalid/db`;
  const findings = security.scanText(`MONGODB_URI=${value}`, 'fixture.env');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].detector, 'MONGODB_EMBEDDED_CREDENTIAL');
  assert.equal(JSON.stringify(findings).includes(value), false);
});

test('repository environment hygiene and tracked scanner pass', () => {
  assert.equal(security.validateEnvironmentExamples(repositoryRoot).passed, true);
  assert.equal(security.validateGitignore(repositoryRoot).passed, true);
  const scan = security.scanTrackedFiles(repositoryRoot);
  assert.equal(
    scan.passed,
    true,
    `Tracked scanner findings: ${safeScannerDiagnostic(scan.findings)}`,
  );
  assert.equal(scan.historyScanned, false);
});

test('release metadata is deterministic and excludes environment files', () => {
  const input = {
    releaseCandidateId: 'rc-test',
    sourceRevision: 'a'.repeat(40),
    applicationVersion: '13.5.0',
    workspaceVersions: { backend: '13.5.0', frontend: '13.5.0', externalAgent: '13.5.0' },
    generatedAt: '2026-01-01T00:00:00.000Z',
  };
  assert.equal(core.digest(core.createReleaseManifest(input)), core.digest(core.createReleaseManifest(input)));
  assert.equal(core.artifactExcluded('backend/.env'), true);
  assert.equal(core.artifactExcluded('backend/.env.production'), true);
  assert.equal(core.validateLockfile(repositoryRoot).valid, true);
  assert.equal(core.generateSbom(repositoryRoot).digest, core.generateSbom(repositoryRoot).digest);
});

test('mixed-version, migration, cache, and projection incompatibility block rollout', () => {
  const result = core.evaluateCompatibility({
    backendProtocolVersion: '2',
    workerProtocolVersion: '1',
    supportedDatabaseSchemaVersions: ['2'],
    activeSchemaVersion: '1',
    supportedCacheSerializationVersions: ['2'],
    activeCacheSerializationVersion: '1',
    supportedProjectionVersions: ['2'],
    activeProjectionVersion: '1',
  });
  assert.equal(result.compatible, false);
  assert.ok(result.safeReasonCodes.includes('WORKER_PROTOCOL_INCOMPATIBLE'));
  assert.ok(result.safeReasonCodes.includes('CACHE_SERIALIZATION_UNSUPPORTED'));
  assert.ok(result.safeReasonCodes.includes('PROJECTION_VERSION_UNSUPPORTED'));
  assert.equal(
    core.validateMigrationPlan({
      requiredMigrationIds: ['destructive'],
      operations: ['drop_collection'],
      migrationStrategy: 'additive_only',
    }).valid,
    false,
  );
});

test('migration checkpoints resume idempotently after interruption', () => {
  const items = Array.from({ length: 5 }, (_, index) => ({
    id: `row-${index}`,
    idempotencyKey: `key-${index}`,
  }));
  const first = core.createCheckpointedMigrationRunner();
  assert.equal(first.run(items, { maximumItems: 2 }).completed, false);
  const resumed = core.createCheckpointedMigrationRunner(first.snapshot());
  assert.equal(resumed.run(items).completed, true);
  assert.equal(resumed.run(items).processedCount, 5);
});

test('rollout transition graph, no-op production adapter, and canary harness are safe', async () => {
  assert.equal(core.transitionRollout('draft', 'validating'), 'validating');
  assert.throws(() => core.transitionRollout('draft', 'succeeded'), /TRANSITION_INVALID/);
  assert.equal((await new core.NoopDeploymentAdapter().beginRollout()).code, 'PRODUCTION_DEPLOYMENT_DISABLED');
  const result = core.simulateReleaseHarness({ authorityEpoch: 4 });
  assert.equal(result.acceptedWorkLost, false);
  assert.equal(result.duplicateLogicalExecutions, false);
  assert.equal(result.staleWorkerFenced, true);
  assert.equal(result.authorityEpochAfterRollback, 4);
});

test('manual provider failures never become passed gates and credential findings cannot be waived', () => {
  const gate = core.evaluateManualGate(
    { result: 'failed_transient', safeReasonCode: 'GEMINI_UPSTREAM_UNAVAILABLE' },
    { allowWaiver: true },
  );
  assert.equal(gate.passed, false);
  assert.equal(gate.satisfied, false);
  assert.equal(
    core.validateWaiver({
      findingCode: 'CREDENTIAL_EXPOSURE',
      approvalReference: 'approval',
      expiresAt: '2099-01-01T00:00:00.000Z',
    }).valid,
    false,
  );
});

test('support bundles redact secret fields, credential values, and customer payload fields', () => {
  const bundle = core.createSupportBundle({
    releaseCandidateId: 'rc-test',
    authorization: `Bearer ${'x'.repeat(40)}`,
    password: 'synthetic-password',
    rawPrompt: 'customer input',
  });
  const serialized = JSON.stringify(bundle);
  assert.equal(serialized.includes('synthetic-password'), false);
  assert.equal(serialized.includes('Bearer '), false);
  assert.equal(serialized.includes('customer input'), false);
});

test('readiness is strict while liveness tolerates non-critical degradation', () => {
  assert.equal(
    core.evaluateLiveness({ eventLoopResponsive: true, providerUnavailable: true }).status,
    'live',
  );
  assert.equal(
    core.evaluateReadiness({
      startupValidation: true,
      database: 'disconnected',
      migrations: 'acceptable',
      indexes: 'healthy',
      protocolCompatible: true,
      routingCompatible: true,
      regionLoaded: true,
      redactionActive: true,
    }).ready,
    false,
  );
});

test('release RBAC is versioned and normal users lack production execution privileges', () => {
  assert.equal(PERMISSION_REGISTRY_VERSION, 16);
  for (const permission of [
    'releaseCandidate.approve',
    'releaseRollout.execute',
    'releaseMigration.execute',
    'releaseRollout.rollback',
    'releaseRollout.rollForward',
    'releaseWaiver.approve',
    'releaseFreeze.override',
    'releaseFeatureFlag.killSwitch',
    'releaseSupportBundle.create',
  ]) assert.ok(getPermission(permission));
  const developer = permissionsForBuiltInRole('developer');
  const viewer = permissionsForBuiltInRole('viewer');
  for (const permission of ['releaseCandidate.approve', 'releaseRollout.execute', 'releaseMigration.execute']) {
    assert.equal(developer.includes(permission), false);
    assert.equal(viewer.includes(permission), false);
  }
});
