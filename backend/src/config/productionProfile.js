const { ENVIRONMENT_CATEGORIES } = require('../constants/releaseReadiness');

const PRODUCTION_CONFIGURATION_PROFILE = Object.freeze({
  profileVersion: '13E5.1',
  requiredEnvironmentVariableNames: Object.freeze([
    'NODE_ENV',
    'PORT',
    'CLIENT_URL',
    'MONGODB_URI',
    'MONGODB_DB_NAME',
    'JWT_SECRET',
    'CREDENTIAL_ENCRYPTION_KEY',
    'CREDENTIAL_ENCRYPTION_KEY_VERSION',
    'EXTERNAL_TEST_AGENT_BASE_URL',
    'EXTERNAL_TEST_AGENT_RUNTIME_TOKEN',
    'SERVICE_REGION_ID',
    'WRITE_AUTHORITY_MODE',
    'TRUST_PROXY',
  ]),
  optionalEnvironmentVariableNames: Object.freeze([
    'CACHE_ADAPTER',
    'LOG_LEVEL',
    'SOURCE_MAP_POLICY',
    'LOG_REDACTION_ENABLED',
  ]),
  forbiddenProductionVariableNames: Object.freeze([
    'ALLOW_PRIVATE_RUNTIME_URLS_IN_DEV',
    'ENABLE_TEST_FAULT_INJECTION',
    'ENABLE_PRODUCTION_LOAD_TARGET',
    'GHOST_BRIDGE_DEBUG',
  ]),
  allowedCacheAdapters: Object.freeze(['memory', 'noop', 'distributed']),
  allowedBackupAdapters: Object.freeze(['noop', 'filesystem_simulation', 'provider_boundary']),
  allowedDeploymentModes: Object.freeze(['manual', 'noop']),
  allowedTestModes: Object.freeze(['disabled']),
  allowedRuntimeUrlSchemes: Object.freeze(['https:']),
  loggingLevels: Object.freeze(['info', 'warn', 'error', 'fatal']),
  startupFailureBehavior: 'fail_closed',
  sourceMapExposurePolicy: 'disabled',
  productionDeploymentEnabledByDefault: false,
});

class ConfigurationValidationError extends Error {
  constructor(issues) {
    super('Startup configuration validation failed.');
    this.name = 'ConfigurationValidationError';
    this.code = issues[0]?.code || 'CONFIGURATION_INVALID';
    this.issues = issues.map((issue) => ({
      code: issue.code,
      variableName: issue.variableName,
      category: issue.category,
    }));
  }
}

function issue(code, variableName, category = 'unsafe') {
  return { code, variableName, category };
}

function booleanValue(source, name, fallback = false) {
  const raw = source[name];
  if (raw == null || raw === '') return fallback;
  return String(raw).trim().toLowerCase() === 'true';
}

function positiveInteger(source, name) {
  const value = Number(source[name]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function privateHostname(hostname) {
  const value = String(hostname || '').toLowerCase();
  return (
    value === 'localhost' ||
    value === '::1' ||
    /^127\./.test(value) ||
    /^10\./.test(value) ||
    /^192\.168\./.test(value) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(value)
  );
}

function validUrl(raw, production) {
  try {
    const parsed = new URL(raw);
    if (production && parsed.protocol !== 'https:') return false;
    if (production && privateHostname(parsed.hostname)) return false;
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function secretStrong(value) {
  const text = String(value || '');
  if (/^<[^>]+>$/.test(text) || /replace[-_ ]with/i.test(text)) return false;
  if (text.length < 32) return false;
  return new Set(text).size >= 12;
}

function encryptionKeyValid(value) {
  const text = String(value || '').trim();
  if (/^[a-f0-9]{64}$/i.test(text)) return true;
  if (!/^[A-Za-z0-9+/_=-]+$/.test(text)) return false;
  try {
    return Buffer.from(text, 'base64').length === 32;
  } catch {
    return false;
  }
}

function validateStartupConfiguration(source = {}, options = {}) {
  const environment = String(source.NODE_ENV || options.defaultEnvironment || 'development');
  const production = environment === 'production';
  const issues = [];
  if (!ENVIRONMENT_CATEGORIES.includes(environment)) {
    issues.push(issue('CONFIG_ENVIRONMENT_INVALID', 'NODE_ENV', 'malformed'));
  }
  if (source.PORT != null && positiveInteger(source, 'PORT') == null) {
    issues.push(issue('CONFIG_PORT_INVALID', 'PORT', 'malformed'));
  }

  if (production) {
    for (const variableName of PRODUCTION_CONFIGURATION_PROFILE.requiredEnvironmentVariableNames) {
      if (source[variableName] == null || String(source[variableName]).trim() === '') {
        issues.push(issue('CONFIG_REQUIRED_VALUE_MISSING', variableName, 'missing'));
      }
    }
    if (source.JWT_SECRET && !secretStrong(source.JWT_SECRET)) {
      issues.push(issue('CONFIG_SECRET_TOO_WEAK', 'JWT_SECRET'));
    }
    if (source.CREDENTIAL_ENCRYPTION_KEY && !encryptionKeyValid(source.CREDENTIAL_ENCRYPTION_KEY)) {
      issues.push(issue('CONFIG_SECRET_FORMAT_INVALID', 'CREDENTIAL_ENCRYPTION_KEY', 'malformed'));
    }
    if (
      source.EXTERNAL_TEST_AGENT_RUNTIME_TOKEN &&
      !secretStrong(source.EXTERNAL_TEST_AGENT_RUNTIME_TOKEN)
    ) {
      issues.push(issue('CONFIG_SECRET_TOO_WEAK', 'EXTERNAL_TEST_AGENT_RUNTIME_TOKEN'));
    }
    for (const variableName of ['CLIENT_URL', 'EXTERNAL_TEST_AGENT_BASE_URL']) {
      if (source[variableName] && !validUrl(source[variableName], true)) {
        issues.push(issue('CONFIG_RUNTIME_URL_UNSAFE', variableName));
      }
    }
    if (!booleanValue(source, 'COOKIE_SECURE')) {
      issues.push(issue('CONFIG_PRODUCTION_COOKIE_INSECURE', 'COOKIE_SECURE'));
    }
    if (
      String(source.CORS_ORIGINS || source.CLIENT_URL || '').split(',').some((value) =>
        ['*', 'null'].includes(value.trim()),
      )
    ) {
      issues.push(issue('CONFIG_PRODUCTION_CORS_UNSAFE', 'CORS_ORIGINS'));
    }
    if (!/^(1|loopback|linklocal|uniquelocal)$/.test(String(source.TRUST_PROXY || ''))) {
      issues.push(issue('CONFIG_TRUSTED_PROXY_INVALID', 'TRUST_PROXY'));
    }
    if (String(source.WRITE_AUTHORITY_MODE || '') !== 'fenced_single_authority') {
      issues.push(issue('CONFIG_WRITE_AUTHORITY_INVALID', 'WRITE_AUTHORITY_MODE'));
    }
    if (booleanValue(source, 'GHOST_BRIDGE_DEBUG')) {
      issues.push(issue('CONFIG_PRODUCTION_DEBUG_ENABLED', 'GHOST_BRIDGE_DEBUG'));
    }
    if (booleanValue(source, 'ENABLE_TEST_FAULT_INJECTION')) {
      issues.push(
        issue('CONFIG_PRODUCTION_FAULT_INJECTION_ENABLED', 'ENABLE_TEST_FAULT_INJECTION'),
      );
    }
    if (booleanValue(source, 'ENABLE_PRODUCTION_LOAD_TARGET')) {
      issues.push(
        issue('CONFIG_PRODUCTION_LOAD_TARGET_ENABLED', 'ENABLE_PRODUCTION_LOAD_TARGET'),
      );
    }
    if (String(source.SOURCE_MAP_POLICY || 'disabled') !== 'disabled') {
      issues.push(issue('CONFIG_PRODUCTION_DEBUG_ENABLED', 'SOURCE_MAP_POLICY'));
    }
    if (!booleanValue(source, 'LOG_REDACTION_ENABLED')) {
      issues.push(issue('CONFIG_LOG_REDACTION_REQUIRED', 'LOG_REDACTION_ENABLED'));
    }
  }

  const timeout = positiveInteger(source, 'RUNTIME_INVOCATION_TIMEOUT_MS');
  const executionLease = positiveInteger(source, 'RUNTIME_EXECUTION_LEASE_MS');
  const durableLease = positiveInteger(source, 'DURABLE_WORK_LEASE_MS');
  if (timeout && executionLease && executionLease <= timeout) {
    issues.push(issue('CONFIG_TIMEOUT_HIERARCHY_INVALID', 'RUNTIME_EXECUTION_LEASE_MS'));
  }
  if (timeout && durableLease && durableLease <= timeout) {
    issues.push(issue('CONFIG_LEASE_HIERARCHY_INVALID', 'DURABLE_WORK_LEASE_MS'));
  }
  const heartbeat = positiveInteger(source, 'DURABLE_WORK_HEARTBEAT_MS');
  if (heartbeat && durableLease && heartbeat * 3 > durableLease) {
    issues.push(issue('CONFIG_LEASE_HIERARCHY_INVALID', 'DURABLE_WORK_HEARTBEAT_MS'));
  }
  const cacheAdapter = String(source.CACHE_ADAPTER || 'memory');
  if (!PRODUCTION_CONFIGURATION_PROFILE.allowedCacheAdapters.includes(cacheAdapter)) {
    issues.push(issue('CONFIG_CACHE_ADAPTER_UNSUPPORTED', 'CACHE_ADAPTER'));
  }
  if (production && !String(source.SERVICE_REGION_ID || '').trim()) {
    issues.push(issue('CONFIG_REGION_ID_MISSING', 'SERVICE_REGION_ID', 'missing'));
  }
  return Object.freeze({
    valid: issues.length === 0,
    environmentCategory: environment,
    profileVersion: PRODUCTION_CONFIGURATION_PROFILE.profileVersion,
    issues: Object.freeze(issues),
  });
}

function assertStartupConfiguration(source = {}, options = {}) {
  const result = validateStartupConfiguration(source, options);
  if (!result.valid) throw new ConfigurationValidationError(result.issues);
  return result;
}

module.exports = {
  ConfigurationValidationError,
  PRODUCTION_CONFIGURATION_PROFILE,
  assertStartupConfiguration,
  encryptionKeyValid,
  secretStrong,
  validateStartupConfiguration,
};
