'use strict';

const { createGhostBridgeClient } = require('@ghostbridge/native-client');
const {
  PROTOCOL_VERSION,
  projectDataContract,
  validateApprovalDecision,
  validateCapabilityContract,
  validateDelegation,
  validateReceipt,
} = require('@ghostbridge/protocol-core');
const {
  evaluateTrustPolicy,
  validateCapabilityManifest,
  validateIssuerMetadata,
  validateJwks,
  verifyDocument,
} = require('@ghostbridge/trust');

const COMMANDS = Object.freeze([
  'verify-core',
  'verify-core-c1',
  'verify-core-c2',
  'verify-core-c3',
  'verify-governed',
  'verify-governed-g1',
  'verify-governed-g2',
  'verify-governed-g3',
  'verify-discovery',
  'verify-passport',
  'verify-capabilities',
  'verify-installation',
  'verify-invocation',
  'verify-delegation',
  'verify-data-contract',
  'verify-approval',
  'verify-receipt',
  'verify-revocation',
  'verify-level-1',
  'verify-level-2',
  'verify-level-3',
]);

const CONFORMANCE_PROFILES = Object.freeze({
  Core: Object.freeze({
    profileId: 'ghostbridge.core',
    levels: Object.freeze({
      C1: Object.freeze(['discovery', 'passport', 'revocation']),
      C2: Object.freeze(['installation']),
      C3: Object.freeze(['capabilities', 'invocation', 'receipt']),
    }),
  }),
  'Governed Execution': Object.freeze({
    profileId: 'ghostbridge.governed-execution',
    levels: Object.freeze({
      G1: Object.freeze(['installation']),
      G2: Object.freeze(['data-contract', 'approval']),
      G3: Object.freeze(['invocation', 'receipt', 'revocation']),
    }),
  }),
  'Agent Coordination': Object.freeze({
    profileId: 'ghostbridge.agent-coordination.experimental',
    status: 'Experimental/Deferred',
    required: false,
  }),
});

const DEPRECATED_LEVEL_ALIASES = Object.freeze({
  'verify-level-1': 'verify-core-c1',
  'verify-level-2': 'verify-core-c3',
  'verify-level-3': 'verify-governed',
});

async function runConformance(options = {}) {
  assertLocalFixture(options.baseUrl);
  const client =
    options.client ||
    createGhostBridgeClient({
      baseUrl: options.baseUrl,
      timeoutMs: Math.min(options.timeoutMs || 5_000, 30_000),
    });
  const results = [];
  const check = async (name, operation) => {
    try {
      const detail = await operation();
      results.push({ name, status: 'pass', detail: summarize(detail) });
      options.onResult?.(results.at(-1));
      return detail;
    } catch (error) {
      results.push({
        name,
        status: 'fail',
        errorCode: error.errorCode || 'CONFORMANCE_CHECK_FAILED',
        safeMessage: error.safeMessage || error.message,
      });
      options.onResult?.(results.at(-1));
      throw error;
    }
  };

  const command = options.command || 'verify-level-1';
  if (!COMMANDS.includes(command)) throw new Error(`Unknown conformance command: ${command}`);

  let discovery;
  let passport;
  let capabilities;
  if (includesCheck(command, 'discovery', 1)) {
    discovery = await check('discovery', () => client.discover());
    if (discovery.preferredVersion !== PROTOCOL_VERSION) {
      throw new Error('Fixture did not prefer ghostbridge/0.1-draft.');
    }
  }
  if (includesCheck(command, 'passport', 1)) {
    passport = await check('passport', () => client.getPassport());
  }
  if (includesCheck(command, 'capabilities', 1)) {
    capabilities = await check('capabilities', async () => {
      const items = await client.listCapabilities();
      items.forEach(validateCapabilityContract);
      return items;
    });
  }
  if (includesCheck(command, 'revocation', 1)) {
    const source = passport || (await client.getPassport());
    await check('revocation', () => client.checkRevocation('passport', source.passportId));
  }

  let connection;
  let invocation;
  if (includesCheck(command, 'installation', 2)) {
    requireFixture(options, ['installGrant', 'scope']);
    await check('installation-resolution', () =>
      client.resolveInstallGrant(options.installGrant, options.scope),
    );
    connection = await check('installation', () =>
      client.install(options.installGrant, options.scope),
    );
  }
  if (includesCheck(command, 'invocation', 2)) {
    requireFixture(options, ['invocation']);
    const connectionId = options.connectionId || connection?.connectionId;
    if (!connectionId) throw new Error('A conformance connectionId is required.');
    invocation = await check('invocation', () => client.invoke(connectionId, options.invocation));
    await check('task', () => client.getTask(invocation.task.taskId));
  }
  if (includesCheck(command, 'receipt', 2)) {
    const receiptId = options.receiptId || invocation?.receipt?.receiptId;
    if (!receiptId) throw new Error('A conformance receiptId is required.');
    await check('receipt', async () => validateReceipt(await client.getReceipt(receiptId)));
  }

  if (includesCheck(command, 'delegation', 3)) {
    requireFixture(options, ['delegation']);
    await check('delegation', async () => validateDelegation(options.delegation));
  }
  if (includesCheck(command, 'data-contract', 3)) {
    requireFixture(options, ['dataContract', 'dataContractFixture']);
    await check('data-contract', async () =>
      projectDataContract(options.dataContractFixture, options.dataContract),
    );
  }
  if (includesCheck(command, 'approval', 3)) {
    requireFixture(options, ['approvalChallenge', 'approvalDecision']);
    await check('approval', async () =>
      validateApprovalDecision(options.approvalDecision, options.approvalChallenge),
    );
  }

  return {
    protocolVersion: PROTOCOL_VERSION,
    command,
    profile: profileForCommand(command),
    ...(DEPRECATED_LEVEL_ALIASES[command]
      ? { deprecation: { status: 'deprecated-alias', replacement: DEPRECATED_LEVEL_ALIASES[command] } }
      : {}),
    passed: results.every((result) => result.status === 'pass'),
    results,
  };
}

function assertLocalFixture(baseUrl) {
  const url = new URL(baseUrl);
  const localhost = ['127.0.0.1', '::1', 'localhost'].includes(url.hostname);
  if (!localhost || url.protocol !== 'http:') {
    throw new Error('The draft conformance runner only accesses configured localhost HTTP fixtures.');
  }
}

function includesCheck(command, name, level) {
  const profileChecks = checksForProfileCommand(command);
  if (profileChecks) return profileChecks.includes(name);
  return command === `verify-${name}` || command === `verify-level-${level}` ||
    (command.startsWith('verify-level-') && Number(command.at(-1)) > level);
}

function checksForProfileCommand(command) {
  const core = CONFORMANCE_PROFILES.Core.levels;
  const governed = CONFORMANCE_PROFILES['Governed Execution'].levels;
  const mappings = {
    'verify-core-c1': core.C1,
    'verify-core-c2': [...core.C1, ...core.C2],
    'verify-core-c3': [...core.C1, ...core.C2, ...core.C3],
    'verify-core': [...core.C1, ...core.C2, ...core.C3],
    'verify-governed-g1': [...core.C1, ...core.C2, ...core.C3, ...governed.G1],
    'verify-governed-g2': [...core.C1, ...core.C2, ...core.C3, ...governed.G1, ...governed.G2],
    'verify-governed-g3': [...core.C1, ...core.C2, ...core.C3, ...governed.G1, ...governed.G2, ...governed.G3],
    'verify-governed': [...core.C1, ...core.C2, ...core.C3, ...governed.G1, ...governed.G2, ...governed.G3],
  };
  return mappings[command] ? [...new Set(mappings[command])] : undefined;
}

function profileForCommand(command) {
  if (command.startsWith('verify-governed')) {
    return CONFORMANCE_PROFILES['Governed Execution'].profileId;
  }
  if (command.startsWith('verify-core')) return CONFORMANCE_PROFILES.Core.profileId;
  return undefined;
}

function requireFixture(options, names) {
  const missing = names.filter((name) => !options[name]);
  if (missing.length) throw new Error(`Missing conformance fixtures: ${missing.join(', ')}`);
}

function summarize(value) {
  if (Array.isArray(value)) return { count: value.length };
  if (!value || typeof value !== 'object') return undefined;
  return Object.fromEntries(
    ['protocol', 'preferredVersion', 'passportId', 'connectionId', 'taskId', 'receiptId', 'status']
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, value[key]]),
  );
}

function runTrustConformance(options = {}) {
  const metadata = validateIssuerMetadata(options.metadata, {
    expectedIssuer: options.expectedIssuer || options.metadata?.issuerId,
    localTestMode: options.localTestMode === true,
    allowedLocalIssuers: options.allowedLocalIssuers,
    minimumMetadataSequence: options.minimumMetadataSequence,
    clock: options.clock,
  });
  const jwks = validateJwks(options.jwks, options);
  const metadataProof = verifyDocument(metadata, jwks, {
    purpose: 'issuer_metadata',
    expectedIssuer: metadata.issuerId,
    clock: options.clock,
  });
  const passportProof = verifyDocument(options.passport, jwks, {
    purpose: 'passport_signing',
    expectedIssuer: metadata.issuerId,
    clock: options.clock,
  });
  const capabilityIntegrity = validateCapabilityManifest(
    options.capabilityManifest,
    options.capabilities,
    options.passport,
    { ...options, jwks },
  );
  const policy = evaluateTrustPolicy({
    issuerId: metadata.issuerId,
    rootKeyThumbprint: metadata.rootKeyThumbprints[0],
    organizationPolicy: options.organizationPolicy,
    workspacePolicy: options.workspacePolicy,
    highImpact: options.highImpact === true,
  });
  return Object.freeze({
    profile: 'ghostbridge-trust/0.1-draft',
    status: 'Experimental security profile',
    passed:
      metadataProof.valid &&
      passportProof.valid &&
      capabilityIntegrity.valid &&
      policy.category === 'verified_and_trusted',
    checks: Object.freeze({
      issuerMetadata: metadataProof,
      passport: passportProof,
      capabilityManifest: capabilityIntegrity,
      policy,
    }),
  });
}

module.exports = {
  COMMANDS,
  CONFORMANCE_PROFILES,
  DEPRECATED_LEVEL_ALIASES,
  assertLocalFixture,
  runConformance,
  runTrustConformance,
};
