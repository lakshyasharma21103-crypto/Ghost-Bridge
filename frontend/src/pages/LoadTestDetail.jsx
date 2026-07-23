import { Download, Play, RefreshCw, ShieldAlert, Trash2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ConfirmationDialog } from '../components/ConfirmationDialog.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { PerformanceCapacityNav } from '../components/PerformanceCapacityNav.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import {
  MetricCard,
  PageHeader,
  Panel,
  SecondaryButton,
  formatDate,
  formatDuration,
} from './pageChrome.jsx';

const EXECUTABLE_STATES = new Set(['requested', 'approved']);
const CANCELLABLE_STATES = new Set([
  'validating',
  'approval_required',
  'approved',
  'preparing',
  'warming_up',
  'running',
  'cooling_down',
]);
const ABORTABLE_STATES = new Set(['preparing', 'warming_up', 'running', 'cooling_down', 'analyzing']);
const CLEANUP_STATES = new Set([
  'passed',
  'passed_with_warnings',
  'failed',
  'aborted',
  'cancelled',
  'cleanup_required',
]);

async function optionalGet(path, fallback) {
  try {
    return await apiClient.get(path);
  } catch (error) {
    if (error?.status === 404) return fallback;
    throw error;
  }
}

export function LoadTestDetail() {
  const { runId } = useParams();
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({
    loading: true,
    error: null,
    run: null,
    windows: [],
    budget: null,
    regression: null,
  });
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState('');
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }),
    [identity.receivingWorkspaceId],
  );

  const load = useCallback(async () => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null, run: null, windows: [], budget: null, regression: null });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [runResult, windows, budget, regression] = await Promise.all([
        apiClient.get(`/performance/runs/${encodeURIComponent(runId)}?${query}`),
        optionalGet(`/performance/runs/${encodeURIComponent(runId)}/windows?${query}`, { items: [] }),
        optionalGet(`/performance/runs/${encodeURIComponent(runId)}/budget-evaluation?${query}`, null),
        optionalGet(`/performance/runs/${encodeURIComponent(runId)}/regression?${query}`, null),
      ]);
      setState({
        loading: false,
        error: null,
        run: runResult.run || runResult,
        windows: Array.isArray(windows) ? windows : windows.items || windows.windows || [],
        budget: budget?.evaluation || budget,
        regression: regression?.evaluation || regression,
      });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, query, runId]);

  useEffect(() => {
    void load();
  }, [load]);

  function requestAction(action) {
    const labels = {
      execute: ['Execute load test', 'Execute bounded test'],
      cancel: ['Cancel load test', 'Request cancellation'],
      abort: ['Abort load test', 'Abort test'],
      cleanup: ['Clean up synthetic fixtures', 'Run bounded cleanup'],
      capacity: ['Create capacity model', 'Create advisory model'],
    };
    setConfirmation({
      action,
      title: labels[action]?.[0] || 'Performance control',
      confirmLabel: labels[action]?.[1] || 'Confirm',
      reasonCode: `PERFORMANCE_RUN_${action.toUpperCase()}`,
    });
  }

  async function runAction() {
    if (!confirmation || busy) return;
    const action = confirmation.action;
    setBusy(action);
    try {
      const suffix = action === 'capacity' ? 'capacity-model' : action;
      await apiClient.post(
        `/performance/runs/${encodeURIComponent(runId)}/${suffix}`,
        {
          workspaceId: identity.receivingWorkspaceId,
          reasonCode: confirmation.reasonCode,
          ...(action === 'execute' ? { mode: run.mode || run.testMode, manualConfirmation: true } : {}),
        },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
      recordEvent(`Performance run ${action} requested`, runId, 'success');
      setConfirmation(null);
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  async function downloadExport() {
    setBusy('export');
    try {
      const result = await apiClient.get(`/performance/runs/${encodeURIComponent(runId)}/export?${query}`);
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `performance-${runId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      recordEvent('Safe performance export downloaded', runId, 'success');
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  if (state.loading && !state.run) return <LoadingBlock label="Loading performance run" />;
  const run = state.run;
  if (!run) {
    return (
      <>
        <PageHeader title="Load test unavailable" eyebrow="Operations / Performance and capacity" />
        <PerformanceCapacityNav />
        {state.error ? <ErrorAlert error={state.error} title="Performance run request failed" /> : null}
      </>
    );
  }

  const latency = run.latencyPercentiles || {};
  const throughput = run.throughputSummary || {};
  const queue = run.queueSummary || {};
  const workers = run.workerSummary || {};
  const database = run.databaseSummary || {};
  const cache = run.cacheSummary || {};
  const fairness = run.fairnessSummary || {};
  const recovery = run.recoverySummary || {};
  const regional = run.regionalSummary || {};
  const budget = state.budget || run.budgetEvaluation || {};
  const regression = state.regression || run.regressionEvaluation || {};
  const capacity = run.capacityModel || run.capacitySummary || {};
  const timeline = run.timeline || run.safeTimeline || [];
  const audit = run.auditEvents || run.auditSummary || [];
  const warnings = run.safeWarnings || [];
  const bottlenecks = run.bottleneckSummary?.items || run.bottleneckSummary || [];
  const observationOnly = (run.mode || run.testMode) === 'production_observation_only';

  return (
    <>
      <PageHeader
        eyebrow="Operations / Performance and capacity / Load test"
        title={run.scenarioName || `Run ${compactId(runId)}`}
        description={`Scenario v${run.scenarioVersion || '-'} · ${run.workloadDomain || '-'} · environment ${compactId(run.environmentFingerprintId)}`}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <Link className="inline-flex min-h-10 items-center border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800" to="/operations/load-tests">All tests</Link>
            <SecondaryButton onClick={load} disabled={state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>
            <SecondaryButton onClick={downloadExport} disabled={Boolean(busy)}><Download className="h-4 w-4" />Export</SecondaryButton>
            {EXECUTABLE_STATES.has(run.status) && !observationOnly ? <SecondaryButton onClick={() => requestAction('execute')} disabled={Boolean(busy)}><Play className="h-4 w-4" />Execute</SecondaryButton> : null}
            {CANCELLABLE_STATES.has(run.status) ? <SecondaryButton onClick={() => requestAction('cancel')} disabled={Boolean(busy)}><XCircle className="h-4 w-4" />Cancel</SecondaryButton> : null}
            {ABORTABLE_STATES.has(run.status) ? <SecondaryButton onClick={() => requestAction('abort')} disabled={Boolean(busy)}><ShieldAlert className="h-4 w-4" />Abort</SecondaryButton> : null}
            {CLEANUP_STATES.has(run.status) && !['completed', 'cleaned_up'].includes(run.cleanupStatus) ? <SecondaryButton onClick={() => requestAction('cleanup')} disabled={Boolean(busy)}><Trash2 className="h-4 w-4" />Cleanup</SecondaryButton> : null}
          </div>
        }
      />
      <PerformanceCapacityNav />
      {state.error ? <ErrorAlert error={state.error} title="Performance run request failed" /> : null}
      {observationOnly ? <div className="mb-5 border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">Production observation only: traffic generation is disabled. This view reads existing safe metrics.</div> : null}
      {warnings.length ? <div className="mb-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><p className="font-semibold">Safe warnings</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs">{warnings.map((warning, index) => <li key={`${asText(warning)}:${index}`}>{asText(warning)}</li>)}</ul></div> : null}

      <section aria-labelledby="performance-summary" className="mb-6">
        <h2 id="performance-summary" className="sr-only">Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Status" value={run.status} detail={`cleanup ${run.cleanupStatus || 'not_required'}`} tone={statusTone(run.status) === 'ready' ? 'emerald' : statusTone(run.status) === 'offline' ? 'coral' : 'cyan'} />
          <MetricCard label="Requests" value={run.requestCount ?? 0} detail={`${run.successfulRequestCount ?? 0} successful`} />
          <MetricCard label="Expected rejections" value={run.expectedRejectionCount ?? 0} detail={`${run.unexpectedFailureCount ?? 0} unexpected failures`} tone={run.unexpectedFailureCount ? 'coral' : 'emerald'} />
          <MetricCard label="Latency p95" value={formatDuration(latency.p95Ms ?? latency.p95)} detail={`p99 ${formatDuration(latency.p99Ms ?? latency.p99)}`} />
          <MetricCard label="Throughput" value={formatRate(run.achievedRequestsPerSecond ?? throughput.requestsPerSecond)} detail={`target ${formatRate(run.targetRequestsPerSecond)}`} tone="cyan" />
          <MetricCard label="Concurrency" value={run.achievedConcurrency ?? '-'} detail={`target ${run.targetConcurrency ?? '-'}`} />
          <MetricCard label="Budget" value={run.budgetEvaluationStatus || budget.status || 'not_evaluated'} detail={`policy v${run.budgetPolicyVersion || '-'}`} tone={statusTone(run.budgetEvaluationStatus) === 'offline' ? 'coral' : 'slate'} />
          <MetricCard label="Regression" value={run.regressionEvaluationStatus || regression.status || 'not_evaluated'} detail="compatible environments only" />
        </div>
      </section>

      <div className="space-y-5">
        <DetailPanel title="Summary" description="Safe scenario, target, fingerprint, request lineage, and outcome categories.">
          <KeyGrid items={[
            ['Scenario version', run.scenarioVersion],
            ['Target category', run.targetCategory || run.performanceTarget?.category || run.targetId],
            ['Environment fingerprint', run.environmentFingerprintId],
            ['Mode', run.mode || run.testMode],
            ['Traffic model', run.trafficModel],
            ['Configured duration', formatDuration(run.configuredDurationMs)],
            ['Actual duration', formatDuration(run.actualDurationMs)],
            ['Cleanup status', run.cleanupStatus],
            ['Request ID', run.requestId],
            ['Trace ID', run.traceId],
          ]} />
        </DetailPanel>

        <DetailPanel title="Stages" description="Warmup is excluded from steady-state budget evaluation; cooldown measures recovery.">
          <div className="mb-4 grid gap-3 sm:grid-cols-3"><StageCard label="Warmup" value={formatDuration(run.warmupDurationMs || run.stageSummary?.warmupDurationMs)} /><StageCard label="Steady state" value={formatDuration(run.steadyStateDurationMs || run.stageSummary?.steadyStateDurationMs)} /><StageCard label="Cooldown" value={formatDuration(run.cooldownDurationMs || run.stageSummary?.cooldownDurationMs)} /></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-xs"><thead className="border-b text-slate-500"><tr><th className="py-2">Window</th><th>Stage</th><th>Requests</th><th>Success</th><th>Expected rejection</th><th>Unexpected failure</th><th>Started</th><th>Ended</th></tr></thead><tbody className="divide-y divide-slate-200">{state.windows.map((window, index) => <tr key={window.id || window.sequence || index}><td className="py-3">{window.sequence ?? index + 1}</td><td>{window.stageCategory || window.stage || window.stageName}</td><td>{window.requestCount ?? 0}</td><td>{window.successCount ?? window.successfulRequestCount ?? 0}</td><td>{window.expectedRejectionCount ?? 0}</td><td>{window.unexpectedFailureCount ?? 0}</td><td>{formatDate(window.windowStart || window.startedAt)}</td><td>{formatDate(window.windowEnd || window.completedAt)}</td></tr>)}</tbody></table>{!state.windows.length ? <p className="py-6 text-center text-sm text-slate-500">No measurement windows are available.</p> : null}</div>
        </DetailPanel>

        <div className="grid gap-5 xl:grid-cols-2">
          <DetailPanel title="Latency"><KeyGrid items={[['p50', formatDuration(latency.p50Ms ?? latency.p50)], ['p90', formatDuration(latency.p90Ms ?? latency.p90)], ['p95', formatDuration(latency.p95Ms ?? latency.p95)], ['p99', formatDuration(latency.p99Ms ?? latency.p99)], ['Maximum', formatDuration(latency.maximumMs ?? latency.maxMs)], ['Client wait', formatDuration(latency.clientWaitMs)], ['Admission', formatDuration(latency.admissionMs)], ['Execution', formatDuration(latency.executionMs)]]} /></DetailPanel>
          <DetailPanel title="Throughput"><KeyGrid items={[['Target requests / second', formatRate(run.targetRequestsPerSecond)], ['Achieved requests / second', formatRate(run.achievedRequestsPerSecond ?? throughput.requestsPerSecond)], ['Completion rate', formatRate(throughput.completionRatePerSecond)], ['Arrival rate', formatRate(throughput.arrivalRatePerSecond)], ['Successful requests', run.successfulRequestCount], ['Timeouts', run.timeoutCount], ['Retries', run.retryCount], ['Cancellations', run.cancelledCount]]} /></DetailPanel>
          <DetailPanel title="Queue"><KeyGrid items={[['Category', queue.category || queue.state], ['p50 queue wait', formatDuration(queue.p50QueueWaitMs)], ['p95 queue wait', formatDuration(queue.p95QueueWaitMs)], ['p99 queue wait', formatDuration(queue.p99QueueWaitMs)], ['Oldest queue age', formatDuration(queue.maximumOldestQueueAgeMs || queue.oldestQueueAgeMs)], ['Drain estimate', formatDuration(queue.estimatedDrainTimeMs)], ['Accepted work preserved', yesNo(queue.acceptedWorkPreserved)], ['Backpressure', queue.backpressureState]]} /></DetailPanel>
          <DetailPanel title="Workers"><KeyGrid items={[['Worker count', workers.workerCount], ['Maximum slots', workers.maximumSlots], ['Achieved concurrency', workers.achievedConcurrency], ['Utilization', basisPoints(workers.utilizationBasisPoints)], ['Claims', workers.claimCount], ['Lease expiries', workers.leaseExpiryCount], ['Duplicate execution', workers.duplicateExecutionCount], ['Protected recovery slots', workers.protectedRecoverySlots]]} /></DetailPanel>
          <DetailPanel title="Database"><KeyGrid items={[['Pressure category', database.pressureCategory], ['Operation category', database.operationCategory], ['p95 operation', formatDuration(database.p95OperationMs)], ['Pool usage', database.poolUsageCategory], ['Indexed reads', database.indexedReadCount], ['Unindexed reads', database.unindexedReadCount], ['Timeout category', database.timeoutCategory], ['Query governance', database.queryGovernanceStatus]]} /></DetailPanel>
          <DetailPanel title="Cache"><KeyGrid items={[['Health category', cache.healthCategory], ['Hit-rate category', cache.hitRateCategory], ['Hits', cache.hitCount], ['Misses', cache.missCount], ['p95 operation', formatDuration(cache.p95OperationMs)], ['Invalidation lag', cache.invalidationLagCategory], ['Cold-read category', cache.coldReadCategory], ['Warm-read category', cache.warmReadCategory]]} /></DetailPanel>
          <DetailPanel title="Fairness"><KeyGrid items={[['Service skew', basisPoints(fairness.tenantServiceSkewBasisPoints)], ['Starvation window', formatDuration(fairness.maximumTenantStarvationWindowMs)], ['Noisy tenant', fairness.noisyTenantCategory], ['Normal tenant served', yesNo(fairness.normalTenantContinuedReceivingService)], ['Weighted scheduling', fairness.weightedSchedulingStatus], ['Quota rejection category', fairness.quotaRejectionCategory]]} /></DetailPanel>
          <DetailPanel title="Recovery"><KeyGrid items={[['Recovery p95', formatDuration(recovery.p95RecoveryDurationMs)], ['Compensation p95', formatDuration(recovery.p95CompensationDurationMs)], ['Recovery success', basisPoints(recovery.recoverySuccessRateBasisPoints)], ['Accepted work durable', yesNo(recovery.acceptedWorkDurable)], ['Lease recovery', recovery.leaseRecoveryStatus], ['Stale worker fenced', yesNo(recovery.staleWorkerFenced)], ['Duplicate completion', recovery.duplicateCompletionCount], ['Protected capacity', recovery.protectedCapacityStatus]]} /></DetailPanel>
          <DetailPanel title="Regional"><KeyGrid items={[['Simulation', regional.simulationStatus], ['Failover RTO', formatDuration(regional.failoverRtoMs)], ['Failover RPO', formatDuration(regional.failoverRpoMs)], ['Routing error rate', basisPoints(regional.routingErrorRateBasisPoints)], ['Authority transfer', regional.authorityTransferStatus], ['Queue ownership', regional.queueOwnershipTransferStatus], ['Stale writer rejected', yesNo(regional.staleWriterRejected)], ['Resumed exactly once', yesNo(regional.resumedExactlyOnce)]]} /></DetailPanel>
          <DetailPanel title="Budget"><div className="mb-3"><StatusBadge tone={statusTone(budget.status || run.budgetEvaluationStatus)}>{budget.status || run.budgetEvaluationStatus || 'not_evaluated'}</StatusBadge></div><KeyGrid items={[['Policy version', budget.policyVersion || run.budgetPolicyVersion], ['Sample size', budget.sampleSize || run.requestCount], ['Minimum sample size', budget.minimumSampleSize], ['Failure rate', basisPoints(budget.unexpectedFailureRateBasisPoints)], ['Timeout rate', basisPoints(budget.timeoutRateBasisPoints)], ['Overload rejection rate', basisPoints(budget.overloadRejectionRateBasisPoints)], ['Warnings', asText(budget.safeWarnings)], ['Reasons', asText(budget.safeReasonCodes)]]} /></DetailPanel>
          <DetailPanel title="Regression"><div className="mb-3"><StatusBadge tone={statusTone(regression.status || run.regressionEvaluationStatus)}>{regression.status || run.regressionEvaluationStatus || 'not_evaluated'}</StatusBadge></div><KeyGrid items={[['Baseline', regression.baselineId || run.baselineId], ['Environment compatibility', regression.environmentCompatibility || regression.environmentCompatibilityStatus], ['Latency change', basisPoints(regression.latencyChangeBasisPoints)], ['Throughput change', basisPoints(regression.throughputChangeBasisPoints)], ['Failure-rate change', basisPoints(regression.failureRateChangeBasisPoints)], ['Classification', regression.classification], ['Absolute tolerance', formatDuration(regression.absoluteToleranceMs)], ['Reasons', asText(regression.safeReasonCodes)]]} /></DetailPanel>
          <DetailPanel title="Capacity" description="Estimates are advisory and apply only to the recorded environment."><KeyGrid items={[['Sustainable throughput estimate', formatRate(capacity.sustainableThroughputEstimate)], ['Safe concurrency estimate', capacity.safeConcurrencyEstimate], ['Saturation point estimate', capacity.saturationPointEstimate], ['Queue-drain estimate', formatRate(capacity.queueDrainRateEstimate)], ['Reserved capacity estimate', capacity.reservedCapacityEstimate], ['Headroom', capacity.headroomCategory || basisPoints(capacity.minimumHeadroomBasisPoints)], ['Confidence', capacity.confidenceCategory], ['Limitations', asText(capacity.limitations)]]} /><button type="button" className="mt-4 text-xs font-medium text-cyan-800 disabled:opacity-40" onClick={() => requestAction('capacity')} disabled={Boolean(busy)}>Create capacity model</button></DetailPanel>
          <DetailPanel title="Bottleneck summary"><div className="space-y-2">{Array.isArray(bottlenecks) && bottlenecks.length ? bottlenecks.map((item, index) => <div key={`${item.category || item.safeReasonCode || index}`} className="border border-slate-200 p-3 text-xs"><div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-900">{item.category || 'bounded finding'}</p><StatusBadge tone={item.confidence === 'high' ? 'offline' : 'pending'}>{item.confidence || 'unknown'}</StatusBadge></div><p className="mt-1 font-mono text-slate-500">{item.safeReasonCode || item.summary || '-'}</p></div>) : <p className="text-sm text-slate-500">No bottleneck is reported.</p>}</div></DetailPanel>
        </div>

        <DetailPanel title="Timeline"><SafeEventTable items={timeline} empty="No safe timeline events are available." /></DetailPanel>
        <DetailPanel title="Audit"><SafeEventTable items={Array.isArray(audit) ? audit : []} empty="No audit events are projected in this response." /></DetailPanel>
      </div>

      <ConfirmationDialog
        open={Boolean(confirmation)}
        title={confirmation?.title || 'Performance control'}
        description="Authorization, policy, target eligibility, approval, operational state, and correctness guards are revalidated at execution."
        confirmLabel={confirmation?.confirmLabel || 'Confirm'}
        busy={Boolean(busy)}
        onClose={() => !busy && setConfirmation(null)}
        onConfirm={runAction}
      >
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <KeyValue label="Target display" value={run.targetDisplayName || run.targetCategory || run.targetId || 'registered target'} />
          <KeyValue label="Mode" value={run.mode || run.testMode} />
          <KeyValue label="Duration display" value={formatDuration(run.configuredDurationMs)} />
          <KeyValue label="Concurrency display" value={`${run.targetConcurrency ?? '-'} target / ${run.maximumConcurrency ?? '-'} maximum`} />
          <KeyValue label="Request-rate display" value={`${run.targetRequestsPerSecond ?? '-'} target / ${run.maximumRequestsPerSecond ?? '-'} maximum rps`} />
          <KeyValue label="Cleanup-plan display" value={run.cleanupPolicy || run.cleanupStatus || 'bounded idempotent cleanup'} />
          <KeyValue label="Reason code" value={confirmation?.reasonCode} mono />
          <KeyValue label="Approval state" value={run.approvalState || (run.approvalRequestId ? 'validated by server' : 'not required')} />
        </dl>
      </ConfirmationDialog>
    </>
  );
}

function DetailPanel({ title, description, children }) {
  return <Panel><div className="mb-4"><h2 className="text-sm font-semibold text-slate-950">{title}</h2>{description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}</div>{children}</Panel>;
}

function KeyGrid({ items }) {
  return <dl className="grid gap-x-5 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">{items.map(([label, value]) => <KeyValue key={label} label={label} value={value} mono={/ID|fingerprint|Reasons/.test(label)} />)}</dl>;
}

function KeyValue({ label, value, mono = false }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className={`mt-1 break-words font-medium text-slate-900 ${mono ? 'font-mono text-[11px]' : ''}`}>{value === undefined || value === null || value === '' ? '-' : asText(value)}</dd></div>;
}

function StageCard({ label, value }) {
  return <div className="border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-900">{value}</p></div>;
}

function SafeEventTable({ items, empty }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-xs"><thead className="border-b text-slate-500"><tr><th className="py-2">Time</th><th>Event</th><th>Status</th><th>Safe reason</th><th>Actor category</th><th>Request</th></tr></thead><tbody className="divide-y divide-slate-200">{items.map((event, index) => <tr key={event.id || `${event.eventType || event.action}:${index}`}><td className="py-3">{formatDate(event.occurredAt || event.createdAt)}</td><td>{event.eventType || event.action || event.category}</td><td><StatusBadge tone={statusTone(event.status)}>{event.status || '-'}</StatusBadge></td><td className="font-mono text-[10px]">{event.safeReasonCode || event.safeSummary || '-'}</td><td>{event.actorCategory || event.actorType || '-'}</td><td className="font-mono text-[10px]">{compactId(event.requestId)}</td></tr>)}</tbody></table>{!items.length ? <p className="py-6 text-center text-sm text-slate-500">{empty}</p> : null}</div>;
}

function compactId(value) {
  const text = String(value || '-');
  return text.length > 22 ? `${text.slice(0, 10)}…${text.slice(-8)}` : text;
}

function formatRate(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)} rps` : '-';
}

function basisPoints(value) {
  return Number.isFinite(Number(value)) ? `${(Number(value) / 100).toFixed(2)}%` : '-';
}

function yesNo(value) {
  return value === true ? 'yes' : value === false ? 'no' : 'unknown';
}

function asText(value) {
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ') || '-';
  if (value && typeof value === 'object') return value.safeReasonCode || value.category || value.status || '-';
  return String(value ?? '-');
}

function statusTone(status) {
  if (['active', 'passed', 'cleaned_up', 'improved', 'unchanged', 'approved', 'succeeded'].includes(status)) return 'ready';
  if (['failed', 'aborted', 'cancelled', 'regressed', 'rejected'].includes(status)) return 'offline';
  if (['passed_with_warnings', 'approval_required', 'insufficient_data', 'incompatible_environment', 'cleanup_required'].includes(status)) return 'pending';
  if (['running', 'warming_up', 'cooling_down', 'analyzing', 'validating', 'preparing'].includes(status)) return 'info';
  return 'neutral';
}
