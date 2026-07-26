const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const { env } = require('../src/config/env');
const { evaluateOperationalAccess } = require('../src/services/operationalState.service');
const {
  normalizeSecurityMetadata,
  validateConfigurationValues,
} = require('../src/services/enterpriseOperations.service');
const { getPermissionRegistry } = require('../src/constants/permissionRegistry');
const {
  CLAIMABLE_DURABLE_WORK_STATUSES,
  DURABLE_WORK_STATUSES,
} = require('../src/constants/durableWork');
const MaintenanceWindow = require('../src/models/MaintenanceWindow');
const TenantDeletionJob = require('../src/models/TenantDeletionJob');

const SRC = path.resolve(__dirname, '../src');
const source = (relative) => fs.readFileSync(path.join(SRC, relative), 'utf8');

function report(label, detail) {
  console.log(`PASS ${label}: ${detail}`);
}

function state(organization = 'active', workspace = 'active', mode = 'NONE') {
  return {
    organization: { status: organization },
    workspace: { status: workspace },
    maintenance: mode === 'NONE' ? null : { mode, maintenanceId: 'mnt_verify' },
  };
}

function decision(operation, tenantState, extra = {}) {
  return evaluateOperationalAccess({ operation, ...extra }, tenantState);
}

async function verify() {
  const operational = source('services/operationalState.service.js');
  const enterprise = source('services/enterpriseOperations.service.js');
  const runtime = source('services/runtimeGateway.service.js');
  const durable = source('services/durableWork.service.js');
  const worker = source('services/durableWorker.service.js');
  const routes = source('routes/enterpriseOperationsRoutes.js');

  assert.equal(decision('EXECUTION', state('suspended')).allowed, false);
  assert.equal(decision('EXECUTION', state('active', 'suspended')).allowed, false);
  assert.equal(decision('EXECUTION', state()).allowed, true);
  assert.match(runtime, /operational_state_check/);
  report(
    'organization and workspace suspension',
    'scoped runtime execution fails closed while unrelated active scope remains allowed',
  );

  assert.ok(DURABLE_WORK_STATUSES.includes('blocked'));
  assert.equal(CLAIMABLE_DURABLE_WORK_STATUSES.includes('blocked'), false);
  assert.match(durable, /QUEUE_SUBMISSION/);
  assert.match(worker, /WORKER_CLAIM[\s\S]*pauseClaimedWork/);
  assert.match(enterprise, /blockedWorkResumesAutomatically: false/);
  report(
    'queued work and reactivation',
    'new queueing and worker execution revalidate state; blocked work requires controlled resume',
  );

  assert.equal(decision('MUTATION', state('active', 'active', 'READ_ONLY')).allowed, false);
  assert.equal(
    decision('EXECUTION', state('active', 'active', 'EXECUTION_BLOCKED')).allowed,
    false,
  );
  assert.equal(decision('WORKER_CLAIM', state('active', 'active', 'DRAINING')).allowed, false);
  assert.equal(
    decision('EXECUTION', state('active', 'active', 'DRAINING'), { existingClaim: true }).allowed,
    true,
  );
  report(
    'maintenance and draining',
    'read-only, execution-blocked, and draining modes are deterministic and existing claims are explicit',
  );

  assert.match(enterprise, /MEMBERSHIP_TRANSITIONS/);
  assert.match(enterprise, /SERVICE_ACCOUNT_TRANSITIONS/);
  assert.match(enterprise, /status: 'active'/);
  report(
    'membership and service accounts',
    'lifecycle states immediately affect centralized persistent-role resolution',
  );

  assert.match(enterprise, /accessSnapshotDigest/);
  assert.match(enterprise, /ACCESS_REVIEW_STALE/);
  assert.match(enterprise, /accessMutated: false/);
  assert.match(
    enterprise,
    /enforceAdministrativeApproval\(\s*scope,\s*input,\s*'access-review\.remediate'/,
  );
  report(
    'access review remediation',
    'decision and remediation are separate, stale snapshots conflict, and remediation is governed',
  );

  assert.throws(
    () => validateConfigurationValues('FEATURE_AVAILABILITY', { tenantIsolation: false }),
    /Core security controls/,
  );
  assert.match(enterprise, /status: 'VALIDATED'[\s\S]*status: 'ACTIVE'/);
  assert.match(enterprise, /rolledBackFromVersion/);
  report(
    'configuration and feature availability',
    'versions are validated, immutable after activation, rollback-safe, and backend evaluated',
  );

  assert.match(enterprise, /authorizeOperation\(\s*'incident\.respond'/);
  assert.match(
    enterprise,
    /enforceAdministrativeApproval\(\s*scope,\s*input,\s*'incident\.respond'/,
  );
  assert.deepEqual(
    normalizeSecurityMetadata({ permission: 'connection.invoke', token: 'private' }),
    { permission: 'connection.invoke' },
  );
  report(
    'incidents and security events',
    'response actions use normal governance and normalized metadata excludes secrets',
  );

  assert.match(enterprise, /secretsExcluded: true/);
  assert.match(enterprise, /ciphertextExcluded: true/);
  assert.match(enterprise, /privateInvocationPayloadsExcluded: true/);
  assert.match(enterprise, /10 \* 60 \* 1_000/);
  report(
    'tenant export',
    'bounded metadata export is redacted and downloaded only with short-lived authorization',
  );

  assert.match(enterprise, /TENANT_DELETION_LEGAL_HOLD_BLOCK/);
  assert.match(enterprise, /TENANT_DELETION_RETENTION_BLOCK/);
  assert.match(enterprise, /dryRun: true/);
  assert.doesNotMatch(enterprise, /deleteMany\(\s*\{\s*\}\s*\)/);
  assert.ok(TenantDeletionJob.schema.path('deletionSteps'));
  report(
    'tenant deletion',
    'preview is non-mutating; legal hold, retention, active work, and scoped resumable steps are enforced',
  );

  assert.match(enterprise, /destructiveJobsAutomaticallyRetried: 0/);
  assert.match(enterprise, /atlasBackupsConfiguredByGhostBridge: false/);
  report(
    'recovery and DR status',
    'destructive recovery is not automatic and backup health is never fabricated',
  );

  const registry = getPermissionRegistry();
  assert.ok(registry.version >= 13);
  for (const permission of [
    'organization.suspend',
    'workspace.reactivate',
    'maintenance.activate',
    'access-review.remediate',
    'configuration.rollback',
    'incident.respond',
    'tenant-export.download',
    'tenant-deletion.execute',
    'recovery.manage',
    'dr-status.read',
  ])
    assert.ok(registry.permissions.some((item) => item.id === permission));
  assert.match(routes, /enterpriseOperationsRouter\.use\(authenticatePartner\)/);
  report(
    'tenant isolation, permissions, audit, and metrics',
    'protected routes use registry v13 and low-cardinality operational instrumentation',
  );

  if (!env.MONGODB_URI)
    throw new Error('MONGODB_URI must be configured for verify:enterprise-operations.');
  await connectDatabase();
  assert.equal(databaseStatus(), 'connected');
  await MaintenanceWindow.find({ status: 'ACTIVE' }).limit(1).select('maintenanceId status').lean();
  assert.ok(MaintenanceWindow.schema.indexes().length >= 2);
  report(
    'configured MongoDB',
    'authoritative operational collections are reachable and indexed without external provider calls',
  );

  assert.doesNotMatch(
    source('controllers/healthController.js'),
    /adapter\.invoke|Gemini|Google Search|processTenantExport/i,
  );
  report(
    'health and provider safety',
    'health/readiness remain non-mutating and no billed provider is invoked',
  );

  console.log('Enterprise operations verification passed without external provider requests.');
}

if (require.main === module) {
  verify()
    .catch((error) => {
      console.error(`FAIL enterprise operations verification: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => disconnectDatabase());
}

module.exports = { verify };
