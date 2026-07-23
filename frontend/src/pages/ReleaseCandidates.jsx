import { ReleaseInventory, idOf } from '../components/ReleaseInventory.jsx';

export function ReleaseCandidates() {
  return (
    <ReleaseInventory
      title="Release Candidates"
      description="Immutable source identity, build evidence, compatibility, migration risk, approvals, and release status."
      endpoint="/releases/candidates"
      detailPath={(item) => `/operations/release-candidates/${encodeURIComponent(idOf(item))}`}
      emptyLabel="No release candidates are visible."
      columns={[
        { label: 'Candidate', value: (item) => item.name || item.releaseCandidateId },
        { label: 'Version', key: 'version' },
        { label: 'Source revision', value: (item) => item.sourceRevision?.slice(0, 12) },
        { label: 'Status', key: 'status', status: true },
        { label: 'Validation', value: (item) => item.readinessSummary?.status, status: true },
        { label: 'Risk', value: (item) => item.riskSummary?.status, status: true },
        { label: 'Migration', value: (item) => item.migrationSummary?.status, status: true },
        { label: 'Compatibility', value: (item) => item.readinessSummary?.status, status: true },
        { label: 'Performance', value: () => 'evidence' },
        { label: 'DR', value: () => 'evidence' },
        { label: 'Approval', value: (item) => item.approvedAt ? 'approved' : 'required', status: true },
        { label: 'Created', key: 'createdAt', date: true },
      ]}
      actions={[
        { label: 'Validate', path: 'validate', when: (item) => ['draft', 'validation_failed'].includes(item.status) },
        { label: 'Approve release', path: 'approve', when: (item) => ['ready_for_approval', 'approval_required'].includes(item.status) },
      ]}
    />
  );
}
