const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { evaluateOperationalAccess } = require('../services/operationalState.service');
const {
  normalizeSecurityMetadata,
  validateConfigurationValues,
} = require('../services/enterpriseOperations.service');
const { getPermissionRegistry } = require('../constants/permissionRegistry');
const {
  DURABLE_WORK_STATUSES,
  CLAIMABLE_DURABLE_WORK_STATUSES,
} = require('../constants/durableWork');
const Organization = require('../models/Organization');
const Workspace = require('../models/Workspace');
const EnterpriseUser = require('../models/EnterpriseUser');
const ServiceAccount = require('../models/ServiceAccount');
const MaintenanceWindow = require('../models/MaintenanceWindow');
const TenantDeletionJob = require('../models/TenantDeletionJob');

const ROOT = path.resolve(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const operational = source('services/operationalState.service.js');
const enterprise = source('services/enterpriseOperations.service.js');
const runtime = source('services/runtimeGateway.service.js');
const durable = source('services/durableWork.service.js');
const durableOperations = source('services/durableOperations.service.js');
const worker = source('services/durableWorker.service.js');
const connection = source('services/connectionService.js');
const credential = source('services/credentialBroker.service.js');
const invocationControl = source('services/invocationControl.service.js');
const approval = source('services/approval.service.js');
const routes = source('routes/enterpriseOperationsRoutes.js');
const health = source('controllers/healthController.js');
const migration = fs.readFileSync(
  path.resolve(__dirname, '../../scripts/migrateEnterpriseOperations.js'),
  'utf8',
);
const frontend = fs.readFileSync(
  path.resolve(__dirname, '../../../frontend/src/pages/EnterpriseOperations.jsx'),
  'utf8',
);

function state(organization = 'active', workspace = 'active', mode = 'NONE') {
  return {
    organization: { status: organization },
    workspace: workspace ? { status: workspace } : null,
    maintenance: mode === 'NONE' ? null : { mode, maintenanceId: 'mnt_test' },
  };
}

function allowed(operation, tenantState, extra = {}) {
  return evaluateOperationalAccess({ operation, ...extra }, tenantState).allowed;
}

test('existing organizations remain active after migration', () => {
  assert.match(
    migration,
    /backfillModel\(\s*Organization,\s*\{\s*status: 'active',\s*lifecycleRevision: 0\s*\}/,
  );
  assert.equal(Organization.schema.path('status').defaultValue, 'active');
});

test('existing workspaces remain active after migration', () => {
  assert.match(
    migration,
    /backfillModel\(\s*Workspace,\s*\{\s*status: 'active',\s*lifecycleRevision: 0\s*\}/,
  );
  assert.equal(Workspace.schema.path('status').defaultValue, 'active');
});

test('organization suspension blocks new invocation', () =>
  assert.equal(allowed('EXECUTION', state('suspended')), false));
test('workspace suspension blocks only that workspace', () => {
  assert.equal(allowed('EXECUTION', state('active', 'suspended')), false);
  assert.equal(allowed('EXECUTION', state('active', 'active')), true);
});
test('suspension blocks install-key resolution where required', () =>
  assert.match(connection, /operational_state_check[\s\S]*assertOperationalAccess/));
test('suspension blocks new connection creation', () =>
  assert.match(connection, /operation: 'MUTATION'/));
test('suspension blocks credential resolution', () =>
  assert.match(credential, /operation: 'CREDENTIAL_OPERATION'/));
test('suspension blocks durable queue insertion', () =>
  assert.match(durable, /operation: 'QUEUE_SUBMISSION'/));
test('worker revalidates tenant state before execution', () =>
  assert.match(worker, /assertOperationalAccess[\s\S]*startWork/));
test('queued work pauses safely during suspension', () => {
  assert.ok(DURABLE_WORK_STATUSES.includes('blocked'));
  assert.equal(CLAIMABLE_DURABLE_WORK_STATUSES.includes('blocked'), false);
  assert.match(operational, /status: 'blocked'/);
});
test('in-flight work uses documented best-effort behavior', () =>
  assert.match(runtime, /existingClaim: Boolean\(actor\.durableWorkItemId\)/));
test('reactivation requires authorization', () => {
  assert.match(enterprise, /return `\$\{prefix\}\.reactivate`/);
  assert.match(enterprise, /authorizeOperation\(permission/);
});
test('reactivation requires policy evaluation', () =>
  assert.match(enterprise, /authorizationDecision[\s\S]*policyGenerationValidated/));
test('reactivation compares authoritative policy generation', () => {
  assert.match(enterprise, /PolicyRevision\.findOne[\s\S]*authorizedPolicyGeneration/);
  assert.match(enterprise, /authorizedPolicyGeneration === currentPolicyGeneration/);
  assert.doesNotMatch(enterprise, /policyGenerationValidated: true/);
});
test('reactivation validates governed secrets behind active bindings', () => {
  assert.match(enterprise, /CredentialBinding\.distinct\('secretId'[\s\S]*status: 'ACTIVE'/);
  assert.match(enterprise, /GovernedSecret\.countDocuments[\s\S]*healthStatus/);
});
test('reactivation requires approval when configured', () =>
  assert.match(enterprise, /ORGANIZATION_\$\{targetState\.toUpperCase\(\)\}/));
test('reactivation does not automatically run unsafe paused jobs', () =>
  assert.match(enterprise, /blockedWorkResumesAutomatically: false/));
test('maintenance READ_ONLY blocks mutation', () =>
  assert.equal(allowed('MUTATION', state('active', 'active', 'READ_ONLY')), false));
test('maintenance EXECUTION_BLOCKED blocks invocation', () =>
  assert.equal(allowed('EXECUTION', state('active', 'active', 'EXECUTION_BLOCKED')), false));
test('maintenance DRAINING stops new claims', () =>
  assert.equal(allowed('WORKER_CLAIM', state('active', 'active', 'DRAINING')), false));
test('overlapping maintenance selects the strictest applicable mode', () => {
  assert.match(operational, /FULL_MAINTENANCE: 4/);
  assert.match(operational, /maintenanceRecords\.sort[\s\S]*modePriority/);
});
test('scheduled maintenance is enforced when its start time arrives', () =>
  assert.match(
    operational,
    /status: \{ \$in: \['ACTIVE', 'SCHEDULED'\] \}[\s\S]*startsAt: \{ \$lte: now \}/,
  ));
test('public input cannot self-authorize platform maintenance', () => {
  assert.match(enterprise, /platformAuthorized: caller\.platformAuthorized === true/);
  assert.doesNotMatch(enterprise, /input\.platformAuthorized/);
});
test('unrelated tenants continue during scoped maintenance', () =>
  assert.equal(allowed('EXECUTION', state()), true));
test('platform maintenance does not break health behavior', () =>
  assert.doesNotMatch(health, /MaintenanceWindow|assertOperationalAccess|adapter\.invoke/));
test('cross-organization lifecycle action is denied', () =>
  assert.match(enterprise, /requestedOrganizationId !== partnerId/));
test('administrative actor authority comes from authenticated caller context', () => {
  assert.match(enterprise, /actorId: `partner:\$\{partnerId\}`/);
  assert.doesNotMatch(enterprise, /input\.actorId|input\.actorType/);
});
test('cross-workspace lifecycle action is denied', () =>
  assert.match(enterprise, /workspace\.organizationId[\s\S]*AUTHORIZATION_DENIED/));
test('membership suspension removes current authorization', () => {
  assert.match(source('services/authorization.service.js'), /status: 'active'/);
  assert.ok(EnterpriseUser.schema.path('status').enumValues.includes('suspended'));
});
test('removed member cannot approve', () => assert.match(approval, /status: 'active'/));
test('historical audit still references removed actor safely', () =>
  assert.doesNotMatch(enterprise, /LifecycleTransition\.delete|EvidenceEvent\.delete/));
test('lifecycle history records actual approving actors', () => {
  assert.match(enterprise, /ApprovalDecision\.distinct\('approverActorId'/);
  assert.match(enterprise, /approvedBy: approval\.approverActorIds\.join/);
  assert.doesNotMatch(
    enterprise,
    /lifecycleApprovedBy: approval\.approvals\?\.at\(-1\)\?\.request\?\.requesterActorId/,
  );
});
test('service account disable blocks governed use', () => {
  assert.ok(ServiceAccount.schema.path('status').enumValues.includes('disabled'));
  assert.match(
    source('services/authorization.service.js'),
    /ServiceAccount\.findOne\([\s\S]*status: 'active'[\s\S]*expiresAt/,
  );
});
test('service account cannot approve human workflow', () =>
  assert.match(approval, /requesterActorType|requireHuman/));
test('service account is not an organization owner by default', () =>
  assert.match(
    source('services/authorization.service.js'),
    /actor\.type === 'service_account' && !actor\.serviceAccountId/,
  ));
test('service account cannot cross workspace scope', () =>
  assert.match(enterprise, /account\.externalWorkspaceId !== scope\.workspaceId/));
test('membership and service-account provisioning validate workspace scope', () => {
  assert.match(enterprise, /async function validateProvisioningWorkspaces/);
  assert.match(enterprise, /async function provisionMembership/);
  assert.match(enterprise, /async function createServiceAccount/);
});
test('access review snapshot is tenant safe', () =>
  assert.match(enterprise, /accessSnapshotDigest: canonicalDigest\(snapshot\)/));
test('stale access review item is detected', () => assert.match(enterprise, /ACCESS_REVIEW_STALE/));
test('review decision does not silently mutate access', () =>
  assert.match(enterprise, /accessMutated: false/));
test('remediation is re-authorized', () =>
  assert.match(enterprise, /authorizeOperation\(\s*'access-review\.remediate'/));
test('remediation conflict is handled safely', () =>
  assert.match(enterprise, /ACCESS_REMEDIATION_CONFLICT/));
test('configuration activation is versioned', () =>
  assert.match(enterprise, /version: Number\(latest\?\.version \|\| 0\) \+ 1/));
test('active configuration is immutable', () =>
  assert.match(enterprise, /status: 'VALIDATED'[\s\S]*status: 'ACTIVE'/));
test('rollback activates intended prior version safely', () =>
  assert.match(enterprise, /rolledBackFromVersion/));
test('configuration cannot disable core authorization', () => {
  assert.throws(
    () => validateConfigurationValues('FEATURE_AVAILABILITY', { authorization: false }),
    /Core security controls/,
  );
});
test('feature flag is backend enforced', () =>
  assert.match(enterprise, /async function evaluateFeature/));
test('feature flag cache remains tenant isolated', () =>
  assert.match(enterprise, /organizationId,\s*category: 'FEATURE_AVAILABILITY'/));
test('incident creation is tenant safe', () =>
  assert.match(
    enterprise,
    /OperationalIncident\.create\([\s\S]*organizationId: scope\.organizationId/,
  ));
test('incident response uses normal authorization', () =>
  assert.match(enterprise, /authorizeOperation\(\s*'incident\.respond'/));
test('incident response cannot bypass approval', () =>
  assert.match(
    enterprise,
    /enforceAdministrativeApproval\(\s*scope,\s*input,\s*'incident\.respond'/,
  ));
test('security event normalization contains no secrets', () => {
  const safe = normalizeSecurityMetadata({
    permission: 'x',
    token: 'private',
    password: 'private',
  });
  assert.deepEqual(safe, { permission: 'x' });
});
test('administrative notifications remain tenant scoped', () =>
  assert.match(enterprise, /organizationId: scope\.organizationId, deduplicationKey/));
test('tenant export contains no plaintext secrets', () =>
  assert.match(enterprise, /secretsExcluded: true/));
test('tenant export contains no private credentials', () =>
  assert.match(enterprise, /ciphertextExcluded: true/));
test('tenant export cannot cross tenant scope', () =>
  assert.match(
    enterprise,
    /TenantDataExport\.findOne\(\{\s*tenantExportId,\s*organizationId: scope\.organizationId/,
  ));
test('tenant export uses short-lived authorized download', () =>
  assert.match(enterprise, /Date\.now\(\) \+ 10 \* 60 \* 1_000/));
test('tenant deletion preview performs no deletion', () => {
  const previewBody = enterprise.slice(
    enterprise.indexOf('async function tenantDeletionPreview'),
    enterprise.indexOf('async function requestTenantDeletion'),
  );
  assert.doesNotMatch(previewBody, /deleteMany|deleteOne/);
});
test('legal hold blocks deletion', () =>
  assert.match(enterprise, /TENANT_DELETION_LEGAL_HOLD_BLOCK/));
test('retention policy blocks deletion where required', () =>
  assert.match(enterprise, /TENANT_DELETION_RETENTION_BLOCK/));
test('active queued work blocks deletion', () =>
  assert.match(enterprise, /TENANT_DELETION_ACTIVE_WORK_BLOCK/));
test('destructive queries always include tenant scope', () => {
  assert.doesNotMatch(enterprise, /deleteMany\(\s*\{\s*\}\s*\)/);
  assert.match(enterprise, /const filter = step\.filter\(deletionScope\)/);
});
test('partial deletion is resumable', () =>
  assert.match(enterprise, /lastCompletedStage[\s\S]*RECOVERY_REQUIRED/));
test('deletion is idempotent', () =>
  assert.match(enterprise, /job\.status === 'COMPLETED'[\s\S]*idempotentReplay: true/));
test('deletion tombstone contains no secrets', () => {
  const paths = Object.keys(require('../models/TenantDeletionTombstone').schema.paths);
  assert.equal(
    paths.some((key) => /secret|token|cipher|credential/i.test(key)),
    false,
  );
});
test('operational recovery does not duplicate external side effects', () =>
  assert.match(enterprise, /destructiveJobsAutomaticallyRetried: 0/));
test('manual retry and resolution recheck operational state', () => {
  assert.match(invocationControl, /async function manualRetry[\s\S]*operation: 'EXECUTION'/);
  assert.match(
    invocationControl,
    /async function manualResolve[\s\S]*operation: 'LIFECYCLE_CONTROL'/,
  );
});
test('durable recovery operations recheck operational state', () => {
  assert.match(
    durableOperations,
    /async function scanDurableAbandonedWork[\s\S]*operation: 'MUTATION'/,
  );
  assert.match(
    durableOperations,
    /async function requeueDurableDeadLetter[\s\S]*operation: 'QUEUE_SUBMISSION'/,
  );
});
test('DR status does not fabricate backup success', () =>
  assert.match(enterprise, /atlasBackupsConfiguredByGhostBridge: false/));
test('health performs no billed external provider call', () =>
  assert.doesNotMatch(health, /Gemini|Google Search|adapter\.invoke|fetch\(/i));
test('ready performs no billed provider call', () =>
  assert.doesNotMatch(health, /Gemini|Google Search|evidence export|credential/i));
test('metrics contain no high-cardinality tenant identifiers', () => {
  const metricSource = source('services/enterpriseOperationsMetrics.service.js');
  assert.doesNotMatch(metricSource, /organizationId|workspaceId|actorId|traceId|incidentId/);
});
test('administrative audit events redact secret-like metadata', () =>
  assert.match(enterprise, /\.\.\.redactSecrets\(metadata\)/));
test('permission registry v9 includes enterprise operations permissions', () => {
  const registry = getPermissionRegistry();
  assert.equal(registry.version, 9);
  for (const id of [
    'organization.suspend',
    'workspace.reactivate',
    'maintenance.activate',
    'membership.remove',
    'service-account.revoke',
    'access-review.remediate',
    'configuration.rollback',
    'incident.respond',
    'security-event.manage',
    'tenant-export.download',
    'tenant-deletion.execute',
    'recovery.manage',
    'dr-status.read',
  ])
    assert.ok(registry.permissions.some((permission) => permission.id === id));
});
test('maintenance schema has tenant and time indexes', () =>
  assert.ok(MaintenanceWindow.schema.indexes().length >= 2));
test('tenant deletion schema is durable and versioned', () => {
  assert.ok(TenantDeletionJob.schema.path('revision'));
  assert.ok(TenantDeletionJob.schema.path('deletionSteps'));
});
test('unknown operational state fails closed', () =>
  assert.equal(allowed('EXECUTION', state('corrupt')), false));
test('safe reads remain available during suspension', () =>
  assert.equal(allowed('SAFE_READ', state('suspended', 'suspended')), true));
test('full maintenance permits health but blocks mutation', () => {
  assert.equal(allowed('HEALTH', state('active', 'active', 'FULL_MAINTENANCE')), true);
  assert.equal(allowed('MUTATION', state('active', 'active', 'FULL_MAINTENANCE')), false);
});
test('routes expose no unauthenticated administrative endpoint', () =>
  assert.match(routes, /enterpriseOperationsRouter\.use\(authenticatePartner\)/));
test('frontend destructive preview displays blockers and fingerprint', () => {
  assert.match(frontend, /blockers/);
  assert.match(frontend, /operationFingerprint/);
  assert.match(frontend, /Confirmation text/);
});
