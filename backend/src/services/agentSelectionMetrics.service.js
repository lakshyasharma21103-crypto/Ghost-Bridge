const counters = new Map();
const durations = new Map();
const ALLOWED_LABELS = new Set(['status', 'reason', 'category', 'trustTier', 'outcome']);

function labels(input = {}) {
  return Object.entries(input)
    .filter(([key]) => ALLOWED_LABELS.has(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value).slice(0, 64)}`)
    .join(',');
}

function increment(name, input = {}, amount = 1) {
  const key = `${name}{${labels(input)}}`;
  counters.set(key, (counters.get(key) || 0) + Math.max(0, Number(amount) || 0));
}

function observe(name, value) {
  const list = durations.get(name) || [];
  list.push(Math.max(0, Number(value) || 0));
  if (list.length > 1_000) list.shift();
  durations.set(name, list);
}

function snapshot() {
  return { counters: Object.fromEntries(counters), durations: Object.fromEntries(durations) };
}

function reset() {
  counters.clear();
  durations.clear();
}

module.exports = { increment, observe, reset, snapshot };
