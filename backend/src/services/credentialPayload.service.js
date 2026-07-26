const { CREDENTIAL_TYPES, SECRET_LIMITS } = require('../constants/secretGovernance');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');

const HEADER_NAME_PATTERN = /^[A-Za-z0-9-]{1,128}$/;
const AUTH_SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

function invalid(path, message) {
  throw new AppError(
    400,
    ErrorCodes.CREDENTIAL_VALIDATION_FAILED,
    'Credential validation failed.',
    [{ path, message }],
  );
}

function requiredString(value, path, maximum = SECRET_LIMITS.maximumPlaintextBytes) {
  if (typeof value !== 'string' || !value.trim()) invalid(path, `${path} is required.`);
  const result = value.trim();
  if (Buffer.byteLength(result, 'utf8') > maximum) invalid(path, `${path} is too large.`);
  return result;
}

function header(value, fallback) {
  const result = value ? requiredString(value, 'credential.header', 128) : fallback;
  if (!HEADER_NAME_PATTERN.test(result)) invalid('credential.header', 'Invalid header name.');
  return result;
}

function scheme(value, fallback) {
  const result = value ? requiredString(value, 'credential.scheme', 64) : fallback;
  if (result && !AUTH_SCHEME_PATTERN.test(result)) {
    invalid('credential.scheme', 'Invalid authentication scheme.');
  }
  return result;
}

function normalizeCredentialPayload(credentialType, input, defaults = {}) {
  if (!CREDENTIAL_TYPES.includes(credentialType)) invalid('credentialType', 'Unsupported type.');
  const credential =
    typeof input === 'string' ? { value: input } : input && typeof input === 'object' ? input : {};
  if (credentialType === 'api_key') {
    return {
      apiKey: requiredString(credential.apiKey || credential.value, 'credential.apiKey'),
      header: header(credential.header, defaults.header || 'X-API-Key'),
      scheme: scheme(credential.scheme, defaults.scheme),
    };
  }
  if (credentialType === 'bearer_token' || credentialType === 'delegated_runtime_access') {
    return {
      accessToken: requiredString(
        credential.accessToken || credential.token || credential.value,
        'credential.accessToken',
      ),
      header: header(credential.header, defaults.header || 'Authorization'),
      scheme: scheme(credential.scheme, defaults.scheme || 'Bearer'),
    };
  }
  if (credentialType === 'oauth2') {
    return {
      accessToken: requiredString(credential.accessToken, 'credential.accessToken'),
      ...(credential.refreshToken
        ? { refreshToken: requiredString(credential.refreshToken, 'credential.refreshToken') }
        : {}),
      header: header(credential.header, defaults.header || 'Authorization'),
      scheme: scheme(credential.scheme, defaults.scheme || 'Bearer'),
      ...(credential.tokenExpiresAt ? { tokenExpiresAt: String(credential.tokenExpiresAt) } : {}),
    };
  }
  if (credentialType === 'client_secret') {
    return {
      clientSecret: requiredString(
        credential.clientSecret || credential.value,
        'credential.clientSecret',
      ),
    };
  }
  if (credentialType === 'refresh_token') {
    return {
      refreshToken: requiredString(
        credential.refreshToken || credential.value,
        'credential.refreshToken',
      ),
    };
  }
  return {
    secret: requiredString(credential.secret || credential.value, 'credential.secret'),
  };
}

function serializeCredentialPayload(payload) {
  const buffer = Buffer.from(JSON.stringify(payload), 'utf8');
  if (!buffer.length || buffer.length > SECRET_LIMITS.maximumPlaintextBytes) {
    buffer.fill(0);
    invalid('credential', 'Credential payload is too large.');
  }
  return buffer;
}

function parseCredentialPayload(buffer) {
  try {
    const payload = JSON.parse(buffer.toString('utf8'));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error();
    return payload;
  } catch {
    throw new AppError(
      500,
      ErrorCodes.SECRET_DECRYPTION_FAILED,
      'Stored credential could not be prepared securely.',
      [],
      { recoveryRequired: true, reasonCode: 'CREDENTIAL_PAYLOAD_INVALID' },
    );
  }
}

function credentialHeaders(credentialType, payload, defaults = {}) {
  if (credentialType === 'api_key') {
    const name = header(payload.header, defaults.header || 'X-API-Key');
    const prefix = scheme(payload.scheme, defaults.scheme);
    const value = requiredString(payload.apiKey, 'credential.apiKey');
    return { [name]: prefix ? `${prefix} ${value}` : value };
  }
  if (['bearer_token', 'delegated_runtime_access', 'oauth2'].includes(credentialType)) {
    const name = header(payload.header, defaults.header || 'Authorization');
    const prefix = scheme(payload.scheme, defaults.scheme || 'Bearer');
    const value = requiredString(payload.accessToken, 'credential.accessToken');
    return { [name]: prefix ? `${prefix} ${value}` : value };
  }
  throw new AppError(
    409,
    ErrorCodes.CREDENTIAL_REQUIRED,
    'The stored credential type cannot be injected by this runtime adapter.',
  );
}

module.exports = {
  credentialHeaders,
  normalizeCredentialPayload,
  parseCredentialPayload,
  serializeCredentialPayload,
};
