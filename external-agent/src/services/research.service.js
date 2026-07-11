const EXTERNAL_AGENT_SOURCE = 'https://example.com/external-agent-source';

function researchTopic(topic) {
  return {
    summary: `External agent result for: ${topic}`,
    sources: [EXTERNAL_AGENT_SOURCE],
    runtime: {
      service: 'external-research-agent',
      version: '1.0.0',
    },
  };
}

module.exports = {
  EXTERNAL_AGENT_SOURCE,
  researchTopic,
};
