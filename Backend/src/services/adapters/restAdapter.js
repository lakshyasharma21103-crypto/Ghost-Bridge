const { env } = require('../../config/env');
const { AppError } = require('../../utils/AppError');
const { ErrorCodes } = require('../../utils/errorCodes');
const safeFetchUtility = require('../../utils/safeFetch');

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function requestPayload(runtime, input) {
  if (!runtime.inputField) return input;

  if (isRecord(input)) {
    const keys = Object.keys(input);
    if (keys.length === 1) {
      return { [runtime.inputField]: input[keys[0]] };
    }
    return input;
  }

  return { [runtime.inputField]: input };
}

function parseResponseBody(bodyText) {
  if (!bodyText) return null;
  try {
    return JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
}

function extractOutput(runtime, parsedBody) {
  if (!runtime.outputField) return parsedBody;
  if (
    !isRecord(parsedBody) ||
    !Object.prototype.hasOwnProperty.call(parsedBody, runtime.outputField)
  ) {
    throw new AppError(
      502,
      ErrorCodes.RUNTIME_OUTPUT_MISSING,
      'Agent runtime response did not include the configured output field.',
      [
        {
          path: 'runtime.outputField',
          message: `Remote response did not include "${runtime.outputField}".`,
        },
      ],
    );
  }
  return parsedBody[runtime.outputField];
}

function outboundOptions(runtime, input, credentialHeaders) {
  const method = String(runtime.method || 'POST').toUpperCase();
  const payload = requestPayload(runtime, input);
  const headers = {
    Accept: 'application/json, text/plain;q=0.9',
    ...credentialHeaders,
  };

  if (!BODY_METHODS.has(method)) {
    if (payload != null && (!isRecord(payload) || Object.keys(payload).length > 0)) {
      throw new AppError(
        500,
        ErrorCodes.RUNTIME_CONFIGURATION_INVALID,
        'REST runtime method cannot carry a capability input body.',
        [
          {
            path: 'runtime.method',
            message: `${method} cannot be used with a runtime input body in v1.`,
          },
        ],
      );
    }
    return { method, headers };
  }

  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(payload),
  };
}

async function invokeRest({ runtime, input, credentialHeaders = {} }) {
  if (!runtime?.endpoint) {
    throw new AppError(
      500,
      ErrorCodes.RUNTIME_CONFIGURATION_INVALID,
      'REST runtime endpoint is not configured.',
    );
  }

  const response = await safeFetchUtility.safeFetch(runtime.endpoint, {
    ...outboundOptions(runtime, input, credentialHeaders),
    timeoutMs: env.RUNTIME_REQUEST_TIMEOUT_MS,
    allowDevelopmentDemo: true,
    allowDevelopmentExternalAgent: true,
  });

  if (!response.ok) {
    throw new AppError(
      502,
      ErrorCodes.RUNTIME_INVOCATION_FAILED,
      'Agent runtime returned an unsuccessful response.',
      [
        {
          path: 'runtime',
          message: `Agent runtime responded with HTTP ${response.status}.`,
          remoteStatus: response.status,
        },
      ],
    );
  }

  const parsedBody = parseResponseBody(response.bodyText);
  return {
    ok: true,
    status: response.status,
    output: extractOutput(runtime, parsedBody),
  };
}

const restAdapter = {
  name: 'rest',
  supported: true,
  description: 'Generic REST runtime adapter for Agent Passport Runtime Gateway.',
  invoke: invokeRest,
};

module.exports = {
  restAdapter,
  invokeRest,
  requestPayload,
  outboundOptions,
  extractOutput,
};
