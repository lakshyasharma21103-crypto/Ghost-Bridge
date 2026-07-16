const TRACKING_PARAMETER_PATTERN = /^(?:utm_.+|gclid|dclid|fbclid|msclkid|mc_cid|mc_eid)$/i;
const CREDENTIAL_PARAMETER_PATTERN =
  /^(?:api[_-]?key|key|access[_-]?token|auth|authorization|credential|password|secret|signature|sig)$/i;
const OBVIOUS_SECRET_PATTERN =
  /(?:AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9_-]{16,}|\bBearer\s+[A-Za-z0-9._~+/=-]{8,})/i;

const SAFE_GROUNDING_METADATA_KEYS = new Set([
  'googleMapsWidgetContextToken',
  'google_maps_widget_context_token',
  'groundingChunks',
  'groundingSupports',
  'grounding_chunks',
  'grounding_supports',
  'imageSearchQueries',
  'image_search_queries',
  'retrievalMetadata',
  'retrievalQueries',
  'retrieval_metadata',
  'retrieval_queries',
  'searchEntryPoint',
  'search_entry_point',
  'sourceFlaggingUris',
  'source_flagging_uris',
  'webSearchQueries',
  'web_search_queries',
]);
const SAFE_USAGE_METADATA_KEYS = new Set([
  'billedToolCallCount',
  'billed_tool_call_count',
  'cacheTokensDetails',
  'cachedContentTokenCount',
  'cached_content_token_count',
  'candidatesTokenCount',
  'candidatesTokensDetails',
  'candidates_token_count',
  'candidates_tokens_details',
  'promptTokenCount',
  'promptTokensDetails',
  'prompt_token_count',
  'prompt_tokens_details',
  'responseTokenCount',
  'responseTokensDetails',
  'response_token_count',
  'response_tokens_details',
  'serviceTier',
  'service_tier',
  'thoughtsTokenCount',
  'thoughts_token_count',
  'toolCallCount',
  'toolUsePromptTokenCount',
  'toolUsePromptTokensDetails',
  'tool_call_count',
  'tool_use_prompt_token_count',
  'tool_use_prompt_tokens_details',
  'totalTokenCount',
  'total_token_count',
  'trafficType',
  'traffic_type',
]);
const SAFE_CHUNK_KEYS = new Set(['image', 'maps', 'retrievedContext', 'retrieved_context', 'web']);

class GeminiSourceExtractionError extends Error {
  constructor(code, diagnostics) {
    super('Gemini grounding metadata did not contain safe source URLs.');
    this.name = 'GeminiSourceExtractionError';
    this.code = code;
    this.diagnostics = Object.freeze({ ...diagnostics });
  }
}

function candidatesFrom(response) {
  return Array.isArray(response?.candidates) ? response.candidates : [];
}

function candidateGroundingMetadata(candidate) {
  const metadata = candidate?.groundingMetadata ?? candidate?.grounding_metadata;
  return metadata && typeof metadata === 'object' ? metadata : undefined;
}

function aliasedValue(object, camelCase, snakeCase) {
  return object?.[camelCase] ?? object?.[snakeCase];
}

function hasAliasedField(object, camelCase, snakeCase) {
  return Boolean(
    object &&
    (Object.prototype.hasOwnProperty.call(object, camelCase) ||
      Object.prototype.hasOwnProperty.call(object, snakeCase)),
  );
}

function safeFinishReason(value) {
  return typeof value === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(value)
    ? value
    : '[unavailable]';
}

function safeKeyNames(object, allowlist) {
  if (!object || typeof object !== 'object') return [];
  return Object.keys(object).filter((key) => allowlist.has(key));
}

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : undefined;
}

function inspectGeminiResponseShape(response, context = {}) {
  const candidates = candidatesFrom(response);
  const metadata = candidates.map(candidateGroundingMetadata).filter(Boolean);
  const usageMetadata = response?.usageMetadata ?? response?.usage_metadata;
  const chunks = metadata.flatMap((item) => {
    const value = aliasedValue(item, 'groundingChunks', 'grounding_chunks');
    return Array.isArray(value) ? value : [];
  });
  const queries = metadata.flatMap((item) => {
    const value = aliasedValue(item, 'webSearchQueries', 'web_search_queries');
    return Array.isArray(value) ? value : [];
  });
  const supports = metadata.flatMap((item) => {
    const value = aliasedValue(item, 'groundingSupports', 'grounding_supports');
    return Array.isArray(value) ? value : [];
  });
  const groundingMetadataKeys = [
    ...new Set(metadata.flatMap((item) => safeKeyNames(item, SAFE_GROUNDING_METADATA_KEYS))),
  ].sort();
  const usageMetadataKeys = safeKeyNames(usageMetadata, SAFE_USAGE_METADATA_KEYS).sort();
  const billedToolCallCount = nonNegativeInteger(
    aliasedValue(usageMetadata, 'billedToolCallCount', 'billed_tool_call_count') ??
      aliasedValue(usageMetadata, 'toolCallCount', 'tool_call_count'),
  );

  return {
    ...(context.traceId ? { traceId: context.traceId } : {}),
    requestId: context.requestId,
    ...(context.invocationId ? { invocationId: context.invocationId } : {}),
    operation: 'grounded_research',
    model: context.model,
    candidateCount: candidates.length,
    candidateFinishReasons: candidates.map((candidate) =>
      safeFinishReason(candidate?.finishReason ?? candidate?.finish_reason),
    ),
    contentPartCount: candidates.reduce(
      (count, candidate) =>
        count + (Array.isArray(candidate?.content?.parts) ? candidate.content.parts.length : 0),
      0,
    ),
    groundingMetadataPresent: metadata.length > 0,
    groundingMetadataCount: metadata.length,
    groundingMetadataKeys,
    webSearchQueryCount: queries.length,
    groundingChunkCount: chunks.length,
    groundingSupportCount: supports.length,
    searchEntryPointPresent: metadata.some(
      (item) => aliasedValue(item, 'searchEntryPoint', 'search_entry_point') != null,
    ),
    usageMetadataKeys,
    ...(billedToolCallCount !== undefined ? { billedToolCallCount } : {}),
  };
}

function normalizeSourceResult(source, forbiddenValues = []) {
  if (!source || typeof source !== 'object') return { source: null, reason: 'invalid_web_shape' };
  if (typeof source.uri !== 'string' || !source.uri.trim()) {
    return { source: null, reason: 'missing_web_uri' };
  }

  let url;
  try {
    url = new URL(source.uri);
  } catch {
    return { source: null, reason: 'invalid_url' };
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { source: null, reason: 'unsupported_url_protocol' };
  }
  if (url.username || url.password) {
    return { source: null, reason: 'embedded_url_credentials' };
  }
  if (
    forbiddenValues.some(
      (value) => typeof value === 'string' && value.length > 0 && source.uri.includes(value),
    ) ||
    OBVIOUS_SECRET_PATTERN.test(source.uri)
  ) {
    return { source: null, reason: 'obvious_secret_in_url' };
  }

  for (const [name] of url.searchParams) {
    if (CREDENTIAL_PARAMETER_PATTERN.test(name)) {
      return { source: null, reason: 'credential_query_parameter' };
    }
  }
  for (const name of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMETER_PATTERN.test(name)) url.searchParams.delete(name);
  }
  url.hash = '';

  return {
    source: {
      title:
        typeof source.title === 'string' && source.title.trim()
          ? source.title.trim().slice(0, 300)
          : url.hostname,
      url: url.toString(),
    },
  };
}

function normalizeSource(source, forbiddenValues = []) {
  return normalizeSourceResult(source, forbiddenValues).source;
}

function extractionState(response, options = {}) {
  const maxSources = Number.isInteger(options.maxSources) ? options.maxSources : 8;
  const forbiddenValues = Array.isArray(options.forbiddenValues) ? options.forbiddenValues : [];
  const candidates = candidatesFrom(response);
  const metadata = candidates.map(candidateGroundingMetadata).filter(Boolean);
  const groundingChunksPresent = metadata.some((item) =>
    hasAliasedField(item, 'groundingChunks', 'grounding_chunks'),
  );
  const chunks = metadata.flatMap((item) => {
    const value = aliasedValue(item, 'groundingChunks', 'grounding_chunks');
    return Array.isArray(value) ? value : [];
  });
  const byUrl = new Map();
  const rejectionReasons = new Set();
  let rejectedChunkCount = 0;

  for (const chunk of chunks) {
    if (!chunk || typeof chunk !== 'object') {
      rejectedChunkCount += 1;
      rejectionReasons.add('invalid_chunk_shape');
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(chunk, 'web')) {
      rejectedChunkCount += 1;
      rejectionReasons.add('non_web_chunk_ignored');
      continue;
    }
    const normalized = normalizeSourceResult(chunk.web, forbiddenValues);
    if (!normalized.source) {
      rejectedChunkCount += 1;
      rejectionReasons.add(normalized.reason);
      continue;
    }
    if (!byUrl.has(normalized.source.url)) byUrl.set(normalized.source.url, normalized.source);
  }

  return {
    sources: [...byUrl.values()]
      .sort(
        (left, right) =>
          Number(right.url.startsWith('https:')) - Number(left.url.startsWith('https:')),
      )
      .slice(0, maxSources),
    groundingMetadataPresent: metadata.length > 0,
    groundingChunksPresent,
    groundingChunkCount: chunks.length,
    chunkShapeKeys: [
      ...new Set(
        chunks.flatMap((chunk) =>
          chunk && typeof chunk === 'object'
            ? Object.keys(chunk)
                .filter((key) => SAFE_CHUNK_KEYS.has(key))
                .map((key) => (key === 'retrieved_context' ? 'retrievedContext' : key))
            : [],
        ),
      ),
    ].sort(),
    rejectedChunkCount,
    rejectionReasons: [...rejectionReasons].sort(),
  };
}

function extractGeminiSources(response, options = {}) {
  return extractionState(response, options).sources;
}

function requireGeminiSources(response, options = {}) {
  const state = extractionState(response, options);
  if (state.sources.length > 0) return state.sources;

  const shape = inspectGeminiResponseShape(response, options.diagnosticContext);
  const code =
    !state.groundingMetadataPresent || !state.groundingChunksPresent
      ? 'GEMINI_GROUNDING_METADATA_MISSING'
      : 'GEMINI_SOURCE_PARSING_FAILED';
  throw new GeminiSourceExtractionError(code, {
    ...shape,
    groundingChunkCount: state.groundingChunkCount,
    ...(code === 'GEMINI_SOURCE_PARSING_FAILED'
      ? {
          chunkShapeKeys: state.chunkShapeKeys,
          rejectedChunkCount: state.rejectedChunkCount,
          rejectionReasons: state.rejectionReasons,
        }
      : {}),
  });
}

module.exports = {
  GeminiSourceExtractionError,
  extractGeminiSources,
  inspectGeminiResponseShape,
  normalizeSource,
  requireGeminiSources,
};
