const counters = new Map();
const brokerDurations = [];
const APPROVED_LABELS = new Set(['outcome', 'reason', 'operation', 'status', 'keyVersion']);

function safeLabels(labels = {}) {
  return Object.entries(labels)
    .filter(([key]) => APPROVED_LABELS.has(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value).slice(0, 64)}`)
    .join(',');
}

function increment(name, labels = {}, amount = 1) {
  const key = `${name}{${safeLabels(labels)}}`;
  const value = Math.max(0, Number(amount) || 0);
  counters.set(key, (counters.get(key) || 0) + value);
}

function observeBrokerDuration(durationMs) {
  brokerDurations.push(Math.max(0, Number(durationMs) || 0));
  if (brokerDurations.length > 1_000) brokerDurations.shift();
}

function snapshot() {
  return {
    counters: Object.fromEntries(counters),
    brokerDurationMs: {
      count: brokerDurations.length,
      maximum: brokerDurations.length ? Math.max(...brokerDurations) : 0,
      average: brokerDurations.length
        ? Math.round(
            (brokerDurations.reduce((sum, value) => sum + value, 0) / brokerDurations.length) * 100,
          ) / 100
        : 0,
    },
  };
}

function reset() {
  counters.clear();
  brokerDurations.length = 0;
}

module.exports = { increment, observeBrokerDuration, reset, snapshot };
