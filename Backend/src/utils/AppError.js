class AppError extends Error {
  constructor(statusCode, code, message, details = [], metadata = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.assign(this, metadata);
  }
}

module.exports = {
  AppError,
};
