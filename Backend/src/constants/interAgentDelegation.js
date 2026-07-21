const { DATA_CLASSIFICATIONS } = require('./agentSelection');

const DATA_CONTRACT_STATUSES = Object.freeze(['draft', 'active', 'archived']);
const DELEGATION_GRANT_STATUSES = Object.freeze([
  'pending',
  'active',
  'exhausted',
  'expired',
  'revoked',
  'completed',
  'rejected',
]);
const DELEGATION_INVOCATION_STATUSES = Object.freeze([
  'prepared',
  'approval_required',
  'invoking',
  'succeeded',
  'failed',
  'cancelled',
  'rejected',
]);
const TERMINAL_GRANT_STATUSES = Object.freeze([
  'exhausted',
  'expired',
  'revoked',
  'completed',
  'rejected',
]);
const TERMINAL_DELEGATION_INVOCATION_STATUSES = Object.freeze([
  'succeeded',
  'failed',
  'cancelled',
  'rejected',
]);
const MAPPING_MODES = Object.freeze(['direct', 'contract']);
const RETENTION_MODES = Object.freeze([
  'metadata_only',
  'validated_output_only',
  'encrypted_short_term',
  'no_payload',
]);
const TRANSFORMATION_OPERATIONS = Object.freeze([
  'select',
  'rename',
  'literal',
  'truncate_string',
  'slice_array',
  'normalize_date',
  'map_enum',
  'clamp_number',
  'normalize_boolean',
  'wrap_object',
  'flatten_object',
  'sha256',
  'pseudonymize',
]);
const REDACTION_ACTIONS = Object.freeze([
  'remove',
  'replace',
  'mask',
  'truncate',
  'sha256',
  'pseudonymize',
]);
const MINIMIZATION_OPERATIONS = Object.freeze(['remove_optional']);
const SAFE_SELECTOR_KEYS = Object.freeze([
  'passportId',
  'connectionId',
  'publisher',
  'capabilityCategory',
  'minimumTrustTier',
  'selectionPolicyId',
  'orchestrationDefinitionId',
  'orchestrationNodeKey',
]);

const INTER_AGENT_LIMITS = Object.freeze({
  maximumListLimit: 100,
  maximumSearchLength: 100,
  maximumNameLength: 200,
  maximumDescriptionLength: 2_000,
  maximumPurposeLength: 1_000,
  maximumArrayItems: 1_000,
  maximumStringLength: 100_000,
  maximumObjectDepth: 20,
  maximumPayloadBytes: 1_000_000,
  maximumAttachmentBytes: 10_000_000,
  maximumFields: 250,
  maximumRules: 100,
  maximumPathDepth: 20,
  maximumInvocationLimit: 1_000,
  platformMaximumDelegationDepth: 5,
  maximumValidityMs: 30 * 24 * 60 * 60 * 1_000,
  internalReferenceLifetimeMs: 5 * 60 * 1_000,
});

const CLASSIFICATION_RANK = Object.freeze(
  Object.fromEntries(DATA_CLASSIFICATIONS.map((value, index) => [value, index])),
);

const GRANT_TRANSITIONS = Object.freeze({
  pending: new Set(['active', 'expired', 'revoked', 'rejected']),
  active: new Set(['exhausted', 'expired', 'revoked', 'completed']),
  exhausted: new Set(),
  expired: new Set(),
  revoked: new Set(),
  completed: new Set(),
  rejected: new Set(),
});

const INVOCATION_TRANSITIONS = Object.freeze({
  prepared: new Set(['approval_required', 'invoking', 'failed', 'cancelled', 'rejected']),
  approval_required: new Set(['invoking', 'cancelled', 'rejected']),
  invoking: new Set(['succeeded', 'failed', 'cancelled']),
  succeeded: new Set(),
  failed: new Set(['invoking']),
  cancelled: new Set(),
  rejected: new Set(),
});

function assertTransition(table, from, to, code) {
  if (from === to) return;
  if (!table[from]?.has(to)) {
    const error = new Error(`Invalid state transition from ${from} to ${to}.`);
    error.code = code;
    throw error;
  }
}

function assertGrantTransition(from, to) {
  assertTransition(GRANT_TRANSITIONS, from, to, 'INTER_AGENT_GRANT_TRANSITION_INVALID');
}

function assertDelegationInvocationTransition(from, to) {
  assertTransition(
    INVOCATION_TRANSITIONS,
    from,
    to,
    'INTER_AGENT_INVOCATION_TRANSITION_INVALID',
  );
}

module.exports = {
  CLASSIFICATION_RANK,
  DATA_CLASSIFICATIONS,
  DATA_CONTRACT_STATUSES,
  DELEGATION_GRANT_STATUSES,
  DELEGATION_INVOCATION_STATUSES,
  INTER_AGENT_LIMITS,
  MAPPING_MODES,
  MINIMIZATION_OPERATIONS,
  REDACTION_ACTIONS,
  RETENTION_MODES,
  SAFE_SELECTOR_KEYS,
  TERMINAL_DELEGATION_INVOCATION_STATUSES,
  TERMINAL_GRANT_STATUSES,
  TRANSFORMATION_OPERATIONS,
  assertDelegationInvocationTransition,
  assertGrantTransition,
};
