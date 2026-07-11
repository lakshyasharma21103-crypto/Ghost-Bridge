class RuntimeError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = 'RuntimeError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = Array.isArray(details) ? details : [];
  }
}

function authenticationError() {
  return new RuntimeError(401, 'RUNTIME_AUTHENTICATION_FAILED', 'Runtime authentication failed.');
}

module.exports = {
  RuntimeError,
  authenticationError,
};
