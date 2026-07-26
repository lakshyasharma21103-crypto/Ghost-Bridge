const counters = new Map();
const durations = new Map();
const ALLOWED_LABELS = new Set([
  'status',
  'outcome',
  'reason',
  'classification',
  'depth',
  'sizeCategory',
]);

function labelKey(labels = {}) {
  return Object.entries(labels)
    .filter(([key]) => ALLOWED_LABELS.has(key))
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
  return { counters: Object.fromEntries(counters), durations: Object.fromEntries(durations) };
}

function reset() {
  counters.clear();
  durations.clear();
}

module.exports = { increment, observe, reset, snapshot };
