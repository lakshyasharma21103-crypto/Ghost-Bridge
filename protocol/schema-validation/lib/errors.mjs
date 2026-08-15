export class FoundationValidationError extends Error {
  constructor(message, options = undefined) {
    super(message, options);
    this.name = "FoundationValidationError";
  }
}

export function fail(message, options = undefined) {
  throw new FoundationValidationError(message, options);
}

export function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
