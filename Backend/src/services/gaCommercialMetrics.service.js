const counters = new Map();

const ALLOWED_LABELS = Object.freeze({
  commercial_entitlement_evaluation: ['outcome'],
  commercial_entitlement_cache: ['result'],
  commercial_subscription_transition: ['outcome'],
  commercial_trial_transition: ['outcome'],
  commercial_usage_record: ['outcome', 'exclusion_reason'],
  commercial_usage_duplicate: ['category'],
  commercial_reconciliation: ['status'],
  commercial_invoice_preview: ['status'],
  commercial_invoice_finalization: ['status'],
  commercial_payment_adapter: ['adapter', 'result'],
  commercial_refund: ['status'],
  commercial_dispute: ['status'],
  commercial_dunning: ['status'],
  ga_readiness: ['status'],
  ga_rollout: ['status'],
  commercial_kill_switch: ['state'],
});

function increment(metric, labels = {}, amount = 1) {
  const allowlist = ALLOWED_LABELS[metric] || [];
  const bounded = Object.fromEntries(Object.entries(labels)
    .filter(([key]) => allowlist.includes(key))
    .map(([key, value]) => [key, String(value || 'unknown').slice(0, 64)])
    .sort(([left], [right]) => left.localeCompare(right)));
  const key = JSON.stringify([metric, bounded]);
  counters.set(key, (counters.get(key) || 0) + Math.max(0, Number(amount || 1)));
}

function snapshot() {
  return [...counters].map(([key, value]) => {
    const [metric, labels] = JSON.parse(key);
    return { metric, labels, value };
  }).sort((left, right) => `${left.metric}:${JSON.stringify(left.labels)}`.localeCompare(`${right.metric}:${JSON.stringify(right.labels)}`));
}

function reset() { counters.clear(); }

module.exports = { ALLOWED_LABELS, increment, reset, snapshot };
