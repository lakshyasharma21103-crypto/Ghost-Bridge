const crypto = require('node:crypto');
const models = require('../models/gaCommercialModels');
const { CapabilityLaunchGate } = require('../models/stagingPilotModels');
const core = require('./gaCommercialCore.service');
const metrics = require('./gaCommercialMetrics.service');
const { createAuditLog } = require('./auditService');
const { consumeApprovalGrants, enforceApproval } = require('./approval.service');
const { AppError } = require('../utils/AppError');
const { GROUNDED_RESEARCH_CAPABILITY } = require('../constants/gaCommercial');

const RESOURCE_CONFIG = Object.freeze({
  products: { model: 'CommercialProduct', id: ['productKey', '_id'], createStatus: 'draft', versioned: true },
  plans: { model: 'CommercialPlan', id: ['planKey', '_id'], createStatus: 'draft', versioned: true },
  'price-books': { model: 'CommercialPriceBook', id: ['priceBookKey', '_id'], createStatus: 'draft', versioned: true },
  'entitlement-definitions': { model: 'EntitlementDefinition', id: ['entitlementKey', '_id'], createStatus: 'draft', versioned: true },
  'entitlement-grants': { model: 'EntitlementGrant', id: ['_id'], createStatus: 'pending', tenant: true },
  customers: { model: 'CommercialCustomerProfile', id: ['organizationId', '_id'], createStatus: 'prospect', tenant: true },
  'billing-accounts': { model: 'BillingAccount', id: ['accountKey', '_id'], createStatus: 'draft', tenant: true },
  subscriptions: { model: 'CommercialSubscription', id: ['subscriptionKey', '_id'], createStatus: 'draft', tenant: true },
  trials: { model: 'CommercialTrial', id: ['trialKey', '_id'], createStatus: 'draft', tenant: true },
  quotes: { model: 'CommercialQuote', id: ['quoteNumber', '_id'], createStatus: 'draft', tenant: true, versioned: true },
  orders: { model: 'CommercialOrder', id: ['orderNumber', '_id'], createStatus: 'draft', tenant: true },
  contracts: { model: 'CommercialContractReference', id: ['contractKey', '_id'], createStatus: 'draft', tenant: true },
  acceptances: { model: 'CommercialAcceptance', id: ['acceptanceKey', '_id'], createStatus: 'required', tenant: true },
  'usage-meter-definitions': { model: 'UsageMeterDefinition', id: ['meterKey', '_id'], createStatus: 'draft', versioned: true },
  usage: { model: 'CommercialUsageRecord', id: ['usageRecordId', '_id'], tenant: true },
  'usage-adjustments': { model: 'UsageAdjustment', id: ['adjustmentId', '_id'], tenant: true },
  allowances: { model: 'UsageAllowance', id: ['allowanceKey', '_id'], createStatus: 'pending', tenant: true },
  'overage-policies': { model: 'OveragePolicy', id: ['overagePolicyKey', '_id'], createStatus: 'draft', tenant: true, versioned: true },
  seats: { model: 'SeatAssignment', id: ['seatKey', '_id'], createStatus: 'pending', tenant: true },
  discounts: { model: 'CommercialDiscount', id: ['discountKey', '_id'], createStatus: 'draft', tenant: true, versioned: true },
  credits: { model: 'CommercialCredit', id: ['creditKey', '_id'], createStatus: 'pending', tenant: true },
  invoices: { model: 'CommercialInvoice', id: ['invoiceNumber', '_id'], createStatus: 'draft', tenant: true, versioned: true },
  payments: { model: 'CommercialPayment', id: ['paymentKey', '_id'], createStatus: 'pending', tenant: true },
  refunds: { model: 'CommercialRefund', id: ['refundKey', '_id'], createStatus: 'pending', tenant: true },
  'credit-notes': { model: 'CommercialCreditNote', id: ['creditNoteNumber', '_id'], createStatus: 'draft', tenant: true },
  disputes: { model: 'BillingDispute', id: ['disputeKey', '_id'], createStatus: 'open', tenant: true },
  dunning: { model: 'DunningCase', id: ['caseKey', '_id'], createStatus: 'open', tenant: true },
  'tax-status': { model: 'CommercialTaxStatus', id: ['taxStatusKey', '_id'], createStatus: 'not_evaluated', tenant: true },
  renewals: { model: 'CommercialRenewal', id: ['renewalKey', '_id'], createStatus: 'not_evaluated', tenant: true },
  'customer-success': { model: 'CustomerSuccessAccount', id: ['accountKey', '_id'], createStatus: 'onboarding', tenant: true },
  'support-tiers': { model: 'CommercialSupportTier', id: ['supportTierKey', '_id'], createStatus: 'draft', versioned: true },
  'billing-periods': { model: 'BillingPeriod', id: ['periodKey', '_id'], createStatus: 'open', tenant: true },
  reconciliations: { model: 'MeteringReconciliation', id: ['reconciliationKey', '_id'], createStatus: 'pending', tenant: true },
  'health-snapshots': { model: 'CommercialHealthSnapshot', id: ['snapshotKey', '_id'], tenant: true },
  'ga-onboarding': { model: 'GaOnboardingRun', id: ['onboardingKey', '_id'], createStatus: 'not_started', tenant: true },
  'capability-releases': { model: 'GaCapabilityRelease', id: ['capabilityKey', '_id'], createStatus: 'draft', versioned: true },
  'launch-gates': { model: 'GaLaunchGate', id: ['gateKey', '_id'], createStatus: 'not_evaluated', versioned: true },
  rollouts: { model: 'GaRollout', id: ['rolloutKey', '_id'], createStatus: 'draft', tenant: true },
  decisions: { model: 'GaDecision', id: ['decisionKey', '_id'], tenant: true },
  evidence: { model: 'CommercialEvidencePackage', id: ['evidenceKey', '_id'], tenant: true },
  exports: { model: 'CommercialExport', id: ['exportKey', '_id'], createStatus: 'requested', tenant: true },
  'kill-switches': { model: 'CommercialKillSwitch', id: ['switchKey', '_id'], createStatus: 'inactive', tenant: true },
});

function dependencies(overrides = {}) {
  return { ...models, CapabilityLaunchGate, consumeApprovalGrants, createAuditLog, enforceApproval, metrics, ...overrides };
}

function id(value) { return String(value?._id || value?.id || value || '').trim(); }

function callerScope(input = {}, caller = {}) {
  const actorOrganizationId = id(caller.partner?._id || caller.authorization?.organizationId);
  const requestedOrganizationId = id(input.organizationId);
  if (!actorOrganizationId) throw new AppError(400, 'COMMERCIAL_SCOPE_REQUIRED', 'Organization scope is required.');
  if (requestedOrganizationId && requestedOrganizationId !== actorOrganizationId && caller.platformAuthorized !== true) {
    throw new AppError(403, 'AUTHORIZATION_DENIED', 'Commercial data is not available.');
  }
  return {
    organizationId: requestedOrganizationId || actorOrganizationId,
    workspaceId: id(input.workspaceId || input.receivingWorkspaceId) || undefined,
    billingAccountId: id(input.billingAccountId) || undefined,
    subscriptionId: id(input.subscriptionId) || undefined,
    actorId: id(caller.partner?._id || caller.authorization?.actorId || 'system'),
    actorType: caller.partner ? 'partner' : 'system',
    requestId: caller.requestId,
    traceId: caller.traceId,
  };
}

function tenantFilter(scope, input = {}) {
  return {
    organizationId: scope.organizationId,
    ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
    ...(scope.billingAccountId ? { billingAccountId: scope.billingAccountId } : {}),
    ...(scope.subscriptionId ? { subscriptionId: scope.subscriptionId } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
}

function configFor(resource) {
  const config = RESOURCE_CONFIG[resource];
  if (!config) throw new AppError(404, 'COMMERCIAL_RESOURCE_NOT_FOUND', 'Commercial resource was not found.');
  return config;
}

function modelFor(config, d) { return d[config.model]; }

function plain(value) {
  if (!value) return value;
  const output = typeof value.toObject === 'function' ? value.toObject({ depopulate: true }) : { ...value };
  output.id = id(value);
  delete output._id;
  delete output.__v;
  delete output.idempotencyKeyHash;
  delete output.requestFingerprint;
  return core.redactCommercialContent(output);
}

function identifierQuery(config, identifier) {
  const clauses = config.id.map((field) => {
    if (field === '_id' && !/^[a-fA-F0-9]{24}$/.test(String(identifier))) return null;
    return { [field]: identifier };
  }).filter(Boolean);
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

function safeInput(Model, input, scope, config) {
  core.assertSafePayload(input);
  const paths = new Set(Object.keys(Model.schema.paths));
  const denied = new Set(['_id', '__v', 'createdAt', 'updatedAt', 'idempotencyKeyHash', 'requestFingerprint']);
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (paths.has(key) && !denied.has(key)) result[key] = value;
  }
  if (config.tenant) {
    result.organizationId = scope.organizationId;
    if (paths.has('workspaceId') && scope.workspaceId) result.workspaceId = scope.workspaceId;
    if (paths.has('billingAccountId') && scope.billingAccountId) result.billingAccountId = scope.billingAccountId;
    if (paths.has('subscriptionId') && scope.subscriptionId) result.subscriptionId = scope.subscriptionId;
  }
  if (paths.has('requestId')) result.requestId = scope.requestId;
  if (paths.has('traceId')) result.traceId = scope.traceId;
  if (config.createStatus && paths.has('status')) result.status = config.createStatus;
  return result;
}

function mutationHashes(Model, input, scope, purpose) {
  if (!input.idempotencyKey) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required.');
  const hash = (value) => `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
  const result = {};
  if (Model.schema.path('idempotencyKeyHash')) result.idempotencyKeyHash = hash(`${purpose}:${scope.organizationId}:${input.idempotencyKey}`);
  if (Model.schema.path('requestFingerprint')) result.requestFingerprint = hash(JSON.stringify(core.redactCommercialContent(input)));
  return result;
}

async function audit(action, config, record, scope, metadata, d) {
  await d.createAuditLog(scope.actorType, scope.actorId, action, config.model, id(record), {
    organizationId: scope.organizationId,
    workspaceId: record?.workspaceId || scope.workspaceId,
    billingAccountCategory: record?.billingAccountId ? 'scoped' : 'none',
    ...core.redactCommercialContent(metadata || {}),
  }, { requestId: scope.requestId, traceId: scope.traceId });
}

async function governedApproval(input, scope, permission, resourceType, resourceId, d) {
  if (!input.approvalRequestId) throw new AppError(409, 'COMMERCIAL_APPROVAL_REQUIRED', 'A governed approval reference is required.');
  const enforcement = await d.enforceApproval({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    requesterActorId: scope.actorId,
    requesterActorType: scope.actorType,
    permission,
    resourceType,
    resourceId: id(resourceId),
    operationType: permission.replaceAll('.', '_').toUpperCase(),
    environment: process.env.NODE_ENV,
    safeRequestAttributes: {
      requestedAction: permission,
      billingAccountCategory: scope.billingAccountId ? 'scoped' : 'none',
      subscriptionCategory: scope.subscriptionId ? 'scoped' : 'none',
    },
    approvalRequestId: input.approvalRequestId,
    approvalRequestIds: input.approvalRequestIds,
  });
  await d.consumeApprovalGrants(enforcement, {
    actorId: scope.actorId,
    actorType: scope.actorType,
    requestId: scope.requestId,
    traceId: scope.traceId,
  });
}

async function createResource(resource, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const config = configFor(resource); const Model = modelFor(config, d);
  const scope = callerScope(input, caller);
  const payload = { ...safeInput(Model, input, scope, config), ...mutationHashes(Model, input, scope, `${resource}-create`) };
  if (Model.schema.path('createdBy')) payload.createdBy = scope.actorId;
  if (resource === 'products') {
    const validation = core.validateProduct(payload);
    if (!validation.valid) throw new AppError(409, validation.safeReasonCodes[0], 'Commercial product is not eligible.');
  }
  if (resource === 'plans') {
    const validation = core.validatePlan(payload);
    if (!validation.valid) throw new AppError(400, validation.safeReasonCodes[0], 'Commercial plan validation failed.');
  }
  if (resource === 'price-books') core.validatePriceBook(payload);
  if (resource === 'refunds') {
    core.boundedRefund({
      paidMinor: input.paidMinor,
      previouslyRefundedMinor: input.previouslyRefundedMinor || 0,
      requestedMinor: payload.amountMinor,
    });
  }
  if (resource === 'discounts' && payload.discountType === 'percentage_bps') {
    core.applyDiscount(10_000, { type: 'percentage_bps', basisPoints: payload.basisPoints });
  }
  if (resource === 'usage-adjustments') {
    const original = await d.CommercialUsageRecord.findOne({
      usageRecordId: payload.originalUsageRecordId,
      organizationId: scope.organizationId,
      ...(scope.billingAccountId ? { billingAccountId: scope.billingAccountId } : {}),
    });
    if (!original) throw new AppError(404, 'USAGE_RECORD_NOT_FOUND', 'The authoritative usage record was not found.');
  }
  if (resource === 'invoices' && payload.lineItems?.some((item) =>
    item.capabilityKey === GROUNDED_RESEARCH_CAPABILITY || item.productKey === GROUNDED_RESEARCH_CAPABILITY)) {
    throw new AppError(409, 'GROUNDED_RESEARCH_INVOICE_FORBIDDEN', 'Grounded research cannot appear on an invoice.');
  }
  if (resource === 'rollouts') {
    payload.simulationOnly = true;
    payload.productionMutationPerformed = false;
  }
  if (resource === 'decisions') payload.decisionDigest = core.hash(payload);
  if (resource === 'entitlement-grants' && payload.capabilityKey === GROUNDED_RESEARCH_CAPABILITY) {
    payload.status = 'pending';
  }
  const approvalCreates = {
    refunds: 'commercialRefund.create',
    'credit-notes': 'commercialCreditNote.create',
    credits: 'commercialCredit.create',
    payments: 'commercialPayment.create',
    decisions: 'gaDecision.create',
  };
  if (resource === 'entitlement-grants' && payload.source === 'manual_approved') {
    await governedApproval(input, scope, 'commercialEntitlementGrant.create', config.model, payload.entitlementKey, d);
  } else if (approvalCreates[resource]) {
    await governedApproval(input, scope, approvalCreates[resource], config.model, payload[config.id[0]] || payload.invoiceId || resource, d);
  }
  if (resource === 'usage-adjustments' && Math.abs(payload.quantityDelta || 0) > 1_000) {
    await governedApproval(input, scope, 'commercialUsage.adjust', config.model, payload.originalUsageRecordId, d);
  }
  const record = await Model.create(payload);
  await audit(`commercial.${resource.replaceAll('-', '_')}.created`, config, record, scope, { status: record.status }, d);
  return plain(record);
}

async function listResources(resource, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const config = configFor(resource); const Model = modelFor(config, d);
  const scope = callerScope(input, caller);
  const limit = Math.min(100, Math.max(1, Number(input.limit || 50)));
  const query = config.tenant ? tenantFilter(scope, input) : { ...(input.status ? { status: input.status } : {}) };
  if (input.capabilityKey && Model.schema.path('capabilityKey')) query.capabilityKey = input.capabilityKey;
  const records = await Model.find(query).sort({ createdAt: -1, _id: -1 }).limit(limit).lean();
  return { items: records.map(plain), limit, nextCursor: records.length === limit ? id(records.at(-1)) : null };
}

async function findRecord(resource, identifier, input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const config = configFor(resource); const Model = modelFor(config, d);
  const scope = callerScope(input, caller);
  const query = { ...identifierQuery(config, identifier), ...(config.tenant ? tenantFilter(scope) : {}) };
  const record = await Model.findOne(query);
  if (!record) throw new AppError(404, 'COMMERCIAL_RECORD_NOT_FOUND', 'Commercial record was not found.');
  return { d, config, Model, scope, record };
}

async function getResource(resource, identifier, input = {}, caller = {}, options = {}) {
  return plain((await findRecord(resource, identifier, input, caller, options)).record);
}

async function updateResource(resource, identifier, input = {}, caller = {}, options = {}) {
  const found = await findRecord(resource, identifier, input, caller, options);
  mutationHashes(found.Model, input, found.scope, `${resource}-update`);
  if (['active', 'finalized', 'issued'].includes(found.record.status)) {
    throw new AppError(409, 'COMMERCIAL_VERSION_IMMUTABLE', 'Activated or finalized commercial records are immutable.');
  }
  const changes = safeInput(found.Model, input, found.scope, { ...found.config, createStatus: undefined });
  delete changes.status;
  for (const [key, value] of Object.entries(changes)) found.record.set(key, value);
  if (found.Model.schema.path('updatedBy')) found.record.updatedBy = found.scope.actorId;
  await found.record.save();
  await audit(`commercial.${resource.replaceAll('-', '_')}.updated`, found.config, found.record, found.scope, {}, found.d);
  return plain(found.record);
}

const SIMPLE_ACTION_STATUS = Object.freeze({
  products: { validate: 'validating', activate: 'active', retire: 'retired' },
  plans: { validate: 'validating', activate: 'active', retire: 'retired' },
  'price-books': { validate: 'validating', activate: 'active', retire: 'retired' },
  'entitlement-definitions': { activate: 'active' },
  'entitlement-grants': { suspend: 'suspended', revoke: 'revoked' },
  'billing-accounts': { activate: 'active', pause: 'billing_paused', resume: 'active' },
  subscriptions: { approve: 'pending_approval', activate: 'active', pause: 'paused', resume: 'active', cancel: 'cancelled', terminate: 'terminated', 'change-plan': 'active' },
  trials: { extend: 'extended', convert: 'converted', end: 'expired' },
  quotes: { validate: 'validating', approve: 'approved', present: 'presented', accept: 'accepted', convert: 'converted' },
  orders: { approve: 'approved', provision: 'provisioned', cancel: 'cancelled' },
  contracts: { accept: 'active', terminate: 'terminated' },
  acceptances: { withdraw: 'withdrawn' },
  'usage-meter-definitions': { validate: 'validating', activate: 'active' },
  seats: { release: 'released', suspend: 'suspended', resume: 'active' },
  invoices: { recalculate: 'calculating', approve: 'approved', finalize: 'finalized', issue: 'issued', void: 'void' },
  payments: { cancel: 'cancelled' },
  disputes: { resolve: 'resolved_company' },
  dunning: { pause: 'paused', resume: 'open', resolve: 'resolved' },
  renewals: { approve: 'approved', 'non-renew': 'non_renewing' },
  rollouts: { validate: 'validating', approve: 'approved', start: 'running', pause: 'paused', resume: 'running', rollback: 'rolled_back', complete: 'completed' },
  'kill-switches': { activate: 'active', deactivate: 'inactive' },
});

function validateAction(resource, action, record, input) {
  if (resource === 'products' && ['validate', 'activate'].includes(action)) {
    const result = core.validateProduct({ ...plain(record), status: action === 'activate' ? 'active' : record.status });
    if (!result.valid) throw new AppError(409, result.safeReasonCodes[0], 'Commercial product activation is blocked.');
  }
  if (resource === 'plans' && ['validate', 'activate'].includes(action)) {
    const result = core.validatePlan({ ...plain(record), status: action === 'activate' ? 'active' : record.status });
    if (!result.valid) throw new AppError(409, result.safeReasonCodes[0], 'Commercial plan activation is blocked.');
  }
  if (resource === 'price-books' && ['validate', 'activate'].includes(action)) core.validatePriceBook(plain(record));
  if (resource === 'entitlement-grants' && action !== 'revoke' && record.capabilityKey === GROUNDED_RESEARCH_CAPABILITY) {
    throw new AppError(409, 'GROUNDED_RESEARCH_COMMERCIALLY_BLOCKED', 'Grounded research grants cannot activate.');
  }
  if (resource === 'invoices' && action === 'finalize') {
    if (input.reconciliationStatus !== 'reconciled') throw new AppError(409, 'INVOICE_RECONCILIATION_BLOCKED', 'A reconciled billing period is required.');
    if (record.lineItems.some((item) => item.capabilityKey === GROUNDED_RESEARCH_CAPABILITY || item.productKey === GROUNDED_RESEARCH_CAPABILITY)) {
      throw new AppError(409, 'GROUNDED_RESEARCH_INVOICE_FORBIDDEN', 'Grounded research cannot appear on an invoice.');
    }
  }
  if (resource === 'rollouts' && ['validate', 'approve', 'start', 'resume'].includes(action) &&
      record.capabilityKeys?.includes(GROUNDED_RESEARCH_CAPABILITY)) {
    throw new AppError(409, 'GROUNDED_RESEARCH_COMMERCIALLY_BLOCKED', 'Grounded research cannot enter a GA rollout.');
  }
}

async function actionResource(resource, identifier, action, input = {}, caller = {}, options = {}) {
  const found = await findRecord(resource, identifier, input, caller, options);
  mutationHashes(found.Model, input, found.scope, `${resource}-${action}`);
  validateAction(resource, action, found.record, input);
  const nextStatus = SIMPLE_ACTION_STATUS[resource]?.[action];
  if (!nextStatus) throw new AppError(400, 'COMMERCIAL_ACTION_INVALID', 'Commercial action is invalid.');
  if (resource === 'orders' && action === 'provision' && ['provisioned', 'completed'].includes(found.record.status)) return plain(found.record);
  const approvalActions = {
    'products:activate': 'commercialProduct.activate',
    'plans:activate': 'commercialPlan.activate',
    'price-books:activate': 'commercialPriceBook.activate',
    'entitlement-definitions:activate': 'commercialEntitlementDefinition.activate',
    'billing-accounts:activate': 'billingAccount.activate',
    'subscriptions:activate': 'commercialSubscription.activate',
    'subscriptions:change-plan': 'commercialSubscription.changePlan',
    'subscriptions:terminate': 'commercialSubscription.terminate',
    'trials:extend': 'commercialTrial.extend',
    'quotes:approve': 'commercialQuote.approve',
    'quotes:accept': 'commercialQuote.accept',
    'orders:provision': 'commercialOrder.provision',
    'contracts:accept': 'commercialContract.accept',
    'usage-meter-definitions:activate': 'commercialMeter.activate',
    'invoices:approve': 'commercialInvoice.approve',
    'invoices:finalize': 'commercialInvoice.finalize',
    'disputes:resolve': 'commercialDispute.resolve',
    'dunning:pause': 'commercialDunning.pause',
    'renewals:approve': 'commercialRenewal.approve',
    'rollouts:approve': 'gaRollout.approve',
    'rollouts:resume': 'gaRollout.resume',
  };
  const approvalPermission = approvalActions[`${resource}:${action}`];
  if (approvalPermission) {
    await governedApproval(input, found.scope, approvalPermission, found.config.model, found.record, found.d);
  }
  if (resource === 'subscriptions') {
    if (action === 'change-plan') {
      if (found.record.status !== 'active') throw new AppError(409, 'SUBSCRIPTION_INACTIVE', 'Only active subscriptions can change plan.');
      if (!input.planKey || !input.planVersion || !input.priceBookKey || !input.priceBookVersion) {
        throw new AppError(400, 'PLAN_CHANGE_VERSION_REQUIRED', 'Plan and price-book versions are required.');
      }
      const proration = core.prorate({
        oldAmountMinor: input.oldAmountMinor,
        newAmountMinor: input.newAmountMinor,
        elapsedUnits: input.elapsedUnits,
        totalUnits: input.totalUnits,
      });
      found.record.planKey = input.planKey;
      found.record.planVersion = input.planVersion;
      found.record.priceBookKey = input.priceBookKey;
      found.record.priceBookVersion = input.priceBookVersion;
      found.record.approvalReference = input.approvalReference;
      found.record.$locals.planChange = proration;
    } else {
      let intermediate = found.record.status;
      if (action === 'activate' && intermediate === 'draft') intermediate = core.transitionSubscription(intermediate, 'pending_approval');
      found.record.status = core.transitionSubscription(intermediate, nextStatus);
    }
  } else if (resource === 'trials') {
    found.record.status = core.transitionTrial(found.record.status, nextStatus);
    if (action === 'extend') {
      const extensionDays = Math.min(30, Math.max(1, Number(input.extensionDays || 1)));
      found.record.trialEnd = new Date(new Date(found.record.trialEnd).getTime() + extensionDays * 86_400_000);
      found.record.extensionCount += 1;
    }
  } else if (resource === 'quotes') found.record.status = core.transitionQuote(found.record.status, nextStatus);
  else if (resource === 'orders') {
    if (action === 'provision') {
      found.record.status = core.transitionOrder(found.record.status, 'provisioning');
      found.record.status = core.transitionOrder(found.record.status, 'provisioned');
      found.record.provisioningAttempts += 1;
      found.record.provisioningDigest = core.hash({
        orderNumber: found.record.orderNumber,
        organizationId: found.scope.organizationId,
        items: found.record.items,
      });
    } else found.record.status = core.transitionOrder(found.record.status, nextStatus);
  } else if (resource === 'invoices') found.record.status = core.transitionInvoice(found.record.status, nextStatus);
  else if (resource === 'rollouts') {
    if (action === 'rollback') {
      if (found.record.status !== 'rollback_required') found.record.status = core.transitionRollout(found.record.status, 'rollback_required');
      found.record.status = core.transitionRollout(found.record.status, 'rolled_back');
      found.record.productionMutationPerformed = false;
    } else found.record.status = core.transitionRollout(found.record.status, nextStatus);
  } else if (resource === 'kill-switches') found.record.state = nextStatus;
  else found.record.status = nextStatus;
  if (action === 'activate' && found.Model.schema.path('activatedBy')) found.record.activatedBy = found.scope.actorId;
  if (action === 'finalize') {
    found.record.finalizedAt = new Date();
    found.record.finalizedBy = found.scope.actorId;
    found.record.invoiceDigest = core.hash(plain(found.record));
  }
  await found.record.save();
  found.d.metrics.increment(resource === 'rollouts' ? 'ga_rollout' : `commercial_${resource.replaceAll('-', '_')}`, { status: found.record.status || found.record.state });
  await audit(`commercial.${resource.replaceAll('-', '_')}.${action}`, found.config, found.record, found.scope, { status: found.record.status || found.record.state }, found.d);
  const output = plain(found.record);
  if (found.record.$locals.planChange) output.proration = found.record.$locals.planChange;
  return output;
}

async function evaluateEntitlements(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const scope = callerScope(input, caller);
  const now = new Date(input.now || Date.now());
  const subscriptionIdentifier = scope.subscriptionId
    ? (/^[a-fA-F0-9]{24}$/.test(scope.subscriptionId) ? { _id: scope.subscriptionId } : { subscriptionKey: scope.subscriptionId })
    : {};
  const subscription = await d.CommercialSubscription.findOne({
    organizationId: scope.organizationId,
    ...(scope.billingAccountId ? { billingAccountId: scope.billingAccountId } : {}),
    ...subscriptionIdentifier,
    status: { $in: ['active', 'trialing'] },
  }).lean();
  const grant = await d.EntitlementGrant.findOne({
    organizationId: scope.organizationId,
    entitlementKey: input.entitlementKey,
    status: 'active',
    $and: [
      ...(scope.workspaceId ? [{ $or: [{ workspaceId: scope.workspaceId }, { workspaceId: { $exists: false } }, { workspaceId: null }] }] : []),
      ...(subscription ? [{ $or: [{ subscriptionId: id(subscription) }, { subscriptionId: { $exists: false } }, { subscriptionId: null }] }] : []),
      { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gt: now } }] },
    ],
  }).lean();
  const definition = grant ? await d.EntitlementDefinition.findOne({
    entitlementKey: grant.entitlementKey,
    version: grant.entitlementVersion,
    status: 'active',
  }).lean() : null;
  const product = grant ? await d.CommercialProduct.findOne({
    productKey: grant.productKey,
    status: 'active',
  }).lean() : null;
  const capabilityKey = grant?.capabilityKey || input.capabilityKey;
  const capabilityGate = capabilityKey ? await d.CapabilityLaunchGate.findOne({
    capabilityKey,
    status: { $in: ['passed', 'passed_with_warnings'] },
    enabled: true,
  }).sort({ evaluatedAt: -1 }).lean() : null;
  const result = core.evaluateEntitlement({
    ...input,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    subscription,
    grants: grant ? [grant] : [],
    definition,
    product,
    capabilityKey,
    capabilityGate,
    tenant: { status: input.tenantStatus || 'active' },
    workspace: { status: input.workspaceStatus || 'active' },
    identity: { authenticated: true },
    rbac: { allowed: caller.authorization?.allowed !== false },
    policy: {
      allowed: caller.authorization?.policyDecision?.allowed !== false,
      decisionReference: caller.authorization?.policyDecision?.decisionId,
    },
  });
  d.metrics.increment('commercial_entitlement_evaluation', { outcome: result.status });
  await audit('commercial.entitlement.evaluated', { model: 'EntitlementDecision' }, result, scope, { outcome: result.status, reasonCode: result.reasonCode }, d);
  return result;
}

async function recordUsage(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const scope = callerScope(input, caller);
  if (!scope.billingAccountId || !scope.subscriptionId) throw new AppError(400, 'USAGE_SCOPE_REQUIRED', 'Billing account and subscription scope are required.');
  if (!input.idempotencyKey || !input.deduplicationKey) throw new AppError(400, 'USAGE_DEDUPLICATION_REQUIRED', 'Usage idempotency and deduplication keys are required.');
  const idempotencyDigest = core.hash(`${scope.organizationId}:${input.idempotencyKey}`);
  const deduplicationDigest = core.hash(`${scope.organizationId}:${input.deduplicationKey}`);
  const existing = await d.CommercialUsageRecord.findOne({
    organizationId: scope.organizationId,
    $or: [{ idempotencyDigest }, { deduplicationDigest }],
  });
  if (existing) {
    d.metrics.increment('commercial_usage_duplicate', { category: 'source_transition' });
    return { record: plain(existing), duplicate: true };
  }
  const boundary = core.billableBoundary(input);
  const record = await d.CommercialUsageRecord.create({
    usageRecordId: input.usageRecordId || `usage-${crypto.randomUUID()}`,
    organizationId: scope.organizationId, workspaceId: scope.workspaceId,
    billingAccountId: scope.billingAccountId, subscriptionId: scope.subscriptionId,
    meterKey: input.meterKey, meterVersion: input.meterVersion,
    capabilityKey: input.capabilityKey, quantity: input.quantity, unit: input.unit,
    outcome: input.outcome, billable: boundary.billable,
    billingExclusionReason: boundary.billable ? undefined : boundary.reasonCode,
    sourceRecordType: input.sourceRecordType, sourceRecordId: input.sourceRecordId,
    sourceTransition: input.sourceTransition, occurredAt: input.occurredAt || new Date(),
    idempotencyDigest, deduplicationDigest, pricingRuleVersion: input.pricingRuleVersion,
    evidenceDigest: core.hash(core.redactCommercialContent(input.evidence || {})),
    adjustmentState: 'unadjusted', requestId: scope.requestId, traceId: scope.traceId,
    createdBy: scope.actorId,
  });
  d.metrics.increment('commercial_usage_record', { outcome: boundary.billable ? 'billable' : 'excluded', exclusion_reason: boundary.reasonCode });
  await audit('commercial.usage.recorded', { model: 'CommercialUsageRecord' }, record, scope, { billable: boundary.billable, reasonCode: boundary.reasonCode }, d);
  return { record: plain(record), duplicate: false };
}

async function usageAggregates(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const scope = callerScope(input, caller);
  const matches = { organizationId: scope.organizationId, ...(scope.billingAccountId ? { billingAccountId: scope.billingAccountId } : {}) };
  const items = await d.CommercialUsageRecord.aggregate([
    { $match: matches },
    { $group: { _id: { meterKey: '$meterKey', billable: '$billable' }, quantity: { $sum: '$quantity' }, recordCount: { $sum: 1 } } },
    { $sort: { '_id.meterKey': 1, '_id.billable': -1 } },
    { $limit: 100 },
  ]);
  return { items: items.map((item) => ({ meterKey: item._id.meterKey, category: item._id.billable ? 'billable' : 'excluded', quantity: item.quantity, recordCount: item.recordCount })), billingAuthority: 'authoritative_operational_records' };
}

async function reconcileUsage(input = {}, caller = {}, options = {}) {
  const aggregates = await usageAggregates(input, caller, options);
  const expected = input.expected || [];
  const actualMap = new Map(aggregates.items.map((item) => [`${item.meterKey}:${item.category}`, item.quantity]));
  const expectedMap = new Map(expected.map((item) => [`${item.meterKey}:${item.category}`, item.quantity]));
  const keys = [...new Set([...actualMap.keys(), ...expectedMap.keys()])];
  const mismatches = keys.flatMap((key) => actualMap.get(key) === expectedMap.get(key) ? [] : [{ key, expectedQuantity: expectedMap.get(key) || 0, actualQuantity: actualMap.get(key) || 0 }]);
  const result = { status: mismatches.length ? 'mismatch' : 'reconciled', mismatches, blocksInvoiceFinalization: mismatches.length > 0 };
  dependencies(options.dependencies).metrics.increment('commercial_reconciliation', { status: result.status });
  return result;
}

async function invoicePreview(input = {}, caller = {}, options = {}) {
  callerScope(input, caller);
  const result = core.previewInvoice(input);
  dependencies(options.dependencies).metrics.increment('commercial_invoice_preview', { status: 'succeeded' });
  return { ...result, preview: true, finalizationAuthorized: false };
}

async function paymentWebhook(provider, input = {}, options = {}) {
  const d = dependencies(options.dependencies);
  if (!['mock', 'noop', 'manual'].includes(provider)) throw new AppError(403, 'PAYMENT_PROVIDER_DISABLED', 'Live payment providers are disabled.');
  if (!input.providerEventId || input.signatureVerified !== true) throw new AppError(400, 'PAYMENT_WEBHOOK_INVALID', 'A verified provider event is required.');
  const existing = await d.PaymentWebhookEvent.findOne({ provider, providerEventId: input.providerEventId });
  if (existing) return { replay: true, stateChanged: false };
  const record = await d.PaymentWebhookEvent.create({
    provider, providerEventId: input.providerEventId, signatureVerified: true,
    status: 'processed', safeEventType: input.safeEventType || 'payment_status',
    receivedAt: new Date(), processedAt: new Date(), eventDigest: core.hash(core.redactCommercialContent(input)),
  });
  return { replay: false, stateChanged: true, event: plain(record) };
}

async function taxEstimate(input = {}, caller = {}) {
  callerScope(input, caller);
  const adapter = new core.ManualTaxAdapter();
  return adapter.estimate(input);
}

async function evaluateReadiness(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const scope = callerScope(input, caller);
  if (!input.idempotencyKey) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required.');
  const result = core.evaluateGaReadiness(input);
  const snapshotKey = `ga-readiness-${core.hash(`${scope.organizationId}:${input.idempotencyKey}`).slice(-48)}`;
  let record = await d.CommercialReadinessSnapshot.findOne({ snapshotKey });
  if (!record) {
    record = await d.CommercialReadinessSnapshot.create({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      releaseCandidateId: input.releaseCandidateId,
      snapshotKey,
      overall: result.overall,
      checks: Object.entries(input)
        .filter(([key, value]) => ['passed', 'ready', 'blocked', 'failed'].includes(value))
        .slice(0, 100)
        .map(([key, status]) => ({ key, status })),
      blockers: result.blockers,
      restrictions: result.restrictions,
      capabilityStatuses: result.capabilities,
      providerGateStatuses: result.providerGates,
      productionAuthorized: false,
      generatedAt: new Date(),
      generatedBy: scope.actorId,
    });
  }
  d.metrics.increment('ga_readiness', { status: result.overall });
  await audit('ga.readiness.evaluated', { model: 'CommercialReadinessSnapshot' }, record, scope, { status: result.overall }, d);
  return { ...result, snapshotKey: record.snapshotKey, generatedAt: record.generatedAt };
}

async function commercialEvidence(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const scope = callerScope(input, caller);
  if (!input.idempotencyKey) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required.');
  await governedApproval(input, scope, 'gaEvidence.create', 'CommercialEvidencePackage', input.releaseCandidateId, d);
  const result = core.createEvidencePackage(input);
  const evidenceKey = `commercial-evidence-${core.hash(`${scope.organizationId}:${input.idempotencyKey}`).slice(-48)}`;
  let record = await d.CommercialEvidencePackage.findOne({ evidenceKey });
  if (!record) {
    record = await d.CommercialEvidencePackage.create({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      evidenceKey,
      releaseCandidateId: result.releaseCandidateId,
      evidenceVersion: result.evidenceVersion,
      readinessStatus: result.readinessStatus,
      groundedResearchStatus: 'blocked',
      summaries: result.summaries,
      sourceDigests: result.sourceDigests,
      evidenceDigest: result.evidenceDigest,
      generatedAt: result.generatedAt,
      generatedBy: scope.actorId,
      certificationClaimed: false,
      productionLaunchAuthorized: false,
    });
  }
  await audit('ga.evidence.generated', { model: 'CommercialEvidencePackage' }, record, scope, { readinessStatus: result.readinessStatus }, d);
  return plain(record);
}

async function commercialExport(input = {}, caller = {}, options = {}) {
  const d = dependencies(options.dependencies); const scope = callerScope(input, caller);
  if (!input.idempotencyKey) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required.');
  const result = core.createCommercialExport({ ...input, organizationId: scope.organizationId });
  const exportKey = `commercial-export-${core.hash(`${scope.organizationId}:${input.idempotencyKey}`).slice(-48)}`;
  let record = await d.CommercialExport.findOne({ exportKey });
  if (!record) {
    record = await d.CommercialExport.create({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      billingAccountId: scope.billingAccountId,
      exportKey,
      exportType: input.exportType || 'finance',
      status: 'completed',
      adapterType: result.adapter,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      currency: result.currency,
      recordCount: result.records.length,
      exportDigest: result.exportDigest,
      evidenceReferences: input.evidenceReferences || [],
      externalTransferPerformed: false,
      requestedBy: scope.actorId,
      completedAt: new Date(),
    });
  }
  await audit('commercial.export.generated', { model: 'CommercialExport' }, record, scope, { adapter: result.adapter }, d);
  return { ...plain(record), records: result.records };
}

async function ensureGaCommercialIndexes(options = {}) {
  const d = dependencies(options.dependencies);
  const uniqueModels = [...new Set(Object.values(models))];
  await Promise.all(uniqueModels.map((Model) => (d[Model.modelName] || Model).syncIndexes()));
}

module.exports = {
  RESOURCE_CONFIG,
  actionResource,
  commercialEvidence,
  commercialExport,
  createResource,
  evaluateEntitlements,
  evaluateReadiness,
  ensureGaCommercialIndexes,
  getResource,
  invoicePreview,
  listResources,
  paymentWebhook,
  reconcileUsage,
  recordUsage,
  taxEstimate,
  updateResource,
  usageAggregates,
};
