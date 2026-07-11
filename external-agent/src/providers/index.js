const { GeminiProvider } = require('./gemini.provider');
const { MockProvider } = require('./mock.provider');

function createAIProvider(config) {
  if (config.aiProvider === 'mock') return new MockProvider();
  if (config.aiProvider === 'gemini') return new GeminiProvider(config.gemini);
  throw new Error('Unsupported AI provider configuration.');
}

module.exports = {
  createAIProvider,
};
