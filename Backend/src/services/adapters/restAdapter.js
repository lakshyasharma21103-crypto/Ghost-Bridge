const { env } = require('../../config/env');
const { AppError } = require('../../utils/AppError');
const { ErrorCodes } = require('../../utils/errorCodes');
const safeFetchUtility = require('../../utils/safeFetch');

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);
const SAFE_REMOTE_CODE = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_REMOTE_STAGES = new Set([
  'grounded_research',
  'grounding_source_extraction',
  'structured_formatting',
  'response_validation',
]);
const SAFE_REMOTE_OPERATIONS = new Set(['grounded_research', 'structured_formatting']);
const SAFE_TIMEOUT_REASONS = new Set([
  'LOCAL_PROVIDER_DEADLINE_EXCEEDED',
  'GEMINI_DEADLINE_EXCEEDED',
]);
const SAFE_RECOVERY_REASONS = new Set([
  'FORMATTING_FAILED_AFTER_GROUNDED_RESEARCH',
  'AMBIGUOUS_REMOTE_OUTCOME',
  'SHUTDOWN_DURING_EXTERNAL_INVOCATION',
]);

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

function safeRetryAfterMs(value, now = Date.now()) {
  if (typeof value !== 'string' || value.length > 128) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(3_600_000, Math.round(seconds * 1_000));
  }
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return undefined;
  return Math.min(3_600_000, Math.max(0, date - now));
}

function safeConfiguredTimeoutMs(value) {
  return Number.isInteger(value) && value >= 1_000 && value <= 600_000 ? value : undefined;
}

function safeRemoteError(parsedBody) {
  const remote = isRecord(parsedBody?.error) ? parsedBody.error : undefined;
  if (!remote) return {};
  const code =
    typeof remote.code === 'string' && SAFE_REMOTE_CODE.test(remote.code) ? remote.code : undefined;
  const timeoutReason =
    code === 'GEMINI_REQUEST_TIMEOUT' &&
    SAFE_TIMEOUT_REASONS.has(remote.timeoutReason || remote.reason)
      ? remote.timeoutReason || remote.reason
      : undefined;
  const configuredTimeoutMs =
    code === 'GEMINI_REQUEST_TIMEOUT'
      ? safeConfiguredTimeoutMs(remote.configuredTimeoutMs)
      : undefined;
  return {
    ...(code ? { code } : {}),
    ...(SAFE_REMOTE_STAGES.has(remote.stage) ? { stage: remote.stage } : {}),
    ...(SAFE_REMOTE_OPERATIONS.has(remote.operation) ? { operation: remote.operation } : {}),
    ...(timeoutReason ? { timeoutReason } : {}),
    ...(configuredTimeoutMs !== undefined ? { configuredTimeoutMs } : {}),
    ...(typeof remote.retryable === 'boolean' ? { remoteRetryable: remote.retryable } : {}),
    ...(remote.recoveryRequired === true ? { recoveryRequired: true } : {}),
    ...(SAFE_RECOVERY_REASONS.has(remote.recoveryReason)
      ? { recoveryReason: remote.recoveryReason }
      : {}),
  };
}

function extractOutput(runtime, parsedBody, providerHttpStatus) {
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
      { providerHttpStatus },
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

async function invokeRest({ runtime, input, credentialHeaders = {}, observability = {} }) {
  if (!runtime?.endpoint) {
    throw new AppError(
      500,
      ErrorCodes.RUNTIME_CONFIGURATION_INVALID,
      'REST runtime endpoint is not configured.',
    );
  }

  const runStage = (name, operation) =>
    observability.observer ? observability.observer.stage(name, operation) : operation();
  const mappedOptions = await runStage('request_mapping', async () =>
    outboundOptions(runtime, input, credentialHeaders),
  );
  const response = await runStage('external_runtime_invocation', () =>
    safeFetchUtility.safeFetch(runtime.endpoint, {
      ...mappedOptions,
      headers: {
        ...mappedOptions.headers,
        ...(observability.traceId ? { 'x-trace-id': observability.traceId } : {}),
        ...(observability.requestId ? { 'x-request-id': observability.requestId } : {}),
        ...(observability.invocationId ? { 'x-invocation-id': observability.invocationId } : {}),
        ...(typeof observability.idempotencyKey === 'string' &&
        /^(?:sha256|hmac-sha256):[a-f0-9]{64}$/.test(observability.idempotencyKey)
          ? { 'Idempotency-Key': observability.idempotencyKey }
          : {}),
      },
      timeoutMs: env.RUNTIME_INVOCATION_TIMEOUT_MS,
      signal: observability.signal,
      beforeTransmit: observability.beforeTransmit,
      allowDevelopmentDemo: true,
      allowDevelopmentExternalAgent: true,
    }),
  );

  if (!response.ok) {
    const remoteError = safeRemoteError(parseResponseBody(response.bodyText));
    throw new AppError(
      502,
      remoteError.code || ErrorCodes.RUNTIME_INVOCATION_FAILED,
      'Agent runtime returned an unsuccessful response.',
      [
        {
          path: 'runtime',
          message: `Agent runtime responded with HTTP ${response.status}.`,
          remoteStatus: response.status,
        },
      ],
      {
        providerHttpStatus: response.status,
        ...(response.status === 429
          ? { retryAfterMs: safeRetryAfterMs(response.headers?.['retry-after']) }
          : {}),
        ...remoteError,
      },
    );
  }

  const parsedBody = await runStage('response_validation', async () =>
    parseResponseBody(response.bodyText),
  );
  return {
    ok: true,
    status: response.status,
    output: await runStage('response_mapping', async () =>
      extractOutput(runtime, parsedBody, response.status),
    ),
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
  safeRemoteError,
  safeRetryAfterMs,
};
