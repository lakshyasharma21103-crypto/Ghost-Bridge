const express = require('express');
const controller = require('../controllers/gaCommercialController');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');

const commercialRouter = express.Router();
const gaRouter = express.Router();
commercialRouter.use(authenticatePartner);
gaRouter.use(authenticatePartner);

function assign(resource, action) {
  return (request, _response, next) => {
    request.params.resource = resource;
    if (action) request.params.action = action;
    next();
  };
}

function protect(router, method, path, permission, resourceType, resource, handler, action) {
  router[method](
    path,
    assign(resource, action),
    requiresPermission(permission, { resourceType }),
    handler,
  );
}

function crud(router, path, resource, type, permissions, options = {}) {
  if (permissions.create) protect(router, 'post', path, permissions.create, type, resource, controller.create);
  if (permissions.read) {
    protect(router, 'get', path, permissions.read, type, resource, controller.list);
    protect(router, 'get', `${path}/:id`, permissions.read, type, resource, controller.get);
  }
  if (permissions.update) protect(router, 'patch', `${path}/:id`, permissions.update, type, resource, controller.update);
  for (const [action, permission] of Object.entries(options.actions || {})) {
    protect(router, 'post', `${path}/:id/${action}`, permission, type, resource, controller.action, action);
  }
}

crud(commercialRouter, '/products', 'products', 'CommercialProduct', {
  create: 'commercialProduct.create', read: 'commercialProduct.read', update: 'commercialProduct.update',
}, { actions: { validate: 'commercialProduct.validate', activate: 'commercialProduct.activate', retire: 'commercialProduct.retire' } });
crud(commercialRouter, '/plans', 'plans', 'CommercialPlan', {
  create: 'commercialPlan.create', read: 'commercialPlan.read', update: 'commercialPlan.update',
}, { actions: { validate: 'commercialPlan.validate', activate: 'commercialPlan.activate', retire: 'commercialPlan.retire' } });
crud(commercialRouter, '/price-books', 'price-books', 'CommercialPriceBook', {
  create: 'commercialPriceBook.create', read: 'commercialPriceBook.read', update: 'commercialPriceBook.update',
}, { actions: { validate: 'commercialPriceBook.validate', activate: 'commercialPriceBook.activate', retire: 'commercialPriceBook.retire' } });
crud(commercialRouter, '/entitlement-definitions', 'entitlement-definitions', 'EntitlementDefinition', {
  create: 'commercialEntitlementDefinition.create', read: 'commercialEntitlementDefinition.read',
}, { actions: { activate: 'commercialEntitlementDefinition.activate' } });
crud(commercialRouter, '/entitlement-grants', 'entitlement-grants', 'EntitlementGrant', {
  create: 'commercialEntitlementGrant.create', read: 'commercialEntitlementGrant.read',
}, { actions: { suspend: 'commercialEntitlementGrant.suspend', revoke: 'commercialEntitlementGrant.revoke' } });
protect(commercialRouter, 'post', '/entitlements/evaluate', 'commercialEntitlement.evaluate', 'EntitlementDecision', 'entitlement-grants', controller.evaluateEntitlements);
protect(commercialRouter, 'get', '/entitlements/effective', 'commercialEntitlement.evaluate', 'EntitlementGrant', 'entitlement-grants', controller.list);

crud(commercialRouter, '/customers', 'customers', 'CommercialCustomerProfile', {
  create: 'commercialCustomer.create', read: 'commercialCustomer.read', update: 'commercialCustomer.update',
});
crud(commercialRouter, '/billing-accounts', 'billing-accounts', 'BillingAccount', {
  create: 'billingAccount.create', read: 'billingAccount.read', update: 'billingAccount.update',
}, { actions: { activate: 'billingAccount.activate', pause: 'billingAccount.pause', resume: 'billingAccount.resume' } });
crud(commercialRouter, '/subscriptions', 'subscriptions', 'CommercialSubscription', {
  create: 'commercialSubscription.create', read: 'commercialSubscription.read',
}, { actions: {
  approve: 'commercialSubscription.approve', activate: 'commercialSubscription.activate',
  pause: 'commercialSubscription.pause', resume: 'commercialSubscription.resume',
  cancel: 'commercialSubscription.cancel', terminate: 'commercialSubscription.terminate',
  'change-plan': 'commercialSubscription.changePlan',
} });
crud(commercialRouter, '/trials', 'trials', 'CommercialTrial', {
  create: 'commercialTrial.create', read: 'commercialTrial.read',
}, { actions: { extend: 'commercialTrial.extend', convert: 'commercialTrial.convert', end: 'commercialTrial.end' } });
crud(commercialRouter, '/quotes', 'quotes', 'CommercialQuote', {
  create: 'commercialQuote.create', read: 'commercialQuote.read', update: 'commercialQuote.update',
}, { actions: {
  validate: 'commercialQuote.validate', approve: 'commercialQuote.approve',
  present: 'commercialQuote.present', accept: 'commercialQuote.accept', convert: 'commercialQuote.convert',
} });
crud(commercialRouter, '/orders', 'orders', 'CommercialOrder', {
  create: 'commercialOrder.create', read: 'commercialOrder.read',
}, { actions: { approve: 'commercialOrder.approve', provision: 'commercialOrder.provision', cancel: 'commercialOrder.cancel' } });
crud(commercialRouter, '/contracts', 'contracts', 'CommercialContractReference', {
  create: 'commercialContract.create', read: 'commercialContract.read',
}, { actions: { accept: 'commercialContract.accept', terminate: 'commercialContract.terminate' } });
protect(commercialRouter, 'get', '/acceptances/required', 'commercialAcceptance.read', 'CommercialAcceptance', 'acceptances', controller.list);
crud(commercialRouter, '/acceptances', 'acceptances', 'CommercialAcceptance', {
  create: 'commercialAcceptance.create', read: 'commercialAcceptance.read',
}, { actions: { withdraw: 'commercialAcceptance.withdraw' } });

crud(commercialRouter, '/usage-meter-definitions', 'usage-meter-definitions', 'UsageMeterDefinition', {
  create: 'commercialMeter.create', read: 'commercialMeter.read',
}, { actions: { validate: 'commercialMeter.validate', activate: 'commercialMeter.activate' } });
protect(commercialRouter, 'post', '/usage/record', 'commercialUsage.record', 'CommercialUsageRecord', 'usage', controller.recordUsage);
protect(commercialRouter, 'get', '/usage/aggregates', 'commercialUsage.read', 'CommercialUsageAggregate', 'usage', controller.usageAggregates);
protect(commercialRouter, 'get', '/usage/reconciliation', 'commercialUsage.reconcile', 'MeteringReconciliation', 'reconciliations', controller.reconcileUsage);
protect(commercialRouter, 'get', '/usage', 'commercialUsage.read', 'CommercialUsageRecord', 'usage', controller.list);
crud(commercialRouter, '/usage/adjustments', 'usage-adjustments', 'UsageAdjustment', {
  create: 'commercialUsage.adjust', read: 'commercialUsage.readDetails',
});
protect(commercialRouter, 'get', '/allowances/utilization', 'commercialAllowance.read', 'UsageAllowance', 'allowances', controller.list);
crud(commercialRouter, '/allowances', 'allowances', 'UsageAllowance', {
  create: 'commercialAllowance.create', read: 'commercialAllowance.read',
});
crud(commercialRouter, '/overage-policies', 'overage-policies', 'OveragePolicy', {
  create: 'commercialOverage.create', read: 'commercialOverage.read',
});
crud(commercialRouter, '/seats', 'seats', 'SeatAssignment', {
  create: 'commercialSeat.create', read: 'commercialSeat.read',
}, { actions: { release: 'commercialSeat.update', suspend: 'commercialSeat.update', resume: 'commercialSeat.update' } });
crud(commercialRouter, '/discounts', 'discounts', 'CommercialDiscount', {
  create: 'commercialDiscount.create', read: 'commercialDiscount.read',
});
crud(commercialRouter, '/credits', 'credits', 'CommercialCredit', {
  create: 'commercialCredit.create', read: 'commercialCredit.read',
});

protect(commercialRouter, 'post', '/invoices/preview', 'commercialInvoice.preview', 'CommercialInvoice', 'invoices', controller.invoicePreview);
crud(commercialRouter, '/invoices', 'invoices', 'CommercialInvoice', {
  create: 'commercialInvoice.create', read: 'commercialInvoice.read',
}, { actions: {
  recalculate: 'commercialInvoice.recalculate', approve: 'commercialInvoice.approve',
  finalize: 'commercialInvoice.finalize', issue: 'commercialInvoice.issue', void: 'commercialInvoice.void',
} });
crud(commercialRouter, '/payments', 'payments', 'CommercialPayment', {
  create: 'commercialPayment.create', read: 'commercialPayment.read',
}, { actions: { cancel: 'commercialPayment.cancel' } });
protect(commercialRouter, 'post', '/payment-webhooks/:provider', 'commercialPayment.create', 'PaymentWebhookEvent', 'payments', controller.paymentWebhook);
crud(commercialRouter, '/refunds', 'refunds', 'CommercialRefund', {
  create: 'commercialRefund.create', read: 'commercialRefund.read',
});
crud(commercialRouter, '/credit-notes', 'credit-notes', 'CommercialCreditNote', {
  create: 'commercialCreditNote.create', read: 'commercialCreditNote.read',
});
crud(commercialRouter, '/disputes', 'disputes', 'BillingDispute', {
  create: 'commercialDispute.create', read: 'commercialDispute.read', update: 'commercialDispute.update',
}, { actions: { resolve: 'commercialDispute.resolve' } });
crud(commercialRouter, '/dunning', 'dunning', 'DunningCase', {
  create: 'commercialDunning.create', read: 'commercialDunning.read',
}, { actions: { pause: 'commercialDunning.pause', resume: 'commercialDunning.resume', resolve: 'commercialDunning.resolve' } });
protect(commercialRouter, 'post', '/tax/estimate', 'commercialTax.read', 'CommercialTaxStatus', 'tax-status', controller.taxEstimate);
protect(commercialRouter, 'get', '/tax/status', 'commercialTax.read', 'CommercialTaxStatus', 'tax-status', controller.list);
protect(commercialRouter, 'post', '/tax/status', 'commercialTax.update', 'CommercialTaxStatus', 'tax-status', controller.create);
crud(commercialRouter, '/renewals', 'renewals', 'CommercialRenewal', {
  create: 'commercialRenewal.create', read: 'commercialRenewal.read',
}, { actions: { approve: 'commercialRenewal.approve', 'non-renew': 'commercialRenewal.approve' } });
crud(commercialRouter, '/customer-success', 'customer-success', 'CustomerSuccessAccount', {
  create: 'commercialCustomerSuccess.update', read: 'commercialCustomerSuccess.read', update: 'commercialCustomerSuccess.update',
});
crud(commercialRouter, '/support-tiers', 'support-tiers', 'CommercialSupportTier', {
  create: 'commercialCustomerSuccess.update', read: 'commercialCustomerSuccess.read',
});
crud(commercialRouter, '/billing-periods', 'billing-periods', 'BillingPeriod', {
  create: 'commercialInvoice.create', read: 'commercialInvoice.read',
});
crud(commercialRouter, '/kill-switches', 'kill-switches', 'CommercialKillSwitch', {
  create: 'gaRollout.create', read: 'gaRollout.read',
}, { actions: { activate: 'gaRollout.pause', deactivate: 'gaRollout.resume' } });

protect(gaRouter, 'post', '/readiness/evaluate', 'gaReadiness.evaluate', 'CommercialReadinessSnapshot', 'health-snapshots', controller.evaluateReadiness);
protect(gaRouter, 'get', '/readiness', 'gaReadiness.read', 'CommercialReadinessSnapshot', 'health-snapshots', controller.list);
crud(gaRouter, '/rollouts', 'rollouts', 'GaRollout', {
  create: 'gaRollout.create', read: 'gaRollout.read',
}, { actions: {
  validate: 'gaRollout.validate', approve: 'gaRollout.approve', start: 'gaRollout.start',
  pause: 'gaRollout.pause', resume: 'gaRollout.resume', rollback: 'gaRollout.rollback',
  complete: 'gaRollout.start',
} });
crud(gaRouter, '/decisions', 'decisions', 'GaDecision', {
  create: 'gaDecision.create', read: 'gaDecision.read',
});
protect(gaRouter, 'post', '/evidence', 'gaEvidence.create', 'CommercialEvidencePackage', 'evidence', controller.evidence);
protect(gaRouter, 'get', '/evidence/:id', 'gaEvidence.read', 'CommercialEvidencePackage', 'evidence', controller.get);
protect(gaRouter, 'get', '/export', 'gaExport.create', 'CommercialExport', 'exports', controller.exportCommercial);

module.exports = { commercialRouter, gaRouter };
