const crypto = require('node:crypto');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { AppError } = require('../utils/AppError');
const { canonicalize } = require('../utils/idempotency');
const { encryptPayload, decryptPayload } = require('../utils/crypto');
const {
  CLASSIFICATION_RANK,
  DATA_CLASSIFICATIONS,
} = require('../constants/interAgentDelegation');
const {
  COMPENSATION_ORDERINGS,
  EXPECTED_IDEMPOTENCY_BEHAVIORS,
  FAILURE_CATEGORIES,
  FAILURE_STRATEGIES,
  NON_AUTOMATIC_RECOVERY_CATEGORIES,
  RECOVERABILITIES,
  RECOVERY_LIMITS,
  RECOVERY_POLICY_STATUSES,
} = require('../constants/orchestrationRecovery');
const {
  approximateBytes,
  assertClassificationAllowed,
  assertRegionResidency,
  dangerousSegment,
  pathSegments,
  processDelegatedInput,
  safeClone,
} = require('./interAgentData.service');
const {
  schemaDeclaresPath,
  validateAgainstSchema,
} = require('./orchestrationValidation.service');

const SAFE_OBJECT_ID = /^[a-f0-9]{24}$/i;
const SAFE_HASH = /^(?:sha256|hmac-sha256):[a-f0-9]{64}$/;
const SAFE_NODE_KEY = /^[A-Za-z][A-Za-z0-9_-]{0,99}$/;
const SAFE_IDENTIFIER = /^[A-Za-z][A-Za-z0-9._:-]{0,199}$/;
const POLICY_DEFAULTS = Object.freeze({
  status: 'draft',
  defaultFailureStrategy: 'fail',
  maximumRecoveryAttempts: 3,
  maximumCompensationAttempts: 3,
  recoveryBackoffPolicy: Object.freeze({
    baseDelayMs: 1_000,
    maxDelayMs: 30_000,
    multiplier: 2,
    jitterRatio: 0.2,
  }),
  compensationBackoffPolicy: Object.freeze({
    baseDelayMs: 1_000,
    maxDelayMs: 30_000,
    multiplier: 2,
    jitterRatio: 0.2,
  }),
  recoveryDeadlineMs: 60 * 60 * 1_000,
  compensationDeadlineMs: 60 * 60 * 1_000,
  allowOperatorRetry: true,
  allowOperatorSkip: false,
  allowOperatorResume: true,
  allowOperatorCompensate: true,
  allowOperatorTerminate: false,
  allowOperatorAgentReplacement: false,
  allowOperatorInputCorrection: false,
  requireApprovalForRetry: false,
  requireApprovalForSkip: true,
  requireApprovalForCompensation: false,
  requireApprovalForAgentReplacement: true,
  requireApprovalForInputCorrection: true,
  requireApprovalForForceTermination: true,
  permittedFailureCategories: Object.freeze([]),
  nonRecoverableFailureCategories: Object.freeze([]),
  automaticCompensation: false,
  compensateOnCancellation: false,
  compensateOnTimeout: false,
  compensateOnPolicyRevocation: false,
  compensateOnConnectionRevocation: false,
  compensationOrdering: 'reverse_topological',
  continueCompensationAfterFailure: false,
  maximumParallelCompensations: 1,
});

const RECOVERY_POLICY_INPUT_KEYS = new Set([
  'workspaceId',
  'receivingWorkspaceId',
  'idempotencyKey',
  'name',
  'description',
  'status',
  'defaultFailureStrategy',
  'maximumRecoveryAttempts',
  'maximumCompensationAttempts',
  'recoveryBackoffPolicy',
  'compensationBackoffPolicy',
  'recoveryDeadlineMs',
  'compensationDeadlineMs',
  'allowOperatorRetry',
  'allowOperatorSkip',
  'allowOperatorResume',
  'allowOperatorCompensate',
  'allowOperatorTerminate',
  'allowOperatorAgentReplacement',
  'allowOperatorInputCorrection',
  'requireApprovalForRetry',
  'requireApprovalForSkip',
  'requireApprovalForCompensation',
  'requireApprovalForAgentReplacement',
  'requireApprovalForInputCorrection',
  'requireApprovalForForceTermination',
  'permittedFailureCategories',
  'nonRecoverableFailureCategories',
  'automaticCompensation',
  'compensateOnCancellation',
  'compensateOnTimeout',
  'compensateOnPolicyRevocation',
  'compensateOnConnectionRevocation',
  'compensationOrdering',
  'continueCompensationAfterFailure',
  'maximumParallelCompensations',
]);
const RECOVERY_POLICY_INPUT_KEY_SET = RECOVERY_POLICY_INPUT_KEYS;
const POLICY_DOCUMENT_KEYS = new Set([
  ...RECOVERY_POLICY_INPUT_KEYS,
  '_id',
  '__v',
  'organizationId',
  'workspaceId',
  'version',
  'validationDigest',
  'validatedAt',
  'createdBy',
  'updatedBy',
  'activatedBy',
  'activatedAt',
  'archivedBy',
  'archivedAt',
  'createdAt',
  'updatedAt',
]);
const BOOLEAN_POLICY_KEYS = Object.freeze([
  'allowOperatorRetry',
  'allowOperatorSkip',
  'allowOperatorResume',
  'allowOperatorCompensate',
  'allowOperatorTerminate',
  'allowOperatorAgentReplacement',
  'allowOperatorInputCorrection',
  'requireApprovalForRetry',
  'requireApprovalForSkip',
  'requireApprovalForCompensation',
  'requireApprovalForAgentReplacement',
  'requireApprovalForInputCorrection',
  'requireApprovalForForceTermination',
  'automaticCompensation',
  'compensateOnCancellation',
  'compensateOnTimeout',
  'compensateOnPolicyRevocation',
  'compensateOnConnectionRevocation',
  'continueCompensationAfterFailure',
]);
const COMPENSATION_DEFINITION_KEYS = new Set([
  'targetingMode',
  'connectionId',
  'passportId',
  'passportVersion',
  '_passportVersion',
  'selectionPolicyId',
  'selectionPolicyVersion',
  'selectionDecisionId',
  'selectionConstraints',
  'preferredPassportIds',
  'excludedPassportIds',
  'capability',
  'operation',
  'inputSchema',
  'outputSchema',
  'inputMapping',
  'timeoutMs',
  'retryPolicy',
  'dataContractId',
  'dataContractVersion',
  'approvalRequirement',
  'expectedIdempotencyBehavior',
  'successCriteria',
  'continueAfterCompensationFailure',
  'parallelSafe',
  'dependencies',
]);
const COMPENSATION_SOURCE_PATTERNS = Object.freeze([
  /^\$original\.input(?:\.[A-Za-z][A-Za-z0-9_-]{0,127})+$/,
  /^\$original\.output(?:\.[A-Za-z][A-Za-z0-9_-]{0,127})+$/,
  /^\$invocation\.(?:requestId|traceId|invocationId|attempt|completedAt|safeResultCode)$/,
  /^\$orchestration\.(?:runId|definitionId|definitionVersion|nodeKey|workspaceId)$/,
  /^\$compensations\.[A-Za-z][A-Za-z0-9_-]{0,99}\.output(?:\.[A-Za-z][A-Za-z0-9_-]{0,127})+$/,
  /^\$(?:source|runInput|metadata|dependency)(?:\.[A-Za-z][A-Za-z0-9_-]{0,127})+$/,
]);
const EXECUTABLE_OR_PRIVATE_KEYS = /(?:^|_)(?:script|javascript|expression|eval|function|source[_-]?code|credential|password|secret|authorization|api[_-]?key|install[_-]?key|provider[_-]?key|system[_-]?prompt|chain[_-]?of[_-]?thought|hidden[_-]?reasoning|private[_-]?memory)(?:$|_)/i;
const EXECUTABLE_QUERY_KEYS = new Set(['$where', '$function', '$accumulator', '$expr']);

function issue(path, code, message) {
  return { path, code, message };
}

function recoveryError(code, message, details = []) {
  return new AppError(400, code, message, details);
}

function plain(value) {
  if (value && typeof value.toObject === 'function') {
    return value.toObject({ depopulate: true, flattenMaps: true, virtuals: false });
  }
  return value || {};
}

function hashValue(value, seen = new WeakSet()) {
  if (value == null || ['string', 'boolean'].includes(typeof value)) return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Recovery hash values must be finite.');
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value.toHexString === 'function') {
    const identifier = value.toHexString();
    if (SAFE_OBJECT_ID.test(identifier)) return identifier.toLowerCase();
  }
  if (value && typeof value.toObject === 'function') {
    return hashValue(
      value.toObject({ depopulate: true, flattenMaps: true, virtuals: false }),
      seen,
    );
  }
  if (!value || typeof value !== 'object') {
    if (value === undefined) return undefined;
    throw new TypeError('Recovery hash values must be inert JSON data.');
  }
  if (seen.has(value)) throw new TypeError('Recovery hash values must not contain cycles.');
  seen.add(value);
  let output;
  if (Array.isArray(value)) {
    output = value.map((item) => hashValue(item, seen));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      seen.delete(value);
      throw new TypeError('Recovery hash values must use plain objects.');
    }
    output = {};
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || descriptor.get || descriptor.set) {
        seen.delete(value);
        throw new TypeError('Recovery hash values cannot contain accessors.');
      }
      const normalized = hashValue(descriptor.value, seen);
      if (normalized !== undefined) output[key] = normalized;
    }
  }
  seen.delete(value);
  return output;
}

function stableHash(value, purpose = 'orchestration-recovery') {
  return `sha256:${crypto
    .createHash('sha256')
    .update(`ghost-bridge:${purpose}:v1\0`, 'utf8')
    .update(canonicalize(hashValue(value)), 'utf8')
    .digest('hex')}`;
}

function uniqueSorted(values, allowed) {
  const normalized = Array.isArray(values)
    ? values.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  return [...new Set(normalized)].filter((value) => !allowed || allowed.includes(value)).sort();
}

function numberOr(value, fallback) {
  return value == null || value === '' ? fallback : Number(value);
}

function normalizeBackoffPolicy(input, fallback) {
  if (input != null && (typeof input !== 'object' || Array.isArray(input))) {
    throw recoveryError(
      'ORCHESTRATION_RECOVERY_POLICY_INVALID',
      'Recovery backoff policy must be an object.',
    );
  }
  const value = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const unknown = Object.keys(value).filter(
    (key) => !['baseDelayMs', 'maxDelayMs', 'multiplier', 'jitterRatio'].includes(key),
  );
  if (unknown.length) {
    throw recoveryError(
      'ORCHESTRATION_RECOVERY_POLICY_INVALID',
      'Recovery backoff policy contains unsupported fields.',
      unknown.map((key) => issue(key, 'RECOVERY_POLICY_FIELD_FORBIDDEN', 'Unsupported policy field.')),
    );
  }
  return {
    baseDelayMs: numberOr(value.baseDelayMs, fallback.baseDelayMs),
    maxDelayMs: numberOr(value.maxDelayMs, fallback.maxDelayMs),
    multiplier: numberOr(value.multiplier, fallback.multiplier),
    jitterRatio: numberOr(value.jitterRatio, fallback.jitterRatio),
  };
}

function normalizeRecoveryPolicyInput(input = {}, current = {}) {
  const proposed = plain(input);
  const existing = plain(current);
  if (!proposed || typeof proposed !== 'object' || Array.isArray(proposed)) {
    throw recoveryError('ORCHESTRATION_RECOVERY_POLICY_INVALID', 'Recovery policy input must be an object.');
  }
  const unsafeIssues = [];
  inspectClosedJson(proposed, '$recoveryPolicy', unsafeIssues);
  if (unsafeIssues.length) {
    throw recoveryError(
      'ORCHESTRATION_RECOVERY_POLICY_INVALID',
      'Recovery policy contains non-JSON, private, or executable data.',
      unsafeIssues,
    );
  }
  const unknown = Object.keys(proposed).filter((key) => !RECOVERY_POLICY_INPUT_KEY_SET.has(key));
  if (unknown.length) {
    throw recoveryError(
      'ORCHESTRATION_RECOVERY_POLICY_INVALID',
      'Recovery policy contains unsupported or executable fields.',
      unknown.map((key) => issue(key, 'RECOVERY_POLICY_FIELD_FORBIDDEN', 'Unsupported policy field.')),
    );
  }
  for (const key of ['name', 'description', 'status', 'defaultFailureStrategy', 'compensationOrdering']) {
    if (Object.hasOwn(proposed, key) && typeof proposed[key] !== 'string') {
      throw recoveryError('ORCHESTRATION_RECOVERY_POLICY_INVALID', `${key} must be a string.`);
    }
  }
  for (const key of BOOLEAN_POLICY_KEYS) {
    if (Object.hasOwn(proposed, key) && typeof proposed[key] !== 'boolean') {
      throw recoveryError('ORCHESTRATION_RECOVERY_POLICY_INVALID', `${key} must be a boolean.`);
    }
  }
  for (const key of ['permittedFailureCategories', 'nonRecoverableFailureCategories']) {
    if (Object.hasOwn(proposed, key) && !Array.isArray(proposed[key])) {
      throw recoveryError('ORCHESTRATION_RECOVERY_POLICY_INVALID', `${key} must be an array.`);
    }
  }
  const merged = { ...POLICY_DEFAULTS, ...existing, ...proposed };
  const normalized = {
    name: String(merged.name || '').trim(),
    description: String(merged.description || '').trim(),
    status: String(merged.status || POLICY_DEFAULTS.status),
    defaultFailureStrategy: String(
      merged.defaultFailureStrategy || POLICY_DEFAULTS.defaultFailureStrategy,
    ),
    maximumRecoveryAttempts: numberOr(
      merged.maximumRecoveryAttempts,
      POLICY_DEFAULTS.maximumRecoveryAttempts,
    ),
    maximumCompensationAttempts: numberOr(
      merged.maximumCompensationAttempts,
      POLICY_DEFAULTS.maximumCompensationAttempts,
    ),
    recoveryBackoffPolicy: normalizeBackoffPolicy(
      merged.recoveryBackoffPolicy,
      POLICY_DEFAULTS.recoveryBackoffPolicy,
    ),
    compensationBackoffPolicy: normalizeBackoffPolicy(
      merged.compensationBackoffPolicy,
      POLICY_DEFAULTS.compensationBackoffPolicy,
    ),
    recoveryDeadlineMs: numberOr(merged.recoveryDeadlineMs, POLICY_DEFAULTS.recoveryDeadlineMs),
    compensationDeadlineMs: numberOr(
      merged.compensationDeadlineMs,
      POLICY_DEFAULTS.compensationDeadlineMs,
    ),
    permittedFailureCategories: uniqueSorted(merged.permittedFailureCategories),
    nonRecoverableFailureCategories: uniqueSorted(merged.nonRecoverableFailureCategories),
    compensationOrdering: String(
      merged.compensationOrdering || POLICY_DEFAULTS.compensationOrdering,
    ),
    maximumParallelCompensations: numberOr(
      merged.maximumParallelCompensations,
      POLICY_DEFAULTS.maximumParallelCompensations,
    ),
  };
  for (const key of BOOLEAN_POLICY_KEYS) normalized[key] = merged[key] === true;

  if (existing.status === 'active') {
    const previous = normalizeRecoveryPolicyInput({}, { ...existing, status: 'draft' });
    const candidate = { ...normalized, status: 'draft' };
    if (canonicalize(previous) !== canonicalize(candidate)) {
      throw recoveryError(
        'ORCHESTRATION_RECOVERY_POLICY_IMMUTABLE',
        'Active recovery-policy versions cannot be modified.',
      );
    }
    normalized.status = 'active';
  }
  return normalized;
}

function validateInteger(issues, path, value, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    issues.push(issue(path, 'RECOVERY_POLICY_LIMIT_INVALID', `Value must be an integer from ${minimum} to ${maximum}.`));
  }
}

function validateBackoff(issues, path, value) {
  validateInteger(issues, `${path}.baseDelayMs`, value.baseDelayMs, 1, RECOVERY_LIMITS.maximumBackoffMs);
  validateInteger(issues, `${path}.maxDelayMs`, value.maxDelayMs, 1, RECOVERY_LIMITS.maximumBackoffMs);
  if (value.maxDelayMs < value.baseDelayMs) {
    issues.push(issue(`${path}.maxDelayMs`, 'RECOVERY_BACKOFF_RANGE_INVALID', 'Maximum delay cannot be lower than base delay.'));
  }
  if (!Number.isFinite(value.multiplier) || value.multiplier < 1 || value.multiplier > 10) {
    issues.push(issue(`${path}.multiplier`, 'RECOVERY_BACKOFF_MULTIPLIER_INVALID', 'Multiplier must be from 1 to 10.'));
  }
  if (!Number.isFinite(value.jitterRatio) || value.jitterRatio < 0 || value.jitterRatio > 0.5) {
    issues.push(issue(`${path}.jitterRatio`, 'RECOVERY_BACKOFF_JITTER_INVALID', 'Jitter ratio must be from 0 to 0.5.'));
  }
}

function validateRecoveryPolicyDocument(policyInput = {}) {
  const document = plain(policyInput);
  const issues = [];
  for (const key of Object.keys(document)) {
    if (!POLICY_DOCUMENT_KEYS.has(key)) {
      issues.push(issue(key, 'RECOVERY_POLICY_FIELD_FORBIDDEN', 'Unsupported or executable policy fields are forbidden.'));
    }
  }
  let normalized;
  try {
    normalized = normalizeRecoveryPolicyInput(
      Object.fromEntries(Object.entries(document).filter(([key]) => RECOVERY_POLICY_INPUT_KEY_SET.has(key))),
    );
  } catch (error) {
    issues.push(...(error.details?.length ? error.details : [issue('$', error.code || 'RECOVERY_POLICY_INVALID', error.message)]));
    normalized = normalizeRecoveryPolicyInput({});
  }
  if (!normalized.name || normalized.name.length > RECOVERY_LIMITS.maximumNameLength) {
    issues.push(issue('name', 'RECOVERY_POLICY_NAME_INVALID', 'A bounded policy name is required.'));
  }
  if (normalized.description.length > RECOVERY_LIMITS.maximumDescriptionLength) {
    issues.push(issue('description', 'RECOVERY_POLICY_DESCRIPTION_INVALID', 'Policy description is too long.'));
  }
  if (!RECOVERY_POLICY_STATUSES.includes(normalized.status)) {
    issues.push(issue('status', 'RECOVERY_POLICY_STATUS_INVALID', 'Recovery-policy status is invalid.'));
  }
  if (!FAILURE_STRATEGIES.includes(normalized.defaultFailureStrategy)) {
    issues.push(issue('defaultFailureStrategy', 'RECOVERY_POLICY_STRATEGY_INVALID', 'Failure strategy is invalid.'));
  }
  validateInteger(issues, 'maximumRecoveryAttempts', normalized.maximumRecoveryAttempts, 0, RECOVERY_LIMITS.maximumRecoveryAttempts);
  validateInteger(issues, 'maximumCompensationAttempts', normalized.maximumCompensationAttempts, 0, RECOVERY_LIMITS.maximumCompensationAttempts);
  validateInteger(issues, 'recoveryDeadlineMs', normalized.recoveryDeadlineMs, RECOVERY_LIMITS.minimumDeadlineMs, RECOVERY_LIMITS.maximumDeadlineMs);
  validateInteger(issues, 'compensationDeadlineMs', normalized.compensationDeadlineMs, RECOVERY_LIMITS.minimumDeadlineMs, RECOVERY_LIMITS.maximumDeadlineMs);
  validateInteger(issues, 'maximumParallelCompensations', normalized.maximumParallelCompensations, 1, RECOVERY_LIMITS.maximumParallelCompensations);
  validateBackoff(issues, 'recoveryBackoffPolicy', normalized.recoveryBackoffPolicy);
  validateBackoff(issues, 'compensationBackoffPolicy', normalized.compensationBackoffPolicy);
  if (!COMPENSATION_ORDERINGS.includes(normalized.compensationOrdering)) {
    issues.push(issue('compensationOrdering', 'COMPENSATION_ORDERING_INVALID', 'Compensation ordering is invalid.'));
  }
  if (normalized.defaultFailureStrategy === 'retry' && normalized.maximumRecoveryAttempts < 1) {
    issues.push(issue('maximumRecoveryAttempts', 'RECOVERY_RETRY_ATTEMPTS_REQUIRED', 'Retry strategy requires at least one bounded recovery attempt.'));
  }
  if (
    (normalized.automaticCompensation || normalized.defaultFailureStrategy.startsWith('compensate_then_')) &&
    normalized.maximumCompensationAttempts < 1
  ) {
    issues.push(issue('maximumCompensationAttempts', 'RECOVERY_COMPENSATION_ATTEMPTS_REQUIRED', 'Automatic compensation requires at least one bounded compensation attempt.'));
  }
  for (const key of ['permittedFailureCategories', 'nonRecoverableFailureCategories']) {
    const rawValues = Array.isArray(document[key]) ? document[key] : [];
    for (const value of rawValues) {
      if (!FAILURE_CATEGORIES.includes(String(value))) {
        issues.push(issue(key, 'RECOVERY_FAILURE_CATEGORY_INVALID', `Unknown failure category: ${String(value).slice(0, 64)}`));
      }
    }
  }
  const conflicts = normalized.permittedFailureCategories.filter((category) =>
    normalized.nonRecoverableFailureCategories.includes(category),
  );
  if (conflicts.length) {
    issues.push(issue('nonRecoverableFailureCategories', 'RECOVERY_CATEGORY_CONFLICT', 'A category cannot be both permitted and non-recoverable.'));
  }
  if (
    normalized.defaultFailureStrategy === 'retry' &&
    normalized.permittedFailureCategories.length &&
    normalized.permittedFailureCategories.every((category) =>
      NON_AUTOMATIC_RECOVERY_CATEGORIES.includes(category),
    )
  ) {
    issues.push(issue('permittedFailureCategories', 'RECOVERY_RETRY_CATEGORY_UNSAFE', 'Retry policy contains no automatically retryable category.'));
  }
  const digestMaterial = { ...normalized };
  delete digestMaterial.status;
  return {
    valid: issues.length === 0,
    errors: issues,
    issues,
    normalized,
    validationDigest: stableHash(digestMaterial, 'recovery-policy-validation'),
  };
}

function inspectClosedJson(value, path, issues, seen = new WeakSet()) {
  if (value == null || ['string', 'boolean'].includes(typeof value)) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) issues.push(issue(path, 'NON_FINITE_VALUE', 'Numbers must be finite.'));
    return;
  }
  if (
    value instanceof Date ||
    (value && typeof value.toHexString === 'function' && SAFE_OBJECT_ID.test(value.toHexString()))
  ) {
    return;
  }
  if (typeof value !== 'object') {
    issues.push(issue(path, 'EXECUTABLE_VALUE_FORBIDDEN', 'Only inert JSON values are allowed.'));
    return;
  }
  if (seen.has(value)) {
    issues.push(issue(path, 'CIRCULAR_VALUE_FORBIDDEN', 'Circular values are forbidden.'));
    return;
  }
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    issues.push(issue(path, 'OBJECT_PROTOTYPE_FORBIDDEN', 'Only plain JSON objects are allowed.'));
    return;
  }
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const normalized = String(key).replace(/([a-z])([A-Z])/g, '$1_$2');
    if (
      dangerousSegment(key) ||
      EXECUTABLE_QUERY_KEYS.has(String(key).toLowerCase()) ||
      EXECUTABLE_OR_PRIVATE_KEYS.test(normalized)
    ) {
      issues.push(issue(`${path}.${key}`, 'PRIVATE_OR_EXECUTABLE_FIELD_FORBIDDEN', 'Protected or executable fields are forbidden.'));
    } else {
      inspectClosedJson(child, `${path}.${key}`, issues, seen);
    }
  }
  seen.delete(value);
}

function schemaIssues(schema, path) {
  const issues = [];
  inspectClosedJson(schema, path, issues);
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    issues.push(issue(path, 'COMPENSATION_SCHEMA_REQUIRED', 'A JSON Schema object is required.'));
    return issues;
  }
  try {
    const ajv = new Ajv({ allErrors: true, strict: false, validateSchema: true });
    addFormats(ajv);
    ajv.compile(schema);
  } catch (error) {
    issues.push(issue(path, 'COMPENSATION_SCHEMA_INVALID', String(error.message || 'JSON Schema is invalid.').slice(0, 300)));
  }
  return issues;
}

function inspectCompensationMapping(value, path, issues) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    issues.push(issue(path, 'COMPENSATION_MAPPING_VALUE_INVALID', 'Compensation mapping must be an object.'));
    return;
  }
  const entries = Object.entries(value);
  if (entries.length > 1_000) {
    issues.push(issue(path, 'COMPENSATION_MAPPING_LIMIT_EXCEEDED', 'Compensation mapping is too large.'));
    return;
  }
  for (const [target, source] of entries) {
    try {
      pathSegments(target);
    } catch {
      issues.push(issue(`${path}.${target}`, 'COMPENSATION_MAPPING_TARGET_FORBIDDEN', 'Mapping target is invalid or protected.'));
      continue;
    }
    if (typeof source === 'string') {
      if (!COMPENSATION_SOURCE_PATTERNS.some((pattern) => pattern.test(source))) {
        issues.push(issue(`${path}.${target}`, 'COMPENSATION_MAPPING_SOURCE_FORBIDDEN', 'Mapping source is not an approved safe source.'));
      }
      continue;
    }
    if (
      source &&
      typeof source === 'object' &&
      !Array.isArray(source) &&
      Object.keys(source).length === 1 &&
      Object.hasOwn(source, 'literal')
    ) {
      inspectClosedJson(source.literal, `${path}.${target}.literal`, issues);
      continue;
    }
    issues.push(issue(`${path}.${target}`, 'COMPENSATION_MAPPING_VALUE_INVALID', 'Mapping values must be approved paths or explicit safe literals.'));
  }
}

function validateCompensationDefinition(definitionInput = {}, context = {}) {
  const definition = plain(definitionInput);
  const issues = [];
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    return { valid: false, errors: [issue('$', 'COMPENSATION_DEFINITION_REQUIRED', 'Compensation definition is required.')] };
  }
  for (const key of Object.keys(definition)) {
    if (!COMPENSATION_DEFINITION_KEYS.has(key)) {
      issues.push(issue(key, 'COMPENSATION_FIELD_FORBIDDEN', 'Unsupported compensation-definition field.'));
    }
  }
  inspectClosedJson(definition, '$', issues);
  const targetingMode = String(
    definition.targetingMode || (definition.selectionPolicyId ? 'governed_selection' : 'pinned'),
  );
  if (!['pinned', 'governed_selection'].includes(targetingMode)) {
    issues.push(issue('targetingMode', 'COMPENSATION_TARGET_INVALID', 'Compensation target mode is invalid.'));
  } else if (targetingMode === 'pinned') {
    if (!SAFE_OBJECT_ID.test(String(definition.connectionId || '')) || !SAFE_OBJECT_ID.test(String(definition.passportId || ''))) {
      issues.push(issue('connectionId', 'COMPENSATION_TARGET_INVALID', 'Pinned compensation requires connection and passport IDs.'));
    }
    if (definition.selectionPolicyId || definition.selectionConstraints || (definition.preferredPassportIds || []).length || (definition.excludedPassportIds || []).length) {
      issues.push(issue('targetingMode', 'COMPENSATION_TARGET_CONFLICT', 'Pinned and governed targets cannot be combined.'));
    }
  } else {
    if (definition.connectionId || definition.passportId) {
      issues.push(issue('targetingMode', 'COMPENSATION_TARGET_CONFLICT', 'Governed compensation cannot pin a target.'));
    }
    if (!SAFE_OBJECT_ID.test(String(definition.selectionPolicyId || ''))) {
      issues.push(issue('selectionPolicyId', 'COMPENSATION_TARGET_INVALID', 'Governed compensation requires a selection policy ID.'));
    }
  }
  if (!SAFE_IDENTIFIER.test(String(definition.capability || '')) || !SAFE_IDENTIFIER.test(String(definition.operation || ''))) {
    issues.push(issue('capability', 'COMPENSATION_CAPABILITY_INVALID', 'Capability and operation require bounded identifiers.'));
  }
  issues.push(...schemaIssues(definition.inputSchema, 'inputSchema'));
  issues.push(...schemaIssues(definition.outputSchema, 'outputSchema'));
  inspectCompensationMapping(definition.inputMapping || {}, 'inputMapping', issues);
  const timeout = Number(definition.timeoutMs || 0);
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 1_800_000) {
    issues.push(issue('timeoutMs', 'COMPENSATION_TIMEOUT_INVALID', 'Compensation timeout must be from 100 to 1800000 milliseconds.'));
  }
  const attempts = Number(definition.retryPolicy?.maxAttempts || 1);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > RECOVERY_LIMITS.maximumCompensationAttempts) {
    issues.push(issue('retryPolicy.maxAttempts', 'COMPENSATION_RETRY_INVALID', 'Compensation attempts exceed the bounded limit.'));
  }
  if (definition.dataContractId) {
    if (!SAFE_OBJECT_ID.test(String(definition.dataContractId)) || !Number.isInteger(Number(definition.dataContractVersion)) || Number(definition.dataContractVersion) < 1) {
      issues.push(issue('dataContractId', 'COMPENSATION_CONTRACT_VERSION_INVALID', 'A pinned contract ID and version are required.'));
    }
  } else if (definition.dataContractVersion != null) {
    issues.push(issue('dataContractVersion', 'COMPENSATION_CONTRACT_VERSION_INVALID', 'Contract version cannot exist without a contract ID.'));
  }
  if (!EXPECTED_IDEMPOTENCY_BEHAVIORS.includes(String(definition.expectedIdempotencyBehavior || 'ghost_bridge_keyed'))) {
    issues.push(issue('expectedIdempotencyBehavior', 'COMPENSATION_IDEMPOTENCY_INVALID', 'Expected idempotency behavior is invalid.'));
  }
  if (definition.expectedIdempotencyBehavior === 'non_idempotent' && context.allowNonIdempotent !== true) {
    issues.push(issue('expectedIdempotencyBehavior', 'COMPENSATION_NON_IDEMPOTENT_FORBIDDEN', 'Non-idempotent compensation requires explicit manual authorization.'));
  }
  const dependencies = Array.isArray(definition.dependencies) ? definition.dependencies : [];
  if (dependencies.some((key) => !SAFE_NODE_KEY.test(String(key)))) {
    issues.push(issue('dependencies', 'COMPENSATION_DEPENDENCY_INVALID', 'Compensation dependencies contain an invalid node key.'));
  }
  return {
    valid: issues.length === 0,
    errors: issues,
    issues,
    definitionDigest: stableHash(definition, 'compensation-definition'),
  };
}

function dateMillis(value) {
  if (!value) return 0;
  const number = new Date(value).getTime();
  return Number.isFinite(number) ? number : 0;
}

function idString(value) {
  return value == null ? undefined : String(value);
}

function compensationEligible(nodeRunInput = {}, nodeDefinitionInput = {}, options = {}) {
  const nodeRun = plain(nodeRunInput);
  const nodeDefinition = plain(nodeDefinitionInput);
  const recoverability = String(nodeRun.recoverability || nodeDefinition.recoverability || 'retryable');
  const compensationDefinition = nodeDefinition.compensationDefinition || options.compensationDefinition;
  const completedSideEffect = Boolean(
    nodeRun.completedSideEffectAt ||
      nodeRun.sideEffectCompleted === true ||
      (options.assumeSucceededSideEffects !== false &&
        nodeRun.status === 'succeeded' &&
        (compensationDefinition || ['non_reversible', 'manual_only'].includes(recoverability))),
  );
  let reasonCode = 'COMPENSATION_ELIGIBLE';
  let eligible = true;
  if (!completedSideEffect) {
    eligible = false;
    reasonCode = 'SIDE_EFFECT_NOT_COMPLETED';
  } else if (nodeRun.compensatedAt || nodeRun.compensationStatus === 'succeeded' || nodeRun.status === 'compensated') {
    eligible = false;
    reasonCode = 'ALREADY_COMPENSATED';
  } else if (nodeRun.compensationWaivedAt || nodeRun.compensationStatus === 'waived' || options.waived === true) {
    eligible = false;
    reasonCode = 'COMPENSATION_WAIVED';
  } else if (recoverability === 'non_reversible') {
    eligible = false;
    reasonCode = 'NON_REVERSIBLE_SIDE_EFFECT';
  } else if (recoverability === 'manual_only') {
    eligible = false;
    reasonCode = 'MANUAL_INTERVENTION_REQUIRED';
  } else if (!compensationDefinition) {
    eligible = false;
    reasonCode = 'COMPENSATION_NOT_DECLARED';
  }
  return {
    eligible,
    compensationRequired: completedSideEffect && !['ALREADY_COMPENSATED', 'COMPENSATION_WAIVED'].includes(reasonCode),
    completedSideEffect,
    recoverability: RECOVERABILITIES.includes(recoverability) ? recoverability : 'manual_only',
    reasonCode,
    safeReasonCode: reasonCode,
    compensationDefinition,
  };
}

function normalizePlanningInput(definitionInput, nodeRunsInput, optionsInput) {
  const wrapper = plain(definitionInput);
  if (wrapper.definitionSnapshot || wrapper.definition || Array.isArray(wrapper.nodeRuns)) {
    return {
      definition: plain(wrapper.definitionSnapshot || wrapper.definition || {}),
      nodeRuns: Array.isArray(wrapper.nodeRuns) ? wrapper.nodeRuns : nodeRunsInput,
      options: { ...optionsInput, ...wrapper.options, ordering: wrapper.ordering || optionsInput.ordering },
    };
  }
  return { definition: wrapper, nodeRuns: nodeRunsInput, options: optionsInput };
}

function dependencyMap(definition) {
  const map = new Map((definition.nodes || []).map((node) => [String(node.nodeKey), new Set((node.dependencies || []).map(String))]));
  for (const edge of definition.edges || []) {
    const from = String(edge.from || '');
    const to = String(edge.to || '');
    if (map.has(to) && map.has(from)) map.get(to).add(from);
  }
  return map;
}

function topologicalRanks(definition, dependencies) {
  const remaining = new Map([...dependencies].map(([key, values]) => [key, new Set(values)]));
  const ranks = new Map();
  let rank = 0;
  while (remaining.size) {
    const ready = [...remaining]
      .filter(([, values]) => values.size === 0)
      .map(([key]) => key)
      .sort();
    if (!ready.length) {
      throw recoveryError('ORCHESTRATION_COMPENSATION_GRAPH_INVALID', 'Orchestration dependency graph contains a cycle.');
    }
    for (const key of ready) {
      ranks.set(key, rank);
      remaining.delete(key);
    }
    for (const values of remaining.values()) ready.forEach((key) => values.delete(key));
    rank += 1;
  }
  for (const node of definition.nodes || []) if (!ranks.has(String(node.nodeKey))) ranks.set(String(node.nodeKey), rank);
  return ranks;
}

function descendantsFor(key, dependents, candidates, seen = new Set()) {
  for (const child of dependents.get(key) || []) {
    if (seen.has(child)) continue;
    seen.add(child);
    descendantsFor(child, dependents, candidates, seen);
  }
  return [...seen].filter((candidate) => candidates.has(candidate));
}

function deterministicCompensationSteps(definitionInput = {}, nodeRunsInput = [], optionsInput = {}) {
  const { definition, nodeRuns, options } = normalizePlanningInput(
    definitionInput,
    Array.isArray(nodeRunsInput) ? nodeRunsInput : [],
    optionsInput || {},
  );
  const ordering = String(options.ordering || definition.compensationOrdering || 'reverse_topological');
  if (!COMPENSATION_ORDERINGS.includes(ordering)) {
    throw recoveryError('COMPENSATION_ORDERING_INVALID', 'Compensation ordering is invalid.');
  }
  const definitions = new Map((definition.nodes || []).map((node) => [String(node.nodeKey), plain(node)]));
  const dependencies = dependencyMap(definition);
  const ranks = topologicalRanks(definition, dependencies);
  const dependents = new Map([...dependencies.keys()].map((key) => [key, new Set()]));
  for (const [nodeKey, values] of dependencies) {
    for (const dependency of values) {
      if (!dependents.has(dependency)) dependents.set(dependency, new Set());
      dependents.get(dependency).add(nodeKey);
    }
  }
  const byNodeKey = new Map();
  for (const input of nodeRuns || []) {
    const run = plain(input);
    const key = String(run.nodeKey || '');
    if (!definitions.has(key)) continue;
    const current = byNodeKey.get(key);
    if (!current || dateMillis(run.completedSideEffectAt || run.completedAt) > dateMillis(current.completedSideEffectAt || current.completedAt)) {
      byNodeKey.set(key, run);
    }
  }
  const candidates = new Map();
  for (const [nodeKey, run] of byNodeKey) {
    const eligibility = compensationEligible(run, definitions.get(nodeKey), options);
    if (!eligibility.completedSideEffect || ['ALREADY_COMPENSATED', 'COMPENSATION_WAIVED'].includes(eligibility.reasonCode)) continue;
    candidates.set(nodeKey, { nodeKey, run, definition: definitions.get(nodeKey), eligibility });
  }
  if (candidates.size > RECOVERY_LIMITS.maximumPlanSteps) {
    throw recoveryError('COMPENSATION_PLAN_LIMIT_EXCEEDED', 'Compensation plan exceeds its bounded step limit.');
  }
  const remaining = new Map();
  const candidateKeys = new Set(candidates.keys());
  for (const [nodeKey, candidate] of candidates) {
    const required = new Set(descendantsFor(nodeKey, dependents, candidateKeys));
    for (const explicit of candidate.definition.compensationDefinition?.dependencies || []) {
      const dependencyKey = String(explicit);
      if (candidateKeys.has(dependencyKey) && dependencyKey !== nodeKey) required.add(dependencyKey);
    }
    remaining.set(nodeKey, required);
  }
  const compare = (leftKey, rightKey) => {
    const left = candidates.get(leftKey);
    const right = candidates.get(rightKey);
    const completion = dateMillis(right.run.completedSideEffectAt || right.run.completedAt) - dateMillis(left.run.completedSideEffectAt || left.run.completedAt);
    const topology = (ranks.get(rightKey) || 0) - (ranks.get(leftKey) || 0);
    if (ordering === 'reverse_completion') return completion || topology || leftKey.localeCompare(rightKey);
    return topology || completion || leftKey.localeCompare(rightKey);
  };
  const orderedKeys = [];
  while (remaining.size) {
    const ready = [...remaining]
      .filter(([, requirements]) => requirements.size === 0)
      .map(([key]) => key)
      .sort(compare);
    if (!ready.length) {
      throw recoveryError('ORCHESTRATION_COMPENSATION_GRAPH_INVALID', 'Compensation dependencies contain a cycle.');
    }
    for (const key of ready) {
      orderedKeys.push(key);
      remaining.delete(key);
    }
    for (const requirements of remaining.values()) ready.forEach((key) => requirements.delete(key));
  }
  const ordinal = new Map(orderedKeys.map((key, index) => [key, index + 1]));
  return orderedKeys.map((nodeKey, index) => {
    const candidate = candidates.get(nodeKey);
    const compensation = candidate.definition.compensationDefinition;
    const dependencyKeys = [...new Set([
      ...descendantsFor(nodeKey, dependents, candidateKeys),
      ...(compensation?.dependencies || []).map(String).filter((key) => candidateKeys.has(key)),
    ])]
      .sort((left, right) => (ordinal.get(left) || 0) - (ordinal.get(right) || 0))
      .map((key) => `compensation:${key}`);
    return {
      stepKey: `compensation:${nodeKey}`,
      order: index + 1,
      originalNodeRunId: idString(candidate.run._id || candidate.run.id),
      nodeKey,
      dependencyStepKeys: dependencyKeys,
      recoverability: candidate.eligibility.recoverability,
      compensationRequired: candidate.eligibility.eligible,
      approvalRequired: Boolean(compensation?.approvalRequirement?.required || compensation?.approvalRequirement === true),
      parallelSafe: compensation?.parallelSafe === true,
      safeReasonCode: candidate.eligibility.reasonCode,
      compensationDefinitionHash: compensation
        ? stableHash(compensation, 'compensation-definition')
        : undefined,
    };
  });
}

function deterministicCompensationBatches(stepsInput = [], maximumParallel = 1) {
  const steps = Array.isArray(stepsInput) ? stepsInput.map((step) => ({ ...step })) : [];
  const limit = Math.max(1, Math.min(RECOVERY_LIMITS.maximumParallelCompensations, Number(maximumParallel) || 1));
  const remaining = new Map(steps.map((step) => [step.stepKey, step]));
  const completed = new Set();
  const batches = [];
  while (remaining.size) {
    const ready = [...remaining.values()]
      .filter((step) => (step.dependencyStepKeys || []).every((key) => completed.has(key)))
      .sort((left, right) => Number(left.order) - Number(right.order) || String(left.stepKey).localeCompare(String(right.stepKey)));
    if (!ready.length) throw recoveryError('ORCHESTRATION_COMPENSATION_GRAPH_INVALID', 'Compensation steps contain unresolved dependencies.');
    const first = ready[0];
    const batch = first.parallelSafe
      ? ready.filter((step) => step.parallelSafe).slice(0, limit)
      : [first];
    batches.push(batch);
    for (const step of batch) {
      remaining.delete(step.stepKey);
      completed.add(step.stepKey);
    }
  }
  return batches;
}

function sortedNodeKeys(nodeRuns, statuses) {
  return [...new Set((nodeRuns || [])
    .filter((node) => statuses.has(String(node.status)))
    .map((node) => String(node.nodeKey || ''))
    .filter((key) => SAFE_NODE_KEY.test(key)))]
    .sort();
}

function snapshotHashOrValue(explicit, value, purpose) {
  if (explicit) return String(explicit);
  return value == null ? undefined : stableHash(value, purpose);
}

function checkpointSnapshot(runInput = {}, nodeRunsInput = [], optionsInput = {}) {
  const wrapper = plain(runInput);
  const run = plain(wrapper.run || wrapper.orchestrationRun || runInput);
  const nodeRuns = Array.isArray(wrapper.nodeRuns) ? wrapper.nodeRuns.map(plain) : (nodeRunsInput || []).map(plain);
  const options = { ...optionsInput, ...(wrapper.options || {}) };
  return {
    orchestrationRunId: idString(run._id || run.id || run.orchestrationRunId),
    runStatus: String(run.status || run.runStatus || 'unknown'),
    completedNodeKeys: sortedNodeKeys(nodeRuns, new Set(['succeeded', 'compensated'])),
    activeNodeKeys: sortedNodeKeys(nodeRuns, new Set(['ready', 'queued', 'running', 'retry_wait', 'waiting_approval', 'waiting_intervention', 'recovery_pending', 'recovering', 'compensation_pending', 'compensating'])),
    compensatedNodeKeys: sortedNodeKeys(nodeRuns, new Set(['compensated'])),
    skippedNodeKeys: sortedNodeKeys(nodeRuns, new Set(['skipped'])),
    failedNodeKeys: sortedNodeKeys(nodeRuns, new Set(['failed', 'compensation_failed', 'non_reversible', 'terminated'])),
    definitionSnapshotHash: snapshotHashOrValue(
      options.definitionSnapshotHash || run.definitionSnapshotHash,
      options.definitionSnapshot || run.definitionSnapshot,
      'checkpoint-definition',
    ),
    selectionSnapshotHash: snapshotHashOrValue(
      options.selectionSnapshotHash || run.selectionSnapshotHash,
      options.selectionSnapshot,
      'checkpoint-selection',
    ),
    contractSnapshotHash: snapshotHashOrValue(
      options.contractSnapshotHash || run.contractSnapshotHash,
      options.contractSnapshot,
      'checkpoint-contract',
    ),
    recoveryPolicySnapshotHash: snapshotHashOrValue(
      options.recoveryPolicySnapshotHash || run.recoveryPolicySnapshotHash,
      options.recoveryPolicySnapshot || run.recoveryPolicySnapshot,
      'checkpoint-recovery-policy',
    ),
  };
}

function checkpointHash(snapshotInput = {}) {
  const snapshot = plain(snapshotInput);
  const material = {
    orchestrationRunId: idString(snapshot.orchestrationRunId),
    runStatus: String(snapshot.runStatus || ''),
    completedNodeKeys: uniqueSorted(snapshot.completedNodeKeys),
    activeNodeKeys: uniqueSorted(snapshot.activeNodeKeys),
    compensatedNodeKeys: uniqueSorted(snapshot.compensatedNodeKeys),
    skippedNodeKeys: uniqueSorted(snapshot.skippedNodeKeys),
    failedNodeKeys: uniqueSorted(snapshot.failedNodeKeys),
    definitionSnapshotHash: snapshot.definitionSnapshotHash,
    selectionSnapshotHash: snapshot.selectionSnapshotHash,
    contractSnapshotHash: snapshot.contractSnapshotHash,
    recoveryPolicySnapshotHash: snapshot.recoveryPolicySnapshotHash,
  };
  return stableHash(material, 'orchestration-checkpoint');
}

function checkpointMaterial(checkpoint) {
  return {
    orchestrationRunId: idString(checkpoint.orchestrationRunId),
    runStatus: checkpoint.runStatus,
    completedNodeKeys: checkpoint.completedNodeKeys || [],
    activeNodeKeys: checkpoint.activeNodeKeys || [],
    compensatedNodeKeys: checkpoint.compensatedNodeKeys || [],
    skippedNodeKeys: checkpoint.skippedNodeKeys || [],
    failedNodeKeys: checkpoint.failedNodeKeys || [],
    definitionSnapshotHash: checkpoint.definitionSnapshotHash,
    selectionSnapshotHash: checkpoint.selectionSnapshotHash,
    contractSnapshotHash: checkpoint.contractSnapshotHash,
    recoveryPolicySnapshotHash: checkpoint.recoveryPolicySnapshotHash,
  };
}

function validateCheckpoint(checkpointInput = {}, currentSnapshotInput) {
  const checkpoint = plain(checkpointInput);
  const errors = [];
  if (!SAFE_OBJECT_ID.test(idString(checkpoint.orchestrationRunId) || '')) {
    errors.push(issue('orchestrationRunId', 'CHECKPOINT_RUN_REFERENCE_INVALID', 'Checkpoint run reference is invalid.'));
  }
  if (!checkpoint.runStatus || String(checkpoint.runStatus).length > 64) {
    errors.push(issue('runStatus', 'CHECKPOINT_RUN_STATUS_INVALID', 'Checkpoint run status is invalid.'));
  }
  const nodeFields = [
    'completedNodeKeys',
    'activeNodeKeys',
    'compensatedNodeKeys',
    'skippedNodeKeys',
    'failedNodeKeys',
  ];
  for (const field of nodeFields) {
    const values = checkpoint[field];
    if (
      !Array.isArray(values) ||
      values.length > RECOVERY_LIMITS.maximumPlanSteps ||
      new Set(values.map(String)).size !== values.length ||
      values.some((value) => !SAFE_NODE_KEY.test(String(value)))
    ) {
      errors.push(issue(field, 'CHECKPOINT_NODE_SET_INVALID', 'Checkpoint node sets must be unique, bounded safe node keys.'));
    }
  }
  const terminalMembership = new Map();
  for (const field of ['compensatedNodeKeys', 'skippedNodeKeys', 'failedNodeKeys']) {
    for (const nodeKey of checkpoint[field] || []) {
      if (terminalMembership.has(String(nodeKey))) {
        errors.push(issue(field, 'CHECKPOINT_NODE_STATE_CONFLICT', 'A node cannot have conflicting terminal checkpoint states.'));
      }
      terminalMembership.set(String(nodeKey), field);
    }
  }
  for (const nodeKey of checkpoint.activeNodeKeys || []) {
    if (terminalMembership.has(String(nodeKey)) || (checkpoint.completedNodeKeys || []).includes(nodeKey)) {
      errors.push(issue('activeNodeKeys', 'CHECKPOINT_NODE_STATE_CONFLICT', 'Active nodes cannot also be terminal or completed.'));
    }
  }
  for (const field of [
    'definitionSnapshotHash',
    'selectionSnapshotHash',
    'contractSnapshotHash',
    'recoveryPolicySnapshotHash',
  ]) {
    if ((field === 'definitionSnapshotHash' || checkpoint[field] != null) && !SAFE_HASH.test(String(checkpoint[field] || ''))) {
      errors.push(issue(field, 'CHECKPOINT_SNAPSHOT_HASH_INVALID', 'Checkpoint snapshot hash is invalid.'));
    }
  }
  const expectedHash = checkpointHash(checkpointMaterial(checkpoint));
  if (!checkpoint.safeStateHash || checkpoint.safeStateHash !== expectedHash) {
    errors.push(issue('safeStateHash', 'CHECKPOINT_HASH_MISMATCH', 'Checkpoint state hash is invalid.'));
  }
  if (!checkpoint.definitionSnapshotHash) {
    errors.push(issue('definitionSnapshotHash', 'CHECKPOINT_DEFINITION_HASH_REQUIRED', 'Checkpoint definition hash is required.'));
  }
  if (checkpoint.status === 'invalidated') {
    errors.push(issue('status', 'CHECKPOINT_INVALIDATED', 'Invalidated checkpoints cannot be resumed.'));
  }
  if (currentSnapshotInput) {
    const current = checkpointMaterial(plain(currentSnapshotInput));
    const currentHash = checkpointHash(current);
    if (currentHash !== expectedHash) {
      errors.push(issue('$', 'CHECKPOINT_STATE_MISMATCH', 'Current durable state does not match the checkpoint.'));
    }
  }
  return { valid: errors.length === 0, errors, issues: errors, expectedHash };
}

function patchEntries(patchInput) {
  if (Array.isArray(patchInput)) {
    return patchInput.map((entry) => ({ path: String(entry?.path || ''), value: entry?.value }));
  }
  if (patchInput && typeof patchInput === 'object') {
    return Object.keys(patchInput).sort().map((path) => ({ path, value: patchInput[path] }));
  }
  throw recoveryError('ORCHESTRATION_CORRECTED_INPUT_INVALID', 'Corrected input patch must be an object or path/value array.');
}

function assignCorrection(target, segments, value) {
  let current = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (!Object.hasOwn(current, segment) || !current[segment] || typeof current[segment] !== 'object' || Array.isArray(current[segment])) {
      current[segment] = {};
    }
    current = current[segment];
  }
  current[segments.at(-1)] = value;
}

function correctedInputPatch(originalInput = {}, patchInput = {}, options = {}) {
  const inputSchema = options.inputSchema || options.schema;
  if (!inputSchema || typeof inputSchema !== 'object') {
    throw recoveryError('ORCHESTRATION_CORRECTED_INPUT_SCHEMA_REQUIRED', 'Corrected input requires the frozen input schema.');
  }
  const entries = patchEntries(patchInput);
  if (!entries.length || entries.length > RECOVERY_LIMITS.maximumChangedFields) {
    throw recoveryError('ORCHESTRATION_CORRECTED_INPUT_LIMIT_EXCEEDED', 'Corrected input changes must be non-empty and bounded.');
  }
  const allowedFields = options.allowedCorrectionFields
    ? new Set(options.allowedCorrectionFields.map((path) => pathSegments(path).join('.')))
    : null;
  const seen = new Set();
  const changedFieldNames = [];
  const corrected = safeClone(originalInput, { maximumPayloadBytes: RECOVERY_LIMITS.maximumCorrectedInputBytes });
  for (const entry of entries) {
    const segments = pathSegments(entry.path);
    const normalizedPath = segments.join('.');
    if (
      segments.some((segment) => {
        const normalized = String(segment).replace(/([a-z])([A-Z])/g, '$1_$2');
        return dangerousSegment(segment) || EXECUTABLE_OR_PRIVATE_KEYS.test(normalized);
      })
    ) {
      throw recoveryError(
        'ORCHESTRATION_CORRECTED_INPUT_FIELD_FORBIDDEN',
        'Corrected input cannot change protected fields.',
      );
    }
    if (seen.has(normalizedPath)) {
      throw recoveryError('ORCHESTRATION_CORRECTED_INPUT_DUPLICATE_FIELD', 'A corrected field may appear only once.');
    }
    if (allowedFields && !allowedFields.has(normalizedPath)) {
      throw recoveryError('ORCHESTRATION_CORRECTED_INPUT_FIELD_FORBIDDEN', 'The corrected field is not approved by policy.');
    }
    if (!schemaDeclaresPath(inputSchema, segments)) {
      throw recoveryError('ORCHESTRATION_CORRECTED_INPUT_FIELD_UNDECLARED', 'Corrected input cannot add undeclared fields.');
    }
    const clonedValue = safeClone(entry.value, { maximumPayloadBytes: RECOVERY_LIMITS.maximumCorrectedInputBytes });
    assignCorrection(corrected, segments, clonedValue);
    seen.add(normalizedPath);
    changedFieldNames.push(normalizedPath);
  }
  let validated = validateAgainstSchema(inputSchema, corrected, {
    code: 'ORCHESTRATION_CORRECTED_INPUT_SCHEMA_INVALID',
    message: 'Corrected input does not match its frozen schema.',
  });
  const originalClassification = String(options.originalClassification || options.dataClassification || 'restricted').toLowerCase();
  const dataClassification = String(options.dataClassification || originalClassification).toLowerCase();
  if (!DATA_CLASSIFICATIONS.includes(originalClassification) || !DATA_CLASSIFICATIONS.includes(dataClassification)) {
    throw recoveryError('ORCHESTRATION_CORRECTED_INPUT_CLASSIFICATION_INVALID', 'Corrected input classification is invalid.');
  }
  if (CLASSIFICATION_RANK[dataClassification] < CLASSIFICATION_RANK[originalClassification]) {
    throw recoveryError('ORCHESTRATION_CORRECTED_INPUT_CLASSIFICATION_DOWNGRADE', 'Corrected input classification cannot be downgraded.');
  }
  if (options.dataContract) {
    const contractContext = options.contractContext || {};
    assertClassificationAllowed(
      dataClassification,
      options.dataContract,
      options.target || contractContext.target || {},
    );
    assertRegionResidency(
      options.dataContract,
      options.target || contractContext.target || {},
      contractContext,
    );
    validated = processDelegatedInput(validated, options.dataContract, contractContext).payload;
    validated = validateAgainstSchema(inputSchema, validated, {
      code: 'ORCHESTRATION_CORRECTED_INPUT_CONTRACT_INVALID',
      message: 'Corrected input does not satisfy its data contract.',
    });
  }
  const bytes = approximateBytes(validated);
  if (bytes < 1 || bytes > RECOVERY_LIMITS.maximumCorrectedInputBytes) {
    throw recoveryError('ORCHESTRATION_CORRECTED_INPUT_LIMIT_EXCEEDED', 'Corrected input exceeds its payload limit.');
  }
  return {
    input: validated,
    correctedInput: validated,
    changedFieldNames: changedFieldNames.sort(),
    changedFieldCount: changedFieldNames.length,
    inputSchemaHash: stableHash(inputSchema, 'corrected-input-schema'),
    payloadHash: stableHash(validated, 'corrected-input-payload'),
    dataClassification,
    approximatePayloadBytes: bytes,
  };
}

function correctedInputRecord(originalInput, patchInput, options = {}) {
  const result = correctedInputPatch(originalInput, patchInput, options);
  return {
    organizationId: options.organizationId,
    workspaceId: options.workspaceId,
    orchestrationRunId: options.orchestrationRunId,
    nodeRunId: options.nodeRunId,
    recoveryDecisionId: options.recoveryDecisionId,
    version: options.version,
    baseVersion: options.baseVersion || 0,
    inputSchemaHash: result.inputSchemaHash,
    payloadHash: result.payloadHash,
    dataClassification: result.dataClassification,
    changedFieldNames: result.changedFieldNames,
    changedFieldCount: result.changedFieldCount,
    approximatePayloadBytes: result.approximatePayloadBytes,
    encryptedPayload: encryptPayload(result.input),
    requestedBy: options.requestedBy,
    requestId: options.requestId,
    traceId: options.traceId,
    expiresAt: options.expiresAt,
  };
}

function decryptCorrectedInput(recordInput = {}) {
  const record = plain(recordInput);
  if (!record.encryptedPayload) {
    throw recoveryError('ORCHESTRATION_CORRECTED_INPUT_PAYLOAD_UNAVAILABLE', 'Encrypted corrected input was not selected.');
  }
  const payload = safeClone(decryptPayload(record.encryptedPayload), {
    maximumPayloadBytes: RECOVERY_LIMITS.maximumCorrectedInputBytes,
  });
  if (record.payloadHash && stableHash(payload, 'corrected-input-payload') !== record.payloadHash) {
    throw recoveryError('ORCHESTRATION_CORRECTED_INPUT_HASH_MISMATCH', 'Corrected input integrity validation failed.');
  }
  return payload;
}

module.exports = {
  RECOVERY_POLICY_INPUT_KEYS,
  checkpointHash,
  checkpointSnapshot,
  compensationEligible,
  correctedInputPatch,
  correctedInputRecord,
  decryptCorrectedInput,
  deterministicCompensationBatches,
  deterministicCompensationSteps,
  normalizeBackoffPolicy,
  normalizeRecoveryPolicyInput,
  stableHash,
  validateCheckpoint,
  validateCompensationDefinition,
  validateRecoveryPolicyDocument,
};
