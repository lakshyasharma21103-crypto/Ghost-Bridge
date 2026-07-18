import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, formatDuration, PageHeader, SecondaryButton } from './pageChrome.jsx';

function tone(status) {
  if (status === 'succeeded') return 'ready';
  if (['failed', 'cancelled'].includes(status)) return 'offline';
  if (status === 'partial_failure') return 'limited';
  if (status === 'waiting_approval') return 'pending';
  return 'info';
}

function progress(run) {
  const completed = ['succeeded', 'failed', 'cancelled', 'skipped'].reduce(
    (total, status) => total + Number(run.progress?.[status] || 0),
    0,
  );
  return `${completed}/${run.progress?.total || 0}`;
}

export function OrchestrationRuns() {
  const { identity, partnerConfigured } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, items: [] });
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }), [identity.receivingWorkspaceId]);
  const load = useCallback(() => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null, items: [] });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    apiClient.get(`/orchestrations/runs?${query}`)
      .then((data) => setState({ loading: false, error: null, items: data.items || [] }))
      .catch((error) => setState({ loading: false, error, items: [] }));
  }, [partnerConfigured, query]);
  useEffect(() => load(), [load]);

  return (
    <>
      <PageHeader eyebrow="Durable execution" title="Orchestration runs" description="Tenant-scoped progress, approvals, trace lineage, attempts, and safe failure summaries." actions={<div className="flex gap-2"><Link to="/orchestrations" className="inline-flex min-h-10 items-center border border-slate-300 px-4 py-2 text-sm font-medium">Definitions</Link><SecondaryButton onClick={load} disabled={state.loading || !partnerConfigured}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} /> Refresh</SecondaryButton></div>} />
      {state.error ? <ErrorAlert error={state.error} title="Could not load orchestration runs" /> : null}
      {state.loading ? <LoadingBlock label="Loading orchestration runs" /> : null}
      {!state.loading && state.items.length ? (
        <div className="overflow-x-auto border border-slate-200 bg-white">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Run</th><th>Definition</th><th>Status</th><th>Progress</th><th>Started</th><th>Duration</th><th>Requested by</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {state.items.map((run) => <tr key={run.runId} className="hover:bg-slate-50"><td className="px-5 py-4 font-mono text-xs">{run.runId.slice(-12)}</td><td><p className="font-medium">{run.definitionName}</p><p className="text-xs text-slate-500">v{run.definitionVersion}</p></td><td><StatusBadge tone={tone(run.status)}>{run.status}</StatusBadge></td><td>{progress(run)}</td><td className="text-xs text-slate-600">{formatDate(run.startedAt || run.createdAt)}</td><td>{formatDuration(run.durationMs)}</td><td className="font-mono text-xs">{run.requestedBy}</td><td><Link to={`/orchestrations/runs/${run.runId}`} className="font-medium text-cyan-800 hover:underline">Open</Link></td></tr>)}
            </tbody>
          </table>
        </div>
      ) : null}
      {!state.loading && !state.items.length ? <EmptyState title="No orchestration runs" detail="Activate a definition and start its first durable run." /> : null}
    </>
  );
}
