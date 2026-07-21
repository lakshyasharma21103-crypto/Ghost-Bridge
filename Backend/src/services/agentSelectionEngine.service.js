const {
  AGENT_SELECTION_LIMITS,
  COST_CLASSES,
  DATA_CLASSIFICATIONS,
  DEFAULT_SCORE_WEIGHTS,
  DEFAULT_TIE_BREAKER,
  LATENCY_CLASSES,
  SCORE_COMPONENTS,
  TRUST_TIERS,
  VERIFICATION_STATUSES,
  costRank,
  latencyRank,
  trustRank,
  verificationRank,
} = require('../constants/agentSelection');
const { canonicalize } = require('../utils/idempotency');
const { sha256 } = require('../utils/complianceCanonical');
const { checkSchemaCompatibility } = require('./schemaCompatibility.service');
const { AppError } = require('../utils/AppError');

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function stableList(values = [], limit = AGENT_SELECTION_LIMITS.maximumArrayItems) {
  if (!Array.isArray(values)) {
    throw new AppError(400, 'AGENT_SELECTION_CONSTRAINT_INVALID', 'Selection constraint lists must be arrays.');
  }
  const list = [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].sort();
  if (list.length > limit || list.some((value) => value.length > 200)) throw new AppError(400, 'AGENT_SELECTION_CONSTRAINT_INVALID', 'Selection constraint list exceeds its limit.');
  return list;
}

function normalizeScoreWeights(input = {}) {
  const weights = {};
  let total = 0;
  for (const key of SCORE_COMPONENTS) {
    const value = Number(input[key] ?? DEFAULT_SCORE_WEIGHTS[key]);
    if (!Number.isInteger(value) || value < 0 || value > AGENT_SELECTION_LIMITS.maximumScoreWeight) {
      throw new AppError(400, 'AGENT_SELECTION_SCORE_WEIGHT_INVALID', 'Selection score weight is invalid.', [{ path: `scoreWeights.${key}`, code: 'WEIGHT_OUT_OF_RANGE', message: 'Weight must be a bounded non-negative integer.' }]);
    }
    weights[key] = value;
    total += value;
  }
  if (total < 1 || total > AGENT_SELECTION_LIMITS.maximumScoreWeightTotal) {
    throw new AppError(400, 'AGENT_SELECTION_SCORE_WEIGHT_INVALID', 'Selection score-weight total is invalid.');
  }
  return { weights, total };
}

function validateEnum(value, values, path, fallback) {
  const normalized = String(value ?? fallback ?? '').trim().toLowerCase();
  if (!values.includes(normalized)) {
    throw new AppError(400, 'AGENT_SELECTION_CONSTRAINT_INVALID', 'Selection constraint is invalid.', [{ path, code: 'ENUM_VALUE_INVALID', message: `${path} is invalid.` }]);
  }
  return normalized;
}

function normalizePolicyInput(input = {}, current = {}) {
  if (input.scoreWeights != null && (!input.scoreWeights || typeof input.scoreWeights !== 'object' || Array.isArray(input.scoreWeights))) {
    throw new AppError(400, 'AGENT_SELECTION_SCORE_WEIGHT_INVALID', 'Selection score weights must be an object.');
  }
  const scoreWeights = normalizeScoreWeights(input.scoreWeights || current.scoreWeights || {}).weights;
  const capabilityRequirements = stableList(input.capabilityRequirements ?? current.capabilityRequirements ?? []);
  const fallbackCandidateCount = Number(input.fallbackCandidateCount ?? current.fallbackCandidateCount ?? 3);
  if (!Number.isInteger(fallbackCandidateCount) || fallbackCandidateCount < 0 || fallbackCandidateCount > AGENT_SELECTION_LIMITS.maximumFallbackCandidates) {
    throw new AppError(400, 'AGENT_SELECTION_POLICY_INVALID', 'Fallback candidate count is invalid.');
  }
  const tieBreaker = String(input.tieBreaker || current.tieBreaker || DEFAULT_TIE_BREAKER);
  if (tieBreaker !== DEFAULT_TIE_BREAKER) {
    throw new AppError(400, 'AGENT_SELECTION_TIE_BREAKER_INVALID', 'Selection tie breaker is invalid.');
  }
  const approval = input.requireApprovalWhen || current.requireApprovalWhen || {};
  const allowedCapabilityCategories = stableList(input.allowedCapabilityCategories ?? current.allowedCapabilityCategories ?? []).map((value) => value.toUpperCase());
  const allowedRegions = stableList(input.allowedRegions ?? current.allowedRegions ?? []).map((value) => value.toUpperCase());
  const requiredResidencyRegions = stableList(input.requiredResidencyRegions ?? current.requiredResidencyRegions ?? []).map((value) => value.toUpperCase());
  if (allowedCapabilityCategories.some((value) => !/^[A-Z][A-Z0-9_-]{0,63}$/.test(value))) {
    throw new AppError(400, 'AGENT_SELECTION_POLICY_INVALID', 'Allowed capability categories are invalid.');
  }
  if ([...allowedRegions, ...requiredResidencyRegions].some((value) => !/^[A-Z0-9-]{2,16}$/.test(value))) {
    throw new AppError(400, 'AGENT_SELECTION_POLICY_INVALID', 'Selection policy regions are invalid.');
  }
  return {
    name: String(input.name ?? current.name ?? '').trim(),
    description: String(input.description ?? current.description ?? '').trim(),
    capabilityRequirements,
    allowedCapabilityCategories,
    allowedPassportIds: stableList(input.allowedPassportIds ?? current.allowedPassportIds ?? []),
    deniedPassportIds: stableList(input.deniedPassportIds ?? current.deniedPassportIds ?? []),
    allowedPublishers: stableList(input.allowedPublishers ?? current.allowedPublishers ?? []),
    deniedPublishers: stableList(input.deniedPublishers ?? current.deniedPublishers ?? []),
    minimumTrustTier: validateEnum(input.minimumTrustTier ?? current.minimumTrustTier, TRUST_TIERS, 'minimumTrustTier', 'registered'),
    requiredVerificationStatuses: stableList(input.requiredVerificationStatuses ?? current.requiredVerificationStatuses ?? []).map((value) => validateEnum(value, VERIFICATION_STATUSES, 'requiredVerificationStatuses')),
    allowedRegions,
    requiredResidencyRegions,
    allowedDataClassifications: stableList(input.allowedDataClassifications ?? current.allowedDataClassifications ?? DATA_CLASSIFICATIONS).map((value) => validateEnum(value, DATA_CLASSIFICATIONS, 'allowedDataClassifications')),
    maximumCostClass: validateEnum(input.maximumCostClass ?? current.maximumCostClass, COST_CLASSES, 'maximumCostClass', 'high'),
    maximumLatencyClass: validateEnum(input.maximumLatencyClass ?? current.maximumLatencyClass, LATENCY_CLASSES, 'maximumLatencyClass', 'slow'),
    requireHealthy: (input.requireHealthy ?? current.requireHealthy) !== false,
    requireReady: (input.requireReady ?? current.requireReady) !== false,
    allowOpenCircuit: (input.allowOpenCircuit ?? current.allowOpenCircuit) === true,
    allowRateLimitedCandidate: (input.allowRateLimitedCandidate ?? current.allowRateLimitedCandidate) === true,
    allowUncertainSchemaCompatibility: (input.allowUncertainSchemaCompatibility ?? current.allowUncertainSchemaCompatibility) === true,
    requireApprovalWhen: {
      manualReview: approval.manualReview === true,
      ...(approval.trustBelow ? { trustBelow: validateEnum(approval.trustBelow, TRUST_TIERS, 'requireApprovalWhen.trustBelow') } : {}),
      unverifiedPublisher: approval.unverifiedPublisher === true,
      dataClassifications: stableList(approval.dataClassifications || []).map((value) => validateEnum(value, DATA_CLASSIFICATIONS, 'requireApprovalWhen.dataClassifications')),
      costClasses: stableList(approval.costClasses || []).map((value) => validateEnum(value, COST_CLASSES, 'requireApprovalWhen.costClasses')),
      uncertainResidency: approval.uncertainResidency === true,
    },
    scoreWeights,
    fallbackCandidateCount,
    fallbackCandidatesPermitted: (input.fallbackCandidatesPermitted ?? current.fallbackCandidatesPermitted) !== false,
    userPreferenceOverridesPermitted: (input.userPreferenceOverridesPermitted ?? current.userPreferenceOverridesPermitted) !== false,
    tieBreaker,
  };
}

function effectiveConstraints(policy, request = {}) {
  const constraints = request.constraints || {};
  const requestTrust = validateEnum(constraints.minimumTrustTier, TRUST_TIERS, 'constraints.minimumTrustTier', policy.minimumTrustTier);
  const minimumTrustTier = trustRank(requestTrust) > trustRank(policy.minimumTrustTier) ? requestTrust : policy.minimumTrustTier;
  const requestCost = validateEnum(constraints.maximumCostClass, COST_CLASSES, 'constraints.maximumCostClass', policy.maximumCostClass);
  const maximumCostClass = safeMaximumClass(policy.maximumCostClass, requestCost, costRank);
  const requestLatency = validateEnum(constraints.maximumLatencyClass, LATENCY_CLASSES, 'constraints.maximumLatencyClass', policy.maximumLatencyClass);
  const maximumLatencyClass = safeMaximumClass(policy.maximumLatencyClass, requestLatency, latencyRank);
  const policyRegions = new Set(policy.allowedRegions || []);
  const requestRegions = stableList(constraints.allowedRegions || []).map((value) => value.toUpperCase());
  const requiredResidencyRegions = stableList([...(policy.requiredResidencyRegions || []), ...(constraints.requiredResidencyRegions || [])]).map((value) => value.toUpperCase());
  if ([...requestRegions, ...requiredResidencyRegions].some((value) => !/^[A-Z0-9-]{2,16}$/.test(value))) {
    throw new AppError(400, 'AGENT_SELECTION_CONSTRAINT_INVALID', 'Selection request regions are invalid.');
  }
  const allowedRegions = policyRegions.size && requestRegions.length
    ? requestRegions.filter((region) => policyRegions.has(region))
    : policyRegions.size ? [...policyRegions].sort() : requestRegions;
  const dataClassification = validateEnum(constraints.dataClassification, DATA_CLASSIFICATIONS, 'constraints.dataClassification', 'public');
  return {
    minimumTrustTier,
    maximumCostClass,
    maximumLatencyClass,
    allowedRegions,
    regionConstraintUnsatisfiable: policyRegions.size > 0 && requestRegions.length > 0 && allowedRegions.length === 0,
    requiredResidencyRegions,
    dataClassification,
    dataClassificationAllowed: (policy.allowedDataClassifications || []).includes(dataClassification),
    requireHealthy: policy.requireHealthy || constraints.requireHealthy === true,
    requireReady: policy.requireReady || constraints.requireReady === true,
    allowOpenCircuit: policy.allowOpenCircuit && constraints.allowOpenCircuit !== false,
    allowRateLimitedCandidate: policy.allowRateLimitedCandidate && constraints.allowRateLimitedCandidate !== false,
    allowUncertainSchemaCompatibility: policy.allowUncertainSchemaCompatibility === true,
  };
}

function safeMaximumClass(left, right, rank) {
  if (left === 'unknown') return right;
  if (right === 'unknown') return left;
  return rank(left) <= rank(right) ? left : right;
}

function exceedsClass(value, maximum, rank) {
  // Unknown administrative estimates are not trusted as cheap or fast. They may
  // only pass an unconstrained policy (the broadest known class or `unknown`).
  if (value === 'unknown') return !['unknown', 'high', 'slow'].includes(maximum);
  if (maximum === 'unknown') return false;
  return rank(value) > rank(maximum);
}

function intersects(left = [], right = []) {
  const set = new Set(left.map((value) => String(value).toLowerCase()));
  return right.some((value) => set.has(String(value).toLowerCase()));
}

function containsAll(values = [], required = []) {
  const set = new Set(values.map((value) => String(value).toUpperCase()));
  return required.every((value) => set.has(String(value).toUpperCase()));
}

function candidateCapability(candidate, capability, operation) {
  return (candidate.capabilities || []).find((item) => item.capabilityKey === capability && item.operationKeys.includes(operation));
}

function mandatoryFilter(candidate, request, policy, options = {}) {
  const reasons = [];
  const passportId = idOf(candidate.passportId);
  const denied = new Set([...(policy.deniedPassportIds || []).map(idOf), ...(request.excludedPassportIds || []).map(idOf)]);
  const allowed = new Set((policy.allowedPassportIds || []).map(idOf));
  if (denied.has(passportId)) reasons.push('ADMINISTRATIVELY_DENIED');
  else if (allowed.size && !allowed.has(passportId)) reasons.push('NOT_ADMINISTRATIVELY_ALLOWED');
  const publisher = String(candidate.publisherName || '').toLowerCase();
  const deniedPublishers = new Set((policy.deniedPublishers || []).map((value) => String(value).toLowerCase()));
  const allowedPublishers = new Set((policy.allowedPublishers || []).map((value) => String(value).toLowerCase()));
  if (deniedPublishers.has(publisher)) reasons.push('PUBLISHER_DENIED');
  else if (allowedPublishers.size && !allowedPublishers.has(publisher)) reasons.push('PUBLISHER_NOT_ALLOWED');
  if (candidate.availabilityStatus !== 'available' || candidate.lifecycleStatus !== 'valid') reasons.push('PASSPORT_UNAVAILABLE');
  if (candidate.connectionStatus !== 'connected') reasons.push('CONNECTION_UNAVAILABLE');
  const capability = candidateCapability(candidate, request.capability, request.operation);
  if (!capability) reasons.push('CAPABILITY_OR_OPERATION_UNAVAILABLE');
  if (capability && (policy.allowedCapabilityCategories || []).length && !intersects(capability.categories || [], policy.allowedCapabilityCategories)) reasons.push('CAPABILITY_CATEGORY_DENIED');
  if (options.policyDenied === true) reasons.push('POLICY_DENIED');
  if (trustRank(candidate.trustTier) < trustRank(options.constraints.minimumTrustTier)) reasons.push('TRUST_REQUIREMENT_NOT_MET');
  if ((policy.requiredVerificationStatuses || []).length && !policy.requiredVerificationStatuses.includes(candidate.verificationStatus)) reasons.push('VERIFICATION_REQUIREMENT_NOT_MET');
  if (options.constraints.dataClassificationAllowed === false || !(candidate.dataClassificationsAllowed || []).includes(options.constraints.dataClassification)) reasons.push('DATA_CLASSIFICATION_UNSUPPORTED');
  if (options.constraints.regionConstraintUnsatisfiable || (options.constraints.allowedRegions.length && !intersects(candidate.supportedRegions || [], options.constraints.allowedRegions))) reasons.push('REGION_NOT_ALLOWED');
  if (!containsAll(candidate.residencyRegions || [], options.constraints.requiredResidencyRegions)) reasons.push('RESIDENCY_REQUIREMENT_UNMET');
  if (exceedsClass(candidate.estimatedCostClass, options.constraints.maximumCostClass, costRank)) reasons.push('COST_LIMIT_EXCEEDED');
  if (exceedsClass(candidate.estimatedLatencyClass, options.constraints.maximumLatencyClass, latencyRank)) reasons.push('LATENCY_LIMIT_EXCEEDED');
  if (options.constraints.requireHealthy && candidate.healthSnapshotStale) reasons.push('STALE_HEALTH_SNAPSHOT');
  else if (options.constraints.requireHealthy && candidate.healthStatus !== 'healthy') reasons.push('HEALTH_REQUIREMENT_NOT_MET');
  if (options.constraints.requireReady && candidate.readinessStatus !== 'ready') reasons.push('READINESS_REQUIREMENT_NOT_MET');
  if (!options.constraints.allowOpenCircuit && candidate.circuitState === 'open') reasons.push('CIRCUIT_OPEN');
  if (!options.constraints.allowRateLimitedCandidate && candidate.rateLimitedUntil && new Date(candidate.rateLimitedUntil) > (options.now || new Date())) reasons.push('RATE_LIMITED');
  let compatibility;
  if (capability) {
    compatibility = checkSchemaCompatibility(request.inputSchema, capability.inputSchema, capability.outputSchema, request.requiredOutputSchema);
    if (compatibility.status === 'incompatible') reasons.push('SCHEMA_INCOMPATIBLE');
    if (compatibility.status === 'uncertain' && !options.constraints.allowUncertainSchemaCompatibility) reasons.push('SCHEMA_COMPATIBILITY_UNCERTAIN');
  }
  return { eligible: reasons.length === 0, reasons: [...new Set(reasons)].sort(), compatibility, capability };
}

function classScore(value, values, reverse = false) {
  const ranked = values.filter((item) => item !== 'unknown');
  const index = ranked.indexOf(value);
  if (index < 0 || value === 'unknown') return 0;
  const numerator = reverse ? ranked.length - 1 - index : index;
  return Math.round((numerator / Math.max(1, ranked.length - 1)) * 10_000);
}

function componentScores(candidate, filter, preferred) {
  return {
    schemaCompatibility: filter.compatibility?.status === 'compatible' ? 10_000 : 5_000,
    trust: classScore(candidate.trustTier, TRUST_TIERS),
    health: candidate.healthSnapshotStale ? 0 : candidate.healthStatus === 'healthy' ? 10_000 : candidate.healthStatus === 'degraded' ? 5_000 : 0,
    readiness: candidate.readinessStatus === 'ready' ? 10_000 : 0,
    latency: classScore(candidate.estimatedLatencyClass, LATENCY_CLASSES, true),
    cost: classScore(candidate.estimatedCostClass, COST_CLASSES, true),
    publisherVerification: classScore(candidate.verificationStatus, VERIFICATION_STATUSES),
    administrativePreference: preferred || candidate.administrativelyPreferred ? 10_000 : 5_000,
    recentReliability: Math.max(0, Math.min(10_000, Number(candidate.reliabilityScore || 0))),
  };
}

function scoreCandidate(candidate, filter, weights, preferred = false) {
  const normalized = normalizeScoreWeights(weights);
  const components = componentScores(candidate, filter, preferred);
  const weighted = SCORE_COMPONENTS.reduce((sum, key) => sum + components[key] * normalized.weights[key], 0);
  return { score: Math.floor(weighted / normalized.total), components };
}

function compareCandidates(left, right) {
  return right.score - left.score ||
    trustRank(right.trustTier) - trustRank(left.trustTier) ||
    verificationRank(right.verificationStatus) - verificationRank(left.verificationStatus) ||
    idOf(left.passportId).localeCompare(idOf(right.passportId)) ||
    idOf(left.connectionId).localeCompare(idOf(right.connectionId));
}

function safeCandidate(candidate, score) {
  return {
    passportId: idOf(candidate.passportId),
    passportVersion: candidate.passportVersion,
    connectionId: idOf(candidate.connectionId),
    agentName: candidate.agentName,
    publisherName: candidate.publisherName,
    score,
    trustTier: candidate.trustTier,
    verificationStatus: candidate.verificationStatus,
  };
}

function selectionRequiresApproval(candidate, constraints, policy) {
  const rules = policy.requireApprovalWhen || {};
  const reasons = [];
  if (rules.manualReview) reasons.push('MANUAL_SELECTION_REVIEW_REQUIRED');
  if (rules.trustBelow && trustRank(candidate.trustTier) < trustRank(rules.trustBelow)) reasons.push('TRUST_REVIEW_REQUIRED');
  if (rules.unverifiedPublisher && !['organization_verified', 'platform_verified'].includes(candidate.verificationStatus)) reasons.push('PUBLISHER_VERIFICATION_REVIEW_REQUIRED');
  if ((rules.dataClassifications || []).includes(constraints.dataClassification)) reasons.push('DATA_CLASSIFICATION_REVIEW_REQUIRED');
  if ((rules.costClasses || []).includes(candidate.estimatedCostClass)) reasons.push('COST_REVIEW_REQUIRED');
  if (rules.uncertainResidency && constraints.requiredResidencyRegions.length && !(candidate.residencyRegions || []).length) reasons.push('RESIDENCY_REVIEW_REQUIRED');
  return { required: reasons.length > 0, reasons };
}

function candidateSnapshotHash(candidates) {
  return sha256(canonicalize(candidates.map((candidate) => ({
    passportId: idOf(candidate.passportId),
    passportVersion: candidate.passportVersion,
    connectionId: idOf(candidate.connectionId),
    sourceVersion: candidate.sourceVersion,
    trustTier: candidate.trustTier,
    verificationStatus: candidate.verificationStatus,
    healthStatus: candidate.healthStatus,
    readinessStatus: candidate.readinessStatus,
    circuitState: candidate.circuitState,
    healthSnapshotAt: candidate.healthSnapshotAt,
  })).sort((left, right) => left.connectionId.localeCompare(right.connectionId))));
}

module.exports = {
  candidateSnapshotHash,
  compareCandidates,
  effectiveConstraints,
  mandatoryFilter,
  normalizePolicyInput,
  normalizeScoreWeights,
  safeCandidate,
  scoreCandidate,
  selectionRequiresApproval,
};
