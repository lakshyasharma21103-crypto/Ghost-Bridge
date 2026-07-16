const { AIProvider } = require('./ai-provider.interface');

const MOCK_SOURCE = 'https://example.com/external-agent-source';

class MockProvider extends AIProvider {
  constructor(options = {}) {
    super();
    this.model = options.model || 'deterministic-test';
  }

  checkConfiguration() {
    return {
      provider: 'mock',
      configured: true,
      webSearchEnabled: false,
    };
  }

  async research({ topic, signal }) {
    if (signal?.aborted) throw signal.reason;
    return {
      summary: `External agent result for: ${topic}`,
      sourceReferences: [{ title: 'External agent test source', url: MOCK_SOURCE }],
      webSearchUsed: false,
      researchDiagnostics: {
        attemptCount: 1,
        attemptDurationsMs: [0],
        fallbackProfileUsed: false,
        finalProviderStatus: 'OK',
        groundingMetadataCount: 0,
      },
    };
  }
}

module.exports = {
  MOCK_SOURCE,
  MockProvider,
};
