'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  PROFILE_IDS,
  projectDataContract,
  validateReceipt,
} = require('@ghostbridge/protocol-core');
const {
  ApprovalRequiredError,
  AuthorizationError,
  ContractViolationError,
  ScopeMismatchError,
  createGhostBridgeClient,
} = require('@ghostbridge/native-client');
const {
  accountingDraftDataContract,
  createLedgerWorksProvider,
} = require('../protocol/examples/governed-host-agent/ledgerworks-provider');
const {
  createOpsCanvasHost,
} = require('../protocol/examples/governed-host-agent/opscanvas-host');

const root = path.resolve(__dirname, '..');
const pass = (message) => process.stdout.write(`PASS ${message}\n`);

async function main() {
  const provider = createLedgerWorksProvider();
  const listener = await provider.listen();
  let host;
  try {
    const scope = {
      organizationScope: 'organization_a',
      workspaceScope: 'accounts_payable',
    };
    const grant = provider.issueInstallGrant(scope);
    const resolver = async () => ({ baseUrl: listener.baseUrl });
    let authenticatedSubject;
    host = createOpsCanvasHost({
      installGrantResolver: resolver,
      localFixtureMode: true,
      allowedLocalOrigins: [listener.baseUrl],
      issuerKeyResolver: async () => ({ verified: true }),
      authenticationHandler: async ({ mode }) => {
        assert.equal(mode, 'platform_brokered');
        authenticatedSubject = 'employee_ap_001';
        return { credentialReference: 'employee_session_synthetic' };
      },
    });

    const preview = await host.previewInstall({ grant: grant.key, ...scope });
    assert.equal(preview.compatibility.profiles.governedExecution.supported, true);
    assert.deepEqual(
      preview.compatibility.profiles.governedExecution.conformance,
      ['G1', 'G2', 'G3'],
    );
    assert.equal(preview.compatibility.profiles.agentCoordination, undefined);
    pass('Governed Execution profile');

    await assert.rejects(
      () =>
        createGhostBridgeClient({
          installGrantResolver: resolver,
          supportedAuthenticationModes: ['platform_brokered'],
          localFixtureMode: true,
          allowedLocalOrigins: [listener.baseUrl],
        }).previewInstall({
          grant: grant.key,
          organizationScope: 'organization_b',
          workspaceScope: scope.workspaceScope,
        }),
      (error) => error instanceof ScopeMismatchError,
    );
    pass('organization isolation');
    await assert.rejects(
      () =>
        createGhostBridgeClient({
          installGrantResolver: resolver,
          supportedAuthenticationModes: ['platform_brokered'],
          localFixtureMode: true,
          allowedLocalOrigins: [listener.baseUrl],
        }).previewInstall({
          grant: grant.key,
          organizationScope: scope.organizationScope,
          workspaceScope: 'general_ledger',
        }),
      (error) => error instanceof ScopeMismatchError,
    );
    pass('workspace isolation');

    const connection = await host.install({
      grant: grant.key,
      ...scope,
      approvedCapabilityKeys: ['accounting.create_draft'],
    });
    assert.equal(authenticatedSubject, 'employee_ap_001');
    pass('user authorization');

    await assert.rejects(
      () =>
        host.invoke({
          connectionId: connection.connectionId,
          capability: 'accounting.export_ledger',
          input: {},
          initiatingSubject: 'employee_ap_001',
          ...scope,
          idempotencyKey: 'disabled-export',
        }),
      (error) => error instanceof AuthorizationError,
    );
    pass('capability policy');

    const validInput = {
      invoiceId: 'INV-GOVERNED-1',
      supplierName: 'Synthetic Supplier',
      amount: 1250,
      currency: 'USD',
    };
    assert.deepEqual(
      projectDataContract(validInput, accountingDraftDataContract, {
        dataClasses: ['business.invoice_summary'],
      }),
      validInput,
    );
    pass('Data Contract enforcement');
    await assert.rejects(
      () =>
        host.invoke({
          connectionId: connection.connectionId,
          capability: 'accounting.create_draft',
          input: { ...validInput, accessToken: 'synthetic-prohibited-value' },
          initiatingSubject: 'employee_ap_001',
          ...scope,
          idempotencyKey: 'prohibited-field',
        }),
      (error) => error instanceof ContractViolationError,
    );
    pass('prohibited field blocked');
    await assert.rejects(
      () =>
        host.invoke({
          connectionId: connection.connectionId,
          capability: 'accounting.create_draft',
          input: validInput,
          initiatingSubject: 'employee_unapproved',
          ...scope,
          idempotencyKey: 'unauthorized-subject',
        }),
      (error) => error instanceof AuthorizationError,
    );

    const invocationId = 'invocation_governed_draft';
    const first = await host.invoke({
      connectionId: connection.connectionId,
      capability: 'accounting.create_draft',
      input: validInput,
      initiatingSubject: 'employee_ap_001',
      invocationId,
      ...scope,
      idempotencyKey: 'governed-draft-1',
    });
    assert.equal(first.task.state, 'waiting_for_approval');
    assert.equal(first.approvalChallenge.invocationId, invocationId);
    pass('Approval Challenge');

    const decision = await host.submitApprovalDecision(first.approvalChallenge.challengeId, {
      challengeId: first.approvalChallenge.challengeId,
      decisionId: 'decision_governed_draft',
      decision: 'approved',
      approvedLimits: { maximumAmount: 100000, currency: 'USD' },
      decidedBy: 'finance_manager_001',
      decidedAt: new Date().toISOString(),
      safeReasonCode: 'SYNTHETIC_APPROVED',
    });
    assert.equal(decision.decision, 'approved');
    pass('action-bound Approval Decision');

    const completed = await host.invoke({
      connectionId: connection.connectionId,
      capability: 'accounting.create_draft',
      input: validInput,
      initiatingSubject: 'employee_ap_001',
      invocationId,
      approvalReference: decision.decisionId,
      ...scope,
      idempotencyKey: 'governed-draft-1',
    });
    assert.equal(completed.task.state, 'completed');
    const reused = await host.invoke({
      connectionId: connection.connectionId,
      capability: 'accounting.create_draft',
      input: { ...validInput, invoiceId: 'INV-GOVERNED-2' },
      initiatingSubject: 'employee_ap_001',
      invocationId: 'invocation_reused_approval',
      approvalReference: decision.decisionId,
      ...scope,
      idempotencyKey: 'governed-draft-2',
    });
    assert.equal(reused.task.state, 'waiting_for_approval');
    assert.notEqual(reused.approvalChallenge.invocationId, invocationId);
    pass('approval cannot be reused');

    const expired = provider.agent.issueApprovalChallenge({
      invocationId: 'invocation_expired_approval',
      ...scope,
      actionKey: 'accounting.create_draft',
      expiresAt: '2020-01-01T00:00:00.000Z',
    });
    await assert.rejects(
      () =>
        host.submitApprovalDecision(expired.challengeId, {
          challengeId: expired.challengeId,
          decisionId: 'decision_expired',
          decision: 'approved',
          approvedLimits: {},
          decidedBy: 'finance_manager_001',
          decidedAt: new Date().toISOString(),
          safeReasonCode: 'TOO_LATE',
        }),
      (error) => error instanceof ApprovalRequiredError && error.code === 'APPROVAL_EXPIRED',
    );

    await assert.rejects(
      () =>
        host.invoke({
          connectionId: connection.connectionId,
          capability: 'accounting.create_draft',
          input: { ...validInput, invoiceId: 'INV-NO-IDEMPOTENCY' },
          initiatingSubject: 'employee_ap_001',
          ...scope,
        }),
      (error) => error.code === 'IDEMPOTENCY_REQUIRED',
    );
    const replay = await host.invoke({
      connectionId: connection.connectionId,
      capability: 'accounting.create_draft',
      input: validInput,
      initiatingSubject: 'employee_ap_001',
      invocationId,
      approvalReference: decision.decisionId,
      ...scope,
      idempotencyKey: 'governed-draft-1',
    });
    assert.equal(replay.idempotentReplay, true);
    assert.equal(provider.draftCount(), 1);
    pass('idempotent side effect');
    assert.equal(completed.task.state, 'completed');
    assert.equal((await host.getTask(completed.task.taskId)).state, 'completed');
    pass('durable Execution Task');
    validateReceipt(completed.receipt);
    const receiptVerification = await host.verifyReceipt(completed.receipt);
    assert.equal(receiptVerification.valid, false);
    assert.ok(['invalid', 'unverified'].includes(receiptVerification.proofState));
    pass('unverified Execution Receipt rejection');

    const revoked = await host.revokeConnection(connection.connectionId);
    assert.equal(revoked.status, 'revoked');
    await assert.rejects(
      () =>
        host.invoke({
          connectionId: connection.connectionId,
          capability: 'accounting.create_draft',
          input: validInput,
          initiatingSubject: 'employee_ap_001',
          ...scope,
          idempotencyKey: 'after-revocation',
        }),
      (error) => error.code === 'CONNECTION_NOT_ACTIVE',
    );
    pass('revocation');

    const providerSource = fs.readFileSync(
      path.join(
        root,
        'protocol',
        'examples',
        'governed-host-agent',
        'ledgerworks-provider.js',
      ),
      'utf8',
    );
    const hostSource = fs.readFileSync(
      path.join(root, 'protocol', 'examples', 'governed-host-agent', 'opscanvas-host.js'),
      'utf8',
    );
    assert.doesNotMatch(hostSource, /ledgerworks|delegat|native-agent|Backend|database/i);
    assert.doesNotMatch(providerSource, /registerDelegation|delegationRequired:\s*true/);
    assert.equal(completed.receipt.delegationReference, undefined);
    pass('no agent-to-agent delegation required');
    pass('governed host-agent compatibility');
  } finally {
    host?.close();
    await listener.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
