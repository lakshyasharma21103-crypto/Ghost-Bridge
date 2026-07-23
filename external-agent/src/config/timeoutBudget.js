const DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS = 510_000;
const DEFAULT_GEMINI_RESEARCH_TIMEOUT_MS = 120_000;
const DEFAULT_GEMINI_RESEARCH_FALLBACK_TIMEOUT_MS = 180_000;
const DEFAULT_GEMINI_FORMATTING_TIMEOUT_MS = 60_000;
const DEFAULT_LIVE_VERIFIER_TIMEOUT_MS = 530_000;
const DEFAULT_BACKEND_RUNTIME_GATEWAY_TIMEOUT_MS = 550_000;
const DEFAULT_EXTERNAL_FLOW_VERIFIER_TIMEOUT_MS = 570_000;
const GEMINI_PROCESSING_OVERHEAD_MS = 10_000;
const GEMINI_RESEARCH_VALIDATION_MARGIN_MS = 10_000;
const GEMINI_RETRY_BASE_DELAY_MS = 5_000;
const GEMINI_RETRY_JITTER_MS = 1_000;
const GEMINI_RETRY_MAX_DELAY_MS = 30_000;

function boundedAttempts(value) {
  const attempts = Number(value);
  return Number.isInteger(attempts) && attempts >= 1 && attempts <= 2 ? attempts : 1;
}

function retryDelayMs(attemptNumber, randomValue = Math.random()) {
  const completedAttempt = Math.max(1, Number(attemptNumber) || 1);
  const normalizedRandom = Math.min(0.999_999, Math.max(0, Number(randomValue) || 0));
  return Math.min(
    GEMINI_RETRY_MAX_DELAY_MS,
    GEMINI_RETRY_BASE_DELAY_MS * 2 ** Math.max(0, completedAttempt - 1) +
      Math.floor(normalizedRandom * GEMINI_RETRY_JITTER_MS),
  );
}

function retryDelayBudgetMs(maxAttempts) {
  const attempts = boundedAttempts(maxAttempts);
  let total = 0;
  for (let attemptNumber = 1; attemptNumber < attempts; attemptNumber += 1) {
    // Reserve the bounded Retry-After ceiling, not merely the normal jittered delay.
    total += GEMINI_RETRY_MAX_DELAY_MS;
  }
  return total;
}

function operationBudgetMs(attemptTimeoutMs, maxAttempts, marginMs = 0) {
  const attempts = boundedAttempts(maxAttempts);
  const timeouts = Array.isArray(attemptTimeoutMs)
    ? attemptTimeoutMs
    : Array.from({ length: attempts }, () => Number(attemptTimeoutMs));
  return (
    timeouts.slice(0, attempts).reduce((total, timeout) => total + Number(timeout), 0) +
    retryDelayBudgetMs(attempts) +
    Number(marginMs || 0)
  );
}

function providerRequestBudget(configuration = {}) {
  const researchOperationTimeoutMs = operationBudgetMs(
    [
      configuration.researchTimeoutMs,
      configuration.researchFallbackTimeoutMs ?? configuration.researchTimeoutMs,
    ],
    configuration.researchMaxAttempts,
    GEMINI_RESEARCH_VALIDATION_MARGIN_MS,
  );
  const formattingOperationTimeoutMs = operationBudgetMs(
    configuration.formattingTimeoutMs,
    configuration.formattingMaxAttempts,
  );
  return Object.freeze({
    researchOperationTimeoutMs,
    formattingOperationTimeoutMs,
    retryDelayBudgetMs:
      retryDelayBudgetMs(configuration.researchMaxAttempts) +
      retryDelayBudgetMs(configuration.formattingMaxAttempts),
    totalTimeoutMs:
      researchOperationTimeoutMs + formattingOperationTimeoutMs + GEMINI_PROCESSING_OVERHEAD_MS,
  });
}

module.exports = {
  DEFAULT_BACKEND_RUNTIME_GATEWAY_TIMEOUT_MS,
  DEFAULT_EXTERNAL_FLOW_VERIFIER_TIMEOUT_MS,
  DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS,
  DEFAULT_GEMINI_FORMATTING_TIMEOUT_MS,
  DEFAULT_GEMINI_RESEARCH_FALLBACK_TIMEOUT_MS,
  DEFAULT_GEMINI_RESEARCH_TIMEOUT_MS,
  DEFAULT_LIVE_VERIFIER_TIMEOUT_MS,
  GEMINI_PROCESSING_OVERHEAD_MS,
  GEMINI_RESEARCH_VALIDATION_MARGIN_MS,
  GEMINI_RETRY_BASE_DELAY_MS,
  GEMINI_RETRY_JITTER_MS,
  GEMINI_RETRY_MAX_DELAY_MS,
  operationBudgetMs,
  providerRequestBudget,
  retryDelayBudgetMs,
  retryDelayMs,
};
