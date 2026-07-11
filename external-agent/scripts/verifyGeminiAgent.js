const path = require('node:path');
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
  const timer = setTimeout(() => controller.abort(), 70_000);
  timer.unref?.();

  let response;
  let text;
  try {
    response = await fetch(`${baseUrl}/v1/research/invoke`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${runtimeToken}`,
        'Content-Type': 'application/json',
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

  assert(response.ok, `The external agent returned HTTP ${response.status}.`);
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
}

verify().catch((error) => {
  console.error(`FAIL Gemini agent: ${error.message}`);
  process.exitCode = 1;
});
