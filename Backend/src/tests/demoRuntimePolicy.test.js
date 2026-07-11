const assert = require('node:assert/strict');
const test = require('node:test');
const { env } = require('../config/env');
const { validateAgentPassportV1 } = require('../services/passportValidator');
const { buildFlowAiDemoPassport } = require('../services/demoService');
const { developmentDemoRuntimeUrl, parseSafeUrl } = require('../utils/safeFetch');
const { ErrorCodes } = require('../utils/errorCodes');

test(
  'the FlowAI demo passport allows only the exact development mock runtime route',
  { skip: env.NODE_ENV !== 'development' },
  () => {
    const endpoint = developmentDemoRuntimeUrl();
    const passport = buildFlowAiDemoPassport();

    assert.equal(validateAgentPassportV1(passport).valid, true);
    assert.throws(() => parseSafeUrl(endpoint), { code: ErrorCodes.UNSAFE_URL });
    assert.equal(parseSafeUrl(endpoint, { allowDevelopmentDemo: true }).toString(), endpoint);
    assert.throws(
      () => parseSafeUrl(`${endpoint}/other`, { allowDevelopmentDemo: true }),
      { code: ErrorCodes.UNSAFE_URL },
    );
  },
);
