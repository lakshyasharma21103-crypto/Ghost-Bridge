const mongoose = require('mongoose');
const CapabilityCatalogEntry = require('../models/CapabilityCatalogEntry');
const AgentSelectionPolicy = require('../models/AgentSelectionPolicy');
const AgentSelectionDecision = require('../models/AgentSelectionDecision');
const AgentPassport = require('../models/AgentPassport');
const PassportConnection = require('../models/PassportConnection');
const Capability = require('../models/Capability');
const CircuitBreaker = require('../models/CircuitBreaker');
const ApprovalRequest = require('../models/ApprovalRequest');
const { env } = require('../config/env');
const { actorFromPartner, assertAuthorized } = require('./authorization.service');
const { assertOperationalAccess } = require('./operationalState.service');
const { createAuditLog } = require('./auditService');
const { createApprovalRequest, evaluateApprovalRequirement, expireIfNeeded } = require('./approval.service');
const { assertSafePayload } = require('./orchestrationValidation.service');
const { canonicalize, isDuplicateKeyError, secureDigest } = require('../utils/idempotency');
const { sha256 } = require('../utils/complianceCanonical');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  AGENT_SELECTION_LIMITS,
  COST_CLASSES,
  DATA_CLASSIFICATIONS,
  HEALTH_STATUSES,
  LATENCY_CLASSES,
  READINESS_STATUSES,
  SELECTION_DECISION_STATUSES,
  SELECTION_POLICY_STATUSES,
  TRUST_TIERS,
  VERIFICATION_STATUSES,
} = require('../constants/agentSelection');
const {
  catalogSourceVersion,
  normalizePassportCapabilities,
} = require('./capabilityNormalization.service');
const {
  checkSchemaCompatibility,
  sanitizeSchema,
  validateSchema,
} = require('./schemaCompatibility.service');
const {
  candidateSnapshotHash,
  compareCandidates,
  effectiveConstraints,
  mandatoryFilter,
  normalizePolicyInput,
  safeCandidate,
  scoreCandidate,
  selectionRequiresApproval,
} = require('./agentSelectionEngine.service');
const metrics = require('./agentSelectionMetrics.service');
const {
  filterQuarantinedCandidates,
  listQuarantinedConnectionIds,
} = require('./orchestrationObservability.service');

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function assertAllowedKeys(value, allowed, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const unknown = Object.keys(value).filter((key) => !allowed.has(key)).sort();
  if (unknown.length) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request contains unsupported fields.', unknown.slice(0, 20).map((key) => ({
      path: `${path}.${key}`,
      code: 'UNSUPPORTED_FIELD',
      message: 'Unsupported fields and arbitrary expressions are not accepted.',
    })));
  }
}

const POLICY_INPUT_KEYS = new Set([
  'workspaceId', 'receivingWorkspaceId', 'name', 'description', 'capabilityRequirements', 'allowedCapabilityCategories',
  'allowedPassportIds', 'deniedPassportIds', 'allowedPublishers', 'deniedPublishers',
  'minimumTrustTier', 'requiredVerificationStatuses', 'allowedRegions', 'requiredResidencyRegions',
  'allowedDataClassifications', 'maximumCostClass', 'maximumLatencyClass', 'requireHealthy',
  'requireReady', 'allowOpenCircuit', 'allowRateLimitedCandidate', 'allowUncertainSchemaCompatibility',
  'requireApprovalWhen', 'scoreWeights', 'fallbackCandidateCount', 'fallbackCandidatesPermitted',
  'userPreferenceOverridesPermitted', 'tieBreaker',
]);
const SELECTION_INPUT_KEYS = new Set([
  'workspaceId', 'receivingWorkspaceId', 'capability', 'operation', 'inputSchema',
  'requiredOutputSchema', 'constraints', 'preferredPassportIds', 'excludedPassportIds',
  'selectionPolicyId', 'candidateLimit', 'fallbackCandidateCount', 'orchestrationDefinitionId',
  'orchestrationRunId', 'orchestrationNodeKey',
]);
const CONSTRAINT_KEYS = new Set([
  'minimumTrustTier', 'maximumCostClass', 'maximumLatencyClass', 'allowedRegions',
  'requiredResidencyRegions', 'dataClassification', 'requireHealthy', 'requireReady',
  'allowOpenCircuit', 'allowRateLimitedCandidate',
]);

function callerScope(input = {}, caller = {}) {
  const partnerId = idOf(caller.partner);
  if (!partnerId) throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Partner API key is required.');
  const workspaceId = String(input.workspaceId || input.receivingWorkspaceId || '').trim();
  if (!workspaceId) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [{ path: 'workspaceId', code: 'WORKSPACE_REQUIRED', message: 'workspaceId is required.' }]);
  }
  return {
    organizationId: partnerId,
    partnerId,
    workspaceId,
    actorId: `partner:${partnerId}`,
    actorType: 'partner',
    requestId: caller.requestId || `req_${secureDigest('agent-selection-request', `${partnerId}:${workspaceId}:${Date.now()}`).slice(-48)}`,
    traceId: caller.traceId || `trace_${secureDigest('agent-selection-trace', `${partnerId}:${workspaceId}:${Date.now()}`).slice(-48)}`,
  };
}

function resource(type, id, scope) {
  return { type, id: idOf(id) || `${type.toLowerCase()}:${scope.workspaceId}`, organizationId: scope.organizationId, partnerId: scope.partnerId, workspaceId: scope.workspaceId };
}

function actor(scope, caller) {
  return actorFromPartner(caller.partner, {
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    requestId: scope.requestId,
    traceId: scope.traceId,
  });
}

async function authorize(permission, type, entityId, scope, caller, context = {}) {
  return assertAuthorized(actor(scope, caller), permission, resource(type, entityId, scope), {
    requestId: scope.requestId,
    traceId: scope.traceId,
    workspaceId: scope.workspaceId,
    ...context,
  });
}

async function audit(action, type, entityId, scope, metadata = {}) {
  return createAuditLog(scope.actorType, scope.actorId, action, type, idOf(entityId), {
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    receivingWorkspaceId: scope.workspaceId,
    ...metadata,
  }, { requestId: scope.requestId, traceId: scope.traceId });
}

function pagination(input = {}) {
  const page = Number(input.page || 1);
  const limit = Number(input.limit || 25);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > AGENT_SELECTION_LIMITS.maximumListLimit) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Pagination is invalid.');
  }
  return { page, limit, skip: (page - 1) * limit };
}

function safeSearch(value) {
  const normalized = String(value || '').trim().slice(0, AGENT_SELECTION_LIMITS.maximumSearchLength);
  return normalized ? normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
}

function worstCircuit(circuits, now) {
  const state = circuits.some((item) => item.state === 'open') ? 'open' : circuits.some((item) => item.state === 'half_open') ? 'half_open' : 'closed';
  const rateLimitedUntil = circuits.map((item) => item.rateLimitedUntil).filter((value) => value && new Date(value) > now).sort((left, right) => new Date(right) - new Date(left))[0];
  return { state, rateLimitedUntil };
}

async function refreshCapabilityCatalog(input = {}, caller = {}, options = {}) {
  const scope = options.scope || callerScope(input, caller);
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const freshnessMs = Number(env.AGENT_SELECTION_HEALTH_FRESHNESS_MS || 300_000);
  const connections = await PassportConnection.find({
    receivingWorkspaceId: scope.workspaceId,
    $or: [{ partnerId: scope.partnerId }, { organizationId: scope.organizationId }],
  })
    .select('_id passportId status installScope healthStatus lastHealthStatus lastHealthCheckedAt lastHealthSuccessAt updatedAt')
    .lean();
  const passportIds = [...new Set(connections.map((item) => idOf(item.passportId)))];
  const connectionIds = connections.map((item) => item._id);
  const [passports, capabilities, circuits, existing] = await Promise.all([
    AgentPassport.find({ _id: { $in: passportIds } }).select('_id status agent partnerId updatedAt').lean(),
    Capability.find({ passportId: { $in: passportIds }, enabled: true })
      .select('_id passportId name description inputSchema outputSchema category classification runtimeToolName enabled updatedAt')
      .lean(),
    CircuitBreaker.find({ workspaceId: scope.workspaceId, connectionId: { $in: connectionIds } })
      .select('connectionId state rateLimitedUntil updatedAt')
      .lean(),
    CapabilityCatalogEntry.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId })
      .select('+trustUpdatedBy')
      .lean(),
  ]);
  const passportById = new Map(passports.map((item) => [idOf(item), item]));
  const capabilitiesByPassport = new Map();
  for (const capability of capabilities) {
    const key = idOf(capability.passportId);
    capabilitiesByPassport.set(key, [...(capabilitiesByPassport.get(key) || []), capability]);
  }
  const circuitsByConnection = new Map();
  for (const circuit of circuits) {
    const key = idOf(circuit.connectionId);
    circuitsByConnection.set(key, [...(circuitsByConnection.get(key) || []), circuit]);
  }
  const existingByConnection = new Map(existing.map((item) => [idOf(item.connectionId), item]));
  const seen = [];
  let refreshed = 0;
  let unavailable = 0;
  for (const connection of connections) {
    const connectionId = idOf(connection);
    seen.push(connectionId);
    const passport = passportById.get(idOf(connection.passportId));
    const eligible = passport?.status === 'valid' && connection.status === 'connected' && connection.installScope === 'invoke';
    if (!passport) {
      await CapabilityCatalogEntry.updateOne(
        { organizationId: scope.organizationId, workspaceId: scope.workspaceId, connectionId: connection._id },
        { $set: { availabilityStatus: 'unavailable', lifecycleStatus: 'missing', connectionStatus: connection.status, lastCatalogRefreshAt: now } },
      );
      unavailable += 1;
      continue;
    }
    let normalizedCapabilities = [];
    try {
      normalizedCapabilities = normalizePassportCapabilities(passport, capabilitiesByPassport.get(idOf(passport)) || []);
    } catch (error) {
      metrics.increment('agent_catalog_refresh_failures', { reason: error.code || 'normalization' });
      await CapabilityCatalogEntry.updateOne(
        { organizationId: scope.organizationId, workspaceId: scope.workspaceId, connectionId: connection._id },
        { $set: { availabilityStatus: 'unavailable', lifecycleStatus: passport.status, connectionStatus: connection.status, lastCatalogRefreshAt: now } },
      );
      unavailable += 1;
      continue;
    }
    const breaker = worstCircuit(circuitsByConnection.get(connectionId) || [], now);
    const healthStatus = HEALTH_STATUSES.includes(connection.healthStatus || connection.lastHealthStatus)
      ? connection.healthStatus || connection.lastHealthStatus
      : 'unknown';
    const healthSnapshotAt = connection.lastHealthCheckedAt;
    const stale = !healthSnapshotAt || now.getTime() - new Date(healthSnapshotAt).getTime() > freshnessMs;
    const readinessStatus = eligible && healthStatus === 'healthy' && !stale && breaker.state === 'closed' && !breaker.rateLimitedUntil ? 'ready' : eligible ? 'not_ready' : 'unknown';
    const prior = existingByConnection.get(connectionId);
    const sourceVersion = catalogSourceVersion(passport, connection, normalizedCapabilities);
    await CapabilityCatalogEntry.findOneAndUpdate(
      { organizationId: scope.organizationId, workspaceId: scope.workspaceId, connectionId: connection._id },
      {
        $set: {
          passportId: passport._id,
          passportVersion: passport.agent.version,
          agentName: String(passport.agent.name || '').slice(0, 200),
          agentDescription: String(passport.agent.description || '').slice(0, AGENT_SELECTION_LIMITS.maximumDescriptionLength),
          publisherName: String(passport.agent.provider || 'unknown').slice(0, 200),
          capabilities: normalizedCapabilities,
          capabilityKeys: normalizedCapabilities.map((item) => item.capabilityKey),
          operationKeys: [...new Set(normalizedCapabilities.flatMap((item) => item.operationKeys))].sort(),
          categories: [...new Set(normalizedCapabilities.flatMap((item) => item.categories))].sort(),
          tags: prior?.tags || [],
          availabilityStatus: eligible && normalizedCapabilities.length ? 'available' : 'unavailable',
          lifecycleStatus: passport.status,
          connectionStatus: connection.status,
          verificationStatus: prior?.verificationStatus || 'passport_validated',
          trustTier: prior?.trustTier || 'registered',
          dataClassificationsAllowed: prior?.dataClassificationsAllowed?.length ? prior.dataClassificationsAllowed : ['public'],
          supportedRegions: prior?.supportedRegions || [],
          residencyRegions: prior?.residencyRegions || [],
          estimatedCostClass: prior?.estimatedCostClass || 'unknown',
          estimatedLatencyClass: prior?.estimatedLatencyClass || 'unknown',
          healthStatus,
          readinessStatus,
          circuitState: breaker.state,
          rateLimitedUntil: breaker.rateLimitedUntil || null,
          lastHealthyAt: connection.lastHealthSuccessAt,
          healthSnapshotAt,
          healthSnapshotStale: stale,
          reliabilityScore: prior?.reliabilityScore ?? 5_000,
          administrativelyPreferred: prior?.administrativelyPreferred === true,
          lastCatalogRefreshAt: now,
          sourceVersion,
        },
        $setOnInsert: { organizationId: scope.organizationId, workspaceId: scope.workspaceId },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    refreshed += 1;
  }
  const staleFilter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId, ...(seen.length ? { connectionId: { $nin: seen } } : {}) };
  const staleResult = await CapabilityCatalogEntry.updateMany(staleFilter, {
    $set: { availabilityStatus: 'unavailable', connectionStatus: 'removed', readinessStatus: 'not_ready', lastCatalogRefreshAt: now },
  });
  unavailable += staleResult.modifiedCount;
  return { refreshed, unavailable, snapshotAt: now };
}

function serializeCapability(capability) {
  return {
    capabilityKey: capability.capabilityKey,
    displayName: capability.displayName,
    description: capability.description,
    operationKeys: capability.operationKeys,
    inputSchema: capability.inputSchema,
    outputSchema: capability.outputSchema,
    semanticVersion: capability.semanticVersion,
    categories: capability.categories,
    dataHandlingDeclarations: capability.dataHandlingDeclarations,
    supportedRegions: capability.supportedRegions,
    costClass: capability.costClass,
    latencyClass: capability.latencyClass,
    verificationStatus: capability.verificationStatus,
  };
}

function serializeCatalogEntry(entryInput, options = {}) {
  const entry = typeof entryInput?.toObject === 'function' ? entryInput.toObject() : entryInput;
  return {
    connectionId: idOf(entry.connectionId),
    passportId: idOf(entry.passportId),
    passportVersion: entry.passportVersion,
    agentName: entry.agentName,
    agentDescription: entry.agentDescription,
    publisherName: entry.publisherName,
    capabilities: (entry.capabilities || []).map(serializeCapability),
    capabilityKeys: entry.capabilityKeys || [],
    operationKeys: entry.operationKeys || [],
    categories: entry.categories || [],
    tags: entry.tags || [],
    availabilityStatus: entry.availabilityStatus,
    lifecycleStatus: entry.lifecycleStatus,
    connectionStatus: entry.connectionStatus,
    verificationStatus: entry.verificationStatus,
    trustTier: entry.trustTier,
    dataClassificationsAllowed: entry.dataClassificationsAllowed || [],
    supportedRegions: entry.supportedRegions || [],
    residencyRegions: entry.residencyRegions || [],
    estimatedCostClass: entry.estimatedCostClass,
    estimatedLatencyClass: entry.estimatedLatencyClass,
    healthStatus: entry.healthStatus,
    readinessStatus: entry.readinessStatus,
    circuitState: entry.circuitState,
    rateLimited: Boolean(entry.rateLimitedUntil && new Date(entry.rateLimitedUntil) > new Date()),
    lastHealthyAt: entry.lastHealthyAt || null,
    healthSnapshotAt: entry.healthSnapshotAt || null,
    healthSnapshotStale: entry.healthSnapshotStale === true,
    lastCatalogRefreshAt: entry.lastCatalogRefreshAt,
    ...(options.includeSourceVersion ? { sourceVersion: entry.sourceVersion } : {}),
  };
}

async function listAgents(input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('agentDiscovery.read', 'CapabilityCatalogEntry', null, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'SAFE_READ' });
  await refreshCapabilityCatalog(input, caller, { scope });
  const paging = pagination(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId, availabilityStatus: 'available' };
  if (input.capability) filter.capabilityKeys = String(input.capability).trim();
  if (input.operation) filter.operationKeys = String(input.operation).trim();
  if (input.trustTier) {
    const trustTier = String(input.trustTier).toLowerCase();
    if (!TRUST_TIERS.includes(trustTier)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Trust-tier filter is invalid.');
    filter.trustTier = trustTier;
  }
  if (input.publisher) filter.publisherName = new RegExp(`^${safeSearch(input.publisher)}$`, 'i');
  if (input.region) filter.supportedRegions = String(input.region).toUpperCase();
  if (input.health) {
    const health = String(input.health).toLowerCase();
    if (!HEALTH_STATUSES.includes(health)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Health filter is invalid.');
    filter.healthStatus = health;
  }
  if (input.readiness) {
    const readiness = String(input.readiness).toLowerCase();
    if (!READINESS_STATUSES.includes(readiness)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Readiness filter is invalid.');
    filter.readinessStatus = readiness;
  }
  if (input.costClass) {
    const cost = String(input.costClass).toLowerCase();
    if (!COST_CLASSES.includes(cost)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Cost filter is invalid.');
    filter.estimatedCostClass = cost;
  }
  if (input.latencyClass) {
    const latency = String(input.latencyClass).toLowerCase();
    if (!LATENCY_CLASSES.includes(latency)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Latency filter is invalid.');
    filter.estimatedLatencyClass = latency;
  }
  const search = safeSearch(input.search || input.q);
  if (search) filter.$or = [{ agentName: new RegExp(search, 'i') }, { publisherName: new RegExp(search, 'i') }];
  const catalogCandidates = await CapabilityCatalogEntry.find(filter)
    .sort({ agentName: 1, passportId: 1, connectionId: 1 })
    .limit(AGENT_SELECTION_LIMITS.maximumListLimit)
    .lean();
  const correctlyScoped = input.capability && input.operation
    ? catalogCandidates.filter((entry) => (entry.capabilities || []).some(
        (capability) => capability.capabilityKey === input.capability && capability.operationKeys.includes(input.operation),
      ))
    : catalogCandidates;
  const visibility = await Promise.all(correctlyScoped.map(async (entry) => {
    try {
      await authorize('agentDiscovery.read', 'CapabilityCatalogEntry', entry.connectionId, scope, caller, {
        trustedConnection: { _id: entry.connectionId, status: entry.connectionStatus },
        trustedPassport: { _id: entry.passportId, agent: { version: entry.passportVersion } },
      });
      return true;
    } catch (error) {
      if ([403, 404].includes(error.statusCode)) return false;
      throw error;
    }
  }));
  const visible = correctlyScoped.filter((_entry, index) => visibility[index]);
  const total = visible.length;
  const items = visible.slice(paging.skip, paging.skip + paging.limit);
  metrics.increment('agent_discovery_requests');
  metrics.increment('agent_discovery_results', {}, items.length);
  await audit('agent.discovery.searched', 'CapabilityCatalogEntry', null, scope, {
    capabilityKey: input.capability,
    operationKey: input.operation,
    candidateCount: items.length,
    status: 'completed',
  });
  return { items: items.map(serializeCatalogEntry), pagination: { page: paging.page, limit: paging.limit, total } };
}

async function listCapabilities(input = {}, caller = {}) {
  const paging = pagination(input);
  const response = await listAgents({ ...input, page: 1, limit: AGENT_SELECTION_LIMITS.maximumListLimit }, caller);
  const byKey = new Map();
  for (const agent of response.items) {
    for (const capability of agent.capabilities) {
      if (input.capability && capability.capabilityKey !== input.capability) continue;
      const current = byKey.get(capability.capabilityKey) || { capabilityKey: capability.capabilityKey, displayName: capability.displayName, description: capability.description, operationKeys: new Set(), categories: new Set(), agentCount: 0 };
      capability.operationKeys.forEach((value) => current.operationKeys.add(value));
      capability.categories.forEach((value) => current.categories.add(value));
      current.agentCount += 1;
      byKey.set(capability.capabilityKey, current);
    }
  }
  const allItems = [...byKey.values()].map((item) => ({ ...item, operationKeys: [...item.operationKeys].sort(), categories: [...item.categories].sort() })).sort((left, right) => left.capabilityKey.localeCompare(right.capabilityKey));
  const items = allItems.slice(paging.skip, paging.skip + paging.limit);
  return { items, pagination: { page: paging.page, limit: paging.limit, total: allItems.length } };
}

async function scopedCatalogEntry(connectionId, scope) {
  if (!mongoose.isValidObjectId(connectionId)) throw new AppError(404, 'AGENT_DISCOVERY_AGENT_NOT_FOUND', 'Installed agent was not found.');
  const entry = await CapabilityCatalogEntry.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, connectionId, availabilityStatus: 'available' });
  if (!entry) throw new AppError(404, 'AGENT_DISCOVERY_AGENT_NOT_FOUND', 'Installed agent was not found.');
  return entry;
}

async function getAgent(connectionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('agentDiscovery.read', 'CapabilityCatalogEntry', connectionId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'SAFE_READ' });
  await refreshCapabilityCatalog(input, caller, { scope });
  const entry = await scopedCatalogEntry(connectionId, scope);
  try {
    await authorize('agentDiscovery.read', 'CapabilityCatalogEntry', entry.connectionId, scope, caller, {
      trustedConnection: { _id: entry.connectionId, status: entry.connectionStatus },
      trustedPassport: { _id: entry.passportId, agent: { version: entry.passportVersion } },
    });
  } catch (error) {
    if ([403, 404].includes(error.statusCode)) throw new AppError(404, 'AGENT_DISCOVERY_AGENT_NOT_FOUND', 'Installed agent was not found.');
    throw error;
  }
  return serializeCatalogEntry(entry);
}

async function compatibilityCheck(input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('agentDiscovery.read', 'SchemaCompatibility', null, scope, caller);
  assertSafePayload(input, '$compatibility');
  let candidateInputSchema = input.candidateInputSchema;
  let candidateOutputSchema = input.candidateOutputSchema;
  if (input.connectionId) {
    await refreshCapabilityCatalog(input, caller, { scope });
    const entry = await scopedCatalogEntry(input.connectionId, scope);
    const capability = entry.capabilities.find((item) => item.capabilityKey === input.capability && item.operationKeys.includes(input.operation));
    if (!capability) throw new AppError(404, 'AGENT_DISCOVERY_CAPABILITY_NOT_FOUND', 'Capability or operation was not found.');
    candidateInputSchema = capability.inputSchema;
    candidateOutputSchema = capability.outputSchema;
  }
  return checkSchemaCompatibility(input.inputSchema, candidateInputSchema, candidateOutputSchema, input.requiredOutputSchema);
}

function serializePolicy(policyInput) {
  const policy = typeof policyInput?.toObject === 'function' ? policyInput.toObject() : policyInput;
  return {
    policyId: idOf(policy), organizationId: policy.organizationId, workspaceId: policy.workspaceId,
    name: policy.name, description: policy.description, version: policy.version, status: policy.status,
    capabilityRequirements: policy.capabilityRequirements || [], allowedCapabilityCategories: policy.allowedCapabilityCategories || [], allowedPassportIds: (policy.allowedPassportIds || []).map(idOf), deniedPassportIds: (policy.deniedPassportIds || []).map(idOf),
    allowedPublishers: policy.allowedPublishers || [], deniedPublishers: policy.deniedPublishers || [], minimumTrustTier: policy.minimumTrustTier,
    requiredVerificationStatuses: policy.requiredVerificationStatuses || [], allowedRegions: policy.allowedRegions || [], requiredResidencyRegions: policy.requiredResidencyRegions || [],
    allowedDataClassifications: policy.allowedDataClassifications || [], maximumCostClass: policy.maximumCostClass, maximumLatencyClass: policy.maximumLatencyClass,
    requireHealthy: policy.requireHealthy, requireReady: policy.requireReady, allowOpenCircuit: policy.allowOpenCircuit, allowRateLimitedCandidate: policy.allowRateLimitedCandidate,
    allowUncertainSchemaCompatibility: policy.allowUncertainSchemaCompatibility, requireApprovalWhen: policy.requireApprovalWhen, scoreWeights: policy.scoreWeights,
    fallbackCandidateCount: policy.fallbackCandidateCount, fallbackCandidatesPermitted: policy.fallbackCandidatesPermitted,
    userPreferenceOverridesPermitted: policy.userPreferenceOverridesPermitted, tieBreaker: policy.tieBreaker,
    createdBy: policy.createdBy, updatedBy: policy.updatedBy, activatedBy: policy.activatedBy,
    validatedAt: policy.validatedAt, activatedAt: policy.activatedAt, createdAt: policy.createdAt, updatedAt: policy.updatedAt,
  };
}

async function validatePolicyReferences(policy, scope) {
  const errors = [];
  if (!policy.name || policy.name.length > 200) errors.push({ path: 'name', code: 'AGENT_SELECTION_POLICY_NAME_INVALID', message: 'Policy name is required and bounded.' });
  if (policy.description.length > AGENT_SELECTION_LIMITS.maximumDescriptionLength) errors.push({ path: 'description', code: 'AGENT_SELECTION_POLICY_DESCRIPTION_INVALID', message: 'Policy description is too long.' });
  for (const key of policy.capabilityRequirements || []) {
    if (!/^[A-Za-z][A-Za-z0-9._-]{0,127}$/.test(key)) errors.push({ path: 'capabilityRequirements', code: 'AGENT_SELECTION_CAPABILITY_INVALID', message: 'Capability requirement is invalid.' });
  }
  const refs = [...new Set([...(policy.allowedPassportIds || []), ...(policy.deniedPassportIds || [])].map(idOf))];
  const deniedRefs = new Set((policy.deniedPassportIds || []).map(idOf));
  if ((policy.allowedPassportIds || []).map(idOf).some((value) => deniedRefs.has(value))) {
    errors.push({ path: 'allowedPassportIds', code: 'AGENT_SELECTION_ALLOW_DENY_CONFLICT', message: 'A passport cannot be both allowed and denied.' });
  }
  if (refs.some((value) => !mongoose.isValidObjectId(value))) errors.push({ path: 'passportIds', code: 'AGENT_SELECTION_REFERENCE_UNAVAILABLE', message: 'A passport reference is unavailable.' });
  if (!errors.length && refs.length) {
    const accessible = await CapabilityCatalogEntry.distinct('passportId', { organizationId: scope.organizationId, workspaceId: scope.workspaceId, passportId: { $in: refs } });
    if (new Set(accessible.map(idOf)).size !== refs.length) errors.push({ path: 'passportIds', code: 'AGENT_SELECTION_REFERENCE_UNAVAILABLE', message: 'A passport reference is unavailable.' });
  }
  return { valid: errors.length === 0, errors };
}

async function createPolicy(input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('agentSelectionPolicy.create', 'AgentSelectionPolicy', null, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'PRIVILEGED_CONFIGURATION' });
  assertSafePayload(input, '$selectionPolicy');
  assertAllowedKeys(input, POLICY_INPUT_KEYS, '$selectionPolicy');
  assertAllowedKeys(input.requireApprovalWhen || {}, new Set(['manualReview', 'trustBelow', 'unverifiedPublisher', 'dataClassifications', 'costClasses', 'uncertainResidency']), '$selectionPolicy.requireApprovalWhen');
  assertAllowedKeys(input.scoreWeights || {}, new Set(['schemaCompatibility', 'trust', 'health', 'readiness', 'latency', 'cost', 'publisherVerification', 'administrativePreference', 'recentReliability']), '$selectionPolicy.scoreWeights');
  await refreshCapabilityCatalog(input, caller, { scope });
  const normalized = normalizePolicyInput(input);
  const validation = await validatePolicyReferences(normalized, scope);
  if (!validation.valid) throw new AppError(400, 'AGENT_SELECTION_POLICY_INVALID', 'Selection policy validation failed.', validation.errors);
  let policy;
  try {
    policy = await AgentSelectionPolicy.create({ ...normalized, organizationId: scope.organizationId, workspaceId: scope.workspaceId, version: 1, status: 'draft', createdBy: scope.actorId, updatedBy: scope.actorId });
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError(409, ErrorCodes.CONFLICT, 'A selection policy version already exists.');
    throw error;
  }
  await audit('agent.selection.policy.created', 'AgentSelectionPolicy', policy, scope, { policyVersion: policy.version, status: policy.status });
  return serializePolicy(policy);
}

async function scopedPolicy(policyId, scope, options = {}) {
  if (!mongoose.isValidObjectId(policyId)) throw new AppError(404, 'AGENT_SELECTION_POLICY_NOT_FOUND', 'Selection policy was not found.');
  const query = AgentSelectionPolicy.findOne({ _id: policyId, organizationId: scope.organizationId, workspaceId: scope.workspaceId });
  if (options.lean) query.lean();
  const policy = await query;
  if (!policy) throw new AppError(404, 'AGENT_SELECTION_POLICY_NOT_FOUND', 'Selection policy was not found.');
  return policy;
}

async function listPolicies(input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('agentSelectionPolicy.read', 'AgentSelectionPolicy', null, scope, caller);
  const paging = pagination(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (input.status) {
    const status = String(input.status).toLowerCase();
    if (!SELECTION_POLICY_STATUSES.includes(status)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Policy status filter is invalid.');
    filter.status = status;
  }
  const search = safeSearch(input.search || input.q);
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }];
  const [items, total] = await Promise.all([
    AgentSelectionPolicy.find(filter).sort({ updatedAt: -1, _id: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    AgentSelectionPolicy.countDocuments(filter),
  ]);
  return { items: items.map(serializePolicy), pagination: { page: paging.page, limit: paging.limit, total } };
}

async function getPolicy(policyId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('agentSelectionPolicy.read', 'AgentSelectionPolicy', policyId, scope, caller);
  return serializePolicy(await scopedPolicy(policyId, scope, { lean: true }));
}

async function updatePolicy(policyId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('agentSelectionPolicy.update', 'AgentSelectionPolicy', policyId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'PRIVILEGED_CONFIGURATION' });
  assertSafePayload(input, '$selectionPolicy');
  assertAllowedKeys(input, POLICY_INPUT_KEYS, '$selectionPolicy');
  assertAllowedKeys(input.requireApprovalWhen || {}, new Set(['manualReview', 'trustBelow', 'unverifiedPublisher', 'dataClassifications', 'costClasses', 'uncertainResidency']), '$selectionPolicy.requireApprovalWhen');
  assertAllowedKeys(input.scoreWeights || {}, new Set(['schemaCompatibility', 'trust', 'health', 'readiness', 'latency', 'cost', 'publisherVerification', 'administrativePreference', 'recentReliability']), '$selectionPolicy.scoreWeights');
  await refreshCapabilityCatalog(input, caller, { scope });
  const current = await scopedPolicy(policyId, scope);
  if (current.status === 'archived') throw new AppError(409, 'AGENT_SELECTION_POLICY_IMMUTABLE', 'Archived selection policies are immutable.');
  const normalized = normalizePolicyInput(input, current.toObject());
  const validation = await validatePolicyReferences(normalized, scope);
  if (!validation.valid) throw new AppError(400, 'AGENT_SELECTION_POLICY_INVALID', 'Selection policy validation failed.', validation.errors);
  let updated;
  if (current.status === 'active') {
    const latest = await AgentSelectionPolicy.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, name: current.name }).sort({ version: -1 }).select('version').lean();
    updated = await AgentSelectionPolicy.create({ ...normalized, organizationId: scope.organizationId, workspaceId: scope.workspaceId, version: Number(latest?.version || current.version) + 1, status: 'draft', createdBy: scope.actorId, updatedBy: scope.actorId });
  } else {
    Object.assign(current, normalized, { updatedBy: scope.actorId });
    updated = await current.save();
  }
  await audit('agent.selection.policy.updated', 'AgentSelectionPolicy', updated, scope, { policyVersion: updated.version, status: updated.status });
  return serializePolicy(updated);
}

async function validatePolicy(policyId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('agentSelectionPolicy.update', 'AgentSelectionPolicy', policyId, scope, caller);
  await refreshCapabilityCatalog(input, caller, { scope });
  const policy = await scopedPolicy(policyId, scope);
  const validation = await validatePolicyReferences(policy.toObject(), scope);
  if (validation.valid) {
    policy.validatedAt = new Date();
    policy.validationDigest = sha256(canonicalize(serializePolicy(policy)));
    await policy.save();
  }
  await audit('agent.selection.policy.validated', 'AgentSelectionPolicy', policy, scope, { policyVersion: policy.version, status: validation.valid ? 'valid' : 'invalid', reasonCode: validation.errors[0]?.code });
  return { ...validation, validationDigest: validation.valid ? policy.validationDigest : null };
}

async function activatePolicy(policyId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('agentSelectionPolicy.activate', 'AgentSelectionPolicy', policyId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'PRIVILEGED_CONFIGURATION' });
  await refreshCapabilityCatalog(input, caller, { scope });
  const policy = await scopedPolicy(policyId, scope);
  if (policy.status === 'active') return serializePolicy(policy);
  if (policy.status !== 'draft') throw new AppError(409, 'AGENT_SELECTION_POLICY_IMMUTABLE', 'Only draft selection policies may be activated.');
  const validation = await validatePolicyReferences(policy.toObject(), scope);
  if (!validation.valid) throw new AppError(400, 'AGENT_SELECTION_POLICY_INVALID', 'Selection policy validation failed.', validation.errors);
  policy.status = 'active';
  policy.activatedBy = scope.actorId;
  policy.activatedAt = new Date();
  policy.validatedAt = new Date();
  policy.validationDigest = sha256(canonicalize(serializePolicy(policy)));
  const activated = await policy.save();
  await AgentSelectionPolicy.updateMany(
    {
      _id: { $ne: activated._id },
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      name: activated.name,
      status: 'active',
    },
    { $set: { status: 'archived', archivedAt: new Date(), updatedBy: scope.actorId } },
  );
  await audit('agent.selection.policy.activated', 'AgentSelectionPolicy', activated, scope, { policyVersion: activated.version, status: 'active' });
  return serializePolicy(activated);
}

async function archivePolicy(policyId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('agentSelectionPolicy.update', 'AgentSelectionPolicy', policyId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'PRIVILEGED_CONFIGURATION' });
  const policy = await scopedPolicy(policyId, scope);
  if (policy.status === 'archived') return serializePolicy(policy);
  policy.status = 'archived';
  policy.archivedAt = new Date();
  policy.updatedBy = scope.actorId;
  const archived = await policy.save();
  await audit('agent.selection.policy.archived', 'AgentSelectionPolicy', archived, scope, { policyVersion: archived.version, status: 'archived' });
  return serializePolicy(archived);
}

function normalizeSelectionRequest(input = {}) {
  assertSafePayload(input, '$selection');
  assertAllowedKeys(input, SELECTION_INPUT_KEYS, '$selection');
  assertAllowedKeys(input.constraints || {}, CONSTRAINT_KEYS, '$selection.constraints');
  const capability = String(input.capability || '').trim();
  const operation = String(input.operation || '').trim();
  if (!/^[A-Za-z][A-Za-z0-9._-]{0,127}$/.test(capability) || !/^[A-Za-z][A-Za-z0-9._-]{0,127}$/.test(operation)) {
    throw new AppError(400, 'AGENT_SELECTION_REQUEST_INVALID', 'Capability and operation are required and must use safe keys.');
  }
  const inputSchema = sanitizeSchema(validateSchema(input.inputSchema, '$selection.inputSchema'));
  const requiredOutputSchema = sanitizeSchema(validateSchema(input.requiredOutputSchema, '$selection.requiredOutputSchema'));
  const candidateLimit = Number(input.candidateLimit || 20);
  if (!Number.isInteger(candidateLimit) || candidateLimit < 1 || candidateLimit > AGENT_SELECTION_LIMITS.maximumCandidates) {
    throw new AppError(400, 'AGENT_SELECTION_CANDIDATE_LIMIT_INVALID', 'Candidate limit is invalid.');
  }
  if (!Array.isArray(input.preferredPassportIds || []) || !Array.isArray(input.excludedPassportIds || [])) {
    throw new AppError(400, 'AGENT_SELECTION_REFERENCE_UNAVAILABLE', 'Requested passport references must be arrays.');
  }
  const preferredPassportIds = [...new Set((input.preferredPassportIds || []).map(idOf))].sort();
  const excludedPassportIds = [...new Set((input.excludedPassportIds || []).map(idOf))].sort();
  if ([...preferredPassportIds, ...excludedPassportIds].some((value) => !mongoose.isValidObjectId(value)) || preferredPassportIds.length + excludedPassportIds.length > AGENT_SELECTION_LIMITS.maximumArrayItems) {
    throw new AppError(400, 'AGENT_SELECTION_REFERENCE_UNAVAILABLE', 'A requested passport reference is unavailable.');
  }
  return {
    capability,
    operation,
    inputSchema,
    requiredOutputSchema,
    constraints: input.constraints || {},
    preferredPassportIds,
    excludedPassportIds,
    selectionPolicyId: input.selectionPolicyId,
    candidateLimit,
    fallbackCandidateCount: input.fallbackCandidateCount,
    orchestrationDefinitionId: input.orchestrationDefinitionId,
    orchestrationRunId: input.orchestrationRunId,
    orchestrationNodeKey: input.orchestrationNodeKey,
  };
}

async function loadSelectionPolicy(request, scope) {
  if (request.selectionPolicyId) {
    const policy = await scopedPolicy(request.selectionPolicyId, scope, { lean: true });
    if (policy.status !== 'active') throw new AppError(409, 'AGENT_SELECTION_POLICY_INACTIVE', 'Only an active selection policy may be evaluated.');
    return policy;
  }
  const matching = await AgentSelectionPolicy.findOne({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    status: 'active',
    $or: [{ capabilityRequirements: request.capability }, { capabilityRequirements: { $size: 0 } }],
  }).sort({ version: -1, _id: 1 }).lean();
  if (matching) return matching;
  return { ...normalizePolicyInput({ name: 'System safe default' }), _id: null, version: 0, status: 'active' };
}

function exclusionSummary(results) {
  const output = {};
  for (const result of results) {
    for (const reason of result.filter.reasons) {
      const key = {
        POLICY_DENIED: 'policyDenied', SCHEMA_INCOMPATIBLE: 'schemaIncompatible', SCHEMA_COMPATIBILITY_UNCERTAIN: 'schemaUncertain',
        HEALTH_REQUIREMENT_NOT_MET: 'unhealthy', STALE_HEALTH_SNAPSHOT: 'staleHealth', READINESS_REQUIREMENT_NOT_MET: 'notReady',
        TRUST_REQUIREMENT_NOT_MET: 'trustInsufficient', VERIFICATION_REQUIREMENT_NOT_MET: 'verificationInsufficient',
        ADMINISTRATIVELY_DENIED: 'administrativelyDenied', NOT_ADMINISTRATIVELY_ALLOWED: 'administrativelyDenied',
        RESIDENCY_REQUIREMENT_UNMET: 'residencyMismatch', REGION_NOT_ALLOWED: 'regionMismatch', COST_LIMIT_EXCEEDED: 'costExceeded', LATENCY_LIMIT_EXCEEDED: 'latencyExceeded',
        RATE_LIMITED: 'rateLimited', CIRCUIT_OPEN: 'circuitOpen', DATA_CLASSIFICATION_UNSUPPORTED: 'classificationUnsupported',
        CAPABILITY_CATEGORY_DENIED: 'categoryDenied',
      }[reason] || 'unavailable';
      output[key] = (output[key] || 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(output).sort(([left], [right]) => left.localeCompare(right)));
}

function serializeDecision(decisionInput) {
  const decision = typeof decisionInput?.toObject === 'function' ? decisionInput.toObject() : decisionInput;
  return {
    decisionId: idOf(decision), requestId: decision.requestId, traceId: decision.traceId, requestedBy: decision.requestedBy,
    selectionPolicyId: idOf(decision.selectionPolicyId) || null, selectionPolicyVersion: decision.selectionPolicyVersion,
    orchestrationDefinitionId: idOf(decision.orchestrationDefinitionId) || null, orchestrationRunId: idOf(decision.orchestrationRunId) || null,
    orchestrationNodeKey: decision.orchestrationNodeKey || null, requestedCapability: decision.requestedCapability, requestedOperation: decision.requestedOperation,
    normalizedConstraints: decision.normalizedConstraints, evaluatedCandidateCount: decision.evaluatedCandidateCount, eligibleCandidateCount: decision.eligibleCandidateCount,
    selectedCandidate: decision.selectedConnectionId ? {
      passportId: idOf(decision.selectedPassportId), passportVersion: decision.selectedPassportVersion,
      connectionId: idOf(decision.selectedConnectionId), agentName: decision.selectedAgentName,
      publisherName: decision.selectedPublisherName, trustTier: decision.selectedTrustTier,
      verificationStatus: decision.selectedVerificationStatus, score: decision.selectedScore,
    } : null,
    fallbackCandidates: (decision.fallbackCandidates || []).map((candidate) => ({ ...candidate, passportId: idOf(candidate.passportId), connectionId: idOf(candidate.connectionId) })),
    reasons: decision.safeDecisionReasons || [], excluded: decision.safeExclusionSummary || {}, healthSnapshotAt: decision.healthSnapshotAt || null,
    decisionStatus: decision.decisionStatus, approvalRequestId: decision.approvalRequestId || null, approvalResolvedAt: decision.approvalResolvedAt || null,
    createdAt: decision.createdAt,
  };
}

async function candidatePolicyDenied(candidate, request, scope, caller) {
  const capability = (candidate.capabilities || []).find((item) => item.capabilityKey === request.capability);
  try {
    await authorize('agentSelection.evaluate', 'AgentSelectionCandidate', candidate.connectionId, scope, caller, {
      trustedConnection: { _id: candidate.connectionId, status: candidate.connectionStatus },
      trustedPassport: { _id: candidate.passportId, agent: { version: candidate.passportVersion } },
      trustedCapability: { _id: `${idOf(candidate.passportId)}:${request.capability}`, name: request.capability, category: capability?.categories?.[0], classification: capability?.dataHandlingDeclarations?.[0] },
    });
    return false;
  } catch (error) {
    if ([403, 404].includes(error.statusCode)) return true;
    throw error;
  }
}

async function evaluateSelection(input = {}, caller = {}, options = {}) {
  const started = Date.now();
  const scope = options.scope || callerScope(input, caller);
  await authorize('agentSelection.evaluate', 'AgentSelectionDecision', null, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'MUTATION' });
  const request = normalizeSelectionRequest(input);
  await refreshCapabilityCatalog(input, caller, { scope });
  const policy = await loadSelectionPolicy(request, scope);
  if ((policy.capabilityRequirements || []).length && !policy.capabilityRequirements.includes(request.capability)) {
    throw new AppError(403, 'AGENT_SELECTION_CAPABILITY_DENIED', 'The active selection policy does not permit this capability.');
  }
  const constraints = effectiveConstraints(policy, request);
  const allScopedRaw = await CapabilityCatalogEntry.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, availabilityStatus: 'available' })
    .sort({ passportId: 1, connectionId: 1 })
    .lean();
  const quarantinedConnectionIds = await listQuarantinedConnectionIds(scope);
  const allScoped = filterQuarantinedCandidates(allScopedRaw, quarantinedConnectionIds);
  const capabilityScoped = allScoped.filter((candidate) => candidate.capabilityKeys.includes(request.capability));
  if (!capabilityScoped.length) throw new AppError(400, 'AGENT_SELECTION_CAPABILITY_UNKNOWN', 'Requested capability is unavailable in this workspace.');
  const operationScoped = capabilityScoped.filter((candidate) => candidateCapabilityForService(candidate, request));
  if (!operationScoped.length) throw new AppError(400, 'AGENT_SELECTION_OPERATION_UNKNOWN', 'Requested operation is unavailable for this capability.');
  const referenced = new Set([...request.preferredPassportIds, ...request.excludedPassportIds]);
  const accessibleIds = new Set(allScoped.map((candidate) => idOf(candidate.passportId)));
  if ([...referenced].some((value) => !accessibleIds.has(value))) throw new AppError(400, 'AGENT_SELECTION_REFERENCE_UNAVAILABLE', 'A requested passport reference is unavailable.');
  const candidates = operationScoped.slice(0, request.candidateLimit);
  const policyDenied = await Promise.all(candidates.map((candidate) => candidatePolicyDenied(candidate, request, scope, caller)));
  const preferred = new Set(policy.userPreferenceOverridesPermitted === false ? [] : request.preferredPassportIds);
  const evaluated = candidates.map((candidate, index) => {
    const filter = mandatoryFilter(candidate, request, policy, { constraints, policyDenied: policyDenied[index], now: new Date() });
    if (!filter.eligible) return { candidate, filter };
    const scored = scoreCandidate(candidate, filter, policy.scoreWeights, preferred.has(idOf(candidate.passportId)));
    return { candidate, filter, ...scored };
  });
  const eligible = evaluated.filter((item) => item.filter.eligible).map((item) => ({ ...item.candidate, score: item.score, componentScores: item.components })).sort(compareCandidates);
  const snapshotHash = candidateSnapshotHash(candidates);
  const excluded = exclusionSummary(evaluated.filter((item) => !item.filter.eligible));
  metrics.increment('agent_selection_policy_denials', {}, excluded.policyDenied || 0);
  metrics.increment('agent_selection_schema_incompatibilities', {}, excluded.schemaIncompatible || 0);
  metrics.increment('agent_selection_health_exclusions', {}, (excluded.unhealthy || 0) + (excluded.notReady || 0));
  metrics.increment('agent_selection_stale_health_candidates', {}, excluded.staleHealth || 0);
  const selected = eligible[0];
  const fallbackCount = Math.max(0, Math.min(
    Number(request.fallbackCandidateCount ?? policy.fallbackCandidateCount ?? 0),
    policy.fallbackCandidatesPermitted === false ? 0 : AGENT_SELECTION_LIMITS.maximumFallbackCandidates,
  ));
  const fallbacks = eligible.slice(1, fallbackCount + 1).map((candidate) => safeCandidate(candidate, candidate.score));
  const decisionObjectId = new mongoose.Types.ObjectId();
  let approval = { required: false, reasons: [] };
  if (selected) {
    approval = selectionRequiresApproval(selected, constraints, policy);
    const workflow = await evaluateApprovalRequirement({
      organizationId: scope.organizationId, workspaceId: scope.workspaceId, requesterActorId: scope.actorId,
      requesterActorType: 'service_account', permission: 'agentSelection.evaluate', resourceType: 'AgentSelectionDecision',
      resourceId: idOf(decisionObjectId), capabilityClassification: constraints.dataClassification.toUpperCase(),
      capabilityCategory: selected.categories?.[0] || 'UNCLASSIFIED', sideEffect: 'READ_ONLY', operationType: 'SELECTION',
      safeRequestAttributes: { capability: request.capability, operation: request.operation, dataClassification: constraints.dataClassification },
    });
    if (workflow.required) approval = { required: true, reasons: [...new Set([...approval.reasons, 'POLICY_APPROVAL_REQUIRED'])], workflowId: workflow.workflows?.[0]?.stableWorkflowId };
  }
  const status = !selected ? 'no_candidate' : approval.required ? 'approval_required' : 'selected';
  const reasons = !selected ? ['NO_ELIGIBLE_CANDIDATE'] : [
    'CAPABILITY_MATCH',
    'SCHEMA_COMPATIBLE',
    'TRUST_REQUIREMENT_MET',
    selected.healthSnapshotStale ? 'HEALTH_SNAPSHOT_STALE' : 'RUNTIME_HEALTH_ACCEPTABLE',
    selected.readinessStatus === 'ready' ? 'RUNTIME_READY' : 'READINESS_NOT_REQUIRED',
    'COST_WITHIN_LIMIT',
    ...approval.reasons,
  ];
  let decision = await AgentSelectionDecision.create({
    _id: decisionObjectId,
    organizationId: scope.organizationId, workspaceId: scope.workspaceId, requestId: scope.requestId, traceId: scope.traceId,
    requestedBy: scope.actorId, selectionPolicyId: policy._id || undefined, selectionPolicyVersion: Number(policy.version || 0),
    orchestrationDefinitionId: request.orchestrationDefinitionId || undefined, orchestrationRunId: request.orchestrationRunId || undefined,
    orchestrationNodeKey: request.orchestrationNodeKey, requestedCapability: request.capability, requestedOperation: request.operation,
    normalizedConstraints: constraints, candidateSnapshotHash: snapshotHash, evaluatedCandidateCount: candidates.length,
    eligibleCandidateCount: eligible.length, selectedPassportId: selected?.passportId, selectedPassportVersion: selected?.passportVersion,
    selectedConnectionId: selected?.connectionId, selectedAgentName: selected?.agentName,
    selectedPublisherName: selected?.publisherName, selectedTrustTier: selected?.trustTier,
    selectedVerificationStatus: selected?.verificationStatus, selectedScore: selected?.score, fallbackCandidates: fallbacks,
    safeDecisionReasons: [...new Set(reasons)].sort(), safeExclusionSummary: excluded,
    healthSnapshotAt: candidates.map((candidate) => candidate.healthSnapshotAt).filter(Boolean).sort((left, right) => new Date(left) - new Date(right))[0],
    decisionStatus: status,
  });
  if (selected && approval.required) {
    const created = await createApprovalRequest({
      workspaceId: scope.workspaceId, requesterActorId: scope.actorId, requesterActorType: 'service_account',
      permission: 'agentSelection.evaluate', resourceType: 'AgentSelectionDecision', resourceId: idOf(decision),
      operationType: 'SELECTION', connectionId: idOf(selected.connectionId), passportId: idOf(selected.passportId),
      capabilityClassification: constraints.dataClassification.toUpperCase(), capabilityCategory: selected.categories?.[0] || 'UNCLASSIFIED',
      sideEffect: 'READ_ONLY', safeRequestAttributes: { capability: request.capability, operation: request.operation, selectedTrustTier: selected.trustTier, selectedCostClass: selected.estimatedCostClass },
      workflowId: approval.workflowId, reason: 'Governed agent selection approval required.',
      idempotencyKey: `agent-selection:${idOf(decision)}`,
    }, { partner: caller.partner, requestId: scope.requestId, traceId: scope.traceId });
    await ApprovalRequest.updateOne({ approvalRequestId: created.approvalRequestId, organizationId: scope.organizationId }, { $set: { agentSelectionDecisionId: decision._id } });
    decision = await AgentSelectionDecision.findByIdAndUpdate(decision._id, { $set: { approvalRequestId: created.approvalRequestId } }, { new: true, runValidators: true });
  }
  metrics.increment('agent_selection_evaluations', { status });
  metrics.increment('agent_selection_eligible_candidates', {}, eligible.length);
  if (!selected) metrics.increment('agent_selection_no_candidate');
  if (approval.required) metrics.increment('agent_selection_approval_required');
  if (selected) metrics.increment('agent_selections', { trustTier: selected.trustTier });
  metrics.observe('agent_selection_duration', Date.now() - started);
  await audit('agent.selection.evaluated', 'AgentSelectionDecision', decision, scope, { capabilityKey: request.capability, operationKey: request.operation, candidateCount: candidates.length, eligibleCandidateCount: eligible.length, status });
  await audit(selected ? approval.required ? 'agent.selection.approval_required' : 'agent.selection.completed' : 'agent.selection.no_candidate', 'AgentSelectionDecision', decision, scope, {
    selectedPassportId: idOf(selected?.passportId) || undefined, selectedConnectionId: idOf(selected?.connectionId) || undefined,
    score: selected?.score, policyVersion: policy.version, status,
  });
  return { ...serializeDecision(decision), selectedCandidate: selected ? { ...safeCandidate(selected, selected.score), reasons: [...new Set(reasons)].sort() } : null };
}

function candidateCapabilityForService(candidate, request) {
  return (candidate.capabilities || []).some((item) => item.capabilityKey === request.capability && item.operationKeys.includes(request.operation));
}

async function listDecisions(input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('agentSelectionDecision.read', 'AgentSelectionDecision', null, scope, caller);
  const paging = pagination(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (input.status) {
    const status = String(input.status).toLowerCase();
    if (!SELECTION_DECISION_STATUSES.includes(status)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Decision status filter is invalid.');
    filter.decisionStatus = status;
  }
  if (input.capability) filter.requestedCapability = String(input.capability).trim();
  const [items, total] = await Promise.all([
    AgentSelectionDecision.find(filter).sort({ createdAt: -1, _id: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    AgentSelectionDecision.countDocuments(filter),
  ]);
  return { items: items.map(serializeDecision), pagination: { page: paging.page, limit: paging.limit, total } };
}

async function getDecision(decisionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('agentSelectionDecision.read', 'AgentSelectionDecision', decisionId, scope, caller);
  if (!mongoose.isValidObjectId(decisionId)) throw new AppError(404, 'AGENT_SELECTION_DECISION_NOT_FOUND', 'Selection decision was not found.');
  let decision = await AgentSelectionDecision.findOne({ _id: decisionId, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).lean();
  if (!decision) throw new AppError(404, 'AGENT_SELECTION_DECISION_NOT_FOUND', 'Selection decision was not found.');
  if (decision.decisionStatus === 'approval_required' && decision.approvalRequestId) {
    await handleApprovalResolution(decision.approvalRequestId);
    decision = await AgentSelectionDecision.findOne({ _id: decisionId, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).lean();
  }
  return serializeDecision(decision);
}

async function updateTrust(connectionId, input = {}, caller = {}, mode = 'trust') {
  const scope = callerScope(input, caller);
  assertSafePayload(input, '$agentTrust');
  assertAllowedKeys(input, new Set([
    'workspaceId', 'receivingWorkspaceId', 'trustTier', 'verificationStatus',
    'dataClassificationsAllowed', 'supportedRegions', 'residencyRegions',
    'estimatedCostClass', 'estimatedLatencyClass', 'administrativelyPreferred', 'reliabilityScore',
  ]), '$agentTrust');
  await authorize('agentTrust.manage', 'CapabilityCatalogEntry', connectionId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'PRIVILEGED_CONFIGURATION' });
  await refreshCapabilityCatalog(input, caller, { scope });
  const entry = await scopedCatalogEntry(connectionId, scope);
  const update = {};
  if (mode === 'trust') {
    const trustTier = String(input.trustTier || '').toLowerCase();
    if (!TRUST_TIERS.includes(trustTier)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Trust tier is invalid.');
    if (trustTier === 'platform_verified') throw new AppError(403, ErrorCodes.FORBIDDEN, 'Platform verification cannot be granted by a tenant administrator.');
    update.trustTier = trustTier;
    if (input.dataClassificationsAllowed !== undefined) {
      if (!Array.isArray(input.dataClassificationsAllowed)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Allowed data classifications must be an array.');
      const values = [...new Set((input.dataClassificationsAllowed || []).map((value) => String(value).toLowerCase()))].sort();
      if (!values.length || values.length > DATA_CLASSIFICATIONS.length || values.some((value) => !DATA_CLASSIFICATIONS.includes(value))) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Allowed data classifications are invalid.');
      }
      update.dataClassificationsAllowed = values;
    }
    for (const [field, values] of [['supportedRegions', input.supportedRegions], ['residencyRegions', input.residencyRegions]]) {
      if (values === undefined) continue;
      if (!Array.isArray(values)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Region declarations must be arrays.');
      const normalized = [...new Set((values || []).map((value) => String(value).trim().toUpperCase()))].sort();
      if (normalized.length > AGENT_SELECTION_LIMITS.maximumRegions || normalized.some((value) => !/^[A-Z0-9-]{2,16}$/.test(value))) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Region declarations are invalid.');
      }
      update[field] = normalized;
    }
    if (input.estimatedCostClass !== undefined) {
      const costClass = String(input.estimatedCostClass).toLowerCase();
      if (!COST_CLASSES.includes(costClass)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Cost class is invalid.');
      update.estimatedCostClass = costClass;
    }
    if (input.estimatedLatencyClass !== undefined) {
      const latencyClass = String(input.estimatedLatencyClass).toLowerCase();
      if (!LATENCY_CLASSES.includes(latencyClass)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Latency class is invalid.');
      update.estimatedLatencyClass = latencyClass;
    }
    if (input.administrativelyPreferred !== undefined) update.administrativelyPreferred = input.administrativelyPreferred === true;
    if (input.reliabilityScore !== undefined) {
      const reliabilityScore = Number(input.reliabilityScore);
      if (!Number.isInteger(reliabilityScore) || reliabilityScore < 0 || reliabilityScore > 10_000) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Reliability score is invalid.');
      }
      update.reliabilityScore = reliabilityScore;
    }
  } else {
    const verificationStatus = String(input.verificationStatus || '').toLowerCase();
    if (!VERIFICATION_STATUSES.includes(verificationStatus)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Verification status is invalid.');
    if (verificationStatus === 'platform_verified') throw new AppError(403, ErrorCodes.FORBIDDEN, 'Platform verification cannot be granted by a tenant administrator.');
    update.verificationStatus = verificationStatus;
  }
  update.trustUpdatedBy = scope.actorId;
  update.trustUpdatedAt = new Date();
  const changed = await CapabilityCatalogEntry.findOneAndUpdate({ _id: entry._id, organizationId: scope.organizationId, workspaceId: scope.workspaceId }, { $set: update }, { new: true, runValidators: true });
  metrics.increment('agent_trust_changes', { outcome: mode });
  await audit(mode === 'trust' ? 'agent.trust.updated' : 'agent.verification.updated', 'CapabilityCatalogEntry', entry._id, scope, {
    selectedPassportId: idOf(entry.passportId), selectedConnectionId: idOf(entry.connectionId), trustTier: changed.trustTier,
    verificationStatus: changed.verificationStatus, status: 'updated',
  });
  return serializeCatalogEntry(changed);
}

async function handleApprovalResolution(approvalRequestId, prefetchedRequest) {
  let request = prefetchedRequest || await ApprovalRequest.findOne({ approvalRequestId });
  if (!request?.agentSelectionDecisionId) return { updated: 0 };
  request = await expireIfNeeded(request);
  if (['PENDING', 'PARTIALLY_APPROVED'].includes(request.status)) return { updated: 0, status: request.status };
  const decisionStatus = request.status === 'APPROVED' ? 'selected' : 'rejected';
  const result = await AgentSelectionDecision.updateOne(
    { _id: request.agentSelectionDecisionId, decisionStatus: 'approval_required', approvalRequestId },
    { $set: { decisionStatus, approvalResolvedAt: new Date() } },
  );
  if (decisionStatus === 'rejected' && result.modifiedCount) {
    metrics.increment('agent_selection_rejections');
    await createAuditLog('system', 'system:approval-reconciliation', 'agent.selection.rejected', 'AgentSelectionDecision', idOf(request.agentSelectionDecisionId), {
      organizationId: request.organizationId,
      workspaceId: request.workspaceId,
      receivingWorkspaceId: request.workspaceId,
      approvalRequestId,
      status: 'rejected',
      reasonCode: `APPROVAL_${request.status}`,
    }, { requestId: request.requestId, traceId: request.traceId });
  }
  return { updated: result.modifiedCount, status: decisionStatus };
}

async function reconcileSelectionApprovals(options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit || 100), 500));
  const decisions = await AgentSelectionDecision.find({
    decisionStatus: 'approval_required',
    approvalRequestId: { $exists: true, $ne: null },
  })
    .select('approvalRequestId organizationId workspaceId')
    .sort({ createdAt: 1, _id: 1 })
    .limit(limit)
    .lean();
  const requests = await ApprovalRequest.find({
    approvalRequestId: { $in: decisions.map((decision) => decision.approvalRequestId).slice(0, limit) },
  })
    .select('_id approvalRequestId agentSelectionDecisionId organizationId workspaceId status expiresAt revision requestId traceId requesterActorId permission invalidationReasonCode')
    .limit(limit)
    .lean();
  const requestsById = new Map(requests.map((request) => [request.approvalRequestId, request]));
  let updated = 0;
  for (const decision of decisions) {
    const request = requestsById.get(decision.approvalRequestId);
    if (request && (request.organizationId !== decision.organizationId || request.workspaceId !== decision.workspaceId)) continue;
    const result = await handleApprovalResolution(decision.approvalRequestId, request);
    updated += result.updated || 0;
  }
  return { scanned: decisions.length, updated };
}

async function ensureAgentSelectionIndexes() {
  for (const Model of [CapabilityCatalogEntry, AgentSelectionPolicy, AgentSelectionDecision]) await Model.createIndexes();
  return { models: ['CapabilityCatalogEntry', 'AgentSelectionPolicy', 'AgentSelectionDecision'] };
}

module.exports = {
  activatePolicy,
  archivePolicy,
  compatibilityCheck,
  createPolicy,
  ensureAgentSelectionIndexes,
  evaluateSelection,
  getAgent,
  getDecision,
  getPolicy,
  handleApprovalResolution,
  listAgents,
  listCapabilities,
  listDecisions,
  listPolicies,
  normalizeSelectionRequest,
  reconcileSelectionApprovals,
  refreshCapabilityCatalog,
  serializeCatalogEntry,
  serializeDecision,
  serializePolicy,
  updatePolicy,
  updateTrust,
  validatePolicy,
};
