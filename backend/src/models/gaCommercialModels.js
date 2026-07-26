const mongoose = require('mongoose');
const { requestFields, safeCodes, safeId, safeText, safeVersion, schema } = require('./releaseModelFields');
const { GROUNDED_RESEARCH_CAPABILITY } = require('../constants/gaCommercial');

const actor = { type: String, trim: true, maxlength: 200 };
const date = { type: Date };
const safeList = [safeId()];
const safeSummary = { type: mongoose.Schema.Types.Mixed, default: () => ({}) };
const money = (required = false, allowNegative = false) => ({
  type: Number,
  required,
  default: required ? undefined : 0,
  validate: {
    validator: (value) => Number.isSafeInteger(value) && (allowNegative || value >= 0),
    message: 'Money must use integer minor units.',
  },
});
const quantity = (required = false) => ({
  type: Number,
  required,
  default: required ? undefined : 0,
  validate: Number.isSafeInteger,
  min: 0,
});
const currency = { type: String, trim: true, uppercase: true, match: /^[A-Z]{3}$/, maxlength: 3 };
const optionalTenant = {
  organizationId: { type: String, trim: true, maxlength: 200, index: true },
  workspaceId: { type: String, trim: true, maxlength: 200, index: true },
  billingAccountId: { type: String, trim: true, maxlength: 200, index: true },
  subscriptionId: { type: String, trim: true, maxlength: 200, index: true },
};

function commercialModel(name, definition, indexes = [], options = {}) {
  const value = schema(definition, options);
  for (const [fields, indexOptions] of indexes) value.index(fields, indexOptions);
  value.pre('validate', function rejectUnsafeCommercialData(next) {
    const serialized = JSON.stringify(this.toObject({ depopulate: true }));
    if (/(?:bearer\s+[A-Za-z0-9._~+/-]{8,}|mongodb(?:\+srv)?:\/\/|-----BEGIN [^-]*PRIVATE KEY-----|"(?:authorization|password|secret|token|apiKey|providerKey|cardNumber|securityCode|bankCredential|rawPrompt|rawOutput|hiddenReasoning)"\s*:)/i.test(serialized)) {
      next(new Error('COMMERCIAL_SENSITIVE_DATA_FORBIDDEN'));
      return;
    }
    next();
  });
  if (options.immutableStatuses) {
    value.pre('save', function enforceFinalStateImmutability(next) {
      if (!this.isNew && options.immutableStatuses.includes(this.get('status')) && !this.isModified('status')) {
        const allowed = new Set(['updatedAt', '__v']);
        const forbidden = this.modifiedPaths().filter((path) => !allowed.has(path));
        if (forbidden.length) {
          next(new Error(`${name.toUpperCase()}_IMMUTABLE`));
          return;
        }
      }
      next();
    });
  }
  return mongoose.models[name] || mongoose.model(name, value);
}

const versionActors = { createdBy: actor, updatedBy: actor, activatedBy: actor, retiredBy: actor };
const commercialScope = { ...optionalTenant, ...requestFields };

const CommercialProduct = commercialModel('CommercialProduct', {
  productKey: safeId(true), name: safeText(160), description: safeText(1_000), version: safeVersion(true),
  status: { type: String, enum: ['draft', 'validating', 'active', 'retired', 'archived'], default: 'draft' },
  productType: { type: String, enum: ['platform', 'capability', 'add_on', 'support', 'services'], required: true },
  capabilityKeys: safeList, requiredCapabilityKeys: safeList, incompatibleCapabilityKeys: safeList,
  availabilityStage: { type: String, enum: ['internal', 'staging', 'pilot', 'limited_availability', 'general_availability', 'suspended', 'retired'], default: 'internal' },
  allowedRegions: safeList, restrictedRegions: safeList, allowedCustomerCategories: safeList,
  requiredComplianceProfiles: safeList, requiredLaunchGateKeys: safeList,
  meteringMode: { type: String, enum: ['unmetered', 'seat', 'invocation', 'successful_invocation', 'execution_time', 'orchestration_run', 'node_execution', 'data_volume', 'fixed_allowance', 'custom_manual'], default: 'unmetered' },
  usageMeterKeys: safeList, entitlementDefinitionKeys: safeList, priceBookItemKeys: safeList,
  supportTierEligibility: safeList, documentationReferences: [safeText(256)], termsReferenceKeys: safeList,
  ...versionActors,
}, [
  [{ productKey: 1, version: 1 }, { unique: true, name: 'commercial_product_key_version' }],
  [{ status: 1, productType: 1 }, { name: 'commercial_product_status_type' }],
  [{ availabilityStage: 1 }, { name: 'commercial_product_availability' }],
], { immutableStatuses: ['active'] });

const CommercialPlan = commercialModel('CommercialPlan', {
  planKey: safeId(true), name: safeText(160), description: safeText(1_000), version: safeVersion(true),
  status: { type: String, enum: ['draft', 'validating', 'active', 'grandfathered', 'retired', 'archived'], default: 'draft' },
  edition: { type: String, enum: ['developer', 'team', 'business', 'enterprise', 'custom'], required: true },
  billingCadence: { type: String, enum: ['monthly', 'quarterly', 'annual', 'custom_manual'], required: true },
  currency: { ...currency, required: true }, basePriceMinor: money(true), minimumCommitmentMinor: money(),
  seatMinimum: quantity(), seatMaximum: quantity(), includedProductKeys: safeList, includedEntitlementKeys: safeList,
  includedUsageAllowances: [safeSummary], quotaProfileKey: safeId(), supportTierKey: safeId(),
  overagePolicyKey: safeId(), discountEligibilityPolicyKey: safeId(), trialPolicyKey: safeId(),
  cancellationPolicyKey: safeId(), renewalPolicyKey: safeId(), allowedCustomerCategories: safeList,
  allowedRegions: safeList, requiredApprovalKeys: safeList, requiredContractReference: { type: Boolean, default: false },
  effectiveFrom: date, effectiveUntil: date, ...versionActors,
}, [
  [{ planKey: 1, version: 1 }, { unique: true, name: 'commercial_plan_key_version' }],
  [{ status: 1, edition: 1 }, { name: 'commercial_plan_status_edition' }],
  [{ effectiveFrom: 1, effectiveUntil: 1 }, { name: 'commercial_plan_effective_window' }],
], { immutableStatuses: ['active'] });

const priceTier = new mongoose.Schema({
  startQuantity: quantity(true), endQuantity: quantity(), unitPriceMinor: money(true),
}, { _id: false, strict: 'throw' });
const priceItem = new mongoose.Schema({
  priceBookItemKey: safeId(true), productKey: safeId(true), usageMeterKey: safeId(),
  capabilityKey: safeId(), chargingModel: { type: String, enum: ['fixed', 'per_unit', 'tiered_volume', 'tiered_graduated', 'package', 'seat', 'minimum_commitment', 'manual'], required: true },
  unitName: safeId(), unitQuantity: { type: Number, min: 1, validate: Number.isSafeInteger, required: true },
  unitPriceMinor: money(true), tiers: [priceTier], includedQuantity: quantity(), minimumQuantity: quantity(),
  maximumQuantity: quantity(), roundingMode: { type: String, enum: ['none', 'floor', 'ceiling', 'nearest'], default: 'ceiling' },
  billingTiming: { type: String, enum: ['advance', 'arrears', 'manual'], default: 'arrears' },
  taxableCategory: safeId(), revenueCategory: safeId(), metadataSafeSummary: safeText(500),
}, { _id: false, strict: 'throw' });

const CommercialPriceBook = commercialModel('CommercialPriceBook', {
  priceBookKey: safeId(true), name: safeText(160), version: safeVersion(true), currency: { ...currency, required: true },
  status: { type: String, enum: ['draft', 'validating', 'active', 'retired', 'archived'], default: 'draft' },
  effectiveFrom: date, effectiveUntil: date, regionCategory: safeId(), customerCategory: safeId(),
  items: [priceItem], ...versionActors,
}, [
  [{ priceBookKey: 1, version: 1, currency: 1 }, { unique: true, name: 'commercial_price_book_version_currency' }],
  [{ status: 1, effectiveFrom: 1 }, { name: 'commercial_price_book_status_effective' }],
  [{ regionCategory: 1, customerCategory: 1 }, { name: 'commercial_price_book_market' }],
], { immutableStatuses: ['active'] });

const EntitlementDefinition = commercialModel('EntitlementDefinition', {
  entitlementKey: safeId(true), name: safeText(160), description: safeText(1_000), version: safeVersion(true),
  status: { type: String, enum: ['draft', 'active', 'retired', 'archived'], default: 'draft' },
  entitlementType: { type: String, enum: ['boolean', 'quantity', 'quota', 'rate_limit', 'feature_stage', 'support_level'], required: true },
  capabilityKey: safeId(true), productKey: safeId(true), valueSchema: safeSummary, defaultValue: safeSummary,
  minimumValue: safeSummary, maximumValue: safeSummary,
  enforcementMode: { type: String, enum: ['hard', 'soft', 'advisory', 'approval_required'], default: 'hard' },
  requiredLaunchGateKeys: safeList, requiredPolicyAction: safeId(), requiredRoles: safeList,
  allowedRegions: safeList, requiredComplianceProfiles: safeList, ...versionActors,
}, [
  [{ entitlementKey: 1, version: 1 }, { unique: true, name: 'entitlement_definition_key_version' }],
  [{ capabilityKey: 1, status: 1 }, { name: 'entitlement_definition_capability_status' }],
], { immutableStatuses: ['active'] });

const EntitlementGrant = commercialModel('EntitlementGrant', {
  ...commercialScope, orderId: safeId(), contractReferenceId: safeId(),
  entitlementKey: safeId(true), entitlementVersion: safeVersion(true), capabilityKey: safeId(true), productKey: safeId(true),
  grantScope: { type: String, enum: ['organization', 'workspace', 'user', 'subscription'], required: true },
  userId: actor, value: safeSummary,
  status: { type: String, enum: ['pending', 'active', 'suspended', 'expired', 'revoked', 'cancelled'], default: 'pending' },
  source: { type: String, enum: ['plan', 'add_on', 'trial', 'promotion', 'manual_approved', 'migration'], required: true },
  startsAt: date, endsAt: date, suspendedAt: date, revokedAt: date,
  sourceReference: safeText(256), approvalReference: safeText(256), createdBy: actor, updatedBy: actor,
}, [
  [{ billingAccountId: 1, organizationId: 1, workspaceId: 1, status: 1 }, { name: 'entitlement_grant_scope_status' }],
  [{ subscriptionId: 1, entitlementKey: 1, status: 1 }, { name: 'entitlement_grant_subscription_key' }],
]);

const CommercialCustomerProfile = commercialModel('CommercialCustomerProfile', {
  organizationId: { type: String, required: true, trim: true, maxlength: 200 }, billingAccountId: safeId(),
  legalNameReference: safeText(256), displayName: safeText(160),
  customerCategory: { type: String, enum: ['internal', 'startup', 'small_business', 'mid_market', 'enterprise', 'public_sector', 'education', 'nonprofit', 'partner', 'custom'], required: true },
  commercialStatus: { type: String, enum: ['prospect', 'evaluating', 'trial', 'active', 'past_due', 'suspended', 'cancelled', 'terminated', 'archived'], default: 'prospect' },
  billingContactReferences: [safeText(256)], technicalContactReferences: [safeText(256)],
  securityContactReferences: [safeText(256)], supportContactReferences: [safeText(256)],
  billingCountryCode: { type: String, uppercase: true, maxlength: 2 }, billingRegionCode: safeId(),
  defaultCurrency: currency, purchaseOrderRequired: Boolean, manualInvoiceRequired: Boolean,
  taxStatusCategory: safeId(), supportTierKey: safeId(), customerSuccessOwnerReference: safeText(256),
  contractReferenceIds: safeList, termsAcceptanceIds: safeList, createdBy: actor, updatedBy: actor,
}, [[{ organizationId: 1 }, { unique: true, name: 'commercial_customer_organization' }]]);

const BillingAccount = commercialModel('BillingAccount', {
  organizationId: { type: String, required: true, trim: true, maxlength: 200 }, accountKey: safeId(true),
  displayName: safeText(160), currency: { ...currency, required: true },
  status: { type: String, enum: ['draft', 'active', 'past_due', 'billing_paused', 'suspended', 'closed', 'archived'], default: 'draft' },
  billingMode: { type: String, enum: ['provider', 'manual_invoice', 'no_charge', 'internal'], required: true },
  paymentProviderReference: safeText(256), taxProviderReference: safeText(256), invoiceDeliveryMode: safeId(),
  billingContactReferences: [safeText(256)], purchaseOrderReference: safeText(256), paymentTermsDays: quantity(),
  currentPriceBookKey: safeId(), currentPriceBookVersion: safeVersion(), billingAnchorDay: { type: Number, min: 1, max: 28, validate: Number.isSafeInteger },
  timezone: safeText(64), locale: safeText(32), ...requestFields, createdBy: actor, updatedBy: actor, activatedBy: actor, suspendedBy: actor,
}, [
  [{ organizationId: 1, accountKey: 1 }, { unique: true, name: 'billing_account_org_key' }],
  [{ status: 1 }, { name: 'billing_account_status' }],
  [{ paymentProviderReference: 1 }, { sparse: true, name: 'billing_account_provider_reference' }],
]);

const CommercialSubscription = commercialModel('CommercialSubscription', {
  ...commercialScope, workspaceIds: safeList, subscriptionKey: { ...safeId(true), unique: true },
  planKey: safeId(true), planVersion: safeVersion(true), priceBookKey: safeId(true), priceBookVersion: safeVersion(true),
  status: { type: String, enum: ['draft', 'pending_approval', 'scheduled', 'trialing', 'active', 'paused', 'past_due', 'suspended', 'cancelling', 'cancelled', 'terminated', 'expired'], default: 'draft' },
  quantity: quantity(), seatQuantity: quantity(), committedUsageQuantities: [safeSummary],
  billingCadence: { type: String, enum: ['monthly', 'quarterly', 'annual', 'custom_manual'], required: true },
  currentPeriodStart: date, currentPeriodEnd: date, trialStart: date, trialEnd: date, cancelAt: date,
  cancelledAt: date, terminatedAt: date,
  renewalMode: { type: String, enum: ['automatic', 'manual', 'non_renewing'], default: 'manual' },
  paymentCollectionMode: { type: String, enum: ['automatic', 'manual_invoice', 'no_charge'], default: 'manual_invoice' },
  entitlementGrantIds: safeList, usageAllowanceIds: safeList, orderId: safeId(), quoteId: safeId(),
  contractReferenceId: safeId(), approvalReference: safeText(256), createdBy: actor, activatedBy: actor,
  pausedBy: actor, cancelledBy: actor,
}, [
  [{ billingAccountId: 1, status: 1 }, { name: 'subscription_billing_status' }],
  [{ organizationId: 1, status: 1 }, { name: 'subscription_org_status' }],
  [{ currentPeriodEnd: 1 }, { name: 'subscription_period_end' }],
  [{ trialEnd: 1 }, { name: 'subscription_trial_end' }],
  [{ renewalMode: 1, status: 1 }, { name: 'subscription_renewal_status' }],
]);

const CommercialTrial = commercialModel('CommercialTrial', {
  ...commercialScope, trialKey: { ...safeId(true), unique: true }, planKey: safeId(true), planVersion: safeVersion(true),
  status: { type: String, enum: ['draft', 'scheduled', 'active', 'extended', 'converted', 'expired', 'cancelled'], default: 'draft' },
  startsAt: date, trialEnd: date, originalTrialEnd: date, extensionCount: quantity(), convertedAt: date,
  entitlementGrantIds: safeList, approvalReference: safeText(256), createdBy: actor, updatedBy: actor,
}, [
  [{ organizationId: 1, status: 1 }, { name: 'commercial_trial_org_status' }],
  [{ subscriptionId: 1 }, { name: 'commercial_trial_subscription' }],
  [{ trialEnd: 1 }, { name: 'commercial_trial_end' }],
]);

const CommercialQuote = commercialModel('CommercialQuote', {
  ...commercialScope, quoteNumber: safeId(true), version: safeVersion(true),
  status: { type: String, enum: ['draft', 'validating', 'approval_required', 'approved', 'presented', 'accepted', 'converted', 'rejected', 'expired', 'cancelled'], default: 'draft' },
  currency: { ...currency, required: true }, planKey: safeId(true), planVersion: safeVersion(true),
  priceBookKey: safeId(true), priceBookVersion: safeVersion(true), lineItems: [safeSummary],
  subtotalMinor: money(), discountMinor: money(), creditMinor: money(), taxMinor: money(), totalMinor: money(),
  validUntil: date, approvalReference: safeText(256), acceptanceReference: safeText(256), orderId: safeId(),
  createdBy: actor, approvedBy: actor, acceptedBy: actor,
}, [
  [{ quoteNumber: 1, version: 1 }, { unique: true, name: 'commercial_quote_number_version' }],
  [{ billingAccountId: 1, status: 1 }, { name: 'commercial_quote_billing_status' }],
  [{ validUntil: 1 }, { name: 'commercial_quote_valid_until' }],
]);

const CommercialOrder = commercialModel('CommercialOrder', {
  ...commercialScope, orderNumber: { ...safeId(true), unique: true }, quoteId: safeId(), quoteVersion: safeVersion(),
  status: { type: String, enum: ['draft', 'pending_approval', 'approved', 'provisioning', 'provisioned', 'completed', 'failed', 'cancelled'], default: 'draft' },
  items: [safeSummary], provisioningDigest: safeText(80), provisioningAttempts: quantity(),
  approvalReference: safeText(256), contractReferenceId: safeId(), createdBy: actor, approvedBy: actor, provisionedBy: actor,
}, [
  [{ billingAccountId: 1, status: 1 }, { name: 'commercial_order_billing_status' }],
  [{ subscriptionId: 1 }, { name: 'commercial_order_subscription' }],
  [{ organizationId: 1, idempotencyKeyHash: 1 }, { unique: true, sparse: true, name: 'commercial_order_idempotency' }],
]);

const CommercialContractReference = commercialModel('CommercialContractReference', {
  ...commercialScope, contractKey: { ...safeId(true), unique: true }, contractType: safeId(true), version: safeVersion(true),
  status: { type: String, enum: ['draft', 'review_required', 'approved', 'active', 'terminated', 'expired', 'archived'], default: 'draft' },
  externalReference: safeText(256), safeSummary: safeText(1_000), effectiveFrom: date, effectiveUntil: date,
  approvalReference: safeText(256), acceptedAt: date, terminatedAt: date, createdBy: actor, approvedBy: actor,
}, [[{ organizationId: 1, status: 1 }, { name: 'commercial_contract_org_status' }]]);

const CommercialAcceptance = commercialModel('CommercialAcceptance', {
  ...commercialScope, acceptanceKey: safeId(true), subjectType: safeId(true), subjectId: safeId(true),
  termsKey: safeId(true), termsVersion: safeVersion(true), policyVersions: [safeVersion()],
  status: { type: String, enum: ['required', 'accepted', 'withdrawn', 'expired', 'superseded'], default: 'required' },
  acceptedBy: actor, acceptedAt: date, withdrawnAt: date, sourceCategory: safeId(), evidenceDigest: safeText(80),
}, [[{ organizationId: 1, subjectType: 1, subjectId: 1, termsKey: 1, termsVersion: 1 }, { unique: true, name: 'commercial_acceptance_versioned' }]]);

const UsageMeterDefinition = commercialModel('UsageMeterDefinition', {
  meterKey: safeId(true), name: safeText(160), description: safeText(1_000), version: safeVersion(true),
  status: { type: String, enum: ['draft', 'validating', 'active', 'retired', 'archived'], default: 'draft' },
  capabilityKey: safeId(true), sourceRecordType: safeId(true), sourceTransition: safeId(true),
  unit: safeId(true), aggregation: { type: String, enum: ['sum', 'count', 'maximum', 'latest', 'manual'], required: true },
  billableOutcomes: safeList, excludedOutcomes: safeList, deduplicationFields: safeList,
  pricingRuleVersion: safeVersion(true), createdBy: actor, activatedBy: actor,
}, [
  [{ meterKey: 1, version: 1 }, { unique: true, name: 'usage_meter_key_version' }],
  [{ capabilityKey: 1, status: 1 }, { name: 'usage_meter_capability_status' }],
], { immutableStatuses: ['active'] });

const CommercialUsageRecord = commercialModel('CommercialUsageRecord', {
  ...commercialScope, usageRecordId: { ...safeId(true), unique: true }, meterKey: safeId(true), meterVersion: safeVersion(true),
  capabilityKey: safeId(true), quantity: quantity(true), unit: safeId(true),
  outcome: safeId(true), billable: { type: Boolean, required: true }, billingExclusionReason: safeId(),
  sourceRecordType: safeId(true), sourceRecordId: safeId(true), sourceTransition: safeId(true), occurredAt: { ...date, required: true },
  idempotencyDigest: safeText(80), deduplicationDigest: safeText(80), pricingRuleVersion: safeVersion(),
  evidenceDigest: safeText(80), adjustmentState: safeId(), createdBy: actor,
}, [
  [{ organizationId: 1, idempotencyDigest: 1 }, { unique: true, name: 'usage_record_scoped_idempotency' }],
  [{ organizationId: 1, deduplicationDigest: 1 }, { unique: true, name: 'usage_record_scoped_deduplication' }],
  [{ billingAccountId: 1, subscriptionId: 1, occurredAt: 1 }, { name: 'usage_record_billing_period' }],
  [{ meterKey: 1, occurredAt: 1 }, { name: 'usage_record_meter_time' }],
  [{ sourceRecordType: 1, sourceRecordId: 1, sourceTransition: 1 }, { name: 'usage_record_source' }],
], { immutableStatuses: [] });

const UsageAdjustment = commercialModel('UsageAdjustment', {
  ...commercialScope, adjustmentId: { ...safeId(true), unique: true }, originalUsageRecordId: safeId(true),
  quantityDelta: money(true, true), reasonCode: safeId(true), approvalReference: safeText(256),
  evidenceDigest: safeText(80), createdBy: actor,
}, [
  [{ organizationId: 1, originalUsageRecordId: 1, createdAt: 1 }, { name: 'usage_adjustment_original' }],
  [{ billingAccountId: 1, subscriptionId: 1 }, { name: 'usage_adjustment_scope' }],
]);

const CommercialUsageAggregate = commercialModel('CommercialUsageAggregate', {
  ...commercialScope, aggregateKey: safeId(true), meterKey: safeId(true), periodStart: date, periodEnd: date,
  billableQuantity: quantity(), excludedQuantity: quantity(), adjustedQuantity: money(false, true),
  sourceCount: quantity(), projectionVersion: safeVersion(true), checkpoint: safeText(256), status: safeId(),
}, [[{ organizationId: 1, subscriptionId: 1, meterKey: 1, periodStart: 1, periodEnd: 1, projectionVersion: 1 }, { unique: true, name: 'usage_aggregate_window' }]]);

const UsageAllowance = commercialModel('UsageAllowance', {
  ...commercialScope, allowanceKey: safeId(true), meterKey: safeId(true), includedQuantity: quantity(true),
  usedQuantity: quantity(), overageQuantity: quantity(), periodStart: date, periodEnd: date,
  source: safeId(true), status: { type: String, enum: ['pending', 'active', 'exhausted', 'expired', 'cancelled'], default: 'pending' },
}, [[{ subscriptionId: 1, meterKey: 1, periodStart: 1, periodEnd: 1 }, { unique: true, name: 'usage_allowance_period' }]]);

const OveragePolicy = commercialModel('OveragePolicy', {
  ...optionalTenant, overagePolicyKey: safeId(true), version: safeVersion(true),
  status: { type: String, enum: ['draft', 'active', 'retired', 'archived'], default: 'draft' },
  mode: { type: String, enum: ['block', 'allow', 'allow_approved', 'soft_limit', 'manual'], required: true },
  maximumOverageQuantity: quantity(), requiredApproval: Boolean, safeNotificationThresholds: [Number],
  createdBy: actor, activatedBy: actor,
}, [[{ organizationId: 1, overagePolicyKey: 1, version: 1 }, { unique: true, name: 'overage_policy_version' }]], { immutableStatuses: ['active'] });

const SeatAssignment = commercialModel('SeatAssignment', {
  ...commercialScope, seatKey: { ...safeId(true), unique: true }, userId: actor,
  status: { type: String, enum: ['pending', 'active', 'suspended', 'released'], default: 'pending' },
  assignedAt: date, suspendedAt: date, releasedAt: date, createdBy: actor, updatedBy: actor,
}, [[{ subscriptionId: 1, organizationId: 1, userId: 1, status: 1 }, { name: 'seat_subscription_user_status' }]]);

const CommercialDiscount = commercialModel('CommercialDiscount', {
  ...commercialScope, discountKey: safeId(true), version: safeVersion(true),
  status: { type: String, enum: ['draft', 'approval_required', 'active', 'expired', 'revoked'], default: 'draft' },
  discountType: { type: String, enum: ['fixed', 'percentage_bps'], required: true },
  amountMinor: money(), basisPoints: { type: Number, min: 0, max: 10000, validate: Number.isSafeInteger },
  currency, startsAt: date, endsAt: date, maximumRedemptions: quantity(), approvalReference: safeText(256),
  createdBy: actor, activatedBy: actor,
}, [[{ organizationId: 1, discountKey: 1, version: 1 }, { unique: true, name: 'commercial_discount_version' }]]);

const CommercialCredit = commercialModel('CommercialCredit', {
  ...commercialScope, creditKey: { ...safeId(true), unique: true }, currency: { ...currency, required: true },
  amountMinor: money(true), remainingMinor: money(true), status: { type: String, enum: ['pending', 'active', 'consumed', 'expired', 'revoked'], default: 'pending' },
  reasonCode: safeId(true), startsAt: date, endsAt: date, approvalReference: safeText(256), evidenceDigest: safeText(80), createdBy: actor,
}, [[{ billingAccountId: 1, status: 1, endsAt: 1 }, { name: 'commercial_credit_billing_status' }]]);

const BillingPeriod = commercialModel('BillingPeriod', {
  ...commercialScope, periodKey: { ...safeId(true), unique: true }, startsAt: { ...date, required: true }, endsAt: { ...date, required: true },
  status: { type: String, enum: ['open', 'closing', 'reconciling', 'ready_to_invoice', 'invoiced', 'closed', 'reopened'], default: 'open' },
  currency: { ...currency, required: true }, closedAt: date, createdBy: actor, closedBy: actor,
}, [[{ billingAccountId: 1, startsAt: 1, endsAt: 1 }, { unique: true, name: 'billing_period_account_window' }]]);

const MeteringReconciliation = commercialModel('MeteringReconciliation', {
  ...commercialScope, reconciliationKey: { ...safeId(true), unique: true }, billingPeriodId: safeId(true),
  status: { type: String, enum: ['pending', 'running', 'reconciled', 'mismatch', 'blocked', 'resolved'], default: 'pending' },
  expectedRecordCount: quantity(), actualRecordCount: quantity(), expectedQuantity: quantity(), actualQuantity: quantity(),
  mismatchCount: quantity(), mismatchSummaries: [safeSummary], blocksInvoiceFinalization: Boolean,
  projectionVersion: safeVersion(), evidenceDigest: safeText(80), reconciledAt: date,
}, [[{ billingAccountId: 1, billingPeriodId: 1, createdAt: -1 }, { name: 'metering_reconciliation_period' }]]);

const invoiceLine = new mongoose.Schema({
  lineItemKey: safeId(true), productKey: safeId(), capabilityKey: safeId(), usageMeterKey: safeId(),
  description: safeText(300), quantity: quantity(), unitPriceMinor: money(), amountMinor: money(),
  currency: { ...currency, required: true }, priceBookVersion: safeVersion(true), evidenceDigests: [safeText(80)],
}, { _id: false, strict: 'throw' });

const CommercialInvoice = commercialModel('CommercialInvoice', {
  ...commercialScope, invoiceNumber: { ...safeId(true), unique: true }, version: safeVersion(true), billingPeriodId: safeId(true),
  status: { type: String, enum: ['draft', 'calculating', 'approval_required', 'approved', 'finalized', 'issued', 'partially_paid', 'paid', 'past_due', 'partially_refunded', 'refunded', 'void'], default: 'draft' },
  currency: { ...currency, required: true }, priceBookKey: safeId(true), priceBookVersion: safeVersion(true),
  lineItems: [invoiceLine], subtotalMinor: money(), discountMinor: money(), creditMinor: money(), taxMinor: money(),
  totalMinor: money(), amountDueMinor: money(), dueAt: date, finalizedAt: date, issuedAt: date,
  approvalReference: safeText(256), reconciliationId: safeId(), invoiceDigest: safeText(80),
  createdBy: actor, approvedBy: actor, finalizedBy: actor, issuedBy: actor,
}, [
  [{ billingAccountId: 1, status: 1, createdAt: -1 }, { name: 'invoice_billing_status' }],
  [{ billingPeriodId: 1 }, { name: 'invoice_billing_period' }],
], { immutableStatuses: ['finalized', 'issued', 'partially_paid', 'paid', 'past_due', 'partially_refunded', 'refunded'] });

const CommercialPayment = commercialModel('CommercialPayment', {
  ...commercialScope, paymentKey: { ...safeId(true), unique: true }, invoiceId: safeId(true),
  status: { type: String, enum: ['pending', 'requires_action', 'processing', 'succeeded', 'failed', 'cancelled', 'partially_refunded', 'refunded'], default: 'pending' },
  adapterType: { type: String, enum: ['mock', 'noop', 'manual'], required: true }, providerReference: safeText(256),
  amountMinor: money(true), currency: { ...currency, required: true }, processedAt: date, failureReasonCode: safeId(),
  idempotencyDigest: safeText(80), createdBy: actor, updatedBy: actor,
}, [
  [{ billingAccountId: 1, status: 1 }, { name: 'payment_billing_status' }],
  [{ invoiceId: 1 }, { name: 'payment_invoice' }],
]);

const PaymentWebhookEvent = commercialModel('PaymentWebhookEvent', {
  provider: safeId(true), providerEventId: safeId(true), signatureVerified: { type: Boolean, required: true },
  status: safeId(true), safeEventType: safeId(true), receivedAt: date, processedAt: date, eventDigest: safeText(80),
}, [[{ provider: 1, providerEventId: 1 }, { unique: true, name: 'payment_webhook_replay_guard' }]]);

const CommercialRefund = commercialModel('CommercialRefund', {
  ...commercialScope, refundKey: { ...safeId(true), unique: true }, invoiceId: safeId(true), paymentId: safeId(true),
  status: { type: String, enum: ['pending', 'approved', 'processing', 'succeeded', 'failed', 'cancelled'], default: 'pending' },
  amountMinor: money(true), currency: { ...currency, required: true }, reasonCode: safeId(true),
  approvalReference: safeText(256), createdBy: actor, approvedBy: actor,
}, [[{ billingAccountId: 1, status: 1 }, { name: 'refund_billing_status' }], [{ invoiceId: 1 }, { name: 'refund_invoice' }]]);

const CommercialCreditNote = commercialModel('CommercialCreditNote', {
  ...commercialScope, creditNoteNumber: { ...safeId(true), unique: true }, invoiceId: safeId(true),
  status: { type: String, enum: ['draft', 'approved', 'finalized', 'issued', 'void'], default: 'draft' },
  amountMinor: money(true), currency: { ...currency, required: true }, reasonCode: safeId(true),
  lineItems: [invoiceLine], approvalReference: safeText(256), noteDigest: safeText(80),
  createdBy: actor, approvedBy: actor, finalizedBy: actor,
}, [[{ billingAccountId: 1, status: 1 }, { name: 'credit_note_billing_status' }], [{ invoiceId: 1 }, { name: 'credit_note_invoice' }]], { immutableStatuses: ['finalized', 'issued'] });

const BillingDispute = commercialModel('BillingDispute', {
  ...commercialScope, disputeKey: { ...safeId(true), unique: true }, invoiceId: safeId(true), paymentId: safeId(),
  status: { type: String, enum: ['open', 'investigating', 'awaiting_customer', 'awaiting_internal', 'resolved_customer', 'resolved_company', 'closed'], default: 'open' },
  category: safeId(true), amountMinor: money(), currency, safeSummary: safeText(1_000), resolutionCode: safeId(),
  evidenceReferences: [safeText(256)], assignedOwnerReference: safeText(256), resolvedAt: date,
  createdBy: actor, updatedBy: actor, resolvedBy: actor,
}, [[{ billingAccountId: 1, status: 1 }, { name: 'billing_dispute_status' }], [{ invoiceId: 1 }, { name: 'billing_dispute_invoice' }]]);

const DunningCase = commercialModel('DunningCase', {
  ...commercialScope, caseKey: { ...safeId(true), unique: true }, invoiceId: safeId(true),
  status: { type: String, enum: ['open', 'notifying', 'paused', 'payment_plan', 'service_restriction_review', 'resolved', 'closed'], default: 'open' },
  attemptCount: quantity(), nextActionAt: date, communicationAdapter: { type: String, enum: ['mock', 'noop', 'manual'], default: 'noop' },
  communicationReferences: safeList, restrictionApprovalReference: safeText(256), resolutionCode: safeId(),
  createdBy: actor, updatedBy: actor,
}, [[{ billingAccountId: 1, status: 1 }, { name: 'dunning_billing_status' }], [{ invoiceId: 1 }, { name: 'dunning_invoice' }], [{ nextActionAt: 1 }, { name: 'dunning_next_action' }]]);

const CommercialTaxStatus = commercialModel('CommercialTaxStatus', {
  ...commercialScope, taxStatusKey: { ...safeId(true), unique: true },
  status: { type: String, enum: ['not_evaluated', 'manual_review_required', 'exempt_reference_recorded', 'estimated', 'finalized', 'error'], default: 'not_evaluated' },
  adapterType: { type: String, enum: ['mock', 'noop', 'manual'], required: true }, countryCode: safeText(2),
  regionCode: safeId(), taxableCategory: safeId(), taxMinor: money(), currency,
  exemptionReference: safeText(256), evidenceDigest: safeText(80), evaluatedAt: date, updatedBy: actor,
}, [[{ billingAccountId: 1, status: 1 }, { name: 'commercial_tax_billing_status' }]]);

const CommercialRenewal = commercialModel('CommercialRenewal', {
  ...commercialScope, renewalKey: { ...safeId(true), unique: true }, currentTermEnd: { ...date, required: true },
  status: { type: String, enum: ['not_evaluated', 'review_required', 'ready', 'approved', 'non_renewing', 'renewed', 'expired'], default: 'not_evaluated' },
  planKey: safeId(true), planVersion: safeVersion(true), proposedPlanVersion: safeVersion(),
  readinessChecks: [safeSummary], approvalReference: safeText(256), decidedAt: date, createdBy: actor, approvedBy: actor,
}, [[{ subscriptionId: 1, currentTermEnd: 1 }, { unique: true, name: 'commercial_renewal_term' }], [{ status: 1 }, { name: 'commercial_renewal_status' }]]);

const CustomerSuccessAccount = commercialModel('CustomerSuccessAccount', {
  ...commercialScope, accountKey: { ...safeId(true), unique: true },
  lifecycleStage: { type: String, enum: ['onboarding', 'adopting', 'active', 'at_risk', 'expanding', 'renewing', 'offboarding', 'closed'], default: 'onboarding' },
  healthStatus: { type: String, enum: ['unknown', 'healthy', 'watch', 'at_risk', 'critical'], default: 'unknown' },
  supportTierKey: safeId(), ownerReference: safeText(256), successPlanReference: safeText(256),
  onboardingStatus: safeId(), adoptionCategory: safeId(), renewalStatus: safeId(), expansionReadiness: safeId(),
  nextReviewAt: date, safeRiskCodes: safeCodes, updatedBy: actor,
}, [[{ organizationId: 1, billingAccountId: 1 }, { unique: true, name: 'customer_success_billing_account' }]]);

const CommercialSupportTier = commercialModel('CommercialSupportTier', {
  supportTierKey: safeId(true), version: safeVersion(true), name: safeText(160),
  status: { type: String, enum: ['draft', 'active', 'retired', 'archived'], default: 'draft' },
  responseTargets: safeSummary, supportHoursCategory: safeId(), escalationPolicyReference: safeText(256),
  includedServiceKeys: safeList, createdBy: actor, activatedBy: actor,
}, [[{ supportTierKey: 1, version: 1 }, { unique: true, name: 'commercial_support_tier_version' }]], { immutableStatuses: ['active'] });

const GaOnboardingRun = commercialModel('GaOnboardingRun', {
  ...commercialScope, onboardingKey: { ...safeId(true), unique: true },
  status: { type: String, enum: ['not_started', 'in_progress', 'approval_required', 'approved', 'completed', 'blocked', 'cancelled'], default: 'not_started' },
  checklistVersion: safeVersion(true), items: [safeSummary], safeBlockerCodes: safeCodes,
  startedAt: date, completedAt: date, approvedBy: actor,
}, [[{ organizationId: 1, billingAccountId: 1, status: 1 }, { name: 'ga_onboarding_scope' }]]);

const GaCapabilityRelease = commercialModel('GaCapabilityRelease', {
  capabilityKey: safeId(true), version: safeVersion(true),
  stage: { type: String, enum: ['internal', 'staging', 'pilot', 'limited_availability', 'general_availability', 'suspended', 'retired'], required: true },
  status: { type: String, enum: ['draft', 'validating', 'approval_required', 'active', 'blocked', 'retired'], default: 'draft' },
  requiredLaunchGateKeys: safeList, allowedRegions: safeList, requiredComplianceProfiles: safeList,
  providerDependencyStatus: safeId(), enabled: Boolean, safeReasonCodes: safeCodes,
  createdBy: actor, activatedBy: actor,
}, [[{ capabilityKey: 1, version: 1 }, { unique: true, name: 'ga_capability_release_version' }], [{ stage: 1, status: 1 }, { name: 'ga_capability_stage_status' }]]);

const GaLaunchGate = commercialModel('GaLaunchGate', {
  gateKey: safeId(true), version: safeVersion(true), capabilityKey: safeId(),
  status: { type: String, enum: ['not_evaluated', 'evaluating', 'passed', 'passed_with_restrictions', 'blocked', 'failed', 'expired', 'disabled'], default: 'not_evaluated' },
  requiredEvidenceTypes: safeList, sourceGateReferences: safeList, safeReasonCodes: safeCodes,
  evaluatedAt: date, expiresAt: date, createdBy: actor, evaluatedBy: actor,
}, [[{ gateKey: 1, version: 1 }, { unique: true, name: 'ga_launch_gate_version' }], [{ capabilityKey: 1, status: 1 }, { name: 'ga_launch_gate_capability_status' }]]);

const GaRollout = commercialModel('GaRollout', {
  ...commercialScope, rolloutKey: { ...safeId(true), unique: true }, releaseCandidateId: safeId(true),
  status: { type: String, enum: ['draft', 'validating', 'approval_required', 'approved', 'scheduled', 'running', 'paused', 'guardrail_stopped', 'rollback_required', 'rolled_back', 'completed', 'blocked', 'cancelled'], default: 'draft' },
  scopeCategory: safeId(true), planKeys: safeList, capabilityKeys: safeList, regions: safeList,
  targetPercentageBps: { type: Number, min: 0, max: 10000, validate: Number.isSafeInteger },
  maximumErrorRateBps: { type: Number, min: 0, max: 10000, validate: Number.isSafeInteger },
  guardrails: [safeSummary], guardrailViolations: safeCodes, startsAt: date, startedAt: date, pausedAt: date,
  completedAt: date, approvalReference: safeText(256), simulationOnly: { type: Boolean, default: true },
  productionMutationPerformed: { type: Boolean, default: false }, createdBy: actor, approvedBy: actor,
}, [[{ status: 1, startsAt: 1 }, { name: 'ga_rollout_status_start' }], [{ releaseCandidateId: 1 }, { name: 'ga_rollout_release' }]]);

const CommercialKillSwitch = commercialModel('CommercialKillSwitch', {
  ...optionalTenant, switchKey: safeId(true), capabilityKey: safeId(), scopeCategory: safeId(true),
  state: { type: String, enum: ['inactive', 'active'], default: 'inactive' },
  controls: [{ type: String, enum: ['commercial_access', 'new_subscriptions', 'usage_recording', 'invoice_finalization', 'payment_collection', 'rollout'] }],
  safeReasonCode: safeId(), approvalReference: safeText(256), activatedAt: date, deactivatedAt: date,
  activatedBy: actor, deactivatedBy: actor,
}, [[{ organizationId: 1, switchKey: 1, scopeCategory: 1 }, { unique: true, name: 'commercial_kill_switch_scope' }]]);

const CommercialReadinessSnapshot = commercialModel('CommercialReadinessSnapshot', {
  ...optionalTenant,
  releaseCandidateId: safeId(true), snapshotKey: { ...safeId(true), unique: true },
  overall: { type: String, enum: ['not_ready', 'ready_with_restrictions', 'ready'], required: true },
  checks: [safeSummary], blockers: safeCodes, restrictions: safeCodes, capabilityStatuses: safeSummary,
  providerGateStatuses: safeSummary, productionAuthorized: { type: Boolean, default: false },
  generatedAt: { ...date, required: true }, generatedBy: actor,
}, [[{ releaseCandidateId: 1, generatedAt: -1 }, { name: 'commercial_readiness_release_time' }]]);

const GaDecision = commercialModel('GaDecision', {
  ...optionalTenant,
  decisionKey: { ...safeId(true), unique: true }, releaseCandidateId: safeId(true), rolloutId: safeId(),
  scope: safeId(true), decision: { type: String, enum: ['approve', 'approve_with_restrictions', 'hold', 'reject', 'rollback'], required: true },
  restrictions: safeCodes, safeReasonCodes: safeCodes, evidencePackageId: safeId(true),
  approvalReference: safeText(256), decidedAt: { ...date, required: true }, decidedBy: actor, decisionDigest: safeText(80),
}, [[{ releaseCandidateId: 1, scope: 1, decidedAt: -1 }, { name: 'ga_decision_release_scope' }], [{ rolloutId: 1 }, { name: 'ga_decision_rollout' }]], { immutableStatuses: [] });

const CommercialEvidencePackage = commercialModel('CommercialEvidencePackage', {
  ...optionalTenant,
  evidenceKey: { ...safeId(true), unique: true }, releaseCandidateId: safeId(true), evidenceVersion: safeVersion(true),
  readinessStatus: safeId(true), groundedResearchStatus: { type: String, enum: ['blocked'], default: 'blocked' },
  summaries: safeSummary, sourceDigests: [safeText(80)], evidenceDigest: { ...safeText(80), required: true },
  generatedAt: { ...date, required: true }, generatedBy: actor,
  certificationClaimed: { type: Boolean, default: false }, productionLaunchAuthorized: { type: Boolean, default: false },
}, [[{ releaseCandidateId: 1, evidenceDigest: 1 }, { unique: true, name: 'commercial_evidence_release_digest' }], [{ generatedAt: -1 }, { name: 'commercial_evidence_generated' }]]);

const CommercialExport = commercialModel('CommercialExport', {
  ...commercialScope, exportKey: { ...safeId(true), unique: true },
  exportType: { type: String, enum: ['finance', 'revenue', 'usage', 'invoice', 'offboarding', 'ga_evidence'], required: true },
  status: { type: String, enum: ['requested', 'generating', 'completed', 'failed', 'expired'], default: 'requested' },
  adapterType: { type: String, enum: ['safe_json', 'csv', 'manual', 'noop'], default: 'safe_json' },
  periodStart: date, periodEnd: date, currency, recordCount: quantity(), exportDigest: safeText(80),
  evidenceReferences: safeList, externalTransferPerformed: { type: Boolean, default: false },
  requestedBy: actor, completedAt: date,
}, [[{ organizationId: 1, billingAccountId: 1, createdAt: -1 }, { name: 'commercial_export_scope' }]]);

const CommercialHealthSnapshot = commercialModel('CommercialHealthSnapshot', {
  ...commercialScope, snapshotKey: { ...safeId(true), unique: true }, periodStart: date, periodEnd: date,
  subscriptionHealth: safeId(), meteringHealth: safeId(), reconciliationHealth: safeId(), invoiceHealth: safeId(),
  paymentHealth: safeId(), renewalHealth: safeId(), supportHealth: safeId(), safeRiskCodes: safeCodes,
  generatedAt: date,
}, [[{ organizationId: 1, billingAccountId: 1, generatedAt: -1 }, { name: 'commercial_health_scope_time' }]]);

if (CommercialProduct.schema.path('capabilityKeys')) {
  CommercialProduct.schema.pre('save', function enforceGroundedResearchGate(next) {
    if (this.capabilityKeys?.includes(GROUNDED_RESEARCH_CAPABILITY) &&
        (this.status === 'active' || this.availabilityStage === 'general_availability')) {
      next(new Error('GROUNDED_RESEARCH_COMMERCIALLY_BLOCKED'));
      return;
    }
    next();
  });
}

module.exports = {
  BillingAccount,
  BillingDispute,
  BillingPeriod,
  CommercialAcceptance,
  CommercialContractReference,
  CommercialCredit,
  CommercialCreditNote,
  CommercialCustomerProfile,
  CommercialDiscount,
  CommercialEvidencePackage,
  CommercialExport,
  CommercialHealthSnapshot,
  CommercialInvoice,
  CommercialOrder,
  CommercialPayment,
  CommercialPlan,
  CommercialPriceBook,
  CommercialProduct,
  CommercialQuote,
  CommercialReadinessSnapshot,
  CommercialRefund,
  CommercialRenewal,
  CommercialSubscription,
  CommercialSupportTier,
  CommercialTaxStatus,
  CommercialTrial,
  CommercialUsageAggregate,
  CommercialUsageRecord,
  CommercialKillSwitch,
  CustomerSuccessAccount,
  DunningCase,
  EntitlementDefinition,
  EntitlementGrant,
  GaCapabilityRelease,
  GaDecision,
  GaLaunchGate,
  GaOnboardingRun,
  GaRollout,
  MeteringReconciliation,
  OveragePolicy,
  PaymentWebhookEvent,
  SeatAssignment,
  UsageAdjustment,
  UsageAllowance,
  UsageMeterDefinition,
};
