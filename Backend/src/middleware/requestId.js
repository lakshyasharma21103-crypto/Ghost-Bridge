const crypto = require('node:crypto');

const SAFE_IDENTIFIER_PATTERN = /^(?:req_|trace_)?[A-Za-z0-9][A-Za-z0-9.-]{0,127}$/;
const FORBIDDEN_IDENTIFIER_PATTERN = /^(?:agentpass_(?:install|partner)_|Bearer\b)/i;

function safeIncomingIdentifier(value) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return candidate.length <= 128 &&
    SAFE_IDENTIFIER_PATTERN.test(candidate) &&
    !FORBIDDEN_IDENTIFIER_PATTERN.test(candidate)
    ? candidate
    : undefined;
}

function requestId(request, response, next) {
  request.traceId =
    safeIncomingIdentifier(request.header('X-Trace-Id')) || `trace_${crypto.randomUUID()}`;
  request.requestId =
    safeIncomingIdentifier(request.header('X-Request-Id')) || `req_${crypto.randomUUID()}`;
  response.setHeader('X-Trace-Id', request.traceId);
  response.setHeader('X-Request-Id', request.requestId);
  next();
}

module.exports = {
  requestId,
  EXTERNAL_REQUEST_ID_PATTERN: SAFE_IDENTIFIER_PATTERN,
  SAFE_IDENTIFIER_PATTERN,
  safeIncomingIdentifier,
};
