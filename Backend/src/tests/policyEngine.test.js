const assert = require('node:assert/strict');
const test = require('node:test');
const { authorize } = require('../services/authorization.service');
const {
  comparePolicies,
  evaluateCondition,
  evaluatePolicySnapshot,
  trustedAttributes,
  validateConditionTree,
  validatePolicyDocument,
} = require('../services/policyEngine.service');
const { getAttributeRegistry } = require('../constants/policyAttributeRegistry');
const { getPermissionRegistry } = require('../constants/permissionRegistry');
const { validateAgentPassportV1 } = require('../services/passportValidator');
const policyMetrics = require('../services/policyMetrics.service');

const input = {
  permission: 'connection.invoke',
  organizationId: 'org_1',
  workspaceId: 'workspace_1',
  actorType: 'user',
  resourceType: 'Connection',
  resourceId: 'connection_1',
  passportId: 'passport_1',
  connectionId: 'connection_1',
  capabilityId: 'capability_1',
  capabilityCategory: 'PAYMENT',
  capabilityClassification: 'CRITICAL',
  capabilitySideEffect: 'IRREVERSIBLE',
  environment: 'PRODUCTION',
};
const attributes = {
  actor: {
    id: 'user_1',
    type: 'user',
    serviceAccount: false,
    teamIds: ['team_1'],
    roleKeys: ['developer'],
  },
  organization: { id: 'org_1' },
  workspace: { id: 'workspace_1', environment: 'PRODUCTION', productionApproved: true },
  resource: { type: 'Connection', id: 'connection_1', ownerWorkspaceId: 'workspace_1' },
  request: { timestamp: new Date('2026-07-16T09:30:00Z'), weekday: 'THURSDAY', hour: 9 },
  environment: { name: 'production' },
  capability: {
    id: 'capability_1',
    category: 'PAYMENT',
    classification: 'CRITICAL',
    sideEffect: 'IRREVERSIBLE',
  },
  connection: { id: 'connection_1', status: 'connected' },
  passport: { id: 'passport_1', version: '1.0.0' },
};

function policy(id, effect, condition, overrides = {}) {
  return {
    stablePolicyId: id,
    version: 1,
    name: id,
    description: '',
    organizationId: 'org_1',
    status: 'ACTIVE',
    effect,
    target: { permissionIds: ['connection.invoke'] },
    condition,
    priority: 0,
    schemaVersion: 1,
    ...overrides,
  };
}

function condition(attribute, value, operator = 'EQUALS') {
  return { operator, attribute, ...(operator.includes('EXISTS') ? {} : { value }) };
}

function evaluate(policies, overrides = {}) {
  return evaluatePolicySnapshot({
    policies,
    input: { ...input, ...overrides },
    attributes,
    snapshotRevision: 7,
  });
}

test('RBAC denial cannot be overridden by a policy ALLOW', async () => {
  const decision = await authorize(
    {
      type: 'user',
      id: 'user_1',
      organizationId: 'org_1',
      workspaceId: 'workspace_1',
      skipPersistentRoles: true,
    },
    'connection.invoke',
    { type: 'Connection', id: 'connection_1', organizationId: 'org_1', workspaceId: 'workspace_1' },
    {
      policyLoader: async () => ({
        policies: [policy('allow', 'ALLOW', condition('actor.type', 'user'))],
        revision: 1,
      }),
    },
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.rbacDecision, 'DENY');
  assert.equal(decision.policyDecision, 'NOT_EVALUATED');
});

test('RBAC allow with no policy preserves allow', async () => {
  const decision = await authorize(
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
    { policyLoader: async () => ({ policies: [], revision: 4 }) },
  );
  assert.equal(decision.allowed, true);
  assert.equal(decision.reasonCode, 'NO_APPLICABLE_POLICY');
  assert.equal(decision.policySnapshotRevision, 4);
});

test('unknown permissions fail closed before policy evaluation', async () => {
  let loaded = false;
  const decision = await authorize(
    { type: 'user', id: 'user_1', permissions: ['unknown.permission'] },
    'unknown.permission',
    {},
    {
      policyLoader: async () => {
        loaded = true;
        return { policies: [], revision: 1 };
      },
    },
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'UNKNOWN_PERMISSION');
  assert.equal(loaded, false);
});

test('explicit DENY overrides matching ALLOW regardless of input ordering', () => {
  const allow = policy('z-allow', 'ALLOW', condition('workspace.productionApproved', true));
  const deny = policy('a-deny', 'DENY', condition('capability.classification', 'CRITICAL'));
  assert.equal(evaluate([allow, deny]).reasonCode, 'POLICY_EXPLICIT_DENY');
  assert.equal(evaluate([deny, allow]).reasonCode, 'POLICY_EXPLICIT_DENY');
});

test('a matching conditional ALLOW succeeds', () => {
  const result = evaluate([
    policy('allow', 'ALLOW', condition('workspace.environment', 'PRODUCTION')),
  ]);
  assert.equal(result.allowed, true);
  assert.equal(result.reasonCode, 'POLICY_ALLOW_MATCHED');
});

test('an applicable conditional ALLOW that fails denies', () => {
  const result = evaluate([
    policy('allow', 'ALLOW', condition('workspace.environment', 'STAGING')),
  ]);
  assert.equal(result.allowed, false);
  assert.equal(result.reasonCode, 'POLICY_ALLOW_CONDITION_NOT_MET');
});

test('unknown attributes and unsupported operators are rejected', () => {
  assert.equal(
    validateConditionTree(condition('client.role', 'admin')).errors[0].code,
    'UNKNOWN_ATTRIBUTE',
  );
  assert.equal(
    validateConditionTree(condition('actor.type', 'user', 'MATCHES_REGEX')).errors[0].code,
    'UNSUPPORTED_OPERATOR',
  );
});

test('typed numeric comparisons do not coerce strings', () => {
  assert.equal(validateConditionTree(condition('request.hour', '10', 'LESS_THAN')).valid, false);
  assert.equal(
    evaluateCondition(condition('request.hour', 10, 'LESS_THAN'), attributes).matched,
    true,
  );
});

test('ALL, ANY, and NOT logical nodes evaluate deterministically', () => {
  const tree = {
    operator: 'ALL',
    conditions: [
      {
        operator: 'ANY',
        conditions: [condition('actor.type', 'service_account'), condition('actor.type', 'user')],
      },
      { operator: 'NOT', conditions: [condition('capability.sideEffect', 'READ_ONLY')] },
    ],
  };
  assert.equal(evaluateCondition(tree, attributes).matched, true);
});

test('missing required trusted attributes fail closed', () => {
  const result = evaluatePolicySnapshot({
    policies: [policy('source-ip', 'DENY', condition('request.sourceIp', '203.0.113.4'))],
    input,
    attributes,
    snapshotRevision: 1,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reasonCode, 'POLICY_ATTRIBUTE_UNAVAILABLE');
});

test('EXISTS and NOT_EXISTS handle unavailable optional attributes without an error', () => {
  assert.equal(
    evaluateCondition(condition('request.sourceIp', undefined, 'NOT_EXISTS'), attributes).matched,
    true,
  );
  assert.equal(
    evaluateCondition(condition('request.sourceIp', undefined, 'EXISTS'), attributes).matched,
    false,
  );
});

test('organization and workspace scopes are isolated', () => {
  const deny = policy('deny', 'DENY', condition('actor.type', 'user'));
  assert.equal(evaluate([{ ...deny, organizationId: 'org_2' }]).allowed, true);
  assert.equal(evaluate([{ ...deny, workspaceId: 'workspace_2' }]).allowed, true);
  assert.equal(evaluate([{ ...deny, workspaceId: 'workspace_1' }]).allowed, false);
});

test('capability classification, category, and side-effect targets match stable values', () => {
  const deny = policy('governance', 'DENY', condition('actor.type', 'user'), {
    target: {
      permissionIds: ['connection.invoke'],
      capabilityClassifications: ['CRITICAL'],
      capabilityCategories: ['PAYMENT'],
      sideEffects: ['IRREVERSIBLE'],
    },
  });
  assert.equal(evaluate([deny]).allowed, false);
  assert.equal(evaluate([deny], { capabilityClassification: 'LOW' }).allowed, true);
});

test('service-account restrictions use the authenticated actor type', () => {
  const deny = policy('service-account-admin', 'DENY', condition('actor.serviceAccount', true), {
    target: { permissionIds: ['connection.invoke'], actorTypes: ['service_account'] },
  });
  const serviceAttributes = {
    ...attributes,
    actor: { ...attributes.actor, type: 'service_account', serviceAccount: true },
  };
  const result = evaluatePolicySnapshot({
    policies: [deny],
    input: { ...input, actorType: 'service_account' },
    attributes: serviceAttributes,
  });
  assert.equal(result.reasonCode, 'POLICY_EXPLICIT_DENY');
});

test('policy ordering uses workspace and resource specificity, priority, ID, and version', () => {
  const entries = [
    policy('b', 'ALLOW', condition('actor.type', 'user'), { priority: 10 }),
    policy('a', 'ALLOW', condition('actor.type', 'user'), {
      priority: 10,
      workspaceId: 'workspace_1',
    }),
    policy('c', 'ALLOW', condition('actor.type', 'user'), {
      priority: 100,
      target: { resourceIds: ['connection_1'] },
    }),
  ];
  const first = [...entries].sort(comparePolicies).map((item) => item.stablePolicyId);
  const second = [...entries]
    .reverse()
    .sort(comparePolicies)
    .map((item) => item.stablePolicyId);
  assert.deepEqual(first, second);
  assert.equal(first[0], 'a');
});

test('policy depth and node limits reject excessive documents', () => {
  let deep = condition('actor.type', 'user');
  for (let index = 0; index < 9; index += 1) deep = { operator: 'NOT', conditions: [deep] };
  assert.equal(
    validateConditionTree(deep).errors.some((error) => error.code === 'DEPTH_LIMIT_EXCEEDED'),
    true,
  );
  const wide = {
    operator: 'ALL',
    conditions: Array.from({ length: 101 }, () => condition('actor.type', 'user')),
  };
  const errors = validateConditionTree(wide).errors.map((error) => error.code);
  assert.equal(
    errors.includes('ARRAY_LIMIT_EXCEEDED') || errors.includes('NODE_LIMIT_EXCEEDED'),
    true,
  );
});

test('oversized strings and policy documents are rejected', () => {
  const oversized = policy('large', 'DENY', condition('actor.id', 'x'.repeat(140_000)));
  const codes = validatePolicyDocument(oversized).errors.map((error) => error.code);
  assert.equal(codes.includes('DOCUMENT_LIMIT_EXCEEDED'), true);
  assert.equal(codes.includes('STRING_LIMIT_EXCEEDED'), true);
});

test('trusted attributes use server-derived identity and explicit unknown governance values', () => {
  const resolved = trustedAttributes({
    actor: { type: 'user', id: 'trusted-user', teamIds: [] },
    resource: { type: 'Connection', id: 'trusted-connection', workspaceId: 'workspace_1' },
    context: { trustedRequest: { timestamp: '2026-07-16T09:00:00Z' }, trustedCapability: {} },
    roleKeys: ['developer'],
    tenant: { organizationId: 'org_1', workspaceId: 'workspace_1' },
  });
  assert.equal(resolved.actor.id, 'trusted-user');
  assert.equal(resolved.capability.classification, 'UNCLASSIFIED');
  assert.equal(resolved.capability.sideEffect, 'UNKNOWN');
  assert.equal(typeof resolved.request.hour, 'number');
});

test('attribute registry exposes metadata but not resolver functions', () => {
  const registry = getAttributeRegistry();
  assert.equal(registry.version, 2);
  assert.equal(
    registry.attributes.some((attribute) => attribute.id === 'capability.sideEffect'),
    true,
  );
  assert.equal(
    registry.attributes.every((attribute) => attribute.resolver === 'trusted_backend'),
    true,
  );
  assert.equal(
    registry.attributes.some((attribute) => attribute.id === 'secret.status'),
    true,
  );
});

test('permission registry v9 exposes granular governance and orchestration permissions with role mappings', () => {
  const registry = getPermissionRegistry();
  assert.equal(registry.version, 9);
  for (const id of [
    'policy.create',
    'policy.update',
    'policy.validate',
    'policy.simulate',
    'policy.activate',
    'policy.retire',
    'policy.audit.read',
    'secret.metadata.read',
    'secret.rotate',
    'encryption-key.rotate',
    'approval.workflow.activate',
    'evidence.export',
    'organization.suspend',
    'maintenance.activate',
    'access-review.remediate',
    'tenant-deletion.execute',
    'orchestration.node.execute',
    'orchestration.node.retry',
    'orchestrationRecoveryPolicy.read',
    'orchestrationRecoveryPolicy.create',
    'orchestrationRecoveryPolicy.update',
    'orchestrationRecoveryPolicy.validate',
    'orchestrationRecoveryPolicy.activate',
    'orchestrationRecoveryPolicy.archive',
    'orchestrationRecovery.read',
    'orchestrationRecovery.plan',
    'orchestrationRecovery.resume',
    'orchestrationRecovery.terminate',
    'orchestrationNode.retry',
    'orchestrationNode.skip',
    'orchestrationNode.correctInput',
    'orchestrationNode.replaceAgent',
    'orchestrationNode.compensate',
    'orchestrationNode.waiveCompensation',
    'orchestrationCompensation.read',
    'orchestrationIntervention.read',
    'orchestrationIntervention.resolve',
    'orchestrationCheckpoint.read',
    'orchestrationCheckpoint.create',
    'orchestrationCheckpoint.resume',
  ]) {
    assert.equal(
      registry.permissions.some((permission) => permission.id === id),
      true,
    );
  }
  for (const id of [
    'orchestrationRecovery.terminate',
    'orchestrationNode.correctInput',
    'orchestrationNode.replaceAgent',
    'orchestrationNode.waiveCompensation',
  ]) {
    const permission = registry.permissions.find((item) => item.id === id);
    assert.equal(permission.defaultRoles.includes('operator'), false);
    assert.equal(permission.defaultRoles.includes('developer'), false);
  }
});

test('existing passports remain valid and governance metadata is optional', () => {
  const passport = {
    protocol: 'agent-passport.v1',
    agent: {
      id: 'agent',
      name: 'Agent',
      provider: 'Provider',
      description: 'Description',
      version: '1',
    },
    auth: { type: 'no_auth_dev' },
    runtime: {
      type: 'rest',
      endpoint: 'https://example.com/run',
      method: 'POST',
      inputField: 'input',
      outputField: 'output',
      supportsStreaming: false,
      supportsLongRunningTasks: false,
    },
    install: { supportedModes: ['metadata_only'], requiresUserConsent: true },
    capabilities: [
      {
        name: 'read',
        description: 'Read',
        inputSchema: { type: 'object' },
        outputSchema: { type: 'object' },
      },
    ],
  };
  assert.equal(validateAgentPassportV1(passport).valid, true);
  assert.equal(
    validateAgentPassportV1({
      ...passport,
      capabilities: [
        {
          ...passport.capabilities[0],
          classification: 'CRITICAL',
          category: 'PAYMENT',
          sideEffect: 'IRREVERSIBLE',
        },
      ],
    }).valid,
    true,
  );
});

test('simulation-style evaluation mutates neither policies nor attributes', () => {
  const draft = policy('draft', 'DENY', condition('capability.sideEffect', 'IRREVERSIBLE'), {
    status: 'DRAFT',
  });
  const before = JSON.stringify({ draft, attributes });
  evaluatePolicySnapshot({ policies: [draft], input, attributes, snapshotRevision: 1 });
  assert.equal(JSON.stringify({ draft, attributes }), before);
});

test('queued work can be revalidated against a newer policy revision', () => {
  assert.equal(evaluate([], {}).allowed, true);
  const revoked = evaluate([
    policy('revocation', 'DENY', condition('capability.sideEffect', 'IRREVERSIBLE')),
  ]);
  assert.equal(revoked.allowed, false);
  assert.equal(revoked.policySnapshotRevision, 7);
});

test('metrics labels remain low-cardinality and discard IDs', () => {
  policyMetrics.reset();
  policyMetrics.increment('policy_evaluations', {
    outcome: 'DENY',
    policyId: 'pol_secret',
    userId: 'user_secret',
  });
  const serialized = JSON.stringify(policyMetrics.snapshot());
  assert.equal(serialized.includes('pol_secret'), false);
  assert.equal(serialized.includes('user_secret'), false);
});
