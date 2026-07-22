import { RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ProductionScaleNav } from '../components/ProductionScaleNav.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { MetricCard, PageHeader, Panel, PrimaryButton, SecondaryButton, formatDuration } from './pageChrome.jsx';

const initialDraft = {
  routingVersion: 1,
  executionPartitions: 8,
  executionConcurrency: 50,
  executionClaimBatch: 5,
  executionMinimumWorkers: 1,
  executionMaximumWorkers: 50,
  leaseDurationMs: 120000,
  heartbeatIntervalMs: 30000,
  elevatedQueueDepth: 100,
  reservedRecoverySlots: 5,
  targetUtilizationBasisPoints: 7000,
  overloadBehavior: 'reject',
};

function duration(value) {
  if (value == null) return '-';
  if (value >= 60000) return `${(value / 60000).toFixed(1)} min`;
  return formatDuration(value);
}

export function ScaleCapacity() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, capacity: null, signals: null, pressure: null, configurations: [] });
  const [draft, setDraft] = useState(initialDraft);
  const [busy, setBusy] = useState('');
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }), [identity.receivingWorkspaceId]);

  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [capacity, signals, pressure, configurations] = await Promise.all([
        apiClient.get(`/production-scale/capacity?${query}`),
        apiClient.get(`/production-scale/autoscaling-signals?${query}`),
        apiClient.get(`/production-scale/backpressure?${query}`),
        apiClient.get(`/production-scale/configurations?${query}`),
      ]);
      setState({ loading: false, error: null, capacity, signals, pressure, configurations: configurations.items || [] });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, query]);

  useEffect(() => { void load(); }, [load]);

  async function createDraft() {
    setBusy('create');
    try {
      const activeConfiguration = state.configurations.find((item) => item.status === 'active');
      const previousActiveRoute = activeConfiguration?.routingVersions?.find((item) => item.status === 'active');
      const partitionCounts = {
        ...(activeConfiguration?.partitionCountByCategory || {}),
        orchestration_node: Number(draft.executionPartitions),
      };
      const routingVersion = Number(draft.routingVersion);
      const routingVersions = previousActiveRoute
        ? [
            ...(activeConfiguration.routingVersions || [])
              .filter((item) => Number(item.version) !== routingVersion)
              .map((item) => item.status === 'active' ? { ...item, status: 'draining' } : item),
            { version: routingVersion, status: 'active', partitionCountByCategory: partitionCounts },
          ]
        : [{ version: routingVersion, status: 'active', partitionCountByCategory: partitionCounts }];
      await apiClient.post('/production-scale/configurations', {
        workspaceId: identity.receivingWorkspaceId,
        routingVersions,
        partitionCountByCategory: partitionCounts,
        maximumConcurrencyByCategory: { ...(activeConfiguration?.maximumConcurrencyByCategory || {}), orchestration_node: Number(draft.executionConcurrency) },
        claimBatchSizeByCategory: { ...(activeConfiguration?.claimBatchSizeByCategory || {}), orchestration_node: Number(draft.executionClaimBatch) },
        leaseDurationByCategory: { ...(activeConfiguration?.leaseDurationByCategory || {}), orchestration_node: Number(draft.leaseDurationMs) },
        heartbeatIntervalByCategory: { ...(activeConfiguration?.heartbeatIntervalByCategory || {}), orchestration_node: Number(draft.heartbeatIntervalMs) },
        workerPoolConfiguration: {
          ...(activeConfiguration?.workerPoolConfiguration || {}),
          execution: {
            ...(activeConfiguration?.workerPoolConfiguration?.execution || {}),
            minimumWorkers: Number(draft.executionMinimumWorkers),
            maximumWorkers: Number(draft.executionMaximumWorkers),
            perWorkerConcurrency: Number(draft.executionConcurrency),
            claimBatchSize: Number(draft.executionClaimBatch),
            leaseDurationMs: Number(draft.leaseDurationMs),
            heartbeatIntervalMs: Number(draft.heartbeatIntervalMs),
          },
        },
        reservedCapacityByCategory: { ...(activeConfiguration?.reservedCapacityByCategory || {}), orchestration_recovery: Number(draft.reservedRecoverySlots) },
        backpressureThresholds: { ...(activeConfiguration?.backpressureThresholds || {}), elevatedQueueDepth: Number(draft.elevatedQueueDepth) },
        autoscalingTargets: { ...(activeConfiguration?.autoscalingTargets || {}), targetUtilizationBasisPoints: Number(draft.targetUtilizationBasisPoints) },
        overloadBehavior: draft.overloadBehavior,
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      recordEvent('Scale configuration draft created', 'Production scale', 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  async function configurationAction(id, action) {
    setBusy(`${action}:${id}`);
    try {
      await apiClient.post(`/production-scale/configurations/${id}/${action}`, { workspaceId: identity.receivingWorkspaceId });
      recordEvent(`Scale configuration ${action} complete`, id, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  const capacity = state.capacity || {};
  const signals = state.signals || {};
  const pressureStates = state.pressure?.states || [];
  return (
    <>
      <PageHeader
        eyebrow="Operations / Production scale"
        title="Scale & Capacity"
        description="Durable backpressure, bounded reserved capacity, queue drain estimates, and provider-neutral scaling guidance."
        actions={<SecondaryButton onClick={load} disabled={!partnerConfigured || state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>}
      />
      <ProductionScaleNav />
      {state.error ? <ErrorAlert error={state.error} title="Production scale request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading capacity" /> : null}
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Backpressure" value={capacity.backpressureState || 'normal'} detail={`${pressureStates.length} pool states`} tone={capacity.backpressureState === 'normal' ? 'emerald' : 'coral'} />
        <MetricCard label="Worker capacity" value={capacity.currentExecutionSlots ?? 0} detail={`${capacity.currentlyUsedSlots ?? 0} used`} tone="cyan" />
        <MetricCard label="Reserved capacity" value={capacity.reservedSlots ?? 0} detail={`${capacity.availableReservedSlots ?? 0} available`} />
        <MetricCard label="Autoscaling" value={signals.recommendation || 'hold'} detail={(signals.safeReasonCodes || []).join(', ') || 'Capacity within target'} tone="cyan" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Panel className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">Capacity estimates</h2><p className="mt-1 text-xs text-slate-500">Estimates use bounded operational windows and are not exact predictions.</p></div>
          <dl className="grid grid-cols-2 gap-px bg-slate-200 text-sm sm:grid-cols-3">
            {[
              ['Queue depth', capacity.queueDepth ?? 0],
              ['Oldest queue', duration(Math.max(0, ...(capacity.queues || []).map((queue) => queue.oldestQueueAgeMs || 0)))],
              ['Drain estimate', duration(capacity.estimatedDrainTimeMs)],
              ['Completion / min', capacity.completionRatePerMinute ?? 0],
              ['Database pressure', capacity.databasePressureCategory || 'healthy'],
              ['Utilization', `${((capacity.utilizationBasisPoints || 0) / 100).toFixed(1)}%`],
            ].map(([label, value]) => <div key={label} className="bg-white p-4"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-2 font-semibold text-slate-900">{value}</dd></div>)}
          </dl>
        </Panel>
        <Panel>
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-700" /><h2 className="text-sm font-semibold text-slate-950">Active pressure by pool</h2></div>
          <div className="mt-4 divide-y divide-slate-200 text-sm">
            {pressureStates.length ? pressureStates.map((item) => <div key={item.workerPool} className="flex items-center justify-between py-3"><div><p className="font-medium text-slate-900">{item.workerPool}</p><p className="text-xs text-slate-500">Depth {item.queueDepth} / oldest {duration(item.oldestQueueAgeMs)}</p></div><StatusBadge status={item.state} /></div>) : <p className="py-6 text-center text-sm text-slate-500">No durable pressure snapshots yet.</p>}
          </div>
        </Panel>
      </div>
      <Panel className="mt-5 overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">Queue depth by category</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Workload</th><th>Pool</th><th>Queued</th><th>Active</th><th>Oldest age</th><th>Routing versions</th><th>Partitions</th></tr></thead><tbody className="divide-y divide-slate-200">{(capacity.queues || []).map((queue) => <tr key={queue.workloadCategory}><td className="px-4 py-3 font-medium">{queue.workloadCategory}</td><td>{queue.workerPool}</td><td>{queue.depth}</td><td>{queue.active}</td><td>{duration(queue.oldestQueueAgeMs)}</td><td>{(queue.routingVersions || []).map((version) => `v${version}`).join(', ')}</td><td>{queue.partitionCount}</td></tr>)}</tbody></table>{!(capacity.queues || []).length ? <p className="py-8 text-center text-sm text-slate-500">No queued work is visible.</p> : null}</div>
      </Panel>
      <Panel className="mt-5">
        <div className="mb-4"><h2 className="text-sm font-semibold text-slate-950">Configuration editor</h2><p className="mt-1 text-xs text-slate-500">Create a bounded draft. Validation and activation remain separately governed.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Active routing version', 'routingVersion'],
            ['Execution partitions', 'executionPartitions'], ['Execution concurrency', 'executionConcurrency'],
            ['Execution claim batch', 'executionClaimBatch'], ['Execution minimum workers', 'executionMinimumWorkers'],
            ['Execution maximum workers', 'executionMaximumWorkers'],
            ['Lease duration ms', 'leaseDurationMs'], ['Heartbeat interval ms', 'heartbeatIntervalMs'],
            ['Elevated queue depth', 'elevatedQueueDepth'], ['Reserved recovery slots', 'reservedRecoverySlots'],
            ['Target utilization bps', 'targetUtilizationBasisPoints'],
          ].map(([label, key]) => <label key={key} className="text-xs font-medium text-slate-700">{label}<input className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" type="number" value={draft[key]} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} /></label>)}
          <label className="text-xs font-medium text-slate-700">Overload behavior<select className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={draft.overloadBehavior} onChange={(event) => setDraft((current) => ({ ...current, overloadBehavior: event.target.value }))}><option value="reject">Reject</option><option value="defer">Defer</option><option value="approval_required">Approval required</option></select></label>
        </div>
        <div className="mt-4"><PrimaryButton onClick={createDraft} disabled={busy === 'create'}><Save className="h-4 w-4" />Create draft</PrimaryButton></div>
      </Panel>
      <Panel className="mt-5 overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">Configuration versions</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Version</th><th>Scope</th><th>Status</th><th>Routing</th><th>Execution partitions</th><th>Overload</th><th className="pr-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-200">{state.configurations.map((item) => <tr key={item.id}><td className="px-4 py-3 font-medium">v{item.version}</td><td>{item.workspaceId || item.scopeKey}</td><td><StatusBadge status={item.status} /></td><td>{(item.routingVersions || []).map((route) => `v${route.version} ${route.status}`).join(', ')}</td><td>{item.partitionCountByCategory?.orchestration_node ?? '-'}</td><td>{item.overloadBehavior}</td><td className="pr-4 text-right">{item.status === 'draft' ? <div className="flex justify-end gap-2"><button className="text-cyan-700" disabled={busy} onClick={() => configurationAction(item.id, 'validate')}>Validate</button><button className="text-cyan-700" disabled={busy} onClick={() => configurationAction(item.id, 'activate')}>Activate</button></div> : '-'}</td></tr>)}</tbody></table></div>
      </Panel>
    </>
  );
}
