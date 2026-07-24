'use strict';

const { PROTOCOL_VERSION } = require('@ghostbridge/protocol-core');
const { createGhostBridgeAgent } = require('@ghostbridge/native-agent');

const invoiceSummaryDataContract = Object.freeze({
  contractKey: 'invoice-summary',
  contractVersion: '1',
  direction: 'output',
  allowedFields: ['invoiceId', 'supplierName', 'currency', 'subtotal', 'tax', 'total'],
  requiredFields: ['invoiceId', 'supplierName', 'currency', 'total'],
  prohibitedFields: [
    'authorization',
    'cookie',
    'apiKey',
    'runtimeToken',
    'databaseUri',
    'systemPrompt',
    'hiddenReasoning',
    'privateMemory',
  ],
  acceptedDataClasses: ['business.invoice'],
  prohibitedDataClasses: ['credential', 'secret', 'hidden_reasoning'],
  maximumPayloadBytes: 8_192,
  maximumStringLength: 500,
  maximumArrayLength: 20,
  maximumObjectDepth: 5,
  retentionDeclaration: 'consumer_declared',
  redactionRequirements: ['credentials', 'secret-like fields'],
  transformationProfileReferences: [],
  status: 'active',
});

function createInvoiceAgent() {
  const agent = createGhostBridgeAgent({
    passport: {
      protocolVersion: PROTOCOL_VERSION,
      passportId: 'passport_invoice_agent',
      passportVersion: '0.1.0',
      agentId: 'invoice-agent',
      displayName: 'Invoice Extraction Agent',
      safeDescription: 'Extracts a bounded summary from synthetic invoice data.',
      issuer: 'ghostbridge-reference-issuer',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2099-01-01T00:00:00.000Z',
      status: 'active',
      capabilities: ['invoice.extract'],
      supportedProtocolVersions: [PROTOCOL_VERSION],
      supportedTransports: ['http-json'],
      dataDeclarations: [
        { direction: 'output', contractReference: 'data:invoice-summary@1' },
      ],
      delegationDeclarations: [
        { capability: 'invoice.extract', mayDelegateOutput: true },
      ],
      approvalDeclarations: [],
      receiptSupport: true,
      revocationReference: 'revocations/passport/passport_invoice_agent',
      documentationReferences: ['/examples/invoice-accounting'],
      extensionDeclarations: [],
    },
  });

  agent.capability('invoice.extract', {
    contract: {
      capabilityVersion: '1',
      displayName: 'Extract invoice',
      safeDescription: 'Validates and returns a deterministic invoice summary.',
      inputContractReference: 'data:synthetic-invoice@1',
      outputContractReference: 'data:invoice-summary@1',
      acceptedDataClasses: ['business.invoice'],
      producedDataClasses: ['business.invoice_summary'],
      prohibitedDataClasses: ['credential', 'secret', 'hidden_reasoning'],
      riskCategory: 'low',
      sideEffectCategory: 'none',
      idempotencySupport: 'optional',
      asynchronousSupport: true,
      cancellationSupport: true,
      requiredPermissions: ['invoice.read'],
      approvalRequirement: 'none',
      delegationPolicy: { outputMayBeDelegated: true, maximumChainDepth: 1 },
      timeoutBounds: { minimumMs: 1, maximumMs: 10_000 },
      receiptRequirement: 'required',
      status: 'active',
    },
    handler: async ({ input }) => {
      const required = ['invoiceId', 'supplierName', 'currency', 'subtotal', 'tax'];
      if (required.some((field) => input[field] === undefined)) {
        const error = new Error('Synthetic invoice is incomplete.');
        error.code = 'INVALID_SYNTHETIC_INVOICE';
        throw error;
      }
      const subtotal = Number(input.subtotal);
      const tax = Number(input.tax);
      return {
        outcome: 'completed',
        output: {
          invoiceId: String(input.invoiceId),
          supplierName: String(input.supplierName),
          currency: String(input.currency),
          subtotal,
          tax,
          total: subtotal + tax,
        },
      };
    },
  });
  return agent;
}

module.exports = {
  createInvoiceAgent,
  invoiceSummaryDataContract,
};
