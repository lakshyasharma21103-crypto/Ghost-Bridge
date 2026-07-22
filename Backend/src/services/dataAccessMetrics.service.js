const counters = new Map();
const gauges = new Map();
const histograms = new Map();
const SAFE_LABELS = new Set([
  'queryShapeId', 'queryCategory', 'operationType', 'status', 'safeFailureCode', 'indexUsageCategory',
  'cacheNamespace', 'cacheOutcome', 'adapterType', 'healthCategory', 'lagCategory', 'sizeCategory',
  'durationCategory', 'resultCountCategory', 'poolUsageCategory', 'poolWaitCategory', 'operation',
]);
const FORBIDDEN_LABEL = /(organization|workspace|tenant|run|node|trace|request|user|passport|connection|entity).*id/i;
const MAX_SERIES = 3_000;

function boundedLabelValue(value) {
  const candidate = String(value ?? 'none');
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/.test(candidate) ? candidate : 'invalid';
}

function labelKey(labels = {}) {
  return Object.entries(labels)
    .filter(([key]) => SAFE_LABELS.has(key) && !FORBIDDEN_LABEL.test(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${boundedLabelValue(value)}`)
    .join(',');
}

function key(name, labels) {
  return `${String(name).slice(0, 120)}{${labelKey(labels)}}`;
}

function setBounded(map, series, value) {
  if (map.has(series) || map.size < MAX_SERIES) map.set(series, value);
}

function increment(name, labels = {}, amount = 1) {
  const series = key(name, labels);
  setBounded(counters, series, (counters.get(series) || 0) + Math.max(0, Number(amount) || 0));
}

function gauge(name, labels = {}, value = 0) {
  setBounded(gauges, key(name, labels), Math.max(0, Number(value) || 0));
}

function observe(name, labels = {}, value = 0) {
  const series = key(name, labels);
  const values = histograms.get(series) || [];
  values.push(Math.max(0, Number(value) || 0));
  if (values.length > 1_000) values.shift();
  setBounded(histograms, series, values);
}

function snapshot() {
  return {
    counters: Object.fromEntries(counters),
    gauges: Object.fromEntries(gauges),
    histograms: Object.fromEntries([...histograms].map(([series, values]) => [series, {
      count: values.length,
      maximum: values.length ? Math.max(...values) : 0,
      average: values.length ? Math.round(values.reduce((total, item) => total + item, 0) / values.length) : 0,
    }])),
  };
}

function assertBoundedMetricLabels(metricSnapshot = snapshot()) {
  const keys = [...Object.keys(metricSnapshot.counters || {}), ...Object.keys(metricSnapshot.gauges || {}), ...Object.keys(metricSnapshot.histograms || {})];
  if (keys.some((series) => FORBIDDEN_LABEL.test(series))) throw new Error('High-cardinality identifier found in data-access metric labels.');
  return true;
}

function reset() {
  counters.clear();
  gauges.clear();
  histograms.clear();
}

module.exports = { assertBoundedMetricLabels, gauge, increment, observe, reset, snapshot };
