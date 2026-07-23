import { Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { PerformanceCapacityNav } from '../components/PerformanceCapacityNav.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import {
  PageHeader,
  Panel,
  PrimaryButton,
  SecondaryButton,
  formatDate,
  formatDuration,
} from './pageChrome.jsx';

const WORKLOAD_DOMAINS = [
  'interactive_api',
  'orchestration_submission',
  'orchestration_execution',
  'queue_claiming',
  'database_read',
  'database_write',
  'cache_read',
  'cache_invalidation',
  'regional_failover_simulation',
];

const initialDraft = {
  name: 'Local smoke budget',
  description: 'Bounded performance expectations for a deterministic local smoke environment.',
  scope: 'workspace',
  workloadDomain: 'interactive_api',
  minimumSampleSize: 20,
  maximumErrorRateBasisPoints: 500,
  maximumUnexpectedFailureRateBasisPoints: 100,
  maximumTimeoutRateBasisPoints: 100,
  maximumRetryRateBasisPoints: 500,
  maximumOverloadRejectionRateBasisPoints: 3000,
  maximumQuotaRejectionRateBasisPoints: 3000,
  p50Ms: 150,
  p90Ms: 350,
  p95Ms: 500,
  p99Ms: 1000,
  maximumMs: 2500,
  p50QueueWaitMs: 100,
  p95QueueWaitMs: 500,
  p99QueueWaitMs: 1000,
  maximumOldestQueueAgeMs: 5000,
  maximumWorkerUtilizationBasisPoints: 8500,
  minimumHeadroomBasisPoints: 1500,
  maximumTenantServiceSkewBasisPoints: 2000,
  maximumTenantStarvationWindowMs: 5000,
  regressionToleranceBasisPoints: 1000,
  absoluteRegressionToleranceMs: 100,
};

export function PerformanceBudgets() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, items: [] });
  const [draft, setDraft] = useState(initialDraft);
  const [busy, setBusy] = useState('');
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }),
    [identity.receivingWorkspaceId],
  );

  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const result = await apiClient.get(`/performance/budgets?${query}`);
      setState({ loading: false, error: null, items: Array.isArray(result) ? result : result.items || [] });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createBudget() {
    setBusy('create');
    try {
      await apiClient.post(
        '/performance/budgets',
        budgetPayload(draft, identity.receivingWorkspaceId),
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
      recordEvent('Performance budget draft created', draft.name, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  async function lifecycle(item, action) {
    const id = safeId(item);
    setBusy(`${action}:${id}`);
    try {
      await apiClient.post(
        `/performance/budgets/${encodeURIComponent(id)}/${action}`,
        {
          workspaceId: identity.receivingWorkspaceId,
          reasonCode: `PERFORMANCE_BUDGET_${action.toUpperCase()}`,
        },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
      recordEvent(`Performance budget ${action} complete`, item.name, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations / Performance and capacity"
        title="Performance Budgets"
        description="Versioned latency, reliability, queue, fairness, recovery, regional, and headroom limits evaluated only against compatible environments."
        actions={<SecondaryButton onClick={load} disabled={!partnerConfigured || state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>}
      />
      <PerformanceCapacityNav />
      {state.error ? <ErrorAlert error={state.error} title="Performance budget request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading performance budgets" /> : null}

      <Panel className="mb-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-950">Budget editor</h2>
          <p className="mt-1 text-xs text-slate-500">Create a bounded draft. Active versions are immutable and activation is separately governed.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TextField label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
          <SelectField label="Scope" value={draft.scope} options={['workspace']} onChange={(scope) => setDraft({ ...draft, scope })} />
          <SelectField label="Workload" value={draft.workloadDomain} options={WORKLOAD_DOMAINS} onChange={(workloadDomain) => setDraft({ ...draft, workloadDomain })} />
          <NumberField label="Minimum sample size" value={draft.minimumSampleSize} onChange={(minimumSampleSize) => setDraft({ ...draft, minimumSampleSize })} />
          <NumberField label="Maximum error bps" value={draft.maximumErrorRateBasisPoints} onChange={(maximumErrorRateBasisPoints) => setDraft({ ...draft, maximumErrorRateBasisPoints })} />
          <NumberField label="Unexpected failure bps" value={draft.maximumUnexpectedFailureRateBasisPoints} onChange={(maximumUnexpectedFailureRateBasisPoints) => setDraft({ ...draft, maximumUnexpectedFailureRateBasisPoints })} />
          <NumberField label="Timeout bps" value={draft.maximumTimeoutRateBasisPoints} onChange={(maximumTimeoutRateBasisPoints) => setDraft({ ...draft, maximumTimeoutRateBasisPoints })} />
          <NumberField label="Retry bps" value={draft.maximumRetryRateBasisPoints} onChange={(maximumRetryRateBasisPoints) => setDraft({ ...draft, maximumRetryRateBasisPoints })} />
          <NumberField label="Overload rejection bps" value={draft.maximumOverloadRejectionRateBasisPoints} onChange={(maximumOverloadRejectionRateBasisPoints) => setDraft({ ...draft, maximumOverloadRejectionRateBasisPoints })} />
          <NumberField label="Quota rejection bps" value={draft.maximumQuotaRejectionRateBasisPoints} onChange={(maximumQuotaRejectionRateBasisPoints) => setDraft({ ...draft, maximumQuotaRejectionRateBasisPoints })} />
          <NumberField label="Latency p50 ms" value={draft.p50Ms} onChange={(p50Ms) => setDraft({ ...draft, p50Ms })} />
          <NumberField label="Latency p90 ms" value={draft.p90Ms} onChange={(p90Ms) => setDraft({ ...draft, p90Ms })} />
          <NumberField label="Latency p95 ms" value={draft.p95Ms} onChange={(p95Ms) => setDraft({ ...draft, p95Ms })} />
          <NumberField label="Latency p99 ms" value={draft.p99Ms} onChange={(p99Ms) => setDraft({ ...draft, p99Ms })} />
          <NumberField label="Maximum latency ms" value={draft.maximumMs} onChange={(maximumMs) => setDraft({ ...draft, maximumMs })} />
          <NumberField label="Queue p50 ms" value={draft.p50QueueWaitMs} onChange={(p50QueueWaitMs) => setDraft({ ...draft, p50QueueWaitMs })} />
          <NumberField label="Queue p95 ms" value={draft.p95QueueWaitMs} onChange={(p95QueueWaitMs) => setDraft({ ...draft, p95QueueWaitMs })} />
          <NumberField label="Queue p99 ms" value={draft.p99QueueWaitMs} onChange={(p99QueueWaitMs) => setDraft({ ...draft, p99QueueWaitMs })} />
          <NumberField label="Oldest queue age ms" value={draft.maximumOldestQueueAgeMs} onChange={(maximumOldestQueueAgeMs) => setDraft({ ...draft, maximumOldestQueueAgeMs })} />
          <NumberField label="Worker utilization bps" value={draft.maximumWorkerUtilizationBasisPoints} onChange={(maximumWorkerUtilizationBasisPoints) => setDraft({ ...draft, maximumWorkerUtilizationBasisPoints })} />
          <NumberField label="Minimum headroom bps" value={draft.minimumHeadroomBasisPoints} onChange={(minimumHeadroomBasisPoints) => setDraft({ ...draft, minimumHeadroomBasisPoints })} />
          <NumberField label="Tenant service skew bps" value={draft.maximumTenantServiceSkewBasisPoints} onChange={(maximumTenantServiceSkewBasisPoints) => setDraft({ ...draft, maximumTenantServiceSkewBasisPoints })} />
          <NumberField label="Starvation window ms" value={draft.maximumTenantStarvationWindowMs} onChange={(maximumTenantStarvationWindowMs) => setDraft({ ...draft, maximumTenantStarvationWindowMs })} />
          <NumberField label="Regression tolerance bps" value={draft.regressionToleranceBasisPoints} onChange={(regressionToleranceBasisPoints) => setDraft({ ...draft, regressionToleranceBasisPoints })} />
          <NumberField label="Absolute tolerance ms" value={draft.absoluteRegressionToleranceMs} onChange={(absoluteRegressionToleranceMs) => setDraft({ ...draft, absoluteRegressionToleranceMs })} />
        </div>
        <label className="mt-3 block text-xs font-medium text-slate-700">Description<textarea className="mt-1 min-h-20 w-full border border-slate-300 px-3 py-2 text-sm" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
        <div className="mt-4"><PrimaryButton onClick={createBudget} disabled={busy === 'create' || !draft.name}><Plus className="h-4 w-4" />Create draft</PrimaryButton></div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">Budget versions</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Name</th><th>Version</th><th>Scope</th><th>Workload</th><th>Status</th><th>p95</th><th>p99</th><th>Error budget</th><th>Queue budget</th><th>Headroom</th><th>Updated</th><th className="pr-4">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-200">{state.items.map((item) => <tr key={`${safeId(item)}:${item.version}`}><td className="px-4 py-3"><p className="font-medium text-slate-900">{item.name}</p><p className="text-slate-500">minimum {item.minimumSampleSize} samples</p></td><td>v{item.version}</td><td>{item.scope}</td><td>{item.workloadDomain || 'all'}</td><td><StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge></td><td>{formatDuration(item.latencyBudgets?.p95Ms)}</td><td>{formatDuration(item.latencyBudgets?.p99Ms)}</td><td>{basisPoints(item.maximumUnexpectedFailureRateBasisPoints)}</td><td>{formatDuration(item.queueBudgets?.p95QueueWaitMs)}</td><td>{basisPoints(item.capacityBudgets?.minimumHeadroomBasisPoints)}</td><td>{formatDate(item.updatedAt)}</td><td className="pr-4"><div className="flex flex-wrap gap-2">{item.status === 'draft' ? <><button className="text-cyan-700 disabled:opacity-40" disabled={Boolean(busy)} onClick={() => lifecycle(item, 'validate')}>Validate</button><button className="text-cyan-700 disabled:opacity-40" disabled={Boolean(busy)} onClick={() => lifecycle(item, 'activate')}>Activate</button></> : null}{item.status === 'active' ? <button className="text-slate-600 disabled:opacity-40" disabled={Boolean(busy)} onClick={() => lifecycle(item, 'archive')}>Archive</button> : null}</div></td></tr>)}</tbody>
          </table>
          {!state.items.length && !state.loading ? <p className="py-10 text-center text-sm text-slate-500">No performance budgets are visible.</p> : null}
        </div>
      </Panel>
    </>
  );
}

function budgetPayload(draft, workspaceId) {
  return {
    scope: draft.scope,
    workspaceId,
    workloadDomain: draft.workloadDomain,
    name: draft.name,
    description: draft.description,
    minimumSampleSize: draft.minimumSampleSize,
    maximumErrorRateBasisPoints: draft.maximumErrorRateBasisPoints,
    maximumUnexpectedFailureRateBasisPoints: draft.maximumUnexpectedFailureRateBasisPoints,
    maximumTimeoutRateBasisPoints: draft.maximumTimeoutRateBasisPoints,
    maximumRetryRateBasisPoints: draft.maximumRetryRateBasisPoints,
    maximumOverloadRejectionRateBasisPoints: draft.maximumOverloadRejectionRateBasisPoints,
    maximumQuotaRejectionRateBasisPoints: draft.maximumQuotaRejectionRateBasisPoints,
    latencyBudgets: {
      p50Ms: draft.p50Ms,
      p90Ms: draft.p90Ms,
      p95Ms: draft.p95Ms,
      p99Ms: draft.p99Ms,
      maximumMs: draft.maximumMs,
    },
    queueBudgets: {
      p50QueueWaitMs: draft.p50QueueWaitMs,
      p95QueueWaitMs: draft.p95QueueWaitMs,
      p99QueueWaitMs: draft.p99QueueWaitMs,
      maximumOldestQueueAgeMs: draft.maximumOldestQueueAgeMs,
    },
    executionBudgets: {
      p95NodeExecutionMs: draft.p95Ms,
      p95GatewayExecutionMs: draft.p95Ms,
      p95DatabaseOperationMs: draft.p95Ms,
      p95CacheOperationMs: draft.p95Ms,
      p95PolicyEvaluationMs: draft.p95Ms,
    },
    orchestrationBudgets: {
      p95RunDurationMs: draft.maximumMs,
      p99RunDurationMs: draft.maximumMs * 2,
      maximumStuckRunRateBasisPoints: draft.maximumErrorRateBasisPoints,
      maximumUnknownOutcomeRateBasisPoints: draft.maximumUnexpectedFailureRateBasisPoints,
    },
    capacityBudgets: {
      maximumWorkerUtilizationBasisPoints: draft.maximumWorkerUtilizationBasisPoints,
      minimumHeadroomBasisPoints: draft.minimumHeadroomBasisPoints,
      maximumDatabasePressureCategory: 'elevated',
      maximumBackpressureState: 'elevated',
      maximumLeaseExpiryRateBasisPoints: draft.maximumErrorRateBasisPoints,
    },
    fairnessBudgets: {
      maximumTenantServiceSkewBasisPoints: draft.maximumTenantServiceSkewBasisPoints,
      maximumTenantStarvationWindowMs: draft.maximumTenantStarvationWindowMs,
    },
    recoveryBudgets: {
      p95RecoveryDurationMs: draft.maximumMs,
      p95CompensationDurationMs: draft.maximumMs,
      minimumRecoverySuccessRateBasisPoints: 9500,
    },
    regionalBudgets: {
      maximumFailoverRtoMs: draft.maximumMs * 10,
      maximumFailoverRpoMs: draft.maximumMs * 5,
      maximumRegionalRoutingErrorRateBasisPoints: draft.maximumErrorRateBasisPoints,
    },
    regressionToleranceBasisPoints: draft.regressionToleranceBasisPoints,
    absoluteRegressionToleranceMs: draft.absoluteRegressionToleranceMs,
  };
}

function safeId(item) {
  return item?.id || item?._id || item?.budgetPolicyId || item?.policyId || '';
}

function statusTone(status) {
  if (status === 'active') return 'ready';
  if (status === 'archived') return 'limited';
  if (status === 'draft') return 'pending';
  return 'neutral';
}

function basisPoints(value) {
  return Number.isFinite(Number(value)) ? `${(Number(value) / 100).toFixed(2)}%` : '-';
}

function TextField({ label, value, onChange }) {
  return <label className="text-xs font-medium text-slate-700">{label}<input className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function NumberField({ label, value, onChange }) {
  return <label className="text-xs font-medium text-slate-700">{label}<input type="number" min="0" className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function SelectField({ label, value, options, onChange }) {
  return <label className="text-xs font-medium text-slate-700">{label}<select className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
