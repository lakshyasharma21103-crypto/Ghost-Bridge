const net = require('node:net');
const Ajv = require('ajv');
const {
  isDevelopmentDemoRuntimeUrl,
  isDevelopmentExternalAgentUrl,
} = require('../utils/safeFetch');

const SUPPORTED_AUTH_TYPES = ['no_auth_dev', 'api_key', 'bearer_token', 'oauth2'];
const SUPPORTED_RUNTIME_TYPES = ['rest', 'mcp'];
const INSTALL_MODES = ['delegated_runtime_access', 'auth_required', 'metadata_only'];
const RISK_LEVELS = ['low', 'medium', 'high'];
const GOVERNANCE_CLASSIFICATIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNCLASSIFIED'];
const GOVERNANCE_CATEGORIES = [
  'SEARCH',
  'DOCUMENT',
  'DATABASE',
  'CRM',
  'EMAIL',
  'FILESYSTEM',
  'FINANCE',
  'PAYMENT',
  'ADMINISTRATION',
  'OTHER',
  'UNCLASSIFIED',
];
const GOVERNANCE_SIDE_EFFECTS = [
  'READ_ONLY',
  'LOCAL_CHANGE',
  'REMOTE_WRITE',
  'IRREVERSIBLE',
  'UNKNOWN',
];

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  validateSchema: true,
});

const jsonSchemaAjv = new Ajv({
  allErrors: true,
  strict: false,
  validateSchema: true,
});

const passportV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['protocol', 'agent', 'auth', 'runtime', 'install', 'capabilities'],
  properties: {
    protocol: { const: 'agent-passport.v1' },
    agent: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'provider', 'description', 'version'],
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 200 },
        name: { type: 'string', minLength: 1, maxLength: 200 },
        provider: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', minLength: 1, maxLength: 2000 },
        version: { type: 'string', minLength: 1, maxLength: 100 },
        iconUrl: { type: 'string', minLength: 1, maxLength: 2048 },
      },
    },
    auth: {
      type: 'object',
      additionalProperties: false,
      required: ['type'],
      properties: {
        type: { enum: SUPPORTED_AUTH_TYPES },
        scopes: {
          type: 'array',
          uniqueItems: true,
          items: { type: 'string', minLength: 1, maxLength: 200 },
        },
        authorizationUrl: { type: 'string', minLength: 1, maxLength: 2048 },
        tokenUrl: { type: 'string', minLength: 1, maxLength: 2048 },
        header: { type: 'string', minLength: 1, maxLength: 200 },
        scheme: { type: 'string', minLength: 1, maxLength: 100 },
      },
    },
    runtime: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'endpoint', 'supportsStreaming', 'supportsLongRunningTasks'],
      properties: {
        type: { enum: SUPPORTED_RUNTIME_TYPES },
        endpoint: { type: 'string', minLength: 1, maxLength: 2048 },
        method: { enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        inputField: { type: 'string', minLength: 1, maxLength: 200 },
        outputField: { type: 'string', minLength: 1, maxLength: 200 },
        supportsStreaming: { type: 'boolean' },
        supportsLongRunningTasks: { type: 'boolean' },
      },
      allOf: [
        {
          if: {
            properties: { type: { const: 'rest' } },
            required: ['type'],
          },
          then: {
            required: ['method', 'inputField', 'outputField'],
          },
        },
      ],
    },
    install: {
      type: 'object',
      additionalProperties: false,
      required: ['supportedModes', 'requiresUserConsent'],
      properties: {
        supportedModes: {
          type: 'array',
          minItems: 1,
          uniqueItems: true,
          items: { enum: INSTALL_MODES },
        },
        exchangeUrl: { type: 'string', minLength: 1, maxLength: 2048 },
        requiresUserConsent: { type: 'boolean' },
      },
    },
    capabilities: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'description', 'inputSchema', 'outputSchema'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', minLength: 1, maxLength: 2000 },
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          riskLevel: { enum: RISK_LEVELS },
          classification: { enum: GOVERNANCE_CLASSIFICATIONS },
          category: { enum: GOVERNANCE_CATEGORIES },
          sideEffect: { enum: GOVERNANCE_SIDE_EFFECTS },
          requiredPermission: { type: 'string', minLength: 1, maxLength: 200 },
          retrySafety: { enum: ['SAFE', 'UNSAFE', 'UNKNOWN'] },
          cancellationSupport: { enum: ['SUPPORTED', 'UNSUPPORTED', 'UNKNOWN'] },
          idempotencySupport: { enum: ['SUPPORTED', 'UNSUPPORTED', 'UNKNOWN'] },
          runtimeToolName: { type: 'string', minLength: 1, maxLength: 200 },
          enabled: { type: 'boolean' },
        },
      },
    },
    health: {
      type: 'object',
      additionalProperties: false,
      properties: {
        endpoint: { type: 'string', minLength: 1, maxLength: 2048 },
        lastStatus: { type: 'string', minLength: 1, maxLength: 100 },
        lastCheckedAt: { type: 'string', minLength: 1, maxLength: 100 },
      },
    },
  },
};

const validateShape = ajv.compile(passportV1Schema);

function makeIssue(path, code, message) {
  return { path, code, message };
}

function ajvPath(error) {
  let path = error.instancePath || '';
  if (error.keyword === 'required' && error.params?.missingProperty) {
    path = `${path}/${error.params.missingProperty}`;
  }
  if (error.keyword === 'additionalProperties' && error.params?.additionalProperty) {
    path = `${path}/${error.params.additionalProperty}`;
  }
  return path || '/';
}

function ajvCode(error) {
  const path = ajvPath(error);
  if (path === '/protocol' && error.keyword === 'const') return 'UNSUPPORTED_PROTOCOL';
  if (path === '/auth/type' && error.keyword === 'enum') return 'UNSUPPORTED_AUTH_TYPE';
  if (path === '/runtime/type' && error.keyword === 'enum') return 'UNSUPPORTED_RUNTIME_TYPE';
  if (error.keyword === 'required') return 'REQUIRED_FIELD_MISSING';
  if (error.keyword === 'additionalProperties') return 'UNSUPPORTED_FIELD';
  if (error.keyword === 'enum') return 'UNSUPPORTED_VALUE';
  if (error.keyword === 'minLength') return 'EMPTY_FIELD';
  return 'INVALID_FIELD';
}

function ajvMessage(error) {
  const path = ajvPath(error);
  if (path === '/protocol' && error.keyword === 'const') {
    return 'protocol must be "agent-passport.v1".';
  }
  if (path === '/auth/type' && error.keyword === 'enum') {
    return `auth.type must be one of: ${SUPPORTED_AUTH_TYPES.join(', ')}.`;
  }
  if (path === '/runtime/type' && error.keyword === 'enum') {
    return `runtime.type must be one of: ${SUPPORTED_RUNTIME_TYPES.join(', ')}.`;
  }
  if (error.keyword === 'required') {
    return `${path} is required.`;
  }
  if (error.keyword === 'additionalProperties') {
    return `${path} is not supported in Agent Passport v1.`;
  }
  return `${path} ${error.message || 'is invalid'}.`;
}

function shapeIssues() {
  return (validateShape.errors || []).map((error) =>
    makeIssue(ajvPath(error), ajvCode(error), ajvMessage(error)),
  );
}

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isPlainSchemaObject(value) {
  return isRecord(value);
}

function validateJsonSchemaObject(schema, path) {
  if (!isPlainSchemaObject(schema)) {
    return [makeIssue(path, 'INVALID_JSON_SCHEMA', `${path} must be a JSON Schema object.`)];
  }

  const valid = jsonSchemaAjv.validateSchema(schema);
  if (valid) return [];

  return [makeIssue(path, 'INVALID_JSON_SCHEMA', `${path} must be a valid JSON Schema object.`)];
}

function duplicatedCapabilityNameIssues(passport) {
  if (!Array.isArray(passport?.capabilities)) return [];

  const seen = new Map();
  const issues = [];
  passport.capabilities.forEach((capability, index) => {
    if (!isRecord(capability) || typeof capability.name !== 'string') return;
    const normalized = capability.name.trim().toLowerCase();
    if (!normalized) return;
    if (seen.has(normalized)) {
      issues.push(
        makeIssue(
          `/capabilities/${index}/name`,
          'DUPLICATE_CAPABILITY_NAME',
          `Capability name "${capability.name}" duplicates /capabilities/${seen.get(normalized)}/name.`,
        ),
      );
      return;
    }
    seen.set(normalized, index);
  });
  return issues;
}

function schemaIssues(passport) {
  if (!Array.isArray(passport?.capabilities)) return [];
  return passport.capabilities.flatMap((capability, index) => [
    ...validateJsonSchemaObject(capability?.inputSchema, `/capabilities/${index}/inputSchema`),
    ...validateJsonSchemaObject(capability?.outputSchema, `/capabilities/${index}/outputSchema`),
  ]);
}

function isUnsafeHostname(hostname) {
  const host = hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === 'localhost.localdomain' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal'
  ) {
    return true;
  }

  if (!host.includes('.') && !net.isIP(host)) return true;

  const ipVersion = net.isIP(host);
  if (ipVersion === 4) {
    const parts = host.split('.').map(Number);
    const [a, b] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }

  if (ipVersion === 6) {
    return (
      host === '::' ||
      host === '::1' ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('fe80') ||
      host.startsWith('0:')
    );
  }

  return false;
}

function validateSafeUrl(value, path, options = {}) {
  if (typeof value !== 'string' || !value.trim()) return [];

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return [makeIssue(path, 'INVALID_URL', `${path} must be a valid URL.`)];
  }

  if (options.allowDevelopmentDemo && isDevelopmentDemoRuntimeUrl(parsed)) {
    return [];
  }
  if (options.allowDevelopmentExternalAgent && isDevelopmentExternalAgentUrl(parsed)) {
    return [];
  }

  if (parsed.protocol !== 'https:') {
    return [makeIssue(path, 'UNSAFE_URL', `${path} must use HTTPS.`)];
  }

  if (parsed.username || parsed.password) {
    return [makeIssue(path, 'UNSAFE_URL', `${path} must not include embedded credentials.`)];
  }

  if (!parsed.hostname || isUnsafeHostname(parsed.hostname)) {
    return [makeIssue(path, 'UNSAFE_URL', `${path} must use a public, non-local hostname.`)];
  }

  if (options.noQuery && parsed.search) {
    return [makeIssue(path, 'UNSAFE_URL', `${path} must not include query parameters.`)];
  }

  return [];
}

function urlIssues(passport) {
  const checks = [
    [passport?.agent?.iconUrl, '/agent/iconUrl'],
    [passport?.auth?.authorizationUrl, '/auth/authorizationUrl'],
    [passport?.auth?.tokenUrl, '/auth/tokenUrl', { noQuery: true }],
    [
      passport?.runtime?.endpoint,
      '/runtime/endpoint',
      {
        noQuery: true,
        allowDevelopmentDemo: true,
        allowDevelopmentExternalAgent: true,
      },
    ],
    [passport?.install?.exchangeUrl, '/install/exchangeUrl', { noQuery: true }],
    [passport?.health?.endpoint, '/health/endpoint', { noQuery: true }],
  ];

  return checks.flatMap(([value, path, options]) => validateSafeUrl(value, path, options || {}));
}

const SECRET_KEY_NAMES = new Set([
  'apikey',
  'secret',
  'password',
  'credential',
  'credentials',
  'token',
  'accesstoken',
  'refreshtoken',
  'bearertoken',
  'clientsecret',
  'privatekey',
  'runtimegrant',
  'granttoken',
  'delegatedtoken',
]);

const SECRET_VALUE_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/i,
  /\bsk-[A-Za-z0-9_-]{16,}/,
  /\bghp_[A-Za-z0-9_]{16,}/,
  /\bxox[baprs]-[A-Za-z0-9-]{16,}/i,
];

function normalizeKey(key) {
  return String(key)
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function secretIssues(value, path = '') {
  if (value == null) return [];

  if (typeof value === 'string') {
    if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
      return [
        makeIssue(
          path || '/',
          'SECRET_NOT_ALLOWED',
          `${path || '/'} appears to contain a secret value. Agent Passport JSON must contain metadata only.`,
        ),
      ];
    }
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => secretIssues(item, `${path}/${index}`));
  }

  if (!isRecord(value)) return [];

  return Object.entries(value).flatMap(([key, item]) => {
    const nextPath = `${path}/${key}`;
    if (SECRET_KEY_NAMES.has(normalizeKey(key))) {
      return [
        makeIssue(
          nextPath,
          'SECRET_NOT_ALLOWED',
          `${nextPath} is not allowed. Agent Passport JSON must not include credentials, tokens, API keys, or grants.`,
        ),
      ];
    }
    return secretIssues(item, nextPath);
  });
}

function normalizePassport(passport) {
  return {
    ...passport,
    auth: {
      ...passport.auth,
      scopes: passport.auth?.scopes || [],
    },
    capabilities: (passport.capabilities || []).map((capability) => ({
      ...capability,
      riskLevel: capability.riskLevel || 'medium',
      enabled: capability.enabled !== false,
      runtimeToolName: capability.runtimeToolName || capability.name,
    })),
  };
}

function validateAgentPassportV1(passport) {
  const issues = [];

  if (!validateShape(passport)) {
    issues.push(...shapeIssues());
  }

  issues.push(...duplicatedCapabilityNameIssues(passport));
  issues.push(...schemaIssues(passport));
  issues.push(...urlIssues(passport));
  issues.push(...secretIssues(passport));

  return {
    valid: issues.length === 0,
    errors: issues,
    passport: issues.length === 0 ? normalizePassport(passport) : null,
  };
}

module.exports = {
  validateAgentPassportV1,
  validateSafeUrl,
  passportV1Schema,
};
