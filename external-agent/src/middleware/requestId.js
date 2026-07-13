const crypto = require('node:crypto');

const REQUEST_ID_PATTERN = /^(?:req_|trace_)?[A-Za-z0-9][A-Za-z0-9.-]{0,127}$/;
const FORBIDDEN_IDENTIFIER_PATTERN = /^(?:agentpass_(?:install|partner)_|Bearer\b)/i;

function safeIncomingIdentifier(value) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return candidate.length <= 128 &&
    REQUEST_ID_PATTERN.test(candidate) &&
    !FORBIDDEN_IDENTIFIER_PATTERN.test(candidate)
    ? candidate
    : undefined;
}

function requestId(request, response, next) {
  request.traceId =
    safeIncomingIdentifier(request.header('X-Trace-Id')) || `trace_${crypto.randomUUID()}`;
  request.requestId =
    safeIncomingIdentifier(request.header('X-Request-Id')) || `req_${crypto.randomUUID()}`;
  request.invocationId = safeIncomingIdentifier(request.header('X-Invocation-Id'));
  response.setHeader('X-Trace-Id', request.traceId);
  response.setHeader('X-Request-Id', request.requestId);
  next();
}

module.exports = {
  REQUEST_ID_PATTERN,
  requestId,
  safeIncomingIdentifier,
};
