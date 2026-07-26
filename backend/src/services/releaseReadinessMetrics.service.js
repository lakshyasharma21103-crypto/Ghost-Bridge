const counters = new Map();

const ALLOWED_LABELS = Object.freeze({
  release_candidate: ['status'],
  release_preflight: ['result'],
  release_secret_scan: ['result'],
  release_compatibility: ['result'],
  release_rollout: ['strategy', 'outcome'],
  release_manual_gate: ['result'],
  release_support_bundle: ['result'],
  release_worker_drain: ['category'],
  release_configuration_drift: ['category'],
});

function increment(metric, labels = {}, amount = 1) {
  const allowed = ALLOWED_LABELS[metric] || [];
  const safeLabels = Object.fromEntries(
    Object.entries(labels)
      .filter(([key]) => allowed.includes(key))
      .map(([key, value]) => [key, String(value).slice(0, 64)])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  const key = JSON.stringify([metric, safeLabels]);
  counters.set(key, (counters.get(key) || 0) + amount);
}

function snapshot() {
  return [...counters.entries()]
    .map(([key, value]) => {
      const [metric, labels] = JSON.parse(key);
      return { metric, labels, value };
    })
    .sort((left, right) =>
      `${left.metric}:${JSON.stringify(left.labels)}`.localeCompare(
        `${right.metric}:${JSON.stringify(right.labels)}`,
      ),
    );
}

function reset() {
  counters.clear();
}

module.exports = { ALLOWED_LABELS, increment, reset, snapshot };
