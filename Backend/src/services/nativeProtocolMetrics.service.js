'use strict';

const counters = new Map();
const ALLOWED_CATEGORIES = new Set([
  'protocol_request',
  'protocol_version',
  'discovery',
  'passport',
  'install_grant',
  'connection',
  'invocation',
  'task_state',
  'delegation',
  'data_contract',
  'approval',
  'receipt',
  'revocation',
]);

function recordNativeProtocolMetric(category, outcome) {
  if (!ALLOWED_CATEGORIES.has(category)) return;
  const safeOutcome = /^[a-z][a-z0-9_]{0,63}$/.test(outcome) ? outcome : 'unknown';
  const key = `${category}:${safeOutcome}`;
  counters.set(key, (counters.get(key) || 0) + 1);
}

function nativeProtocolMetricsSnapshot() {
  return [...counters.entries()].map(([key, value]) => {
    const [category, outcome] = key.split(':');
    return { category, outcome, value };
  });
}

function resetNativeProtocolMetricsForTest() {
  counters.clear();
}

module.exports = {
  nativeProtocolMetricsSnapshot,
  recordNativeProtocolMetric,
  resetNativeProtocolMetricsForTest,
};
