'use strict';

const { PROTOCOL_VERSION } = require('@ghostbridge/protocol-core');
const { createGhostBridgeAgent } = require('@ghostbridge/native-agent');

function createAccountingAgent() {
  const invoiceIds = new Set(['INV-EXISTING']);
  const drafts = new Map();
  const agent = createGhostBridgeAgent({
    passport: {
      protocolVersion: PROTOCOL_VERSION,
      passportId: 'passport_accounting_agent',
      passportVersion: '0.1.0',
      agentId: 'accounting-agent',
      displayName: 'Accounting Agent',
      safeDescription: 'Checks invoice duplicates and creates deterministic local accounting drafts.',
      issuer: 'ghostbridge-reference-issuer',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2099-01-01T00:00:00.000Z',
      status: 'active',
      capabilities: ['accounting.check_duplicate', 'accounting.create_draft'],
      supportedProtocolVersions: [PROTOCOL_VERSION],
      supportedTransports: ['http-json'],
      dataDeclarations: [
        { direction: 'input', contractReference: 'data:invoice-summary@1' },
      ],
      delegationDeclarations: [
        {
          capabilities: ['accounting.check_duplicate', 'accounting.create_draft'],
          required: true,
          furtherDelegationAllowed: false,
        },
      ],
      approvalDeclarations: [
        { capability: 'accounting.create_draft', requirement: 'required' },
      ],
      receiptSupport: true,
      revocationReference: 'revocations/passport/passport_accounting_agent',
      documentationReferences: ['/examples/invoice-accounting'],
      extensionDeclarations: [],
    },
  });

  agent.capability('accounting.check_duplicate', {
    delegationRequired: true,
    contract: accountingContract({
      capabilityKey: 'accounting.check_duplicate',
      displayName: 'Check duplicate invoice',
      sideEffectCategory: 'read',
      approvalRequirement: 'none',
    }),
    handler: async ({ input }) => ({
      outcome: 'completed',
      output: {
        invoiceId: String(input.invoiceId),
        duplicate: invoiceIds.has(String(input.invoiceId)),
      },
    }),
  });

  agent.capability('accounting.create_draft', {
    delegationRequired: true,
    approvalLimits: { maximumAmount: 100_000, currency: 'USD' },
    contract: accountingContract({
      capabilityKey: 'accounting.create_draft',
      displayName: 'Create accounting draft',
      sideEffectCategory: 'reversible_write',
      approvalRequirement: 'required',
    }),
    handler: async ({ input, context }) => {
      const draftId = `draft_${input.invoiceId}`;
      if (!drafts.has(draftId)) {
        drafts.set(draftId, {
          draftId,
          invoiceId: String(input.invoiceId),
          total: Number(input.total),
          organizationScope: context.organizationScope,
          workspaceScope: context.workspaceScope,
          status: 'draft',
        });
        invoiceIds.add(String(input.invoiceId));
      }
      return { outcome: 'completed', output: { ...drafts.get(draftId) } };
    },
  });

  agent.getDraftCount = () => drafts.size;
  return agent;
}

function accountingContract({
  capabilityKey,
  displayName,
  sideEffectCategory,
  approvalRequirement,
}) {
  return {
    capabilityKey,
    capabilityVersion: '1',
    displayName,
    safeDescription:
      capabilityKey === 'accounting.check_duplicate'
        ? 'Checks whether a synthetic invoice identifier already exists.'
        : 'Creates one idempotent synthetic accounting draft after approval.',
    inputContractReference: 'data:invoice-summary@1',
    outputContractReference:
      capabilityKey === 'accounting.check_duplicate'
        ? 'data:duplicate-result@1'
        : 'data:accounting-draft@1',
    acceptedDataClasses: ['business.invoice_summary'],
    producedDataClasses: ['business.accounting'],
    prohibitedDataClasses: ['credential', 'secret', 'hidden_reasoning'],
    riskCategory: capabilityKey === 'accounting.check_duplicate' ? 'low' : 'high',
    sideEffectCategory,
    idempotencySupport: sideEffectCategory === 'read' ? 'optional' : 'required',
    asynchronousSupport: true,
    cancellationSupport: true,
    requiredPermissions: [
      capabilityKey === 'accounting.check_duplicate'
        ? 'accounting.invoice.read'
        : 'accounting.draft.create',
    ],
    approvalRequirement,
    delegationPolicy: {
      required: true,
      furtherDelegationAllowed: false,
      maximumChainDepth: 1,
    },
    timeoutBounds: { minimumMs: 1, maximumMs: 10_000 },
    receiptRequirement: 'required',
    status: 'active',
  };
}

module.exports = {
  createAccountingAgent,
};
