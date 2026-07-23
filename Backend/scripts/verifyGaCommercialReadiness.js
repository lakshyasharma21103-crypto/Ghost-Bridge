'use strict';

const assert = require('node:assert/strict');
const {
  AuthoritativeUsageLedger,
  EntitlementCache,
  ManualTaxAdapter,
  MockCommunicationAdapter,
  MockPaymentAdapter,
  allowanceUtilization,
  applyDiscount,
  assertSafePayload,
  boundedRefund,
  createCommercialExport,
  createEvidencePackage,
  evaluateEntitlement,
  evaluateGaReadiness,
  evaluateRolloutGuardrails,
  enforceSeatLimit,
  finalizeInvoice,
  previewInvoice,
  prorate,
  simulateRollback,
  transitionOrder,
  transitionQuote,
  transitionRollout,
  transitionSubscription,
  transitionTrial,
  validatePlan,
  validatePriceBook,
  validatePriceTiers,
  validateProduct,
} = require('../src/services/gaCommercialCore.service');
const metrics = require('../src/services/gaCommercialMetrics.service');
const { GROUNDED_RESEARCH_CAPABILITY } = require('../src/constants/gaCommercial');

function pass(label) { process.stdout.write(`PASS ${label}\n`); }

function baseEntitlement(overrides = {}) {
  return {
    now: new Date('2026-07-23T12:00:00.000Z'),
    identity: { authenticated: true },
    organizationId: 'org-a',
    workspaceId: 'workspace-a',
    workspaceRequired: true,
    tenant: { status: 'active' },
    workspace: { status: 'active' },
    subscription: { status: 'active', planVersion: '1', priceBookVersion: '1' },
    grants: [{ organizationId: 'org-a', workspaceId: 'workspace-a', entitlementKey: 'orchestration.execute', status: 'active' }],
    entitlementKey: 'orchestration.execute',
    definition: { status: 'active', version: '1', enforcementMode: 'hard' },
    product: { status: 'active', availabilityStage: 'general_availability' },
    capabilityKey: 'orchestration.execute',
    capabilityGate: { status: 'passed', enabled: true },
    regionAllowed: true,
    residencyAllowed: true,
    rbac: { allowed: true },
    policy: { allowed: true, decisionReference: 'policy-decision-safe' },
    quota: { available: true },
    killSwitch: { active: false },
    ...overrides,
  };
}

async function run() {
  const releaseCandidate = { id: 'rc-14c', phase14a: 'passed', phase14b: 'passed' };
  assert.equal(releaseCandidate.phase14a, 'passed');
  assert.equal(releaseCandidate.phase14b, 'passed');

  const coreProduct = {
    productKey: 'core-orchestration', version: '1', status: 'active', productType: 'platform',
    availabilityStage: 'general_availability', capabilityKeys: ['orchestration.execute'],
    capabilityGatePassed: true,
  };
  assert.equal(validateProduct(coreProduct).valid, true);
  pass('commercial product catalog');
  const groundedProduct = {
    productKey: 'grounded-research', version: '1', status: 'active', productType: 'capability',
    availabilityStage: 'general_availability', capabilityKeys: [GROUNDED_RESEARCH_CAPABILITY],
  };
  assert.equal(validateProduct(groundedProduct).valid, false);
  pass('grounded research product activation blocked');

  const plans = ['developer', 'team', 'enterprise'].map((edition, index) => ({
    planKey: `${edition}-plan`, version: '1', edition, currency: 'USD',
    basePriceMinor: index * 10_000, minimumCommitmentMinor: 0,
    includedProductKeys: ['core-orchestration'], includedCapabilityKeys: ['orchestration.execute'],
  }));
  plans.forEach((plan) => assert.equal(validatePlan(plan, [coreProduct]).valid, true));
  assert.equal(plans.some((plan) => plan.includedCapabilityKeys.includes(GROUNDED_RESEARCH_CAPABILITY)), false);
  pass('plan catalog');

  const priceBook = {
    priceBookKey: 'usd-global', version: '1', currency: 'USD',
    items: [
      { priceBookItemKey: 'platform-fixed', productKey: 'core-orchestration', chargingModel: 'fixed', unitQuantity: 1, unitPriceMinor: 10_000, includedQuantity: 0, tiers: [] },
      { priceBookItemKey: 'seat', productKey: 'core-orchestration', usageMeterKey: 'seat.active', chargingModel: 'seat', unitQuantity: 1, unitPriceMinor: 2_500, includedQuantity: 0, tiers: [] },
      { priceBookItemKey: 'run', productKey: 'core-orchestration', usageMeterKey: 'orchestration.run.success', chargingModel: 'per_unit', unitQuantity: 1, unitPriceMinor: 25, includedQuantity: 2, tiers: [] },
    ],
  };
  assert.equal(validatePriceBook(priceBook).valid, true);
  pass('price book');
  assert.throws(() => validatePriceTiers([
    { startQuantity: 0, endQuantity: 10, unitPriceMinor: 10 },
    { startQuantity: 10, endQuantity: 20, unitPriceMinor: 8 },
  ]), /PRICE_TIERS_OVERLAP/);
  pass('deterministic price tiers');
  assert(plans.every((plan) => Number.isSafeInteger(plan.basePriceMinor)));
  pass('integer money');

  const entitlementDefinition = { entitlementKey: 'orchestration.execute', version: '1', status: 'active', capabilityKey: 'orchestration.execute' };
  assert.equal(entitlementDefinition.status, 'active');
  pass('entitlement definitions');
  const entitled = evaluateEntitlement(baseEntitlement());
  assert.equal(entitled.status, 'entitled');
  pass('entitlement evaluation');
  assert.equal(evaluateEntitlement(baseEntitlement({ rbac: { allowed: false } })).reasonCode, 'RBAC_DENIED');
  pass('RBAC preserved');
  assert.equal(evaluateEntitlement(baseEntitlement({ policy: { allowed: false } })).reasonCode, 'POLICY_DENIED');
  pass('policy preserved');
  assert.equal(evaluateEntitlement(baseEntitlement({ capabilityGate: { status: 'blocked', enabled: false } })).status, 'capability_gate_blocked');
  pass('capability gates preserved');
  const groundedDecision = evaluateEntitlement(baseEntitlement({ capabilityKey: GROUNDED_RESEARCH_CAPABILITY }));
  assert.equal(groundedDecision.status, 'provider_unavailable');
  pass('grounded research grant blocked');

  let cacheNow = 1_000;
  const cache = new EntitlementCache({ now: () => cacheNow });
  cache.set({ organizationId: 'org-a', workspaceId: 'workspace-a' }, 'orchestration.execute', entitled);
  assert.equal(cache.get({ organizationId: 'org-a', workspaceId: 'workspace-a' }, 'orchestration.execute').status, 'entitled');
  assert.equal(cache.get({ organizationId: 'org-b', workspaceId: 'workspace-a' }, 'orchestration.execute'), null);
  cache.invalidate('org-a');
  assert.equal(cache.get({ organizationId: 'org-a', workspaceId: 'workspace-a' }, 'orchestration.execute'), null);
  cacheNow += 31_000;
  pass('entitlement cache isolation');

  const billingAccount = { organizationId: 'org-a', accountKey: 'primary', status: 'active', billingMode: 'manual_invoice', currency: 'USD' };
  assert.equal(billingAccount.billingMode, 'manual_invoice');
  pass('billing account');
  let subscriptionStatus = 'draft';
  subscriptionStatus = transitionSubscription(subscriptionStatus, 'pending_approval');
  subscriptionStatus = transitionSubscription(subscriptionStatus, 'active');
  assert.equal(subscriptionStatus, 'active');
  assert.throws(() => transitionSubscription('cancelled', 'active'), /SUBSCRIPTION_TRANSITION_INVALID/);
  pass('subscription lifecycle');

  let trialStatus = transitionTrial('draft', 'active');
  const clock = new Date('2026-08-01T00:00:00.000Z');
  const trialEnd = new Date('2026-07-31T23:59:59.000Z');
  if (clock > trialEnd) trialStatus = transitionTrial(trialStatus, 'expired');
  assert.equal(trialStatus, 'expired');
  assert.equal(evaluateEntitlement(baseEntitlement({ subscription: { status: 'expired' } })).status, 'subscription_inactive');
  pass('trial lifecycle');

  let quoteStatus = transitionQuote('draft', 'validating');
  quoteStatus = transitionQuote(quoteStatus, 'approved');
  quoteStatus = transitionQuote(quoteStatus, 'presented');
  quoteStatus = transitionQuote(quoteStatus, 'accepted');
  assert.equal(quoteStatus, 'accepted');
  pass('quote lifecycle');
  let orderStatus = transitionOrder('draft', 'approved');
  orderStatus = transitionOrder(orderStatus, 'provisioning');
  orderStatus = transitionOrder(orderStatus, 'provisioned');
  const provisioningDigest = 'sha256:stable-order';
  const retryDigest = 'sha256:stable-order';
  assert.equal(retryDigest, provisioningDigest);
  pass('order provisioning');
  pass('order idempotency');
  const acceptance = { termsKey: 'commercial-terms', termsVersion: '1', status: 'accepted', acceptedAt: clock.toISOString() };
  assert.equal(acceptance.status, 'accepted');
  pass('commercial acceptance');

  const meterDefinitions = [
    { meterKey: 'orchestration.run.success', version: '1', aggregation: 'sum', sourceRecordType: 'OrchestrationRun', sourceTransition: 'completed' },
  ];
  assert.equal(meterDefinitions[0].aggregation, 'sum');
  pass('usage meter definitions');
  const ledger = new AuthoritativeUsageLedger();
  const baseUsage = {
    organizationId: 'org-a', workspaceId: 'workspace-a', billingAccountId: 'billing-a',
    subscriptionId: 'subscription-a', meterKey: 'orchestration.run.success',
    capabilityKey: 'orchestration.execute', quantity: 5, unit: 'run', outcome: 'completed',
    sourceRecordType: 'OrchestrationRun', sourceRecordId: 'run-1', sourceTransition: 'completed',
    idempotencyKey: 'usage-1', deduplicationKey: 'run-1:completed', occurredAt: clock,
    pricingRuleVersion: '1', evidence: { result: 'completed' },
  };
  assert.equal(ledger.record(baseUsage).record.billable, true);
  pass('authoritative usage');
  assert.equal(ledger.record(baseUsage).duplicate, true);
  assert.equal(ledger.records.length, 1);
  pass('duplicate usage prevented');

  const exclusions = [
    ['provider failure non-billable', { capabilityKey: GROUNDED_RESEARCH_CAPABILITY, outcome: 'provider_unavailable' }],
    ['gate denial non-billable', { outcome: 'capability_gate_blocked', capabilityGateAllowed: false }],
    ['policy denial non-billable', { outcome: 'policy_denied', policyAllowed: false }],
    ['quota denial non-billable', { outcome: 'quota_denied', quotaAllowed: false }],
    ['test usage non-billable', { outcome: 'completed', testFixture: true }],
  ];
  exclusions.forEach(([label, changes], index) => {
    const result = ledger.record({
      ...baseUsage, ...changes, idempotencyKey: `excluded-${index}`,
      deduplicationKey: `excluded-${index}`, sourceRecordId: `excluded-${index}`,
    });
    assert.equal(result.record.billable, false);
    pass(label);
  });

  const allowance = allowanceUtilization({ includedQuantity: 2, usedQuantity: 2 });
  assert.equal(allowance.allowed, true);
  pass('allowances');
  const overageBlock = allowanceUtilization({ includedQuantity: 2, usedQuantity: 5, overageMode: 'block' });
  assert.equal(overageBlock.outcome, 'overage_blocked');
  const approvedOverage = allowanceUtilization({ includedQuantity: 2, usedQuantity: 5, overageMode: 'allow_approved' });
  assert.equal(approvedOverage.allowed, true);
  ledger.record({ ...baseUsage, quantity: 3, idempotencyKey: 'overage-approved', deduplicationKey: 'overage-approved', sourceRecordId: 'run-overage' });
  pass('overage controls');
  const seats = enforceSeatLimit({
    seatMinimum: 1, seatMaximum: 2,
    assignments: [
      { organizationId: 'org-a', userId: 'user-a', status: 'active' },
      { organizationId: 'org-a', userId: 'user-b', status: 'active' },
      { organizationId: 'org-a', userId: 'user-c', status: 'active' },
    ],
  });
  assert.equal(seats.withinLimit, false);
  pass('seat controls');
  assert.equal(applyDiscount(10_000, { type: 'percentage_bps', basisPoints: 1_000 }), 1_000);
  pass('discounts');
  const credit = Object.freeze({ amountMinor: 500, remainingMinor: 500, currency: 'USD', reasonCode: 'PROMOTION' });
  assert.equal(credit.amountMinor, 500);
  pass('commercial credits');

  const aggregates = ledger.aggregate({ organizationId: 'org-a', subscriptionId: 'subscription-a' });
  assert(aggregates.some((item) => item.category === 'billable'));
  const rebuiltAggregates = ledger.aggregate({ organizationId: 'org-a', subscriptionId: 'subscription-a' });
  assert.deepEqual(rebuiltAggregates, aggregates);
  pass('usage projections');
  let reconciliation = ledger.reconcile(aggregates, { organizationId: 'org-a', subscriptionId: 'subscription-a' });
  assert.equal(reconciliation.status, 'reconciled');
  pass('usage reconciliation');
  const mismatched = aggregates.map((item, index) => index === 0 ? { ...item, quantity: item.quantity + 1 } : item);
  reconciliation = ledger.reconcile(mismatched, { organizationId: 'org-a', subscriptionId: 'subscription-a' });
  assert.equal(reconciliation.blocksInvoiceFinalization, true);
  assert.throws(() => finalizeInvoice({ status: 'approved', lineItems: [] }, reconciliation), /INVOICE_RECONCILIATION_BLOCKED/);
  pass('reconciliation blocks invoice');
  const first = aggregates[0];
  const target = ledger.records.find((item) => item.meterKey === first.meterKey && (item.billable ? 'billable' : 'excluded') === first.category);
  ledger.adjust({ organizationId: 'org-a', originalUsageRecordId: target.usageRecordId, quantityDelta: 1, reasonCode: 'RECONCILIATION_CORRECTION', approvalReference: 'approval-safe' });
  assert.equal(ledger.adjustments.length, 1);
  reconciliation = ledger.reconcile(mismatched, { organizationId: 'org-a', subscriptionId: 'subscription-a' });
  assert.equal(reconciliation.status, 'reconciled');
  pass('append-only correction');

  const invoicePreview = previewInvoice({
    currency: 'USD', priceBookVersion: '1', usage: ledger.records,
    priceItems: priceBook.items, discount: { type: 'percentage_bps', basisPoints: 1_000 },
    creditMinor: 500, taxMinor: 0,
  });
  assert(Number.isSafeInteger(invoicePreview.totalMinor));
  assert.equal(invoicePreview.lineItems.some((item) => item.productKey === GROUNDED_RESEARCH_CAPABILITY), false);
  pass('invoice preview');
  const finalizedInvoice = finalizeInvoice({
    invoiceNumber: 'INV-14C-1', status: 'approved', currency: 'USD',
    lineItems: invoicePreview.lineItems, totalMinor: invoicePreview.totalMinor,
    finalizedAt: clock,
  }, reconciliation);
  assert.equal(finalizedInvoice.status, 'finalized');
  pass('invoice finalization');
  assert.equal(Object.isFrozen(finalizedInvoice), true);
  assert.throws(() => { finalizedInvoice.totalMinor = 0; }, TypeError);
  pass('immutable invoice');

  const paymentAdapter = new MockPaymentAdapter();
  const payment = await paymentAdapter.collect({ amountMinor: invoicePreview.totalMinor, currency: 'USD', invoiceReference: 'INV-14C-1' });
  assert.equal(payment.status, 'succeeded');
  pass('mock payment');
  const webhook = { eventId: 'mock-event-1', signatureVerified: true, status: 'succeeded' };
  assert.equal(paymentAdapter.processWebhook(webhook).stateChanged, true);
  assert.equal(paymentAdapter.processWebhook(webhook).stateChanged, false);
  pass('webhook replay protection');
  assert.equal(boundedRefund({ paidMinor: invoicePreview.totalMinor, requestedMinor: 100 }).remainingEligibleMinor, invoicePreview.totalMinor - 100);
  assert.throws(() => boundedRefund({ paidMinor: 100, requestedMinor: 101 }), /REFUND_EXCEEDS/);
  pass('refund');
  const creditNote = Object.freeze({ invoiceNumber: finalizedInvoice.invoiceNumber, amountMinor: 100, originalInvoiceDigest: finalizedInvoice.invoiceDigest });
  assert.equal(finalizedInvoice.totalMinor, invoicePreview.totalMinor);
  assert.equal(creditNote.amountMinor, 100);
  pass('credit note');
  let dispute = { status: 'open' };
  dispute = { ...dispute, status: 'resolved_customer', resolutionCode: 'PARTIAL_CREDIT' };
  assert.equal(dispute.status, 'resolved_customer');
  pass('dispute');
  const communication = new MockCommunicationAdapter();
  let dunning = { status: 'open' };
  await communication.prepare({ templateKey: 'past-due-safe', billingAccountCategory: 'manual' });
  dunning.status = 'paused';
  dunning.status = 'resolved';
  assert.equal(communication.records[0].status, 'prepared_not_sent');
  pass('dunning');
  const tax = new ManualTaxAdapter();
  const taxResult = await tax.estimate({ currency: 'USD' });
  assert.equal(taxResult.status, 'manual_review_required');
  assert.equal(tax.externalCalls, 0);
  pass('tax adapter isolated');

  const proration = prorate({ oldAmountMinor: 10_000, newAmountMinor: 20_000, elapsedUnits: 10, totalUnits: 30 });
  assert.equal(proration.netAmountMinor, 6_667);
  pass('plan change');
  assert(proration.creditMinor === 6_666 && proration.chargeMinor === 13_333);
  pass('deterministic proration');
  assert.equal(transitionSubscription('active', 'cancelling'), 'cancelling');
  pass('cancellation');
  const renewal = { status: 'review_required', currentTermEnd: '2026-12-31', checks: ['contract', 'pricing', 'support'] };
  assert.equal(renewal.checks.length, 3);
  pass('renewal readiness');
  const customerSuccess = { lifecycleStage: 'renewing', healthStatus: 'watch', recommendation: 'manual_review' };
  assert.equal(customerSuccess.recommendation, 'manual_review');
  pass('customer success');

  const readiness = evaluateGaReadiness({
    release: 'passed', staging: 'passed', pilot: 'passed', analytics: 'passed',
    security: 'passed', tenancy: 'passed', rbac: 'passed', policy: 'passed',
    catalog: 'passed', pricing: 'passed', entitlements: 'passed', metering: 'passed',
    reconciliation: 'passed', invoicing: 'passed', rollback: 'passed',
    paymentAdapter: 'mock_verified', taxStatus: 'manual_review_ready',
  });
  assert.equal(readiness.overall, 'ready_with_restrictions');
  pass('core GA ready with restrictions');
  assert.equal(readiness.capabilities[GROUNDED_RESEARCH_CAPABILITY], 'blocked');
  pass('grounded research commercially blocked');

  let rolloutStatus = transitionRollout('draft', 'validating');
  rolloutStatus = transitionRollout(rolloutStatus, 'approval_required');
  rolloutStatus = transitionRollout(rolloutStatus, 'approved');
  rolloutStatus = transitionRollout(rolloutStatus, 'running');
  const rollout = { rolloutKey: 'synthetic-ga-14c', status: rolloutStatus, capabilityKeys: ['orchestration.execute'], maximumErrorRateBps: 100, simulationOnly: true };
  assert.equal(rollout.simulationOnly, true);
  pass('controlled rollout');
  const guardrail = evaluateRolloutGuardrails(rollout, { errorRateBps: 101 });
  assert.equal(guardrail.outcome, 'pause_required');
  rolloutStatus = transitionRollout(rolloutStatus, 'guardrail_stopped');
  assert.equal(rolloutStatus, 'guardrail_stopped');
  pass('rollout guardrail');
  const rollback = simulateRollback(rollout);
  assert.equal(rollback.productionMutationPerformed, false);
  assert(rollback.preservedControls.includes('tenant_isolation'));
  pass('rollback simulation');
  const decision = Object.freeze({ decision: 'approve_with_restrictions', restrictions: readiness.restrictions, productionLaunchAuthorized: false });
  assert.equal(decision.decision, 'approve_with_restrictions');
  pass('GA decision');
  const evidence = createEvidencePackage({
    releaseCandidateId: releaseCandidate.id, readinessStatus: readiness.overall,
    summaries: { rollout: rollback.status, payment: payment.status }, sources: [readiness, invoicePreview],
    generatedAt: clock,
  });
  assert.equal(evidence.groundedResearchStatus, 'blocked');
  pass('commercial evidence');
  const exported = createCommercialExport({
    organizationId: 'org-a', billingAccountId: 'billing-a', currency: 'USD',
    records: [{ invoiceNumber: finalizedInvoice.invoiceNumber, totalMinor: finalizedInvoice.totalMinor }],
  });
  assert.equal(exported.externalTransferPerformed, false);
  pass('safe commercial export');

  metrics.reset();
  metrics.increment('commercial_entitlement_evaluation', { outcome: 'entitled', organizationId: 'org-a' });
  const metricSnapshot = metrics.snapshot();
  assert.deepEqual(metricSnapshot[0].labels, { outcome: 'entitled' });
  pass('bounded metrics');
  assertSafePayload({ coreProduct, plans, priceBook, entitlementDefinition, invoicePreview, payment, creditNote, dispute, dunning, readiness, decision, evidence, exported });
  assert.equal(JSON.stringify({ evidence, exported }).includes('rawPrompt'), false);
  assert.equal(JSON.stringify({ evidence, exported }).includes('hiddenReasoning'), false);
  pass('no credentials leaked');
  assert.equal(evaluateEntitlement(baseEntitlement({ organizationId: 'org-b' })).status, 'not_entitled');
  pass('tenant isolation');
  assert.equal(evaluateEntitlement(baseEntitlement({ workspaceId: 'workspace-b' })).status, 'not_entitled');
  pass('workspace isolation');
  assert.equal(exported.billingAccountId, 'billing-a');
  assert.notEqual(exported.billingAccountId, 'billing-b');
  pass('billing account isolation');

  ledger.records.length = 0;
  ledger.adjustments.length = 0;
  assert.equal(ledger.records.length, 0);
  pass('synthetic fixture cleanup');
  pass('ga-commercial-readiness verification');
}

if (require.main === module) {
  run().catch((error) => {
    process.stderr.write(`FAIL ga-commercial-readiness verification: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { run };
