const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL;
const runtimeToken = process.env.EXTERNAL_AGENT_RUNTIME_TOKEN;
const baseUrl = (process.env.EXTERNAL_AGENT_VERIFY_BASE_URL || 'http://127.0.0.1:5002').replace(
  /\/$/,
  '',
);
const webSearchEnabled = !/^false$/i.test(process.env.GEMINI_WEB_SEARCH_ENABLED || 'true');
const verifierTimeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 300_000) + 10_000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  const timer = setTimeout(() => controller.abort(), verifierTimeoutMs);
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
}

verify().catch((error) => {
  console.error(`FAIL Gemini agent: ${error.message}`);
  process.exitCode = 1;
});
