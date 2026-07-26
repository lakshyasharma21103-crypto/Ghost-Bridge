import type {
  AgentPassport,
  ExecutionReceipt,
} from '@ghostbridge/protocol-core';
import {
  createGhostBridgeAgent,
  type ProtocolStores,
} from '../../src/index.js';

declare const passport: AgentPassport;
declare const stores: ProtocolStores;
declare const signedReceiptIssuer: () => Promise<ExecutionReceipt>;
declare const receiptVerificationJwks: Record<string, unknown>;

const agent = createGhostBridgeAgent({
  mode: 'productionMode',
  publicBaseUrl: 'https://agent.example',
  passport,
  stores,
  authorization: async () => ({
    allowed: true,
    principalId: 'host-production',
    policyDecisionId: 'policy-decision-production',
    evaluatedAt: new Date().toISOString(),
    policyVersion: '2026-07-26',
  }),
  revocationResolver: async () => ({
    status: 'active',
    freshness: 'fresh',
  }),
  receiptIssuer: signedReceiptIssuer,
  receiptIssuerGuaranteesSigned: true,
  receiptVerificationJwks,
  authenticateHttpRequest: async () => ({
    subjectId: 'host-production',
    authenticationMethod: 'mutual_tls',
    organizationScope: 'org-production',
  }),
});

agent
  .configureAuthorization(async ({ authenticatedPrincipal }) => ({
    allowed: true,
    principalId: authenticatedPrincipal?.subjectId ?? 'host-production',
    policyDecisionId: 'policy-decision-reconfigured',
    evaluatedAt: new Date().toISOString(),
    policyVersion: '2026-07-26',
  }))
  .configureTaskStore(stores.tasks);
