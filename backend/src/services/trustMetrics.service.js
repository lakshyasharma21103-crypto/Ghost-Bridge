const counters = new Map();
const ALLOWED_LABELS = new Set([
  'outcome',
  'category',
  'algorithm',
  'keyState',
  'freshness',
]);

function increment(name, labels = {}, amount = 1) {
  const boundedLabels = Object.entries(labels)
    .filter(([key]) => ALLOWED_LABELS.has(key))
    .map(([key, value]) => [key, String(value).slice(0, 64)])
    .sort(([left], [right]) => left.localeCompare(right));
  const key = `${String(name).slice(0, 100)}{${boundedLabels
    .map(([label, value]) => `${label}=${value}`)
    .join(',')}}`;
  counters.set(key, (counters.get(key) || 0) + Math.max(0, Number(amount) || 0));
}

function snapshot() {
  return Object.fromEntries(counters);
}

function reset() {
  counters.clear();
}

module.exports = { ALLOWED_LABELS, increment, reset, snapshot };
