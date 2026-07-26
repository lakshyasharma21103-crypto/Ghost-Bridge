const SELECTION_POLICY_STATUSES = Object.freeze(['draft', 'active', 'archived']);
const SELECTION_DECISION_STATUSES = Object.freeze([
  'selected',
  'no_candidate',
  'approval_required',
  'rejected',
]);
const TRUST_TIERS = Object.freeze([
  'unverified',
  'registered',
  'organization_verified',
  'platform_verified',
]);
const VERIFICATION_STATUSES = Object.freeze([
  'unverified',
  'passport_validated',
  'organization_verified',
  'platform_verified',
]);
const COST_CLASSES = Object.freeze(['unknown', 'low', 'medium', 'high']);
const LATENCY_CLASSES = Object.freeze(['unknown', 'fast', 'standard', 'slow']);
const DATA_CLASSIFICATIONS = Object.freeze([
  'public',
  'internal',
  'confidential',
  'restricted',
]);
const HEALTH_STATUSES = Object.freeze(['unknown', 'healthy', 'degraded', 'unhealthy', 'disabled']);
const READINESS_STATUSES = Object.freeze(['unknown', 'ready', 'not_ready']);
const CIRCUIT_STATES = Object.freeze(['closed', 'open', 'half_open']);
const COMPATIBILITY_STATUSES = Object.freeze(['compatible', 'incompatible', 'uncertain']);
const TARGETING_MODES = Object.freeze(['pinned', 'governed_selection']);
const SELECTION_TIMINGS = Object.freeze(['run_creation']);

const AGENT_SELECTION_LIMITS = Object.freeze({
  maximumCandidates: 50,
  maximumFallbackCandidates: 10,
  maximumListLimit: 100,
  maximumArrayItems: 100,
  maximumDescriptionLength: 2_000,
  maximumCapabilityDescriptionLength: 1_000,
  maximumSearchLength: 100,
  maximumTags: 30,
  maximumTagLength: 64,
  maximumRegions: 30,
  maximumScoreWeight: 1_000,
  maximumScoreWeightTotal: 10_000,
  maximumSchemaBytes: 250_000,
});

const DEFAULT_SCORE_WEIGHTS = Object.freeze({
  schemaCompatibility: 25,
  trust: 20,
  health: 10,
  readiness: 10,
  latency: 10,
  cost: 10,
  publisherVerification: 5,
  administrativePreference: 5,
  recentReliability: 5,
});

const SCORE_COMPONENTS = Object.freeze(Object.keys(DEFAULT_SCORE_WEIGHTS));
const DEFAULT_TIE_BREAKER = 'score_trust_verification_passport_connection';

function rankOf(values, value) {
  const index = values.indexOf(String(value || '').toLowerCase());
  return index < 0 ? -1 : index;
}

function trustRank(value) {
  return rankOf(TRUST_TIERS, value);
}

function verificationRank(value) {
  return rankOf(VERIFICATION_STATUSES, value);
}

function costRank(value) {
  return rankOf(COST_CLASSES, value);
}

function latencyRank(value) {
  return rankOf(LATENCY_CLASSES, value);
}

module.exports = {
  AGENT_SELECTION_LIMITS,
  CIRCUIT_STATES,
  COMPATIBILITY_STATUSES,
  COST_CLASSES,
  DATA_CLASSIFICATIONS,
  DEFAULT_SCORE_WEIGHTS,
  DEFAULT_TIE_BREAKER,
  HEALTH_STATUSES,
  LATENCY_CLASSES,
  READINESS_STATUSES,
  SCORE_COMPONENTS,
  SELECTION_DECISION_STATUSES,
  SELECTION_POLICY_STATUSES,
  SELECTION_TIMINGS,
  TARGETING_MODES,
  TRUST_TIERS,
  VERIFICATION_STATUSES,
  costRank,
  latencyRank,
  trustRank,
  verificationRank,
};
