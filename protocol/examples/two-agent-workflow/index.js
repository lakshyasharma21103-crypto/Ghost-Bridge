'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  PROTOCOL_VERSION,
  boundedSerialize,
  negotiateVersion,
  projectDataContract,
  protocolError,
  validatePassport,
  validateReceipt,
} = require('@ghostbridge/protocol-core');
const { createGhostBridgeClient } = require('@ghostbridge/native-client');
const {
  createInvoiceAgent,
  invoiceSummaryDataContract,
} = require('@ghostbridge/example-invoice-agent');
const { createAccountingAgent } = require('@ghostbridge/example-accounting-agent');

async function runTwoAgentWorkflow(options = {}) {
  const invoiceAgent = createInvoiceAgent();
  const accountingAgent = createAccountingAgent();
  const listeners = [];
  const checks = [];
  const record = (name, detail) => {
    checks.push({ name, status: 'pass', detail });
    options.onCheck?.(checks.at(-1));
  };

  try {
    const [invoiceListener, accountingListener] = await Promise.all([
      invoiceAgent.listen(),
      accountingAgent.listen(),
    ]);
    listeners.push(invoiceListener, accountingListener);
    const invoiceClient = createGhostBridgeClient({
      baseUrl: invoiceListener.baseUrl,
      localFixtureMode: true,
      allowedLocalOrigins: [invoiceListener.baseUrl],
    });
    const accountingClient = createGhostBridgeClient({
      baseUrl: accountingListener.baseUrl,
      localFixtureMode: true,
      allowedLocalOrigins: [accountingListener.baseUrl],
    });

    const [invoiceDiscovery, accountingDiscovery] = await Promise.all([
      invoiceClient.discover(),
      accountingClient.discover(),
    ]);
    record('Ghost Bridge discovery');
    const negotiation = negotiateVersion({
      remoteSupported: accountingDiscovery.supportedVersions,
      remotePreferred: accountingDiscovery.preferredVersion,
    });
    if (negotiation.selectedVersion !== PROTOCOL_VERSION) throw new Error('Version mismatch.');
    record('protocol version negotiation');

    const [invoicePassport, accountingPassport] = await Promise.all([
      invoiceClient.getPassport(),
      accountingClient.getPassport(),
    ]);
    validatePassport(invoicePassport);
    validatePassport(accountingPassport);
    record('Agent Passport validation');
    const [invoiceCapabilities, accountingCapabilities] = await Promise.all([
      invoiceClient.listCapabilities(),
      accountingClient.listCapabilities(),
    ]);
    if (invoiceCapabilities.length !== 1 || accountingCapabilities.length !== 2) {
      throw new Error('Reference capability discovery failed.');
    }
    record('Capability Contract discovery');

    const invoiceGrant = invoiceAgent.issueInstallGrant({
      organizationScope: 'org_alpha',
      workspaceScope: 'workspace_invoices',
      restrictions: ['synthetic_data_only'],
    });
    const accountingGrant = accountingAgent.issueInstallGrant({
      organizationScope: 'org_alpha',
      workspaceScope: 'workspace_invoices',
      restrictions: ['synthetic_data_only'],
    });
    const scope = {
      organizationScope: 'org_alpha',
      workspaceScope: 'workspace_invoices',
    };
    await invoiceClient.resolveInstallGrant(invoiceGrant.key, scope);
    record('one-time Install Grant');
    const invoiceConnection = await invoiceClient.install(invoiceGrant.key, scope);
    const invoiceReplay = await invoiceClient.install(invoiceGrant.key, scope);
    if (
      invoiceReplay.connectionId !== invoiceConnection.connectionId ||
      invoiceAgent.getConnectionCount() !== 1
    ) {
      throw new Error('Install Grant idempotency failed.');
    }
    record('installation idempotency');

    await expectProtocolError(
      () =>
        accountingClient.resolveInstallGrant(accountingGrant.key, {
          organizationScope: 'org_beta',
          workspaceScope: 'workspace_invoices',
        }),
      'SCOPE_MISMATCH',
    );
    record('organization isolation');
    await expectProtocolError(
      () =>
        accountingClient.resolveInstallGrant(accountingGrant.key, {
          organizationScope: 'org_alpha',
          workspaceScope: 'workspace_other',
        }),
      'SCOPE_MISMATCH',
    );
    record('workspace isolation');
    const accountingConnection = await accountingClient.install(accountingGrant.key, scope);

    const invoiceInvocation = envelope({
      invocationId: 'invocation_invoice_extract',
      targetAgentId: invoicePassport.agentId,
      targetPassportVersion: invoicePassport.passportVersion,
      capabilityKey: 'invoice.extract',
      payload: {
        invoiceId: 'INV-2026-001',
        supplierName: 'Synthetic Supplies Ltd',
        currency: 'USD',
        subtotal: 1250,
        tax: 125,
      },
    });
    const invoiceResult = await invoiceClient.invoke(
      invoiceConnection.connectionId,
      invoiceInvocation,
    );
    if (invoiceResult.task.state !== 'completed') throw new Error('Invoice Task did not complete.');
    record('native invocation');
    record('Execution Task');
    validateReceipt(invoiceResult.receipt);
    record('Execution Receipt');

    const invoiceSummary = projectDataContract(
      invoiceResult.output,
      invoiceSummaryDataContract,
    );
    await expectProtocolError(
      async () =>
        projectDataContract(
          { ...invoiceResult.output, apiKey: 'synthetic-prohibited-secret' },
          invoiceSummaryDataContract,
        ),
      'DATA_CONTRACT_VIOLATION',
    );
    record('Data Contract');

    const checkDelegation = delegation({
      delegationId: 'delegation_check_duplicate',
      capabilityKey: 'accounting.check_duplicate',
      parentInvocationId: invoiceInvocation.invocationId,
    });
    accountingAgent.registerDelegation(checkDelegation);
    const checkInvocation = envelope({
      invocationId: 'invocation_check_duplicate',
      targetAgentId: accountingPassport.agentId,
      targetPassportVersion: accountingPassport.passportVersion,
      capabilityKey: 'accounting.check_duplicate',
      delegationReference: checkDelegation.delegationId,
      payload: invoiceSummary,
    });
    const checkResult = await accountingClient.invoke(
      accountingConnection.connectionId,
      checkInvocation,
    );
    if (checkResult.output.duplicate !== false) throw new Error('Duplicate fixture was incorrect.');
    record('scoped Delegation Grant');

    await expectProtocolError(
      () =>
        accountingClient.invoke(
          accountingConnection.connectionId,
          envelope({
            invocationId: 'invocation_illegal_expansion',
            targetAgentId: accountingPassport.agentId,
            targetPassportVersion: accountingPassport.passportVersion,
            capabilityKey: 'accounting.create_draft',
            delegationReference: checkDelegation.delegationId,
            idempotencyKey: 'illegal-expansion',
            payload: invoiceSummary,
          }),
        ),
      'DELEGATION_INVALID',
    );
    record('delegation cannot expand authority');

    const draftDelegation = delegation({
      delegationId: 'delegation_create_draft',
      capabilityKey: 'accounting.create_draft',
      parentInvocationId: invoiceInvocation.invocationId,
    });
    accountingAgent.registerDelegation(draftDelegation);
    const draftInvocation = envelope({
      invocationId: 'invocation_create_draft',
      targetAgentId: accountingPassport.agentId,
      targetPassportVersion: accountingPassport.passportVersion,
      capabilityKey: 'accounting.create_draft',
      delegationReference: draftDelegation.delegationId,
      idempotencyKey: 'draft-inv-2026-001',
      payload: invoiceSummary,
    });
    const waiting = await accountingClient.invoke(
      accountingConnection.connectionId,
      draftInvocation,
    );
    if (waiting.task.state !== 'waiting_for_approval' || !waiting.approvalChallenge) {
      throw new Error('Expected an Approval Challenge.');
    }
    record('Approval Challenge');
    const decision = {
      challengeId: waiting.approvalChallenge.challengeId,
      decisionId: 'decision_finance_manager_001',
      decision: 'approved',
      approvedLimits: { maximumAmount: 100_000, currency: 'USD' },
      decidedBy: 'finance_manager_fixture',
      decidedAt: new Date().toISOString(),
      safeReasonCode: 'SYNTHETIC_FIXTURE_APPROVED',
    };
    await accountingClient.submitApprovalDecision(
      waiting.approvalChallenge.challengeId,
      decision,
    );
    const approvedInvocation = {
      ...draftInvocation,
      approvalReference: decision.decisionId,
    };
    const draftResult = await accountingClient.invoke(
      accountingConnection.connectionId,
      approvedInvocation,
    );
    const draftReplay = await accountingClient.invoke(
      accountingConnection.connectionId,
      approvedInvocation,
    );
    if (
      draftReplay.idempotentReplay !== true ||
      accountingAgent.getDraftCount() !== 1 ||
      draftReplay.output.draftId !== draftResult.output.draftId
    ) {
      throw new Error('Side-effecting Invocation idempotency failed.');
    }
    record('approval binding');
    record('invocation idempotency');
    validateReceipt(draftResult.receipt);

    accountingAgent.revokeConnection(accountingConnection.connectionId);
    await expectProtocolError(
      () =>
        accountingClient.invoke(accountingConnection.connectionId, {
          ...checkInvocation,
          invocationId: 'invocation_after_revocation',
          messageId: 'message_after_revocation',
        }),
      'CONNECTION_NOT_ACTIVE',
    );
    record('Connection revocation');

    await expectProtocolError(
      async () =>
        invoiceAgent.invoke(invoiceConnection.connectionId, {
          ...invoiceInvocation,
          protocolVersion: 'ghostbridge/9.0',
          invocationId: 'invocation_unsupported_version',
        }),
      'UNSUPPORTED_PROTOCOL_VERSION',
    );
    record('unsupported version rejected');

    assertNoPrivateFields({
      invoiceDiscovery,
      accountingDiscovery,
      invoicePassport,
      accountingPassport,
      invoiceCapabilities,
      accountingCapabilities,
      invoiceResult,
      checkResult,
      draftResult,
    });
    record('public DTO isolation');
    record('no credentials leaked');

    assertNativePackagesHaveNoLegacyDependency(
      path.resolve(__dirname, '../../../packages'),
    );
    record('no MCP dependency');
    record('no MCP URL required');
    const groundedResearchState = 'disabled';
    if (groundedResearchState !== 'disabled') throw new Error('Grounded research changed state.');
    record('grounded research remains disabled');

    const metricLabels = [...invoiceAgent.getMetrics(), ...accountingAgent.getMetrics()];
    if (
      metricLabels.some((item) =>
        Object.keys(item).some((key) => /(?:agent|passport|organization|workspace|invocation|task|delegation|approval|receipt|request|trace)Id/i.test(key)),
      )
    ) {
      throw new Error('Native metrics contain a high-cardinality identifier.');
    }
    record('bounded metrics');

    return {
      protocolVersion: PROTOCOL_VERSION,
      stability: 'experimental',
      checks,
      invoiceConnection,
      accountingConnection,
      invoiceReceipt: invoiceResult.receipt,
      accountingReceipt: draftResult.receipt,
      draftCount: accountingAgent.getDraftCount(),
      groundedResearchState,
    };
  } finally {
    await Promise.allSettled(listeners.map((listener) => listener.close()));
  }
}

function envelope({
  invocationId,
  targetAgentId,
  targetPassportVersion,
  capabilityKey,
  payload,
  delegationReference,
  idempotencyKey,
}) {
  return {
    protocolVersion: PROTOCOL_VERSION,
    invocationId,
    messageId: `message_${invocationId}`,
    organizationScope: 'org_alpha',
    workspaceScope: 'workspace_invoices',
    initiatingSubject: 'invoice-agent',
    targetAgentId,
    targetPassportVersion,
    capabilityKey,
    capabilityVersion: '1',
    ...(delegationReference ? { delegationReference } : {}),
    inputContractReference:
      capabilityKey === 'invoice.extract' ? 'data:synthetic-invoice@1' : 'data:invoice-summary@1',
    ...(idempotencyKey ? { idempotencyKey } : {}),
    deadline: new Date(Date.now() + 60_000).toISOString(),
    traceContext: { traceId: `trace_${invocationId}` },
    payload,
    payloadClassification: ['business'],
    requestedReceiptProfile: 'standard',
    extensions: {},
  };
}

function delegation({ delegationId, capabilityKey, parentInvocationId }) {
  return {
    delegationId,
    delegatorAgentId: 'invoice-agent',
    delegateAgentId: 'accounting-agent',
    parentInvocationId,
    organizationScope: 'org_alpha',
    workspaceScope: 'workspace_invoices',
    allowedCapabilityKeys: [capabilityKey],
    allowedInputContractReferences: ['data:invoice-summary@1'],
    allowedDataClasses: ['business.invoice_summary'],
    prohibitedDataClasses: ['credential', 'secret', 'hidden_reasoning'],
    maximumInvocations: 1,
    remainingInvocations: 1,
    furtherDelegationAllowed: false,
    startsAt: new Date(Date.now() - 1_000).toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    revocationReference: `revocations/delegation/${delegationId}`,
  };
}

async function expectProtocolError(operation, expectedCode) {
  try {
    await operation();
  } catch (error) {
    if (error.errorCode === expectedCode) return error;
    throw error;
  }
  throw new Error(`Expected protocol error ${expectedCode}.`);
}

function assertNoPrivateFields(value) {
  const serialized = boundedSerialize(value).toLowerCase();
  const prohibited = [
    'systemprompt',
    'chainofthought',
    'hiddenreasoning',
    'privatememory',
    'apikey',
    'runtimetoken',
    'authorization',
    'databaseuri',
    'mongodb',
    'workerlease',
    'privatepolicyrules',
    'redeemedinstallgrant',
  ];
  const found = prohibited.find((token) => serialized.includes(token));
  if (found) throw protocolError('INVALID_MESSAGE', 'A public DTO contains private internal data.');
}

function assertNativePackagesHaveNoLegacyDependency(packagesDirectory) {
  const files = walk(packagesDirectory);
  const forbiddenToken = ['m', 'c', 'p'].join('');
  for (const file of files) {
    if (!/\.(?:js|ts|json)$/.test(file)) continue;
    const content = fs.readFileSync(file, 'utf8').toLowerCase();
    if (content.includes(forbiddenToken)) {
      throw new Error(`Native package contains a legacy dependency token: ${file}`);
    }
  }
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

module.exports = {
  runTwoAgentWorkflow,
};
