const crypto = require('node:crypto');
const { AppError } = require('../utils/AppError');
const { canonicalize, secureDigest } = require('../utils/idempotency');
const {
  CLASSIFICATION_RANK,
  DATA_CLASSIFICATIONS,
  INTER_AGENT_LIMITS,
  REDACTION_ACTIONS,
  TRANSFORMATION_OPERATIONS,
} = require('../constants/interAgentDelegation');

const SAFE_SEGMENT = /^[A-Za-z][A-Za-z0-9_-]{0,127}$/;
const DANGEROUS_KEYS = new Set([
  '__proto__',
  'prototype',
  'constructor',
  'process',
  'global',
  'globalThis',
  'require',
  'module',
  'exports',
]);
const HIDDEN_FIELDS = new Set([
  'chainOfThought',
  'chain_of_thought',
  'reasoningTrace',
  'hiddenReasoning',
  'systemPrompt',
  'internalPrompt',
  'memoryDump',
  'privateMemory',
  'runtimeCredential',
  'authorization',
  'apiKey',
  'accessToken',
  'credential',
  'credentials',
  'providerKey',
  'installKey',
  'encryptedDelegatedCredential',
  'sourceCode',
  'privatePolicy',
]);

function dataError(code, message, path = '$') {
  return new AppError(400, code, message, [{ path, code, message }]);
}

function dangerousSegment(value) {
  return DANGEROUS_KEYS.has(String(value)) || HIDDEN_FIELDS.has(String(value));
}

function pathSegments(path, options = {}) {
  const normalized = String(path || '').trim().replace(/^\$\.?/, '');
  const segments = normalized.split('.').filter(Boolean);
  const maximumDepth = Number(options.maximumDepth || INTER_AGENT_LIMITS.maximumPathDepth);
  if (
    !segments.length ||
    segments.length > maximumDepth ||
    segments.some(
      (segment) =>
        !SAFE_SEGMENT.test(segment) ||
        DANGEROUS_KEYS.has(segment) ||
        (options.allowHidden !== true && HIDDEN_FIELDS.has(segment)),
    )
  ) {
    throw dataError('DATA_CONTRACT_MAPPING_INVALID', 'A protected or invalid data path was rejected.', String(path || '$'));
  }
  return segments;
}

function descriptorValue(object, key, path) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor || descriptor.enumerable !== true) return { exists: false };
  if (descriptor.get || descriptor.set || !Object.hasOwn(descriptor, 'value')) {
    throw dataError('INTER_AGENT_DATA_ACCESSOR_REJECTED', 'Accessors are forbidden in delegated data.', path);
  }
  return { exists: true, value: descriptor.value };
}

function boundedLimit(value, fallback, maximum) {
  const normalized = Number(value ?? fallback);
  if (!Number.isInteger(normalized) || normalized < 1) return fallback;
  return Math.min(maximum, normalized);
}

function normalizedLimits(input = {}) {
  return {
    maximumPayloadBytes: boundedLimit(input.maximumPayloadBytes, INTER_AGENT_LIMITS.maximumPayloadBytes, INTER_AGENT_LIMITS.maximumPayloadBytes),
    maximumArrayItems: boundedLimit(input.maximumArrayItems, INTER_AGENT_LIMITS.maximumArrayItems, INTER_AGENT_LIMITS.maximumArrayItems),
    maximumStringLength: boundedLimit(input.maximumStringLength, INTER_AGENT_LIMITS.maximumStringLength, INTER_AGENT_LIMITS.maximumStringLength),
    maximumObjectDepth: boundedLimit(input.maximumObjectDepth, INTER_AGENT_LIMITS.maximumObjectDepth, INTER_AGENT_LIMITS.maximumObjectDepth),
  };
}

function safeClone(value, limitsInput = {}, path = '$', stateInput) {
  const limits = normalizedLimits(limitsInput);
  const state = stateInput || { seen: new WeakSet(), root: true };
  const depth = path === '$' ? 0 : path.split('.').length - 1;
  if (depth > limits.maximumObjectDepth) {
    throw dataError('INTER_AGENT_DATA_DEPTH_EXCEEDED', 'Delegated data exceeds the object-depth limit.', path);
  }
  if (value === undefined) return undefined;
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw dataError('INTER_AGENT_DATA_TYPE_REJECTED', 'Non-finite numbers are forbidden.', path);
    return value;
  }
  if (typeof value === 'string') {
    if (value.length > limits.maximumStringLength) {
      throw dataError('INTER_AGENT_STRING_LIMIT_EXCEEDED', 'Delegated string exceeds the configured limit.', path);
    }
    return value;
  }
  if (['function', 'symbol', 'bigint'].includes(typeof value)) {
    throw dataError('INTER_AGENT_DATA_TYPE_REJECTED', 'Delegated data contains an unsupported type.', path);
  }
  if (value instanceof Date) return value.toISOString();
  if (!value || typeof value !== 'object') {
    throw dataError('INTER_AGENT_DATA_TYPE_REJECTED', 'Delegated data contains an unsupported value.', path);
  }
  if (state.seen.has(value)) {
    throw dataError('INTER_AGENT_DATA_CIRCULAR', 'Circular delegated data is forbidden.', path);
  }
  state.seen.add(value);
  let result;
  if (Array.isArray(value)) {
    if (Object.getOwnPropertySymbols(value).length) {
      state.seen.delete(value);
      throw dataError('INTER_AGENT_DATA_SYMBOL_REJECTED', 'Symbol properties are forbidden.', path);
    }
    if (value.length > limits.maximumArrayItems) {
      throw dataError('INTER_AGENT_ARRAY_LIMIT_EXCEEDED', 'Delegated array exceeds the configured limit.', path);
    }
    result = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || descriptor.get || descriptor.set) {
        state.seen.delete(value);
        throw dataError('INTER_AGENT_DATA_ACCESSOR_REJECTED', 'Sparse arrays and accessors are forbidden.', `${path}.${index}`);
      }
      const cloned = safeClone(descriptor.value, limits, `${path}.${index}`, state);
      if (cloned === undefined) {
        state.seen.delete(value);
        throw dataError('INTER_AGENT_DATA_TYPE_REJECTED', 'Undefined array values are forbidden.', `${path}.${index}`);
      }
      result.push(cloned);
    }
  } else {
    const symbols = Object.getOwnPropertySymbols(value);
    if (symbols.length) {
      state.seen.delete(value);
      throw dataError('INTER_AGENT_DATA_SYMBOL_REJECTED', 'Symbol properties are forbidden.', path);
    }
    const prototype = Object.getPrototypeOf(value);
    const constructorDescriptor = prototype && Object.getOwnPropertyDescriptor(prototype, 'constructor');
    if (
      prototype !== null &&
      prototype !== Object.prototype &&
      (constructorDescriptor?.get || constructorDescriptor?.set || constructorDescriptor?.value !== undefined)
    ) {
      state.seen.delete(value);
      throw dataError('INTER_AGENT_DATA_TYPE_REJECTED', 'Unsupported object types are forbidden.', path);
    }
    result = {};
    for (const key of Object.keys(value).sort()) {
      if (DANGEROUS_KEYS.has(key) || !SAFE_SEGMENT.test(key)) {
        state.seen.delete(value);
        throw dataError('INTER_AGENT_DANGEROUS_PATH', 'A protected delegated-data field was rejected.', `${path}.${key}`);
      }
      if (HIDDEN_FIELDS.has(key)) continue;
      const descriptor = descriptorValue(value, key, `${path}.${key}`);
      if (!descriptor.exists || descriptor.value === undefined) continue;
      const cloned = safeClone(descriptor.value, limits, `${path}.${key}`, state);
      if (cloned !== undefined) result[key] = cloned;
    }
  }
  state.seen.delete(value);
  if (state.root) {
    const bytes = Buffer.byteLength(JSON.stringify(result), 'utf8');
    if (bytes > limits.maximumPayloadBytes) {
      throw dataError('INTER_AGENT_PAYLOAD_TOO_LARGE', 'Delegated payload exceeds the configured byte limit.', path);
    }
  }
  return result;
}

function readOwnPath(source, path, options = {}) {
  const segments = Array.isArray(path) ? path : pathSegments(path, options);
  let current = source;
  for (const segment of segments) {
    if (!current || typeof current !== 'object') return { exists: false };
    const descriptor = descriptorValue(current, segment, `$source.${segments.join('.')}`);
    if (!descriptor.exists || descriptor.value === undefined) return { exists: false };
    current = descriptor.value;
  }
  return { exists: true, value: current };
}

function assignPath(target, path, value) {
  const segments = Array.isArray(path) ? path : pathSegments(path);
  let current = target;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) current[segment] = value;
    else {
      if (!Object.hasOwn(current, segment)) current[segment] = {};
      if (!current[segment] || typeof current[segment] !== 'object' || Array.isArray(current[segment])) {
        throw dataError('DATA_CONTRACT_MAPPING_INVALID', 'Mapping paths conflict.', segments.slice(0, index + 1).join('.'));
      }
      current = current[segment];
    }
  });
}

function deletePath(target, path) {
  const segments = Array.isArray(path) ? path : pathSegments(path);
  let current = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    if (!current || typeof current !== 'object' || !Object.hasOwn(current, segments[index])) return false;
    current = current[segments[index]];
  }
  if (!current || typeof current !== 'object') return false;
  return delete current[segments.at(-1)];
}

function pathDenied(path, deniedFields = []) {
  return deniedFields.some((denied) => path === denied || path.startsWith(`${denied}.`) || denied.startsWith(`${path}.`));
}

function extractAllowedFields(sourceInput, allowedFields = [], deniedFields = [], limits = {}) {
  const source = safeClone(sourceInput, limits);
  const allowed = [...new Set(allowedFields.map(String))].sort();
  const denied = [...new Set(deniedFields.map(String))].sort();
  if (!allowed.length || allowed.length > INTER_AGENT_LIMITS.maximumFields) {
    throw dataError('DATA_CONTRACT_INVALID', 'A bounded non-empty field allowlist is required.', '$contract.allowedFields');
  }
  allowed.forEach((path) => pathSegments(path));
  denied.forEach((path) => pathSegments(path, { allowHidden: true }));
  const result = {};
  for (const path of allowed) {
    if (pathDenied(path, denied)) continue;
    const read = readOwnPath(source, path);
    if (!read.exists) continue;
    assignPath(result, path, safeClone(read.value, limits, `$source.${path}`));
  }
  for (const path of denied) deletePath(result, pathSegments(path, { allowHidden: true }));
  return safeClone(result, limits);
}

function mappingSource(expression, sources) {
  const value = String(expression || '').replace(/^\$/, '');
  const [root, ...segments] = value.split('.');
  if (!['source', 'runInput', 'metadata', 'dependency'].includes(root) || !segments.length) {
    throw dataError('DATA_CONTRACT_MAPPING_INVALID', 'Only declared deterministic mapping sources are supported.', '$mapping');
  }
  pathSegments(segments.join('.'));
  const read = readOwnPath(sources[root], segments);
  if (!read.exists) throw dataError('DATA_CONTRACT_MAPPING_INVALID', 'A mapped source field is unavailable.', '$mapping');
  return read.value;
}

function applyMapping(mapping, sources, limits = {}) {
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    throw dataError('DATA_CONTRACT_MAPPING_INVALID', 'Mapping must be an object.', '$mapping');
  }
  const output = {};
  for (const targetPath of Object.keys(mapping).sort()) {
    pathSegments(targetPath);
    const descriptor = descriptorValue(mapping, targetPath, `$mapping.${targetPath}`);
    if (!descriptor.exists) continue;
    const rule = descriptor.value;
    let value;
    if (typeof rule === 'string') value = mappingSource(rule, sources);
    else if (rule && typeof rule === 'object' && !Array.isArray(rule) && Object.hasOwn(rule, 'literal')) {
      value = rule.literal;
    } else {
      throw dataError('DATA_CONTRACT_MAPPING_INVALID', 'Mapping values must be safe paths or fixed literals.', `$mapping.${targetPath}`);
    }
    assignPath(output, targetPath, safeClone(value, limits, `$mapping.${targetPath}`));
  }
  return safeClone(output, limits);
}

function replacePath(target, path, transform) {
  const segments = pathSegments(path);
  const read = readOwnPath(target, segments);
  if (!read.exists) return false;
  const next = transform(read.value);
  if (next === undefined) deletePath(target, segments);
  else assignPath(target, segments, next);
  return true;
}

function normalizeRule(ruleInput, index, kind) {
  if (!ruleInput || typeof ruleInput !== 'object' || Array.isArray(ruleInput)) {
    throw dataError(`DATA_CONTRACT_${kind}_INVALID`, `${kind.toLowerCase()} rule must be an object.`, `$rules[${index}]`);
  }
  const rule = safeClone(ruleInput, { maximumObjectDepth: 5, maximumArrayItems: 100, maximumStringLength: 2_000, maximumPayloadBytes: 50_000 });
  if (!rule.ruleId || !/^[A-Za-z][A-Za-z0-9._-]{0,127}$/.test(rule.ruleId)) {
    throw dataError(`DATA_CONTRACT_${kind}_INVALID`, 'Every rule requires a safe ruleId.', `$rules[${index}].ruleId`);
  }
  return rule;
}

function hashValue(value, purpose, pseudonymized = false) {
  const text = typeof value === 'string' ? value : canonicalize(value);
  if (text.length < 8) throw dataError('DATA_CONTRACT_TRANSFORMATION_INVALID', 'Low-entropy values cannot be hashed for delegated metadata.', '$transformation');
  if (pseudonymized) return secureDigest(`delegation-pseudonym:${purpose}`, text);
  return `sha256:${crypto.createHash('sha256').update(`ghost-bridge:${purpose}:v1\0${text}`).digest('hex')}`;
}

function applyTransformations(payloadInput, rules = [], limits = {}) {
  if (rules.length > INTER_AGENT_LIMITS.maximumRules) {
    throw dataError('DATA_CONTRACT_TRANSFORMATION_INVALID', 'Transformation rule limit exceeded.', '$transformationRules');
  }
  const payload = safeClone(payloadInput, limits);
  let transformedFieldCount = 0;
  rules.forEach((raw, index) => {
    const rule = normalizeRule(raw, index, 'TRANSFORMATION');
    if (!TRANSFORMATION_OPERATIONS.includes(rule.operation)) {
      throw dataError('DATA_CONTRACT_TRANSFORMATION_INVALID', 'Transformation operation is not approved.', `$transformationRules[${index}].operation`);
    }
    let changed = false;
    if (rule.operation === 'literal') {
      assignPath(payload, rule.targetPath, safeClone(rule.value, limits));
      changed = true;
    } else if (rule.operation === 'rename') {
      const read = readOwnPath(payload, rule.path);
      if (read.exists) {
        assignPath(payload, rule.targetPath, read.value);
        deletePath(payload, rule.path);
        changed = true;
      }
    } else if (rule.operation === 'select') {
      const read = readOwnPath(payload, rule.path);
      if (read.exists) {
        const selected = {};
        assignPath(selected, rule.targetPath || rule.path, read.value);
        for (const key of Object.keys(payload)) delete payload[key];
        Object.assign(payload, selected);
        changed = true;
      }
    } else {
      changed = replacePath(payload, rule.path, (value) => {
        switch (rule.operation) {
          case 'truncate_string':
            if (typeof value !== 'string') throw dataError('DATA_CONTRACT_TRANSFORMATION_INVALID', 'String truncation requires a string.', rule.path);
            return value.slice(0, Math.max(0, Math.min(Number(rule.maximumLength), limits.maximumStringLength || INTER_AGENT_LIMITS.maximumStringLength)));
          case 'slice_array':
            if (!Array.isArray(value)) throw dataError('DATA_CONTRACT_TRANSFORMATION_INVALID', 'Array slicing requires an array.', rule.path);
            return value.slice(Math.max(0, Number(rule.start || 0)), Math.max(0, Number(rule.start || 0)) + Math.max(0, Math.min(Number(rule.maximumItems), limits.maximumArrayItems || INTER_AGENT_LIMITS.maximumArrayItems)));
          case 'normalize_date': {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) throw dataError('DATA_CONTRACT_TRANSFORMATION_INVALID', 'Date normalization failed.', rule.path);
            return date.toISOString();
          }
          case 'map_enum': {
            const key = String(value);
            if (!Object.hasOwn(rule.mapping || {}, key)) throw dataError('DATA_CONTRACT_TRANSFORMATION_INVALID', 'Enum mapping has no declared value.', rule.path);
            return rule.mapping[key];
          }
          case 'clamp_number':
            if (typeof value !== 'number' || !Number.isFinite(value)) throw dataError('DATA_CONTRACT_TRANSFORMATION_INVALID', 'Numeric clamping requires a finite number.', rule.path);
            return Math.min(Number(rule.maximum), Math.max(Number(rule.minimum), value));
          case 'normalize_boolean':
            if (typeof value === 'boolean') return value;
            if (['true', '1', 1].includes(value)) return true;
            if (['false', '0', 0].includes(value)) return false;
            throw dataError('DATA_CONTRACT_TRANSFORMATION_INVALID', 'Boolean normalization failed.', rule.path);
          case 'wrap_object': {
            const key = String(rule.wrapperKey || 'value');
            pathSegments(key);
            return { [key]: value };
          }
          case 'flatten_object': {
            if (!value || typeof value !== 'object' || Array.isArray(value)) throw dataError('DATA_CONTRACT_TRANSFORMATION_INVALID', 'Object flattening requires an object.', rule.path);
            const flattened = {};
            const fields = Array.isArray(rule.fields) ? rule.fields.slice(0, INTER_AGENT_LIMITS.maximumFields) : [];
            for (const field of fields) {
              const child = readOwnPath(value, field);
              if (child.exists) flattened[String(field).replace(/\./g, '_')] = child.value;
            }
            return flattened;
          }
          case 'sha256': return hashValue(value, rule.ruleId);
          case 'pseudonymize': return hashValue(value, rule.ruleId, true);
          default: return value;
        }
      });
    }
    if (changed) transformedFieldCount += 1;
  });
  return { payload: safeClone(payload, limits), transformedFieldCount };
}

function mask(value, visibleSuffix = 4) {
  const text = String(value);
  const suffix = Math.max(0, Math.min(Number(visibleSuffix || 0), 16, text.length));
  return `${'*'.repeat(Math.min(12, Math.max(4, text.length - suffix)))}${text.slice(text.length - suffix)}`;
}

function applyRedactions(payloadInput, rules = [], limits = {}) {
  if (rules.length > INTER_AGENT_LIMITS.maximumRules) {
    throw dataError('DATA_CONTRACT_REDACTION_INVALID', 'Redaction rule limit exceeded.', '$redactionRules');
  }
  const payload = safeClone(payloadInput, limits);
  let redactedFieldCount = 0;
  rules.forEach((raw, index) => {
    const rule = normalizeRule(raw, index, 'REDACTION');
    if (!REDACTION_ACTIONS.includes(rule.action)) {
      throw dataError('DATA_CONTRACT_REDACTION_INVALID', 'Redaction action is not approved.', `$redactionRules[${index}].action`);
    }
    const changed = replacePath(payload, rule.path, (value) => {
      switch (rule.action) {
        case 'remove': return undefined;
        case 'replace': return String(rule.marker || '[REDACTED]').slice(0, 100);
        case 'mask': return mask(value, rule.visibleSuffix);
        case 'truncate': return String(value).slice(0, Math.max(0, Math.min(Number(rule.maximumLength || 0), 1_000)));
        case 'sha256': return hashValue(value, rule.ruleId);
        case 'pseudonymize': return hashValue(value, rule.ruleId, true);
        default: return undefined;
      }
    });
    if (changed) redactedFieldCount += 1;
  });
  return { payload: safeClone(payload, limits), redactedFieldCount };
}

function countFields(value) {
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countFields(item), 0);
  if (!value || typeof value !== 'object') return 0;
  return Object.entries(value).reduce((sum, [, item]) => sum + 1 + countFields(item), 0);
}

function countOwnEnumerableFields(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return 0;
  seen.add(value);
  if (Array.isArray(value)) {
    const total = value.reduce((sum, item) => sum + countOwnEnumerableFields(item, seen), 0);
    seen.delete(value);
    return total;
  }
  let total = 0;
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || descriptor.enumerable !== true) continue;
    total += 1;
    if (!descriptor.get && !descriptor.set) total += countOwnEnumerableFields(descriptor.value, seen);
  }
  seen.delete(value);
  return total;
}

function minimizeBySchema(value, schema = {}, options = {}, path = '$') {
  if (Array.isArray(value)) {
    return value
      .slice(0, options.maximumArrayItems)
      .map((item, index) => minimizeBySchema(item, schema.items || {}, options, `${path}.${index}`))
      .filter((item) => item !== undefined);
  }
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string') return value.slice(0, options.maximumStringLength);
    return value;
  }
  const output = {};
  const required = new Set(schema.required || []);
  const properties = schema.properties || {};
  for (const key of Object.keys(value).sort()) {
    if (!Object.hasOwn(properties, key) || dangerousSegment(key)) continue;
    const minimized = minimizeBySchema(value[key], properties[key], options, `${path}.${key}`);
    const emptyObject = minimized && typeof minimized === 'object' && !Array.isArray(minimized) && !Object.keys(minimized).length;
    const emptyArray = Array.isArray(minimized) && !minimized.length;
    if (minimized === null && !required.has(key)) continue;
    if ((emptyObject || emptyArray) && !required.has(key)) continue;
    if (options.removeOptional && !required.has(key)) continue;
    output[key] = minimized;
  }
  return output;
}

function applyMinimization(payloadInput, schema, rules = [], limits = {}) {
  const safeLimits = normalizedLimits(limits);
  const removeOptional = rules.some((rule) => rule?.operation === 'remove_optional');
  const payload = safeClone(payloadInput, safeLimits);
  const before = countFields(payload);
  const minimized = minimizeBySchema(payload, schema || {}, { ...safeLimits, removeOptional });
  const safe = safeClone(minimized, safeLimits);
  return { payload: safe, removedFieldCount: Math.max(0, before - countFields(safe)) };
}

function approximateBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function schemaHash(schema) {
  return secureDigest('inter-agent-schema', canonicalize(schema));
}

function highestClassification(values = [], fallback = 'restricted') {
  const normalized = values.map((value) => String(value || '').toLowerCase());
  if (normalized.some((value) => !DATA_CLASSIFICATIONS.includes(value))) return fallback;
  if (!normalized.length) return fallback;
  return normalized.sort((left, right) => CLASSIFICATION_RANK[right] - CLASSIFICATION_RANK[left])[0];
}

function assertClassificationAllowed(effective, contract, target = {}) {
  const value = String(effective || '').toLowerCase();
  if (!DATA_CLASSIFICATIONS.includes(value)) throw dataError('DATA_CONTRACT_CLASSIFICATION_DENIED', 'Data classification is unknown.');
  if (CLASSIFICATION_RANK[value] > CLASSIFICATION_RANK[contract.maximumDataClassification]) {
    throw dataError('DATA_CONTRACT_CLASSIFICATION_DENIED', 'Data classification exceeds the contract ceiling.');
  }
  if (contract.allowedDataClassifications?.length && !contract.allowedDataClassifications.includes(value)) {
    throw dataError('DATA_CONTRACT_CLASSIFICATION_DENIED', 'Data classification is not allowed by the contract.');
  }
  if (target.dataClassificationsAllowed?.length && !target.dataClassificationsAllowed.includes(value)) {
    throw dataError('DATA_CONTRACT_CLASSIFICATION_DENIED', 'Target agent does not support the effective classification.');
  }
  return value;
}

function assertRegionResidency(contract, target = {}, context = {}) {
  const targetRegions = new Set((target.supportedRegions || []).map((value) => String(value).toUpperCase()));
  const targetResidency = new Set((target.residencyRegions || []).map((value) => String(value).toUpperCase()));
  const allowed = (contract.allowedRegions || []).map((value) => String(value).toUpperCase());
  const required = [
    ...(contract.residencyRequirements || []),
    ...(context.residencyRequirements || []),
  ].map((value) => String(value).toUpperCase());
  if (allowed.length && (!targetRegions.size || !allowed.some((value) => targetRegions.has(value)))) {
    throw dataError('DATA_CONTRACT_RESIDENCY_DENIED', 'Target region is incompatible with the contract.');
  }
  if (required.length && (!targetResidency.size || required.some((value) => !targetResidency.has(value)))) {
    throw dataError('DATA_CONTRACT_RESIDENCY_DENIED', 'Target residency declaration does not satisfy requirements.');
  }
  return true;
}

function processDelegatedInput(sourceInput, contract, context = {}) {
  const limits = normalizedLimits(contract);
  const originalFieldCount = countOwnEnumerableFields(sourceInput);
  const original = safeClone(sourceInput, limits);
  const originalApproximateByteSize = approximateBytes(original);
  let payload = extractAllowedFields(original, contract.allowedInputFields, contract.deniedInputFields, limits);
  if (contract.sourceOutputMapping && Object.keys(contract.sourceOutputMapping).length) {
    payload = applyMapping(contract.sourceOutputMapping, { source: payload, runInput: context.runInput || {}, metadata: context.metadata || {}, dependency: context.dependency || {} }, limits);
  }
  if (contract.targetInputMapping && Object.keys(contract.targetInputMapping).length) {
    payload = applyMapping(contract.targetInputMapping, { source: payload, runInput: context.runInput || {}, metadata: context.metadata || {}, dependency: context.dependency || {} }, limits);
  }
  const transformed = applyTransformations(payload, contract.transformationRules || [], limits);
  const redacted = applyRedactions(transformed.payload, contract.redactionRules || [], limits);
  const minimized = applyMinimization(redacted.payload, contract.allowedInputSchema, contract.minimizationRules || [], limits);
  payload = safeClone(minimized.payload, limits);
  return {
    payload,
    statistics: {
      originalFieldCount,
      delegatedFieldCount: countFields(payload),
      removedFieldCount: Math.max(0, originalFieldCount - countFields(payload)) + minimized.removedFieldCount,
      redactedFieldCount: redacted.redactedFieldCount,
      transformedFieldCount: transformed.transformedFieldCount,
      originalApproximateByteSize,
      delegatedApproximateByteSize: approximateBytes(payload),
    },
  };
}

function processDelegatedOutput(outputInput, contract) {
  const limits = normalizedLimits(contract);
  const originalFieldCount = countOwnEnumerableFields(outputInput);
  const original = safeClone(outputInput, limits);
  let payload = extractAllowedFields(original, contract.allowedOutputFields, contract.deniedOutputFields, limits);
  if (contract.downstreamOutputMapping && Object.keys(contract.downstreamOutputMapping).length) {
    payload = applyMapping(contract.downstreamOutputMapping, { source: payload, runInput: {}, metadata: {}, dependency: {} }, limits);
  }
  const minimized = applyMinimization(payload, contract.allowedOutputSchema, contract.minimizationRules || [], limits);
  payload = safeClone(minimized.payload, limits);
  return {
    payload,
    statistics: {
      originalFieldCount,
      delegatedFieldCount: countFields(payload),
      removedFieldCount: Math.max(0, originalFieldCount - countFields(payload)),
      approximateOutputBytes: approximateBytes(payload),
    },
  };
}

module.exports = {
  DANGEROUS_KEYS,
  HIDDEN_FIELDS,
  applyMapping,
  applyMinimization,
  applyRedactions,
  applyTransformations,
  approximateBytes,
  assertClassificationAllowed,
  assertRegionResidency,
  countFields,
  dangerousSegment,
  deletePath,
  extractAllowedFields,
  highestClassification,
  pathSegments,
  processDelegatedInput,
  processDelegatedOutput,
  readOwnPath,
  safeClone,
  schemaHash,
};
