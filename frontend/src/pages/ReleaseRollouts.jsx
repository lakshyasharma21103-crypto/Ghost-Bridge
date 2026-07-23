import { ReleaseInventory, idOf } from '../components/ReleaseInventory.jsx';

export function ReleaseRollouts() {
  return (
    <ReleaseInventory
      title="Rollouts"
      description="Provider-neutral canary, rolling, regional, rollback, and roll-forward control-plane plans."
      endpoint="/releases/rollouts"
      detailPath={(item) => `/operations/release-rollouts/${encodeURIComponent(idOf(item))}`}
      emptyLabel="No rollout plans are visible."
      columns={[
        { label: 'Rollout', value: idOf },
        { label: 'Candidate', key: 'releaseCandidateId' },
        { label: 'Target', key: 'deploymentTargetId' },
        { label: 'Strategy', key: 'strategy' },
        { label: 'Status', key: 'status', status: true },
        { label: 'Stage', key: 'currentStage' },
        { label: 'Health', key: 'healthGateStatus', status: true },
        { label: 'Readiness', key: 'readinessGateStatus', status: true },
        { label: 'Migration', key: 'migrationStatus', status: true },
        { label: 'Canary', value: (item) => `${item.completedBatchCount || 0} batches` },
        { label: 'Rollback', key: 'rollbackReadinessStatus', status: true },
        { label: 'Started', key: 'startedAt', date: true },
      ]}
      actions={[
        { label: 'Begin production rollout', path: 'start', when: (item) => item.status === 'approved' },
        { label: 'Pause rollout', path: 'pause', when: (item) => ['deploying_canary', 'observing_canary', 'expanding'].includes(item.status) },
        { label: 'Rollback', path: 'rollback', when: (item) => ['paused', 'rollback_required'].includes(item.status) },
        { label: 'Roll-forward', path: 'roll-forward', when: (item) => item.status === 'roll_forward_required' },
      ]}
    />
  );
}
