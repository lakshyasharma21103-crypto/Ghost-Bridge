const { z } = require('zod');
const { SERVICE_NAME, SERVICE_VERSION } = require('../constants');

const providerResultSchema = z
  .object({
    summary: z.string().trim().min(1),
    sourceReferences: z.array(
      z.object({ title: z.string().trim().min(1), url: z.string().url() }).strict(),
    ),
    webSearchUsed: z.boolean(),
    researchDiagnostics: z
      .object({
        attemptCount: z.number().int().min(1).max(2),
        attemptDurationsMs: z.array(z.number().int().nonnegative()).min(1).max(2),
        fallbackProfileUsed: z.boolean(),
        finalProviderStatus: z.string().regex(/^[A-Z][A-Z0-9_]{1,63}$/),
        groundingMetadataCount: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

class ResearchService {
  constructor(provider, config) {
    if (!provider?.research || !provider?.checkConfiguration) {
      throw new Error('A research AI provider is required.');
    }
    this.provider = provider;
    this.config = config;
  }

  async researchTopic({ topic, requestId, traceId, invocationId, observer, signal }) {
    const normalizedTopic = String(topic).trim().replace(/\s+/g, ' ');
    const assertNotAborted = () => signal?.throwIfAborted();
    assertNotAborted();
    const providerResult = await observer.stage('grounded_research', () =>
      this.provider.research({
        topic: normalizedTopic,
        requestId,
        traceId,
        invocationId,
        observer,
        signal,
      }),
    );
    assertNotAborted();
    const result = await observer.stage('response_validation', async () =>
      providerResultSchema.parse(providerResult),
    );
    assertNotAborted();
    const sources = await observer.stage('grounding_source_extraction', async () =>
      result.sourceReferences.map((source) => source.url),
    );
    assertNotAborted();

    return observer.stage('structured_formatting', async () => {
      assertNotAborted();
      return {
        summary: result.summary,
        sources,
        runtime: {
          service: SERVICE_NAME,
          version: SERVICE_VERSION,
          provider: this.config.aiProvider,
          model:
            this.config.aiProvider === 'gemini'
              ? this.config.gemini.model
              : this.provider.model || 'deterministic-test',
          webSearchUsed: result.webSearchUsed,
          sourceCount: result.sourceReferences.length,
          researchAttemptCount: result.researchDiagnostics.attemptCount,
          researchAttemptDurationsMs: result.researchDiagnostics.attemptDurationsMs,
          fallbackResearchProfileUsed: result.researchDiagnostics.fallbackProfileUsed,
          finalProviderStatus: result.researchDiagnostics.finalProviderStatus,
          groundingMetadataCount: result.researchDiagnostics.groundingMetadataCount,
        },
      };
    });
  }
}

module.exports = {
  ResearchService,
  providerResultSchema,
};
