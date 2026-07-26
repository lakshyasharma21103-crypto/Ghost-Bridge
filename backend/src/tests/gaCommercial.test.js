const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  AuthoritativeUsageLedger,
  MockPaymentAdapter,
  allowanceUtilization,
  boundedRefund,
  evaluateEntitlement,
  evaluateGaReadiness,
  finalizeInvoice,
  previewInvoice,
  prorate,
  transitionSubscription,
  validatePriceBook,
  validateProduct,
} = require('../services/gaCommercialCore.service');
const metrics = require('../services/gaCommercialMetrics.service');
const { GROUNDED_RESEARCH_CAPABILITY } = require('../constants/gaCommercial');
const { hasPermission } = require('../constants/permissionRegistry');
const commercialModels = require('../models/gaCommercialModels');

function entitlement(overrides = {}) {
  return {
    identity: { authenticated: true }, organizationId: 'org-a', workspaceId: 'workspace-a', workspaceRequired: true,
    tenant: { status: 'active' }, workspace: { status: 'active' },
    subscription: { status: 'active', planVersion: '1', priceBookVersion: '1' },
    grants: [{ organizationId: 'org-a', workspaceId: 'workspace-a', entitlementKey: 'core', status: 'active' }],
    entitlementKey: 'core', definition: { status: 'active', version: '1', enforcementMode: 'hard' },
    product: { status: 'active', availabilityStage: 'general_availability' },
    capabilityKey: 'orchestration.execute', capabilityGate: { enabled: true, status: 'passed' },
    regionAllowed: true, residencyAllowed: true, rbac: { allowed: true }, policy: { allowed: true },
    quota: { available: true }, killSwitch: { active: false }, now: '2026-07-23T00:00:00.000Z',
    ...overrides,
  };
}

test('commercial catalog and price books block unsafe activation and floating money', () => {
  assert.equal(validateProduct({
    productKey: 'grounded', version: '1', status: 'active', availabilityStage: 'general_availability',
    capabilityKeys: [GROUNDED_RESEARCH_CAPABILITY],
  }).valid, false);
  assert.throws(() => validatePriceBook({
    currency: 'USD',
    items: [{ unitQuantity: 1, unitPriceMinor: 1.5, includedQuantity: 0, tiers: [] }],
  }), /SAFE_INTEGER/);
  assert.throws(() => validatePriceBook({
    currency: 'USD',
    items: [{
      unitQuantity: 1, unitPriceMinor: 10, includedQuantity: 0,
      tiers: [{ startQuantity: 0, endQuantity: 10, unitPriceMinor: 10 }, { startQuantity: 10, endQuantity: 20, unitPriceMinor: 9 }],
    }],
  }), /PRICE_TIERS_OVERLAP/);
});

test('entitlement evaluation preserves gates, tenant scope, RBAC, policy, quota and provider state', () => {
  assert.equal(evaluateEntitlement(entitlement()).status, 'entitled');
  assert.equal(evaluateEntitlement(entitlement({ tenant: { status: 'suspended' } })).status, 'tenant_suspended');
  assert.equal(evaluateEntitlement(entitlement({ organizationId: 'org-b' })).status, 'not_entitled');
  assert.equal(evaluateEntitlement(entitlement({ rbac: { allowed: false } })).reasonCode, 'RBAC_DENIED');
  assert.equal(evaluateEntitlement(entitlement({ policy: { allowed: false } })).reasonCode, 'POLICY_DENIED');
  assert.equal(evaluateEntitlement(entitlement({ quota: { available: false } })).status, 'quota_exhausted');
  assert.equal(evaluateEntitlement(entitlement({ capabilityKey: GROUNDED_RESEARCH_CAPABILITY })).status, 'provider_unavailable');
});

test('authoritative usage is idempotent and excludes denied, provider-blocked and synthetic work', () => {
  const ledger = new AuthoritativeUsageLedger();
  const input = {
    organizationId: 'org-a', billingAccountId: 'billing-a', subscriptionId: 'subscription-a',
    meterKey: 'run.success', capabilityKey: 'orchestration.execute', quantity: 1, unit: 'run',
    outcome: 'completed', sourceRecordType: 'OrchestrationRun', sourceRecordId: 'run-a',
    sourceTransition: 'completed', idempotencyKey: 'same', deduplicationKey: 'run-a:completed',
  };
  assert.equal(ledger.record(input).record.billable, true);
  assert.equal(ledger.record(input).duplicate, true);
  assert.equal(ledger.records.length, 1);
  for (const [index, changes] of [
    { outcome: 'provider_unavailable' },
    { outcome: 'capability_gate_blocked' },
    { outcome: 'policy_denied' },
    { outcome: 'quota_denied' },
    { outcome: 'completed', synthetic: true },
  ].entries()) {
    const result = ledger.record({ ...input, ...changes, idempotencyKey: `x-${index}`, deduplicationKey: `x-${index}` });
    assert.equal(result.record.billable, false);
  }
});

test('allowances, invoice math, reconciliation and finalized immutability are deterministic', () => {
  assert.equal(allowanceUtilization({ includedQuantity: 10, usedQuantity: 11 }).allowed, false);
  const preview = previewInvoice({
    currency: 'USD', priceBookVersion: '1',
    usage: [
      { meterKey: 'run.success', quantity: 3, billable: true, capabilityKey: 'orchestration.execute', evidenceDigest: 'safe' },
      { meterKey: 'research', quantity: 99, billable: true, capabilityKey: GROUNDED_RESEARCH_CAPABILITY, evidenceDigest: 'safe' },
    ],
    priceItems: [{ priceBookItemKey: 'run', productKey: 'core', usageMeterKey: 'run.success', chargingModel: 'per_unit', unitQuantity: 1, unitPriceMinor: 25, includedQuantity: 1 }],
    discount: { type: 'percentage_bps', basisPoints: 1_000 }, creditMinor: 5, taxMinor: 0,
  });
  assert.deepEqual({ subtotal: preview.subtotalMinor, discount: preview.discountMinor, credit: preview.creditMinor, total: preview.totalMinor }, { subtotal: 50, discount: 5, credit: 5, total: 40 });
  const finalized = finalizeInvoice({ status: 'approved', lineItems: preview.lineItems, totalMinor: preview.totalMinor }, { status: 'reconciled', blocksInvoiceFinalization: false });
  assert.equal(Object.isFrozen(finalized), true);
  assert.throws(() => finalizeInvoice({ status: 'approved', lineItems: [] }, { blocksInvoiceFinalization: true }), /RECONCILIATION/);
});

test('subscription, refund, proration, readiness and mock webhook controls are governed', async () => {
  assert.equal(transitionSubscription('draft', 'pending_approval'), 'pending_approval');
  assert.throws(() => transitionSubscription('cancelled', 'active'), /INVALID/);
  assert.throws(() => boundedRefund({ paidMinor: 100, requestedMinor: 101 }), /EXCEEDS/);
  assert.deepEqual(prorate({ oldAmountMinor: 100, newAmountMinor: 200, elapsedUnits: 1, totalUnits: 3 }), {
    creditMinor: 66, chargeMinor: 133, netAmountMinor: 67, roundingMode: 'truncate_minor_unit',
  });
  const readiness = evaluateGaReadiness(Object.fromEntries([
    'release', 'staging', 'pilot', 'analytics', 'security', 'tenancy', 'rbac', 'policy',
    'catalog', 'pricing', 'entitlements', 'metering', 'reconciliation', 'invoicing', 'rollback',
  ].map((key) => [key, 'passed'])));
  assert.equal(readiness.overall, 'ready_with_restrictions');
  assert.equal(readiness.capabilities[GROUNDED_RESEARCH_CAPABILITY], 'blocked');
  const adapter = new MockPaymentAdapter();
  assert.equal((await adapter.collect({ amountMinor: 100, currency: 'USD' })).provider, 'mock');
  const event = { eventId: 'event-a', signatureVerified: true, status: 'succeeded' };
  assert.equal(adapter.processWebhook(event).stateChanged, true);
  assert.equal(adapter.processWebhook(event).stateChanged, false);
});

test('commercial permissions exist and metrics reject high-cardinality labels', () => {
  assert.equal(hasPermission('commercialProduct.activate'), true);
  assert.equal(hasPermission('commercialUsage.adjust'), true);
  assert.equal(hasPermission('gaRollout.rollback'), true);
  metrics.reset();
  metrics.increment('commercial_usage_record', { outcome: 'excluded', exclusion_reason: 'POLICY_DENIED', organizationId: 'org-a' });
  assert.deepEqual(metrics.snapshot()[0].labels, { exclusion_reason: 'POLICY_DENIED', outcome: 'excluded' });
});

test('commercial durable models expose version, tenant, billing, deduplication, and GA indexes', () => {
  for (const name of [
    'CommercialProduct', 'CommercialPlan', 'CommercialPriceBook', 'EntitlementDefinition',
    'EntitlementGrant', 'BillingAccount', 'CommercialSubscription', 'CommercialTrial',
    'CommercialQuote', 'CommercialOrder', 'CommercialUsageRecord', 'UsageAdjustment',
    'MeteringReconciliation', 'CommercialInvoice', 'CommercialPayment', 'CommercialRefund',
    'CommercialCreditNote', 'BillingDispute', 'DunningCase', 'CommercialRenewal',
    'GaLaunchGate', 'GaRollout', 'GaDecision', 'CommercialEvidencePackage', 'CommercialExport',
  ]) assert.ok(commercialModels[name], `${name} is registered`);
  const indexFields = (Model) => Model.schema.indexes().map(([fields]) => Object.keys(fields).join(','));
  assert(indexFields(commercialModels.CommercialProduct).includes('productKey,version'));
  assert(indexFields(commercialModels.CommercialPlan).includes('planKey,version'));
  assert(indexFields(commercialModels.CommercialPriceBook).includes('priceBookKey,version,currency'));
  assert(indexFields(commercialModels.CommercialUsageRecord).includes('organizationId,idempotencyDigest'));
  assert(indexFields(commercialModels.CommercialUsageRecord).includes('organizationId,deduplicationDigest'));
  assert(indexFields(commercialModels.CommercialInvoice).includes('billingAccountId,status,createdAt'));
  assert(indexFields(commercialModels.GaRollout).includes('status,startsAt'));
  assert(indexFields(commercialModels.CommercialEvidencePackage).includes('releaseCandidateId,evidenceDigest'));
});

test('commercial schemas reject secret material and payment credential fields', async () => {
  const product = new commercialModels.CommercialProduct({
    productKey: 'safe-product', name: 'Safe', version: '1', productType: 'platform',
    capabilityKeys: ['orchestration.execute'], documentationReferences: ['Bearer synthetic-secret-value-that-must-not-persist'],
  });
  await assert.rejects(product.validate(), /COMMERCIAL_SENSITIVE_DATA_FORBIDDEN/);
  for (const field of ['cardNumber', 'securityCode', 'bankCredential', 'providerSecretKey', 'accessToken']) {
    assert.equal(commercialModels.BillingAccount.schema.path(field), undefined);
  }
});

test('commercial and GA route contracts are authenticated, permission protected, and provider neutral', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../routes/gaCommercialRoutes.js'), 'utf8');
  assert.match(source, /commercialRouter\.use\(authenticatePartner\)/);
  assert.match(source, /gaRouter\.use\(authenticatePartner\)/);
  assert.match(source, /requiresPermission/);
  for (const route of [
    '/products', '/plans', '/price-books', '/entitlements/evaluate', '/billing-accounts',
    '/subscriptions', '/trials', '/quotes', '/orders', '/usage/record', '/usage/reconciliation',
    '/invoices/preview', '/payments', '/payment-webhooks/:provider', '/refunds', '/credit-notes',
    '/disputes', '/dunning', '/tax/estimate', '/renewals', '/customer-success',
    '/readiness/evaluate', '/rollouts', '/decisions', '/evidence', '/export',
  ]) assert.equal(source.includes(`'${route}'`), true, `${route} exists`);
  assert.equal(/stripe|adyen|braintree|avalara|taxjar|sendgrid|twilio/i.test(source), false);
});
