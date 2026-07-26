const SENSITIVE_KEY_PATTERN =
  /(^|[_-])(authorization|cookie|cookies|api[_-]?key|access[_-]?token|refresh[_-]?token|bearer[_-]?token|token|secret|password|credential|credentials|private[_-]?key|client[_-]?secret|install[_-]?key|raw[_-]?key|runtime[_-]?grant|encrypted[_-]?payload|ciphertext|set[_-]?cookie)([_-]|$)|mongodb_uri|uri/i;

const INSTALL_KEY_PATTERN = /agentpass_install_[A-Za-z0-9_-]{16,}/g;
const PARTNER_KEY_PATTERN = /agentpass_partner_[A-Za-z0-9_-]{16,}/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const COOKIE_PAIR_PATTERN = /([A-Za-z0-9_.-]+)=([^;,\s]+)/g;
const QUERY_SECRET_PATTERN =
  /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|runtime[_-]?token|partner[_-]?api[_-]?key|install[_-]?key|token|secret|password|credential|signature|sig|x-amz-signature|x-goog-signature|sas)=)([^&\s]+)/gi;
const PRIVATE_KEY_PATTERN =
  /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z0-9]+)? PRIVATE KEY-----/g;
const PROVIDER_KEY_PATTERN =
  /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{12,}|AKIA[A-Z0-9]{16})\b/g;
const SENSITIVE_NORMALIZED_KEYS = new Set([
  'authorization',
  'cookie',
  'cookies',
  'setcookie',
  'apikey',
  'token',
  'accesstoken',
  'refreshtoken',
  'runtimetoken',
  'partnerapikey',
  'installkey',
  'secret',
  'credential',
  'credentials',
  'encryptedpayload',
  'decryptedpayload',
  'password',
  'privatekey',
  'clientsecret',
  'bearertoken',
  'rawkey',
  'runtimegrant',
  'ciphertext',
]);

function isSensitiveKey(keyName) {
  const normalized = String(keyName || '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  return SENSITIVE_NORMALIZED_KEYS.has(normalized) || SENSITIVE_KEY_PATTERN.test(keyName);
}

function redactString(value) {
  const redacted = String(value)
    .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '[redacted-mongodb-uri]')
    .replace(INSTALL_KEY_PATTERN, '[redacted-install-key]')
    .replace(PARTNER_KEY_PATTERN, '[redacted-partner-api-key]')
    .replace(PRIVATE_KEY_PATTERN, '[redacted-private-key]')
    .replace(PROVIDER_KEY_PATTERN, '[redacted-provider-credential]')
    .replace(BEARER_PATTERN, 'Bearer [redacted]')
    .replace(QUERY_SECRET_PATTERN, '$1[redacted]');
  const trimmed = redacted.trim();
  if (trimmed.length <= 65_536 && (/^\{/.test(trimmed) || /^\[/.test(trimmed))) {
    try {
      return JSON.stringify(redactSecrets(JSON.parse(trimmed), 1));
    } catch {
      return redacted;
    }
  }
  return redacted;
}

function redactCookieString(value) {
  return String(value).replace(COOKIE_PAIR_PATTERN, '$1=[redacted]');
}

function redactSecrets(value, depth = 0, keyName = '') {
  if (depth > 8) return '[redacted-depth-limit]';
  if (value == null) return value;

  if (isSensitiveKey(keyName)) {
    if (/cookie/i.test(keyName) && typeof value === 'string') return redactCookieString(value);
    return '[redacted]';
  }

  if (typeof value === 'string') {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item, depth + 1));
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (value instanceof Error) {
    return redactSecrets(
      {
        name: value.name,
        code: value.code,
        internalCode: value.internalCode,
        statusCode: value.statusCode,
        operation: value.operation,
        stage: value.stage,
        retryable: value.retryable,
        durationMs: value.durationMs,
        timeoutReason: value.timeoutReason || value.reason,
        cause: value.cause ? { name: value.cause.name, code: value.cause.code } : undefined,
      },
      depth + 1,
    );
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, redactSecrets(item, depth + 1, key)]),
  );
}

module.exports = {
  redactSecrets,
  redactString,
  isSensitiveKey,
};
