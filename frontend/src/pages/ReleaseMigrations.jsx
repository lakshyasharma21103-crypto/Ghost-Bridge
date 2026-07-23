import { ReleaseInventory, idOf } from '../components/ReleaseInventory.jsx';

export function ReleaseMigrations() {
  return (
    <ReleaseInventory
      title="Migrations"
      description="Code-defined, checkpointed, fenced migration plans with expand-and-contract and rollback safety."
      endpoint="/releases/migrations"
      emptyLabel="No release migration plans are visible."
      columns={[
        { label: 'Migration', value: idOf },
        { label: 'Release', key: 'releaseCandidateId' },
        { label: 'Strategy', key: 'migrationStrategy' },
        { label: 'Status', key: 'status', status: true },
        { label: 'Compatibility', value: (item) => item.safeReasonCodes?.length ? 'blocked' : 'compatible', status: true },
        { label: 'Batch progress', value: () => 'checkpointed' },
        { label: 'Checkpoint', value: () => 'durable' },
        { label: 'Rollback safety', key: 'rollbackStrategy', status: true },
        { label: 'Updated', key: 'updatedAt', date: true },
      ]}
      actions={[
        { label: 'Execute migration', path: 'execute', when: (item) => ['validated', 'approved'].includes(item.status) },
        { label: 'Pause migration', path: 'pause', when: (item) => item.status === 'executing' },
        { label: 'Resume migration', path: 'resume', when: (item) => item.status === 'paused' },
      ]}
    />
  );
}
