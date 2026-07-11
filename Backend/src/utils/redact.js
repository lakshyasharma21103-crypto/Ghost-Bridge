const SENSITIVE_KEY_PATTERN =
  /(^|[_-])(authorization|cookie|cookies|api[_-]?key|access[_-]?token|refresh[_-]?token|bearer[_-]?token|token|secret|password|credential|credentials|private[_-]?key|client[_-]?secret|install[_-]?key|raw[_-]?key|runtime[_-]?grant|encrypted[_-]?payload|ciphertext|set[_-]?cookie)([_-]|$)|mongodb_uri|uri/i;

const INSTALL_KEY_PATTERN = /agentpass_install_[A-Za-z0-9_-]{16,}/g;
const PARTNER_KEY_PATTERN = /agentpass_partner_[A-Za-z0-9_-]{16,}/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const COOKIE_PAIR_PATTERN = /([A-Za-z0-9_.-]+)=([^;,\s]+)/g;
const QUERY_SECRET_PATTERN =
  /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|password|credential)=)([^&\s]+)/gi;

function redactString(value) {
  return value
    .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '[redacted-mongodb-uri]')
    .replace(INSTALL_KEY_PATTERN, '[redacted-install-key]')
    .replace(PARTNER_KEY_PATTERN, '[redacted-partner-api-key]')
    .replace(BEARER_PATTERN, 'Bearer [redacted]')
    .replace(QUERY_SECRET_PATTERN, '$1[redacted]');
}

function redactCookieString(value) {
  return String(value).replace(COOKIE_PAIR_PATTERN, '$1=[redacted]');
}

function redactSecrets(value, depth = 0, keyName = '') {
  if (depth > 8) return '[redacted-depth-limit]';
  if (value == null) return value;

  if (SENSITIVE_KEY_PATTERN.test(keyName)) {
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

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, redactSecrets(item, depth + 1, key)]),
  );
}

module.exports = {
  redactSecrets,
  redactString,
};
