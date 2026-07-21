import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, PageHeader, SecondaryButton } from './pageChrome.jsx';

function tone(status) {
  if (status === 'resolved') return 'ready';
  if (['rejected', 'expired', 'cancelled'].includes(status)) return 'offline';
  if (status === 'approval_required') return 'pending';
  return 'info';
}

function assignments(item) {
  const roles = (item.assignedRoleIds || []).map((id) => `role:${id}`);
  const users = (item.assignedUserIds || []).map((id) => `user:${id}`);
  return [...roles, ...users].join(', ') || 'Unassigned';
}

export function Interventions() {
  const { identity, partnerConfigured } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, items: [] });
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
    apiClient.get(`/orchestration-interventions?${query}`)
      .then((data) => setState({ loading: false, error: null, items: data.items || [] }))
      .catch((error) => setState({ loading: false, error, items: [] }));
  }, [partnerConfigured, query]);
  useEffect(() => load(), [load]);

  return (
    <>
      <PageHeader
        eyebrow="Durable operator review"
        title="Interventions"
        description="Workspace-scoped recovery requests remain paused until an authorized, policy-checked decision is applied."
        actions={<SecondaryButton onClick={load} disabled={state.loading || !partnerConfigured}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} /> Refresh</SecondaryButton>}
      />
      {state.error ? <ErrorAlert error={state.error} title="Intervention request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading interventions" /> : null}
      {!state.loading && state.items.length ? (
        <div className="overflow-x-auto border border-slate-200 bg-white">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Intervention</th><th>Run</th><th>Node</th><th>Type</th><th>Status</th><th>Failure category</th><th>Assigned role/user</th><th>Expiration</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {state.items.map((item) => {
                const interventionId = item.interventionId || item.id;
                return (
                  <tr key={interventionId} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><Link to={`/interventions/${interventionId}`} className="font-medium text-slate-950 hover:text-cyan-800">{item.title || item.interventionType}</Link><p className="mt-1 max-w-52 truncate font-mono text-xs text-slate-500">{interventionId}</p></td>
                    <td><Link to={`/orchestrations/runs/${item.orchestrationRunId}`} className="font-mono text-xs text-cyan-800">{String(item.orchestrationRunId || '').slice(-12)}</Link></td>
                    <td className="font-mono text-xs">{item.nodeKey || item.nodeRunId || '-'}</td>
                    <td className="font-mono text-xs">{item.interventionType}</td>
                    <td><StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge></td>
                    <td>{item.safeFailureCategory || '-'}</td>
                    <td className="max-w-56 truncate text-xs" title={assignments(item)}>{assignments(item)}</td>
                    <td className="text-xs">{formatDate(item.expiresAt)}</td>
                    <td className="text-xs">{formatDate(item.createdAt)}</td>
                    <td><Link to={`/interventions/${interventionId}`} className="font-medium text-cyan-800">Open</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {!state.loading && !state.items.length ? <EmptyState title="No interventions" detail="Paused recovery work requiring a human decision will appear here." /> : null}
    </>
  );
}
