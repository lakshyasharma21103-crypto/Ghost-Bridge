const crypto = require('node:crypto');

const EXTERNAL_REQUEST_ID_PATTERN = /^(?:req_[A-Za-z0-9-]{8,64}|[A-Za-z0-9.-]{1,128})$/;

function requestId(request, response, next) {
  const incoming = request.header('X-Request-Id');
  const candidate = incoming && incoming.trim();
  request.requestId =
    candidate && EXTERNAL_REQUEST_ID_PATTERN.test(candidate)
      ? candidate
      : `req_${crypto.randomUUID()}`;
  response.setHeader('X-Request-Id', request.requestId);
  next();
}

module.exports = {
  requestId,
  EXTERNAL_REQUEST_ID_PATTERN,
};
