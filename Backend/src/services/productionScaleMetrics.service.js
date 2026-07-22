const counters = new Map();
const gauges = new Map();
const durations = new Map();

const SAFE_LABELS = new Set([
  'workloadCategory',
  'workerPool',
  'status',
  'outcome',
  'safeReasonCode',
  'loadCategory',
  'queueAgeCategory',
  'capacityCategory',
  'recommendation',
  'pressureCategory',
  'usageCategory',
  'operation',
  'routingVersion',
]);
const FORBIDDEN_LABEL = /(run|node|tenant|organization|workspace|passport|connection|worker|partition|trace|request).*id|key/i;
const MAX_SERIES = 2_000;

function labelKey(labels = {}) {
  return Object.entries(labels)
    .filter(([key]) => SAFE_LABELS.has(key) && !FORBIDDEN_LABEL.test(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value).slice(0, 64)}`)
    .join(',');
}

function seriesKey(name, labels) {
  return `${String(name).slice(0, 96)}{${labelKey(labels)}}`;
}

function boundedSet(map, key, value) {
  if (map.has(key) || map.size < MAX_SERIES) map.set(key, value);
}

function increment(name, labels = {}, amount = 1) {
  const key = seriesKey(name, labels);
  boundedSet(counters, key, (counters.get(key) || 0) + Math.max(0, Number(amount) || 0));
}

function gauge(name, labels = {}, value = 0) {
  boundedSet(gauges, seriesKey(name, labels), Math.max(0, Number(value) || 0));
}

function observe(name, durationMs) {
  const key = String(name).slice(0, 96);
  const values = durations.get(key) || [];
  values.push(Math.max(0, Number(durationMs) || 0));
  if (values.length > 1_000) values.shift();
  durations.set(key, values);
}

function snapshot() {
  return {
    counters: Object.fromEntries(counters),
    gauges: Object.fromEntries(gauges),
    durations: Object.fromEntries([...durations].map(([name, values]) => [name, {
      count: values.length,
      maximum: values.length ? Math.max(...values) : 0,
      average: values.length
        ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100
        : 0,
    }])),
  };
}

function reset() {
  counters.clear();
  gauges.clear();
  durations.clear();
}

module.exports = { gauge, increment, observe, reset, snapshot };
