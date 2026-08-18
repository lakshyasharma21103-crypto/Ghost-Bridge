export class FoundationValidationError extends Error {
  constructor(message, options = undefined) {
    super(message, options);
    this.name = "FoundationValidationError";
  }
}

export class ReleaseDataValidationError extends FoundationValidationError {
  constructor(code, message, options = undefined) {
    super(`${code}: ${message}`, options);
    this.name = "ReleaseDataValidationError";
    this.code = code;
  }
}

export function fail(message, options = undefined) {
  throw new FoundationValidationError(message, options);
}

export function releaseDataFail(code, message, options = undefined) {
  throw new ReleaseDataValidationError(code, message, options);
}

export function diagnosticCode(error) {
  return error instanceof ReleaseDataValidationError ? error.code : undefined;
}

export function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
