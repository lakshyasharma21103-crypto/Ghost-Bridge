const { ORCHESTRATION_LIMITS } = require('../constants/orchestration');
const {
  assertSafePayload,
  cloneJson,
  forbiddenKey,
  validateAgainstSchema,
} = require('./orchestrationValidation.service');
const { AppError } = require('../utils/AppError');

function mappingError(code, message, path) {
  return new AppError(400, code, message, path ? [{ path, code, message }] : []);
}

function safeSegments(path) {
  const segments = String(path || '').split('.');
  if (
    !segments.length ||
    segments.length > ORCHESTRATION_LIMITS.maximumPathDepth ||
    segments.some(
      (segment) => !/^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(segment) || forbiddenKey(segment),
    )
  ) {
    throw mappingError(
      'ORCHESTRATION_MAPPING_PATH_INVALID',
      'Input mapping path was rejected.',
      path,
    );
  }
  return segments;
}

function readPath(source, path) {
  let current = source;
  for (const segment of safeSegments(path)) {
    if (!current || typeof current !== 'object' || !Object.hasOwn(current, segment)) {
      throw mappingError(
        'ORCHESTRATION_MAPPING_VALUE_MISSING',
        'A required mapped value is unavailable.',
        path,
      );
    }
    current = current[segment];
  }
  return cloneJson(current);
}

function resolveExpression(expression, context, path) {
  if (!expression.startsWith('$')) return expression;
  if (expression.startsWith('$run.input.')) {
    return readPath(context.runInput, expression.slice('$run.input.'.length));
  }
  if (expression.startsWith('$nodes.')) {
    const match = /^\$nodes\.([A-Za-z][A-Za-z0-9_-]{0,99})\.output\.(.+)$/.exec(expression);
    if (!match) {
      throw mappingError(
        'ORCHESTRATION_MAPPING_EXPRESSION_REJECTED',
        'Node output expression was rejected.',
        path,
      );
    }
    const [, nodeKey, outputPath] = match;
    if (!context.dependencies.includes(nodeKey)) {
      throw mappingError(
        'ORCHESTRATION_MAPPING_DEPENDENCY_DENIED',
        'Only declared dependency outputs may be mapped.',
        path,
      );
    }
    if (!Object.hasOwn(context.nodeOutputs, nodeKey)) {
      throw mappingError(
        'ORCHESTRATION_MAPPING_VALUE_MISSING',
        'A dependency output is unavailable.',
        path,
      );
    }
    return readPath(context.nodeOutputs[nodeKey], outputPath);
  }
  if (expression.startsWith('$meta.')) {
    const metadataKey = expression.slice('$meta.'.length);
    if (!Object.hasOwn(context.metadata, metadataKey)) {
      throw mappingError(
        'ORCHESTRATION_MAPPING_METADATA_DENIED',
        'Orchestration metadata field is not available.',
        path,
      );
    }
    return cloneJson(context.metadata[metadataKey]);
  }
  throw mappingError(
    'ORCHESTRATION_MAPPING_EXPRESSION_REJECTED',
    'Executable or unknown mapping expressions are forbidden.',
    path,
  );
}

function resolveValue(value, context, path, counter) {
  counter.count += 1;
  if (counter.count > ORCHESTRATION_LIMITS.maximumMappingEntries) {
    throw mappingError(
      'ORCHESTRATION_MAPPING_LIMIT_EXCEEDED',
      'Input mapping contains too many entries.',
      path,
    );
  }
  if (typeof value === 'string') return resolveExpression(value, context, path);
  if (value == null || ['number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) {
    return value.map((item, index) => resolveValue(item, context, `${path}[${index}]`, counter));
  }
  if (typeof value !== 'object') {
    throw mappingError('ORCHESTRATION_MAPPING_VALUE_INVALID', 'Mapping value is invalid.', path);
  }
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw mappingError(
      'ORCHESTRATION_MAPPING_PROTOTYPE_REJECTED',
      'Mapping object prototype was rejected.',
      path,
    );
  }
  if (Object.keys(value).length === 1 && Object.hasOwn(value, 'literal')) {
    assertSafePayload(value.literal, `${path}.literal`);
    return cloneJson(value.literal);
  }
  const output = Object.create(null);
  for (const [key, item] of Object.entries(value)) {
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(key) || forbiddenKey(key)) {
      throw mappingError(
        'ORCHESTRATION_MAPPING_TARGET_REJECTED',
        'Mapping target field was rejected.',
        `${path}.${key}`,
      );
    }
    output[key] = resolveValue(item, context, `${path}.${key}`, counter);
  }
  return output;
}

function resolveNodeInput(mapping, context, inputSchema) {
  assertSafePayload(context.runInput, '$run.input');
  const result = resolveValue(
    mapping || {},
    {
      runInput: context.runInput,
      nodeOutputs: context.nodeOutputs || {},
      dependencies: [...new Set(context.dependencies || [])],
      metadata: context.metadata || {},
    },
    '$mapping',
    { count: 0 },
  );
  return validateAgainstSchema(inputSchema, result, {
    path: '$node.input',
    code: 'ORCHESTRATION_NODE_INPUT_INVALID',
    message: 'Resolved node input does not match its schema.',
  });
}

function referencedOutputPaths(definitionSnapshot, nodeKey) {
  const paths = [];
  const expressionPattern = new RegExp(
    `^\\$nodes\\.${String(nodeKey).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.output\\.(.+)$`,
  );
  function visit(value) {
    if (typeof value === 'string') {
      const match = expressionPattern.exec(value);
      if (match) paths.push(match[1]);
      return;
    }
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  }
  for (const node of definitionSnapshot.nodes || []) visit(node.inputMapping);
  return [...new Set(paths)].sort();
}

function assignPath(target, path, value) {
  const segments = safeSegments(path);
  let current = target;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) current[segment] = cloneJson(value);
    else {
      current[segment] ||= Object.create(null);
      current = current[segment];
    }
  });
}

function projectValidatedOutput(output, nodeKey, definitionSnapshot) {
  assertSafePayload(output, '$node.output');
  const paths = referencedOutputPaths(definitionSnapshot, nodeKey);
  const hasDependent = (definitionSnapshot.nodes || []).some((node) =>
    (node.dependencies || []).includes(nodeKey),
  );
  if (!hasDependent) return cloneJson(output);
  const projected = Object.create(null);
  for (const path of paths) assignPath(projected, path, readPath(output, path));
  return cloneJson(projected);
}

module.exports = {
  projectValidatedOutput,
  readPath,
  referencedOutputPaths,
  resolveNodeInput,
  safeSegments,
};
