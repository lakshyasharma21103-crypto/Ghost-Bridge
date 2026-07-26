const counters = new Map();
const gauges = new Map();
const histograms = new Map();

const SAFE_LABELS = new Set([
  'backpressureState',
  'budgetEvaluationState',
  'cacheHitCategory',
  'capacityConfidenceCategory',
  'cleanupResult',
  'concurrencyCategory',
  'databasePressureCategory',
  'environmentCategory',
  'expectedRejectionCategory',
  'fairnessCategory',
  'headroomCategory',
  'latencyCategory',
  'latencyType',
  'leaseExpiryCategory',
  'mode',
  'operation',
  'outcome',
  'queueWaitCategory',
  'recommendationCategory',
  'recoveryPerformanceCategory',
  'regionalSimulationCategory',
  'regressionState',
  'safeReasonCode',
  'stage',
  'status',
  'successCategory',
  'targetCategory',
  'throughputCategory',
  'timeoutCategory',
  'trafficModel',
  'unexpectedFailureCategory',
  'workerUtilizationCategory',
  'workloadDomain',
]);

const FORBIDDEN_LABEL =
  /(organization|workspace|tenant|performance.?run|scenario|baseline|user|request|trace|passport|connection|worker).*id|target.?url|raw.?target|partition.?key/i;
const SAFE_METRIC_NAME = /^[A-Za-z][A-Za-z0-9_.:-]{0,95}$/;
const SAFE_LABEL_VALUE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const MAX_SERIES = 3_000;
const HISTOGRAM_BUCKETS = Object.freeze([
  1,
  5,
  10,
  25,
  50,
  100,
  250,
  500,
  1_000,
  2_500,
  5_000,
  10_000,
  30_000,
  60_000,
  300_000,
]);

function boundedMetricName(value) {
  const candidate = String(value || 'performance_metric').trim();
  return SAFE_METRIC_NAME.test(candidate) ? candidate : 'performance_metric_invalid';
}

function boundedLabelValue(value) {
  const candidate = String(value ?? 'none').trim();
  return SAFE_LABEL_VALUE.test(candidate) ? candidate : 'invalid';
}

function labelKey(labels = {}) {
  if (!labels || typeof labels !== 'object' || Array.isArray(labels)) return '';
  return Object.entries(labels)
    .filter(([key]) => SAFE_LABELS.has(key) && !FORBIDDEN_LABEL.test(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${boundedLabelValue(value)}`)
    .join(',');
}

function seriesKey(name, labels = {}) {
  return `${boundedMetricName(name)}{${labelKey(labels)}}`;
}

function boundedNumber(value) {
  const candidate = Number(value);
  if (!Number.isFinite(candidate) || candidate < 0) return 0;
  return Math.min(candidate, Number.MAX_SAFE_INTEGER);
}

function setBounded(map, key, value) {
  if (map.has(key) || map.size < MAX_SERIES) map.set(key, value);
}

function increment(name, labels = {}, amount = 1) {
  const key = seriesKey(name, labels);
  setBounded(
    counters,
    key,
    Math.min(
      Number.MAX_SAFE_INTEGER,
      (counters.get(key) || 0) + boundedNumber(amount),
    ),
  );
}

function gauge(name, labels = {}, value = 0) {
  setBounded(gauges, seriesKey(name, labels), boundedNumber(value));
}

function observe(name, labels = {}, value = 0) {
  let normalizedLabels = labels;
  let normalizedValue = value;
  if (typeof labels === 'number') {
    normalizedLabels = {};
    normalizedValue = labels;
  }
  const key = seriesKey(name, normalizedLabels);
  const measurement = boundedNumber(normalizedValue);
  const current = histograms.get(key) || {
    count: 0,
    sum: 0,
    maximum: 0,
    buckets: Array(HISTOGRAM_BUCKETS.length + 1).fill(0),
  };
  const bucketIndex = HISTOGRAM_BUCKETS.findIndex((upperBound) => measurement <= upperBound);
  current.count += 1;
  current.sum = Math.min(Number.MAX_SAFE_INTEGER, current.sum + measurement);
  current.maximum = Math.max(current.maximum, measurement);
  current.buckets[bucketIndex === -1 ? HISTOGRAM_BUCKETS.length : bucketIndex] += 1;
  setBounded(histograms, key, current);
}

function snapshot() {
  return {
    counters: Object.fromEntries(counters),
    gauges: Object.fromEntries(gauges),
    histograms: Object.fromEntries(
      [...histograms].map(([series, value]) => [
        series,
        {
          count: value.count,
          maximum: value.maximum,
          average: value.count
            ? Math.round((value.sum / value.count) * 100) / 100
            : 0,
          buckets: Object.fromEntries([
            ...HISTOGRAM_BUCKETS.map((upperBound, index) => [
              `le_${upperBound}`,
              value.buckets
                .slice(0, index + 1)
                .reduce((total, count) => total + count, 0),
            ]),
            ['overflow', value.buckets[HISTOGRAM_BUCKETS.length]],
          ]),
        },
      ]),
    ),
  };
}

function assertSafeSeries(series) {
  const match = /^([^{}]+)\{([^{}]*)\}$/.exec(String(series));
  if (!match || !SAFE_METRIC_NAME.test(match[1])) {
    throw new Error('Performance metric series name is invalid.');
  }
  if (!match[2]) return;
  for (const pair of match[2].split(',')) {
    const separator = pair.indexOf('=');
    const key = separator === -1 ? '' : pair.slice(0, separator);
    const value = separator === -1 ? '' : pair.slice(separator + 1);
    if (
      !SAFE_LABELS.has(key) ||
      FORBIDDEN_LABEL.test(key) ||
      !SAFE_LABEL_VALUE.test(value)
    ) {
      throw new Error('High-cardinality or unbounded performance metric label found.');
    }
  }
}

function assertBoundedMetricLabels(metricSnapshot = snapshot()) {
  const families = [
    metricSnapshot?.counters || {},
    metricSnapshot?.gauges || {},
    metricSnapshot?.histograms || {},
    metricSnapshot?.durations || {},
  ];
  for (const family of families) {
    const series = Object.keys(family);
    if (series.length > MAX_SERIES) {
      throw new Error('Performance metric series limit exceeded.');
    }
    series.forEach(assertSafeSeries);
  }
  return true;
}

function reset() {
  counters.clear();
  gauges.clear();
  histograms.clear();
}

module.exports = {
  assertBoundedMetricLabels,
  gauge,
  increment,
  observe,
  reset,
  snapshot,
};
