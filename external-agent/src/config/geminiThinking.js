const { ThinkingLevel } = require('@google/genai');

const SUPPORTED_THINKING_LEVELS = Object.freeze(
  Object.keys(ThinkingLevel)
    .filter((name) => name !== 'THINKING_LEVEL_UNSPECIFIED')
    .map((name) => name.toLowerCase()),
);
const SDK_THINKING_LEVELS = new Map(
  SUPPORTED_THINKING_LEVELS.map((level) => [level, ThinkingLevel[level.toUpperCase()]]),
);

function optionalEnvironmentValue(value) {
  if (value === undefined) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}

function safeModelName(model) {
  if (model === '[not configured]' || model === '[invalid model identifier]') return model;
  if (typeof model !== 'string' || model.trim() === '') return '[not configured]';
  const value = model.trim();
  return /^(?:(?:models|tunedModels)\/)?[A-Za-z0-9][A-Za-z0-9._-]{1,127}$/.test(value)
    ? value
    : '[invalid model identifier]';
}

function modelFamily(model) {
  if (typeof model !== 'string') return undefined;
  const modelId = model
    .trim()
    .replace(/^(?:models|tunedModels)\//i, '')
    .toLowerCase();
  if (modelId.startsWith('gemini-3')) return 'gemini-3';
  if (modelId.startsWith('gemini-2.5')) return 'gemini-2.5';
  return undefined;
}

function issue(field, model, reason) {
  return Object.freeze({ field, model: safeModelName(model), reason });
}

function resolveGeminiThinkingConfiguration({ model, thinkingLevel, thinkingBudget } = {}) {
  const rawLevel = optionalEnvironmentValue(thinkingLevel);
  const rawBudget = optionalEnvironmentValue(thinkingBudget);
  let normalizedLevel;
  let normalizedBudget;

  if (rawLevel !== undefined) {
    normalizedLevel = typeof rawLevel === 'string' ? rawLevel.trim().toLowerCase() : undefined;
    if (!normalizedLevel || !SDK_THINKING_LEVELS.has(normalizedLevel)) {
      return {
        issue: issue(
          'GEMINI_THINKING_LEVEL',
          model,
          `must be one of the levels supported by the installed Gemini SDK: ${SUPPORTED_THINKING_LEVELS.join(', ')}`,
        ),
      };
    }
  }

  if (rawBudget !== undefined) {
    normalizedBudget =
      typeof rawBudget === 'number' || typeof rawBudget === 'string'
        ? Number(rawBudget)
        : Number.NaN;
    if (!Number.isInteger(normalizedBudget) || normalizedBudget < 0) {
      return {
        issue: issue('GEMINI_THINKING_BUDGET', model, 'must be a non-negative integer'),
      };
    }
  }

  const family = modelFamily(model);
  if (family === 'gemini-3' && normalizedBudget !== undefined) {
    return {
      issue: issue(
        'GEMINI_THINKING_BUDGET',
        model,
        'is not supported by gemini-3 models; use GEMINI_THINKING_LEVEL or omit thinking configuration',
      ),
    };
  }
  if (family === 'gemini-2.5' && normalizedLevel !== undefined) {
    return {
      issue: issue(
        'GEMINI_THINKING_LEVEL',
        model,
        'is not supported by gemini-2.5 models; use GEMINI_THINKING_BUDGET or omit thinking configuration',
      ),
    };
  }
  if (!family && (normalizedLevel !== undefined || normalizedBudget !== undefined)) {
    return {
      issue: issue(
        normalizedLevel !== undefined ? 'GEMINI_THINKING_LEVEL' : 'GEMINI_THINKING_BUDGET',
        model,
        'cannot be used because thinking capabilities are not defined for this model family',
      ),
    };
  }

  let thinkingConfig;
  if (family === 'gemini-3' && normalizedLevel !== undefined) {
    thinkingConfig = Object.freeze({ thinkingLevel: SDK_THINKING_LEVELS.get(normalizedLevel) });
  } else if (family === 'gemini-2.5' && normalizedBudget !== undefined) {
    thinkingConfig = Object.freeze({ thinkingBudget: normalizedBudget });
  }

  return {
    issue: undefined,
    thinkingLevel: normalizedLevel,
    thinkingBudget: normalizedBudget,
    thinkingConfig,
  };
}

module.exports = {
  SUPPORTED_THINKING_LEVELS,
  resolveGeminiThinkingConfiguration,
  safeModelName,
};
