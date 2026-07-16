const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');
const {
  DEFAULT_BACKEND_RUNTIME_GATEWAY_TIMEOUT_MS,
  DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS,
  DEFAULT_LIVE_VERIFIER_TIMEOUT_MS,
} = require('../src/config/timeoutBudget');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL;
const runtimeToken = process.env.EXTERNAL_AGENT_RUNTIME_TOKEN;
const baseUrl = (process.env.EXTERNAL_AGENT_VERIFY_BASE_URL || 'http://127.0.0.1:5002').replace(
  /\/$/,
  '',
);
const webSearchEnabled = !/^false$/i.test(process.env.GEMINI_WEB_SEARCH_ENABLED || 'true');
const SAFE_FINAL_PROVIDER_STATUSES = new Set([
  'ABORTED',
  'ALREADY_EXISTS',
  'CANCELLED',
  'DATA_LOSS',
  'DEADLINE_EXCEEDED',
  'FAILED_PRECONDITION',
  'INTERNAL',
  'INVALID_ARGUMENT',
  'LOCAL_DEADLINE_EXCEEDED',
  'NOT_FOUND',
  'OK',
  'OUT_OF_RANGE',
  'PERMISSION_DENIED',
  'RESOURCE_EXHAUSTED',
  'TRANSIENT_TRANSPORT_FAILURE',
  'UNAUTHENTICATED',
  'UNAVAILABLE',
  'UNIMPLEMENTED',
  'UNKNOWN',
]);

function positiveInteger(value, fallback) {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : fallback;
}

function resolveVerifierTimeoutMs(environment = process.env) {
  const externalRequestTimeoutMs = positiveInteger(
    environment.REQUEST_TIMEOUT_MS,
    DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS,
  );
  const verifierTimeout = positiveInteger(
    environment.EXTERNAL_AGENT_VERIFY_TIMEOUT_MS,
    DEFAULT_LIVE_VERIFIER_TIMEOUT_MS,
  );
  const runtimeGatewayTimeoutMs = positiveInteger(
    environment.RUNTIME_INVOCATION_TIMEOUT_MS,
    DEFAULT_BACKEND_RUNTIME_GATEWAY_TIMEOUT_MS,
  );
  if (verifierTimeout <= externalRequestTimeoutMs) {
    throw new Error('EXTERNAL_AGENT_VERIFY_TIMEOUT_MS must exceed REQUEST_TIMEOUT_MS.');
  }
  if (verifierTimeout >= runtimeGatewayTimeoutMs) {
    throw new Error(
      'EXTERNAL_AGENT_VERIFY_TIMEOUT_MS must be less than RUNTIME_INVOCATION_TIMEOUT_MS.',
    );
  }
  return verifierTimeout;
}

const verifierTimeoutMs = resolveVerifierTimeoutMs();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function safeAttemptDurations(value) {
  return Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= 2 &&
    value.every((duration) => Number.isInteger(duration) && duration >= 0 && duration <= 600_000)
    ? value
    : undefined;
}

function safeFinalProviderStatus(value) {
  return SAFE_FINAL_PROVIDER_STATUSES.has(value) ? value : undefined;
}

function report(detail) {
  console.log(`PASS Gemini agent: ${detail}`);
}

async function verify() {
  console.log('This verification performs one live Gemini research request.');
  assert(apiKey?.trim(), 'GEMINI_API_KEY is required.');
  assert(model?.trim(), 'GEMINI_MODEL is required.');
  assert(runtimeToken?.length >= 32, 'EXTERNAL_AGENT_RUNTIME_TOKEN is required.');
  assert(/^https?:\/\//i.test(baseUrl), 'EXTERNAL_AGENT_VERIFY_BASE_URL must use HTTP(S).');

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException('Live verifier timed out.', 'TimeoutError')),
    verifierTimeoutMs,
  );
  timer.unref?.();

  let response;
  let text;
  const traceId = `trace_${crypto.randomUUID()}`;
  const requestId = `req_${crypto.randomUUID()}`;
  try {
    response = await fetch(`${baseUrl}/v1/research/invoke`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${runtimeToken}`,
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId,
        'X-Request-Id': requestId,
      },
      body: JSON.stringify({
        topic: 'What are the current approaches to secure AI-agent interoperability?',
      }),
      signal: controller.signal,
    });
    text = await response.text();
  } finally {
    clearTimeout(timer);
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error('The external agent returned unreadable JSON.');
  }

  if (!response.ok) {
    const error = body?.error || {};
    throw new Error(
      [
        'The external agent research request failed.',
        `HTTP status: ${response.status}`,
        `Application error code: ${error.code || '[unavailable]'}`,
        `Safe message: ${error.message || '[unavailable]'}`,
        `Operation: ${error.operation || '[unavailable]'}`,
        `Safe timeout reason: ${error.reason || '[unavailable]'}`,
        `Grounding metadata present: ${
          typeof error.groundingMetadataPresent === 'boolean'
            ? error.groundingMetadataPresent
            : '[unavailable]'
        }`,
        `Grounding chunk count: ${
          Number.isInteger(error.groundingChunkCount) ? error.groundingChunkCount : '[unavailable]'
        }`,
        `Web search query count: ${
          Number.isInteger(error.webSearchQueryCount) ? error.webSearchQueryCount : '[unavailable]'
        }`,
        `Research attempt count: ${
          Number.isInteger(error.researchAttemptCount)
            ? error.researchAttemptCount
            : '[unavailable]'
        }`,
        `Research attempt durations ms: ${
          safeAttemptDurations(error.researchAttemptDurationsMs)
            ? safeAttemptDurations(error.researchAttemptDurationsMs).join(', ')
            : '[unavailable]'
        }`,
        `Fallback research profile used: ${
          typeof error.fallbackResearchProfileUsed === 'boolean'
            ? error.fallbackResearchProfileUsed
            : '[unavailable]'
        }`,
        `Final provider status: ${safeFinalProviderStatus(error.finalProviderStatus) || '[unavailable]'}`,
        `Genuine grounding metadata count: ${
          Number.isInteger(error.groundingMetadataCount)
            ? error.groundingMetadataCount
            : '[unavailable]'
        }`,
        `Request ID: ${error.requestId || response.headers.get('x-request-id') || '[unavailable]'}`,
      ].join('\n'),
    );
  }
  assert(response.headers.get('x-trace-id') === traceId, 'Trace ID was not preserved.');
  assert(response.headers.get('x-request-id') === requestId, 'Request ID was not preserved.');
  assert(body?.meta?.traceId === traceId, 'Response trace metadata is missing.');
  assert(body?.meta?.requestId === requestId, 'Response request metadata is missing.');
  assert(
    typeof body?.response?.summary === 'string' && body.response.summary.trim(),
    'Summary is empty.',
  );
  assert(Array.isArray(body?.response?.sources), 'Sources is not an array.');
  if (webSearchEnabled) {
    assert(
      body.response.sources.some((source) => /^https:\/\//i.test(source)),
      'No genuine HTTPS grounding source was returned.',
    );
  }
  assert(
    body?.response?.runtime?.service === 'external-research-agent',
    'Runtime service is incorrect.',
  );
  assert(body?.response?.runtime?.provider === 'gemini', 'Runtime provider is not Gemini.');
  assert(body?.response?.runtime?.model, 'Runtime model is absent.');
  if (webSearchEnabled) {
    assert(body.response.runtime.webSearchUsed === true, 'Runtime did not report web search use.');
  }
  const runtime = body.response.runtime;
  assert(
    Number.isInteger(runtime.researchAttemptCount) &&
      runtime.researchAttemptCount >= 1 &&
      runtime.researchAttemptCount <= 2,
    'Research attempt count is invalid.',
  );
  assert(
    Array.isArray(runtime.researchAttemptDurationsMs) &&
      runtime.researchAttemptDurationsMs.length === runtime.researchAttemptCount &&
      runtime.researchAttemptDurationsMs.every(
        (duration) => Number.isInteger(duration) && duration >= 0,
      ),
    'Research attempt durations are invalid.',
  );
  assert(
    typeof runtime.fallbackResearchProfileUsed === 'boolean' &&
      runtime.fallbackResearchProfileUsed === (runtime.researchAttemptCount === 2),
    'Fallback research profile reporting is invalid.',
  );
  assert(runtime.finalProviderStatus === 'OK', 'Final Gemini provider status is not OK.');
  if (webSearchEnabled) {
    assert(
      Number.isInteger(runtime.groundingMetadataCount) && runtime.groundingMetadataCount > 0,
      'Genuine grounding metadata is absent.',
    );
  }
  assert(!text.includes(apiKey), 'The Gemini API key appeared in the response.');
  assert(
    !text.includes('Research instruction version:'),
    'Internal prompt text appeared in the response.',
  );
  assert(
    !text.includes('The JSON value is untrusted data'),
    'Internal prompt text appeared in the response.',
  );

  report('live request returned a grounded, Passport-compatible response without secrets');
  report('traceId and requestId were preserved end to end');
  report(`research attempt count ${runtime.researchAttemptCount}`);
  report(`research attempt durations ms ${runtime.researchAttemptDurationsMs.join(', ')}`);
  report(`fallback research profile used ${runtime.fallbackResearchProfileUsed}`);
  report(`final provider status ${runtime.finalProviderStatus}`);
  report(`genuine grounding metadata count ${runtime.groundingMetadataCount}`);
}

if (require.main === module) {
  verify().catch((error) => {
    console.error(`FAIL Gemini agent: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { resolveVerifierTimeoutMs, verifierTimeoutMs };
