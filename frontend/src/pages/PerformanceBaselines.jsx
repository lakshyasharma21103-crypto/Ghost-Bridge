import { Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ConfirmationDialog } from '../components/ConfirmationDialog.jsx';
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

export function PerformanceBaselines() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, items: [], runs: [] });
  const [draft, setDraft] = useState({ baselineName: 'Local smoke baseline', sourceRunId: '' });
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState('');
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }),
    [identity.receivingWorkspaceId],
  );

  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [baselines, runs] = await Promise.all([
        apiClient.get(`/performance/baselines?${query}`),
        apiClient.get(`/performance/runs?${query}`),
      ]);
      const baselineItems = Array.isArray(baselines) ? baselines : baselines.items || [];
      const runItems = Array.isArray(runs) ? runs : runs.items || [];
      const eligibleRuns = runItems.filter((run) =>
        ['passed', 'passed_with_warnings'].includes(run.status),
      );
      setState({ loading: false, error: null, items: baselineItems, runs: eligibleRuns });
      setDraft((current) => ({ ...current, sourceRunId: current.sourceRunId || safeId(eligibleRuns[0]) }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createBaseline() {
    setBusy('create');
    try {
      await apiClient.post(
        '/performance/baselines',
        {
          workspaceId: identity.receivingWorkspaceId,
          baselineName: draft.baselineName,
          sourceRunId: draft.sourceRunId,
          reasonCode: 'PERFORMANCE_BASELINE_CANDIDATE_CREATED',
        },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
      recordEvent('Performance baseline candidate created', draft.baselineName, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  async function lifecycle() {
    if (!confirmation || busy) return;
    const id = safeId(confirmation.item);
    setBusy(confirmation.action);
    try {
      await apiClient.post(
        `/performance/baselines/${encodeURIComponent(id)}/${confirmation.action}`,
        {
          workspaceId: identity.receivingWorkspaceId,
          reasonCode: `PERFORMANCE_BASELINE_${confirmation.action.toUpperCase()}`,
        },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
      recordEvent(`Performance baseline ${confirmation.action} complete`, confirmation.item.baselineName, 'success');
      setConfirmation(null);
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
        title="Baselines"
        description="Immutable, versioned reference results. Comparisons require compatible environment fingerprints and preserve prior active history."
        actions={<SecondaryButton onClick={load} disabled={!partnerConfigured || state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>}
      />
      <PerformanceCapacityNav />
      {state.error ? <ErrorAlert error={state.error} title="Performance baseline request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading performance baselines" /> : null}

      <Panel className="mb-5">
        <div className="mb-4"><h2 className="text-sm font-semibold text-slate-950">Create baseline candidate</h2><p className="mt-1 text-xs text-slate-500">Only completed passing runs are offered. Promotion revalidates compatibility and authorization.</p></div>
        <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end">
          <label className="text-xs font-medium text-slate-700">Baseline name<input className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={draft.baselineName} onChange={(event) => setDraft({ ...draft, baselineName: event.target.value })} /></label>
          <label className="text-xs font-medium text-slate-700">Passing source run<select className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={draft.sourceRunId} onChange={(event) => setDraft({ ...draft, sourceRunId: event.target.value })}><option value="">Select a compatible run</option>{state.runs.map((run) => <option key={safeId(run)} value={safeId(run)}>{run.scenarioName || run.workloadDomain} · {compactId(safeId(run))} · {compactId(run.environmentFingerprintId)}</option>)}</select></label>
          <PrimaryButton onClick={createBaseline} disabled={busy === 'create' || !draft.baselineName || !draft.sourceRunId}><Plus className="h-4 w-4" />Create candidate</PrimaryButton>
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">Baseline versions</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] text-left text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Baseline</th><th>Workload</th><th>Scenario</th><th>Environment</th><th>Status</th><th>Latency</th><th>Throughput</th><th>Error rate</th><th>Created</th><th>Promoted</th><th className="pr-4">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-200">{state.items.map((item) => <tr key={`${safeId(item)}:${item.baselineVersion}`}><td className="px-4 py-3"><p className="font-medium text-slate-900">{item.baselineName}</p><p className="text-slate-500">v{item.baselineVersion}</p></td><td>{item.workloadDomain}</td><td>{compactId(item.scenarioId)} · v{item.scenarioVersion || '-'}</td><td className="font-mono text-[10px]">{compactId(item.environmentFingerprintId)}</td><td><StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge></td><td>p95 {formatDuration(item.latencyPercentiles?.p95Ms)}</td><td>{formatRate(item.throughputSummary?.requestsPerSecond || item.throughputSummary?.sustainableThroughput)}</td><td>{basisPoints(item.summaryMetrics?.unexpectedFailureRateBasisPoints || item.summaryMetrics?.errorRateBasisPoints)}</td><td>{formatDate(item.createdAt)}</td><td>{formatDate(item.approvedAt)}</td><td className="pr-4"><div className="flex gap-2">{item.status === 'candidate' ? <button className="text-cyan-700 disabled:opacity-40" disabled={Boolean(busy)} onClick={() => setConfirmation({ item, action: 'promote' })}>Promote</button> : null}{['candidate', 'active', 'superseded', 'rejected'].includes(item.status) ? <button className="text-slate-600 disabled:opacity-40" disabled={Boolean(busy)} onClick={() => setConfirmation({ item, action: 'archive' })}>Archive</button> : null}</div></td></tr>)}</tbody>
          </table>
          {!state.items.length && !state.loading ? <p className="py-10 text-center text-sm text-slate-500">No performance baselines are visible.</p> : null}
        </div>
      </Panel>

      <ConfirmationDialog
        open={Boolean(confirmation)}
        title={`${confirmation?.action === 'promote' ? 'Promote' : 'Archive'} baseline?`}
        description="The source run, environment fingerprint, scope, and current authorization will be revalidated. Existing baseline history is retained."
        confirmLabel={confirmation?.action === 'promote' ? 'Promote compatible baseline' : 'Archive baseline'}
        busy={Boolean(busy)}
        onClose={() => !busy && setConfirmation(null)}
        onConfirm={lifecycle}
      >
        <dl className="grid gap-3 text-xs sm:grid-cols-2"><Summary label="Baseline" value={`${confirmation?.item?.baselineName || '-'} v${confirmation?.item?.baselineVersion || '-'}`} /><Summary label="Workload" value={confirmation?.item?.workloadDomain} /><Summary label="Environment" value={compactId(confirmation?.item?.environmentFingerprintId)} mono /><Summary label="Reason" value={`PERFORMANCE_BASELINE_${confirmation?.action?.toUpperCase() || 'CONTROL'}`} mono /></dl>
      </ConfirmationDialog>
    </>
  );
}

function Summary({ label, value, mono = false }) {
  return <div><dt className="text-slate-500">{label}</dt><dd className={`mt-1 font-medium text-slate-900 ${mono ? 'font-mono text-[10px]' : ''}`}>{value || '-'}</dd></div>;
}

function safeId(item) {
  return item?.id || item?._id || item?.baselineId || item?.runId || '';
}

function compactId(value) {
  const text = String(value || '-');
  return text.length > 20 ? `${text.slice(0, 9)}…${text.slice(-8)}` : text;
}

function formatRate(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)} rps` : '-';
}

function basisPoints(value) {
  return Number.isFinite(Number(value)) ? `${(Number(value) / 100).toFixed(2)}%` : '-';
}

function statusTone(status) {
  if (status === 'active') return 'ready';
  if (status === 'candidate') return 'pending';
  if (status === 'rejected') return 'offline';
  if (['superseded', 'archived'].includes(status)) return 'limited';
  return 'neutral';
}
