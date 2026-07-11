import { EyeOff, RefreshCw, ScrollText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, PageHeader, Panel, SecondaryButton } from './pageChrome.jsx';

function toneForAction(action) {
  if (action?.includes('failed') || action?.includes('denied')) return 'offline';
  if (action?.includes('completed') || action?.includes('connected')) return 'ready';
  if (action?.includes('issued') || action?.includes('created')) return 'pending';
  return 'neutral';
}

function metadataSummary(metadata = {}) {
  const details = Object.entries(metadata)
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`);
  return details.length ? details.join(' / ') : 'No additional safe metadata.';
}

export function AuditLogs() {
  const { identity } = useAppState();
  const [state, setState] = useState({ loading: true, error: null, items: [] });

  const loadLogs = useCallback(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    apiClient.get(`/audit-logs?${new URLSearchParams(identity)}`)
      .then((data) => active && setState({ loading: false, error: null, items: data.items || [] }))
      .catch((error) => active && setState({ loading: false, error, items: [] }));
    return () => { active = false; };
  }, [identity.receivingUserId, identity.receivingWorkspaceId]);

  useEffect(() => loadLogs(), [loadLogs]);

  return <>
    <PageHeader
      eyebrow="Governance"
      title="Audit Logs"
      description="Redacted gateway records for the active receiving workspace."
      actions={<SecondaryButton onClick={loadLogs} disabled={state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>}
    />
    {state.error ? <ErrorAlert error={state.error} title="Could not load audit logs" /> : null}
    <Panel>
      <div className="flex items-start gap-3 border-b border-slate-200 pb-5">
        <EyeOff className="mt-0.5 h-5 w-5 text-cyan-700" />
        <div>
          <p className="font-semibold text-slate-950">Redacted by design</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">Raw install keys, runtime grants, credentials, and token values are removed before records are stored or returned.</p>
        </div>
      </div>
      {state.loading ? <LoadingBlock label="Loading audit records" /> : null}
      {!state.loading && state.items.length ? <div className="divide-y divide-slate-200">{state.items.map((event) => {
        const tone = toneForAction(event.action);
        return <div key={event.id} className="flex gap-4 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-slate-100 text-slate-600"><ScrollText className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-slate-950">{event.action}</p>
              <StatusBadge tone={tone}>{tone}</StatusBadge>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600">{event.entityType} / {metadataSummary(event.metadata)}</p>
            <p className="mt-2 text-xs text-slate-400">{formatDate(event.createdAt)}</p>
          </div>
        </div>;
      })}</div> : null}
      {!state.loading && !state.items.length ? <EmptyState title="No audit records yet" detail="Resolve an install key or invoke a connected agent to create redacted gateway records." /> : null}
    </Panel>
  </>;
}
