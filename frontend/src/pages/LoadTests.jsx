import { Play, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

const TEST_MODES = [
  'simulation',
  'local_smoke',
  'local_load',
  'integration_load',
  'staging_load',
  'staging_stress',
  'staging_soak',
  'production_observation_only',
];

const WORKLOAD_DOMAINS = [
  'interactive_api',
  'authentication_and_authorization',
  'agent_catalog',
  'agent_selection',
  'orchestration_submission',
  'orchestration_execution',
  'delegation',
  'recovery',
  'compensation',
  'approval_resume',
  'intervention_resolution',
  'queue_claiming',
  'database_read',
  'database_write',
  'cache_read',
  'cache_invalidation',
  'projection_rebuild',
  'observability_query',
  'slo_evaluation',
  'alert_evaluation',
  'regional_failover_simulation',
  'backup_restore_simulation',
];

const TRAFFIC_MODELS = [
  'closed_loop',
  'open_loop',
  'fixed_arrival',
  'stepped_arrival',
  'burst',
  'spike',
  'soak',
  'stress',
];

const ACTIVE_RUN_STATES = new Set([
  'requested',
  'validating',
  'approval_required',
  'approved',
  'preparing',
  'warming_up',
  'running',
  'cooling_down',
  'analyzing',
]);

const initialDraft = {
  name: 'Bounded local smoke',
  description: 'Deterministic authenticated workload using local safe adapters.',
  scope: 'workspace',
  testMode: 'local_smoke',
  workloadDomain: 'interactive_api',
  criticality: 'standard',
  trafficModel: 'closed_loop',
  durationMs: 30000,
  warmupDurationMs: 3000,
  steadyStateDurationMs: 24000,
  cooldownDurationMs: 3000,
  targetConcurrency: 4,
  maximumConcurrency: 8,
  targetRequestsPerSecond: 5,
  maximumRequestsPerSecond: 10,
  tenantCount: 2,
  workspaceCount: 2,
  userCount: 4,
  orchestrationDefinitionCount: 2,
  mockAgentCount: 3,
  workerCount: 2,
  requestMix: 'single_domain',
  failureInjectionProfileId: '',
  fixtureProfile: 'minimal',
  fixtureSeed: 13004,
  performanceBudgetPolicyId: '',
  targetId: '',
  cleanupPolicy: 'delete_fixture_set',
  stopCondition: 'unexpected_failure_rate',
  abortCondition: 'correctness_violation',
};

export function LoadTests() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({
    loading: false,
    error: null,
    runs: [],
    scenarios: [],
    budgets: [],
    targets: [],
    capacity: {},
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
      const [runs, scenarios, budgets, targets, capacity] = await Promise.all([
        apiClient.get(`/performance/runs?${query}`),
        apiClient.get(`/performance/scenarios?${query}`),
        apiClient.get(`/performance/budgets?${query}`),
        apiClient.get(`/performance/targets?${query}`),
        apiClient.get(`/performance/capacity?${query}`),
      ]);
      const runItems = Array.isArray(runs) ? runs : runs.items || [];
      const scenarioItems = Array.isArray(scenarios) ? scenarios : scenarios.items || [];
      const budgetItems = Array.isArray(budgets) ? budgets : budgets.items || [];
      const targetItems = Array.isArray(targets) ? targets : targets.items || targets.targets || [];
      setState({
        loading: false,
        error: null,
        runs: runItems,
        scenarios: scenarioItems,
        budgets: budgetItems,
        targets: targetItems,
        capacity: capacity.summary || capacity || {},
      });
      setDraft((current) => ({
        ...current,
        targetId: current.targetId || safeId(targetItems[0]),
        performanceBudgetPolicyId:
          current.performanceBudgetPolicyId ||
          safeId(budgetItems.find((item) => item.status === 'active')),
      }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createScenario() {
    setBusy('create-scenario');
    try {
      await apiClient.post(
        '/performance/scenarios',
        scenarioPayload(draft, identity.receivingWorkspaceId),
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
      recordEvent('Performance scenario draft created', draft.name, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  async function scenarioAction(scenario, action) {
    const scenarioId = safeId(scenario);
    setBusy(`${action}:${scenarioId}`);
    try {
      await apiClient.post(
        `/performance/scenarios/${encodeURIComponent(scenarioId)}/${action}`,
        {
          workspaceId: identity.receivingWorkspaceId,
          reasonCode: `PERFORMANCE_SCENARIO_${action.toUpperCase()}`,
        },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
      recordEvent(`Performance scenario ${action} complete`, scenario.name, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  async function createRun(scenario) {
    const scenarioId = safeId(scenario);
    setBusy(`run:${scenarioId}`);
    try {
      const result = await apiClient.post(
        '/performance/runs',
        {
          workspaceId: identity.receivingWorkspaceId,
          scenarioId,
          scenarioVersion: scenario.version,
          targetId: scenario.targetId || draft.targetId,
          reasonCode: 'PERFORMANCE_RUN_REQUESTED',
        },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
      recordEvent('Performance run requested', safeId(result) || scenario.name, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  const latest = state.runs[0] || {};
  const completed = state.runs.filter((run) =>
    ['passed', 'passed_with_warnings', 'failed'].includes(run.status),
  );
  const passed = completed.filter((run) =>
    ['passed', 'passed_with_warnings'].includes(run.status),
  ).length;
  const regressions = state.runs.filter((run) =>
    ['regressed', 'failed'].includes(run.regressionEvaluationStatus),
  ).length;
  const capacity = state.capacity || {};

  return (
    <>
      <PageHeader
        eyebrow="Operations / Performance and capacity"
        title="Load Tests"
        description="Bounded, authenticated synthetic workloads with correctness checks, safe targets, and explicit cleanup. Production remains observation-only."
        actions={
          <SecondaryButton onClick={load} disabled={!partnerConfigured || state.loading}>
            <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
            Refresh
          </SecondaryButton>
        }
      />
      <PerformanceCapacityNav />
      {state.error ? <ErrorAlert error={state.error} title="Performance request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading performance runs" /> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Active tests"
          value={state.runs.filter((run) => ACTIVE_RUN_STATES.has(run.status)).length}
          detail="bounded executions"
          tone="cyan"
        />
        <MetricCard
          label="Recent pass rate"
          value={completed.length ? `${Math.round((passed / completed.length) * 100)}%` : 'unknown'}
          detail={`${completed.length} evaluated runs`}
          tone={completed.length && passed === completed.length ? 'emerald' : 'slate'}
        />
        <MetricCard
          label="Recent regressions"
          value={regressions}
          detail="compatible comparisons only"
          tone={regressions ? 'coral' : 'emerald'}
        />
        <MetricCard
          label="Current throughput category"
          value={
            capacity.throughputCategory ||
            latest.throughputSummary?.category ||
            latest.throughputSummary?.throughputCategory ||
            'unknown'
          }
          detail="environment-specific"
        />
        <MetricCard
          label="Current latency category"
          value={latest.latencyPercentiles?.category || latest.latencyCategory || 'unknown'}
          detail={`p95 ${formatDuration(latest.latencyPercentiles?.p95Ms)}`}
        />
        <MetricCard
          label="Queue behavior"
          value={latest.queueSummary?.category || latest.queueSummary?.state || 'unknown'}
          detail={`wait ${formatDuration(latest.queueSummary?.p95QueueWaitMs)}`}
        />
        <MetricCard
          label="Database pressure"
          value={latest.databaseSummary?.pressureCategory || capacity.databaseCapacityCategory || 'unknown'}
          detail="bounded category"
        />
        <MetricCard
          label="Cache health"
          value={latest.cacheSummary?.healthCategory || capacity.cacheCapacityCategory || 'unknown'}
          detail={latest.cacheSummary?.hitRateCategory || 'no inferred health'}
        />
        <MetricCard
          label="Cleanup status"
          value={latest.cleanupStatus || 'unknown'}
          detail="synthetic fixtures only"
          tone={['completed', 'cleaned_up'].includes(latest.cleanupStatus) ? 'emerald' : 'slate'}
        />
      </div>

      <Panel className="mb-5 overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-950">Performance runs</h2>
          <p className="mt-1 text-xs text-slate-500">
            Expected rejections and overload shedding remain separate from unexpected failures.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1480px] text-left text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Run</th>
                <th>Scenario</th>
                <th>Mode</th>
                <th>Workload</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Concurrency</th>
                <th>Throughput</th>
                <th>Budget</th>
                <th>Regression</th>
                <th>Environment</th>
                <th>Started</th>
                <th className="pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {state.runs.map((run) => {
                const runId = safeId(run);
                return (
                  <tr key={runId}>
                    <td className="px-4 py-3 font-mono text-[10px]">{compactId(runId)}</td>
                    <td>
                      <p className="font-medium text-slate-900">{run.scenarioName || run.scenarioId}</p>
                      <p className="text-slate-500">v{run.scenarioVersion || '-'}</p>
                    </td>
                    <td>{run.mode || run.testMode}</td>
                    <td>{run.workloadDomain}</td>
                    <td><StatusBadge tone={statusTone(run.status)}>{run.status}</StatusBadge></td>
                    <td>{formatDuration(run.actualDurationMs || run.configuredDurationMs)}</td>
                    <td>{run.achievedConcurrency ?? run.targetConcurrency ?? '-'}</td>
                    <td>{rate(run.achievedRequestsPerSecond || run.throughputSummary?.requestsPerSecond)}</td>
                    <td><StatusBadge tone={statusTone(run.budgetEvaluationStatus)}>{run.budgetEvaluationStatus || 'pending'}</StatusBadge></td>
                    <td><StatusBadge tone={statusTone(run.regressionEvaluationStatus)}>{run.regressionEvaluationStatus || 'not_evaluated'}</StatusBadge></td>
                    <td className="font-mono text-[10px]">{compactId(run.environmentFingerprintId)}</td>
                    <td>{formatDate(run.startedAt || run.createdAt)}</td>
                    <td className="pr-4"><Link className="font-medium text-cyan-800" to={`/operations/load-tests/${runId}`}>Open</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!state.runs.length && !state.loading ? (
            <p className="py-10 text-center text-sm text-slate-500">No performance runs are visible.</p>
          ) : null}
        </div>
      </Panel>

      <Panel className="mb-5">
        <div className="mb-5 flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-cyan-700" />
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Scenario editor</h2>
            <p className="mt-1 text-xs text-slate-500">
              Only bounded fields, registered targets, and predefined workload domains are accepted.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TextField label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
          <SelectField label="Scope" value={draft.scope} options={['workspace']} onChange={(scope) => setDraft({ ...draft, scope })} />
          <SelectField label="Workload domain" value={draft.workloadDomain} options={WORKLOAD_DOMAINS} onChange={(workloadDomain) => setDraft({ ...draft, workloadDomain })} />
          <SelectField label="Test mode" value={draft.testMode} options={TEST_MODES} onChange={(testMode) => setDraft({ ...draft, testMode })} />
          <SelectField label="Traffic model" value={draft.trafficModel} options={TRAFFIC_MODELS} onChange={(trafficModel) => setDraft({ ...draft, trafficModel })} />
          <SelectField label="Criticality" value={draft.criticality} options={['low', 'standard', 'high', 'critical']} onChange={(criticality) => setDraft({ ...draft, criticality })} />
          <NumberField label="Duration ms" value={draft.durationMs} onChange={(durationMs) => setDraft({ ...draft, durationMs })} />
          <NumberField label="Warmup ms" value={draft.warmupDurationMs} onChange={(warmupDurationMs) => setDraft({ ...draft, warmupDurationMs })} />
          <NumberField label="Steady state ms" value={draft.steadyStateDurationMs} onChange={(steadyStateDurationMs) => setDraft({ ...draft, steadyStateDurationMs })} />
          <NumberField label="Cooldown ms" value={draft.cooldownDurationMs} onChange={(cooldownDurationMs) => setDraft({ ...draft, cooldownDurationMs })} />
          <NumberField label="Target concurrency" value={draft.targetConcurrency} onChange={(targetConcurrency) => setDraft({ ...draft, targetConcurrency })} />
          <NumberField label="Maximum concurrency" value={draft.maximumConcurrency} onChange={(maximumConcurrency) => setDraft({ ...draft, maximumConcurrency })} />
          <NumberField label="Target request rate" value={draft.targetRequestsPerSecond} onChange={(targetRequestsPerSecond) => setDraft({ ...draft, targetRequestsPerSecond })} />
          <NumberField label="Maximum request rate" value={draft.maximumRequestsPerSecond} onChange={(maximumRequestsPerSecond) => setDraft({ ...draft, maximumRequestsPerSecond })} />
          <NumberField label="Tenant count" value={draft.tenantCount} onChange={(tenantCount) => setDraft({ ...draft, tenantCount })} />
          <NumberField label="Workspace count" value={draft.workspaceCount} onChange={(workspaceCount) => setDraft({ ...draft, workspaceCount })} />
          <NumberField label="User count" value={draft.userCount} onChange={(userCount) => setDraft({ ...draft, userCount })} />
          <NumberField label="Definition count" value={draft.orchestrationDefinitionCount} onChange={(orchestrationDefinitionCount) => setDraft({ ...draft, orchestrationDefinitionCount })} />
          <NumberField label="Mock agent count" value={draft.mockAgentCount} onChange={(mockAgentCount) => setDraft({ ...draft, mockAgentCount })} />
          <NumberField label="Worker count" value={draft.workerCount} onChange={(workerCount) => setDraft({ ...draft, workerCount })} />
          <SelectField label="Request mix" value={draft.requestMix} options={['single_domain', 'balanced_read_write']} onChange={(requestMix) => setDraft({ ...draft, requestMix })} />
          <SelectField label="Failure injection" value={draft.failureInjectionProfileId} options={[['Disabled', ''], ['Deterministic safe faults', 'deterministic_safe_faults']]} onChange={(failureInjectionProfileId) => setDraft({ ...draft, failureInjectionProfileId })} />
          <SelectField label="Fixture profile" value={draft.fixtureProfile} options={['minimal', 'standard', 'orchestration', 'regional']} onChange={(fixtureProfile) => setDraft({ ...draft, fixtureProfile })} />
          <NumberField label="Fixture seed" value={draft.fixtureSeed} onChange={(fixtureSeed) => setDraft({ ...draft, fixtureSeed })} />
          <SelectField label="Performance budget" value={draft.performanceBudgetPolicyId} options={state.budgets.map((item) => [item.name || safeId(item), safeId(item)])} onChange={(performanceBudgetPolicyId) => setDraft({ ...draft, performanceBudgetPolicyId })} placeholder="Select active budget" />
          <SelectField label="Safe target" value={draft.targetId} options={state.targets.map((item) => [item.safeDisplayName || item.displayName || safeId(item), safeId(item)])} onChange={(targetId) => setDraft({ ...draft, targetId })} placeholder="Select registered target" />
          <SelectField label="Cleanup" value={draft.cleanupPolicy} options={['delete_fixture_set', 'archive_evidence', 'retain_summary']} onChange={(cleanupPolicy) => setDraft({ ...draft, cleanupPolicy })} />
          <SelectField label="Stop condition" value={draft.stopCondition} options={['unexpected_failure_rate', 'queue_depth_hard_limit', 'target_unavailable', 'manual_cancellation']} onChange={(stopCondition) => setDraft({ ...draft, stopCondition })} />
          <SelectField label="Abort condition" value={draft.abortCondition} options={['correctness_violation', 'security_violation', 'cross_tenant_response', 'credential_pattern', 'database_unavailable', 'regional_split_brain_risk', 'cleanup_failure_risk']} onChange={(abortCondition) => setDraft({ ...draft, abortCondition })} />
        </div>
        <label className="mt-3 block text-xs font-medium text-slate-700">Description<textarea className="mt-1 min-h-20 w-full border border-slate-300 px-3 py-2 text-sm" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={createScenario} disabled={busy === 'create-scenario' || !draft.name || !draft.targetId || !draft.performanceBudgetPolicyId}>
            <Plus className="h-4 w-4" />Create draft
          </PrimaryButton>
          <p className="text-xs text-slate-500">Validation and activation remain separate RBAC, policy, approval, and operational checks.</p>
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-950">Scenario versions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Scenario</th><th>Version</th><th>Scope</th><th>Mode</th><th>Workload</th><th>Traffic</th><th>Limits</th><th>Budget</th><th>Status</th><th className="pr-4">Validation / activation</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {state.scenarios.map((scenario) => {
                const scenarioId = safeId(scenario);
                return <tr key={`${scenarioId}:${scenario.version}`}><td className="px-4 py-3"><p className="font-medium text-slate-900">{scenario.name}</p><p className="font-mono text-[10px] text-slate-500">{compactId(scenarioId)}</p></td><td>v{scenario.version}</td><td>{scenario.scope}</td><td>{scenario.testMode}</td><td>{scenario.workloadDomain}</td><td>{scenario.trafficModel}</td><td>{scenario.maximumConcurrency ?? scenario.targetConcurrency} concurrent / {scenario.maximumRequestsPerSecond ?? scenario.targetRequestsPerSecond} rps</td><td>v{scenario.performanceBudgetPolicyVersion || '-'}</td><td><StatusBadge tone={statusTone(scenario.status)}>{scenario.status}</StatusBadge></td><td className="pr-4"><div className="flex flex-wrap gap-2">{scenario.status === 'draft' ? <><button className="text-cyan-700 disabled:opacity-40" disabled={Boolean(busy)} onClick={() => scenarioAction(scenario, 'validate')}>Validate</button><button className="text-cyan-700 disabled:opacity-40" disabled={Boolean(busy)} onClick={() => scenarioAction(scenario, 'activate')}>Activate</button></> : null}{scenario.status === 'active' ? <><button className="inline-flex items-center gap-1 text-cyan-700 disabled:opacity-40" disabled={Boolean(busy)} onClick={() => createRun(scenario)}><Play className="h-3.5 w-3.5" />Create run</button><button className="text-slate-600 disabled:opacity-40" disabled={Boolean(busy)} onClick={() => scenarioAction(scenario, 'archive')}>Archive</button></> : null}</div></td></tr>;
              })}
            </tbody>
          </table>
          {!state.scenarios.length && !state.loading ? <p className="py-10 text-center text-sm text-slate-500">No load scenarios are visible.</p> : null}
        </div>
      </Panel>
    </>
  );
}

function scenarioPayload(draft, workspaceId) {
  const {
    requestMix: requestMixChoice,
    stopCondition,
    abortCondition,
    ...scenario
  } = draft;
  const stages = [
    ['warmup', draft.warmupDurationMs],
    ['steady_state', draft.steadyStateDurationMs],
    ['cooldown', draft.cooldownDurationMs],
  ].filter(([, durationMs]) => durationMs > 0).map(([stageName, durationMs], sequence) => ({
    stageName,
    order: sequence + 1,
    durationMs,
    targetConcurrency: stageName === 'cooldown' ? 0 : draft.targetConcurrency,
    targetRequestsPerSecond: stageName === 'cooldown' ? 0 : draft.targetRequestsPerSecond,
    expectedBackpressureState: 'any',
    expectedAdmissionOutcomeCategory: 'any',
  }));
  return {
    ...scenario,
    workspaceId,
    stageDefinitions: stages,
    requestMix: requestMixChoice === 'balanced_read_write'
      ? [
          { workloadDomain: 'database_read', weightBasisPoints: 7000 },
          { workloadDomain: 'database_write', weightBasisPoints: 3000 },
        ]
      : [{ workloadDomain: draft.workloadDomain, weightBasisPoints: 10000 }],
    stopConditions: [stopCondition],
    abortConditions: [abortCondition],
  };
}

function safeId(item) {
  return item?.id || item?._id || item?.runId || item?.scenarioId || item?.budgetPolicyId || item?.targetId || '';
}

function compactId(value) {
  const text = String(value || '-');
  return text.length > 18 ? `${text.slice(0, 8)}…${text.slice(-8)}` : text;
}

function rate(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)} rps` : '-';
}

function statusTone(status) {
  if (['active', 'passed', 'cleaned_up', 'improved', 'unchanged', 'approved'].includes(status)) return 'ready';
  if (['failed', 'aborted', 'cancelled', 'regressed', 'rejected'].includes(status)) return 'offline';
  if (['passed_with_warnings', 'approval_required', 'insufficient_data', 'incompatible_environment', 'cleanup_required'].includes(status)) return 'pending';
  if (['running', 'warming_up', 'cooling_down', 'analyzing', 'validating', 'preparing'].includes(status)) return 'info';
  return 'neutral';
}

function TextField({ label, value, onChange }) {
  return <label className="text-xs font-medium text-slate-700">{label}<input className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function NumberField({ label, value, onChange }) {
  return <label className="text-xs font-medium text-slate-700">{label}<input type="number" min="0" className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function SelectField({ label, value, options, onChange, placeholder }) {
  return <label className="text-xs font-medium text-slate-700">{label}<select className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{placeholder ? <option value="">{placeholder}</option> : null}{options.map((entry) => { const [optionLabel, optionValue] = Array.isArray(entry) ? entry : [entry, entry]; return <option key={`${optionValue}:${optionLabel}`} value={optionValue}>{optionLabel}</option>; })}</select></label>;
}
