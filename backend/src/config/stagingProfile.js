const { encryptionKeyValid, secretStrong } = require('./productionProfile');

const STAGING_CONFIGURATION_PROFILE = Object.freeze({
  profileVersion: '14A.1',
  environmentCategories: Object.freeze(['staging', 'preproduction']),
  requiredVariableNames: Object.freeze([
    'NODE_ENV', 'CLIENT_URL', 'CORS_ORIGINS', 'MONGODB_URI', 'MONGODB_DB_NAME',
    'JWT_SECRET', 'CREDENTIAL_ENCRYPTION_KEY', 'EXTERNAL_TEST_AGENT_RUNTIME_TOKEN',
    'SERVICE_REGION_ID', 'RELEASE_CANDIDATE_ID', 'RELEASE_MANIFEST_VERSION', 'TRUST_PROXY',
  ]),
  outboundProviderDefault: 'disabled',
  loadGenerationDefault: 'disabled',
  detailedHealthAuthorizationRequired: true,
  logRedactionRequired: true,
});

function add(issues, code, variableName, category = 'unsafe') {
  issues.push({ code, variableName, category });
}

function truthy(source, name) {
  return String(source[name] || '').toLowerCase() === 'true';
}

function positive(source, name) {
  const value = Number(source[name]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function safeHttpsOrigins(value) {
  const origins = String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (!origins.length || origins.some((item) => ['*', 'null'].includes(item))) return false;
  return origins.every((item) => {
    try {
      return new URL(item).protocol === 'https:';
    } catch {
      return false;
    }
  });
}

function validateStagingConfiguration(source = {}, options = {}) {
  const issues = [];
  const environment = String(source.NODE_ENV || '');
  if (!STAGING_CONFIGURATION_PROFILE.environmentCategories.includes(environment)) {
    add(issues, 'STAGING_ENVIRONMENT_INVALID', 'NODE_ENV', 'malformed');
  }
  for (const name of STAGING_CONFIGURATION_PROFILE.requiredVariableNames) {
    if (!String(source[name] || '').trim()) add(issues, 'STAGING_REQUIRED_VALUE_MISSING', name, 'missing');
  }
  if (!safeHttpsOrigins(source.CORS_ORIGINS || source.CLIENT_URL)) {
    add(issues, 'STAGING_CORS_ORIGIN_UNSAFE', 'CORS_ORIGINS');
  }
  if (!truthy(source, 'COOKIE_SECURE')) add(issues, 'STAGING_SECURE_COOKIE_REQUIRED', 'COOKIE_SECURE');
  if (!/^(1|loopback|linklocal|uniquelocal)$/.test(String(source.TRUST_PROXY || ''))) {
    add(issues, 'STAGING_TRUST_PROXY_INVALID', 'TRUST_PROXY', 'malformed');
  }
  if (source.JWT_SECRET && !secretStrong(source.JWT_SECRET)) add(issues, 'STAGING_JWT_SECRET_INVALID', 'JWT_SECRET');
  if (source.CREDENTIAL_ENCRYPTION_KEY && !encryptionKeyValid(source.CREDENTIAL_ENCRYPTION_KEY)) {
    add(issues, 'STAGING_ENCRYPTION_KEY_INVALID', 'CREDENTIAL_ENCRYPTION_KEY', 'malformed');
  }
  if (source.EXTERNAL_TEST_AGENT_RUNTIME_TOKEN && !secretStrong(source.EXTERNAL_TEST_AGENT_RUNTIME_TOKEN)) {
    add(issues, 'STAGING_RUNTIME_TOKEN_INVALID', 'EXTERNAL_TEST_AGENT_RUNTIME_TOKEN');
  }
  if (
    /(?:^|[_-])prod(?:uction)?(?:$|[_-])/i.test(String(source.MONGODB_DB_NAME || '')) &&
    options.productionDatabaseApproval !== true
  ) add(issues, 'STAGING_PRODUCTION_DATABASE_FORBIDDEN', 'MONGODB_DB_NAME');
  if (truthy(source, 'ENABLE_TEST_FAULT_INJECTION')) add(issues, 'STAGING_FAULT_INJECTION_ENABLED', 'ENABLE_TEST_FAULT_INJECTION');
  if (truthy(source, 'ALLOW_PRIVATE_RUNTIME_URLS_IN_DEV')) add(issues, 'STAGING_ARBITRARY_RUNTIME_URLS_ENABLED', 'ALLOW_PRIVATE_RUNTIME_URLS_IN_DEV');
  if (truthy(source, 'ENABLE_PRODUCTION_LOAD_TARGET') || truthy(source, 'ENABLE_STAGING_LOAD_TARGET')) {
    add(issues, 'STAGING_LOAD_GENERATION_ENABLED', 'ENABLE_STAGING_LOAD_TARGET');
  }
  if (truthy(source, 'ALLOW_PRODUCTION_CUSTOMER_IMPORT')) add(issues, 'STAGING_CUSTOMER_IMPORT_ENABLED', 'ALLOW_PRODUCTION_CUSTOMER_IMPORT');
  if (!truthy(source, 'LOG_REDACTION_ENABLED')) add(issues, 'STAGING_LOG_REDACTION_REQUIRED', 'LOG_REDACTION_ENABLED');
  if (!truthy(source, 'DETAILED_HEALTH_AUTH_REQUIRED')) add(issues, 'STAGING_HEALTH_AUTH_REQUIRED', 'DETAILED_HEALTH_AUTH_REQUIRED');
  if (String(source.OUTBOUND_PROVIDER_MODE || 'disabled') !== 'disabled') {
    add(issues, 'STAGING_PROVIDER_ACCESS_NOT_GATED', 'OUTBOUND_PROVIDER_MODE');
  }
  const timeout = positive(source, 'RUNTIME_INVOCATION_TIMEOUT_MS');
  const executionLease = positive(source, 'RUNTIME_EXECUTION_LEASE_MS');
  const durableLease = positive(source, 'DURABLE_WORK_LEASE_MS');
  const heartbeat = positive(source, 'DURABLE_WORK_HEARTBEAT_MS');
  if (timeout && executionLease && executionLease <= timeout) add(issues, 'STAGING_TIMEOUT_HIERARCHY_INVALID', 'RUNTIME_EXECUTION_LEASE_MS');
  if (timeout && durableLease && durableLease <= timeout) add(issues, 'STAGING_LEASE_HIERARCHY_INVALID', 'DURABLE_WORK_LEASE_MS');
  if (heartbeat && durableLease && heartbeat * 3 > durableLease) add(issues, 'STAGING_LEASE_HIERARCHY_INVALID', 'DURABLE_WORK_HEARTBEAT_MS');
  if (!['memory', 'noop', 'distributed'].includes(String(source.CACHE_ADAPTER || 'memory'))) {
    add(issues, 'STAGING_CACHE_CONFIGURATION_INVALID', 'CACHE_ADAPTER');
  }
  return Object.freeze({
    valid: issues.length === 0,
    status: issues.length ? 'blocked' : 'passed',
    environmentCategory: environment,
    profileVersion: STAGING_CONFIGURATION_PROFILE.profileVersion,
    issues: Object.freeze(issues),
  });
}

module.exports = { STAGING_CONFIGURATION_PROFILE, validateStagingConfiguration };
