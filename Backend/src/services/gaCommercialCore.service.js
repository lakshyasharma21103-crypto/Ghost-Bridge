const crypto = require('node:crypto');
const {
  GROUNDED_RESEARCH_CAPABILITY,
  INVOICE_TRANSITIONS,
  NON_BILLABLE_OUTCOMES,
  ORDER_TRANSITIONS,
  QUOTE_TRANSITIONS,
  ROLLOUT_TRANSITIONS,
  SUBSCRIPTION_TRANSITIONS,
  TRIAL_TRANSITIONS,
} = require('../constants/gaCommercial');

const SECRET_KEY = /(?:authorization|password|secret|token|apiKey|providerKey|cardNumber|securityCode|bankCredential|rawPrompt|rawOutput|hiddenReasoning)/i;
const SECRET_VALUE = /(?:bearer\s+[A-Za-z0-9._~+/-]{8,}|mongodb(?:\+srv)?:\/\/|-----BEGIN [^-]*PRIVATE KEY-----)/i;
const CURRENCY = /^[A-Z]{3}$/;

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function hash(value) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function redactCommercialContent(value, depth = 0) {
  if (depth > 10) return '[bounded]';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 500).map((item) => redactCommercialContent(item, depth + 1));
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && SECRET_VALUE.test(value)) return '[redacted]';
    return value;
  }
  const output = {};
  for (const [key, item] of Object.entries(value).slice(0, 500)) {
    if (SECRET_KEY.test(key)) continue;
    output[key] = redactCommercialContent(item, depth + 1);
  }
  return output;
}

function assertSafePayload(value) {
  const serialized = JSON.stringify(value);
  if (SECRET_VALUE.test(serialized) || [...walkKeys(value)].some((key) => SECRET_KEY.test(key))) {
    throw new Error('COMMERCIAL_SENSITIVE_DATA_FORBIDDEN');
  }
  return true;
}

function* walkKeys(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 10) return;
  for (const [key, item] of Object.entries(value)) {
    yield key;
    yield* walkKeys(item, depth + 1);
  }
}

function assertIntegerMinor(value, field = 'amountMinor', options = {}) {
  if (!Number.isSafeInteger(value)) throw new Error(`${field.toUpperCase()}_MUST_BE_SAFE_INTEGER`);
  if (value < 0 && options.allowNegative !== true) throw new Error(`${field.toUpperCase()}_MUST_NOT_BE_NEGATIVE`);
  return value;
}

function assertCurrency(currency) {
  if (!CURRENCY.test(String(currency || ''))) throw new Error('CURRENCY_INVALID');
  return currency;
}

function safeInteger(bigint, field = 'amount') {
  const value = Number(bigint);
  if (!Number.isSafeInteger(value)) throw new Error(`${field.toUpperCase()}_OVERFLOW`);
  return value;
}

function validateProduct(product) {
  assertSafePayload(product);
  const errors = [];
  if (!product.productKey || !product.version) errors.push('PRODUCT_IDENTITY_REQUIRED');
  if (product.capabilityKeys?.includes(GROUNDED_RESEARCH_CAPABILITY) &&
      (product.status === 'active' || product.availabilityStage === 'general_availability')) {
    errors.push('GROUNDED_RESEARCH_COMMERCIALLY_BLOCKED');
  }
  if (product.status === 'active' && product.capabilityGatePassed === false) errors.push('CAPABILITY_GATE_BLOCKED');
  return { valid: errors.length === 0, safeReasonCodes: errors };
}

function validatePlan(plan, products = []) {
  assertSafePayload(plan);
  const errors = [];
  try {
    assertCurrency(plan.currency);
    assertIntegerMinor(plan.basePriceMinor, 'basePriceMinor');
    assertIntegerMinor(plan.minimumCommitmentMinor || 0, 'minimumCommitmentMinor');
  } catch (error) {
    errors.push(error.message);
  }
  if (!plan.planKey || !plan.version) errors.push('PLAN_IDENTITY_REQUIRED');
  if (products.some((product) => product.capabilityKeys?.includes(GROUNDED_RESEARCH_CAPABILITY)) ||
      plan.includedCapabilityKeys?.includes(GROUNDED_RESEARCH_CAPABILITY)) {
    errors.push('GROUNDED_RESEARCH_PLAN_INCLUSION_FORBIDDEN');
  }
  if (plan.status === 'grandfathered' && plan.acceptNewSubscriptions === true) errors.push('GRANDFATHERED_PLAN_CLOSED');
  return { valid: errors.length === 0, safeReasonCodes: [...new Set(errors)] };
}

function validatePriceTiers(tiers = []) {
  let previousEnd = null;
  for (const tier of tiers) {
    if (!Number.isSafeInteger(tier.startQuantity) || tier.startQuantity < 0) throw new Error('PRICE_TIER_START_INVALID');
    if (tier.endQuantity != null && (!Number.isSafeInteger(tier.endQuantity) || tier.endQuantity < tier.startQuantity)) {
      throw new Error('PRICE_TIER_END_INVALID');
    }
    assertIntegerMinor(tier.unitPriceMinor, 'unitPriceMinor');
    if (previousEnd == null && tiers.indexOf(tier) > 0) throw new Error('PRICE_TIER_AFTER_UNBOUNDED');
    if (previousEnd != null && tier.startQuantity <= previousEnd) throw new Error('PRICE_TIERS_OVERLAP');
    previousEnd = tier.endQuantity == null ? null : tier.endQuantity;
  }
  return true;
}

function validatePriceBook(priceBook) {
  assertSafePayload(priceBook);
  assertCurrency(priceBook.currency);
  for (const item of priceBook.items || []) {
    if (!Number.isSafeInteger(item.unitQuantity) || item.unitQuantity <= 0) throw new Error('PRICE_UNIT_QUANTITY_INVALID');
    assertIntegerMinor(item.unitPriceMinor || 0, 'unitPriceMinor');
    assertIntegerMinor(item.includedQuantity || 0, 'includedQuantity');
    if (item.expression || item.pipeline || item.javascript) throw new Error('EXECUTABLE_PRICING_FORBIDDEN');
    validatePriceTiers(item.tiers || []);
  }
  return { valid: true, safeReasonCodes: [] };
}

function transition(current, next, transitions, entity) {
  if (!(transitions[current] || []).includes(next)) throw new Error(`${entity}_TRANSITION_INVALID:${current}:${next}`);
  return next;
}

const transitionSubscription = (current, next) => transition(current, next, SUBSCRIPTION_TRANSITIONS, 'SUBSCRIPTION');
const transitionTrial = (current, next) => transition(current, next, TRIAL_TRANSITIONS, 'TRIAL');
const transitionQuote = (current, next) => transition(current, next, QUOTE_TRANSITIONS, 'QUOTE');
const transitionOrder = (current, next) => transition(current, next, ORDER_TRANSITIONS, 'ORDER');
const transitionInvoice = (current, next) => transition(current, next, INVOICE_TRANSITIONS, 'INVOICE');
const transitionRollout = (current, next) => transition(current, next, ROLLOUT_TRANSITIONS, 'ROLLOUT');

function entitlementDecision(status, input, reasonCode = status) {
  const now = input.now instanceof Date ? input.now : new Date(input.now || Date.now());
  return {
    status,
    reasonCode,
    entitlementKey: input.entitlementKey,
    entitlementVersion: input.definition?.version,
    planVersion: input.subscription?.planVersion,
    priceBookVersion: input.subscription?.priceBookVersion,
    capabilityGateState: input.capabilityGate?.status || 'unknown',
    policyDecisionReference: input.policy?.decisionReference,
    generatedAt: now.toISOString(),
    reevaluationAt: new Date(now.getTime() + 30_000).toISOString(),
  };
}

function evaluateEntitlement(input = {}) {
  if (!input.identity?.authenticated) return entitlementDecision('not_entitled', input, 'AUTHENTICATION_REQUIRED');
  if (!input.organizationId || (input.workspaceRequired && !input.workspaceId)) return entitlementDecision('unknown', input, 'SCOPE_REQUIRED');
  if (input.tenant?.status !== 'active') return entitlementDecision('tenant_suspended', input, 'TENANT_INACTIVE');
  if (input.workspaceRequired && input.workspace?.status !== 'active') return entitlementDecision('workspace_suspended', input, 'WORKSPACE_INACTIVE');
  if (!['active', 'trialing'].includes(input.subscription?.status)) return entitlementDecision('subscription_inactive', input);
  const grant = (input.grants || []).find((item) =>
    item.entitlementKey === input.entitlementKey &&
    item.status === 'active' &&
    (!item.organizationId || item.organizationId === input.organizationId) &&
    (!item.workspaceId || item.workspaceId === input.workspaceId));
  if (!grant) return entitlementDecision('not_entitled', input, 'ACTIVE_GRANT_NOT_FOUND');
  if (input.definition?.status !== 'active') return entitlementDecision('not_entitled', input, 'ENTITLEMENT_DEFINITION_INACTIVE');
  if (input.product?.status !== 'active' || !['general_availability', 'limited_availability'].includes(input.product?.availabilityStage)) {
    return entitlementDecision('plan_restricted', input, 'PRODUCT_UNAVAILABLE');
  }
  if (input.capabilityKey === GROUNDED_RESEARCH_CAPABILITY) return entitlementDecision('provider_unavailable', input, 'PROVIDER_GATE_UNRESOLVED');
  if (!input.capabilityGate?.enabled || !['passed', 'passed_with_warnings'].includes(input.capabilityGate?.status)) {
    return entitlementDecision('capability_gate_blocked', input);
  }
  if (input.regionAllowed === false || input.residencyAllowed === false) return entitlementDecision('region_restricted', input);
  if (input.rbac?.allowed !== true) return entitlementDecision('not_entitled', input, 'RBAC_DENIED');
  if (input.policy?.allowed !== true) return entitlementDecision('not_entitled', input, 'POLICY_DENIED');
  if (input.quota?.available === false) return entitlementDecision('quota_exhausted', input);
  if (input.killSwitch?.active === true) return entitlementDecision('capability_gate_blocked', input, 'COMMERCIAL_KILL_SWITCH_ACTIVE');
  if (input.definition?.enforcementMode === 'approval_required' && !input.approval?.approved) {
    return entitlementDecision('approval_required', input);
  }
  const restricted = input.product.availabilityStage === 'limited_availability' || input.capabilityGate.status === 'passed_with_warnings';
  return entitlementDecision(restricted ? 'entitled_with_restrictions' : 'entitled', input, restricted ? 'RESTRICTIONS_APPLY' : 'ENTITLED');
}

class EntitlementCache {
  constructor({ ttlMs = 30_000, now = () => Date.now() } = {}) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.entries = new Map();
    this.versions = new Map();
  }
  version(organizationId) { return this.versions.get(organizationId) || 1; }
  key(scope, entitlementKey) {
    return [scope.organizationId, scope.workspaceId || '-', entitlementKey, this.version(scope.organizationId)].join(':');
  }
  get(scope, entitlementKey) {
    const entry = this.entries.get(this.key(scope, entitlementKey));
    if (!entry || entry.expiresAt <= this.now()) return null;
    return clone(entry.value);
  }
  set(scope, entitlementKey, value) {
    this.entries.set(this.key(scope, entitlementKey), { value: clone(value), expiresAt: this.now() + this.ttlMs });
  }
  invalidate(organizationId) {
    this.versions.set(organizationId, this.version(organizationId) + 1);
  }
}

function billableBoundary(record = {}) {
  if (record.capabilityKey === GROUNDED_RESEARCH_CAPABILITY) return { billable: false, reasonCode: 'GROUNDED_RESEARCH_BLOCKED' };
  if (record.synthetic || record.testFixture || record.environment === 'test' || record.environment === 'simulation') {
    return { billable: false, reasonCode: 'SYNTHETIC_USAGE' };
  }
  if (NON_BILLABLE_OUTCOMES.has(record.outcome)) return { billable: false, reasonCode: `OUTCOME_${String(record.outcome).toUpperCase()}` };
  if (record.providerStatus === 'unavailable') return { billable: false, reasonCode: 'PROVIDER_UNAVAILABLE' };
  if (record.capabilityGateAllowed === false) return { billable: false, reasonCode: 'CAPABILITY_GATE_DENIED' };
  if (record.policyAllowed === false) return { billable: false, reasonCode: 'POLICY_DENIED' };
  if (record.quotaAllowed === false) return { billable: false, reasonCode: 'QUOTA_DENIED' };
  if (record.tenantAccepted === false) return { billable: false, reasonCode: 'TENANT_REJECTED' };
  if (!['successful', 'completed'].includes(record.outcome)) return { billable: false, reasonCode: 'OUTCOME_NOT_PRICED' };
  return { billable: true, reasonCode: 'BILLABLE_SUCCESS' };
}

class AuthoritativeUsageLedger {
  constructor() {
    this.records = [];
    this.adjustments = [];
    this.idempotency = new Map();
    this.deduplication = new Map();
  }
  record(input) {
    assertSafePayload(input);
    if (!input.organizationId || !input.billingAccountId || !input.subscriptionId) throw new Error('USAGE_SCOPE_REQUIRED');
    if (!input.idempotencyKey || !input.deduplicationKey) throw new Error('USAGE_DEDUPLICATION_REQUIRED');
    const scopedIdempotency = `${input.organizationId}:${input.idempotencyKey}`;
    const scopedDedupe = `${input.organizationId}:${input.deduplicationKey}`;
    const existing = this.idempotency.get(scopedIdempotency) || this.deduplication.get(scopedDedupe);
    if (existing) return { record: existing, duplicate: true };
    const boundary = billableBoundary(input);
    const record = Object.freeze({
      usageRecordId: input.usageRecordId || `usage-${this.records.length + 1}`,
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      billingAccountId: input.billingAccountId,
      subscriptionId: input.subscriptionId,
      meterKey: input.meterKey,
      capabilityKey: input.capabilityKey,
      quantity: assertIntegerMinor(input.quantity, 'quantity'),
      unit: input.unit,
      outcome: input.outcome,
      billable: boundary.billable,
      billingExclusionReason: boundary.billable ? null : boundary.reasonCode,
      sourceRecordType: input.sourceRecordType,
      sourceRecordId: input.sourceRecordId,
      sourceTransition: input.sourceTransition,
      occurredAt: new Date(input.occurredAt || Date.now()).toISOString(),
      idempotencyDigest: hash(scopedIdempotency),
      deduplicationDigest: hash(scopedDedupe),
      pricingRuleVersion: input.pricingRuleVersion,
      evidenceDigest: hash(redactCommercialContent(input.evidence || {})),
    });
    this.records.push(record);
    this.idempotency.set(scopedIdempotency, record);
    this.deduplication.set(scopedDedupe, record);
    return { record, duplicate: false };
  }
  adjust(input) {
    assertSafePayload(input);
    const original = this.records.find((item) => item.usageRecordId === input.originalUsageRecordId);
    if (!original || original.organizationId !== input.organizationId) throw new Error('USAGE_RECORD_NOT_FOUND');
    const adjustment = Object.freeze({
      adjustmentId: input.adjustmentId || `adjustment-${this.adjustments.length + 1}`,
      organizationId: input.organizationId,
      originalUsageRecordId: original.usageRecordId,
      quantityDelta: assertIntegerMinor(input.quantityDelta, 'quantityDelta', { allowNegative: true }),
      reasonCode: input.reasonCode,
      approvalReference: input.approvalReference,
      createdAt: new Date(input.createdAt || Date.now()).toISOString(),
      evidenceDigest: hash(redactCommercialContent(input.evidence || {})),
    });
    this.adjustments.push(adjustment);
    return adjustment;
  }
  aggregate(filter = {}) {
    const records = this.records.filter((item) =>
      (!filter.organizationId || item.organizationId === filter.organizationId) &&
      (!filter.subscriptionId || item.subscriptionId === filter.subscriptionId) &&
      (!filter.meterKey || item.meterKey === filter.meterKey));
    const result = new Map();
    for (const item of records) {
      const key = `${item.meterKey}:${item.billable ? 'billable' : 'excluded'}`;
      result.set(key, (result.get(key) || 0) + item.quantity);
    }
    for (const adjustment of this.adjustments) {
      const original = records.find((item) => item.usageRecordId === adjustment.originalUsageRecordId);
      if (original) {
        const key = `${original.meterKey}:${original.billable ? 'billable' : 'excluded'}`;
        result.set(key, (result.get(key) || 0) + adjustment.quantityDelta);
      }
    }
    return [...result].map(([key, quantity]) => {
      const [meterKey, category] = key.split(':');
      return { meterKey, category, quantity };
    }).sort((a, b) => `${a.meterKey}:${a.category}`.localeCompare(`${b.meterKey}:${b.category}`));
  }
  reconcile(expected, filter = {}) {
    const actual = this.aggregate(filter);
    const normalize = (items) => new Map(items.map((item) => [`${item.meterKey}:${item.category}`, item.quantity]));
    const left = normalize(expected);
    const right = normalize(actual);
    const keys = [...new Set([...left.keys(), ...right.keys()])].sort();
    const mismatches = keys.flatMap((key) => left.get(key) === right.get(key) ? [] : [{
      key, expectedQuantity: left.get(key) || 0, actualQuantity: right.get(key) || 0,
    }]);
    return { status: mismatches.length ? 'mismatch' : 'reconciled', mismatches, blocksInvoiceFinalization: mismatches.length > 0 };
  }
}

function allowanceUtilization({ includedQuantity, usedQuantity, overageMode = 'block' }) {
  assertIntegerMinor(includedQuantity, 'includedQuantity');
  assertIntegerMinor(usedQuantity, 'usedQuantity');
  const overageQuantity = Math.max(0, usedQuantity - includedQuantity);
  return {
    includedQuantity,
    usedQuantity,
    remainingQuantity: Math.max(0, includedQuantity - usedQuantity),
    overageQuantity,
    outcome: overageQuantity === 0 ? 'within_allowance' : overageMode === 'allow_approved' ? 'approved_overage' : 'overage_blocked',
    allowed: overageQuantity === 0 || overageMode === 'allow_approved',
  };
}

function enforceSeatLimit({ seatMinimum = 0, seatMaximum, assignments = [] }) {
  assertIntegerMinor(seatMinimum, 'seatMinimum');
  assertIntegerMinor(seatMaximum, 'seatMaximum');
  const active = assignments.filter((item) => item.status === 'active');
  const unique = new Set(active.map((item) => `${item.organizationId}:${item.userId}`));
  return { activeSeats: unique.size, withinLimit: unique.size <= seatMaximum, minimumSatisfied: unique.size >= seatMinimum };
}

function roundQuantity(quantity, unitQuantity, roundingMode) {
  if (roundingMode === 'floor') return Math.floor(quantity / unitQuantity);
  if (roundingMode === 'nearest') return Math.round(quantity / unitQuantity);
  if (roundingMode === 'none') {
    if (quantity % unitQuantity) throw new Error('PRICE_QUANTITY_NOT_DIVISIBLE');
    return quantity / unitQuantity;
  }
  return Math.ceil(quantity / unitQuantity);
}

function calculateItemCharge(item, quantity) {
  assertIntegerMinor(quantity, 'quantity');
  const chargeable = Math.max(0, quantity - (item.includedQuantity || 0));
  if (item.chargingModel === 'tiered_graduated') {
    let total = 0n;
    for (const tier of item.tiers || []) {
      const upper = tier.endQuantity == null ? chargeable : Math.min(chargeable, tier.endQuantity);
      const units = Math.max(0, upper - tier.startQuantity + (tier.startQuantity === 0 ? 0 : 1));
      total += BigInt(units) * BigInt(assertIntegerMinor(tier.unitPriceMinor, 'unitPriceMinor'));
      if (tier.endQuantity == null || chargeable <= tier.endQuantity) break;
    }
    return safeInteger(total, 'lineTotalMinor');
  }
  if (item.chargingModel === 'tiered_volume') {
    const tier = (item.tiers || []).find((value) => chargeable >= value.startQuantity && (value.endQuantity == null || chargeable <= value.endQuantity));
    return tier ? safeInteger(BigInt(chargeable) * BigInt(tier.unitPriceMinor), 'lineTotalMinor') : 0;
  }
  const units = roundQuantity(chargeable, item.unitQuantity || 1, item.roundingMode || 'ceiling');
  return safeInteger(BigInt(units) * BigInt(assertIntegerMinor(item.unitPriceMinor || 0, 'unitPriceMinor')), 'lineTotalMinor');
}

function applyDiscount(amountMinor, discount = {}) {
  assertIntegerMinor(amountMinor, 'amountMinor');
  if (!discount.type) return 0;
  if (discount.type === 'fixed') return Math.min(amountMinor, assertIntegerMinor(discount.amountMinor, 'discountAmountMinor'));
  if (discount.type === 'percentage_bps') {
    if (!Number.isSafeInteger(discount.basisPoints) || discount.basisPoints < 0 || discount.basisPoints > 10_000) throw new Error('DISCOUNT_BASIS_POINTS_INVALID');
    return safeInteger((BigInt(amountMinor) * BigInt(discount.basisPoints)) / 10_000n, 'discountMinor');
  }
  throw new Error('DISCOUNT_TYPE_INVALID');
}

function previewInvoice({ currency, priceBookVersion, usage = [], priceItems = [], discount, creditMinor = 0, taxMinor = 0 }) {
  assertCurrency(currency);
  assertIntegerMinor(creditMinor, 'creditMinor');
  assertIntegerMinor(taxMinor, 'taxMinor');
  const billable = usage.filter((item) => item.billable && item.capabilityKey !== GROUNDED_RESEARCH_CAPABILITY);
  const grouped = new Map();
  for (const record of billable) grouped.set(record.meterKey, (grouped.get(record.meterKey) || 0) + record.quantity);
  const lineItems = priceItems.flatMap((item) => {
    if (item.productKey === GROUNDED_RESEARCH_CAPABILITY || item.capabilityKey === GROUNDED_RESEARCH_CAPABILITY) return [];
    const quantity = item.chargingModel === 'fixed' ? 1 : (grouped.get(item.usageMeterKey) || 0);
    const amountMinor = calculateItemCharge(item, quantity);
    return amountMinor === 0 && item.chargingModel !== 'fixed' ? [] : [{
      lineItemKey: item.priceBookItemKey,
      productKey: item.productKey,
      usageMeterKey: item.usageMeterKey,
      quantity,
      unitPriceMinor: item.unitPriceMinor || 0,
      amountMinor,
      currency,
      priceBookVersion,
      evidenceDigests: billable.filter((record) => record.meterKey === item.usageMeterKey).map((record) => record.evidenceDigest),
    }];
  });
  const subtotalMinor = lineItems.reduce((total, item) => total + item.amountMinor, 0);
  const discountMinor = applyDiscount(subtotalMinor, discount);
  const boundedCredit = Math.min(subtotalMinor - discountMinor, creditMinor);
  const totalMinor = subtotalMinor - discountMinor - boundedCredit + taxMinor;
  for (const value of [subtotalMinor, discountMinor, boundedCredit, taxMinor, totalMinor]) assertIntegerMinor(value);
  return { currency, priceBookVersion, lineItems, subtotalMinor, discountMinor, creditMinor: boundedCredit, taxMinor, totalMinor, amountDueMinor: totalMinor };
}

function finalizeInvoice(invoice, reconciliation) {
  if (reconciliation?.blocksInvoiceFinalization) throw new Error('INVOICE_RECONCILIATION_BLOCKED');
  if (invoice.status !== 'approved') throw new Error('INVOICE_APPROVAL_REQUIRED');
  if (invoice.lineItems?.some((item) => item.productKey === GROUNDED_RESEARCH_CAPABILITY || item.capabilityKey === GROUNDED_RESEARCH_CAPABILITY)) {
    throw new Error('GROUNDED_RESEARCH_INVOICE_FORBIDDEN');
  }
  return deepFreeze({ ...clone(invoice), status: 'finalized', finalizedAt: new Date(invoice.finalizedAt || Date.now()).toISOString(), invoiceDigest: hash(invoice) });
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

class MockPaymentAdapter {
  constructor() { this.calls = []; this.webhookIds = new Set(); }
  async collect(input) {
    assertSafePayload(input);
    this.calls.push({ operation: 'collect', amountMinor: assertIntegerMinor(input.amountMinor), currency: assertCurrency(input.currency) });
    return { status: 'succeeded', provider: 'mock', providerReference: `mock-payment-${this.calls.length}` };
  }
  processWebhook(event) {
    if (!event.eventId || !event.signatureVerified) throw new Error('PAYMENT_WEBHOOK_INVALID');
    if (this.webhookIds.has(event.eventId)) return { replay: true, stateChanged: false };
    this.webhookIds.add(event.eventId);
    return { replay: false, stateChanged: true, status: event.status };
  }
}

class NoopPaymentAdapter {
  async collect() { return { status: 'manual_action_required', provider: 'noop' }; }
}

class ManualTaxAdapter {
  constructor() { this.externalCalls = 0; }
  async estimate({ currency }) {
    assertCurrency(currency);
    return { status: 'manual_review_required', taxMinor: 0, currency, externalCallPerformed: false };
  }
}

class MockCommunicationAdapter {
  constructor() { this.records = []; }
  async prepare(input) {
    const record = { ...redactCommercialContent(input), status: 'prepared_not_sent', adapter: 'mock' };
    this.records.push(record);
    return record;
  }
}

function boundedRefund({ paidMinor, previouslyRefundedMinor = 0, requestedMinor }) {
  [paidMinor, previouslyRefundedMinor, requestedMinor].forEach((value) => assertIntegerMinor(value));
  const eligibleMinor = paidMinor - previouslyRefundedMinor;
  if (requestedMinor > eligibleMinor) throw new Error('REFUND_EXCEEDS_ELIGIBLE_AMOUNT');
  return { requestedMinor, eligibleMinor, remainingEligibleMinor: eligibleMinor - requestedMinor };
}

function prorate({ oldAmountMinor, newAmountMinor, elapsedUnits, totalUnits }) {
  [oldAmountMinor, newAmountMinor, elapsedUnits, totalUnits].forEach((value) => assertIntegerMinor(value));
  if (totalUnits <= 0 || elapsedUnits > totalUnits) throw new Error('PRORATION_PERIOD_INVALID');
  const remaining = BigInt(totalUnits - elapsedUnits);
  const creditMinor = safeInteger((BigInt(oldAmountMinor) * remaining) / BigInt(totalUnits), 'prorationCreditMinor');
  const chargeMinor = safeInteger((BigInt(newAmountMinor) * remaining) / BigInt(totalUnits), 'prorationChargeMinor');
  return { creditMinor, chargeMinor, netAmountMinor: chargeMinor - creditMinor, roundingMode: 'truncate_minor_unit' };
}

function evaluateGaReadiness(input = {}) {
  const coreRequired = ['release', 'staging', 'pilot', 'analytics', 'security', 'tenancy', 'rbac', 'policy', 'catalog', 'pricing', 'entitlements', 'metering', 'reconciliation', 'invoicing', 'rollback'];
  const blockers = coreRequired.filter((key) => !['passed', 'ready'].includes(input[key]));
  const restrictions = [];
  if (input.paymentAdapter !== 'mock_verified' && input.paymentAdapter !== 'manual_ready') restrictions.push('PAYMENT_COLLECTION_RESTRICTED');
  if (input.taxStatus !== 'manual_review_ready') restrictions.push('TAX_REVIEW_REQUIRED');
  restrictions.push('GROUNDED_RESEARCH_PROVIDER_UNAVAILABLE');
  return {
    overall: blockers.length ? 'not_ready' : 'ready_with_restrictions',
    blockers,
    restrictions: [...new Set(restrictions)],
    capabilities: {
      core_orchestration: blockers.length ? 'blocked' : 'ready_with_restrictions',
      [GROUNDED_RESEARCH_CAPABILITY]: 'blocked',
    },
    providerGates: { gemini: 'blocked_provider_unavailable', externalFlow: 'deferred' },
    productionAuthorized: false,
  };
}

function evaluateRolloutGuardrails(rollout, observations = {}) {
  const violations = [];
  if ((observations.tenantIsolationViolations || 0) > 0) violations.push('TENANT_ISOLATION');
  if ((observations.securityControlFailures || 0) > 0) violations.push('SECURITY_CONTROL');
  if ((observations.errorRateBps || 0) > (rollout.maximumErrorRateBps || 100)) violations.push('ERROR_RATE');
  if (observations.providerUnavailable && rollout.capabilityKeys?.includes(GROUNDED_RESEARCH_CAPABILITY)) violations.push('PROVIDER_UNAVAILABLE');
  return { outcome: violations.length ? 'pause_required' : 'continue', violations };
}

function simulateRollback(rollout) {
  return {
    rolloutKey: rollout.rolloutKey,
    status: 'rolled_back',
    simulation: true,
    productionMutationPerformed: false,
    preservedControls: ['authentication', 'tenant_isolation', 'rbac', 'policy', 'capability_gates', 'encryption', 'audit'],
  };
}

function createEvidencePackage(input) {
  const safe = redactCommercialContent(input);
  assertSafePayload(safe);
  return deepFreeze({
    evidenceVersion: '14C.1',
    releaseCandidateId: safe.releaseCandidateId,
    readinessStatus: safe.readinessStatus,
    groundedResearchStatus: 'blocked',
    summaries: safe.summaries || {},
    sourceDigests: (safe.sources || []).map(hash),
    generatedAt: new Date(safe.generatedAt || Date.now()).toISOString(),
    evidenceDigest: hash(safe),
    certificationClaimed: false,
    productionLaunchAuthorized: false,
  });
}

function createCommercialExport(input) {
  const safe = redactCommercialContent(input);
  assertSafePayload(safe);
  return {
    organizationId: safe.organizationId,
    billingAccountId: safe.billingAccountId,
    currency: safe.currency,
    records: safe.records || [],
    exportDigest: hash(safe),
    adapter: 'safe_json',
    externalTransferPerformed: false,
  };
}

module.exports = {
  AuthoritativeUsageLedger,
  EntitlementCache,
  ManualTaxAdapter,
  MockCommunicationAdapter,
  MockPaymentAdapter,
  NoopPaymentAdapter,
  allowanceUtilization,
  applyDiscount,
  assertCurrency,
  assertIntegerMinor,
  assertSafePayload,
  billableBoundary,
  boundedRefund,
  calculateItemCharge,
  createCommercialExport,
  createEvidencePackage,
  entitlementDecision,
  evaluateEntitlement,
  evaluateGaReadiness,
  evaluateRolloutGuardrails,
  enforceSeatLimit,
  finalizeInvoice,
  hash,
  previewInvoice,
  prorate,
  redactCommercialContent,
  simulateRollback,
  transitionInvoice,
  transitionOrder,
  transitionQuote,
  transitionRollout,
  transitionSubscription,
  transitionTrial,
  validatePlan,
  validatePriceBook,
  validatePriceTiers,
  validateProduct,
};
