const counters = new Map();

const ALLOWED_LABELS = Object.freeze({
  analytics_events_accepted: ['event_domain'],
  analytics_events_rejected: ['safe_reason'],
  analytics_duplicates: ['event_domain'],
  analytics_redactions: ['event_domain'],
  analytics_schema_failures: ['event_domain'],
  analytics_projection_lag: ['lag_category'],
  analytics_instrumentation_coverage: ['coverage_category'],
  analytics_data_quality: ['quality_category'],
  analytics_funnel_evaluation: ['outcome'],
  analytics_cohort_evaluation: ['outcome'],
  analytics_experiment_state: ['state'],
  analytics_experiment_guardrail: ['outcome'],
  analytics_backfill_status: ['status'],
  analytics_export_status: ['status'],
  analytics_evidence_status: ['status'],
});

function increment(metric, labels = {}, amount = 1) {
  const allowlist = ALLOWED_LABELS[metric] || [];
  const bounded = Object.fromEntries(
    Object.entries(labels)
      .filter(([key]) => allowlist.includes(key))
      .map(([key, value]) => [key, String(value || 'unknown').slice(0, 64)])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  const key = JSON.stringify([metric, bounded]);
  counters.set(key, (counters.get(key) || 0) + Math.max(0, Number(amount || 1)));
}

function snapshot() {
  return [...counters].map(([key, value]) => {
    const [metric, labels] = JSON.parse(key);
    return { metric, labels, value };
  }).sort((left, right) => `${left.metric}:${JSON.stringify(left.labels)}`.localeCompare(`${right.metric}:${JSON.stringify(right.labels)}`));
}

function reset() {
  counters.clear();
}

module.exports = { ALLOWED_LABELS, increment, reset, snapshot };
