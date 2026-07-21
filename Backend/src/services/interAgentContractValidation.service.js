const mongoose = require('mongoose');
const { AppError } = require('../utils/AppError');
const { canonicalize, secureDigest } = require('../utils/idempotency');
const { validateSchema } = require('./schemaCompatibility.service');
const {
  DATA_CLASSIFICATIONS,
  INTER_AGENT_LIMITS,
  MINIMIZATION_OPERATIONS,
  REDACTION_ACTIONS,
  RETENTION_MODES,
  SAFE_SELECTOR_KEYS,
  TRANSFORMATION_OPERATIONS,
} = require('../constants/interAgentDelegation');
const { pathSegments, safeClone, schemaHash } = require('./interAgentData.service');
const { TRUST_TIERS } = require('../constants/agentSelection');

const CONTRACT_INPUT_KEYS = new Set([
  'workspaceId', 'receivingWorkspaceId', 'name', 'description', 'version', 'sourceSelector',
  'targetSelector', 'sourceCapability', 'sourceOperation', 'targetCapability', 'targetOperation',
  'purpose', 'purposeCode', 'allowedInputSchema', 'allowedOutputSchema', 'sourceOutputMapping',
  'targetInputMapping', 'downstreamOutputMapping', 'allowedInputFields', 'deniedInputFields',
  'allowedOutputFields', 'deniedOutputFields', 'allowedDataClassifications',
  'maximumDataClassification', 'allowedRegions', 'residencyRequirements', 'transformationRules',
  'redactionRules', 'minimizationRules', 'maximumPayloadBytes', 'maximumArrayItems',
  'maximumStringLength', 'maximumObjectDepth', 'allowAttachments', 'allowedAttachmentTypes',
  'maximumAttachmentBytes', 'allowFurtherDelegation', 'maximumDelegationDepth', 'requireApproval',
  'approvalConditions', 'retentionPolicy', 'validFrom', 'expiresAt', 'idempotencyKey',
]);

function validationError(code, message, details = []) {
  return new AppError(400, code, message, details);
}

function issue(path, code, message) {
  return { path, code, message };
}

function allowedKeys(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return;
  const unknown = Object.keys(input).filter((key) => !CONTRACT_INPUT_KEYS.has(key)).sort();
  if (unknown.length) {
    throw validationError('DATA_CONTRACT_INVALID', 'Data contract contains unsupported fields.', unknown.slice(0, 20).map((key) => issue(key, 'UNSUPPORTED_FIELD', 'Unsupported fields and expressions are not accepted.')));
  }
}

function strings(values, options = {}) {
  const maximum = Number(options.maximum || INTER_AGENT_LIMITS.maximumFields);
  if (!Array.isArray(values)) return [];
  if (values.length > maximum) throw validationError(options.code || 'DATA_CONTRACT_INVALID', 'A contract array exceeds its limit.');
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].sort();
}

function normalizeSelector(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validationError('DATA_CONTRACT_SELECTOR_INVALID', 'A deterministic selector object is required.');
  }
  const unknown = Object.keys(input).filter((key) => !SAFE_SELECTOR_KEYS.includes(key));
  if (unknown.length) throw validationError('DATA_CONTRACT_SELECTOR_INVALID', 'Selector contains unsupported fields.', unknown.map((key) => issue(`selector.${key}`, 'SELECTOR_FIELD_UNSUPPORTED', 'Executable selector expressions are forbidden.')));
  const output = {};
  for (const key of SAFE_SELECTOR_KEYS) {
    if (input[key] == null || input[key] === '') continue;
    output[key] = String(input[key]).trim();
  }
  if (!Object.keys(output).length) throw validationError('DATA_CONTRACT_SELECTOR_INVALID', 'Selector must contain at least one bounded criterion.');
  for (const key of ['passportId', 'connectionId', 'selectionPolicyId', 'orchestrationDefinitionId']) {
    if (output[key] && !mongoose.isValidObjectId(output[key])) throw validationError('DATA_CONTRACT_SELECTOR_INVALID', 'Selector identifier is invalid.', [issue(`selector.${key}`, 'SELECTOR_ID_INVALID', 'Selector identifier is invalid.')]);
  }
  if (output.minimumTrustTier && !TRUST_TIERS.includes(output.minimumTrustTier)) throw validationError('DATA_CONTRACT_SELECTOR_INVALID', 'Selector trust tier is invalid.');
  if (output.orchestrationNodeKey && !/^[A-Za-z][A-Za-z0-9_-]{0,99}$/.test(output.orchestrationNodeKey)) throw validationError('DATA_CONTRACT_SELECTOR_INVALID', 'Selector node key is invalid.');
  return output;
}

function normalizeMapping(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw validationError('DATA_CONTRACT_MAPPING_INVALID', 'Mapping must be an object.');
  const safe = safeClone(input, { maximumPayloadBytes: 100_000, maximumArrayItems: 100, maximumStringLength: 2_000, maximumObjectDepth: 8 });
  if (Object.keys(safe).length > INTER_AGENT_LIMITS.maximumFields) throw validationError('DATA_CONTRACT_MAPPING_INVALID', 'Mapping field limit exceeded.');
  for (const [target, value] of Object.entries(safe)) {
    pathSegments(target);
    if (typeof value === 'string') {
      const expression = value.replace(/^\$/, '');
      const [root, ...rest] = expression.split('.');
      if (!['source', 'runInput', 'metadata', 'dependency'].includes(root) || !rest.length) throw validationError('DATA_CONTRACT_MAPPING_INVALID', 'Mapping source is not approved.', [issue(target, 'MAPPING_SOURCE_INVALID', 'Only declared data sources may be referenced.')]);
      pathSegments(rest.join('.'));
    } else if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 1 || !Object.hasOwn(value, 'literal')) {
      throw validationError('DATA_CONTRACT_MAPPING_INVALID', 'Mapping values must be safe paths or fixed literals.', [issue(target, 'MAPPING_VALUE_INVALID', 'Executable mappings are forbidden.')]);
    }
  }
  return safe;
}

function normalizeRules(input, kind) {
  const rules = Array.isArray(input) ? input : [];
  if (rules.length > INTER_AGENT_LIMITS.maximumRules) throw validationError(`DATA_CONTRACT_${kind}_INVALID`, `${kind.toLowerCase()} rule limit exceeded.`);
  const identifiers = new Set();
  return rules.map((inputRule, index) => {
    const rule = safeClone(inputRule, { maximumPayloadBytes: 50_000, maximumArrayItems: 100, maximumStringLength: 2_000, maximumObjectDepth: 6 });
    if (!rule || typeof rule !== 'object' || Array.isArray(rule) || !/^[A-Za-z][A-Za-z0-9._-]{0,127}$/.test(String(rule.ruleId || '')) || identifiers.has(rule.ruleId)) throw validationError(`DATA_CONTRACT_${kind}_INVALID`, 'Rules require unique safe identifiers.', [issue(`${kind.toLowerCase()}Rules[${index}].ruleId`, 'RULE_ID_INVALID', 'Rule identifier is missing, invalid, or duplicated.')]);
    identifiers.add(rule.ruleId);
    const operation = kind === 'TRANSFORMATION' ? rule.operation : rule.action;
    const allowed = kind === 'TRANSFORMATION' ? TRANSFORMATION_OPERATIONS : REDACTION_ACTIONS;
    if (!allowed.includes(operation)) throw validationError(`DATA_CONTRACT_${kind}_INVALID`, 'Rule operation is not approved.', [issue(`${kind.toLowerCase()}Rules[${index}]`, 'RULE_OPERATION_INVALID', 'Arbitrary code, templates, regular expressions, and external calls are forbidden.')]);
    if (operation !== 'literal') pathSegments(rule.path);
    if (['literal', 'rename'].includes(operation)) pathSegments(rule.targetPath);
    if (operation === 'slice_array' && (!Number.isInteger(Number(rule.maximumItems)) || Number(rule.maximumItems) < 0 || Number(rule.maximumItems) > INTER_AGENT_LIMITS.maximumArrayItems)) throw validationError('DATA_CONTRACT_TRANSFORMATION_INVALID', 'Array slice bound is invalid.');
    if (['truncate_string', 'truncate'].includes(operation) && (!Number.isInteger(Number(rule.maximumLength)) || Number(rule.maximumLength) < 0 || Number(rule.maximumLength) > INTER_AGENT_LIMITS.maximumStringLength)) throw validationError(`DATA_CONTRACT_${kind}_INVALID`, 'String bound is invalid.');
    if (operation === 'clamp_number' && (!Number.isFinite(Number(rule.minimum)) || !Number.isFinite(Number(rule.maximum)) || Number(rule.minimum) > Number(rule.maximum))) throw validationError('DATA_CONTRACT_TRANSFORMATION_INVALID', 'Numeric clamp bounds are invalid.');
    return rule;
  });
}

function normalizeMinimizationRules(input) {
  const rules = Array.isArray(input) ? input : [];
  if (rules.length > INTER_AGENT_LIMITS.maximumRules) throw validationError('DATA_CONTRACT_INVALID', 'Minimization rule limit exceeded.');
  const identifiers = new Set();
  return rules.map((inputRule, index) => {
    const rule = safeClone(inputRule, { maximumPayloadBytes: 10_000, maximumArrayItems: 20, maximumStringLength: 500, maximumObjectDepth: 3 });
    if (!rule || typeof rule !== 'object' || Array.isArray(rule) || !/^[A-Za-z][A-Za-z0-9._-]{0,127}$/.test(String(rule.ruleId || '')) || identifiers.has(rule.ruleId)) throw validationError('DATA_CONTRACT_INVALID', 'Minimization rules require unique safe identifiers.', [issue(`minimizationRules[${index}].ruleId`, 'RULE_ID_INVALID', 'Rule identifier is missing, invalid, or duplicated.')]);
    if (!MINIMIZATION_OPERATIONS.includes(rule.operation) || Object.keys(rule).some((key) => !['ruleId', 'operation'].includes(key))) throw validationError('DATA_CONTRACT_INVALID', 'Minimization operation is not approved.', [issue(`minimizationRules[${index}]`, 'RULE_OPERATION_INVALID', 'Only fixed schema minimization operations are supported.')]);
    identifiers.add(rule.ruleId);
    return rule;
  });
}

function dateValue(value, fallback) {
  const date = new Date(value || fallback);
  if (Number.isNaN(date.getTime())) throw validationError('DATA_CONTRACT_INVALID', 'Contract validity date is invalid.');
  return date;
}

function normalizeContractInput(input = {}, current = {}, nowInput = new Date()) {
  allowedKeys(input);
  safeClone(input, { maximumPayloadBytes: INTER_AGENT_LIMITS.maximumPayloadBytes, maximumArrayItems: INTER_AGENT_LIMITS.maximumArrayItems, maximumStringLength: INTER_AGENT_LIMITS.maximumStringLength, maximumObjectDepth: INTER_AGENT_LIMITS.maximumObjectDepth });
  const now = new Date(nowInput);
  const validFrom = dateValue(input.validFrom ?? current.validFrom, now);
  const expiresAt = dateValue(input.expiresAt ?? current.expiresAt, new Date(now.getTime() + 24 * 60 * 60 * 1_000));
  const normalized = {
    name: String(input.name ?? current.name ?? '').trim(),
    description: String(input.description ?? current.description ?? '').trim(),
    version: Number(input.version ?? current.version ?? 1),
    sourceSelector: normalizeSelector(input.sourceSelector || current.sourceSelector || {}),
    targetSelector: normalizeSelector(input.targetSelector || current.targetSelector || {}),
    sourceCapability: String(input.sourceCapability ?? current.sourceCapability ?? '').trim(),
    sourceOperation: String(input.sourceOperation ?? current.sourceOperation ?? '').trim(),
    targetCapability: String(input.targetCapability ?? current.targetCapability ?? '').trim(),
    targetOperation: String(input.targetOperation ?? current.targetOperation ?? '').trim(),
    purpose: String(input.purpose ?? current.purpose ?? '').trim(),
    purposeCode: String(input.purposeCode ?? current.purposeCode ?? '').trim().toUpperCase(),
    allowedInputSchema: input.allowedInputSchema || current.allowedInputSchema || { type: 'object', properties: {}, additionalProperties: false },
    allowedOutputSchema: input.allowedOutputSchema || current.allowedOutputSchema || { type: 'object', properties: {}, additionalProperties: false },
    sourceOutputMapping: normalizeMapping(input.sourceOutputMapping || current.sourceOutputMapping || {}),
    targetInputMapping: normalizeMapping(input.targetInputMapping || current.targetInputMapping || {}),
    downstreamOutputMapping: normalizeMapping(input.downstreamOutputMapping || current.downstreamOutputMapping || {}),
    allowedInputFields: strings(input.allowedInputFields ?? current.allowedInputFields),
    deniedInputFields: strings(input.deniedInputFields ?? current.deniedInputFields),
    allowedOutputFields: strings(input.allowedOutputFields ?? current.allowedOutputFields),
    deniedOutputFields: strings(input.deniedOutputFields ?? current.deniedOutputFields),
    allowedDataClassifications: strings(input.allowedDataClassifications ?? current.allowedDataClassifications, { maximum: DATA_CLASSIFICATIONS.length }),
    maximumDataClassification: String(input.maximumDataClassification ?? current.maximumDataClassification ?? 'internal').toLowerCase(),
    allowedRegions: strings(input.allowedRegions ?? current.allowedRegions, { maximum: 30 }).map((value) => value.toUpperCase()),
    residencyRequirements: strings(input.residencyRequirements ?? current.residencyRequirements, { maximum: 30 }).map((value) => value.toUpperCase()),
    transformationRules: normalizeRules(input.transformationRules ?? current.transformationRules, 'TRANSFORMATION'),
    redactionRules: normalizeRules(input.redactionRules ?? current.redactionRules, 'REDACTION'),
    minimizationRules: normalizeMinimizationRules(input.minimizationRules ?? current.minimizationRules ?? []),
    maximumPayloadBytes: Number(input.maximumPayloadBytes ?? current.maximumPayloadBytes ?? 256_000),
    maximumArrayItems: Number(input.maximumArrayItems ?? current.maximumArrayItems ?? 100),
    maximumStringLength: Number(input.maximumStringLength ?? current.maximumStringLength ?? 10_000),
    maximumObjectDepth: Number(input.maximumObjectDepth ?? current.maximumObjectDepth ?? 10),
    allowAttachments: (input.allowAttachments ?? current.allowAttachments) === true,
    allowedAttachmentTypes: strings(input.allowedAttachmentTypes ?? current.allowedAttachmentTypes, { maximum: 30 }).map((value) => value.toLowerCase()),
    maximumAttachmentBytes: Number(input.maximumAttachmentBytes ?? current.maximumAttachmentBytes ?? 0),
    allowFurtherDelegation: (input.allowFurtherDelegation ?? current.allowFurtherDelegation) === true,
    maximumDelegationDepth: Number(input.maximumDelegationDepth ?? current.maximumDelegationDepth ?? 1),
    requireApproval: (input.requireApproval ?? current.requireApproval) === true,
    approvalConditions: safeClone(input.approvalConditions ?? current.approvalConditions ?? {}, { maximumPayloadBytes: 20_000, maximumArrayItems: 50, maximumStringLength: 500, maximumObjectDepth: 5 }),
    retentionPolicy: {
      mode: String(input.retentionPolicy?.mode ?? current.retentionPolicy?.mode ?? 'metadata_only'),
      durationDays: Number(input.retentionPolicy?.durationDays ?? current.retentionPolicy?.durationDays ?? 0),
    },
    validFrom,
    expiresAt,
  };
  return normalized;
}

function validateContractDocument(contract, options = {}) {
  const errors = [];
  const now = new Date(options.now || Date.now());
  if (!contract.organizationId || !contract.workspaceId) errors.push(issue('$scope', 'DATA_CONTRACT_INVALID', 'Organization and workspace scope are required.'));
  if (!contract.name || contract.name.length > INTER_AGENT_LIMITS.maximumNameLength) errors.push(issue('name', 'DATA_CONTRACT_INVALID', 'Contract name is required and bounded.'));
  if (!Number.isInteger(Number(contract.version)) || Number(contract.version) < 1) errors.push(issue('version', 'DATA_CONTRACT_VERSION_INVALID', 'Contract version must be a positive integer.'));
  for (const [name, selector] of [['sourceSelector', contract.sourceSelector], ['targetSelector', contract.targetSelector]]) {
    try { normalizeSelector(selector); } catch (error) { errors.push(issue(name, 'DATA_CONTRACT_SELECTOR_INVALID', error.message)); }
  }
  for (const name of ['sourceCapability', 'sourceOperation', 'targetCapability', 'targetOperation']) if (!/^[A-Za-z][A-Za-z0-9._:-]{0,199}$/.test(String(contract[name] || ''))) errors.push(issue(name, 'DATA_CONTRACT_INVALID', 'Capability and operation identifiers must be safe and bounded.'));
  if (!contract.purpose || !/^[A-Z][A-Z0-9_]{0,127}$/.test(String(contract.purposeCode || ''))) errors.push(issue('purpose', 'DATA_CONTRACT_INVALID', 'Purpose and safe purpose code are required.'));
  for (const [name, schema] of [['allowedInputSchema', contract.allowedInputSchema], ['allowedOutputSchema', contract.allowedOutputSchema]]) {
    try { validateSchema(schema, `$contract.${name}`); } catch { errors.push(issue(name, 'DATA_CONTRACT_SCHEMA_INVALID', 'Contract JSON Schema is invalid or unsupported.')); }
  }
  for (const [name, mapping] of [['sourceOutputMapping', contract.sourceOutputMapping], ['targetInputMapping', contract.targetInputMapping], ['downstreamOutputMapping', contract.downstreamOutputMapping]]) {
    try { normalizeMapping(mapping || {}); } catch (error) { errors.push(issue(name, 'DATA_CONTRACT_MAPPING_INVALID', error.message)); }
  }
  for (const name of ['allowedInputFields', 'allowedOutputFields']) if (!Array.isArray(contract[name]) || !contract[name].length) errors.push(issue(name, 'DATA_CONTRACT_INVALID', 'A non-empty field allowlist is required.'));
  for (const name of ['allowedInputFields', 'deniedInputFields', 'allowedOutputFields', 'deniedOutputFields']) for (const path of contract[name] || []) { try { pathSegments(path, { allowHidden: name.startsWith('denied') }); } catch { errors.push(issue(name, 'DATA_CONTRACT_MAPPING_INVALID', 'Field path is protected or invalid.')); } }
  try { normalizeRules(contract.transformationRules || [], 'TRANSFORMATION'); } catch (error) { errors.push(issue('transformationRules', 'DATA_CONTRACT_TRANSFORMATION_INVALID', error.message)); }
  try { normalizeRules(contract.redactionRules || [], 'REDACTION'); } catch (error) { errors.push(issue('redactionRules', 'DATA_CONTRACT_REDACTION_INVALID', error.message)); }
  try { normalizeMinimizationRules(contract.minimizationRules || []); } catch (error) { errors.push(issue('minimizationRules', 'DATA_CONTRACT_INVALID', error.message)); }
  if (!DATA_CLASSIFICATIONS.includes(contract.maximumDataClassification) || !(contract.allowedDataClassifications || []).every((value) => DATA_CLASSIFICATIONS.includes(value))) errors.push(issue('maximumDataClassification', 'DATA_CONTRACT_CLASSIFICATION_DENIED', 'Classification configuration is invalid.'));
  if ((contract.allowedDataClassifications || []).some((value) => DATA_CLASSIFICATIONS.indexOf(value) > DATA_CLASSIFICATIONS.indexOf(contract.maximumDataClassification))) errors.push(issue('allowedDataClassifications', 'DATA_CONTRACT_CLASSIFICATION_DENIED', 'Allowed classification exceeds the configured ceiling.'));
  const numericLimits = [
    ['maximumPayloadBytes', 1, INTER_AGENT_LIMITS.maximumPayloadBytes, 'DATA_CONTRACT_PAYLOAD_LIMIT_INVALID'],
    ['maximumArrayItems', 1, INTER_AGENT_LIMITS.maximumArrayItems, 'DATA_CONTRACT_PAYLOAD_LIMIT_INVALID'],
    ['maximumStringLength', 1, INTER_AGENT_LIMITS.maximumStringLength, 'DATA_CONTRACT_PAYLOAD_LIMIT_INVALID'],
    ['maximumObjectDepth', 1, INTER_AGENT_LIMITS.maximumObjectDepth, 'DATA_CONTRACT_PAYLOAD_LIMIT_INVALID'],
    ['maximumDelegationDepth', 1, INTER_AGENT_LIMITS.platformMaximumDelegationDepth, 'DATA_CONTRACT_DELEGATION_DEPTH_INVALID'],
  ];
  for (const [name, minimum, maximum, code] of numericLimits) if (!Number.isInteger(Number(contract[name])) || Number(contract[name]) < minimum || Number(contract[name]) > maximum) errors.push(issue(name, code, 'Configured bound is invalid.'));
  if (!Number.isInteger(Number(contract.maximumAttachmentBytes)) || Number(contract.maximumAttachmentBytes) < 0 || Number(contract.maximumAttachmentBytes) > INTER_AGENT_LIMITS.maximumAttachmentBytes) errors.push(issue('maximumAttachmentBytes', 'DATA_CONTRACT_PAYLOAD_LIMIT_INVALID', 'Attachment byte limit is invalid.'));
  if (contract.allowAttachments || (contract.allowedAttachmentTypes || []).length || Number(contract.maximumAttachmentBytes) !== 0) errors.push(issue('allowAttachments', 'DATA_CONTRACT_PAYLOAD_LIMIT_INVALID', 'Attachments are not supported by the bounded Phase 13D3 data path.'));
  if (!contract.allowFurtherDelegation && Number(contract.maximumDelegationDepth) !== 1) errors.push(issue('maximumDelegationDepth', 'DATA_CONTRACT_DELEGATION_DEPTH_INVALID', 'Non-transitive contracts must have maximum depth one.'));
  if (!RETENTION_MODES.includes(contract.retentionPolicy?.mode) || !Number.isInteger(Number(contract.retentionPolicy?.durationDays)) || Number(contract.retentionPolicy?.durationDays) < 0 || Number(contract.retentionPolicy?.durationDays) > 3650) errors.push(issue('retentionPolicy', 'DATA_CONTRACT_INVALID', 'Retention policy is invalid.'));
  const validFrom = new Date(contract.validFrom); const expiresAt = new Date(contract.expiresAt);
  if (Number.isNaN(validFrom.getTime()) || Number.isNaN(expiresAt.getTime()) || expiresAt <= validFrom || expiresAt.getTime() - validFrom.getTime() > INTER_AGENT_LIMITS.maximumValidityMs || (options.activation === true && expiresAt <= now)) errors.push(issue('expiresAt', 'DATA_CONTRACT_INVALID', 'Contract validity window is invalid or expired.'));
  return {
    valid: errors.length === 0,
    errors,
    inputSchemaHash: errors.some((item) => item.path === 'allowedInputSchema') ? undefined : schemaHash(contract.allowedInputSchema),
    outputSchemaHash: errors.some((item) => item.path === 'allowedOutputSchema') ? undefined : schemaHash(contract.allowedOutputSchema),
    validationDigest: errors.length ? undefined : secureDigest('inter-agent-contract', canonicalize({ ...contract, organizationId: String(contract.organizationId), workspaceId: String(contract.workspaceId) })),
  };
}

module.exports = {
  CONTRACT_INPUT_KEYS,
  normalizeContractInput,
  normalizeMapping,
  normalizeMinimizationRules,
  normalizeRules,
  normalizeSelector,
  validateContractDocument,
};
