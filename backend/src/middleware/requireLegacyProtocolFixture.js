'use strict';

const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');

const LEGACY_PROTOCOL_FIXTURE_HEADER = 'X-GhostBridge-Legacy-Protocol-Fixture';

function requireLegacyProtocolFixture(request, _response, next) {
  if (
    env.NODE_ENV === 'development' &&
    env.ALLOW_LEGACY_PROTOCOL_FIXTURES === true &&
    request.get(LEGACY_PROTOCOL_FIXTURE_HEADER) === '1'
  ) {
    next();
    return;
  }
  next(
    new AppError(
      409,
      'PLATFORM_NATIVE_CLIENT_REQUIRED',
      'This legacy protocol path is fixture-only; use the Platform Native Client API.',
    ),
  );
}

module.exports = {
  LEGACY_PROTOCOL_FIXTURE_HEADER,
  requireLegacyProtocolFixture,
};
