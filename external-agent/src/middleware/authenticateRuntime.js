const crypto = require('node:crypto');
const { authenticationError } = require('../utils/errors');

function tokenDigest(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest();
}

function tokenMatches(candidate, expectedDigest) {
  const candidateDigest = tokenDigest(candidate);
  return crypto.timingSafeEqual(candidateDigest, expectedDigest);
}

function authenticateRuntime(runtimeToken) {
  const expectedDigest = tokenDigest(runtimeToken);

  return function runtimeAuthentication(request, _response, next) {
    const authorization = request.header('Authorization');
    const match =
      typeof authorization === 'string' ? authorization.match(/^Bearer ([^\s]+)$/i) : null;

    if (!match || !tokenMatches(match[1], expectedDigest)) {
      next(authenticationError());
      return;
    }

    next();
  };
}

module.exports = {
  authenticateRuntime,
  tokenMatches,
};
