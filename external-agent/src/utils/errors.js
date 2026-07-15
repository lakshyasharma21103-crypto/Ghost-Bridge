class RuntimeError extends Error {
  constructor(statusCode, code, message, details = [], metadata = {}) {
    super(message);
    this.name = 'RuntimeError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = Array.isArray(details) ? details : [];
    Object.assign(this, metadata);
  }
}

function requestCancelledError() {
  return new RuntimeError(499, 'REQUEST_CANCELLED', 'Request was cancelled.', [], {
    reason: 'CLIENT_DISCONNECTED',
  });
}

function serviceShutdownError() {
  return new RuntimeError(
    503,
    'SERVICE_SHUTDOWN',
    'Research invocation was interrupted while the service was draining.',
    [],
    {
      retryAfterMs: 1_000,
      reason: 'SERVICE_SHUTDOWN',
      recoveryRequired: true,
      recoveryReason: 'SHUTDOWN_DURING_EXTERNAL_INVOCATION',
    },
  );
}

function authenticationError() {
  return new RuntimeError(401, 'RUNTIME_AUTHENTICATION_FAILED', 'Runtime authentication failed.');
}

module.exports = {
  RuntimeError,
  authenticationError,
  requestCancelledError,
  serviceShutdownError,
};
