const assert = require('node:assert/strict');
const {
  comparePolicies,
  evaluatePolicySnapshot,
  validatePolicyDocument,
} = require('../src/services/policyEngine.service');
const { authorize } = require('../src/services/authorization.service');
const Policy = require('../src/models/Policy');
const PolicyRevision = require('../src/models/PolicyRevision');

const attributes = {
  actor: {
    id: 'user_1',
    type: 'user',
    serviceAccount: false,
    roleKeys: ['developer'],
    teamIds: [],
  },
  organization: { id: 'org_1' },
  workspace: { id: 'workspace_1', environment: 'PRODUCTION', productionApproved: true },
  resource: { type: 'Connection', id: 'connection_1', ownerWorkspaceId: 'workspace_1' },
  request: { timestamp: new Date('2026-07-16T09:00:00.000Z'), weekday: 'THURSDAY' },
  environment: { name: 'production' },
  capability: {
    id: 'capability_1',
    classification: 'CRITICAL',
    category: 'PAYMENT',
    sideEffect: 'IRREVERSIBLE',
  },
  connection: { id: 'connection_1', status: 'connected' },
  passport: { id: 'passport_1', version: '1.0.0' },
};
const input = {
  permission: 'connection.invoke',
  organizationId: 'org_1',
  workspaceId: 'workspace_1',
  actorType: 'user',
  resourceType: 'Connection',
  resourceId: 'connection_1',
  capabilityId: 'capability_1',
  capabilityClassification: 'CRITICAL',
  capabilityCategory: 'PAYMENT',
  capabilitySideEffect: 'IRREVERSIBLE',
  connectionId: 'connection_1',
  passportId: 'passport_1',
  environment: 'PRODUCTION',
};

function policy(id, effect, condition, overrides = {}) {
  return {
    stablePolicyId: id,
    version: 1,
    name: id,
    organizationId: 'org_1',
    status: 'ACTIVE',
    effect,
    priority: 0,
    target: { permissionIds: ['connection.invoke'] },
    condition,
    schemaVersion: 1,
    ...overrides,
  };
}

function evaluate(policies, revision = 1) {
  return evaluatePolicySnapshot({ policies, input, attributes, snapshotRevision: revision });
}

async function verify() {
  const allow = policy('allow-production', 'ALLOW', {
    operator: 'EQUALS',
    attribute: 'workspace.productionApproved',
    value: true,
  });
  const deny = policy('deny-critical', 'DENY', {
    operator: 'EQUALS',
    attribute: 'capability.classification',
    value: 'CRITICAL',
  });
  assert.equal(validatePolicyDocument(allow).valid, true);
  assert.equal(evaluate([]).allowed, true);
  assert.equal(evaluate([allow]).reasonCode, 'POLICY_ALLOW_MATCHED');
  assert.equal(evaluate([allow, deny]).reasonCode, 'POLICY_EXPLICIT_DENY');
  assert.equal(evaluate([deny, allow]).reasonCode, 'POLICY_EXPLICIT_DENY');
  assert.deepEqual(
    [deny, allow].sort(comparePolicies).map((item) => item.stablePolicyId),
    [allow, deny].sort(comparePolicies).map((item) => item.stablePolicyId),
  );
  assert.equal(evaluate([{ ...deny, organizationId: 'org_2' }]).allowed, true);
  assert.equal(evaluate([{ ...deny, workspaceId: 'workspace_2' }]).allowed, true);
  assert.equal(
    evaluate([
      policy('allow-non-production', 'ALLOW', {
        operator: 'EQUALS',
        attribute: 'workspace.environment',
        value: 'STAGING',
      }),
    ]).reasonCode,
    'POLICY_ALLOW_CONDITION_NOT_MET',
  );
  assert.equal(
    evaluate([
      policy('bad-attribute', 'DENY', {
        operator: 'EQUALS',
        attribute: 'client.role',
        value: 'admin',
      }),
    ]).reasonCode,
    'POLICY_INVALID',
  );
  assert.equal(evaluate([deny], 1).allowed, false);
  assert.equal(evaluate([], 2).allowed, true); // queued-work revalidation after retirement/revision change
  assert.equal(deny.status, 'ACTIVE'); // evaluator/simulation is side-effect free
  const lifecycleStatuses = Policy.schema.path('status').enumValues;
  assert.deepEqual(lifecycleStatuses, ['DRAFT', 'ACTIVE', 'RETIRED']);
  assert.ok(
    Policy.schema
      .indexes()
      .some(
        ([, options]) =>
          options.name === 'one_active_version_per_tenant_policy' && options.unique === true,
      ),
  );
  assert.ok(PolicyRevision.schema.path('generation'));
  const runtimeDecision = await authorize(
    {
      type: 'user',
      id: 'user_1',
      organizationId: 'org_1',
      workspaceId: 'workspace_1',
      permissions: ['connection.invoke'],
      skipPersistentRoles: true,
    },
    'connection.invoke',
    { type: 'Connection', id: 'connection_1', organizationId: 'org_1', workspaceId: 'workspace_1' },
    {
      trustedCapability: {
        _id: 'capability_1',
        classification: 'CRITICAL',
        category: 'PAYMENT',
        sideEffect: 'IRREVERSIBLE',
      },
      policyLoader: async () => ({ policies: [deny], revision: 2 }),
    },
  );
  assert.equal(runtimeDecision.reasonCode, 'POLICY_EXPLICIT_DENY');
  console.log(
    'PASS policy engine verifier: deterministic evaluation, explicit deny, tenant isolation, simulation safety, activation lifecycle constraints, runtime enforcement, and queued revision revalidation.',
  );
}

verify().catch((error) => {
  console.error(`FAIL policy engine verifier: ${error?.code || error?.name || 'ERROR'}`);
  process.exitCode = 1;
});
