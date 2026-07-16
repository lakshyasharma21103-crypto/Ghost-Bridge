const { ATTRIBUTE_REGISTRY_VERSION } = require('./policy');

const STRING_OPERATORS = [
  'EQUALS',
  'NOT_EQUALS',
  'IN',
  'NOT_IN',
  'EXISTS',
  'NOT_EXISTS',
  'STARTS_WITH',
  'ENDS_WITH',
  'CONTAINS',
];
const ENUM_OPERATORS = ['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'EXISTS', 'NOT_EXISTS'];
const ORDERED_OPERATORS = [
  ...ENUM_OPERATORS,
  'LESS_THAN',
  'LESS_THAN_OR_EQUAL',
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
];
const ARRAY_OPERATORS = [
  'EQUALS',
  'NOT_EQUALS',
  'IN',
  'NOT_IN',
  'EXISTS',
  'NOT_EXISTS',
  'CONTAINS',
];

function definition(id, valueType, description, allowedOperators, resolver, options = {}) {
  return Object.freeze({
    id,
    valueType,
    description,
    allowedOperators: Object.freeze(allowedOperators),
    resolver,
    sensitivity: options.sensitivity || 'INTERNAL',
    auditDisplaySafe: options.auditDisplaySafe === true,
    registryVersion: ATTRIBUTE_REGISTRY_VERSION,
  });
}

function value(path) {
  return (attributes) => path.split('.').reduce((current, key) => current?.[key], attributes);
}

const ATTRIBUTE_DEFINITIONS = Object.freeze([
  definition(
    'actor.id',
    'string',
    'Stable authenticated actor identifier.',
    STRING_OPERATORS,
    value('actor.id'),
  ),
  definition(
    'actor.type',
    'enum',
    'Authenticated actor type.',
    ENUM_OPERATORS,
    value('actor.type'),
    { auditDisplaySafe: true },
  ),
  definition(
    'actor.serviceAccount',
    'boolean',
    'Whether the actor is a service account.',
    ENUM_OPERATORS,
    value('actor.serviceAccount'),
    { auditDisplaySafe: true },
  ),
  definition(
    'actor.teamIds',
    'string_array',
    'Authoritative team identifiers.',
    ARRAY_OPERATORS,
    value('actor.teamIds'),
  ),
  definition(
    'actor.roleKeys',
    'string_array',
    'Resolved RBAC role keys.',
    ARRAY_OPERATORS,
    value('actor.roleKeys'),
    { auditDisplaySafe: true },
  ),
  definition(
    'organization.id',
    'string',
    'Resolved organization identifier.',
    ENUM_OPERATORS,
    value('organization.id'),
    { auditDisplaySafe: true },
  ),
  definition(
    'workspace.id',
    'string',
    'Resolved workspace identifier.',
    ENUM_OPERATORS,
    value('workspace.id'),
    { auditDisplaySafe: true },
  ),
  definition(
    'workspace.environment',
    'enum',
    'Authoritative workspace environment.',
    ENUM_OPERATORS,
    value('workspace.environment'),
    { auditDisplaySafe: true },
  ),
  definition(
    'workspace.productionApproved',
    'boolean',
    'Whether production use is approved.',
    ENUM_OPERATORS,
    value('workspace.productionApproved'),
    { auditDisplaySafe: true },
  ),
  definition(
    'resource.type',
    'string',
    'Canonical resource type.',
    STRING_OPERATORS,
    value('resource.type'),
    { auditDisplaySafe: true },
  ),
  definition(
    'resource.id',
    'string',
    'Stable resource identifier.',
    ENUM_OPERATORS,
    value('resource.id'),
  ),
  definition(
    'resource.ownerWorkspaceId',
    'string',
    'Authoritative owning workspace.',
    ENUM_OPERATORS,
    value('resource.ownerWorkspaceId'),
  ),
  definition(
    'request.timestamp',
    'date',
    'Server request timestamp.',
    ORDERED_OPERATORS,
    value('request.timestamp'),
  ),
  definition(
    'request.weekday',
    'enum',
    'Server-derived weekday in the selected timezone.',
    ENUM_OPERATORS,
    value('request.weekday'),
    { auditDisplaySafe: true },
  ),
  definition(
    'request.hour',
    'number',
    'Server-derived hour (0-23) in the selected timezone.',
    ORDERED_OPERATORS,
    value('request.hour'),
    { auditDisplaySafe: true },
  ),
  definition(
    'request.sourceIp',
    'string',
    'Server-observed source IP.',
    ENUM_OPERATORS,
    value('request.sourceIp'),
  ),
  definition(
    'environment.name',
    'enum',
    'Authoritative runtime environment.',
    ENUM_OPERATORS,
    value('environment.name'),
    { auditDisplaySafe: true },
  ),
  definition(
    'capability.id',
    'string',
    'Stable capability identifier.',
    ENUM_OPERATORS,
    value('capability.id'),
  ),
  definition(
    'capability.category',
    'enum',
    'Declared capability governance category.',
    ENUM_OPERATORS,
    value('capability.category'),
    { auditDisplaySafe: true },
  ),
  definition(
    'capability.classification',
    'enum',
    'Declared capability risk classification.',
    ENUM_OPERATORS,
    value('capability.classification'),
    { auditDisplaySafe: true },
  ),
  definition(
    'capability.sideEffect',
    'enum',
    'Declared capability side-effect class.',
    ENUM_OPERATORS,
    value('capability.sideEffect'),
    { auditDisplaySafe: true },
  ),
  definition(
    'connection.id',
    'string',
    'Stable connection identifier.',
    ENUM_OPERATORS,
    value('connection.id'),
  ),
  definition(
    'connection.status',
    'enum',
    'Authoritative connection status.',
    ENUM_OPERATORS,
    value('connection.status'),
    { auditDisplaySafe: true },
  ),
  definition(
    'passport.id',
    'string',
    'Stable Agent Passport identifier.',
    ENUM_OPERATORS,
    value('passport.id'),
  ),
  definition(
    'passport.version',
    'string',
    'Declared Agent Passport agent version.',
    STRING_OPERATORS,
    value('passport.version'),
    { auditDisplaySafe: true },
  ),
  definition(
    'secret.provider',
    'enum',
    'Governed credential provider identifier.',
    ENUM_OPERATORS,
    value('secret.provider'),
    { auditDisplaySafe: true },
  ),
  definition(
    'secret.credentialType',
    'enum',
    'Governed credential type.',
    ENUM_OPERATORS,
    value('secret.credentialType'),
    { auditDisplaySafe: true },
  ),
  definition(
    'secret.status',
    'enum',
    'Authoritative logical secret lifecycle state.',
    ENUM_OPERATORS,
    value('secret.status'),
    { auditDisplaySafe: true },
  ),
  definition(
    'secret.healthStatus',
    'enum',
    'Authoritative safe credential-health state.',
    ENUM_OPERATORS,
    value('secret.healthStatus'),
    { auditDisplaySafe: true },
  ),
  definition(
    'binding.purpose',
    'enum',
    'Credential binding purpose.',
    ENUM_OPERATORS,
    value('binding.purpose'),
    { auditDisplaySafe: true },
  ),
  definition(
    'binding.status',
    'enum',
    'Authoritative credential binding state.',
    ENUM_OPERATORS,
    value('binding.status'),
    { auditDisplaySafe: true },
  ),
]);

const byId = new Map(ATTRIBUTE_DEFINITIONS.map((item) => [item.id, item]));

function getAttributeDefinition(id) {
  return byId.get(id);
}

function listAttributeDefinitions() {
  return ATTRIBUTE_DEFINITIONS.map(({ resolver, ...item }) => ({
    ...item,
    resolver: 'trusted_backend',
  }));
}

function getAttributeRegistry() {
  return {
    id: `policy-attribute-registry.v${ATTRIBUTE_REGISTRY_VERSION}`,
    version: ATTRIBUTE_REGISTRY_VERSION,
    attributes: listAttributeDefinitions(),
  };
}

module.exports = {
  getAttributeDefinition,
  getAttributeRegistry,
  listAttributeDefinitions,
};
