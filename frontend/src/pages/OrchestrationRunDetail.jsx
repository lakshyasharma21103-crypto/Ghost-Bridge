import { Ban, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ConfirmationDialog } from '../components/ConfirmationDialog.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, formatDuration, MetricCard, PageHeader, Panel, SecondaryButton } from './pageChrome.jsx';

const TERMINAL = new Set(['succeeded', 'failed', 'cancelled', 'partial_failure']);
function tone(status) {
  if (status === 'succeeded') return 'ready';
  if (['failed', 'cancelled'].includes(status)) return 'offline';
  if (status === 'partial_failure') return 'limited';
  if (status === 'waiting_approval') return 'pending';
  return 'info';
}

export function OrchestrationRunDetail() {
  const { runId } = useParams();
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: true, error: null, run: null, nodes: [] });
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }), [identity.receivingWorkspaceId]);
  const load = useCallback(() => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null, run: null, nodes: [] });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    Promise.all([
      apiClient.get(`/orchestrations/runs/${runId}?${query}`),
      apiClient.get(`/orchestrations/runs/${runId}/nodes?${query}`),
    ]).then(([run, nodes]) => setState({ loading: false, error: null, run, nodes: nodes.items || [] }))
      .catch((error) => setState((current) => ({ ...current, loading: false, error })));
  }, [partnerConfigured, query, runId]);
  useEffect(() => load(), [load]);

  async function cancel() {
    setCancelling(true);
    try {
      await apiClient.post(`/orchestrations/runs/${runId}/cancel`, { workspaceId: identity.receivingWorkspaceId });
      recordEvent('Orchestration cancellation requested', runId, 'success');
      setConfirming(false);
      load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setCancelling(false);
    }
  }

  if (state.loading && !state.run) return <LoadingBlock label="Loading orchestration run" />;
  const run = state.run;
  const completed = ['succeeded', 'failed', 'cancelled', 'skipped'].reduce((total, status) => total + Number(run?.progress?.[status] || 0), 0);
  return (
    <>
      <PageHeader eyebrow="Orchestration run" title={run ? `${run.definitionName} v${run.definitionVersion}` : 'Run unavailable'} description={run ? `Run ${run.runId} · trace ${run.traceId}` : ''} actions={<div className="flex gap-2"><Link to="/orchestrations/runs" className="inline-flex min-h-10 items-center border border-slate-300 px-4 py-2 text-sm font-medium">All runs</Link><SecondaryButton onClick={load} disabled={state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} /> Refresh</SecondaryButton>{run && !TERMINAL.has(run.status) ? <SecondaryButton onClick={() => setConfirming(true)} disabled={cancelling}><Ban className="h-4 w-4" /> Cancel</SecondaryButton> : null}</div>} />
      {state.error ? <ErrorAlert error={state.error} title="Run request failed" /> : null}
      {run ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Status" value={run.status} detail={`Updated ${formatDate(run.updatedAt)}`} tone={run.status === 'succeeded' ? 'emerald' : 'cyan'} /><MetricCard label="Progress" value={`${completed}/${run.progress?.total || 0}`} detail={`${run.activeNodeCount || 0} active nodes`} /><MetricCard label="Executions" value={run.nodeExecutionCount || 0} detail={`Concurrency ${run.concurrencyLimit}`} /><MetricCard label="Duration" value={formatDuration(run.durationMs)} detail={formatDate(run.startedAt || run.createdAt)} /></div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
            <Panel><div className="mb-4 flex items-center justify-between"><p className="font-semibold">Node executions</p><StatusBadge tone={tone(run.status)}>{run.status}</StatusBadge></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-2">Node</th><th>Status</th><th>Dependencies</th><th>Attempts</th><th>Approval</th><th>Failure</th><th>Started</th><th>Completed</th></tr></thead><tbody className="divide-y">{state.nodes.map((node) => <tr key={node.nodeRunId}><td className="py-3"><p className="font-medium">{node.nodeKey}</p><p className="font-mono text-xs text-slate-500">{node.capability}</p></td><td><StatusBadge tone={tone(node.status)}>{node.status}</StatusBadge></td><td>{node.dependencyNodeKeys.join(', ') || 'Root'}</td><td>{node.attempt}/{node.maxAttempts}</td><td>{node.approvalRequestId ? (node.approvalStatus || 'resolved') : 'Not required'}</td><td>{node.safeFailure ? <span title={node.safeFailure.message} className="font-mono text-xs text-rose-700">{node.safeFailure.code}</span> : '—'}</td><td className="text-xs">{formatDate(node.startedAt)}</td><td className="text-xs">{formatDate(node.completedAt)}</td></tr>)}</tbody></table></div></Panel>
            <div className="space-y-6">
              <Panel><p className="font-semibold">Safe input summary</p><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd>{run.safeInputSummary?.type || 'unknown'}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Fields</dt><dd className="max-w-52 text-right">{run.safeInputSummary?.fields?.join(', ') || '—'}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Bytes</dt><dd>{run.safeInputSummary?.bytes ?? '—'}</dd></div></dl></Panel>
              <Panel><p className="font-semibold">Traceability</p><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-xs text-slate-500">Trace ID</dt><dd className="break-all font-mono text-xs">{run.traceId}</dd></div><div><dt className="text-xs text-slate-500">Request ID</dt><dd className="break-all font-mono text-xs">{run.requestId}</dd></div><div><dt className="text-xs text-slate-500">Requested by</dt><dd className="break-all font-mono text-xs">{run.requestedBy}</dd></div></dl></Panel>
              {run.failureSummary ? <Panel className="border-rose-200 bg-rose-50"><p className="font-semibold text-rose-950">Safe failure</p><p className="mt-2 font-mono text-xs text-rose-800">{run.failureSummary.code}</p><p className="mt-2 text-sm text-rose-900">{run.failureSummary.message}</p></Panel> : null}
            </div>
          </div>
        </div>
      ) : null}
      <ConfirmationDialog open={confirming} title="Cancel orchestration run?" description="New node claims will stop immediately. Running Runtime Gateway invocations will receive the existing durable cancellation signal." confirmLabel="Request cancellation" busy={cancelling} onConfirm={cancel} onClose={() => setConfirming(false)} />
    </>
  );
}
