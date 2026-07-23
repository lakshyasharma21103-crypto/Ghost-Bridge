const SENSITIVE_KEY_PATTERN =
  /(^|[_-])(authorization|cookie|token|secret|password|credential|api[_-]?key|private[_-]?key)([_-]|$)|(?:runtime|access|refresh|bearer|api)Token$|apiKey$/i;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const QUERY_SECRET_PATTERN =
  /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|runtime[_-]?token|partner[_-]?api[_-]?key|install[_-]?key|token|secret|password|credential)=)([^&\s]+)/gi;
const INSTALL_KEY_PATTERN = /agentpass_install_[A-Za-z0-9_-]{16,}/g;
const PARTNER_KEY_PATTERN = /agentpass_partner_[A-Za-z0-9_-]{16,}/g;
const SENSITIVE_NORMALIZED_KEYS = new Set([
  'authorization',
  'cookie',
  'cookies',
  'setcookie',
  'apikey',
  'token',
  'accesstoken',
  'refreshtoken',
  'runtimetoken',
  'partnerapikey',
  'installkey',
  'secret',
  'credential',
  'credentials',
  'encryptedpayload',
  'decryptedpayload',
  'password',
  'privatekey',
  'clientsecret',
  'bearertoken',
  'rawkey',
  'runtimegrant',
  'ciphertext',
]);

function isSensitiveKey(keyName) {
  const normalized = String(keyName || '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  return SENSITIVE_NORMALIZED_KEYS.has(normalized) || SENSITIVE_KEY_PATTERN.test(keyName);
}

function redactString(value) {
  const redacted = String(value)
    .replace(INSTALL_KEY_PATTERN, '[redacted-install-key]')
    .replace(PARTNER_KEY_PATTERN, '[redacted-partner-api-key]')
    .replace(BEARER_PATTERN, 'Bearer [redacted]')
    .replace(QUERY_SECRET_PATTERN, '$1[redacted]');
  const trimmed = redacted.trim();
  if (trimmed.length <= 65_536 && (/^\{/.test(trimmed) || /^\[/.test(trimmed))) {
    try {
      return JSON.stringify(redactSecrets(JSON.parse(trimmed), 1));
    } catch {
      return redacted;
    }
  }
  return redacted;
}

function redactSecrets(value, depth = 0, keyName = '') {
  if (depth > 8) return '[redacted-depth-limit]';
  if (value == null) return value;
  if (isSensitiveKey(keyName)) return '[redacted]';
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item, depth + 1));
  if (typeof value !== 'object') return value;

  if (value instanceof Error) {
    return redactSecrets(
      {
        name: value.name,
        code: value.code,
        internalCode: value.internalCode,
        statusCode: value.statusCode,
        operation: value.operation,
        stage: value.stage,
        retryable: value.retryable,
        durationMs: value.durationMs,
        timeoutReason:
          value.code === 'GEMINI_REQUEST_TIMEOUT' ||
          value.code === 'GEMINI_RESEARCH_BUDGET_EXHAUSTED'
            ? value.timeoutReason || value.reason
            : undefined,
        configuredTimeoutMs: value.configuredTimeoutMs,
        operationTimeoutMs: value.operationTimeoutMs,
        providerAttemptCount: value.providerAttemptCount,
        providerMaxAttempts: value.providerMaxAttempts,
        retryDelayMs: value.retryDelayMs,
        retryDelayCategory: value.retryDelayCategory,
        retryReason: value.retryReason,
        retryBudgetExhausted: value.retryBudgetExhausted,
        researchAttemptCount: value.researchAttemptCount,
        researchAttemptDurationsMs: value.researchAttemptDurationsMs,
        researchAttempts: value.researchAttempts,
        fallbackResearchProfileUsed: value.fallbackResearchProfileUsed,
        groundingFallbackUsed: value.groundingFallbackUsed,
        finalProviderStatus: value.finalProviderStatus,
        groundingMetadataCount: value.groundingMetadataCount,
        reason:
          (value.code === 'REQUEST_CANCELLED' && value.reason === 'CLIENT_DISCONNECTED') ||
          (value.code === 'SERVICE_SHUTDOWN' && value.reason === 'SERVICE_SHUTDOWN')
            ? value.reason
            : undefined,
        configuration: value.configuration,
        providerHttpStatus: value.providerHttpStatus,
        providerStatus: value.providerStatus,
        groundingMetadataPresent: value.groundingMetadataPresent,
        apiMode: value.apiMode,
        candidateCount: value.candidateCount,
        configuredMaxOutputTokens: value.configuredMaxOutputTokens,
        promptCharacterCount: value.promptCharacterCount,
        promptTokenCount: value.promptTokenCount,
        candidatesTokenCount: value.candidatesTokenCount,
        thoughtsTokenCount: value.thoughtsTokenCount,
        totalTokenCount: value.totalTokenCount,
        responseStepTypes: value.responseStepTypes,
        googleSearchCallCount: value.googleSearchCallCount,
        googleSearchResultCount: value.googleSearchResultCount,
        citationAnnotationCount: value.citationAnnotationCount,
        groundingChunkCount: value.groundingChunkCount,
        finishReason: value.finishReason,
        webSearchQueryCount: value.webSearchQueryCount,
        cause: value.cause ? { name: value.cause.name, code: value.cause.code } : undefined,
      },
      depth + 1,
    );
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, redactSecrets(item, depth + 1, key)]),
  );
}

module.exports = {
  redactSecrets,
  redactString,
  isSensitiveKey,
};
