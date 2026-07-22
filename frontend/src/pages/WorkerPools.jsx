import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ProductionScaleNav } from '../components/ProductionScaleNav.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { MetricCard, PageHeader, Panel, SecondaryButton, formatDate } from './pageChrome.jsx';

export function WorkerPools() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, items: [], pools: [] });
  const [busy, setBusy] = useState('');
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }),
    [identity.receivingWorkspaceId],
  );
  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [data, capacity, pressure] = await Promise.all([
        apiClient.get(`/production-scale/workers?${query}`),
        apiClient.get(`/production-scale/capacity?${query}`),
        apiClient.get(`/production-scale/backpressure?${query}`),
      ]);
      const pressureByPool = new Map((pressure.states || []).map((item) => [item.workerPool, item]));
      setState({
        loading: false,
        error: null,
        items: data.items || [],
        pools: (capacity.workerPools || []).map((pool) => ({
          ...pool,
          throughput: pressureByPool.get(pool.workerPool)?.completionThroughput || 0,
        })),
      });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, query]);
  useEffect(() => { void load(); }, [load]);

  async function action(workerId, operation) {
    setBusy(workerId);
    try {
      await apiClient.post(`/production-scale/workers/${encodeURIComponent(workerId)}/${operation}`, {
        workspaceId: identity.receivingWorkspaceId,
      });
      recordEvent(`Worker ${operation.replace('-', ' ')}`, workerId, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  const totals = state.items.reduce(
    (result, worker) => ({
      slots: result.slots + Number(worker.maximumConcurrency || 0),
      active: result.active + Number(worker.activeClaimCount || 0),
      available: result.available + Number(worker.availableCapacity || 0),
    }),
    { slots: 0, active: 0, available: 0 },
  );
  return (
    <>
      <PageHeader eyebrow="Operations / Production scale" title="Worker Pools" description="Registered process instances, bounded capabilities, current heartbeats, and graceful drain controls." actions={<SecondaryButton onClick={load} disabled={state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>} />
      <ProductionScaleNav />
      {state.error ? <ErrorAlert error={state.error} title="Worker fleet request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading workers" /> : null}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Registered workers" value={state.items.length} detail={`${new Set(state.items.map((item) => item.workerPool)).size} pools`} tone="cyan" />
        <MetricCard label="Maximum slots" value={totals.slots} detail={`${totals.active} active claims`} />
        <MetricCard label="Available slots" value={totals.available} detail="Reported by live registrations" tone="emerald" />
      </div>
      <Panel className="mb-5 overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">Pool summary</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Pool</th><th>Active</th><th>Idle</th><th>Draining</th><th>Unhealthy</th><th>Capacity</th><th>Active claims</th><th>Throughput</th></tr></thead><tbody className="divide-y divide-slate-200">{state.pools.map((pool) => <tr key={pool.workerPool}><td className="px-4 py-3 font-medium">{pool.workerPool}</td><td>{pool.activeWorkers}</td><td>{pool.idleWorkers}</td><td>{pool.drainingWorkers}</td><td>{pool.unhealthyWorkers}</td><td>{pool.capacity}</td><td>{pool.activeClaims}</td><td>{pool.throughput}</td></tr>)}</tbody></table></div>
      </Panel>
      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Worker</th><th>Pool</th><th>Status</th><th>Capacity</th><th>Active</th><th>Routing</th><th>Workloads</th><th>Heartbeat</th><th>Region</th><th className="pr-4 text-right">Controls</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {state.items.map((worker) => <tr key={`${worker.workerId}:${worker.instanceId || ''}`}><td className="px-4 py-3 font-mono text-[10px] text-slate-900">{worker.workerId}</td><td>{worker.workerPool}</td><td><StatusBadge status={worker.status} /></td><td>{worker.availableCapacity} / {worker.maximumConcurrency}</td><td>{worker.activeClaimCount}</td><td>{(worker.supportedRoutingVersions || []).map((version) => `v${version}`).join(', ')}</td><td className="max-w-64 truncate" title={(worker.supportedWorkloadCategories || []).join(', ')}>{(worker.supportedWorkloadCategories || []).join(', ')}</td><td>{formatDate(worker.heartbeatAt)}</td><td>{[worker.safeRegion, worker.safeZone].filter(Boolean).join(' / ') || '-'}</td><td className="pr-4 text-right"><div className="flex justify-end gap-2"><button className="text-amber-700 disabled:opacity-40" disabled={Boolean(busy) || ['draining', 'stopped'].includes(worker.status)} onClick={() => action(worker.workerId, 'drain')}>Drain</button><button className="text-rose-700 disabled:opacity-40" disabled={Boolean(busy) || ['draining', 'stopped'].includes(worker.status)} onClick={() => action(worker.workerId, 'stop-claims')}>Stop claims</button></div></td></tr>)}
            </tbody>
          </table>
          {!state.items.length && !state.loading ? <p className="py-12 text-center text-sm text-slate-500">No worker registrations are visible.</p> : null}
        </div>
      </Panel>
    </>
  );
}
