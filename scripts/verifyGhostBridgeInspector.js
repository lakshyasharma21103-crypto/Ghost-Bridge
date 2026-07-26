'use strict';

const assert = require('node:assert/strict');
const { approvalActionDigest } = require('@ghostbridge/protocol-core');
const { createInvoiceAgent, invoiceSummaryDataContract } = require('../protocol/examples/invoice-agent/src');
const {
  GhostBridgeInspector,
  InspectorSecurityError,
  assertInspectorTarget,
  sanitizeInspectorValue,
} = require('@ghostbridge/inspector');

const pass = (message) => process.stdout.write(`PASS ${message}\n`);

async function main() {
  assert.throws(() => assertInspectorTarget('https://untrusted.example'), InspectorSecurityError);
  assert.throws(
    () => assertInspectorTarget('https://user:password@untrusted.example', {
      allowUnsafeRemote: true,
      unsafeAcknowledged: true,
    }),
    InspectorSecurityError,
  );
  pass('non-loopback and credential-bearing targets rejected by default');

  const agent = createInvoiceAgent();
  const listener = await agent.listen();
  const inspector = new GhostBridgeInspector({ baseUrl: listener.baseUrl });
  try {
    const connection = await inspector.connect();
    assert.equal(connection.negotiatedVersion, 'ghostbridge/0.1-draft');
    assert.equal((await inspector.inspectPassport()).passport.agentId, 'invoice-agent');
    assert.equal((await inspector.listCapabilities())[0].capabilityKey, 'invoice.extract');
    pass('localhost discovery, Passport, and Capability Contract inspection');

    const scope = { organizationScope: 'org_inspector', workspaceScope: 'workspace_inspector' };
    const grant = agent.issueInstallGrant(scope);
    assert.equal((await inspector.resolveInstallGrant(grant.key, scope)).redemptionState, 'available');
    const installed = await inspector.install(grant.key, scope);
    const catalog = await inspector.searchCapabilities({ query: 'invoice', ...scope });
    assert.equal(catalog.items[0].capabilityKey, 'invoice.extract');
    pass('installation and progressive catalog');

    const result = await inspector.invoke({
      agentId: installed.agentId,
      capability: 'invoice.extract',
      input: {
        invoiceId: 'inv_inspector',
        supplierName: 'Synthetic Supplier',
        currency: 'USD',
        subtotal: 20,
        tax: 1,
      },
      ...scope,
      idempotencyKey: 'inspector-invoice',
      deadline: '2099-01-01T00:00:00.000Z',
    });
    assert.equal((await inspector.inspectTask(result.task.taskId)).state, 'completed');
    assert.equal((await inspector.inspectReceipt(result.receipt.receiptId)).receipt.outcome, 'completed');
    pass('invocation, Task tracking, and Receipt inspection');

    const projected = inspector.previewDataContract(
      {
        invoiceId: 'inv_inspector',
        supplierName: 'Synthetic Supplier',
        currency: 'USD',
        subtotal: 20,
        tax: 1,
        total: 21,
      },
      invoiceSummaryDataContract,
      { dataClasses: ['business.invoice'] },
    );
    assert.equal(projected.projectedOutput.total, 21);
    pass('Data Contract preview');

    const approvalExpiry = new Date(Date.now() + 300_000).toISOString();
    const syntheticApprovalDigest = approvalActionDigest({
      invocationId: 'invocation_approval_inspector',
      connectionId: installed.connectionId,
      capabilityKey: 'accounting.create_draft',
      capabilityVersion: '1',
      organizationScope: scope.organizationScope,
      workspaceScope: scope.workspaceScope,
      inputContractReference: 'data:inspector-approval@1',
      payload: { maximumAmount: 100 },
      sideEffectCategory: 'reversible_write',
      approvalLimits: { maximumAmount: 100 },
      policyDecisionReference: 'policy:draft-default',
      validityBoundary: approvalExpiry,
    });
    const challenge = agent.issueApprovalChallenge({
      invocationId: 'invocation_approval_inspector',
      organizationScope: scope.organizationScope,
      workspaceScope: scope.workspaceScope,
      actionKey: 'accounting.create_draft',
      approvalActionDigest: syntheticApprovalDigest,
      approvalLimits: { maximumAmount: 100 },
      expiresAt: approvalExpiry,
    });
    const decision = await inspector.submitApprovalDecision(challenge.challengeId, {
      challengeId: challenge.challengeId,
      decisionId: 'decision_inspector',
      decision: 'approved',
      approvalActionDigest: challenge.approvalActionDigest,
      approvedLimits: { maximumAmount: 100 },
      decidedBy: 'approver_inspector',
      decidedAt: new Date().toISOString(),
      safeReasonCode: 'APPROVED_FOR_SYNTHETIC_TEST',
    });
    assert.equal(decision.decision, 'approved');
    pass('synthetic local approval flow');

    agent.revokeConnection(installed.connectionId);
    assert.equal(
      (await inspector.inspectRevocation('connection', installed.connectionId)).status,
      'revoked',
    );
    pass('revocation inspection');

    const messages = inspector.messages();
    assert.ok(messages.length >= 8);
    const serialized = JSON.stringify(messages);
    assert.doesNotMatch(serialized, /authorization|cookie|Bearer |runtimeToken|password/i);
    const sanitized = sanitizeInspectorValue({
      authorization: 'Bearer private',
      cookie: 'session=private',
      safe: 'visible',
    });
    assert.equal(sanitized.safe, 'visible');
    assert.doesNotMatch(JSON.stringify(sanitized), /Bearer private|session=private/);
    pass('sanitized message timeline and no credentials leaked');
  } finally {
    inspector.close();
    await listener.close();
  }

  process.stdout.write('PASS Ghost Bridge Inspector verification\n');
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
