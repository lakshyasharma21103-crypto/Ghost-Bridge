const counters = new Map();
const durations = [];
const APPROVED_LABELS = new Set(['outcome', 'reason', 'operation', 'cache']);

function labelKey(labels = {}) {
  return Object.entries(labels)
    .filter(([key]) => APPROVED_LABELS.has(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value).slice(0, 64)}`)
    .join(',');
}

function increment(name, labels = {}) {
  const key = `${name}{${labelKey(labels)}}`;
  counters.set(key, (counters.get(key) || 0) + 1);
}

function observeDuration(durationMs) {
  durations.push(Math.max(0, Number(durationMs) || 0));
  if (durations.length > 1_000) durations.shift();
}

function snapshot() {
  return {
    counters: Object.fromEntries(counters),
    evaluationDurationMs: {
      count: durations.length,
      maximum: durations.length ? Math.max(...durations) : 0,
      average: durations.length
        ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 100) /
          100
        : 0,
    },
  };
}

function reset() {
  counters.clear();
  durations.length = 0;
}

module.exports = { increment, observeDuration, reset, snapshot };
