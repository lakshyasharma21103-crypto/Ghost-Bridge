const assert = require('node:assert/strict');
const test = require('node:test');
const { ResearchService } = require('../src/services/research.service');
const { requestCancelledError } = require('../src/utils/errors');

test('cancellation that lands with the provider response stops every later research stage', async () => {
  const controller = new AbortController();
  const stages = [];
  const provider = {
    checkConfiguration() {
      return { provider: 'mock', configured: true };
    },
    async research() {
      controller.abort(requestCancelledError());
      return {
        summary: 'This value must never reach formatting.',
        sourceReferences: [{ title: 'Hidden', url: 'https://example.com/private-source' }],
        webSearchUsed: true,
      };
    },
  };
  const observer = {
    async stage(name, operation) {
      stages.push(name);
      return operation();
    },
  };
  const service = new ResearchService(provider, {
    aiProvider: 'mock',
    gemini: {},
  });

  await assert.rejects(
    () =>
      service.researchTopic({
        topic: 'cancel after provider completion',
        observer,
        signal: controller.signal,
      }),
    (error) => error.code === 'REQUEST_CANCELLED',
  );
  assert.deepEqual(stages, ['grounded_research']);
  assert.doesNotMatch(JSON.stringify(stages), /response_validation|source|formatting/);
});
