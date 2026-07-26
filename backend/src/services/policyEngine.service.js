const mongoose = require('mongoose');
const crypto = require('node:crypto');
const Policy = require('../models/Policy');
const PolicyRevision = require('../models/PolicyRevision');
const OperationalAlert = require('../models/OperationalAlert');
const { env } = require('../config/env');
const {
  COMPARISON_OPERATORS,
  LOGICAL_OPERATORS,
  POLICY_LIMITS,
  POLICY_REASON_CODES,
} = require('../constants/policy');
const { getAttributeDefinition } = require('../constants/policyAttributeRegistry');
const metrics = require('./policyMetrics.service');

const LOGICAL = new Set(LOGICAL_OPERATORS);
const COMPARISON = new Set(COMPARISON_OPERATORS);
const CACHE_MAX_ENTRIES = 200;
const cache = new Map();

async function raisePolicyAlert(input, reasonCode) {
  if (mongoose.connection.readyState !== 1 || !mongoose.isValidObjectId(input.organizationId))
    return;
  const now = new Date();
  const workspaceId = String(input.workspaceId || 'organization');
  const dedupeKey = `policy:${crypto
    .createHash('sha256')
    .update(`${input.organizationId}|${workspaceId}|${reasonCode}`)
    .digest('hex')}`;
  try {
    await OperationalAlert.findOneAndUpdate(
      { dedupeKey },
      {
        $set: {
          partnerId: input.organizationId,
          organizationId: input.organizationId,
          receivingWorkspaceId: workspaceId,
          type: 'policy_evaluation_failure',
          scopeKey: 'policy-engine',
          severity: 'critical',
          status: 'active',
          title: 'Policy evaluation failed closed',
          summary:
            'A protected request was denied because its active policy snapshot could not be evaluated safely.',
          metricName: 'policy_evaluation_errors',
          observedValue: 1,
          thresholdValue: 0,
          safeValues: { reasonCode },
          lastSeenAt: now,
        },
        $setOnInsert: { firstSeenAt: now },
        $inc: { occurrenceCount: 1 },
      },
      { upsert: true },
    );
  } catch {
    // The authorization result remains a fail-closed DENY even when the alert sink is unavailable.
  }
}

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function plain(value) {
  return typeof value?.toObject === 'function' ? value.toObject() : value;
}

function conditionOperator(node) {
  return String(node?.operator || node?.type || '')
    .trim()
    .toUpperCase();
}

function conditionChildren(node) {
  return node?.conditions || node?.children;
}

function validationIssue(path, code, message) {
  return { path, code, message };
}

function validateTypedValue(value, valueType, path, issues) {
  const values = Array.isArray(value) ? value : [value];
  for (const item of values) {
    if (valueType === 'boolean' && typeof item !== 'boolean') {
      issues.push(validationIssue(path, 'TYPE_MISMATCH', 'Expected a boolean value.'));
    } else if (valueType === 'number' && (typeof item !== 'number' || !Number.isFinite(item))) {
      issues.push(validationIssue(path, 'TYPE_MISMATCH', 'Expected a finite number value.'));
    } else if (
      valueType === 'date' &&
      (!(typeof item === 'string' || item instanceof Date) ||
        Number.isNaN(new Date(item).getTime()))
    ) {
      issues.push(validationIssue(path, 'TYPE_MISMATCH', 'Expected an ISO date value.'));
    } else if (['string', 'enum', 'string_array'].includes(valueType) && typeof item !== 'string') {
      issues.push(validationIssue(path, 'TYPE_MISMATCH', 'Expected a string value.'));
    }
    if (typeof item === 'string' && item.length > POLICY_LIMITS.maxStringLength) {
      issues.push(validationIssue(path, 'STRING_LIMIT_EXCEEDED', 'Condition string is too long.'));
    }
  }
}

function validateConditionTree(condition, options = {}) {
  const issues = [];
  let nodes = 0;

  function visit(node, path, depth) {
    nodes += 1;
    if (nodes > POLICY_LIMITS.maxNodes) {
      issues.push(validationIssue(path, 'NODE_LIMIT_EXCEEDED', 'Condition has too many nodes.'));
      return;
    }
    if (depth > POLICY_LIMITS.maxDepth) {
      issues.push(validationIssue(path, 'DEPTH_LIMIT_EXCEEDED', 'Condition nesting is too deep.'));
      return;
    }
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      issues.push(validationIssue(path, 'INVALID_NODE', 'Condition node must be an object.'));
      return;
    }
    const operator = conditionOperator(node);
    if (LOGICAL.has(operator)) {
      const children = conditionChildren(node);
      if (!Array.isArray(children)) {
        issues.push(
          validationIssue(
            `${path}.conditions`,
            'CHILDREN_REQUIRED',
            'Logical conditions require a conditions array.',
          ),
        );
        return;
      }
      if (children.length > POLICY_LIMITS.maxArrayItems) {
        issues.push(
          validationIssue(
            `${path}.conditions`,
            'ARRAY_LIMIT_EXCEEDED',
            'Condition array is too large.',
          ),
        );
      }
      if (operator === 'NOT' && children.length !== 1) {
        issues.push(
          validationIssue(
            `${path}.conditions`,
            'NOT_ARITY_INVALID',
            'NOT requires exactly one child.',
          ),
        );
      }
      if (operator !== 'NOT' && children.length === 0) {
        issues.push(
          validationIssue(
            `${path}.conditions`,
            'EMPTY_LOGICAL_NODE',
            `${operator} requires at least one child.`,
          ),
        );
      }
      children
        .slice(0, POLICY_LIMITS.maxArrayItems)
        .forEach((child, index) => visit(child, `${path}.conditions[${index}]`, depth + 1));
      return;
    }
    if (!COMPARISON.has(operator)) {
      issues.push(
        validationIssue(
          `${path}.operator`,
          'UNSUPPORTED_OPERATOR',
          'Condition operator is not supported.',
        ),
      );
      return;
    }
    const attributeId = String(node.attribute || node.attributeId || '').trim();
    const definition = getAttributeDefinition(attributeId);
    if (!definition) {
      issues.push(
        validationIssue(
          `${path}.attribute`,
          'UNKNOWN_ATTRIBUTE',
          'Condition attribute is not registered.',
        ),
      );
      return;
    }
    if (!definition.allowedOperators.includes(operator)) {
      issues.push(
        validationIssue(
          `${path}.operator`,
          'OPERATOR_TYPE_MISMATCH',
          'Operator is not allowed for this attribute.',
        ),
      );
    }
    const doesNotNeedValue = operator === 'EXISTS' || operator === 'NOT_EXISTS';
    if (!doesNotNeedValue && !Object.hasOwn(node, 'value')) {
      issues.push(
        validationIssue(`${path}.value`, 'VALUE_REQUIRED', 'Comparison value is required.'),
      );
    }
    if (Object.hasOwn(node, 'value')) {
      if (Array.isArray(node.value) && node.value.length > POLICY_LIMITS.maxArrayItems) {
        issues.push(
          validationIssue(
            `${path}.value`,
            'ARRAY_LIMIT_EXCEEDED',
            'Comparison array is too large.',
          ),
        );
      }
      if (['IN', 'NOT_IN'].includes(operator) && !Array.isArray(node.value)) {
        issues.push(
          validationIssue(
            `${path}.value`,
            'ARRAY_REQUIRED',
            `${operator} requires an array value.`,
          ),
        );
      }
      validateTypedValue(node.value, definition.valueType, `${path}.value`, issues);
    }
  }

  visit(condition, options.path || 'condition', 1);
  return { valid: issues.length === 0, errors: issues, nodeCount: nodes };
}

function targetValues(target, names) {
  for (const name of names) {
    if (Array.isArray(target?.[name])) return target[name].map(String);
  }
  return [];
}

function validateTarget(target = {}) {
  const issues = [];
  if (!target || typeof target !== 'object' || Array.isArray(target)) {
    return {
      valid: false,
      errors: [validationIssue('target', 'INVALID_TARGET', 'Policy target must be an object.')],
    };
  }
  const allowed = new Set([
    'permissionIds',
    'permissions',
    'resourceTypes',
    'resourceIds',
    'actorTypes',
    'organizationIds',
    'workspaceIds',
    'passportIds',
    'connectionIds',
    'capabilityIds',
    'capabilityCategories',
    'capabilityClassifications',
    'sideEffects',
    'sideEffectClassifications',
    'environments',
  ]);
  for (const [key, value] of Object.entries(target)) {
    if (!allowed.has(key)) {
      issues.push(
        validationIssue(`target.${key}`, 'UNSUPPORTED_TARGET', 'Target field is not supported.'),
      );
      continue;
    }
    if (!Array.isArray(value) || value.length === 0) {
      issues.push(
        validationIssue(
          `target.${key}`,
          'TARGET_ARRAY_REQUIRED',
          'Target field must be a non-empty array.',
        ),
      );
      continue;
    }
    if (value.length > POLICY_LIMITS.maxTargetItems) {
      issues.push(
        validationIssue(`target.${key}`, 'ARRAY_LIMIT_EXCEEDED', 'Target array is too large.'),
      );
    }
    for (const item of value) {
      if (typeof item !== 'string' || !item.trim() || item.length > 256) {
        issues.push(
          validationIssue(
            `target.${key}`,
            'INVALID_TARGET_VALUE',
            'Target values must be bounded strings.',
          ),
        );
      }
    }
  }
  return { valid: issues.length === 0, errors: issues };
}

function validatePolicyDocument(policy) {
  const issues = [];
  let bytes = Number.POSITIVE_INFINITY;
  try {
    bytes = Buffer.byteLength(JSON.stringify(policy || {}), 'utf8');
  } catch {
    issues.push(validationIssue('policy', 'POLICY_NOT_SERIALIZABLE', 'Policy must be valid JSON.'));
  }
  if (bytes > POLICY_LIMITS.maxDocumentBytes) {
    issues.push(
      validationIssue('policy', 'DOCUMENT_LIMIT_EXCEEDED', 'Policy document is too large.'),
    );
  }
  if (!['ALLOW', 'DENY'].includes(String(policy?.effect || '').toUpperCase())) {
    issues.push(
      validationIssue('effect', 'INVALID_EFFECT', 'Policy effect must be ALLOW or DENY.'),
    );
  }
  const target = validateTarget(policy?.target || {});
  issues.push(...target.errors);
  const condition = validateConditionTree(policy?.condition);
  issues.push(...condition.errors);
  return {
    valid: issues.length === 0,
    errors: issues,
    nodeCount: condition.nodeCount,
    documentBytes: bytes,
  };
}

function comparable(value, valueType) {
  if (valueType === 'date') return new Date(value).getTime();
  return value;
}

function same(left, right, valueType) {
  if (valueType === 'date') return comparable(left, valueType) === comparable(right, valueType);
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => same(item, right[index], 'string'))
    );
  }
  return left === right;
}

function compare(operator, actual, expected, valueType) {
  const exists = actual !== undefined && actual !== null;
  if (operator === 'EXISTS') return exists;
  if (operator === 'NOT_EXISTS') return !exists;
  if (!exists) return false;
  if (operator === 'EQUALS') return same(actual, expected, valueType);
  if (operator === 'NOT_EQUALS') return !same(actual, expected, valueType);
  if (operator === 'IN') return expected.some((item) => same(actual, item, valueType));
  if (operator === 'NOT_IN') return !expected.some((item) => same(actual, item, valueType));
  if (operator === 'CONTAINS') {
    if (Array.isArray(actual)) return actual.some((item) => same(item, expected, 'string'));
    return typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected);
  }
  if (operator === 'STARTS_WITH') return typeof actual === 'string' && actual.startsWith(expected);
  if (operator === 'ENDS_WITH') return typeof actual === 'string' && actual.endsWith(expected);
  const left = comparable(actual, valueType);
  const right = comparable(expected, valueType);
  if (operator === 'LESS_THAN') return left < right;
  if (operator === 'LESS_THAN_OR_EQUAL') return left <= right;
  if (operator === 'GREATER_THAN') return left > right;
  if (operator === 'GREATER_THAN_OR_EQUAL') return left >= right;
  throw new Error('Unsupported comparison operator.');
}

function evaluateCondition(condition, attributes, options = {}) {
  const validation = options.skipValidation ? { valid: true } : validateConditionTree(condition);
  if (!validation.valid)
    return { matched: false, error: 'POLICY_INVALID', details: validation.errors };
  const evidence = [];

  function visit(node, path) {
    const operator = conditionOperator(node);
    if (LOGICAL.has(operator)) {
      const children = conditionChildren(node);
      const results = children.map((child, index) => visit(child, `${path}.${index}`));
      const error = results.find((result) => result.error);
      if (error) return error;
      if (operator === 'ALL') return { matched: results.every((result) => result.matched) };
      if (operator === 'ANY') return { matched: results.some((result) => result.matched) };
      return { matched: !results[0].matched };
    }
    const attributeId = String(node.attribute || node.attributeId);
    const definition = getAttributeDefinition(attributeId);
    let actual;
    try {
      actual = definition.resolver(attributes);
    } catch {
      return { matched: false, error: 'POLICY_ATTRIBUTE_UNAVAILABLE', attributeId };
    }
    if (actual === undefined && !['EXISTS', 'NOT_EXISTS'].includes(operator)) {
      return { matched: false, error: 'POLICY_ATTRIBUTE_UNAVAILABLE', attributeId };
    }
    const matched = compare(operator, actual, node.value, definition.valueType);
    evidence.push({
      path,
      attributeId,
      operator,
      matched,
      ...(definition.auditDisplaySafe ? { expected: node.value } : {}),
    });
    return { matched };
  }

  const result = visit(condition, 'condition');
  return { ...result, evidence };
}

function targetMatch(policy, input) {
  const target = policy.target || {};
  const checks = [
    [
      targetValues(target, ['permissionIds', 'permissions']),
      input.permission || input.permissionId,
    ],
    [targetValues(target, ['resourceTypes']), input.resourceType || input.resource?.type],
    [targetValues(target, ['resourceIds']), input.resourceId || input.resource?.id],
    [targetValues(target, ['actorTypes']), input.actorType],
    [targetValues(target, ['organizationIds']), input.organizationId],
    [targetValues(target, ['workspaceIds']), input.workspaceId],
    [targetValues(target, ['passportIds']), input.passportId],
    [targetValues(target, ['connectionIds']), input.connectionId],
    [targetValues(target, ['capabilityIds']), input.capabilityId],
    [targetValues(target, ['capabilityCategories']), input.capabilityCategory],
    [targetValues(target, ['capabilityClassifications']), input.capabilityClassification],
    [
      targetValues(target, ['sideEffects', 'sideEffectClassifications']),
      input.capabilitySideEffect,
    ],
    [targetValues(target, ['environments']), input.environment],
  ];
  return checks.every(
    ([expected, actual]) => expected.length === 0 || expected.includes(String(actual || '')),
  );
}

function specificity(policy) {
  const target = policy.target || {};
  const resourceSpecific =
    targetValues(target, ['resourceIds']).length +
    targetValues(target, ['connectionIds']).length +
    targetValues(target, ['capabilityIds']).length +
    targetValues(target, ['passportIds']).length;
  return { tenant: policy.workspaceId ? 1 : 0, resource: resourceSpecific ? 1 : 0 };
}

function comparePolicies(leftInput, rightInput) {
  const left = plain(leftInput);
  const right = plain(rightInput);
  const leftSpecificity = specificity(left);
  const rightSpecificity = specificity(right);
  if (leftSpecificity.tenant !== rightSpecificity.tenant)
    return rightSpecificity.tenant - leftSpecificity.tenant;
  if (leftSpecificity.resource !== rightSpecificity.resource)
    return rightSpecificity.resource - leftSpecificity.resource;
  if (Number(left.priority || 0) !== Number(right.priority || 0))
    return Number(right.priority || 0) - Number(left.priority || 0);
  const stable = String(left.stablePolicyId).localeCompare(String(right.stablePolicyId));
  return stable || Number(left.version || 0) - Number(right.version || 0);
}

function policySummary(policy, conditionResult) {
  return {
    stablePolicyId: String(policy.stablePolicyId),
    version: Number(policy.version),
    name: policy.name,
    effect: policy.effect,
    matched: conditionResult.matched === true,
    evidence: conditionResult.evidence || [],
  };
}

function evaluatePolicySnapshot({ policies = [], input, attributes, snapshotRevision = 0 }) {
  const ordered = policies.map(plain).sort(comparePolicies);
  const applicable = ordered.filter(
    (policy) =>
      String(policy.organizationId) === String(input.organizationId) &&
      (!policy.workspaceId || String(policy.workspaceId) === String(input.workspaceId || '')) &&
      targetMatch(policy, input),
  );
  const results = [];
  for (const policy of applicable) {
    const validation = validatePolicyDocument(policy);
    if (!validation.valid) {
      return {
        allowed: false,
        decision: 'DENY',
        reasonCode: POLICY_REASON_CODES.POLICY_INVALID,
        matchedPolicies: results,
        policySnapshotRevision: snapshotRevision,
      };
    }
    let conditionResult;
    try {
      conditionResult = evaluateCondition(policy.condition, attributes, { skipValidation: true });
    } catch {
      conditionResult = { matched: false, error: 'POLICY_EVALUATION_ERROR' };
    }
    results.push(policySummary(policy, conditionResult));
    if (conditionResult.error) {
      metrics.increment('policy_attribute_resolution_failures', { reason: conditionResult.error });
      return {
        allowed: false,
        decision: 'DENY',
        reasonCode:
          POLICY_REASON_CODES[conditionResult.error] || POLICY_REASON_CODES.POLICY_EVALUATION_ERROR,
        matchedPolicies: results,
        policySnapshotRevision: snapshotRevision,
      };
    }
  }
  const explicitDeny = results.find((result) => result.effect === 'DENY' && result.matched);
  if (explicitDeny) {
    return {
      allowed: false,
      decision: 'DENY',
      reasonCode: POLICY_REASON_CODES.POLICY_EXPLICIT_DENY,
      matchedPolicies: results,
      policySnapshotRevision: snapshotRevision,
    };
  }
  const allows = results.filter((result) => result.effect === 'ALLOW');
  if (allows.length && !allows.some((result) => result.matched)) {
    return {
      allowed: false,
      decision: 'DENY',
      reasonCode: POLICY_REASON_CODES.POLICY_ALLOW_CONDITION_NOT_MET,
      matchedPolicies: results,
      policySnapshotRevision: snapshotRevision,
    };
  }
  return {
    allowed: true,
    decision: 'ALLOW',
    reasonCode: allows.some((result) => result.matched)
      ? POLICY_REASON_CODES.POLICY_ALLOW_MATCHED
      : POLICY_REASON_CODES.NO_APPLICABLE_POLICY,
    matchedPolicies: results,
    policySnapshotRevision: snapshotRevision,
  };
}

function cacheKey(organizationId, workspaceId) {
  return `${encodeURIComponent(String(organizationId))}|${encodeURIComponent(String(workspaceId || '*'))}`;
}

function trimCache() {
  while (cache.size > CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
}

async function loadActivePolicySnapshot(organizationId, workspaceId, options = {}) {
  if (typeof options.policyLoader === 'function')
    return options.policyLoader({ organizationId, workspaceId });
  if (mongoose.connection.readyState !== 1) {
    if (env.NODE_ENV === 'production') throw new Error('Policy storage is unavailable.');
    return { policies: [], revision: 0 };
  }
  const revisionDocument = await PolicyRevision.findOne({ organizationId }).lean();
  const revision = Number(revisionDocument?.generation || 0);
  const key = cacheKey(organizationId, workspaceId);
  const cached = cache.get(key);
  if (cached && cached.revision === revision) {
    cache.delete(key);
    cache.set(key, cached);
    metrics.increment('policy_cache', { cache: 'hit' });
    return cached;
  }
  metrics.increment('policy_cache', { cache: 'miss' });
  const policies = await Policy.find({
    organizationId,
    status: 'ACTIVE',
    $or: [
      { workspaceId: { $exists: false } },
      { workspaceId: null },
      { workspaceId: '' },
      { workspaceId },
    ],
  }).lean();
  const snapshot = { policies: policies.sort(comparePolicies), revision };
  cache.set(key, snapshot);
  trimCache();
  return snapshot;
}

function invalidatePolicyCache(organizationId) {
  const prefix = `${encodeURIComponent(String(organizationId))}|`;
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}

async function incrementPolicyRevision(organizationId, options = {}) {
  const revision = await PolicyRevision.findOneAndUpdate(
    { organizationId },
    { $inc: { generation: 1 }, $setOnInsert: { schemaVersion: 1 } },
    { upsert: true, new: true, session: options.session },
  ).lean();
  invalidatePolicyCache(organizationId);
  return Number(revision.generation);
}

function trustedAttributes({ actor, resource, context, roleKeys, tenant }) {
  const timestamp =
    context.trustedRequest?.timestamp instanceof Date
      ? context.trustedRequest.timestamp
      : new Date(context.trustedRequest?.timestamp || Date.now());
  const timezone = context.trustedWorkspace?.timezone || 'UTC';
  let weekday;
  let hour;
  try {
    weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: timezone })
      .format(timestamp)
      .toUpperCase();
    hour = Number(
      new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        hourCycle: 'h23',
        timeZone: timezone,
      }).format(timestamp),
    );
  } catch {
    weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' })
      .format(timestamp)
      .toUpperCase();
    hour = timestamp.getUTCHours();
  }
  const capability = context.trustedCapability || {};
  const connection = context.trustedConnection || {};
  const passport = context.trustedPassport || {};
  const workspace = context.trustedWorkspace || {};
  const secret = context.trustedSecret || {};
  const binding = context.trustedCredentialBinding || {};
  return {
    actor: {
      id: actor.id,
      type: actor.type,
      serviceAccount: actor.type === 'service_account',
      teamIds: Array.isArray(actor.teamIds) ? actor.teamIds.map(String) : [],
      roleKeys,
    },
    organization: { id: tenant.organizationId },
    workspace: {
      id: tenant.workspaceId,
      environment: workspace.environment,
      productionApproved: workspace.productionApproved,
    },
    resource: { type: resource.type, id: resource.id, ownerWorkspaceId: resource.workspaceId },
    request: { timestamp, weekday, hour, sourceIp: context.trustedRequest?.sourceIp },
    environment: { name: context.trustedEnvironment?.name || env.NODE_ENV },
    capability: {
      id: idOf(capability),
      category: capability.category || 'UNCLASSIFIED',
      classification: capability.classification || 'UNCLASSIFIED',
      sideEffect: capability.sideEffect || 'UNKNOWN',
    },
    connection: { id: idOf(connection), status: connection.status },
    passport: { id: idOf(passport), version: passport.agent?.version || passport.version },
    secret: {
      provider: secret.provider,
      credentialType: secret.credentialType,
      status: secret.status,
      healthStatus: secret.healthStatus,
    },
    binding: { purpose: binding.purpose, status: binding.status },
  };
}

async function evaluateActivePolicies(input, attributes, options = {}) {
  const started = Date.now();
  metrics.increment('policy_evaluations', {
    operation: options.simulation ? 'simulation' : 'authorization',
  });
  try {
    const snapshot = await loadActivePolicySnapshot(
      input.organizationId,
      input.workspaceId,
      options,
    );
    const result = evaluatePolicySnapshot({
      ...snapshot,
      input,
      attributes,
      snapshotRevision: snapshot.revision,
    });
    metrics.increment(result.allowed ? 'policy_allows' : 'policy_denies', {
      reason: result.reasonCode,
    });
    if (result.reasonCode === POLICY_REASON_CODES.POLICY_EXPLICIT_DENY)
      metrics.increment('policy_explicit_denies');
    if (
      result.reasonCode === POLICY_REASON_CODES.POLICY_INVALID ||
      result.reasonCode === POLICY_REASON_CODES.POLICY_EVALUATION_ERROR
    ) {
      metrics.increment('policy_evaluation_errors', { reason: result.reasonCode });
      await raisePolicyAlert(input, result.reasonCode);
    }
    return { ...result, evaluationDurationMs: Math.max(0, Date.now() - started) };
  } catch {
    metrics.increment('policy_evaluation_errors', {
      reason: POLICY_REASON_CODES.POLICY_EVALUATION_ERROR,
    });
    await raisePolicyAlert(input, POLICY_REASON_CODES.POLICY_EVALUATION_ERROR);
    return {
      allowed: false,
      decision: 'DENY',
      reasonCode: POLICY_REASON_CODES.POLICY_EVALUATION_ERROR,
      matchedPolicies: [],
      policySnapshotRevision: undefined,
      evaluationDurationMs: Math.max(0, Date.now() - started),
    };
  } finally {
    metrics.observeDuration(Date.now() - started);
  }
}

module.exports = {
  comparePolicies,
  evaluateActivePolicies,
  evaluateCondition,
  evaluatePolicySnapshot,
  incrementPolicyRevision,
  invalidatePolicyCache,
  loadActivePolicySnapshot,
  targetMatch,
  trustedAttributes,
  validateConditionTree,
  validatePolicyDocument,
  validateTarget,
};
