const GROUNDED_RESEARCH_CAPABILITY = 'external.grounded_research';

const COMMERCIAL_VERSION_STATUSES = Object.freeze({
  product: ['draft', 'validating', 'active', 'retired', 'archived'],
  plan: ['draft', 'validating', 'active', 'grandfathered', 'retired', 'archived'],
  priceBook: ['draft', 'validating', 'active', 'retired', 'archived'],
  entitlement: ['draft', 'active', 'retired', 'archived'],
  meter: ['draft', 'validating', 'active', 'retired', 'archived'],
});

const SUBSCRIPTION_TRANSITIONS = Object.freeze({
  draft: ['pending_approval', 'scheduled', 'trialing', 'cancelled'],
  pending_approval: ['scheduled', 'trialing', 'active', 'cancelled'],
  scheduled: ['trialing', 'active', 'cancelled'],
  trialing: ['active', 'expired', 'cancelled', 'terminated'],
  active: ['paused', 'past_due', 'suspended', 'cancelling', 'cancelled', 'terminated'],
  paused: ['active', 'cancelled', 'terminated'],
  past_due: ['active', 'suspended', 'cancelled', 'terminated'],
  suspended: ['active', 'cancelled', 'terminated'],
  cancelling: ['active', 'cancelled', 'terminated'],
  cancelled: [],
  terminated: [],
  expired: [],
});

const TRIAL_TRANSITIONS = Object.freeze({
  draft: ['scheduled', 'active', 'cancelled'],
  scheduled: ['active', 'cancelled'],
  active: ['extended', 'converted', 'expired', 'cancelled'],
  extended: ['converted', 'expired', 'cancelled'],
  converted: [],
  expired: [],
  cancelled: [],
});

const QUOTE_TRANSITIONS = Object.freeze({
  draft: ['validating', 'cancelled'],
  validating: ['approval_required', 'approved', 'draft'],
  approval_required: ['approved', 'rejected'],
  approved: ['presented', 'expired', 'cancelled'],
  presented: ['accepted', 'rejected', 'expired', 'cancelled'],
  accepted: ['converted'],
  converted: [],
  rejected: [],
  expired: [],
  cancelled: [],
});

const ORDER_TRANSITIONS = Object.freeze({
  draft: ['pending_approval', 'approved', 'cancelled'],
  pending_approval: ['approved', 'cancelled'],
  approved: ['provisioning', 'cancelled'],
  provisioning: ['provisioned', 'failed'],
  provisioned: ['completed', 'cancelled'],
  completed: [],
  failed: ['provisioning', 'cancelled'],
  cancelled: [],
});

const INVOICE_TRANSITIONS = Object.freeze({
  draft: ['calculating', 'approval_required', 'approved', 'void'],
  calculating: ['draft', 'approval_required'],
  approval_required: ['approved', 'void'],
  approved: ['finalized', 'void'],
  finalized: ['issued', 'void'],
  issued: ['partially_paid', 'paid', 'past_due', 'void'],
  partially_paid: ['paid', 'past_due', 'void'],
  paid: ['refunded', 'partially_refunded'],
  past_due: ['partially_paid', 'paid', 'void'],
  partially_refunded: ['refunded'],
  refunded: [],
  void: [],
});

const ROLLOUT_TRANSITIONS = Object.freeze({
  draft: ['validating', 'cancelled'],
  validating: ['approval_required', 'blocked', 'draft'],
  approval_required: ['approved', 'cancelled'],
  approved: ['scheduled', 'running', 'cancelled'],
  scheduled: ['running', 'cancelled'],
  running: ['paused', 'guardrail_stopped', 'rollback_required', 'completed'],
  paused: ['running', 'rollback_required', 'cancelled'],
  guardrail_stopped: ['paused', 'rollback_required'],
  rollback_required: ['rolled_back'],
  rolled_back: [],
  completed: [],
  blocked: ['draft', 'cancelled'],
  cancelled: [],
});

const NON_BILLABLE_OUTCOMES = Object.freeze(new Set([
  'failed',
  'rejected',
  'provider_unavailable',
  'capability_gate_blocked',
  'policy_denied',
  'quota_denied',
  'cross_tenant_rejected',
  'cancelled',
  'compensated',
  'rolled_back',
  'test',
  'simulation',
]));

const COMMERCIAL_PERMISSION_IDS = Object.freeze([
  'commercialProduct.read', 'commercialProduct.create', 'commercialProduct.update', 'commercialProduct.validate', 'commercialProduct.activate', 'commercialProduct.retire',
  'commercialPlan.read', 'commercialPlan.create', 'commercialPlan.update', 'commercialPlan.validate', 'commercialPlan.activate', 'commercialPlan.retire',
  'commercialPriceBook.read', 'commercialPriceBook.create', 'commercialPriceBook.update', 'commercialPriceBook.validate', 'commercialPriceBook.activate', 'commercialPriceBook.retire',
  'commercialEntitlementDefinition.read', 'commercialEntitlementDefinition.create', 'commercialEntitlementDefinition.activate',
  'commercialEntitlementGrant.read', 'commercialEntitlementGrant.create', 'commercialEntitlementGrant.suspend', 'commercialEntitlementGrant.revoke', 'commercialEntitlement.evaluate',
  'commercialCustomer.read', 'commercialCustomer.create', 'commercialCustomer.update',
  'billingAccount.read', 'billingAccount.create', 'billingAccount.update', 'billingAccount.activate', 'billingAccount.pause', 'billingAccount.resume',
  'commercialSubscription.read', 'commercialSubscription.create', 'commercialSubscription.approve', 'commercialSubscription.activate', 'commercialSubscription.pause', 'commercialSubscription.resume', 'commercialSubscription.changePlan', 'commercialSubscription.cancel', 'commercialSubscription.terminate',
  'commercialTrial.read', 'commercialTrial.create', 'commercialTrial.extend', 'commercialTrial.convert', 'commercialTrial.end',
  'commercialQuote.read', 'commercialQuote.create', 'commercialQuote.update', 'commercialQuote.validate', 'commercialQuote.approve', 'commercialQuote.present', 'commercialQuote.accept', 'commercialQuote.convert',
  'commercialOrder.read', 'commercialOrder.create', 'commercialOrder.approve', 'commercialOrder.provision', 'commercialOrder.cancel',
  'commercialContract.read', 'commercialContract.create', 'commercialContract.accept', 'commercialContract.terminate',
  'commercialAcceptance.read', 'commercialAcceptance.create', 'commercialAcceptance.withdraw',
  'commercialMeter.read', 'commercialMeter.create', 'commercialMeter.validate', 'commercialMeter.activate',
  'commercialUsage.read', 'commercialUsage.readDetails', 'commercialUsage.record', 'commercialUsage.adjust', 'commercialUsage.reconcile',
  'commercialAllowance.read', 'commercialAllowance.create', 'commercialOverage.read', 'commercialOverage.create',
  'commercialSeat.read', 'commercialSeat.create', 'commercialSeat.update',
  'commercialDiscount.read', 'commercialDiscount.create', 'commercialCredit.read', 'commercialCredit.create',
  'commercialInvoice.read', 'commercialInvoice.create', 'commercialInvoice.preview', 'commercialInvoice.recalculate', 'commercialInvoice.approve', 'commercialInvoice.finalize', 'commercialInvoice.issue', 'commercialInvoice.void',
  'commercialPayment.read', 'commercialPayment.create', 'commercialPayment.cancel',
  'commercialRefund.read', 'commercialRefund.create', 'commercialCreditNote.read', 'commercialCreditNote.create',
  'commercialDispute.read', 'commercialDispute.create', 'commercialDispute.update', 'commercialDispute.resolve',
  'commercialDunning.read', 'commercialDunning.create', 'commercialDunning.pause', 'commercialDunning.resume', 'commercialDunning.resolve',
  'commercialTax.read', 'commercialTax.update', 'commercialRenewal.read', 'commercialRenewal.create', 'commercialRenewal.approve',
  'commercialCustomerSuccess.read', 'commercialCustomerSuccess.update', 'commercialExport.create',
  'gaReadiness.read', 'gaReadiness.evaluate', 'gaRollout.read', 'gaRollout.create', 'gaRollout.validate', 'gaRollout.approve', 'gaRollout.start', 'gaRollout.pause', 'gaRollout.resume', 'gaRollout.rollback',
  'gaDecision.read', 'gaDecision.create', 'gaEvidence.read', 'gaEvidence.create', 'gaExport.create',
]);

module.exports = {
  COMMERCIAL_PERMISSION_IDS,
  COMMERCIAL_VERSION_STATUSES,
  GROUNDED_RESEARCH_CAPABILITY,
  INVOICE_TRANSITIONS,
  NON_BILLABLE_OUTCOMES,
  ORDER_TRANSITIONS,
  QUOTE_TRANSITIONS,
  ROLLOUT_TRANSITIONS,
  SUBSCRIPTION_TRANSITIONS,
  TRIAL_TRANSITIONS,
};
