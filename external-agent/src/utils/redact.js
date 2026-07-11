const SENSITIVE_KEY_PATTERN =
  /(^|[_-])(authorization|cookie|token|secret|password|credential|api[_-]?key|private[_-]?key)([_-]|$)|(?:runtime|access|refresh|bearer|api)Token$|apiKey$/i;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const QUERY_SECRET_PATTERN =
  /((?:api[_-]?key|access[_-]?token|token|secret|password|credential)=)([^&\s]+)/gi;

function redactString(value) {
  return String(value)
    .replace(BEARER_PATTERN, 'Bearer [redacted]')
    .replace(QUERY_SECRET_PATTERN, '$1[redacted]');
}

function redactSecrets(value, depth = 0, keyName = '') {
  if (depth > 8) return '[redacted-depth-limit]';
  if (value == null) return value;
  if (SENSITIVE_KEY_PATTERN.test(keyName)) return '[redacted]';
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item, depth + 1));
  if (typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, redactSecrets(item, depth + 1, key)]),
  );
}

module.exports = {
  redactSecrets,
  redactString,
};
