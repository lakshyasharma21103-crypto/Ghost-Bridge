'use strict';

const {
  DEFAULT_PROFILE_DECLARATIONS,
  PROTOCOL_VERSION,
  projectDataContract,
} = require('@ghostbridge/protocol-core');
const { createGhostBridgeAgent } = require('@ghostbridge/native-agent');

const accountingDraftDataContract = Object.freeze({
  contractKey: 'ledgerworks-accounting-draft-input',
  contractVersion: '1.0.0',
  direction: 'input',
  allowedFields: ['invoiceId', 'supplierName', 'amount', 'currency'],
  requiredFields: ['invoiceId', 'supplierName', 'amount', 'currency'],
  prohibitedFields: [
    'authorization',
    'accessToken',
    'apiKey',
    'password',
    'databaseUri',
    'privateMemory',
  ],
  acceptedDataClasses: ['business.invoice_summary'],
  prohibitedDataClasses: ['credential', 'secret', 'hidden_reasoning'],
  maximumPayloadBytes: 8192,
  maximumStringLength: 200,
  maximumArrayLength: 20,
  maximumObjectDepth: 4,
  retentionDeclaration: 'host_governed',
  redactionRequirements: ['secret-like fields'],
  transformationProfileReferences: [],
  status: 'active',
});

const accountingDraftInputSchema = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['invoiceId', 'supplierName', 'amount', 'currency'],
  properties: {
    invoiceId: { type: 'string', minLength: 1, maxLength: 100 },
    supplierName: { type: 'string', minLength: 1, maxLength: 200 },
    amount: { type: 'number', minimum: 0, maximum: 100000 },
    currency: { enum: ['USD', 'EUR', 'GBP'] },
  },
});

const accountingDraftOutputSchema = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['draftId', 'invoiceId', 'amount', 'currency', 'state'],
  properties: {
    draftId: { type: 'string', minLength: 1, maxLength: 200 },
    invoiceId: { type: 'string', minLength: 1, maxLength: 100 },
    amount: { type: 'number', minimum: 0, maximum: 100000 },
    currency: { enum: ['USD', 'EUR', 'GBP'] },
    state: { const: 'draft' },
  },
});

function createLedgerWorksProvider() {
  const drafts = new Map();
  const agent = createGhostBridgeAgent({
    mode: 'localFixtureMode',
    approveAllFixtureCapabilities: true,
    passport: {
      protocolVersion: PROTOCOL_VERSION,
      passportId: 'passport_ledgerworks_accounting_agent',
      passportVersion: '0.1.0',
      agentId: 'ledgerworks-accounting-agent',
      displayName: 'LedgerWorks Accounting Agent',
      safeDescription:
        'Creates deterministic governed accounting drafts for synthetic verification.',
      issuer: 'ledgerworks-agent-provider.synthetic',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2099-01-01T00:00:00.000Z',
      status: 'active',
      capabilities: ['accounting.create_draft', 'accounting.export_ledger'],
      supportedProtocolVersions: [PROTOCOL_VERSION],
      supportedTransports: ['http-json'],
      profiles: DEFAULT_PROFILE_DECLARATIONS,
      dataDeclarations: [
        {
          direction: 'input',
          contractReference: 'data:ledgerworks-accounting-draft-input@1',
        },
      ],
      delegationDeclarations: [],
      approvalDeclarations: [
        { capability: 'accounting.create_draft', requirement: 'required' },
      ],
      receiptSupport: true,
      revocationReference:
        'revocations/passport/passport_ledgerworks_accounting_agent',
      extensionDeclarations: [],
    },
    authenticationModes: ['platform_brokered', 'signed_request'],
    authenticationSetupReference: 'ghostbridge:authentication/platform-brokered',
    authorization: async ({ action, initiatingSubject }) => {
      if (action === 'invoke' && initiatingSubject !== 'employee_ap_001') {
        return {
          allowed: false,
          code: 'AUTHORIZATION_DENIED',
          safeMessage: 'The initiating subject is not authorized for this capability.',
        };
      }
      return { allowed: true };
    },
  });

  agent.capability('accounting.create_draft', {
    approvalLimits: { maximumAmount: 100000, currency: 'USD' },
    contract: {
      capabilityVersion: '1.0.0',
      displayName: 'Create accounting draft',
      safeDescription: 'Creates one approval-bound idempotent accounting draft.',
      inputContractReference: 'data:ledgerworks-accounting-draft-input@1',
      outputContractReference: 'data:ledgerworks-accounting-draft-output@1',
      inputSchema: accountingDraftInputSchema,
      outputSchema: accountingDraftOutputSchema,
      acceptedDataClasses: ['business.invoice_summary'],
      producedDataClasses: ['business.accounting_draft'],
      prohibitedDataClasses: ['credential', 'secret', 'hidden_reasoning'],
      riskCategory: 'high',
      sideEffectCategory: 'reversible_write',
      idempotencySupport: 'required',
      asynchronousSupport: true,
      cancellationSupport: true,
      requiredPermissions: ['accounting.draft.create'],
      approvalRequirement: 'required',
      delegationPolicy: { allowed: false, required: false },
      timeoutBounds: { minimumMs: 1, maximumMs: 10000 },
      receiptRequirement: 'required',
      status: 'active',
    },
    handler: async ({ input, context }) => {
      const projected = projectDataContract(input, accountingDraftDataContract, {
        dataClasses: ['business.invoice_summary'],
      });
      const draftId = `draft_${projected.invoiceId}`;
      if (!drafts.has(draftId)) {
        drafts.set(draftId, {
          draftId,
          invoiceId: projected.invoiceId,
          amount: projected.amount,
          currency: projected.currency,
          state: 'draft',
          organizationScope: context.organizationScope,
          workspaceScope: context.workspaceScope,
        });
      }
      const { organizationScope, workspaceScope, ...publicDraft } = drafts.get(draftId);
      return { outcome: 'completed', output: publicDraft };
    },
  });

  agent.capability('accounting.export_ledger', {
    contract: {
      capabilityVersion: '1.0.0',
      displayName: 'Export ledger',
      safeDescription: 'A synthetic capability disabled by the host policy fixture.',
      inputContractReference: 'data:empty@1',
      outputContractReference: 'data:ledger-export@1',
      acceptedDataClasses: [],
      producedDataClasses: ['business.ledger'],
      prohibitedDataClasses: ['credential', 'secret'],
      riskCategory: 'critical',
      sideEffectCategory: 'external_action',
      idempotencySupport: 'required',
      asynchronousSupport: true,
      cancellationSupport: true,
      requiredPermissions: ['accounting.ledger.export'],
      approvalRequirement: 'required',
      delegationPolicy: { allowed: false, required: false },
      timeoutBounds: { minimumMs: 1, maximumMs: 10000 },
      receiptRequirement: 'required',
      status: 'active',
    },
    handler: async () => ({
      outcome: 'completed',
      output: { state: 'exported' },
    }),
  });

  return {
    agent,
    issueInstallGrant(scope) {
      return agent.issueInstallGrant({
        ...scope,
        allowedCapabilityKeys: [
          'accounting.create_draft',
          'accounting.export_ledger',
        ],
      });
    },
    draftCount() {
      return drafts.size;
    },
    async listen(options) {
      return agent.listen(options);
    },
  };
}

module.exports = {
  accountingDraftDataContract,
  accountingDraftInputSchema,
  accountingDraftOutputSchema,
  createLedgerWorksProvider,
};
