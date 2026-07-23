import { Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { PerformanceCapacityNav } from '../components/PerformanceCapacityNav.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import {
  MetricCard,
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
  'regional_failover_simulation',
];

const initialDraft = {
  name: 'Workspace capacity plan',
  description: 'Advisory bounded plan derived from compatible performance evidence.',
  scope: 'workspace',
  workloadDomain: 'orchestration_execution',
  forecastWindow: 'thirty_days',
  expectedPeakRequestsPerSecond: 20,
  expectedPeakConcurrentRuns: 10,
  expectedPeakConcurrentNodes: 40,
  expectedQueueDepth: 100,
  expectedDataGrowthCategory: 'moderate',
  requiredExecutionWorkers: 4,
  requiredRecoveryWorkers: 2,
  requiredControlPlaneWorkers: 2,
  recommendedWorkerConcurrency: 8,
  recommendedPartitionCount: 8,
  recommendedDatabaseCapacityCategory: 'standard',
  recommendedCacheCapacityCategory: 'standard',
  reservedRecoveryCapacity: 2,
  minimumHeadroomBasisPoints: 2000,
  failoverCapacityRequirementBasisPoints: 10000,
  sourceCapacityModelIds: '',
};

export function CapacityPlanning() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({
    loading: false,
    error: null,
    capacity: {},
    recommendations: [],
    plans: [],
    models: [],
  });
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
      const [capacity, recommendations, plans, models] = await Promise.all([
        apiClient.get(`/performance/capacity?${query}`),
        apiClient.get(`/performance/recommendations?${query}`),
        apiClient.get(`/performance/capacity-plans?${query}`),
        apiClient.get(`/performance/capacity-models?${query}`),
      ]);
      const modelItems = Array.isArray(models) ? models : models.items || [];
      setState({
        loading: false,
        error: null,
        capacity: capacity.model || capacity.summary || capacity || {},
        recommendations: Array.isArray(recommendations) ? recommendations : recommendations.items || recommendations.recommendations || [],
        plans: Array.isArray(plans) ? plans : plans.items || [],
        models: modelItems,
      });
      setDraft((current) => ({
        ...current,
        sourceCapacityModelIds:
          current.sourceCapacityModelIds || modelItems.slice(0, 2).map(safeId).filter(Boolean).join(', '),
      }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createPlan() {
    setBusy('create');
    try {
      await apiClient.post(
        '/performance/capacity-plans',
        capacityPlanPayload(draft, identity.receivingWorkspaceId),
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
      recordEvent('Capacity plan draft created', draft.name, 'success');
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
        `/performance/capacity-plans/${encodeURIComponent(id)}/${action}`,
        {
          workspaceId: identity.receivingWorkspaceId,
          reasonCode: `CAPACITY_PLAN_${action.toUpperCase()}`,
        },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
      recordEvent(`Capacity plan ${action} complete`, item.name, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  const capacity = state.capacity || {};
  const workerRequirement = capacity.requiredExecutionWorkers ?? capacity.requiredWorkerCountEstimate;
  const failoverCapacity = capacity.failoverCapacityCategory || capacity.failoverCapacityRequirementBasisPoints;

  return (
    <>
      <PageHeader
        eyebrow="Operations / Performance and capacity"
        title="Capacity Planning"
        description="Environment-specific estimates, honest headroom, failover capacity, and provider-neutral advisory recommendations."
        actions={<SecondaryButton onClick={load} disabled={!partnerConfigured || state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>}
      />
      <PerformanceCapacityNav />
      {state.error ? <ErrorAlert error={state.error} title="Capacity planning request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading capacity estimates" /> : null}

      <div className="mb-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-semibold">Advisory estimates only</p>
        <p className="mt-1 text-xs leading-5">Local results do not prove production capacity. Recommendations never change provider instances, replicas, database tiers, topology, DNS, or regional infrastructure.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Sustainable throughput estimate" value={formatRate(capacity.sustainableThroughputEstimate)} detail="environment-specific estimate" tone="cyan" />
        <MetricCard label="Safe concurrency estimate" value={capacity.safeConcurrencyEstimate ?? 'unknown'} detail={`saturation ${capacity.saturationPointEstimate ?? 'unknown'}`} />
        <MetricCard label="Worker requirement" value={workerRequirement ?? 'unknown'} detail="estimated execution workers" />
        <MetricCard label="Partition recommendation" value={capacity.recommendedPartitionCount ?? 'unknown'} detail="provider-neutral" />
        <MetricCard label="Headroom" value={capacity.headroomCategory || 'unknown'} detail={basisPoints(capacity.minimumHeadroomBasisPoints)} tone={capacity.headroomCategory === 'ample' || capacity.headroomCategory === 'adequate' ? 'emerald' : capacity.headroomCategory === 'critical' ? 'coral' : 'slate'} />
        <MetricCard label="Database capacity category" value={capacity.databaseCapacityCategory || capacity.observedDatabasePressure || 'unknown'} detail="bounded category" />
        <MetricCard label="Cache capacity category" value={capacity.cacheCapacityCategory || capacity.observedCacheHitRate || 'unknown'} detail="bounded category" />
        <MetricCard label="Failover capacity" value={Number.isFinite(Number(failoverCapacity)) ? basisPoints(failoverCapacity) : failoverCapacity || 'unknown'} detail="target-region absorption" />
        <MetricCard label="Recommendation confidence" value={capacity.confidenceCategory || 'unknown'} detail={`${(capacity.assumptions || []).length} assumptions`} />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <div className="mb-4 flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-cyan-700" /><div><h2 className="text-sm font-semibold text-slate-950">Provider-neutral autoscaling recommendations</h2><p className="mt-1 text-xs text-slate-500">Operator guidance only; no provider mutation is available from this console.</p></div></div>
          <div className="space-y-3">{state.recommendations.length ? state.recommendations.map((item, index) => <div key={item.recommendationId || `${item.category}:${index}`} className="border border-slate-200 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-slate-900">{item.category || item.recommendation || 'capacity recommendation'}</p><StatusBadge tone={item.confidenceCategory === 'high' ? 'ready' : 'pending'}>{item.confidenceCategory || item.confidence || 'unknown'}</StatusBadge></div><p className="mt-2 text-xs text-slate-600">{item.safeSummary || item.description || item.action || '-'}</p><p className="mt-2 font-mono text-[10px] text-slate-500">{(item.safeReasonCodes || []).join(', ') || item.safeReasonCode || '-'}</p></div>) : <p className="py-6 text-center text-sm text-slate-500">No advisory recommendations are available.</p>}</div>
        </Panel>
        <Panel>
          <h2 className="text-sm font-semibold text-slate-950">Model assumptions and limitations</h2>
          <dl className="mt-4 space-y-4 text-xs"><Summary label="Environment" value={compactId(capacity.environmentFingerprintId)} mono /><Summary label="Queue-drain estimate" value={formatDuration(capacity.queueDrainTimeEstimateMs)} /><Summary label="Reserved capacity" value={capacity.reservedCapacityEstimate} /><Summary label="Assumptions" value={(capacity.assumptions || []).join(', ') || 'not reported'} /><Summary label="Limitations" value={(capacity.limitations || []).join(', ') || 'not reported'} /></dl>
        </Panel>
      </div>

      <Panel className="mb-5">
        <div className="mb-4"><h2 className="text-sm font-semibold text-slate-950">Capacity plan editor</h2><p className="mt-1 text-xs text-slate-500">Draft a versioned advisory plan from compatible capacity models.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TextField label="Plan name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
          <SelectField label="Scope" value={draft.scope} options={['workspace']} onChange={(scope) => setDraft({ ...draft, scope })} />
          <SelectField label="Workload" value={draft.workloadDomain} options={WORKLOAD_DOMAINS} onChange={(workloadDomain) => setDraft({ ...draft, workloadDomain })} />
          <SelectField label="Forecast" value={draft.forecastWindow} options={['current', 'seven_days', 'thirty_days', 'ninety_days']} onChange={(forecastWindow) => setDraft({ ...draft, forecastWindow })} />
          <NumberField label="Peak requests / second" value={draft.expectedPeakRequestsPerSecond} onChange={(expectedPeakRequestsPerSecond) => setDraft({ ...draft, expectedPeakRequestsPerSecond })} />
          <NumberField label="Peak concurrent runs" value={draft.expectedPeakConcurrentRuns} onChange={(expectedPeakConcurrentRuns) => setDraft({ ...draft, expectedPeakConcurrentRuns })} />
          <NumberField label="Peak concurrent nodes" value={draft.expectedPeakConcurrentNodes} onChange={(expectedPeakConcurrentNodes) => setDraft({ ...draft, expectedPeakConcurrentNodes })} />
          <NumberField label="Expected queue depth" value={draft.expectedQueueDepth} onChange={(expectedQueueDepth) => setDraft({ ...draft, expectedQueueDepth })} />
          <SelectField label="Data growth" value={draft.expectedDataGrowthCategory} options={['low', 'moderate', 'high', 'unknown']} onChange={(expectedDataGrowthCategory) => setDraft({ ...draft, expectedDataGrowthCategory })} />
          <NumberField label="Execution workers" value={draft.requiredExecutionWorkers} onChange={(requiredExecutionWorkers) => setDraft({ ...draft, requiredExecutionWorkers })} />
          <NumberField label="Recovery workers" value={draft.requiredRecoveryWorkers} onChange={(requiredRecoveryWorkers) => setDraft({ ...draft, requiredRecoveryWorkers })} />
          <NumberField label="Control-plane workers" value={draft.requiredControlPlaneWorkers} onChange={(requiredControlPlaneWorkers) => setDraft({ ...draft, requiredControlPlaneWorkers })} />
          <NumberField label="Worker concurrency" value={draft.recommendedWorkerConcurrency} onChange={(recommendedWorkerConcurrency) => setDraft({ ...draft, recommendedWorkerConcurrency })} />
          <NumberField label="Partition count" value={draft.recommendedPartitionCount} onChange={(recommendedPartitionCount) => setDraft({ ...draft, recommendedPartitionCount })} />
          <SelectField label="Database capacity" value={draft.recommendedDatabaseCapacityCategory} options={['minimal', 'standard', 'elevated', 'unknown']} onChange={(recommendedDatabaseCapacityCategory) => setDraft({ ...draft, recommendedDatabaseCapacityCategory })} />
          <SelectField label="Cache capacity" value={draft.recommendedCacheCapacityCategory} options={['minimal', 'standard', 'elevated', 'unknown']} onChange={(recommendedCacheCapacityCategory) => setDraft({ ...draft, recommendedCacheCapacityCategory })} />
          <NumberField label="Reserved recovery capacity" value={draft.reservedRecoveryCapacity} onChange={(reservedRecoveryCapacity) => setDraft({ ...draft, reservedRecoveryCapacity })} />
          <NumberField label="Minimum headroom bps" value={draft.minimumHeadroomBasisPoints} onChange={(minimumHeadroomBasisPoints) => setDraft({ ...draft, minimumHeadroomBasisPoints })} />
          <NumberField label="Failover requirement bps" value={draft.failoverCapacityRequirementBasisPoints} onChange={(failoverCapacityRequirementBasisPoints) => setDraft({ ...draft, failoverCapacityRequirementBasisPoints })} />
          <TextField label="Source capacity models" value={draft.sourceCapacityModelIds} onChange={(sourceCapacityModelIds) => setDraft({ ...draft, sourceCapacityModelIds })} />
        </div>
        <label className="mt-3 block text-xs font-medium text-slate-700">Description<textarea className="mt-1 min-h-20 w-full border border-slate-300 px-3 py-2 text-sm" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
        <div className="mt-4"><PrimaryButton onClick={createPlan} disabled={busy === 'create' || !draft.name || !draft.sourceCapacityModelIds.trim()}><Plus className="h-4 w-4" />Create draft</PrimaryButton></div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">Capacity plans</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1260px] text-left text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Plan</th><th>Version</th><th>Scope</th><th>Workload</th><th>Status</th><th>Forecast</th><th>Worker recommendation</th><th>Headroom</th><th>Regional capacity</th><th>Updated</th><th className="pr-4">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-200">{state.plans.map((item) => <tr key={`${safeId(item)}:${item.version}`}><td className="px-4 py-3 font-medium text-slate-900">{item.name}</td><td>v{item.version}</td><td>{item.scope}</td><td>{item.workloadDomain}</td><td><StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge></td><td>{item.forecastWindow}</td><td>{item.requiredExecutionWorkers} workers · {item.recommendedWorkerConcurrency} concurrent</td><td>{basisPoints(item.minimumHeadroomBasisPoints)}</td><td>{basisPoints(item.failoverCapacityRequirementBasisPoints)} failover</td><td>{formatDate(item.updatedAt)}</td><td className="pr-4"><div className="flex flex-wrap gap-2">{item.status === 'draft' ? <><button className="text-cyan-700 disabled:opacity-40" disabled={Boolean(busy)} onClick={() => lifecycle(item, 'validate')}>Validate</button><button className="text-cyan-700 disabled:opacity-40" disabled={Boolean(busy)} onClick={() => lifecycle(item, 'activate')}>Activate</button></> : null}{item.status === 'active' ? <button className="text-slate-600 disabled:opacity-40" disabled={Boolean(busy)} onClick={() => lifecycle(item, 'archive')}>Archive</button> : null}</div></td></tr>)}</tbody>
          </table>
          {!state.plans.length && !state.loading ? <p className="py-10 text-center text-sm text-slate-500">No capacity plans are visible.</p> : null}
        </div>
      </Panel>
    </>
  );
}

function capacityPlanPayload(draft, workspaceId) {
  return {
    ...draft,
    workspaceId,
    sourceCapacityModelIds: draft.sourceCapacityModelIds.split(',').map((value) => value.trim()).filter(Boolean),
    regionalCapacityRequirements: [
      {
        regionCategory: 'failover_target',
        failoverPolicy: 'full_primary_load',
        requiredCapacityBasisPoints: draft.failoverCapacityRequirementBasisPoints,
        requiredExecutionWorkers: draft.requiredExecutionWorkers,
        requiredRecoveryWorkers: draft.requiredRecoveryWorkers,
        headroomCategory: draft.minimumHeadroomBasisPoints >= 2000 ? 'adequate' : 'limited',
      },
    ],
    assumptions: ['compatible_environment_evidence', 'bounded_forecast_inputs'],
    limitations: ['advisory_only', 'no_provider_mutation'],
  };
}

function Summary({ label, value, mono = false }) {
  return <div><dt className="text-slate-500">{label}</dt><dd className={`mt-1 font-medium text-slate-900 ${mono ? 'font-mono text-[10px]' : ''}`}>{value ?? '-'}</dd></div>;
}

function safeId(item) {
  return item?.id || item?._id || item?.capacityPlanId || item?.capacityModelId || item?.modelId || '';
}

function compactId(value) {
  const text = String(value || '-');
  return text.length > 22 ? `${text.slice(0, 10)}…${text.slice(-8)}` : text;
}

function basisPoints(value) {
  return Number.isFinite(Number(value)) ? `${(Number(value) / 100).toFixed(2)}%` : '-';
}

function formatRate(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)} rps` : 'unknown';
}

function statusTone(status) {
  if (status === 'active') return 'ready';
  if (status === 'draft') return 'pending';
  if (status === 'archived') return 'limited';
  return 'neutral';
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
