const TRACKING_PARAMETER_PATTERN = /^(?:utm_.+|gclid|dclid|fbclid|msclkid|mc_cid|mc_eid)$/i;
const CREDENTIAL_PARAMETER_PATTERN =
  /^(?:api[_-]?key|key|access[_-]?token|auth|authorization|credential|password|secret|signature|sig)$/i;

class GeminiSourceExtractionError extends Error {
  constructor() {
    super('Gemini grounding metadata did not contain safe source URLs.');
    this.name = 'GeminiSourceExtractionError';
    this.code = 'GEMINI_SOURCE_EXTRACTION_FAILED';
  }
}

function normalizeSource(source, forbiddenValues = []) {
  if (!source || typeof source.uri !== 'string') return null;

  let url;
  try {
    url = new URL(source.uri);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(url.protocol)) return null;
  if (url.username || url.password) return null;
  if (
    forbiddenValues.some(
      (value) => typeof value === 'string' && value.length > 0 && source.uri.includes(value),
    )
  ) {
    return null;
  }

  for (const [name] of url.searchParams) {
    if (CREDENTIAL_PARAMETER_PATTERN.test(name)) return null;
  }
  for (const name of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMETER_PATTERN.test(name)) url.searchParams.delete(name);
  }
  url.hash = '';

  return {
    title:
      typeof source.title === 'string' && source.title.trim()
        ? source.title.trim().slice(0, 300)
        : url.hostname,
    url: url.toString(),
  };
}

function groundingChunks(response) {
  if (!response || typeof response !== 'object') return [];
  const candidates = Array.isArray(response.candidates) ? response.candidates : [];
  return candidates.flatMap((candidate) => {
    const chunks = candidate?.groundingMetadata?.groundingChunks;
    return Array.isArray(chunks) ? chunks : [];
  });
}

function extractGeminiSources(response, options = {}) {
  const maxSources = Number.isInteger(options.maxSources) ? options.maxSources : 8;
  const forbiddenValues = Array.isArray(options.forbiddenValues) ? options.forbiddenValues : [];
  const byUrl = new Map();

  for (const chunk of groundingChunks(response)) {
    const normalized = normalizeSource(chunk?.web, forbiddenValues);
    if (!normalized || byUrl.has(normalized.url)) continue;
    byUrl.set(normalized.url, normalized);
  }

  return [...byUrl.values()]
    .sort(
      (left, right) =>
        Number(right.url.startsWith('https:')) - Number(left.url.startsWith('https:')),
    )
    .slice(0, maxSources);
}

function requireGeminiSources(response, options = {}) {
  const sources = extractGeminiSources(response, options);
  if (sources.length === 0) throw new GeminiSourceExtractionError();
  return sources;
}

module.exports = {
  GeminiSourceExtractionError,
  extractGeminiSources,
  normalizeSource,
  requireGeminiSources,
};
