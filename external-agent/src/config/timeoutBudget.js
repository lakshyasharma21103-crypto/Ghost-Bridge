const DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS = 500_000;
const DEFAULT_GEMINI_RESEARCH_TIMEOUT_MS = 120_000;
const DEFAULT_GEMINI_FORMATTING_TIMEOUT_MS = 60_000;
const DEFAULT_LIVE_VERIFIER_TIMEOUT_MS = 520_000;
const DEFAULT_BACKEND_RUNTIME_GATEWAY_TIMEOUT_MS = 540_000;
const GEMINI_PROCESSING_OVERHEAD_MS = 10_000;
const GEMINI_RETRY_BASE_DELAY_MS = 1_000;
const GEMINI_RETRY_JITTER_MS = 500;

function boundedAttempts(value) {
  const attempts = Number(value);
  return Number.isInteger(attempts) && attempts >= 1 && attempts <= 2 ? attempts : 1;
}

function retryDelayMs(attemptNumber, randomValue = Math.random()) {
  const completedAttempt = Math.max(1, Number(attemptNumber) || 1);
  const normalizedRandom = Math.min(0.999_999, Math.max(0, Number(randomValue) || 0));
  return (
    GEMINI_RETRY_BASE_DELAY_MS * 2 ** Math.max(0, completedAttempt - 1) +
    Math.floor(normalizedRandom * GEMINI_RETRY_JITTER_MS)
  );
}

function retryDelayBudgetMs(maxAttempts) {
  const attempts = boundedAttempts(maxAttempts);
  let total = 0;
  for (let attemptNumber = 1; attemptNumber < attempts; attemptNumber += 1) {
    total += retryDelayMs(attemptNumber, 0.999_999);
  }
  return total;
}

function operationBudgetMs(attemptTimeoutMs, maxAttempts) {
  const attempts = boundedAttempts(maxAttempts);
  return Number(attemptTimeoutMs) * attempts + retryDelayBudgetMs(attempts);
}

function providerRequestBudget(configuration = {}) {
  const researchOperationTimeoutMs = operationBudgetMs(
    configuration.researchTimeoutMs,
    configuration.researchMaxAttempts,
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
  DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS,
  DEFAULT_GEMINI_FORMATTING_TIMEOUT_MS,
  DEFAULT_GEMINI_RESEARCH_TIMEOUT_MS,
  DEFAULT_LIVE_VERIFIER_TIMEOUT_MS,
  GEMINI_PROCESSING_OVERHEAD_MS,
  GEMINI_RETRY_BASE_DELAY_MS,
  GEMINI_RETRY_JITTER_MS,
  operationBudgetMs,
  providerRequestBudget,
  retryDelayBudgetMs,
  retryDelayMs,
};
