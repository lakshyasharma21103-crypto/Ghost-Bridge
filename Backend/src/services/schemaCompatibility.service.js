const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { AGENT_SELECTION_LIMITS } = require('../constants/agentSelection');
const { assertSafePayload, cloneJson, jsonSize } = require('./orchestrationValidation.service');
const { AppError } = require('../utils/AppError');

const UNSUPPORTED_FEATURES = new Set([
  '$ref',
  '$dynamicRef',
  'allOf',
  'anyOf',
  'oneOf',
  'not',
  'if',
  'then',
  'else',
  'dependentSchemas',
  'patternProperties',
  'unevaluatedProperties',
  'contains',
  'prefixItems',
  'format',
  'pattern',
]);
const STRUCTURAL_KEYS = new Set([
  'type',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'enum',
  'const',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'format',
  'pattern',
  'nullable',
  ...UNSUPPORTED_FEATURES,
]);

function schemaError(code, message, details = []) {
  return new AppError(400, code, message, details);
}

function validateSchema(schema, path = '$schema') {
  assertSafePayload(schema, path);
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    throw schemaError('AGENT_SELECTION_SCHEMA_INVALID', 'A JSON Schema object is required.', [{ path, code: 'SCHEMA_REQUIRED', message: 'A JSON Schema object is required.' }]);
  }
  if (jsonSize(schema) > AGENT_SELECTION_LIMITS.maximumSchemaBytes) {
    throw schemaError('AGENT_SELECTION_SCHEMA_INVALID', 'Selection schema exceeds the size limit.');
  }
  const ajv = new Ajv({ strict: false, validateSchema: true });
  addFormats(ajv);
  try {
    ajv.compile(schema);
  } catch (error) {
    throw schemaError('AGENT_SELECTION_SCHEMA_INVALID', 'Selection schema is invalid.', [{
      path,
      code: 'SCHEMA_INVALID',
      message: String(error.message || 'JSON Schema is invalid.').slice(0, 300),
    }]);
  }
  return cloneJson(schema);
}

function sanitizeSchema(schema, path = '$schema') {
  validateSchema(schema, path);
  function visit(value, key) {
    if (Array.isArray(value)) return value.map((item) => visit(item));
    if (!value || typeof value !== 'object') return value;
    const output = {};
    for (const [childKey, child] of Object.entries(value)) {
      if (key === 'properties') {
        output[childKey] = visit(child);
      } else if (STRUCTURAL_KEYS.has(childKey)) {
        output[childKey] = childKey === 'properties' ? visit(child, 'properties') : visit(child, childKey);
      }
    }
    return output;
  }
  return visit(schema);
}

function typeSet(schema = {}) {
  let types = schema.type;
  if (!types && schema.nullable === true) types = ['null'];
  if (!types) return null;
  types = Array.isArray(types) ? types : [types];
  if (schema.nullable === true && !types.includes('null')) types = [...types, 'null'];
  return new Set(types);
}

function unsupported(schema, path, uncertain) {
  for (const key of Object.keys(schema || {})) {
    if (UNSUPPORTED_FEATURES.has(key)) uncertain.add(`SCHEMA_FEATURE_UNSUPPORTED:${path}:${key}`);
  }
}

function mismatchCode(direction, kind) {
  if (kind === 'required') {
    return direction === 'input' ? 'REQUIRED_INPUT_FIELD_UNSUPPORTED' : 'REQUIRED_OUTPUT_FIELD_MISSING';
  }
  if (kind === 'type') return direction === 'input' ? 'INPUT_TYPE_MISMATCH' : 'OUTPUT_TYPE_MISMATCH';
  return direction === 'input' ? 'INPUT_CONSTRAINT_MISMATCH' : 'OUTPUT_CONSTRAINT_MISMATCH';
}

function compareBounds(producer, consumer, direction, path, incompatible, uncertain) {
  const pairs = [
    ['minimum', (left, right) => left >= right],
    ['exclusiveMinimum', (left, right) => left >= right],
    ['minLength', (left, right) => left >= right],
    ['minItems', (left, right) => left >= right],
    ['maximum', (left, right) => left <= right],
    ['exclusiveMaximum', (left, right) => left <= right],
    ['maxLength', (left, right) => left <= right],
    ['maxItems', (left, right) => left <= right],
  ];
  for (const [key, accepts] of pairs) {
    if (consumer[key] === undefined) continue;
    if (producer[key] === undefined) {
      uncertain.add(`SCHEMA_COMPATIBILITY_UNCERTAIN:${path}:${key}`);
    } else if (!accepts(Number(producer[key]), Number(consumer[key]))) {
      incompatible.add(`${mismatchCode(direction, 'constraint')}:${path}:${key}`);
    }
  }
}

function compareSubset(producer = {}, consumer = {}, direction, path, incompatible, uncertain) {
  unsupported(producer, path, uncertain);
  unsupported(consumer, path, uncertain);
  const producerTypes = typeSet(producer);
  const consumerTypes = typeSet(consumer);
  if (!producerTypes || !consumerTypes) {
    uncertain.add(`SCHEMA_COMPATIBILITY_UNCERTAIN:${path}:type`);
  } else if ([...producerTypes].some((type) => !consumerTypes.has(type))) {
    incompatible.add(`${mismatchCode(direction, 'type')}:${path}`);
    return;
  }

  if (Array.isArray(producer.enum) && Array.isArray(consumer.enum)) {
    const allowed = new Set(consumer.enum.map((value) => JSON.stringify(value)));
    if (producer.enum.some((value) => !allowed.has(JSON.stringify(value)))) {
      incompatible.add(`${mismatchCode(direction, 'constraint')}:${path}:enum`);
    }
  } else if (consumer.enum && !producer.enum) {
    uncertain.add(`SCHEMA_COMPATIBILITY_UNCERTAIN:${path}:enum`);
  }
  if (consumer.const !== undefined) {
    if (producer.const === undefined) uncertain.add(`SCHEMA_COMPATIBILITY_UNCERTAIN:${path}:const`);
    else if (JSON.stringify(producer.const) !== JSON.stringify(consumer.const)) {
      incompatible.add(`${mismatchCode(direction, 'constraint')}:${path}:const`);
    }
  }
  compareBounds(producer, consumer, direction, path, incompatible, uncertain);

  const objectLike = producerTypes?.has('object') || consumerTypes?.has('object');
  if (objectLike) {
    const producerProperties = producer.properties || {};
    const consumerProperties = consumer.properties || {};
    const producerRequired = new Set(producer.required || []);
    for (const required of consumer.required || []) {
      if (!Object.hasOwn(producerProperties, required) || !producerRequired.has(required)) {
        incompatible.add(`${mismatchCode(direction, 'required')}:${path}.${required}`);
      }
    }
    for (const [property, child] of Object.entries(producerProperties)) {
      if (Object.hasOwn(consumerProperties, property)) {
        compareSubset(child, consumerProperties[property], direction, `${path}.${property}`, incompatible, uncertain);
      } else if (consumer.additionalProperties === false) {
        incompatible.add(`${mismatchCode(direction, 'constraint')}:${path}.${property}:additionalProperties`);
      } else if (consumer.additionalProperties && typeof consumer.additionalProperties === 'object') {
        compareSubset(child, consumer.additionalProperties, direction, `${path}.${property}`, incompatible, uncertain);
      }
    }
    if (producer.additionalProperties !== false && consumer.additionalProperties === false) {
      incompatible.add(`${mismatchCode(direction, 'constraint')}:${path}:additionalProperties`);
    }
  }

  const arrayLike = producerTypes?.has('array') || consumerTypes?.has('array');
  if (arrayLike) {
    if (producer.items && consumer.items) {
      compareSubset(producer.items, consumer.items, direction, `${path}[]`, incompatible, uncertain);
    } else if (consumer.items) {
      uncertain.add(`SCHEMA_COMPATIBILITY_UNCERTAIN:${path}:items`);
    }
  }
}

function publicReasons(values) {
  return [...new Set([...values].map((value) => value.split(':')[0]))].sort();
}

function checkSchemaCompatibility(requestInputSchema, candidateInputSchema, candidateOutputSchema, requiredOutputSchema) {
  const schemas = [requestInputSchema, candidateInputSchema, candidateOutputSchema, requiredOutputSchema];
  schemas.forEach((schema, index) => validateSchema(schema, `$schemas[${index}]`));
  const incompatible = new Set();
  const uncertain = new Set();
  compareSubset(requestInputSchema, candidateInputSchema, 'input', '$input', incompatible, uncertain);
  compareSubset(candidateOutputSchema, requiredOutputSchema, 'output', '$output', incompatible, uncertain);
  const status = incompatible.size ? 'incompatible' : uncertain.size ? 'uncertain' : 'compatible';
  const reasonCodes = status === 'incompatible' ? publicReasons(incompatible) : status === 'uncertain' ? publicReasons(uncertain) : ['SCHEMA_COMPATIBLE'];
  return { status, reasonCodes };
}

module.exports = {
  checkSchemaCompatibility,
  sanitizeSchema,
  validateSchema,
};
