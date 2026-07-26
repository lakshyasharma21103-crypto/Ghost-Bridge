const counters = new Map();

const ALLOWED_LABELS = Object.freeze({
  staging_deployment: ['status'],
  staging_smoke_run: ['outcome'],
  capability_gate: ['status', 'capability_category'],
  pilot_program: ['status'],
  pilot_enrollment: ['scope', 'status'],
  pilot_admission: ['outcome'],
  pilot_incident: ['severity', 'origin'],
  pilot_support_case: ['category', 'status'],
  pilot_feedback: ['category', 'status'],
  pilot_launch_blocker: ['category', 'status'],
  pilot_health: ['status'],
  pilot_readiness: ['status'],
  pilot_kill_switch: ['switch_category', 'action'],
  pilot_graduation: ['outcome'],
});

function increment(metric, labels = {}, amount = 1) {
  const allowed = ALLOWED_LABELS[metric] || [];
  const bounded = Object.fromEntries(
    Object.entries(labels)
      .filter(([key]) => allowed.includes(key))
      .map(([key, value]) => [key, String(value).slice(0, 64)])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  const key = JSON.stringify([metric, bounded]);
  counters.set(key, (counters.get(key) || 0) + Number(amount || 1));
}

function snapshot() {
  return [...counters.entries()]
    .map(([key, value]) => {
      const [metric, labels] = JSON.parse(key);
      return { metric, labels, value };
    })
    .sort((left, right) => `${left.metric}:${JSON.stringify(left.labels)}`.localeCompare(`${right.metric}:${JSON.stringify(right.labels)}`));
}

function reset() {
  counters.clear();
}

module.exports = { ALLOWED_LABELS, increment, reset, snapshot };
