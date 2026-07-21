const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { canonicalize, secureDigest } = require('../utils/idempotency');
const { isSensitiveKey, redactSecrets } = require('../utils/redact');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  DEFAULT_ORCHESTRATION_SETTINGS,
  ORCHESTRATION_LIMITS,
} = require('../constants/orchestration');
const { AGENT_SELECTION_LIMITS } = require('../constants/agentSelection');
const {
  EXPECTED_IDEMPOTENCY_BEHAVIORS,
  FAILURE_STRATEGIES,
  RECOVERABILITIES,
  RECOVERY_LIMITS,
} = require('../constants/orchestrationRecovery');

function normalizeDataMapping(input) {
  return require('./interAgentContractValidation.service').normalizeMapping(input);
}

const SAFE_NODE_KEY = /^[A-Za-z][A-Za-z0-9_-]{0,99}$/;
const SAFE_PATH_SEGMENT = /^[A-Za-z][A-Za-z0-9_-]{0,127}$/;
const SAFE_OBJECT_ID = /^[a-f0-9]{24}$/i;
const FORBIDDEN_KEYS = new Set([
  'proto',
  'prototype',
  'constructor',
  'systemprompt',
  'systemmessage',
  'chainofthought',
  'reasoning',
  'hiddenreasoning',
  'privatememory',
  'sourcecode',
  'environment',
  'process',
  'global',
  'globalthis',
]);
const SAFE_METADATA_PATHS = new Set([
  'runId',
  'definitionId',
  'definitionVersion',
  'nodeKey',
  'attempt',
  'traceId',
  'requestId',
]);

function normalizeKey(value) {
  return String(value || '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function forbiddenKey(key) {
  return FORBIDDEN_KEYS.has(normalizeKey(key)) || isSensitiveKey(key);
}

function issue(path, code, message) {
  return { path, code, message };
}

function jsonSize(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function inspectSafeJson(value, path = '$', seen = new WeakSet(), issues = []) {
  if (value == null || ['string', 'boolean'].includes(typeof value)) return issues;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) issues.push(issue(path, 'NON_FINITE_NUMBER', 'Numbers must be finite.'));
    return issues;
  }
  if (typeof value !== 'object') {
    issues.push(issue(path, 'NON_JSON_VALUE', 'Only JSON values are allowed.'));
    return issues;
  }
  if (seen.has(value)) {
    issues.push(issue(path, 'CIRCULAR_VALUE', 'Circular values are not allowed.'));
    return issues;
  }
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    issues.push(issue(path, 'UNSAFE_OBJECT_PROTOTYPE', 'Only plain JSON objects are allowed.'));
    return issues;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectSafeJson(item, `${path}[${index}]`, seen, issues));
  } else {
    for (const [key, item] of Object.entries(value)) {
      if (forbiddenKey(key)) {
        issues.push(issue(`${path}.${key}`, 'FORBIDDEN_FIELD', 'Protected fields are not allowed.'));
        continue;
      }
      inspectSafeJson(item, `${path}.${key}`, seen, issues);
    }
  }
  seen.delete(value);
  return issues;
}

function assertSafePayload(value, path = '$') {
  const issues = inspectSafeJson(value, path);
  if (jsonSize(value) > ORCHESTRATION_LIMITS.maximumPayloadBytes) {
    issues.push(issue(path, 'PAYLOAD_TOO_LARGE', 'Payload exceeds the orchestration size limit.'));
  }
  if (issues.length) {
    throw new AppError(400, 'ORCHESTRATION_PAYLOAD_REJECTED', 'Orchestration payload was rejected.', issues);
  }
  return value;
}

function cloneJson(value) {
  assertSafePayload(value);
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function ajvInstance() {
  const ajv = new Ajv({ allErrors: true, strict: false, validateSchema: true });
  addFormats(ajv);
  return ajv;
}

function schemaIssues(schema, path) {
  const ajv = ajvInstance();
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return [issue(path, 'SCHEMA_REQUIRED', 'A JSON Schema object is required.')];
  }
  const safeIssues = inspectSafeJson(schema, path);
  if (safeIssues.length) return safeIssues;
  try {
    ajv.compile(schema);
    return [];
  } catch (error) {
    return [issue(path, 'SCHEMA_INVALID', String(error.message || 'JSON Schema is invalid.').slice(0, 300))];
  }
}

function validateAgainstSchema(schema, value, options = {}) {
  assertSafePayload(value, options.path || '$');
  const ajv = ajvInstance();
  let validate;
  try {
    validate = ajv.compile(schema);
  } catch {
    throw new AppError(400, 'ORCHESTRATION_SCHEMA_INVALID', 'Orchestration schema is invalid.');
  }
  if (!validate(value)) {
    const details = (validate.errors || []).slice(0, 50).map((error) => ({
      path: `${options.path || '$'}${error.instancePath || ''}`,
      code: 'SCHEMA_VALIDATION_FAILED',
      message: error.message || 'Value does not match its schema.',
    }));
    throw new AppError(
      400,
      options.code || 'ORCHESTRATION_SCHEMA_VALIDATION_FAILED',
      options.message || 'Orchestration data does not match its schema.',
      details,
    );
  }
  return cloneJson(value);
}

function pathSegments(path, issuePath, issues) {
  const segments = String(path || '').split('.');
  if (
    !segments.length ||
    segments.length > ORCHESTRATION_LIMITS.maximumPathDepth ||
    segments.some((segment) => !SAFE_PATH_SEGMENT.test(segment) || forbiddenKey(segment))
  ) {
    issues.push(issue(issuePath, 'MAPPING_PATH_INVALID', 'Mapping path contains a forbidden segment.'));
    return null;
  }
  return segments;
}

function schemaDeclaresPath(schema, segments) {
  let current = schema;
  for (const segment of segments) {
    if (!current || typeof current !== 'object') return false;
    if (current.type === 'array') current = current.items;
    const properties = current?.properties;
    if (!properties || !Object.hasOwn(properties, segment)) return false;
    current = properties[segment];
  }
  return true;
}

function mappingReference(expression, context, path, issues) {
  if (expression.startsWith('$run.input.')) {
    const sourcePath = expression.slice('$run.input.'.length);
    const segments = pathSegments(sourcePath, path, issues);
    if (segments && !schemaDeclaresPath(context.inputSchema, segments)) {
      issues.push(issue(path, 'MAPPING_INPUT_UNDECLARED', 'Run input mapping references an undeclared field.'));
    }
    return;
  }
  if (expression.startsWith('$nodes.')) {
    const match = /^\$nodes\.([A-Za-z][A-Za-z0-9_-]{0,99})\.output(?:\.(.+))?$/.exec(expression);
    if (!match) {
      issues.push(issue(path, 'MAPPING_NODE_PATH_INVALID', 'Node output mapping has an invalid path.'));
      return;
    }
    const [, nodeKey, sourcePath] = match;
    if (!context.dependencies.has(nodeKey)) {
      issues.push(issue(path, 'MAPPING_NODE_NOT_DEPENDENCY', 'Only declared dependency outputs may be mapped.'));
      return;
    }
    if (!sourcePath) {
      issues.push(issue(path, 'MAPPING_OUTPUT_PATH_REQUIRED', 'A declared output field is required.'));
      return;
    }
    const segments = pathSegments(sourcePath, path, issues);
    const dependency = context.nodesByKey.get(nodeKey);
    if (segments && !schemaDeclaresPath(dependency?.outputSchema, segments)) {
      issues.push(issue(path, 'MAPPING_OUTPUT_UNDECLARED', 'Node mapping references an undeclared output field.'));
    }
    return;
  }
  if (expression.startsWith('$meta.')) {
    const metaPath = expression.slice('$meta.'.length);
    if (!SAFE_METADATA_PATHS.has(metaPath)) {
      issues.push(issue(path, 'MAPPING_METADATA_FORBIDDEN', 'Mapping metadata field is not allowed.'));
    }
    return;
  }
  if (expression.startsWith('$')) {
    issues.push(issue(path, 'MAPPING_EXPRESSION_FORBIDDEN', 'Executable or unknown mapping expressions are forbidden.'));
  }
}

function inspectMapping(value, context, path, issues, counter) {
  counter.count += 1;
  if (counter.count > ORCHESTRATION_LIMITS.maximumMappingEntries) {
    issues.push(issue(path, 'MAPPING_LIMIT_EXCEEDED', 'Input mapping contains too many entries.'));
    return;
  }
  if (typeof value === 'string') {
    mappingReference(value, context, path, issues);
    return;
  }
  if (value == null || ['number', 'boolean'].includes(typeof value)) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectMapping(item, context, `${path}[${index}]`, issues, counter));
    return;
  }
  if (typeof value !== 'object') {
    issues.push(issue(path, 'MAPPING_VALUE_INVALID', 'Mapping values must be JSON values.'));
    return;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    issues.push(issue(path, 'UNSAFE_OBJECT_PROTOTYPE', 'Mapping objects must use a safe prototype.'));
    return;
  }
  if (Object.keys(value).length === 1 && Object.hasOwn(value, 'literal')) {
    const literalIssues = inspectSafeJson(value.literal, `${path}.literal`);
    issues.push(...literalIssues);
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (!SAFE_PATH_SEGMENT.test(key) || forbiddenKey(key)) {
      issues.push(issue(`${path}.${key}`, 'MAPPING_TARGET_FORBIDDEN', 'Mapping target field is forbidden.'));
      continue;
    }
    inspectMapping(item, context, `${path}.${key}`, issues, counter);
  }
}

function dependenciesFor(definition) {
  const map = new Map((definition.nodes || []).map((node) => [node.nodeKey, new Set(node.dependencies || [])]));
  for (const edge of definition.edges || []) {
    if (map.has(edge.to)) map.get(edge.to).add(edge.from);
  }
  return map;
}

function validateDefinitionDocument(definition = {}) {
  const issues = [];
  const nodes = Array.isArray(definition.nodes) ? definition.nodes : [];
  const edges = Array.isArray(definition.edges) ? definition.edges : [];
  if (!nodes.length) issues.push(issue('nodes', 'ORCHESTRATION_NODES_REQUIRED', 'At least one node is required.'));
  if (nodes.length > ORCHESTRATION_LIMITS.maximumNodes)
    issues.push(issue('nodes', 'ORCHESTRATION_NODE_LIMIT_EXCEEDED', 'Node limit exceeded.'));
  if (edges.length > ORCHESTRATION_LIMITS.maximumEdges)
    issues.push(issue('edges', 'ORCHESTRATION_EDGE_LIMIT_EXCEEDED', 'Edge limit exceeded.'));
  issues.push(...schemaIssues(definition.inputSchema, 'inputSchema'));
  issues.push(...schemaIssues(definition.outputSchema, 'outputSchema'));

  const seen = new Set();
  const nodesByKey = new Map();
  nodes.forEach((node, index) => {
    const path = `nodes[${index}]`;
    if (!SAFE_NODE_KEY.test(String(node.nodeKey || ''))) {
      issues.push(issue(`${path}.nodeKey`, 'ORCHESTRATION_NODE_KEY_INVALID', 'Node key is invalid.'));
    } else if (seen.has(node.nodeKey)) {
      issues.push(issue(`${path}.nodeKey`, 'ORCHESTRATION_NODE_DUPLICATE', 'Node keys must be unique.'));
    } else {
      seen.add(node.nodeKey);
      nodesByKey.set(node.nodeKey, node);
    }
    const targetingMode = String(node.targetingMode || (node.selectionPolicyId ? 'governed_selection' : 'pinned'));
    if (!['pinned', 'governed_selection'].includes(targetingMode)) {
      issues.push(issue(`${path}.targetingMode`, 'ORCHESTRATION_TARGETING_MODE_INVALID', 'Targeting mode is invalid.'));
    } else if (targetingMode === 'pinned') {
      if (!SAFE_OBJECT_ID.test(String(node.connectionId || ''))) {
        issues.push(issue(`${path}.connectionId`, 'ORCHESTRATION_CONNECTION_REFERENCE_INVALID', 'Connection reference is invalid.'));
      }
      if (!SAFE_OBJECT_ID.test(String(node.passportId || ''))) {
        issues.push(issue(`${path}.passportId`, 'ORCHESTRATION_PASSPORT_REFERENCE_INVALID', 'Passport reference is invalid.'));
      }
      if (node.selectionPolicyId || node.selectionConstraints || (node.preferredPassportIds || []).length || (node.excludedPassportIds || []).length) {
        issues.push(issue(path, 'ORCHESTRATION_TARGETING_MODE_CONFLICT', 'Pinned and governed selection settings cannot be combined.'));
      }
    } else {
      if (node.connectionId || node.passportId) {
        issues.push(issue(path, 'ORCHESTRATION_TARGETING_MODE_CONFLICT', 'Governed selection cannot pin a connection or passport.'));
      }
      if (!SAFE_OBJECT_ID.test(String(node.selectionPolicyId || ''))) {
        issues.push(issue(`${path}.selectionPolicyId`, 'ORCHESTRATION_SELECTION_POLICY_REFERENCE_INVALID', 'Selection policy reference is invalid.'));
      }
      if (String(node.selectionTiming || 'run_creation') !== 'run_creation') {
        issues.push(issue(`${path}.selectionTiming`, 'ORCHESTRATION_SELECTION_TIMING_INVALID', 'Phase 13D2 supports selection at run creation only.'));
      }
      const references = [...(node.preferredPassportIds || []), ...(node.excludedPassportIds || [])];
      if (references.some((value) => !SAFE_OBJECT_ID.test(String(value)))) {
        issues.push(issue(`${path}.preferredPassportIds`, 'ORCHESTRATION_SELECTION_REFERENCE_INVALID', 'Selection passport reference is invalid.'));
      }
      if (references.length > AGENT_SELECTION_LIMITS.maximumArrayItems) {
        issues.push(issue(`${path}.preferredPassportIds`, 'ORCHESTRATION_SELECTION_REFERENCE_LIMIT', 'Selection reference limit exceeded.'));
      }
      const fallbackCount = Number(node.fallbackCandidateCount ?? 0);
      if (!Number.isInteger(fallbackCount) || fallbackCount < 0 || fallbackCount > AGENT_SELECTION_LIMITS.maximumFallbackCandidates) {
        issues.push(issue(`${path}.fallbackCandidateCount`, 'ORCHESTRATION_SELECTION_FALLBACK_INVALID', 'Fallback candidate count is invalid.'));
      }
      if (inspectSafeJson(node.selectionConstraints || {}, `${path}.selectionConstraints`).length) {
        issues.push(issue(`${path}.selectionConstraints`, 'ORCHESTRATION_SELECTION_CONSTRAINTS_UNSAFE', 'Selection constraints contain protected fields.'));
      }
    }
    issues.push(...schemaIssues(node.inputSchema, `${path}.inputSchema`));
    issues.push(...schemaIssues(node.outputSchema, `${path}.outputSchema`));
    const timeout = Number(node.timeoutMs || definition.defaultNodeTimeoutMs);
    if (
      !Number.isInteger(timeout) ||
      timeout < ORCHESTRATION_LIMITS.minimumNodeTimeoutMs ||
      timeout > ORCHESTRATION_LIMITS.maximumNodeTimeoutMs
    ) {
      issues.push(issue(`${path}.timeoutMs`, 'ORCHESTRATION_TIMEOUT_INVALID', 'Node timeout is outside the allowed bounds.'));
    }
    const maxAttempts = Number(
      node.retryPolicy?.maxAttempts || DEFAULT_ORCHESTRATION_SETTINGS.retryPolicy.maxAttempts,
    );
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > ORCHESTRATION_LIMITS.maximumRetryAttempts) {
      issues.push(issue(`${path}.retryPolicy.maxAttempts`, 'ORCHESTRATION_RETRY_LIMIT_INVALID', 'Retry attempt limit is invalid.'));
    }
    if (inspectSafeJson(node.policyContext || {}, `${path}.policyContext`).length) {
      issues.push(issue(`${path}.policyContext`, 'ORCHESTRATION_POLICY_CONTEXT_UNSAFE', 'Policy context contains protected fields.'));
    }
    const recoverability = String(node.recoverability || 'retryable');
    if (!RECOVERABILITIES.includes(recoverability)) {
      issues.push(issue(`${path}.recoverability`, 'ORCHESTRATION_RECOVERABILITY_INVALID', 'Node recoverability is invalid.'));
    }
    if (node.failureStrategy && !FAILURE_STRATEGIES.includes(String(node.failureStrategy))) {
      issues.push(issue(`${path}.failureStrategy`, 'ORCHESTRATION_RECOVERY_STRATEGY_INVALID', 'Node recovery strategy is invalid.'));
    }
    if (recoverability === 'compensatable' && !node.compensationDefinition) {
      issues.push(issue(`${path}.compensationDefinition`, 'ORCHESTRATION_COMPENSATION_REQUIRED', 'A compensatable node must declare compensation before activation.'));
    }
    if (recoverability === 'non_reversible' && node.compensationDefinition) {
      issues.push(issue(`${path}.compensationDefinition`, 'ORCHESTRATION_NON_REVERSIBLE_CONFLICT', 'A non-reversible node cannot declare automatic compensation.'));
    }
    if (node.compensationDefinition) {
      const compensation = node.compensationDefinition;
      const compensationPath = `${path}.compensationDefinition`;
      const compensationTargeting = String(
        compensation.targetingMode ||
          (compensation.selectionPolicyId ? 'governed_selection' : 'pinned'),
      );
      if (!['pinned', 'governed_selection'].includes(compensationTargeting)) {
        issues.push(issue(`${compensationPath}.targetingMode`, 'ORCHESTRATION_COMPENSATION_TARGET_INVALID', 'Compensation target mode is invalid.'));
      } else if (compensationTargeting === 'pinned') {
        if (
          !SAFE_OBJECT_ID.test(String(compensation.connectionId || '')) ||
          !SAFE_OBJECT_ID.test(String(compensation.passportId || ''))
        ) {
          issues.push(issue(compensationPath, 'ORCHESTRATION_COMPENSATION_TARGET_INVALID', 'Pinned compensation requires valid connection and passport references.'));
        }
        if (
          compensation.selectionPolicyId ||
          compensation.selectionConstraints ||
          (compensation.preferredPassportIds || []).length ||
          (compensation.excludedPassportIds || []).length
        ) {
          issues.push(issue(compensationPath, 'ORCHESTRATION_COMPENSATION_TARGET_CONFLICT', 'Pinned and governed compensation targets cannot be combined.'));
        }
      } else {
        if (compensation.connectionId || compensation.passportId) {
          issues.push(issue(compensationPath, 'ORCHESTRATION_COMPENSATION_TARGET_CONFLICT', 'Governed compensation cannot pin a connection or passport.'));
        }
        if (!SAFE_OBJECT_ID.test(String(compensation.selectionPolicyId || ''))) {
          issues.push(issue(`${compensationPath}.selectionPolicyId`, 'ORCHESTRATION_SELECTION_POLICY_REFERENCE_INVALID', 'Compensation selection policy reference is invalid.'));
        }
      }
      if (
        !/^[A-Za-z][A-Za-z0-9._:-]{0,199}$/.test(String(compensation.capability || '')) ||
        !/^[A-Za-z][A-Za-z0-9._:-]{0,199}$/.test(String(compensation.operation || ''))
      ) {
        issues.push(issue(`${compensationPath}.capability`, 'ORCHESTRATION_COMPENSATION_CAPABILITY_INVALID', 'Compensation capability and operation must use bounded identifiers.'));
      }
      issues.push(...schemaIssues(compensation.inputSchema, `${compensationPath}.inputSchema`));
      issues.push(...schemaIssues(compensation.outputSchema, `${compensationPath}.outputSchema`));
      try {
        normalizeDataMapping(compensation.inputMapping || {});
      } catch (error) {
        issues.push(issue(`${compensationPath}.inputMapping`, 'ORCHESTRATION_COMPENSATION_MAPPING_INVALID', String(error.message || 'Compensation mapping is invalid.').slice(0, 300)));
      }
      if (
        compensation.dataContractId &&
        (!SAFE_OBJECT_ID.test(String(compensation.dataContractId)) ||
          !Number.isInteger(Number(compensation.dataContractVersion)) ||
          Number(compensation.dataContractVersion) < 1)
      ) {
        issues.push(issue(`${compensationPath}.dataContractId`, 'DATA_CONTRACT_VERSION_INVALID', 'Compensation data contract requires an explicit valid ID and version.'));
      }
      if (!compensation.dataContractId && compensation.dataContractVersion != null) {
        issues.push(issue(`${compensationPath}.dataContractVersion`, 'DATA_CONTRACT_VERSION_INVALID', 'Compensation contract version cannot exist without a contract ID.'));
      }
      if (
        !EXPECTED_IDEMPOTENCY_BEHAVIORS.includes(
          String(compensation.expectedIdempotencyBehavior || 'ghost_bridge_keyed'),
        )
      ) {
        issues.push(issue(`${compensationPath}.expectedIdempotencyBehavior`, 'ORCHESTRATION_COMPENSATION_IDEMPOTENCY_INVALID', 'Compensation idempotency behavior is invalid.'));
      }
      const compensationAttempts = Number(compensation.retryPolicy?.maxAttempts || 1);
      if (
        !Number.isInteger(compensationAttempts) ||
        compensationAttempts < 1 ||
        compensationAttempts > RECOVERY_LIMITS.maximumCompensationAttempts
      ) {
        issues.push(issue(`${compensationPath}.retryPolicy.maxAttempts`, 'ORCHESTRATION_COMPENSATION_LIMIT_INVALID', 'Compensation attempt limit is invalid.'));
      }
      if (inspectSafeJson(compensation.successCriteria || {}, `${compensationPath}.successCriteria`).length) {
        issues.push(issue(`${compensationPath}.successCriteria`, 'ORCHESTRATION_COMPENSATION_CRITERIA_UNSAFE', 'Compensation success criteria contain protected fields.'));
      }
      for (const dependency of compensation.dependencies || []) {
        if (!SAFE_NODE_KEY.test(String(dependency)) || dependency === node.nodeKey) {
          issues.push(issue(`${compensationPath}.dependencies`, 'ORCHESTRATION_COMPENSATION_DEPENDENCY_INVALID', 'Compensation dependency is invalid.'));
        }
      }
    }
  });

  const dependencies = dependenciesFor(definition);
  edges.forEach((edge, index) => {
    if (!nodesByKey.has(edge.from) || !nodesByKey.has(edge.to)) {
      issues.push(issue(`edges[${index}]`, 'ORCHESTRATION_DEPENDENCY_INVALID', 'Edge references an unknown node.'));
    }
    if (edge.from === edge.to) {
      issues.push(issue(`edges[${index}]`, 'ORCHESTRATION_CYCLE_DETECTED', 'Self-referencing edges are forbidden.'));
    }
    const mappingMode = String(edge.mappingMode || (edge.dataContractId ? 'contract' : 'direct'));
    if (!['direct', 'contract'].includes(mappingMode)) {
      issues.push(issue(`edges[${index}].mappingMode`, 'ORCHESTRATION_MAPPING_MODE_INVALID', 'Edge mapping mode is invalid.'));
    } else if (mappingMode === 'contract') {
      if (!SAFE_OBJECT_ID.test(String(edge.dataContractId || ''))) {
        issues.push(issue(`edges[${index}].dataContractId`, 'DATA_CONTRACT_SELECTOR_INVALID', 'Contract delegation requires a valid contract identifier.'));
      }
      if (!Number.isInteger(Number(edge.dataContractVersion)) || Number(edge.dataContractVersion) < 1) {
        issues.push(issue(`edges[${index}].dataContractVersion`, 'DATA_CONTRACT_VERSION_INVALID', 'Contract delegation requires an explicit positive version.'));
      }
      if ((edge.sourceNodeKey && edge.sourceNodeKey !== edge.from) || (edge.targetNodeKey && edge.targetNodeKey !== edge.to)) {
        issues.push(issue(`edges[${index}]`, 'DATA_CONTRACT_MAPPING_INVALID', 'Contract edge source and target keys must match its endpoints.'));
      }
    } else if (edge.dataContractId || edge.dataContractVersion || edge.sourceNodeKey || edge.targetNodeKey) {
      issues.push(issue(`edges[${index}]`, 'ORCHESTRATION_MAPPING_MODE_CONFLICT', 'Direct edges cannot carry data-contract authority.'));
    }
  });
  const contractTargets = new Set();
  edges.forEach((edge, index) => {
    const mode = String(edge.mappingMode || (edge.dataContractId ? 'contract' : 'direct'));
    if (mode !== 'contract') return;
    if (contractTargets.has(edge.to)) {
      issues.push(issue(`edges[${index}]`, 'DATA_CONTRACT_MAPPING_INVALID', 'A target node may have only one incoming contract delegation.'));
    }
    contractTargets.add(edge.to);
  });
  for (const [nodeKey, dependencyKeys] of dependencies) {
    for (const dependency of dependencyKeys) {
      if (!nodesByKey.has(dependency)) {
        issues.push(issue(`nodes.${nodeKey}.dependencies`, 'ORCHESTRATION_DEPENDENCY_INVALID', 'Dependency references an unknown node.'));
      }
      if (dependency === nodeKey) {
        issues.push(issue(`nodes.${nodeKey}.dependencies`, 'ORCHESTRATION_CYCLE_DETECTED', 'A node cannot depend on itself.'));
      }
    }
  }

  const indegree = new Map(nodes.map((node) => [node.nodeKey, dependencies.get(node.nodeKey)?.size || 0]));
  const dependents = new Map(nodes.map((node) => [node.nodeKey, []]));
  for (const [nodeKey, dependencyKeys] of dependencies) {
    for (const dependency of dependencyKeys) dependents.get(dependency)?.push(nodeKey);
  }
  const roots = [...indegree].filter(([, degree]) => degree === 0).map(([key]) => key).sort();
  if (nodes.length && !roots.length) {
    issues.push(issue('nodes', 'ORCHESTRATION_ROOT_REQUIRED', 'At least one root node is required.'));
  }
  const queue = [...roots];
  const visited = [];
  while (queue.length) {
    const current = queue.shift();
    visited.push(current);
    for (const dependent of (dependents.get(current) || []).sort()) {
      indegree.set(dependent, indegree.get(dependent) - 1);
      if (indegree.get(dependent) === 0) queue.push(dependent);
    }
  }
  if (visited.length !== nodes.length) {
    issues.push(issue('nodes', 'ORCHESTRATION_CYCLE_DETECTED', 'Orchestration graph must be acyclic.'));
  }
  const reachable = new Set(visited);
  for (const node of nodes) {
    if (!reachable.has(node.nodeKey))
      issues.push(issue(`nodes.${node.nodeKey}`, 'ORCHESTRATION_NODE_UNREACHABLE', 'Node is not reachable from a root.'));
  }

  nodes.forEach((node, index) => {
    inspectMapping(
      node.inputMapping || {},
      {
        inputSchema: definition.inputSchema,
        dependencies: dependencies.get(node.nodeKey) || new Set(),
        nodesByKey,
      },
      `nodes[${index}].inputMapping`,
      issues,
      { count: 0 },
    );
  });

  const concurrency = Number(definition.concurrencyLimit);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > ORCHESTRATION_LIMITS.maximumConcurrency) {
    issues.push(issue('concurrencyLimit', 'ORCHESTRATION_CONCURRENCY_INVALID', 'Concurrency limit is outside the allowed bounds.'));
  }
  const runDuration = Number(definition.maxRunDurationMs);
  if (
    !Number.isInteger(runDuration) ||
    runDuration < ORCHESTRATION_LIMITS.minimumRunDurationMs ||
    runDuration > ORCHESTRATION_LIMITS.maximumRunDurationMs
  ) {
    issues.push(issue('maxRunDurationMs', 'ORCHESTRATION_DURATION_INVALID', 'Run duration is outside the allowed bounds.'));
  }
  const maxExecutions = Number(definition.maxNodeExecutions);
  if (
    !Number.isInteger(maxExecutions) ||
    maxExecutions < nodes.length ||
    maxExecutions > ORCHESTRATION_LIMITS.maximumNodeExecutions
  ) {
    issues.push(issue('maxNodeExecutions', 'ORCHESTRATION_EXECUTION_LIMIT_INVALID', 'Maximum node executions is invalid.'));
  }
  if (definition.recoveryPolicyId || definition.recoveryPolicyVersion) {
    if (
      !SAFE_OBJECT_ID.test(String(definition.recoveryPolicyId || '')) ||
      !Number.isInteger(Number(definition.recoveryPolicyVersion)) ||
      Number(definition.recoveryPolicyVersion) < 1
    ) {
      issues.push(issue('recoveryPolicyId', 'ORCHESTRATION_RECOVERY_POLICY_REFERENCE_INVALID', 'Recovery policy ID and version must be declared together.'));
    }
  }
  if (!FAILURE_STRATEGIES.includes(String(definition.failureStrategy || 'fail'))) {
    issues.push(issue('failureStrategy', 'ORCHESTRATION_RECOVERY_STRATEGY_INVALID', 'Default recovery strategy is invalid.'));
  }
  for (const [name, maximum] of [
    ['maximumRecoveryAttempts', RECOVERY_LIMITS.maximumRecoveryAttempts],
    ['maximumCompensationAttempts', RECOVERY_LIMITS.maximumCompensationAttempts],
  ]) {
    const value = Number(definition[name] ?? 0);
    if (!Number.isInteger(value) || value < 0 || value > maximum) {
      issues.push(issue(name, 'ORCHESTRATION_RECOVERY_LIMIT_INVALID', 'Recovery attempt limit is invalid.'));
    }
  }
  for (const name of ['recoveryDeadlineMs', 'compensationDeadlineMs', 'interventionTimeoutMs']) {
    if (definition[name] == null) continue;
    const value = Number(definition[name]);
    const maximum = name === 'interventionTimeoutMs'
      ? RECOVERY_LIMITS.maximumInterventionMs
      : RECOVERY_LIMITS.maximumDeadlineMs;
    if (!Number.isInteger(value) || value < RECOVERY_LIMITS.minimumDeadlineMs || value > maximum) {
      issues.push(issue(name, 'ORCHESTRATION_RECOVERY_DEADLINE_INVALID', 'Recovery deadline is outside the allowed bounds.'));
    }
  }
  if (
    definition.compensationEnabled !== true &&
    nodes.some((node) => node.compensationDefinition)
  ) {
    issues.push(issue('compensationEnabled', 'ORCHESTRATION_COMPENSATION_DISABLED', 'Compensation definitions require orchestration compensation to be enabled.'));
  }
  return {
    valid: issues.length === 0,
    errors: issues,
    roots,
    topologicalOrder: visited,
    dependencies: Object.fromEntries([...dependencies].map(([key, value]) => [key, [...value].sort()])),
  };
}

function safeDefinitionSnapshot(definitionInput) {
  const definition = typeof definitionInput?.toObject === 'function' ? definitionInput.toObject() : definitionInput;
  const dependencies = dependenciesFor(definition);
  const snapshot = {
    definitionId: String(definition._id || definition.id),
    definitionVersion: Number(definition.version),
    name: String(definition.name),
    inputSchema: cloneJson(definition.inputSchema),
    outputSchema: cloneJson(definition.outputSchema),
    concurrencyLimit: Number(definition.concurrencyLimit),
    maxRunDurationMs: Number(definition.maxRunDurationMs),
    maxNodeExecutions: Number(definition.maxNodeExecutions),
    defaultNodeTimeoutMs: Number(definition.defaultNodeTimeoutMs),
    ...(definition.recoveryPolicyId
      ? { recoveryPolicyId: String(definition.recoveryPolicyId) }
      : {}),
    ...(definition.recoveryPolicyVersion != null
      ? { recoveryPolicyVersion: Number(definition.recoveryPolicyVersion) }
      : {}),
    failureStrategy: definition.failureStrategy || 'fail',
    compensationEnabled: definition.compensationEnabled === true,
    compensateOnCancellation: definition.compensateOnCancellation === true,
    maximumRecoveryAttempts: Number(definition.maximumRecoveryAttempts || 0),
    maximumCompensationAttempts: Number(definition.maximumCompensationAttempts || 0),
    ...(definition.recoveryDeadlineMs != null
      ? { recoveryDeadlineMs: Number(definition.recoveryDeadlineMs) }
      : {}),
    ...(definition.compensationDeadlineMs != null
      ? { compensationDeadlineMs: Number(definition.compensationDeadlineMs) }
      : {}),
    ...(definition.interventionTimeoutMs != null
      ? { interventionTimeoutMs: Number(definition.interventionTimeoutMs) }
      : {}),
    edges: (definition.edges || []).map((edge) => ({
      from: edge.from,
      to: edge.to,
      mappingMode: edge.mappingMode || (edge.dataContractId ? 'contract' : 'direct'),
      ...(edge.dataContractId ? { dataContractId: String(edge.dataContractId) } : {}),
      ...(edge.dataContractVersion != null
        ? { dataContractVersion: Number(edge.dataContractVersion) }
        : {}),
      ...(edge.sourceNodeKey || edge.from
        ? { sourceNodeKey: edge.sourceNodeKey || edge.from }
        : {}),
      ...(edge.targetNodeKey || edge.to ? { targetNodeKey: edge.targetNodeKey || edge.to } : {}),
      ...(edge._inputSchemaHash ? { inputSchemaHash: String(edge._inputSchemaHash) } : {}),
      ...(edge._outputSchemaHash ? { outputSchemaHash: String(edge._outputSchemaHash) } : {}),
    })),
    nodes: (definition.nodes || []).map((node) => ({
      nodeKey: node.nodeKey,
      displayName: node.displayName,
      targetingMode: node.targetingMode || 'pinned',
      ...(node.connectionId ? { connectionId: String(node.connectionId) } : {}),
      ...(node.passportId ? { passportId: String(node.passportId) } : {}),
      passportVersion: String(node.passportVersion || node._passportVersion || ''),
      ...(node.selectionPolicyId ? { selectionPolicyId: String(node.selectionPolicyId) } : {}),
      ...(node.selectionDecisionId ? { selectionDecisionId: String(node.selectionDecisionId) } : {}),
      ...(node.selectionApprovalRequestId ? { selectionApprovalRequestId: String(node.selectionApprovalRequestId) } : {}),
      ...(node.selectionPolicyVersion != null ? { selectionPolicyVersion: Number(node.selectionPolicyVersion) } : {}),
      selectionTiming: node.selectionTiming || 'run_creation',
      selectionConstraints: cloneJson(node.selectionConstraints || {}),
      preferredPassportIds: (node.preferredPassportIds || []).map(String).sort(),
      excludedPassportIds: (node.excludedPassportIds || []).map(String).sort(),
      fallbackCandidateCount: Number(node.fallbackCandidateCount ?? 0),
      fallbackCandidates: cloneJson(node.fallbackCandidates || []),
      capability: node.capability,
      operation: node.operation,
      inputSchema: cloneJson(node.inputSchema),
      outputSchema: cloneJson(node.outputSchema),
      inputMapping: cloneJson(node.inputMapping || {}),
      timeoutMs: Number(node.timeoutMs || definition.defaultNodeTimeoutMs),
      retryPolicy: {
        maxAttempts: Number(node.retryPolicy?.maxAttempts || 1),
        baseDelayMs: Number(node.retryPolicy?.baseDelayMs || 1_000),
        maxDelayMs: Number(node.retryPolicy?.maxDelayMs || 30_000),
      },
      approvalRequirement: {
        required: node.approvalRequirement?.required === true,
        ...(node.approvalRequirement?.workflowId ? { workflowId: node.approvalRequirement.workflowId } : {}),
        ...(node.approvalRequirement?.reason ? { reason: node.approvalRequirement.reason } : {}),
      },
      policyContext: cloneJson(node.policyContext || {}),
      continueOnFailure: node.continueOnFailure === true,
      dependencies: [...(dependencies.get(node.nodeKey) || [])].sort(),
      recoverability: node.recoverability || 'retryable',
      ...(node.failureStrategy ? { failureStrategy: node.failureStrategy } : {}),
      ...(node.compensationDefinition
        ? {
            compensationDefinition: {
              targetingMode: node.compensationDefinition.targetingMode || 'pinned',
              ...(node.compensationDefinition.connectionId
                ? { connectionId: String(node.compensationDefinition.connectionId) }
                : {}),
              ...(node.compensationDefinition.passportId
                ? { passportId: String(node.compensationDefinition.passportId) }
                : {}),
              ...(node.compensationDefinition.passportVersion ||
              node.compensationDefinition._passportVersion
                ? {
                    passportVersion: String(
                      node.compensationDefinition.passportVersion ||
                        node.compensationDefinition._passportVersion,
                    ),
                  }
                : {}),
              ...(node.compensationDefinition.selectionPolicyId
                ? { selectionPolicyId: String(node.compensationDefinition.selectionPolicyId) }
                : {}),
              ...(node.compensationDefinition.selectionPolicyVersion != null
                ? {
                    selectionPolicyVersion: Number(
                      node.compensationDefinition.selectionPolicyVersion,
                    ),
                  }
                : {}),
              ...(node.compensationDefinition.selectionDecisionId
                ? {
                    selectionDecisionId: String(
                      node.compensationDefinition.selectionDecisionId,
                    ),
                  }
                : {}),
              selectionConstraints: cloneJson(
                node.compensationDefinition.selectionConstraints || {},
              ),
              preferredPassportIds: (
                node.compensationDefinition.preferredPassportIds || []
              ).map(String).sort(),
              excludedPassportIds: (
                node.compensationDefinition.excludedPassportIds || []
              ).map(String).sort(),
              capability: node.compensationDefinition.capability,
              operation: node.compensationDefinition.operation,
              inputSchema: cloneJson(node.compensationDefinition.inputSchema),
              outputSchema: cloneJson(node.compensationDefinition.outputSchema),
              inputMapping: cloneJson(node.compensationDefinition.inputMapping || {}),
              timeoutMs: Number(node.compensationDefinition.timeoutMs),
              retryPolicy: {
                maxAttempts: Number(
                  node.compensationDefinition.retryPolicy?.maxAttempts || 1,
                ),
                baseDelayMs: Number(
                  node.compensationDefinition.retryPolicy?.baseDelayMs || 1_000,
                ),
                maxDelayMs: Number(
                  node.compensationDefinition.retryPolicy?.maxDelayMs || 30_000,
                ),
              },
              ...(node.compensationDefinition.dataContractId
                ? {
                    dataContractId: String(
                      node.compensationDefinition.dataContractId,
                    ),
                    dataContractVersion: Number(
                      node.compensationDefinition.dataContractVersion,
                    ),
                  }
                : {}),
              approvalRequirement: cloneJson(
                node.compensationDefinition.approvalRequirement || {
                  required: false,
                },
              ),
              expectedIdempotencyBehavior:
                node.compensationDefinition.expectedIdempotencyBehavior ||
                'ghost_bridge_keyed',
              successCriteria: cloneJson(
                node.compensationDefinition.successCriteria || {},
              ),
              continueAfterCompensationFailure:
                node.compensationDefinition.continueAfterCompensationFailure === true,
              parallelSafe: node.compensationDefinition.parallelSafe === true,
              dependencies: (
                node.compensationDefinition.dependencies || []
              ).map(String).sort(),
            },
          }
        : {}),
      recoveryOverrides: cloneJson(node.recoveryOverrides || {}),
      interventionRequirement: cloneJson(node.interventionRequirement || {}),
      checkpointPolicy: cloneJson(node.checkpointPolicy || {}),
    })),
  };
  assertSafePayload(snapshot);
  return Object.freeze(snapshot);
}

function definitionDigest(definition) {
  return secureDigest('orchestration-definition', canonicalize(safeDefinitionSnapshot(definition)));
}

function safeFailure(error, context = {}) {
  const status = Number(error?.providerHttpStatus || error?.statusCode || error?.status);
  return {
    code: /^[A-Z][A-Z0-9_]{0,127}$/.test(String(error?.code || ''))
      ? error.code
      : ErrorCodes.INTERNAL_SERVER_ERROR,
    message: String(error instanceof AppError ? error.message : 'Node execution failed safely.').slice(0, 500),
    httpStatusCategory: Number.isInteger(status) ? `${Math.floor(status / 100)}xx` : undefined,
    timeoutCategory: String(error?.timeoutReason || error?.reason || '').slice(0, 64) || undefined,
    retryable: context.retryable === true,
    requestId: context.requestId,
    traceId: context.traceId,
    attempt: context.attempt,
    occurredAt: new Date(),
  };
}

function redactedSummary(value) {
  const redacted = redactSecrets(value);
  if (!redacted || typeof redacted !== 'object') return { type: typeof redacted, bytes: jsonSize(redacted) };
  return {
    type: Array.isArray(redacted) ? 'array' : 'object',
    fields: Array.isArray(redacted) ? undefined : Object.keys(redacted).filter((key) => !forbiddenKey(key)).slice(0, 50),
    itemCount: Array.isArray(redacted) ? redacted.length : undefined,
    bytes: jsonSize(redacted),
  };
}

module.exports = {
  SAFE_METADATA_PATHS,
  assertSafePayload,
  cloneJson,
  definitionDigest,
  dependenciesFor,
  forbiddenKey,
  inspectSafeJson,
  jsonSize,
  redactedSummary,
  safeDefinitionSnapshot,
  safeFailure,
  schemaDeclaresPath,
  validateAgainstSchema,
  validateDefinitionDocument,
};
