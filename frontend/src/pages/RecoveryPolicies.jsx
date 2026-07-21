import { Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { JsonEditor } from '../components/JsonEditor.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, PageHeader, Panel, PrimaryButton, SecondaryButton } from './pageChrome.jsx';

const STARTER_POLICY = JSON.stringify(
  {
    name: 'Standard orchestration recovery',
    description: 'Bounded retry, intervention, and explicit compensation controls.',
    defaultFailureStrategy: 'request_intervention',
    maximumRecoveryAttempts: 2,
    maximumCompensationAttempts: 2,
    recoveryBackoffPolicy: { baseDelayMs: 1000, maximumDelayMs: 30000, jitterPercent: 10 },
    compensationBackoffPolicy: { baseDelayMs: 1000, maximumDelayMs: 30000, jitterPercent: 10 },
    recoveryDeadlineMs: 900000,
    compensationDeadlineMs: 900000,
    allowOperatorRetry: true,
    allowOperatorSkip: false,
    allowOperatorResume: true,
    allowOperatorCompensate: true,
    allowOperatorTerminate: false,
    allowOperatorAgentReplacement: false,
    allowOperatorInputCorrection: false,
    requireApprovalForRetry: false,
    requireApprovalForSkip: true,
    requireApprovalForCompensation: true,
    requireApprovalForAgentReplacement: true,
    requireApprovalForInputCorrection: true,
    requireApprovalForForceTermination: true,
    permittedFailureCategories: ['transient_network', 'timeout', 'rate_limited', 'provider_unavailable'],
    nonRecoverableFailureCategories: ['policy_denied', 'authorization_denied', 'connection_revoked', 'passport_revoked', 'non_reversible_failure'],
    automaticCompensation: false,
    compensateOnCancellation: false,
    compensateOnTimeout: false,
    compensateOnPolicyRevocation: false,
    compensateOnConnectionRevocation: false,
    compensationOrdering: 'reverse_topological',
    continueCompensationAfterFailure: false,
    maximumParallelCompensations: 1,
  },
  null,
  2,
);

function tone(status) {
  if (status === 'active') return 'ready';
  if (status === 'archived') return 'neutral';
  return 'pending';
}

function approvalSummary(policy) {
  const fields = [
    'requireApprovalForRetry',
    'requireApprovalForSkip',
    'requireApprovalForCompensation',
    'requireApprovalForAgentReplacement',
    'requireApprovalForInputCorrection',
    'requireApprovalForForceTermination',
  ];
  const count = fields.filter((field) => policy[field] === true).length;
  return count ? `${count} action${count === 1 ? '' : 's'}` : 'None';
}

export function RecoveryPolicies() {
  const navigate = useNavigate();
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, items: [] });
  const [draft, setDraft] = useState(STARTER_POLICY);
  const [creating, setCreating] = useState(false);
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }),
    [identity.receivingWorkspaceId],
  );
  const load = useCallback(() => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null, items: [] });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    apiClient.get(`/orchestration-recovery/policies?${query}`)
      .then((data) => setState({ loading: false, error: null, items: data.items || [] }))
      .catch((error) => setState({ loading: false, error, items: [] }));
  }, [partnerConfigured, query]);
  useEffect(() => load(), [load]);

  async function create(event) {
    event.preventDefault();
    setCreating(true);
    try {
      const policy = await apiClient.post('/orchestration-recovery/policies', {
        ...JSON.parse(draft),
        workspaceId: identity.receivingWorkspaceId,
      });
      recordEvent('Recovery policy draft created', `${policy.name} v${policy.version}`, 'success');
      navigate(`/recovery-policies/${policy.policyId}`);
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Durable recovery governance"
        title="Recovery Policies"
        description="Versioned workspace controls bound retries, intervention, compensation, expiry, and operator decisions."
        actions={<SecondaryButton onClick={load} disabled={state.loading || !partnerConfigured}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} /> Refresh</SecondaryButton>}
      />
      {state.error ? <ErrorAlert error={state.error} title="Recovery policy request failed" /> : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)]">
        <div>
          {state.loading ? <LoadingBlock label="Loading recovery policies" /> : null}
          {!state.loading && state.items.length ? (
            <div className="overflow-x-auto border border-slate-200 bg-white">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Name</th><th>Version</th><th>Status</th><th>Default strategy</th><th>Automatic compensation</th><th>Maximum retries</th><th>Maximum compensations</th><th>Approval requirements</th><th>Updated</th><th>Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {state.items.map((policy) => (
                    <tr key={policy.policyId} className="hover:bg-slate-50">
                      <td className="px-4 py-3"><Link to={`/recovery-policies/${policy.policyId}`} className="font-medium text-slate-950 hover:text-cyan-800">{policy.name}</Link><p className="mt-1 max-w-52 truncate text-xs text-slate-500">{policy.description || 'No description'}</p></td>
                      <td>v{policy.version}</td>
                      <td><StatusBadge tone={tone(policy.status)}>{policy.status}</StatusBadge></td>
                      <td className="font-mono text-xs">{policy.defaultFailureStrategy}</td>
                      <td>{policy.automaticCompensation ? 'Enabled' : 'Disabled'}</td>
                      <td>{policy.maximumRecoveryAttempts}</td>
                      <td>{policy.maximumCompensationAttempts}</td>
                      <td>{approvalSummary(policy)}</td>
                      <td className="text-xs text-slate-600">{formatDate(policy.updatedAt)}</td>
                      <td><Link to={`/recovery-policies/${policy.policyId}`} className="font-medium text-cyan-800">Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {!state.loading && !state.items.length ? <EmptyState title="No recovery policies" detail="Create and validate a bounded draft before attaching it to an orchestration." /> : null}
        </div>
        <Panel>
          <h2 className="font-semibold">Create policy draft</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Only fixed strategies, bounded limits, categories, operator controls, approvals, and ordering fields are accepted.</p>
          <form className="mt-4 space-y-4" onSubmit={create}>
            <JsonEditor label="Recovery policy JSON" value={draft} onChange={setDraft} rows={30} />
            <PrimaryButton type="submit" className="w-full" disabled={creating || !partnerConfigured}><Plus className="h-4 w-4" /> {creating ? 'Creating...' : 'Create draft'}</PrimaryButton>
          </form>
        </Panel>
      </div>
    </>
  );
}
