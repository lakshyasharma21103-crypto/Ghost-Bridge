const counters = new Map();
const durations = new Map();
const APPROVED_LABELS = new Set(['status', 'outcome', 'reason', 'category', 'operation']);

function labelKey(labels = {}) {
  return Object.entries(labels)
    .filter(([key]) => APPROVED_LABELS.has(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value).slice(0, 64)}`)
    .join(',');
}

function increment(name, labels = {}, amount = 1) {
  const key = `${name}{${labelKey(labels)}}`;
  counters.set(key, (counters.get(key) || 0) + Math.max(0, Number(amount) || 0));
}

function observe(name, durationMs) {
  const values = durations.get(name) || [];
  values.push(Math.max(0, Number(durationMs) || 0));
  if (values.length > 1_000) values.shift();
  durations.set(name, values);
}

function snapshot() {
  return {
    counters: Object.fromEntries(counters),
    durations: Object.fromEntries(
      [...durations].map(([name, values]) => [
        name,
        {
          count: values.length,
          maximum: values.length ? Math.max(...values) : 0,
          average: values.length
            ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) /
              100
            : 0,
        },
      ]),
    ),
  };
}

function reset() {
  counters.clear();
  durations.clear();
}

module.exports = { increment, observe, reset, snapshot };
