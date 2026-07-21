const crypto = require('node:crypto');
const mongoose = require('mongoose');
const InterAgentDataContract = require('../models/InterAgentDataContract');
const InterAgentDelegationGrant = require('../models/InterAgentDelegationGrant');
const InterAgentDelegationInvocation = require('../models/InterAgentDelegationInvocation');
const InterAgentDelegationReference = require('../models/InterAgentDelegationReference');
const OrchestrationDefinition = require('../models/OrchestrationDefinition');
const OrchestrationRun = require('../models/OrchestrationRun');
const OrchestrationNodeRun = require('../models/OrchestrationNodeRun');
const AgentPassport = require('../models/AgentPassport');
const PassportConnection = require('../models/PassportConnection');
const Capability = require('../models/Capability');
const CapabilityCatalogEntry = require('../models/CapabilityCatalogEntry');
const AgentSelectionPolicy = require('../models/AgentSelectionPolicy');
const ApprovalRequest = require('../models/ApprovalRequest');
const { actorFromPartner, assertAuthorized } = require('./authorization.service');
const { assertOperationalAccess } = require('./operationalState.service');
const { createAuditLog } = require('./auditService');
const {
  createApprovalRequest,
  evaluateApprovalRequirement,
  expireIfNeeded,
} = require('./approval.service');
const { invoke: invokeThroughRuntimeGateway } = require('./runtimeGateway.service');
const { validateAgainstSchema } = require('./orchestrationValidation.service');
const {
  highestClassification,
  assertClassificationAllowed,
  assertRegionResidency,
  processDelegatedInput,
  processDelegatedOutput,
  safeClone,
  schemaHash,
} = require('./interAgentData.service');
const {
  normalizeContractInput,
  validateContractDocument,
} = require('./interAgentContractValidation.service');
const { secureDigest, isDuplicateKeyError } = require('../utils/idempotency');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  DATA_CLASSIFICATIONS,
  DATA_CONTRACT_STATUSES,
  DELEGATION_GRANT_STATUSES,
  DELEGATION_INVOCATION_STATUSES,
  INTER_AGENT_LIMITS,
  TERMINAL_GRANT_STATUSES,
} = require('../constants/interAgentDelegation');
const { trustRank } = require('../constants/agentSelection');
const metrics = require('./interAgentDelegationMetrics.service');

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function scopeFrom(input = {}, caller = {}) {
  const partnerId = idOf(caller.partner);
  if (!partnerId) throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Partner API key is required.');
  const workspaceId = String(input.workspaceId || input.receivingWorkspaceId || '').trim();
  if (!workspaceId) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'workspaceId is required.');
  return {
    organizationId: partnerId,
    partnerId,
    workspaceId,
    actorId: `partner:${partnerId}`,
    actorType: 'partner',
    requestId: caller.requestId || `req_${crypto.randomUUID()}`,
    traceId: caller.traceId || `trace_${crypto.randomUUID()}`,
  };
}

function systemScope(input = {}) {
  return {
    organizationId: idOf(input.organizationId),
    partnerId: idOf(input.partnerId || input.organizationId),
    workspaceId: String(input.workspaceId || ''),
    actorId: input.actorId || 'system:orchestration-worker',
    actorType: input.actorType || 'system',
    requestId: input.requestId || `req_${crypto.randomUUID()}`,
    traceId: input.traceId || `trace_${crypto.randomUUID()}`,
  };
}

function resource(type, value, scope) {
  return {
    type,
    id: idOf(value) || `${type.toLowerCase()}:${scope.workspaceId}`,
    organizationId: scope.organizationId,
    partnerId: scope.partnerId,
    workspaceId: scope.workspaceId,
  };
}

async function authorize(permission, type, value, scope, caller = {}, context = {}, dependencies = {}) {
  const assert = dependencies.assertAuthorized || assertAuthorized;
  const actor = caller.partner
    ? actorFromPartner(caller.partner, {
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        requestId: scope.requestId,
        traceId: scope.traceId,
      })
    : {
        type: 'system',
        id: scope.actorId,
        actorType: 'system',
        actorId: scope.actorId,
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        trustedSystem: true,
        skipPersistentRoles: true,
      };
  return assert(actor, permission, resource(type, value, scope), {
    requestId: scope.requestId,
    traceId: scope.traceId,
    workspaceId: scope.workspaceId,
    trustedSystem: !caller.partner,
    ...context,
  });
}

async function audit(action, type, value, scope, metadata = {}, dependencies = {}) {
  const create = dependencies.createAuditLog || createAuditLog;
  return create(
    scope.actorType,
    scope.actorId,
    action,
    type,
    idOf(value),
    {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      receivingWorkspaceId: scope.workspaceId,
      ...metadata,
    },
    { requestId: scope.requestId, traceId: scope.traceId },
  );
}

function pagination(input = {}) {
  const page = Number(input.page || 1);
  const limit = Number(input.limit || 25);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > INTER_AGENT_LIMITS.maximumListLimit) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Pagination is invalid.');
  return { page, limit, skip: (page - 1) * limit };
}

function safeSearch(value) {
  const text = String(value || '').trim().slice(0, INTER_AGENT_LIMITS.maximumSearchLength);
  return text ? text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
}

function sizeCategory(bytes) {
  if (bytes <= 1_024) return 'tiny';
  if (bytes <= 16_384) return 'small';
  if (bytes <= 131_072) return 'medium';
  return 'large';
}

function serializeContract(input) {
  const contract = typeof input?.toObject === 'function' ? input.toObject() : input;
  return {
    contractId: idOf(contract),
    organizationId: contract.organizationId,
    workspaceId: contract.workspaceId,
    name: contract.name,
    description: contract.description || '',
    version: contract.version,
    status: contract.status,
    sourceSelector: contract.sourceSelector || {},
    targetSelector: contract.targetSelector || {},
    sourceCapability: contract.sourceCapability,
    sourceOperation: contract.sourceOperation,
    targetCapability: contract.targetCapability,
    targetOperation: contract.targetOperation,
    purpose: contract.purpose,
    purposeCode: contract.purposeCode,
    allowedInputSchema: contract.allowedInputSchema,
    allowedOutputSchema: contract.allowedOutputSchema,
    sourceOutputMapping: contract.sourceOutputMapping || {},
    targetInputMapping: contract.targetInputMapping || {},
    downstreamOutputMapping: contract.downstreamOutputMapping || {},
    allowedInputFields: contract.allowedInputFields || [],
    deniedInputFields: contract.deniedInputFields || [],
    allowedOutputFields: contract.allowedOutputFields || [],
    deniedOutputFields: contract.deniedOutputFields || [],
    allowedDataClassifications: contract.allowedDataClassifications || [],
    maximumDataClassification: contract.maximumDataClassification,
    allowedRegions: contract.allowedRegions || [],
    residencyRequirements: contract.residencyRequirements || [],
    transformationRules: contract.transformationRules || [],
    redactionRules: contract.redactionRules || [],
    minimizationRules: contract.minimizationRules || [],
    maximumPayloadBytes: contract.maximumPayloadBytes,
    maximumArrayItems: contract.maximumArrayItems,
    maximumStringLength: contract.maximumStringLength,
    maximumObjectDepth: contract.maximumObjectDepth,
    allowAttachments: contract.allowAttachments === true,
    allowedAttachmentTypes: contract.allowedAttachmentTypes || [],
    maximumAttachmentBytes: contract.maximumAttachmentBytes,
    allowFurtherDelegation: contract.allowFurtherDelegation === true,
    maximumDelegationDepth: contract.maximumDelegationDepth,
    requireApproval: contract.requireApproval === true,
    approvalConditions: contract.approvalConditions || {},
    retentionPolicy: contract.retentionPolicy || { mode: 'metadata_only', durationDays: 0 },
    validFrom: contract.validFrom,
    expiresAt: contract.expiresAt,
    createdBy: contract.createdBy,
    updatedBy: contract.updatedBy,
    activatedBy: contract.activatedBy,
    activatedAt: contract.activatedAt || null,
    archivedBy: contract.archivedBy,
    archivedAt: contract.archivedAt || null,
    validatedAt: contract.validatedAt || null,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  };
}

function serializeGrant(input) {
  const grant = typeof input?.toObject === 'function' ? input.toObject() : input;
  return {
    grantId: idOf(grant),
    organizationId: grant.organizationId,
    workspaceId: grant.workspaceId,
    orchestrationDefinitionId: idOf(grant.orchestrationDefinitionId) || null,
    orchestrationRunId: idOf(grant.orchestrationRunId) || null,
    sourceNodeRunId: idOf(grant.sourceNodeRunId) || null,
    targetNodeRunId: idOf(grant.targetNodeRunId) || null,
    contractId: idOf(grant.contractId),
    contractVersion: grant.contractVersion,
    sourcePassportId: idOf(grant.sourcePassportId),
    sourcePassportVersion: grant.sourcePassportVersion,
    sourceConnectionId: idOf(grant.sourceConnectionId),
    targetPassportId: idOf(grant.targetPassportId),
    targetPassportVersion: grant.targetPassportVersion,
    targetConnectionId: idOf(grant.targetConnectionId),
    sourceCapability: grant.sourceCapability,
    sourceOperation: grant.sourceOperation,
    targetCapability: grant.targetCapability,
    targetOperation: grant.targetOperation,
    purpose: grant.purpose,
    purposeCode: grant.purposeCode,
    status: grant.status,
    allowedDataClassifications: grant.allowedDataClassifications || [],
    maximumDataClassification: grant.maximumDataClassification,
    invocationLimit: grant.invocationLimit,
    invocationCount: grant.invocationCount,
    validFrom: grant.validFrom,
    expiresAt: grant.expiresAt,
    delegationDepth: grant.delegationDepth,
    maximumDelegationDepth: grant.maximumDelegationDepth,
    allowFurtherDelegation: grant.allowFurtherDelegation === true,
    parentDelegationGrantId: idOf(grant.parentDelegationGrantId) || null,
    approvalRequestId: grant.approvalRequestId || null,
    approvedBy: grant.approvedBy || null,
    approvedAt: grant.approvedAt || null,
    revocationReasonCode: grant.revocationReasonCode || null,
    revokedBy: grant.revokedBy || null,
    revokedAt: grant.revokedAt || null,
    traceId: grant.traceId,
    requestId: grant.requestId,
    createdBy: grant.createdBy,
    createdAt: grant.createdAt,
    updatedAt: grant.updatedAt,
  };
}

function serializeInvocation(input) {
  const invocation = typeof input?.toObject === 'function' ? input.toObject() : input;
  return {
    invocationId: idOf(invocation),
    grantId: idOf(invocation.delegationGrantId),
    contractId: idOf(invocation.contractId),
    contractVersion: invocation.contractVersion,
    orchestrationRunId: idOf(invocation.orchestrationRunId) || null,
    sourceNodeRunId: idOf(invocation.sourceNodeRunId) || null,
    targetNodeRunId: idOf(invocation.targetNodeRunId) || null,
    sourcePassportId: idOf(invocation.sourcePassportId),
    targetPassportId: idOf(invocation.targetPassportId),
    sourceConnectionId: idOf(invocation.sourceConnectionId),
    targetConnectionId: idOf(invocation.targetConnectionId),
    capability: invocation.capability,
    operation: invocation.operation,
    purposeCode: invocation.purposeCode,
    status: invocation.status,
    invocationOrdinal: invocation.invocationOrdinal,
    effectiveDataClassification: invocation.effectiveDataClassification,
    delegatedFieldCount: invocation.delegatedFieldCount,
    removedFieldCount: invocation.removedFieldCount,
    redactedFieldCount: invocation.redactedFieldCount,
    transformedFieldCount: invocation.transformedFieldCount,
    approximateInputBytes: invocation.approximateInputBytes,
    approximateOutputBytes: invocation.approximateOutputBytes,
    payloadSizeCategory: sizeCategory(invocation.approximateInputBytes || 0),
    policyDecisionCategory: invocation.policyDecisionCategory,
    approvalRequestId: invocation.approvalRequestId || null,
    runtimeInvocationId: idOf(invocation.runtimeInvocationId) || null,
    requestId: invocation.requestId,
    traceId: invocation.traceId,
    parentTraceId: invocation.parentTraceId,
    safeFailureCode: invocation.safeFailureCode || null,
    safeFailureMessage: invocation.safeFailureMessage || null,
    retryability: invocation.retryability === true,
    startedAt: invocation.startedAt || null,
    completedAt: invocation.completedAt || null,
    createdAt: invocation.createdAt,
  };
}

function selectorMatchesCandidate(selector = {}, candidate = {}, context = {}) {
  if (selector.passportId && idOf(selector.passportId) !== idOf(candidate.passportId)) return false;
  if (selector.connectionId && idOf(selector.connectionId) !== idOf(candidate.connectionId)) return false;
  if (selector.publisher && String(selector.publisher).toLowerCase() !== String(candidate.publisherName || '').toLowerCase()) return false;
  if (selector.capabilityCategory && !(candidate.categories || []).includes(selector.capabilityCategory)) return false;
  if (selector.minimumTrustTier && trustRank(candidate.trustTier) < trustRank(selector.minimumTrustTier)) return false;
  if (selector.selectionPolicyId && idOf(selector.selectionPolicyId) !== idOf(context.selectionPolicyId)) return false;
  if (selector.orchestrationDefinitionId && idOf(selector.orchestrationDefinitionId) !== idOf(context.orchestrationDefinitionId)) return false;
  if (selector.orchestrationNodeKey && String(selector.orchestrationNodeKey) !== String(context.orchestrationNodeKey || '')) return false;
  return true;
}

function capabilityMatches(candidate, capability, operation) {
  const item = (candidate.capabilities || []).find((value) => value.capabilityKey === capability);
  return Boolean(item && (item.operationKeys || []).includes(operation));
}

async function validateSelectorReferences(contract, scope, dependencies = {}) {
  const Catalog = dependencies.CapabilityCatalogEntry || CapabilityCatalogEntry;
  const Policy = dependencies.AgentSelectionPolicy || AgentSelectionPolicy;
  const Definition = dependencies.OrchestrationDefinition || OrchestrationDefinition;
  const entries = await Catalog.find({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    availabilityStatus: 'available',
    lifecycleStatus: 'valid',
    connectionStatus: 'connected',
  }).lean();
  const source = entries.filter((entry) => selectorMatchesCandidate(contract.sourceSelector, entry) && capabilityMatches(entry, contract.sourceCapability, contract.sourceOperation));
  const target = entries.filter((entry) => selectorMatchesCandidate(contract.targetSelector, entry) && capabilityMatches(entry, contract.targetCapability, contract.targetOperation));
  const errors = [];
  if (!source.length) errors.push({ path: 'sourceSelector', code: 'DATA_CONTRACT_SELECTOR_INVALID', message: 'Source selector has no eligible tenant-scoped match.' });
  if (!target.length) errors.push({ path: 'targetSelector', code: 'DATA_CONTRACT_SELECTOR_INVALID', message: 'Target selector has no eligible tenant-scoped match.' });
  for (const [name, selector] of [['sourceSelector', contract.sourceSelector], ['targetSelector', contract.targetSelector]]) {
    if (selector.selectionPolicyId) {
      const policy = await Policy.findOne({ _id: selector.selectionPolicyId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, status: 'active' }).lean();
      if (!policy) errors.push({ path: `${name}.selectionPolicyId`, code: 'DATA_CONTRACT_SELECTOR_INVALID', message: 'Selector policy is unavailable in this tenant scope.' });
    }
    if (selector.orchestrationDefinitionId) {
      const definition = await Definition.findOne({ _id: selector.orchestrationDefinitionId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, status: { $in: ['draft', 'active'] } }).lean();
      if (!definition || (selector.orchestrationNodeKey && !(definition.nodes || []).some((node) => node.nodeKey === selector.orchestrationNodeKey))) errors.push({ path: `${name}.orchestrationDefinitionId`, code: 'DATA_CONTRACT_SELECTOR_INVALID', message: 'Selector orchestration reference is unavailable.' });
    }
  }
  return { valid: errors.length === 0, errors, sourceCandidates: source, targetCandidates: target };
}

async function validateContractEntity(contract, scope, options = {}, dependencies = {}) {
  const document = validateContractDocument(contract, { now: options.now, activation: options.activation });
  if (!document.valid) return document;
  const references = await validateSelectorReferences(contract, scope, dependencies);
  return { ...document, valid: references.valid, errors: references.errors, references };
}

function throwContractValidation(result) {
  if (result.valid) return;
  const code = result.errors[0]?.code || 'DATA_CONTRACT_INVALID';
  metrics.increment('inter_agent_contract_validation_failures', { reason: code });
  throw new AppError(400, code, 'Inter-agent data contract validation failed.', result.errors.slice(0, 100));
}

async function createContract(input = {}, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const Model = dependencies.InterAgentDataContract || InterAgentDataContract;
  const scope = scopeFrom(input, caller);
  await authorize('interAgentContract.create', 'InterAgentDataContract', null, scope, caller, {}, dependencies);
  await (dependencies.assertOperationalAccess || assertOperationalAccess)({ ...scope, operation: 'MUTATION' });
  const normalized = normalizeContractInput(input, {}, options.now);
  const latest = await Model.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, name: normalized.name }).sort({ version: -1 }).lean();
  normalized.version = latest ? Number(latest.version) + 1 : Number(normalized.version || 1);
  const basic = validateContractDocument({ ...normalized, organizationId: scope.organizationId, workspaceId: scope.workspaceId }, { now: options.now });
  throwContractValidation(basic);
  const contract = await Model.create({
    ...normalized,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    status: 'draft',
    inputSchemaHash: basic.inputSchemaHash,
    outputSchemaHash: basic.outputSchemaHash,
    createdBy: scope.actorId,
    updatedBy: scope.actorId,
  });
  metrics.increment('inter_agent_contracts_created', { status: 'draft' });
  await audit('inter_agent.contract.created', 'InterAgentDataContract', contract, scope, { contractId: idOf(contract), version: contract.version, status: contract.status }, dependencies);
  return serializeContract(contract);
}

async function scopedContract(contractId, scope, options = {}, dependencies = {}) {
  if (!mongoose.isValidObjectId(contractId)) throw new AppError(404, 'DATA_CONTRACT_NOT_FOUND', 'Data contract was not found.');
  const Model = dependencies.InterAgentDataContract || InterAgentDataContract;
  const query = Model.findOne({ _id: contractId, organizationId: scope.organizationId, workspaceId: scope.workspaceId });
  if (options.private) query.select('+inputSchemaHash +outputSchemaHash +validationDigest');
  const contract = options.lean ? await query.lean() : await query;
  if (!contract) throw new AppError(404, 'DATA_CONTRACT_NOT_FOUND', 'Data contract was not found.');
  return contract;
}

async function listContracts(input = {}, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const Model = dependencies.InterAgentDataContract || InterAgentDataContract;
  const scope = scopeFrom(input, caller);
  await authorize('interAgentContract.read', 'InterAgentDataContract', null, scope, caller, {}, dependencies);
  const paging = pagination(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (input.status) {
    const statuses = String(input.status).split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (statuses.some((value) => !DATA_CONTRACT_STATUSES.includes(value))) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Contract status filter is invalid.');
    filter.status = { $in: statuses };
  }
  const search = safeSearch(input.search || input.q);
  if (search) filter.name = new RegExp(search, 'i');
  const [items, total] = await Promise.all([
    Model.find(filter).sort({ updatedAt: -1, _id: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    Model.countDocuments(filter),
  ]);
  return { items: items.map(serializeContract), page: paging.page, limit: paging.limit, total };
}

async function getContract(contractId, input = {}, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const scope = scopeFrom(input, caller);
  await authorize('interAgentContract.read', 'InterAgentDataContract', contractId, scope, caller, {}, dependencies);
  return serializeContract(await scopedContract(contractId, scope, {}, dependencies));
}

async function updateContract(contractId, input = {}, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const Model = dependencies.InterAgentDataContract || InterAgentDataContract;
  const scope = scopeFrom(input, caller);
  await authorize('interAgentContract.update', 'InterAgentDataContract', contractId, scope, caller, {}, dependencies);
  await (dependencies.assertOperationalAccess || assertOperationalAccess)({ ...scope, operation: 'MUTATION' });
  const current = await scopedContract(contractId, scope, { private: true }, dependencies);
  if (current.status === 'archived') throw new AppError(409, 'DATA_CONTRACT_IMMUTABLE', 'Archived data contracts are immutable.');
  const plain = current.toObject();
  const normalized = normalizeContractInput(input, plain, options.now);
  if (current.status === 'active') {
    const latest = await Model.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, name: current.name }).sort({ version: -1 }).lean();
    normalized.version = Number(latest?.version || current.version) + 1;
    const basic = validateContractDocument({ ...normalized, organizationId: scope.organizationId, workspaceId: scope.workspaceId }, { now: options.now });
    throwContractValidation(basic);
    const created = await Model.create({ ...normalized, organizationId: scope.organizationId, workspaceId: scope.workspaceId, status: 'draft', inputSchemaHash: basic.inputSchemaHash, outputSchemaHash: basic.outputSchemaHash, createdBy: scope.actorId, updatedBy: scope.actorId });
    await audit('inter_agent.contract.created', 'InterAgentDataContract', created, scope, { sourceContractId: idOf(current), contractId: idOf(created), version: created.version, status: 'draft' }, dependencies);
    return { ...serializeContract(created), versionCreated: true };
  }
  normalized.version = current.version;
  const basic = validateContractDocument({ ...normalized, organizationId: scope.organizationId, workspaceId: scope.workspaceId }, { now: options.now });
  throwContractValidation(basic);
  Object.assign(current, normalized, { inputSchemaHash: basic.inputSchemaHash, outputSchemaHash: basic.outputSchemaHash, validationDigest: undefined, validatedAt: undefined, updatedBy: scope.actorId });
  const updated = await current.save();
  await audit('inter_agent.contract.updated', 'InterAgentDataContract', updated, scope, { contractId: idOf(updated), version: updated.version, status: updated.status }, dependencies);
  return serializeContract(updated);
}

async function validateContract(contractId, input = {}, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const scope = scopeFrom(input, caller);
  await authorize('interAgentContract.validate', 'InterAgentDataContract', contractId, scope, caller, {}, dependencies);
  await (dependencies.assertOperationalAccess || assertOperationalAccess)({ ...scope, operation: 'MUTATION' });
  const contract = await scopedContract(contractId, scope, { private: true }, dependencies);
  const result = await validateContractEntity(contract.toObject(), scope, { now: options.now }, dependencies);
  if (result.valid && contract.status === 'draft') {
    contract.validationDigest = result.validationDigest;
    contract.inputSchemaHash = result.inputSchemaHash;
    contract.outputSchemaHash = result.outputSchemaHash;
    contract.validatedAt = new Date(options.now || Date.now());
    contract.updatedBy = scope.actorId;
    await contract.save();
  }
  await audit('inter_agent.contract.validated', 'InterAgentDataContract', contract, scope, { contractId: idOf(contract), version: contract.version, status: contract.status, valid: result.valid, errorCodes: result.errors.map((error) => error.code).slice(0, 20) }, dependencies);
  return { valid: result.valid, errors: result.errors, contractId: idOf(contract), version: contract.version, validatedAt: result.valid ? contract.validatedAt : null };
}

async function activateContract(contractId, input = {}, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const scope = scopeFrom(input, caller);
  await authorize('interAgentContract.activate', 'InterAgentDataContract', contractId, scope, caller, {}, dependencies);
  await (dependencies.assertOperationalAccess || assertOperationalAccess)({ ...scope, operation: 'MUTATION' });
  const contract = await scopedContract(contractId, scope, { private: true }, dependencies);
  if (contract.status === 'active') return serializeContract(contract);
  if (contract.status !== 'draft') throw new AppError(409, 'DATA_CONTRACT_IMMUTABLE', 'Only draft contracts may be activated.');
  const result = await validateContractEntity(contract.toObject(), scope, { now: options.now, activation: true }, dependencies);
  throwContractValidation(result);
  contract.status = 'active';
  contract.validationDigest = result.validationDigest;
  contract.inputSchemaHash = result.inputSchemaHash;
  contract.outputSchemaHash = result.outputSchemaHash;
  contract.validatedAt = new Date(options.now || Date.now());
  contract.activatedAt = new Date(options.now || Date.now());
  contract.activatedBy = scope.actorId;
  contract.updatedBy = scope.actorId;
  const active = await contract.save();
  metrics.increment('inter_agent_contracts_activated', { status: 'active' });
  await audit('inter_agent.contract.activated', 'InterAgentDataContract', active, scope, { contractId: idOf(active), version: active.version, status: active.status }, dependencies);
  return serializeContract(active);
}

async function archiveContract(contractId, input = {}, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const scope = scopeFrom(input, caller);
  await authorize('interAgentContract.archive', 'InterAgentDataContract', contractId, scope, caller, {}, dependencies);
  await (dependencies.assertOperationalAccess || assertOperationalAccess)({ ...scope, operation: 'MUTATION' });
  const contract = await scopedContract(contractId, scope, {}, dependencies);
  if (contract.status === 'archived') return serializeContract(contract);
  contract.status = 'archived';
  contract.archivedAt = new Date(options.now || Date.now());
  contract.archivedBy = scope.actorId;
  contract.updatedBy = scope.actorId;
  await contract.save();
  await audit('inter_agent.contract.archived', 'InterAgentDataContract', contract, scope, { contractId: idOf(contract), version: contract.version, status: contract.status }, dependencies);
  return serializeContract(contract);
}

function grantIdentity(input, sourceNode, targetNode) {
  return {
    orchestrationDefinitionId: input.orchestrationDefinitionId,
    orchestrationRunId: input.orchestrationRunId,
    sourceNodeRunId: input.sourceNodeRunId || sourceNode?._id,
    targetNodeRunId: input.targetNodeRunId || targetNode?._id,
    sourcePassportId: input.sourcePassportId || sourceNode?.passportId,
    sourcePassportVersion: input.sourcePassportVersion || sourceNode?.passportVersion,
    sourceConnectionId: input.sourceConnectionId || sourceNode?.connectionId,
    targetPassportId: input.targetPassportId || targetNode?.passportId,
    targetPassportVersion: input.targetPassportVersion || targetNode?.passportVersion,
    targetConnectionId: input.targetConnectionId || targetNode?.connectionId,
  };
}

async function loadGrantActors(identity, scope, dependencies = {}) {
  const Connection = dependencies.PassportConnection || PassportConnection;
  const Passport = dependencies.AgentPassport || AgentPassport;
  const Catalog = dependencies.CapabilityCatalogEntry || CapabilityCatalogEntry;
  const [sourceConnection, targetConnection, sourcePassport, targetPassport, sourceCatalog, targetCatalog] = await Promise.all([
    Connection.findOne({ _id: identity.sourceConnectionId, receivingWorkspaceId: scope.workspaceId, status: 'connected', installScope: 'invoke', $or: [{ organizationId: scope.organizationId }, { partnerId: scope.organizationId }] }).lean(),
    Connection.findOne({ _id: identity.targetConnectionId, receivingWorkspaceId: scope.workspaceId, status: 'connected', installScope: 'invoke', $or: [{ organizationId: scope.organizationId }, { partnerId: scope.organizationId }] }).lean(),
    Passport.findOne({ _id: identity.sourcePassportId, status: 'valid' }).lean(),
    Passport.findOne({ _id: identity.targetPassportId, status: 'valid' }).lean(),
    Catalog.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, passportId: identity.sourcePassportId, connectionId: identity.sourceConnectionId, availabilityStatus: 'available', lifecycleStatus: 'valid', connectionStatus: 'connected' }).lean(),
    Catalog.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, passportId: identity.targetPassportId, connectionId: identity.targetConnectionId, availabilityStatus: 'available', lifecycleStatus: 'valid', connectionStatus: 'connected' }).lean(),
  ]);
  if (!sourceConnection || !targetConnection || !sourcePassport || !targetPassport || !sourceCatalog || !targetCatalog) throw new AppError(409, 'INTER_AGENT_IDENTITY_UNAVAILABLE', 'A delegated source or target identity is unavailable.');
  if (idOf(sourceConnection.passportId) !== idOf(sourcePassport) || idOf(targetConnection.passportId) !== idOf(targetPassport)) throw new AppError(409, 'INTER_AGENT_IDENTITY_MISMATCH', 'Delegation identity binding is invalid.');
  if (String(sourcePassport.agent?.version || '') !== String(identity.sourcePassportVersion || '') || String(targetPassport.agent?.version || '') !== String(identity.targetPassportVersion || '')) throw new AppError(409, 'INTER_AGENT_PASSPORT_VERSION_MISMATCH', 'Delegation passport version no longer matches its frozen identity.');
  return { sourceConnection, targetConnection, sourcePassport, targetPassport, sourceCatalog, targetCatalog };
}

async function validateParentGrant(input, contract, identity, scope, dependencies = {}) {
  const Model = dependencies.InterAgentDelegationGrant || InterAgentDelegationGrant;
  const depth = Number(input.delegationDepth || (input.parentDelegationGrantId ? 2 : 1));
  if (!Number.isInteger(depth) || depth < 1 || depth > INTER_AGENT_LIMITS.platformMaximumDelegationDepth || depth > contract.maximumDelegationDepth) throw new AppError(403, 'DATA_CONTRACT_DELEGATION_DEPTH_INVALID', 'Delegation depth exceeds the allowed bound.');
  if (!input.parentDelegationGrantId) return { depth, parent: null, passportPath: [idOf(identity.sourcePassportId), idOf(identity.targetPassportId)] };
  if (!contract.allowFurtherDelegation) throw new AppError(403, 'INTER_AGENT_FURTHER_DELEGATION_DENIED', 'Further delegation is not authorized by this contract.');
  const parent = await Model.findOne({ _id: input.parentDelegationGrantId, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).select('+passportPath +idempotencyReservationHashes').lean();
  if (!parent || parent.status !== 'active' || parent.allowFurtherDelegation !== true) throw new AppError(403, 'INTER_AGENT_FURTHER_DELEGATION_DENIED', 'Parent delegation does not permit transfer of authority.');
  if (depth !== Number(parent.delegationDepth) + 1 || depth > Number(parent.maximumDelegationDepth)) throw new AppError(403, 'DATA_CONTRACT_DELEGATION_DEPTH_INVALID', 'Delegation depth does not match the parent grant.');
  if (idOf(parent.targetPassportId) !== idOf(identity.sourcePassportId)) throw new AppError(403, 'INTER_AGENT_GRANT_PARENT_INVALID', 'Parent target must be the child source.');
  const path = [...(parent.passportPath || [idOf(parent.sourcePassportId), idOf(parent.targetPassportId)]), idOf(identity.targetPassportId)];
  if (new Set(path).size !== path.length) throw new AppError(409, 'INTER_AGENT_DELEGATION_CYCLE', 'Delegation passport cycle was rejected.');
  return { depth, parent, passportPath: path };
}

async function approvalForGrant(contract, grantInput, scope, caller, dependencies = {}) {
  const action = {
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    requesterActorId: scope.actorId,
    requesterActorType: scope.actorType,
    permission: 'interAgentDelegation.create',
    resourceType: 'InterAgentDelegationGrant',
    resourceId: idOf(grantInput._id || grantInput.contractId),
    connectionId: idOf(grantInput.targetConnectionId),
    passportId: idOf(grantInput.targetPassportId),
    capabilityId: grantInput.targetCapability,
    capabilityClassification: grantInput.maximumDataClassification,
    operationType: 'INTER_AGENT_DELEGATION',
    safeRequestAttributes: {
      contractName: contract.name,
      contractVersion: contract.version,
      sourcePassportId: idOf(grantInput.sourcePassportId),
      targetPassportId: idOf(grantInput.targetPassportId),
      capability: grantInput.targetCapability,
      operation: grantInput.targetOperation,
      purposeCode: contract.purposeCode,
      classification: contract.maximumDataClassification,
      fieldNames: contract.allowedInputFields,
      redactionRuleCount: contract.redactionRules.length,
      delegationDepth: grantInput.delegationDepth,
      expiration: grantInput.expiresAt,
    },
  };
  const evaluate = dependencies.evaluateApprovalRequirement || evaluateApprovalRequirement;
  const evaluation = await evaluate(action);
  if (!contract.requireApproval && !evaluation.required) return null;
  const create = dependencies.createApprovalRequest || createApprovalRequest;
  return create(
    {
      workspaceId: scope.workspaceId,
      requesterActorId: scope.actorId,
      requesterActorType: scope.actorType,
      permission: action.permission,
      resourceType: action.resourceType,
      resourceId: action.resourceId,
      operationType: action.operationType,
      connectionId: action.connectionId,
      capabilityId: action.capabilityId,
      passportId: action.passportId,
      capabilityClassification: action.capabilityClassification,
      safeRequestAttributes: action.safeRequestAttributes,
      workflowId: contract.approvalConditions?.workflowId,
      reason: 'Inter-agent delegation approval required.',
      idempotencyKey: `inter-agent-grant:${idOf(grantInput.orchestrationRunId) || scope.requestId}:${idOf(grantInput.sourceNodeRunId)}:${idOf(grantInput.targetNodeRunId)}:${idOf(contract)}`,
    },
    caller.partner ? caller : { partner: { _id: new mongoose.Types.ObjectId(scope.organizationId) }, requestId: scope.requestId, traceId: scope.traceId },
  );
}

async function createGrantRecord(input, scope, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const Model = dependencies.InterAgentDelegationGrant || InterAgentDelegationGrant;
  const Contract = dependencies.InterAgentDataContract || InterAgentDataContract;
  const NodeRun = dependencies.OrchestrationNodeRun || OrchestrationNodeRun;
  const now = new Date(options.now || Date.now());
  const contract = await Contract.findOne({ _id: input.contractId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, version: Number(input.contractVersion), status: 'active', validFrom: { $lte: now }, expiresAt: { $gt: now } }).select('+inputSchemaHash +outputSchemaHash').lean();
  if (!contract) throw new AppError(409, 'DATA_CONTRACT_INACTIVE', 'An active immutable contract version is required.');
  const [sourceNode, targetNode] = await Promise.all([
    input.sourceNodeRunId ? NodeRun.findOne({ _id: input.sourceNodeRunId, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).lean() : null,
    input.targetNodeRunId ? NodeRun.findOne({ _id: input.targetNodeRunId, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).lean() : null,
  ]);
  const identity = grantIdentity(input, sourceNode, targetNode);
  const actors = await loadGrantActors(identity, scope, dependencies);
  const selectorContext = { orchestrationDefinitionId: identity.orchestrationDefinitionId, selectionPolicyId: input.sourceSelectionPolicyId || sourceNode?.selectionPolicyId, orchestrationNodeKey: sourceNode?.nodeKey };
  if (!selectorMatchesCandidate(contract.sourceSelector, actors.sourceCatalog, selectorContext) || !capabilityMatches(actors.sourceCatalog, contract.sourceCapability, contract.sourceOperation)) throw new AppError(403, 'DATA_CONTRACT_SELECTOR_INVALID', 'Frozen source agent does not match the contract selector.');
  if (!selectorMatchesCandidate(contract.targetSelector, actors.targetCatalog, { ...selectorContext, selectionPolicyId: input.targetSelectionPolicyId || targetNode?.selectionPolicyId, orchestrationNodeKey: targetNode?.nodeKey }) || !capabilityMatches(actors.targetCatalog, contract.targetCapability, contract.targetOperation)) throw new AppError(403, 'DATA_CONTRACT_SELECTOR_INVALID', 'Frozen target agent does not match the contract selector.');
  if (sourceNode && (sourceNode.capability !== contract.sourceCapability || sourceNode.operation !== contract.sourceOperation)) throw new AppError(409, 'INTER_AGENT_CAPABILITY_MISMATCH', 'Source node capability does not match the contract.');
  if (targetNode && (targetNode.capability !== contract.targetCapability || targetNode.operation !== contract.targetOperation)) throw new AppError(409, 'INTER_AGENT_CAPABILITY_MISMATCH', 'Target node capability does not match the contract.');
  const parent = await validateParentGrant(input, contract, identity, scope, dependencies);
  const expiresAt = new Date(Math.min(new Date(contract.expiresAt).getTime(), new Date(input.expiresAt || now.getTime() + 60 * 60 * 1_000).getTime()));
  const invocationLimit = Number(input.invocationLimit || 1);
  if (!Number.isInteger(invocationLimit) || invocationLimit < 1 || invocationLimit > INTER_AGENT_LIMITS.maximumInvocationLimit) throw new AppError(400, 'INTER_AGENT_INVOCATION_LIMIT_INVALID', 'Invocation limit is invalid.');
  const grantPayload = {
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    orchestrationDefinitionId: identity.orchestrationDefinitionId,
    orchestrationRunId: identity.orchestrationRunId,
    sourceNodeRunId: identity.sourceNodeRunId,
    targetNodeRunId: identity.targetNodeRunId,
    contractId: contract._id,
    contractVersion: contract.version,
    sourcePassportId: identity.sourcePassportId,
    sourcePassportVersion: identity.sourcePassportVersion,
    sourceConnectionId: identity.sourceConnectionId,
    targetPassportId: identity.targetPassportId,
    targetPassportVersion: identity.targetPassportVersion,
    targetConnectionId: identity.targetConnectionId,
    sourceCapability: contract.sourceCapability,
    sourceOperation: contract.sourceOperation,
    targetCapability: contract.targetCapability,
    targetOperation: contract.targetOperation,
    purpose: contract.purpose,
    purposeCode: contract.purposeCode,
    status: 'active',
    allowedInputSchemaHash: contract.inputSchemaHash || schemaHash(contract.allowedInputSchema),
    allowedOutputSchemaHash: contract.outputSchemaHash || schemaHash(contract.allowedOutputSchema),
    allowedDataClassifications: contract.allowedDataClassifications,
    maximumDataClassification: contract.maximumDataClassification,
    invocationLimit,
    invocationCount: 0,
    validFrom: new Date(Math.max(now.getTime(), new Date(contract.validFrom).getTime())),
    expiresAt,
    delegationDepth: parent.depth,
    maximumDelegationDepth: contract.maximumDelegationDepth,
    allowFurtherDelegation: contract.allowFurtherDelegation,
    parentDelegationGrantId: parent.parent?._id,
    passportPath: parent.passportPath,
    traceId: input.traceId || scope.traceId,
    requestId: input.requestId || scope.requestId,
    createdBy: scope.actorId,
  };
  const approval = await approvalForGrant(contract, grantPayload, scope, caller, dependencies);
  if (approval) {
    grantPayload.status = 'pending';
    grantPayload.approvalRequestId = approval.approvalRequestId;
  }
  let grant;
  try {
    grant = await Model.create(grantPayload);
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    grant = await Model.findOne({ orchestrationRunId: identity.orchestrationRunId, sourceNodeRunId: identity.sourceNodeRunId, targetNodeRunId: identity.targetNodeRunId, contractId: contract._id });
    if (!grant) throw error;
  }
  if (grant.approvalRequestId && grant.orchestrationRunId && grant.targetNodeRunId) {
    const Request = dependencies.ApprovalRequest || ApprovalRequest;
    await Request.updateOne(
      { approvalRequestId: grant.approvalRequestId, organizationId: scope.organizationId },
      {
        $set: {
          orchestrationRunId: idOf(grant.orchestrationRunId),
          orchestrationNodeRunId: idOf(grant.targetNodeRunId),
          orchestrationNodeKey: targetNode?.nodeKey,
          interAgentDelegationGrantId: grant._id,
          interAgentDataContractId: contract._id,
          interAgentDataContractVersion: contract.version,
        },
      },
    );
  }
  metrics.increment('inter_agent_grants_created', { status: grant.status, depth: String(grant.delegationDepth) });
  await audit('inter_agent.grant.created', 'InterAgentDelegationGrant', grant, scope, { grantId: idOf(grant), contractId: idOf(contract), contractVersion: contract.version, status: grant.status, capability: contract.targetCapability, operation: contract.targetOperation, classification: contract.maximumDataClassification, purposeCode: contract.purposeCode, delegationDepth: grant.delegationDepth, approvalRequestId: grant.approvalRequestId }, dependencies);
  return grant;
}

async function createGrant(input = {}, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const scope = scopeFrom(input, caller);
  await authorize('interAgentDelegation.create', 'InterAgentDelegationGrant', null, scope, caller, {}, dependencies);
  await (dependencies.assertOperationalAccess || assertOperationalAccess)({ ...scope, operation: 'MUTATION' });
  return serializeGrant(await createGrantRecord(input, scope, caller, options));
}

async function scopedGrant(grantId, scope, options = {}, dependencies = {}) {
  if (!mongoose.isValidObjectId(grantId)) throw new AppError(404, 'INTER_AGENT_GRANT_NOT_FOUND', 'Delegation grant was not found.');
  const Model = dependencies.InterAgentDelegationGrant || InterAgentDelegationGrant;
  const query = Model.findOne({ _id: grantId, organizationId: scope.organizationId, workspaceId: scope.workspaceId });
  if (options.private) query.select('+passportPath +idempotencyReservationHashes');
  const grant = options.lean ? await query.lean() : await query;
  if (!grant) throw new AppError(404, 'INTER_AGENT_GRANT_NOT_FOUND', 'Delegation grant was not found.');
  return grant;
}

async function listGrants(input = {}, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const Model = dependencies.InterAgentDelegationGrant || InterAgentDelegationGrant;
  const scope = scopeFrom(input, caller);
  await authorize('interAgentDelegation.read', 'InterAgentDelegationGrant', null, scope, caller, {}, dependencies);
  const paging = pagination(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (input.status) {
    const statuses = String(input.status).split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (statuses.some((value) => !DELEGATION_GRANT_STATUSES.includes(value))) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Grant status filter is invalid.');
    filter.status = { $in: statuses };
  }
  if (input.contractId) {
    if (!mongoose.isValidObjectId(input.contractId)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Contract filter is invalid.');
    filter.contractId = input.contractId;
  }
  if (input.orchestrationRunId) {
    if (!mongoose.isValidObjectId(input.orchestrationRunId)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Run filter is invalid.');
    filter.orchestrationRunId = input.orchestrationRunId;
  }
  const search = safeSearch(input.search || input.q);
  if (search) filter.$or = [{ purpose: new RegExp(search, 'i') }, { purposeCode: new RegExp(search, 'i') }];
  const [items, total] = await Promise.all([Model.find(filter).sort({ createdAt: -1, _id: -1 }).skip(paging.skip).limit(paging.limit).lean(), Model.countDocuments(filter)]);
  return { items: items.map(serializeGrant), page: paging.page, limit: paging.limit, total };
}

async function getGrant(grantId, input = {}, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const scope = scopeFrom(input, caller);
  await authorize('interAgentDelegation.read', 'InterAgentDelegationGrant', grantId, scope, caller, {}, dependencies);
  return serializeGrant(await scopedGrant(grantId, scope, {}, dependencies));
}

async function revokeGrantRecord(grantId, scope, reasonCode, dependencies = {}) {
  const Model = dependencies.InterAgentDelegationGrant || InterAgentDelegationGrant;
  const Reference = dependencies.InterAgentDelegationReference || InterAgentDelegationReference;
  const now = new Date();
  const normalizedReason = String(reasonCode || 'ADMINISTRATOR_REVOKED').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]{0,127}$/.test(normalizedReason)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Revocation reason code is invalid.');
  let grant = await Model.findOneAndUpdate(
    { _id: grantId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, status: { $in: ['pending', 'active'] } },
    { $set: { status: 'revoked', revocationReasonCode: normalizedReason, revokedBy: scope.actorId, revokedAt: now } },
    { new: true },
  );
  if (!grant) {
    grant = await scopedGrant(grantId, scope, {}, dependencies);
    if (grant.status !== 'revoked') throw new AppError(409, 'INTER_AGENT_GRANT_TERMINAL', 'Delegation grant is already terminal.');
  }
  await Reference.updateMany({ delegationGrantId: grant._id, consumedAt: { $exists: false }, invalidatedAt: { $exists: false } }, { $set: { invalidatedAt: now } });
  return grant;
}

async function revokeGrant(grantId, input = {}, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const scope = scopeFrom(input, caller);
  await authorize('interAgentDelegation.revoke', 'InterAgentDelegationGrant', grantId, scope, caller, {}, dependencies);
  await (dependencies.assertOperationalAccess || assertOperationalAccess)({ ...scope, operation: 'MUTATION' });
  const started = Date.now();
  const grant = await revokeGrantRecord(grantId, scope, input.reasonCode, dependencies);
  metrics.increment('inter_agent_grants_revoked', { reason: grant.revocationReasonCode });
  metrics.observe('inter_agent_revocation_duration', Date.now() - started);
  await audit('inter_agent.grant.revoked', 'InterAgentDelegationGrant', grant, scope, { grantId: idOf(grant), contractId: idOf(grant.contractId), contractVersion: grant.contractVersion, status: grant.status, reasonCode: grant.revocationReasonCode }, dependencies);
  return serializeGrant(grant);
}

function invocationReservationFilter(grantId, scope, idempotencyKeyHash, now = new Date()) {
  return {
    _id: grantId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    status: 'active',
    validFrom: { $lte: now },
    expiresAt: { $gt: now },
    $expr: { $lt: ['$invocationCount', '$invocationLimit'] },
    idempotencyReservationHashes: { $ne: idempotencyKeyHash },
  };
}

async function reserveGrantInvocation(grant, idempotencyKeyHash, scope, options = {}) {
  const dependencies = options.dependencies || {};
  const Model = dependencies.InterAgentDelegationGrant || InterAgentDelegationGrant;
  const now = new Date(options.now || Date.now());
  const reserved = await Model.findOneAndUpdate(
    invocationReservationFilter(grant._id, scope, idempotencyKeyHash, now),
    {
      $inc: { invocationCount: 1 },
      $addToSet: { idempotencyReservationHashes: idempotencyKeyHash },
      $set: { firstUsedAt: grant.firstUsedAt || now },
    },
    { new: true },
  ).select('+idempotencyReservationHashes');
  if (!reserved) {
    const existing = await Model.findOne({ _id: grant._id, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).select('+idempotencyReservationHashes').lean();
    if (existing?.idempotencyReservationHashes?.includes(idempotencyKeyHash)) return { grant: existing, replayed: true };
    if (existing?.expiresAt && new Date(existing.expiresAt) <= now && existing.status === 'active') {
      const expiration = await Model.updateOne({ _id: existing._id, status: 'active' }, { $set: { status: 'expired' } });
      if (expiration.modifiedCount) {
        metrics.increment('inter_agent_grants_expired', { status: 'expired' });
        await audit('inter_agent.grant.expired', 'InterAgentDelegationGrant', existing, scope, { grantId: idOf(existing), contractId: idOf(existing.contractId), contractVersion: existing.contractVersion, status: 'expired' }, dependencies);
      }
    }
    throw new AppError(409, existing?.status === 'pending' ? ErrorCodes.APPROVAL_PENDING : existing?.status === 'revoked' ? 'INTER_AGENT_GRANT_REVOKED' : existing?.status === 'expired' ? 'INTER_AGENT_GRANT_EXPIRED' : 'INTER_AGENT_GRANT_EXHAUSTED', 'Delegation grant cannot reserve another invocation.');
  }
  if (reserved.invocationCount >= reserved.invocationLimit) {
    const exhaustion = await Model.updateOne({ _id: reserved._id, status: 'active', invocationCount: { $gte: reserved.invocationLimit } }, { $set: { status: 'exhausted' } });
    reserved.status = 'exhausted';
    if (exhaustion.modifiedCount) {
      metrics.increment('inter_agent_grants_exhausted', { status: 'exhausted' });
      await audit('inter_agent.grant.exhausted', 'InterAgentDelegationGrant', reserved, scope, { grantId: idOf(reserved), contractId: idOf(reserved.contractId), contractVersion: reserved.contractVersion, status: 'exhausted' }, dependencies);
    }
  }
  if (!grant.firstUsedAt) await audit('inter_agent.grant.activated', 'InterAgentDelegationGrant', reserved, scope, { grantId: idOf(reserved), contractId: idOf(reserved.contractId), contractVersion: reserved.contractVersion, status: reserved.status, invocationCount: reserved.invocationCount }, dependencies);
  return { grant: reserved, replayed: false };
}

async function activateApprovedGrant(grant, scope, dependencies = {}) {
  if (grant.status !== 'pending') return grant;
  const Request = dependencies.ApprovalRequest || ApprovalRequest;
  const expire = dependencies.expireIfNeeded || expireIfNeeded;
  let request = await Request.findOne({ approvalRequestId: grant.approvalRequestId, organizationId: scope.organizationId });
  if (!request) throw new AppError(409, ErrorCodes.APPROVAL_REQUEST_NOT_FOUND, 'Delegation approval request is unavailable.');
  request = await expire(request);
  if (request.status === 'APPROVED') {
    const Model = dependencies.InterAgentDelegationGrant || InterAgentDelegationGrant;
    const active = await Model.findOneAndUpdate({ _id: grant._id, status: 'pending' }, { $set: { status: 'active', approvedBy: 'approval-system', approvedAt: new Date() } }, { new: true });
    return active || grant;
  }
  if (['PENDING', 'PARTIALLY_APPROVED'].includes(request.status)) throw new AppError(409, ErrorCodes.APPROVAL_PENDING, 'Delegation approval is pending.');
  const terminal = request.status === 'EXPIRED' ? 'expired' : 'rejected';
  const Model = dependencies.InterAgentDelegationGrant || InterAgentDelegationGrant;
  await Model.updateOne({ _id: grant._id, status: 'pending' }, { $set: { status: terminal } });
  throw new AppError(403, request.status === 'EXPIRED' ? ErrorCodes.APPROVAL_EXPIRED : ErrorCodes.APPROVAL_REJECTED, 'Delegation approval was not granted.');
}

async function issueDelegationReference(grant, invocation, options = {}) {
  const dependencies = options.dependencies || {};
  const Model = dependencies.InterAgentDelegationReference || InterAgentDelegationReference;
  const now = new Date(options.now || Date.now());
  const token = crypto.randomBytes(32).toString('base64url');
  const referenceHash = secureDigest('internal-delegation-reference', token);
  const expiresAt = new Date(Math.min(new Date(grant.expiresAt).getTime(), now.getTime() + INTER_AGENT_LIMITS.internalReferenceLifetimeMs));
  await Model.create({
    referenceHash,
    delegationGrantId: grant._id,
    delegationInvocationId: invocation._id,
    organizationId: grant.organizationId,
    workspaceId: grant.workspaceId,
    orchestrationRunId: grant.orchestrationRunId,
    sourceNodeRunId: grant.sourceNodeRunId,
    targetNodeRunId: grant.targetNodeRunId,
    contractId: grant.contractId,
    contractVersion: grant.contractVersion,
    audience: 'ghost-bridge-runtime-gateway',
    nonce: crypto.randomBytes(16).toString('hex'),
    issuedAt: now,
    expiresAt,
  });
  return token;
}

async function consumeDelegationReference(reference, expected = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const Model = dependencies.InterAgentDelegationReference || InterAgentDelegationReference;
  const now = new Date(options.now || Date.now());
  const referenceHash = secureDigest('internal-delegation-reference', String(reference || ''));
  const consumed = await Model.findOneAndUpdate(
    {
      referenceHash,
      audience: 'ghost-bridge-runtime-gateway',
      organizationId: expected.organizationId,
      workspaceId: expected.workspaceId,
      delegationGrantId: expected.delegationGrantId,
      delegationInvocationId: expected.delegationInvocationId,
      expiresAt: { $gt: now },
      consumedAt: { $exists: false },
      invalidatedAt: { $exists: false },
    },
    { $set: { consumedAt: now } },
    { new: true },
  ).select('-referenceHash -nonce');
  if (!consumed) throw new AppError(403, 'INTER_AGENT_REFERENCE_INVALID', 'Internal delegation reference is invalid or expired.');
  return consumed;
}

async function prepareDelegatedInvocation(input = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const InvocationModel = dependencies.InterAgentDelegationInvocation || InterAgentDelegationInvocation;
  const ContractModel = dependencies.InterAgentDataContract || InterAgentDataContract;
  const scope = systemScope(input);
  const now = new Date(options.now || Date.now());
  let grant = await scopedGrant(input.grantId, scope, { private: true }, dependencies);
  const idempotencyKeyHash = secureDigest('inter-agent-invocation-idempotency', String(input.idempotencyKey || `${idOf(grant.orchestrationRunId)}:${idOf(grant.sourceNodeRunId)}:${idOf(grant.targetNodeRunId)}:${idOf(grant.contractId)}`));
  const existing = await InvocationModel.findOne({ delegationGrantId: grant._id, idempotencyKeyHash }).select('+idempotencyKeyHash').lean();
  if (grant.status === 'pending') grant = await activateApprovedGrant(grant, scope, dependencies);
  const replayAllowed = Boolean(existing);
  if (!replayAllowed && grant.status !== 'active') throw new AppError(409, grant.status === 'revoked' ? 'INTER_AGENT_GRANT_REVOKED' : grant.status === 'expired' ? 'INTER_AGENT_GRANT_EXPIRED' : grant.status === 'exhausted' ? 'INTER_AGENT_GRANT_EXHAUSTED' : 'INTER_AGENT_GRANT_INACTIVE', 'Delegation grant is not active.');
  if (new Date(grant.validFrom) > now || new Date(grant.expiresAt) <= now) throw new AppError(409, 'INTER_AGENT_GRANT_EXPIRED', 'Delegation grant is outside its validity window.');
  if (input.sourceNodeRunId && idOf(input.sourceNodeRunId) !== idOf(grant.sourceNodeRunId)) throw new AppError(403, 'INTER_AGENT_SOURCE_IDENTITY_MISMATCH', 'Source node is not authorized by this grant.');
  if (input.targetNodeRunId && idOf(input.targetNodeRunId) !== idOf(grant.targetNodeRunId)) throw new AppError(403, 'INTER_AGENT_TARGET_IDENTITY_MISMATCH', 'Target node is not authorized by this grant.');
  const contract = await ContractModel.findOne({ _id: grant.contractId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, version: grant.contractVersion, status: { $in: ['active', 'archived'] } }).select('+inputSchemaHash +outputSchemaHash').lean();
  if (!contract) throw new AppError(409, 'DATA_CONTRACT_VERSION_UNAVAILABLE', 'Frozen contract version is unavailable.');
  if (schemaHash(contract.allowedInputSchema) !== grant.allowedInputSchemaHash || schemaHash(contract.allowedOutputSchema) !== grant.allowedOutputSchemaHash) throw new AppError(409, 'DATA_CONTRACT_VERSION_INVALID', 'Frozen contract schema hashes do not match the grant.');
  const identity = grantIdentity(grant);
  const actors = await loadGrantActors(identity, scope, dependencies);
  await authorize('interAgentDelegation.evaluate', 'InterAgentDelegationGrant', grant._id, scope, {}, { trustedConnection: actors.targetConnection, trustedPassport: actors.targetPassport }, dependencies);
  if (input.retry === true) await authorize('orchestration.node.retry', 'InterAgentDelegationGrant', grant._id, scope, {}, { trustedConnection: actors.targetConnection, trustedPassport: actors.targetPassport }, dependencies);
  await (dependencies.assertOperationalAccess || assertOperationalAccess)({ organizationId: scope.organizationId, partnerId: scope.partnerId, workspaceId: scope.workspaceId, connectionId: grant.targetConnectionId, operation: 'EXECUTION', existingClaim: true });
  const effectiveDataClassification = highestClassification([
    input.dataClassification,
    input.sourceSchemaClassification,
    input.policyClassification,
    contract.allowedInputSchema?.['x-data-classification'],
  ].filter(Boolean), contract.maximumDataClassification || 'restricted');
  assertClassificationAllowed(effectiveDataClassification, contract, actors.targetCatalog);
  assertRegionResidency(contract, actors.targetCatalog, { residencyRequirements: input.residencyRequirements });
  const processed = processDelegatedInput(input.sourceOutput, contract, { runInput: input.runInput, metadata: input.metadata, dependency: input.dependency });
  const payload = validateAgainstSchema(contract.allowedInputSchema, processed.payload, { path: '$delegation.input', code: 'INTER_AGENT_TARGET_INPUT_INVALID', message: 'Delegated input does not match the frozen contract schema.' });
  let reservation = { grant, replayed: true };
  if (!existing) reservation = await reserveGrantInvocation(grant, idempotencyKeyHash, scope, { ...options, dependencies });
  let invocation = existing;
  if (!invocation) {
    try {
      invocation = await InvocationModel.create({
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        delegationGrantId: grant._id,
        contractId: grant.contractId,
        contractVersion: grant.contractVersion,
        orchestrationRunId: grant.orchestrationRunId,
        sourceNodeRunId: grant.sourceNodeRunId,
        targetNodeRunId: grant.targetNodeRunId,
        sourcePassportId: grant.sourcePassportId,
        targetPassportId: grant.targetPassportId,
        sourceConnectionId: grant.sourceConnectionId,
        targetConnectionId: grant.targetConnectionId,
        capability: grant.targetCapability,
        operation: grant.targetOperation,
        purposeCode: grant.purposeCode,
        status: 'prepared',
        invocationOrdinal: reservation.grant.invocationCount,
        idempotencyKeyHash,
        effectiveDataClassification,
        delegatedFieldCount: processed.statistics.delegatedFieldCount,
        removedFieldCount: processed.statistics.removedFieldCount,
        redactedFieldCount: processed.statistics.redactedFieldCount,
        transformedFieldCount: processed.statistics.transformedFieldCount,
        approximateInputBytes: processed.statistics.delegatedApproximateByteSize,
        sourceSchemaHash: grant.allowedInputSchemaHash,
        targetSchemaHash: grant.allowedOutputSchemaHash,
        policyDecisionCategory: 'allow',
        approvalRequestId: grant.approvalRequestId,
        requestId: input.requestId || scope.requestId,
        traceId: input.traceId || scope.traceId,
        parentTraceId: input.parentTraceId,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      invocation = await InvocationModel.findOne({ delegationGrantId: grant._id, idempotencyKeyHash }).select('+idempotencyKeyHash');
      if (!invocation) throw error;
    }
    metrics.increment('inter_agent_invocations', { status: 'prepared', classification: effectiveDataClassification, depth: String(grant.delegationDepth), sizeCategory: sizeCategory(processed.statistics.delegatedApproximateByteSize) });
    await audit('inter_agent.invocation.prepared', 'InterAgentDelegationInvocation', invocation, scope, { delegationGrantId: idOf(grant), contractId: idOf(contract), contractVersion: contract.version, capability: grant.targetCapability, operation: grant.targetOperation, purposeCode: grant.purposeCode, classification: effectiveDataClassification, delegatedFieldCount: processed.statistics.delegatedFieldCount, removedFieldCount: processed.statistics.removedFieldCount, redactedFieldCount: processed.statistics.redactedFieldCount, transformedFieldCount: processed.statistics.transformedFieldCount, sizeCategory: sizeCategory(processed.statistics.delegatedApproximateByteSize), status: 'prepared' }, dependencies);
    await audit('inter_agent.data.extracted', 'InterAgentDelegationInvocation', invocation, scope, { delegationGrantId: idOf(grant), contractId: idOf(contract), contractVersion: contract.version, classification: effectiveDataClassification, delegatedFieldCount: processed.statistics.delegatedFieldCount, removedFieldCount: processed.statistics.removedFieldCount, sizeCategory: sizeCategory(processed.statistics.delegatedApproximateByteSize) }, dependencies);
    await audit('inter_agent.data.transformed', 'InterAgentDelegationInvocation', invocation, scope, { delegationGrantId: idOf(grant), contractId: idOf(contract), contractVersion: contract.version, transformedFieldCount: processed.statistics.transformedFieldCount }, dependencies);
    await audit('inter_agent.data.redacted', 'InterAgentDelegationInvocation', invocation, scope, { delegationGrantId: idOf(grant), contractId: idOf(contract), contractVersion: contract.version, redactedFieldCount: processed.statistics.redactedFieldCount }, dependencies);
    await audit('inter_agent.data.minimized', 'InterAgentDelegationInvocation', invocation, scope, { delegationGrantId: idOf(grant), contractId: idOf(contract), contractVersion: contract.version, delegatedFieldCount: processed.statistics.delegatedFieldCount, removedFieldCount: processed.statistics.removedFieldCount, sizeCategory: sizeCategory(processed.statistics.delegatedApproximateByteSize) }, dependencies);
    metrics.increment('inter_agent_redacted_fields', { classification: effectiveDataClassification }, processed.statistics.redactedFieldCount);
    metrics.increment('inter_agent_minimized_fields', { classification: effectiveDataClassification }, processed.statistics.removedFieldCount);
  }
  const reference = await issueDelegationReference(reservation.grant, invocation, { ...options, dependencies });
  return { grant: reservation.grant, contract, invocation, payload, processed, reference, idempotencyReplayed: Boolean(existing || reservation.replayed), actors };
}

function safeFailure(error) {
  const code = String(error?.code || 'INTER_AGENT_INVOCATION_FAILED').toUpperCase();
  return {
    safeFailureCode: /^[A-Z][A-Z0-9_]{0,127}$/.test(code) ? code : 'INTER_AGENT_INVOCATION_FAILED',
    safeFailureMessage: String(error instanceof AppError ? error.message : 'Delegated invocation failed safely.').slice(0, 500),
    retryability: error?.retryable === true,
  };
}

async function failDelegatedInvocation(invocationId, error, scopeInput = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const Model = dependencies.InterAgentDelegationInvocation || InterAgentDelegationInvocation;
  const scope = systemScope(scopeInput);
  const failure = safeFailure(error);
  const invocation = await Model.findOneAndUpdate({ _id: invocationId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, status: { $in: ['prepared', 'approval_required', 'invoking', 'failed'] } }, { $set: { status: 'failed', ...failure, completedAt: new Date() } }, { new: true });
  if (invocation) {
    metrics.increment('inter_agent_invocations_failed', { reason: failure.safeFailureCode, classification: invocation.effectiveDataClassification });
    await audit('inter_agent.invocation.failed', 'InterAgentDelegationInvocation', invocation, scope, { delegationGrantId: idOf(invocation.delegationGrantId), contractId: idOf(invocation.contractId), contractVersion: invocation.contractVersion, status: 'failed', reasonCode: failure.safeFailureCode, classification: invocation.effectiveDataClassification }, dependencies);
  }
  return invocation;
}

function processRuntimeDelegatedOutput(prepared, rawOutput, outputSchema) {
  const targetValidated = validateAgainstSchema(prepared.actors.targetCatalog.capabilities.find((item) => item.capabilityKey === prepared.grant.targetCapability)?.outputSchema || prepared.contract.allowedOutputSchema, rawOutput, { path: '$target.output', code: 'INTER_AGENT_TARGET_OUTPUT_INVALID', message: 'Target Agent Passport output schema validation failed.' });
  const contractValidated = validateAgainstSchema(prepared.contract.allowedOutputSchema, targetValidated, { path: '$delegation.output', code: 'INTER_AGENT_CONTRACT_OUTPUT_INVALID', message: 'Delegated output does not match the frozen contract schema.' });
  const processed = processDelegatedOutput(contractValidated, prepared.contract);
  const output = outputSchema ? validateAgainstSchema(outputSchema, processed.payload, { path: '$orchestration.node.output', code: 'ORCHESTRATION_NODE_OUTPUT_INVALID', message: 'Delegated output does not match the orchestration node schema.' }) : processed.payload;
  return { output, processed };
}

async function completeDelegatedInvocation(prepared, runtimeInvocation, outputSchema, options = {}) {
  const dependencies = options.dependencies || {};
  const Model = dependencies.InterAgentDelegationInvocation || InterAgentDelegationInvocation;
  const scope = systemScope({ organizationId: prepared.grant.organizationId, workspaceId: prepared.grant.workspaceId, requestId: prepared.invocation.requestId, traceId: prepared.invocation.traceId });
  const result = options.preprocessedOutput || processRuntimeDelegatedOutput(prepared, runtimeInvocation.output, outputSchema);
  const { processed } = result;
  const orchestrationOutput = result.output;
  const invocation = await Model.findOneAndUpdate({ _id: prepared.invocation._id, status: { $in: ['prepared', 'invoking', 'failed'] } }, { $set: { status: 'succeeded', runtimeInvocationId: runtimeInvocation.invocationId, approximateOutputBytes: processed.statistics.approximateOutputBytes, startedAt: prepared.invocation.startedAt || new Date(), completedAt: new Date(), safeFailureCode: undefined, safeFailureMessage: undefined, retryability: false } }, { new: true });
  metrics.increment('inter_agent_invocations_succeeded', { classification: prepared.invocation.effectiveDataClassification, sizeCategory: sizeCategory(processed.statistics.approximateOutputBytes) });
  await audit('inter_agent.invocation.succeeded', 'InterAgentDelegationInvocation', invocation || prepared.invocation, scope, { delegationGrantId: idOf(prepared.grant), contractId: idOf(prepared.contract), contractVersion: prepared.contract.version, capability: prepared.grant.targetCapability, operation: prepared.grant.targetOperation, purposeCode: prepared.grant.purposeCode, classification: prepared.invocation.effectiveDataClassification, delegatedFieldCount: processed.statistics.delegatedFieldCount, removedFieldCount: processed.statistics.removedFieldCount, sizeCategory: sizeCategory(processed.statistics.approximateOutputBytes), status: 'succeeded' }, dependencies);
  return { output: orchestrationOutput, invocation: invocation || prepared.invocation, processed };
}

async function executeDelegatedInvocation(input = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const started = Date.now();
  const prepared = await prepareDelegatedInvocation(input, options);
  const scope = systemScope(input);
  try {
    await consumeDelegationReference(prepared.reference, { organizationId: scope.organizationId, workspaceId: scope.workspaceId, delegationGrantId: prepared.grant._id, delegationInvocationId: prepared.invocation._id }, { ...options, dependencies });
    const InvocationModel = dependencies.InterAgentDelegationInvocation || InterAgentDelegationInvocation;
    await InvocationModel.updateOne({ _id: prepared.invocation._id, status: { $in: ['prepared', 'failed'] } }, { $set: { status: 'invoking', startedAt: new Date() } });
    await audit('inter_agent.invocation.started', 'InterAgentDelegationInvocation', prepared.invocation, scope, { delegationGrantId: idOf(prepared.grant), contractId: idOf(prepared.contract), contractVersion: prepared.contract.version, status: 'invoking', classification: prepared.invocation.effectiveDataClassification }, dependencies);
    const invoke = dependencies.invokeThroughRuntimeGateway || invokeThroughRuntimeGateway;
    let preprocessedOutput;
    const runtimeInvocation = await invoke(idOf(prepared.grant.targetConnectionId), prepared.grant.targetCapability, prepared.payload, {
      actorType: 'service_account', actorId: input.requestedBy || scope.actorId, type: 'service_account', id: input.requestedBy || scope.actorId,
      partnerId: scope.organizationId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, receivingWorkspaceId: scope.workspaceId,
      skipPersistentRoles: true, requestId: prepared.invocation.requestId, traceId: prepared.invocation.traceId,
      idempotencyKey: `inter-agent:${idOf(prepared.grant)}:${idOf(prepared.invocation)}`,
      approvalRequestId: prepared.grant.approvalRequestId, signal: input.signal,
      orchestrationContext: input.orchestrationContext,
      delegationContext: {
        delegationGrantId: idOf(prepared.grant), delegationInvocationId: idOf(prepared.invocation), contractId: idOf(prepared.contract), contractVersion: prepared.contract.version,
        sourcePassportId: idOf(prepared.grant.sourcePassportId), targetPassportId: idOf(prepared.grant.targetPassportId), orchestrationRunId: idOf(prepared.grant.orchestrationRunId),
        sourceNodeRunId: idOf(prepared.grant.sourceNodeRunId), targetNodeRunId: idOf(prepared.grant.targetNodeRunId), delegationDepth: prepared.grant.delegationDepth,
        effectiveDataClassification: prepared.invocation.effectiveDataClassification, purposeCode: prepared.grant.purposeCode,
        traceId: prepared.invocation.traceId, parentTraceId: prepared.invocation.parentTraceId, requestId: prepared.invocation.requestId,
      },
      ...(input.compensationContext
        ? { compensationContext: safeClone(input.compensationContext) }
        : {}),
      onInvocationCreated: input.onInvocationCreated,
      transformValidatedOutput(output) {
        preprocessedOutput = processRuntimeDelegatedOutput(prepared, output, input.outputSchema);
        return preprocessedOutput.output;
      },
    });
    const completed = await completeDelegatedInvocation(prepared, runtimeInvocation, input.outputSchema, { ...options, dependencies, preprocessedOutput });
    metrics.observe('inter_agent_invocation_duration', Date.now() - started);
    return { ...runtimeInvocation, output: completed.output, delegationInvocationId: idOf(completed.invocation), delegationGrantId: idOf(prepared.grant), idempotencyReplayed: prepared.idempotencyReplayed };
  } catch (error) {
    await failDelegatedInvocation(prepared.invocation._id, error, scope, { ...options, dependencies });
    throw error;
  }
}

async function previewDelegation(input = {}, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const scope = scopeFrom(input, caller);
  await authorize('interAgentDelegation.preview', 'InterAgentDelegationGrant', input.grantId || input.contractId, scope, caller, {}, dependencies);
  const contract = await scopedContract(input.contractId, scope, { lean: true }, dependencies);
  if (!['draft', 'active'].includes(contract.status)) throw new AppError(409, 'DATA_CONTRACT_INACTIVE', 'Archived contracts cannot be previewed.');
  const processed = processDelegatedInput(input.sourceOutput || {}, contract, { runInput: input.runInput, metadata: input.metadata });
  validateAgainstSchema(contract.allowedInputSchema, processed.payload, { path: '$delegation.preview', code: 'INTER_AGENT_TARGET_INPUT_INVALID', message: 'Preview does not match the target schema.' });
  await audit('inter_agent.data.minimized', 'InterAgentDataContract', contract, scope, { contractId: idOf(contract), contractVersion: contract.version, fieldNames: Object.keys(processed.payload).sort(), delegatedFieldCount: processed.statistics.delegatedFieldCount, removedFieldCount: processed.statistics.removedFieldCount, redactedFieldCount: processed.statistics.redactedFieldCount, transformedFieldCount: processed.statistics.transformedFieldCount, sizeCategory: sizeCategory(processed.statistics.delegatedApproximateByteSize) }, dependencies);
  return { contractId: idOf(contract), contractVersion: contract.version, fieldNames: Object.keys(processed.payload).sort(), statistics: processed.statistics, schemaValid: true, invoked: false, invocationCountConsumed: 0 };
}

async function evaluateDelegation(input = {}, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const scope = scopeFrom(input, caller);
  await authorize('interAgentDelegation.evaluate', 'InterAgentDataContract', input.contractId, scope, caller, {}, dependencies);
  await (dependencies.assertOperationalAccess || assertOperationalAccess)({ ...scope, operation: 'EXECUTION' });
  const contract = await scopedContract(input.contractId, scope, { lean: true }, dependencies);
  const validation = await validateContractEntity(contract, scope, { now: options.now, activation: true }, dependencies);
  if (!validation.valid) return { decision: 'deny', reasonCode: validation.errors[0]?.code || 'DATA_CONTRACT_INVALID', contractId: idOf(contract), contractVersion: contract.version, invocationCountConsumed: 0 };
  const classification = highestClassification([input.dataClassification].filter(Boolean), contract.maximumDataClassification);
  return { decision: contract.requireApproval ? 'approval_required' : 'allow', reasonCode: contract.requireApproval ? 'CONTRACT_APPROVAL_REQUIRED' : 'DATA_CONTRACT_ALLOWED', contractId: idOf(contract), contractVersion: contract.version, classification, invocationCountConsumed: 0 };
}

async function listInvocations(input = {}, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const Model = dependencies.InterAgentDelegationInvocation || InterAgentDelegationInvocation;
  const scope = scopeFrom(input, caller);
  await authorize('interAgentDelegationInvocation.read', 'InterAgentDelegationInvocation', null, scope, caller, {}, dependencies);
  const paging = pagination(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (input.status) {
    const statuses = String(input.status).split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (statuses.some((value) => !DELEGATION_INVOCATION_STATUSES.includes(value))) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invocation status filter is invalid.');
    filter.status = { $in: statuses };
  }
  if (input.grantId) {
    if (!mongoose.isValidObjectId(input.grantId)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Grant filter is invalid.');
    filter.delegationGrantId = input.grantId;
  }
  if (input.orchestrationRunId) {
    if (!mongoose.isValidObjectId(input.orchestrationRunId)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Run filter is invalid.');
    filter.orchestrationRunId = input.orchestrationRunId;
  }
  const search = safeSearch(input.search || input.q);
  if (search) filter.$or = [{ capability: new RegExp(search, 'i') }, { operation: new RegExp(search, 'i') }, { purposeCode: new RegExp(search, 'i') }];
  const [items, total] = await Promise.all([Model.find(filter).sort({ createdAt: -1, _id: -1 }).skip(paging.skip).limit(paging.limit).lean(), Model.countDocuments(filter)]);
  return { items: items.map(serializeInvocation), page: paging.page, limit: paging.limit, total };
}

async function getInvocation(invocationId, input = {}, caller = {}, options = {}) {
  const dependencies = options.dependencies || {};
  const Model = dependencies.InterAgentDelegationInvocation || InterAgentDelegationInvocation;
  const scope = scopeFrom(input, caller);
  await authorize('interAgentDelegationInvocation.readDetails', 'InterAgentDelegationInvocation', invocationId, scope, caller, {}, dependencies);
  if (!mongoose.isValidObjectId(invocationId)) throw new AppError(404, 'INTER_AGENT_INVOCATION_NOT_FOUND', 'Delegation invocation was not found.');
  const invocation = await Model.findOne({ _id: invocationId, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).lean();
  if (!invocation) throw new AppError(404, 'INTER_AGENT_INVOCATION_NOT_FOUND', 'Delegation invocation was not found.');
  return serializeInvocation(invocation);
}

async function closeRunGrants(runId, status, scopeInput, options = {}) {
  const dependencies = options.dependencies || {};
  const Model = dependencies.InterAgentDelegationGrant || InterAgentDelegationGrant;
  const Reference = dependencies.InterAgentDelegationReference || InterAgentDelegationReference;
  const scope = systemScope(scopeInput);
  const now = new Date();
  const targetStatus = status === 'completed' ? 'completed' : 'revoked';
  const reason = status === 'cancelled' ? 'ORCHESTRATION_CANCELLED' : 'ORCHESTRATION_TERMINATED';
  const result = await Model.updateMany({ orchestrationRunId: runId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, status: { $in: ['pending', 'active'] } }, { $set: targetStatus === 'completed' ? { status: targetStatus, completedAt: now } : { status: targetStatus, revokedAt: now, revokedBy: scope.actorId, revocationReasonCode: reason } });
  await Reference.updateMany({ orchestrationRunId: runId, consumedAt: { $exists: false }, invalidatedAt: { $exists: false } }, { $set: { invalidatedAt: now } });
  return { closed: result.modifiedCount, status: targetStatus };
}

async function ensureInterAgentDelegationIndexes() {
  await Promise.all([InterAgentDataContract.createIndexes(), InterAgentDelegationGrant.createIndexes(), InterAgentDelegationInvocation.createIndexes(), InterAgentDelegationReference.createIndexes()]);
}

module.exports = {
  activateContract,
  archiveContract,
  capabilityMatches,
  closeRunGrants,
  completeDelegatedInvocation,
  consumeDelegationReference,
  createContract,
  createGrant,
  createGrantRecord,
  ensureInterAgentDelegationIndexes,
  evaluateDelegation,
  executeDelegatedInvocation,
  failDelegatedInvocation,
  getContract,
  getGrant,
  getInvocation,
  invocationReservationFilter,
  issueDelegationReference,
  listContracts,
  listGrants,
  listInvocations,
  prepareDelegatedInvocation,
  previewDelegation,
  processRuntimeDelegatedOutput,
  reserveGrantInvocation,
  revokeGrant,
  revokeGrantRecord,
  selectorMatchesCandidate,
  serializeContract,
  serializeGrant,
  serializeInvocation,
  updateContract,
  validateContract,
  validateContractEntity,
  validateSelectorReferences,
};
