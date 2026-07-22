import { Pause, Play, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ProductionScaleNav } from '../components/ProductionScaleNav.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PageHeader, Panel, SecondaryButton, formatDate } from './pageChrome.jsx';

export function QueuePartitions() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, items: [] });
  const [busy, setBusy] = useState('');
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }), [identity.receivingWorkspaceId]);
  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try { const data = await apiClient.get(`/production-scale/partitions?${query}`); setState({ loading: false, error: null, items: data.items || [] }); }
    catch (error) { setState((current) => ({ ...current, loading: false, error })); }
  }, [partnerConfigured, query]);
  useEffect(() => { void load(); }, [load]);
  async function action(partitionKey, operation) {
    setBusy(`${partitionKey}:${operation}`);
    try { await apiClient.post(`/production-scale/partitions/${encodeURIComponent(partitionKey)}/${operation}`, { workspaceId: identity.receivingWorkspaceId }); recordEvent(`Partition ${operation}`, partitionKey, 'success'); await load(); }
    catch (error) { setState((current) => ({ ...current, error })); }
    finally { setBusy(''); }
  }
  return <><PageHeader eyebrow="Operations / Production scale" title="Queue Partitions" description="Restart-safe routing versions, partition ownership epochs, queue estimates, and guarded drain controls." actions={<SecondaryButton onClick={load} disabled={state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>} /><ProductionScaleNav />{state.error ? <ErrorAlert error={state.error} title="Partition request failed" /> : null}{state.loading ? <LoadingBlock label="Loading partitions" /> : null}<Panel className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Workload</th><th>Routing</th><th>Partition</th><th>Status</th><th>Owner</th><th>Queued</th><th>Active</th><th>Oldest</th><th>Lease expiry</th><th>Heartbeat</th><th className="pr-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-200">{state.items.map((item) => <tr key={item.partitionKey}><td className="px-4 py-3 font-medium text-slate-900">{item.workloadCategory}</td><td>v{item.routingVersion}</td><td>{item.partitionNumber}</td><td><StatusBadge status={item.status} /></td><td className="font-mono text-[10px]">{item.owner || '-'}</td><td>{item.queuedCountEstimate}</td><td>{item.activeCountEstimate}</td><td>{formatDate(item.oldestQueuedAt)}</td><td>{formatDate(item.leaseExpiresAt)}</td><td>{formatDate(item.heartbeatAt)}</td><td className="pr-4 text-right"><div className="flex justify-end gap-2">{item.status === 'paused' ? <button title="Resume" className="text-emerald-700" disabled={busy} onClick={() => action(item.partitionKey, 'resume')}><Play className="h-4 w-4" /></button> : <button title="Pause" className="text-amber-700" disabled={busy} onClick={() => action(item.partitionKey, 'pause')}><Pause className="h-4 w-4" /></button>}<button className="text-cyan-700" disabled={busy} onClick={() => action(item.partitionKey, 'drain')}>Drain</button></div></td></tr>)}</tbody></table>{!state.items.length && !state.loading ? <p className="py-12 text-center text-sm text-slate-500">No partitions are visible.</p> : null}</div></Panel></>;
}
