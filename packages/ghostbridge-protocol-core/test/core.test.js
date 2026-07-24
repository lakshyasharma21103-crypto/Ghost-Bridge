'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  GhostBridgeProtocolError,
  DEFAULT_PROFILE_DECLARATIONS,
  PROFILE_IDS,
  PROTOCOL_VERSION,
  assertCompatibility,
  boundedSerialize,
  checkCompatibility,
  createInstallationPreview,
  createSchemaValidators,
  negotiateExtensions,
  negotiateAuthenticationMode,
  negotiateVersion,
  parseProtocolVersion,
  projectDataContract,
  safeParse,
  transitionTask,
  validateExtensionIdentifier,
  validateProfileDeclarations,
  validateDelegation,
  validatePassport,
} = require('../src');

test('parses and negotiates the experimental protocol version', () => {
  assert.equal(parseProtocolVersion(PROTOCOL_VERSION).draft, true);
  assert.deepEqual(
    negotiateVersion({ remoteSupported: [PROTOCOL_VERSION] }),
    {
      selectedVersion: PROTOCOL_VERSION,
      stability: 'experimental',
      warnings: ['Selected protocol version is an experimental draft.'],
    },
  );
  assert.throws(
    () => negotiateVersion({ remoteSupported: ['ghostbridge/9.0'] }),
    (error) => error.errorCode === 'UNSUPPORTED_PROTOCOL_VERSION',
  );
});

test('bounded parsing rejects prototype-pollution keys and excessive depth', () => {
  assert.throws(
    () => safeParse('{"__proto__":{"polluted":true}}'),
    (error) => error instanceof GhostBridgeProtocolError,
  );
  assert.throws(
    () => boundedSerialize({ a: { b: { c: true } } }, { maximumObjectDepth: 1 }),
    (error) => error.errorCode === 'INVALID_MESSAGE',
  );
});

test('Passport expiration and suspension fail safely', () => {
  const passport = {
    protocolVersion: PROTOCOL_VERSION,
    passportId: 'passport_test',
    passportVersion: '1',
    agentId: 'agent_test',
    displayName: 'Test',
    safeDescription: 'Test agent.',
    issuer: 'issuer_test',
    issuedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
    status: 'suspended',
    capabilities: [],
    supportedProtocolVersions: [PROTOCOL_VERSION],
    supportedTransports: ['https-json'],
    receiptSupport: true,
    revocationReference: 'revocations/passport_test',
  };
  assert.throws(() => validatePassport(passport), (error) => error.errorCode === 'PASSPORT_SUSPENDED');
  assert.throws(
    () => validatePassport({ ...passport, status: 'active', expiresAt: '2020-01-01T00:00:00.000Z' }),
    (error) => error.errorCode === 'PASSPORT_EXPIRED',
  );
});

test('Data Contract projection rejects unexpected secret-like fields', () => {
  const contract = {
    contractKey: 'invoice-summary',
    contractVersion: '1',
    direction: 'outbound',
    allowedFields: ['invoiceId', 'total'],
    requiredFields: ['invoiceId'],
    prohibitedFields: ['apiKey'],
    acceptedDataClasses: ['business'],
    prohibitedDataClasses: ['secret'],
    maximumPayloadBytes: 4096,
    maximumStringLength: 200,
    maximumArrayLength: 20,
    maximumObjectDepth: 5,
    status: 'active',
  };
  assert.deepEqual(projectDataContract({ invoiceId: 'INV-1', total: 10 }, contract), {
    invoiceId: 'INV-1',
    total: 10,
  });
  assert.throws(
    () => projectDataContract({ invoiceId: 'INV-1', apiKey: 'never' }, contract),
    (error) => error.errorCode === 'DATA_CONTRACT_VIOLATION',
  );
});

test('Delegation cannot expand capability or tenant scope', () => {
  const delegation = {
    delegationId: 'delegation_1',
    delegatorAgentId: 'invoice',
    delegateAgentId: 'accounting',
    parentInvocationId: 'invocation_1',
    organizationScope: 'org_a',
    workspaceScope: 'workspace_a',
    allowedCapabilityKeys: ['accounting.check_duplicate'],
    allowedInputContractReferences: ['data:invoice-summary@1'],
    allowedDataClasses: ['business'],
    prohibitedDataClasses: ['secret'],
    maximumInvocations: 1,
    remainingInvocations: 1,
    furtherDelegationAllowed: false,
    startsAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
    revocationReference: 'revocations/delegation_1',
  };
  assert.throws(
    () => validateDelegation(delegation, { capabilityKey: 'accounting.create_draft' }),
    (error) => error.errorCode === 'DELEGATION_INVALID',
  );
  assert.throws(
    () => validateDelegation(delegation, { organizationScope: 'org_b' }),
    (error) => error.errorCode === 'SCOPE_MISMATCH',
  );
});

test('Execution Task transitions are bounded', () => {
  const task = {
    taskId: 'task_1',
    invocationId: 'invocation_1',
    state: 'accepted',
    safeProgressCategory: 'accepted',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deadline: '2099-01-01T00:00:00.000Z',
    cancellationSupported: true,
    retryCategory: 'none',
    nextActionCategory: 'poll',
  };
  assert.equal(transitionTask(task, 'running').state, 'running');
  assert.throws(() => transitionTask(task, 'completed'));
});

test('all public JSON Schemas compile', () => {
  const validators = createSchemaValidators();
  assert.ok(Object.keys(validators.schemas).length >= 28);
  for (const name of [
    'issuer-metadata',
    'proof',
    'key-metadata',
    'capability-manifest',
    'revocation-set',
    'request-proof',
    'receipt-proof',
    'trust-result',
  ]) {
    assert.ok(validators.schemas[name], `Missing trust schema ${name}`);
  }
});

test('extensions validate, negotiate, and degrade optional behavior safely', () => {
  assert.equal(
    validateExtensionIdentifier('io.ghostbridge/display-metadata'),
    'io.ghostbridge/display-metadata',
  );
  assert.throws(() => validateExtensionIdentifier('not-namespaced'));
  const optional = {
    identifier: 'com.example/presentation',
    version: '1.0.0',
    status: 'experimental',
    required: false,
  };
  assert.equal(
    negotiateExtensions({ client: [], agent: [optional] }).gracefulDegradation,
    true,
  );
  assert.equal(
    negotiateExtensions({ client: [optional], agent: [optional] }).negotiated.length,
    1,
  );
  assert.throws(() =>
    negotiateExtensions({
      client: [],
      agent: [{ ...optional, required: true }],
    }),
  );
});

test('profile declarations distinguish Core, Governed, and deferred coordination', () => {
  const profiles = validateProfileDeclarations(DEFAULT_PROFILE_DECLARATIONS);
  assert.deepEqual(profiles.core.conformance, ['C1', 'C2', 'C3']);
  assert.deepEqual(profiles.governedExecution.conformance, ['G1', 'G2', 'G3']);
  assert.equal(profiles.agentCoordination.supported, false);
  assert.equal(profiles.agentCoordination.status, 'deferred');
  assert.equal(profiles.agentCoordination.id, PROFILE_IDS.agentCoordination);
  assert.throws(() =>
    validateProfileDeclarations({
      core: { supported: true, status: 'draft', conformance: ['A1'] },
    }),
  );
});

test('authentication-mode negotiation is generic and cannot silently downgrade', () => {
  assert.equal(
    negotiateAuthenticationMode({
      hostSupported: ['signed_request', 'oauth'],
      agentSupported: ['oauth', 'mutual_tls'],
    }).selectedMode,
    'oauth',
  );
  assert.throws(
    () =>
      negotiateAuthenticationMode({
        hostSupported: ['signed_request'],
        agentSupported: ['oauth'],
      }),
    (error) => error.errorCode === 'NO_COMPATIBLE_AUTHENTICATION_MODE',
  );
});

test('compatibility checker reports compatible, limited, and incompatible profiles', () => {
  const fixture = compatibilityFixture();
  assert.equal(checkCompatibility(fixture).status, 'compatible');
  assert.equal(
    checkCompatibility({
      ...fixture,
      discovery: {
        ...fixture.discovery,
        profiles: {
          ...fixture.discovery.profiles,
          governedExecution: {
            supported: false,
            status: 'draft',
            conformance: [],
          },
        },
      },
    }).status,
    'compatible_with_limitations',
  );
  assert.equal(
    checkCompatibility({
      ...fixture,
      host: {
        ...fixture.host,
        supportedProtocolVersions: ['ghostbridge/9.0'],
      },
    }).reasons[0].code,
    'no_common_protocol_version',
  );
  assert.throws(
    () =>
      assertCompatibility({
        ...fixture,
        connectionOffer: {
          ...fixture.connectionOffer,
          authenticationMode: 'oauth',
          authenticationModes: ['oauth'],
        },
      }),
    (error) => error.errorCode === 'NO_COMPATIBLE_AUTHENTICATION_MODE',
  );
});

test('installation preview excludes runtime and authentication setup references', () => {
  const fixture = compatibilityFixture();
  const preview = createInstallationPreview({
    ...fixture,
    compatibility: checkCompatibility(fixture),
    scope: { organizationScope: 'org_test', workspaceScope: 'workspace_test' },
  });
  const serialized = JSON.stringify(preview);
  assert.equal(preview.agent.displayName, 'Compatibility Agent');
  assert.doesNotMatch(serialized, /runtimeReference|authenticationSetupReference|accessToken/);
});

function compatibilityFixture() {
  const profiles = DEFAULT_PROFILE_DECLARATIONS;
  const passport = {
    protocolVersion: PROTOCOL_VERSION,
    passportId: 'passport_compatibility',
    passportVersion: '1',
    agentId: 'agent_compatibility',
    displayName: 'Compatibility Agent',
    safeDescription: 'A synthetic compatibility fixture.',
    issuer: 'issuer_fixture',
    issuedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
    status: 'active',
    capabilities: ['fixture.read'],
    supportedProtocolVersions: [PROTOCOL_VERSION],
    supportedTransports: ['http-json'],
    dataDeclarations: [],
    delegationDeclarations: [],
    approvalDeclarations: [],
    receiptSupport: true,
    revocationReference: 'revocations/passport_compatibility',
    profiles,
  };
  const discovery = {
    protocol: 'ghostbridge',
    supportedVersions: [PROTOCOL_VERSION],
    preferredVersion: PROTOCOL_VERSION,
    status: 'experimental',
    features: {
      tasks: true,
      approvals: true,
      delegation: false,
      receipts: true,
      revocation: true,
    },
    profiles,
    transports: ['http-json'],
    maximumMessageBytes: 262144,
    endpoints: { passport: '/ghostbridge/passport' },
    extensionNamespaces: [],
  };
  const capability = {
    capabilityKey: 'fixture.read',
    capabilityVersion: '1',
    displayName: 'Read fixture',
    safeDescription: 'Reads a synthetic fixture.',
    inputContractReference: 'data:fixture-input@1',
    outputContractReference: 'data:fixture-output@1',
    acceptedDataClasses: ['business'],
    producedDataClasses: ['business'],
    prohibitedDataClasses: ['secret'],
    riskCategory: 'low',
    sideEffectCategory: 'read',
    idempotencySupport: 'optional',
    asynchronousSupport: true,
    cancellationSupport: true,
    requiredPermissions: [],
    approvalRequirement: 'none',
    delegationPolicy: { allowed: false },
    timeoutBounds: { minimumMs: 1, maximumMs: 1000 },
    receiptRequirement: 'required',
    status: 'active',
  };
  const connectionOffer = {
    connectionOfferId: 'offer_compatibility',
    agentId: passport.agentId,
    passportReference: `passports/${passport.passportId}`,
    protocolVersion: PROTOCOL_VERSION,
    transportCategory: 'http-json',
    runtimeReference: 'discovery:endpoints.invocations',
    authenticationMode: 'none',
    authenticationModes: ['none'],
    authenticationSetupReference: 'ghostbridge:fixture',
    expiresAt: '2099-01-01T00:00:00.000Z',
    acceptedOrganizationScope: 'org_test',
    acceptedWorkspaceScope: 'workspace_test',
    restrictions: [],
    revocationReference: 'revocations/offer_compatibility',
  };
  return {
    host: {
      supportedProtocolVersions: [PROTOCOL_VERSION],
      profiles,
      authenticationModes: ['none'],
      extensions: [],
      requiredProfiles: [PROFILE_IDS.core],
    },
    discovery,
    passport,
    capabilities: [capability],
    connectionOffer,
  };
}
