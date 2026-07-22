import { Archive, RefreshCw, RotateCcw, UserCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ProductionScaleNav } from '../components/ProductionScaleNav.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PageHeader, Panel, SecondaryButton, formatDate } from './pageChrome.jsx';

export function DeadLetter() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, items: [] });
  const [busy, setBusy] = useState('');
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }),
    [identity.receivingWorkspaceId],
  );
  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await apiClient.get(`/production-scale/dead-letter?${query}`);
      setState({ loading: false, error: null, items: data.items || [] });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, query]);
  useEffect(() => { void load(); }, [load]);

  async function action(id, operation) {
    setBusy(id);
    try {
      await apiClient.post(`/production-scale/dead-letter/${id}/${operation}`, {
        workspaceId: identity.receivingWorkspaceId,
      });
      recordEvent(`Dead letter ${operation}`, id, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <PageHeader eyebrow="Operations / Production scale" title="Dead Letter" description="Safe failure metadata and governed retry, archive, or intervention actions. Workload payloads and credentials are never copied here." actions={<SecondaryButton onClick={load} disabled={state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>} />
      <ProductionScaleNav />
      {state.error ? <ErrorAlert error={state.error} title="Dead-letter request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading dead-letter work" /> : null}
      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Job</th><th>Workload</th><th>Status</th><th>Failure</th><th>Attempts</th><th>Route</th><th>Created</th><th>Last attempt</th><th>Request / trace</th><th className="pr-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {state.items.map((item) => <tr key={item.id}><td className="px-4 py-3 font-mono text-[10px]">{item.safeJobId}</td><td>{item.workloadCategory}</td><td><StatusBadge status={item.status} /></td><td>{item.safeFailureCode}</td><td>{item.attemptCount}</td><td>v{item.routingVersion} / p{item.partitionNumber}</td><td>{formatDate(item.createdAt)}</td><td>{formatDate(item.lastAttemptAt)}</td><td className="font-mono text-[10px]">{item.requestId || '-'}<br />{item.traceId || '-'}</td><td className="pr-4 text-right"><div className="flex justify-end gap-2"><button title="Retry" className="text-cyan-700 disabled:opacity-40" disabled={Boolean(busy) || item.status !== 'dead_lettered'} onClick={() => action(item.id, 'retry')}><RotateCcw className="h-4 w-4" /></button><button title="Archive" className="text-slate-700 disabled:opacity-40" disabled={Boolean(busy) || !['dead_lettered', 'retry_requested'].includes(item.status)} onClick={() => action(item.id, 'archive')}><Archive className="h-4 w-4" /></button><button title="Create intervention" className="text-amber-700 disabled:opacity-40" disabled={Boolean(busy)} onClick={() => action(item.id, 'create-intervention')}><UserCheck className="h-4 w-4" /></button></div></td></tr>)}
            </tbody>
          </table>
          {!state.items.length && !state.loading ? <p className="py-12 text-center text-sm text-slate-500">No dead-letter records are visible.</p> : null}
        </div>
      </Panel>
    </>
  );
}
