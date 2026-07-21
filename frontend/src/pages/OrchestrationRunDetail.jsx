import { Ban, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ConfirmationDialog } from '../components/ConfirmationDialog.jsx';
import { RecoveryActionDialog } from '../components/RecoveryActionDialog.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, formatDuration, MetricCard, PageHeader, Panel, SecondaryButton } from './pageChrome.jsx';

const TERMINAL = new Set(['succeeded', 'failed', 'partial_failure', 'cancelled', 'terminated', 'terminated_with_accepted_risk']);
const RUN_ACTIONS = {
  plan: { label: 'Plan compensation', description: 'Create a deterministic plan from the frozen run state.' },
  resume: { label: 'Resume recovery', description: 'Resume from the current verified durable state.' },
  terminate: { label: 'Terminate run', description: 'Stop new work while preserving completed evidence and unresolved side effects.', danger: true },
  create_checkpoint: { label: 'Create checkpoint', description: 'Create and verify a safe state checkpoint for this run.' },
};
const NODE_ACTIONS = {
  retry: { label: 'Retry', description: 'Request another bounded attempt using the current frozen target.' },
  skip: { label: 'Skip', description: 'Skip this eligible node without fabricating an output.' },
  correct_input: { label: 'Correct input', description: 'Create a bounded correction version and request a new attempt.' },
  replace_agent: { label: 'Replace agent', description: 'Use governed selection to freeze an authorized replacement.' },
  compensate: { label: 'Compensate', description: 'Create or continue explicit compensation for this completed node.' },
  waive_compensation: { label: 'Waive compensation', description: 'Record an accepted-risk waiver without marking compensation successful.', danger: true },
  terminate: RUN_ACTIONS.terminate,
};

function tone(status) {
  if (['succeeded', 'recovered', 'compensated', 'verified'].includes(status)) return 'ready';
  if (['failed', 'cancelled', 'terminated', 'compensation_failed', 'invalidated'].includes(status)) return 'offline';
  if (['partial_failure', 'terminated_with_accepted_risk', 'non_reversible'].includes(status)) return 'limited';
  if (['waiting_approval', 'waiting_intervention', 'recovery_pending', 'compensation_pending', 'termination_requested', 'pending'].includes(status)) return 'pending';
  return 'info';
}

function allowedEntry(source, name) {
  const value = source?.[name];
  if (value === true) return { allowed: true };
  return value && typeof value === 'object' && value.allowed === true ? value : null;
}

function advertisedActions(source, definitions, scope = {}) {
  return Object.entries(definitions).flatMap(([kind, configuration]) => {
    const entry = allowedEntry(source, kind);
    if (!entry) return [];
    return [{
      ...entry,
      ...configuration,
      ...scope,
      kind,
      key: `${scope.nodeRunId || scope.checkpointId || scope.runId || 'recovery'}_${kind}`,
      title: `${configuration.label}?`,
      confirmLabel: configuration.label,
    }];
  });
}

async function optionalGet(path, fallback) {
  try {
    return await apiClient.get(path);
  } catch (error) {
    if (error?.status === 404) return fallback;
    throw error;
  }
}

export function OrchestrationRunDetail() {
  const { runId } = useParams();
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: true, error: null, run: null, nodes: [], recovery: null, checkpoints: [] });
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [recoveryAction, setRecoveryAction] = useState(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }),
    [identity.receivingWorkspaceId],
  );
  const load = useCallback(async () => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null, run: null, nodes: [], recovery: null, checkpoints: [] });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [run, nodes, recovery, checkpointData] = await Promise.all([
        apiClient.get(`/orchestrations/runs/${runId}?${query}`),
        apiClient.get(`/orchestrations/runs/${runId}/nodes?${query}`),
        optionalGet(`/orchestrations/runs/${runId}/recovery?${query}`, null),
        optionalGet(`/orchestrations/runs/${runId}/checkpoints?${query}`, { items: [] }),
      ]);
      setState({
        loading: false,
        error: null,
        run,
        nodes: nodes.items || [],
        recovery,
        checkpoints: checkpointData.items || recovery?.checkpoints || [],
      });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
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

  async function applyRecoveryAction({ body, idempotencyKey }) {
    if (!recoveryAction || recoveryBusy) return;
    setRecoveryBusy(true);
    try {
      let path;
      if (recoveryAction.kind === 'create_checkpoint') {
        path = `/orchestrations/runs/${runId}/checkpoints`;
      } else if (recoveryAction.kind === 'resume_checkpoint') {
        path = `/orchestrations/runs/${runId}/checkpoints/${recoveryAction.checkpointId}/resume`;
      } else if (recoveryAction.nodeRunId && recoveryAction.kind !== 'terminate') {
        path = `/orchestrations/runs/${runId}/nodes/${recoveryAction.nodeRunId}/${recoveryAction.kind.replaceAll('_', '-')}`;
      } else {
        path = `/orchestrations/runs/${runId}/recovery/${recoveryAction.kind}`;
      }
      await apiClient.post(
        path,
        {
          workspaceId: identity.receivingWorkspaceId,
          ...(recoveryAction.nodeRunId ? { nodeRunId: recoveryAction.nodeRunId } : {}),
          ...body,
        },
        { headers: { 'Idempotency-Key': idempotencyKey } },
      );
      recordEvent('Orchestration recovery action requested', `${recoveryAction.kind} · ${runId}`, 'success');
      setRecoveryAction(null);
      load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setRecoveryBusy(false);
    }
  }

  if (state.loading && !state.run) return <LoadingBlock label="Loading orchestration run" />;
  const run = state.run;
  const recovery = state.recovery || {};
  const completed = Number.isInteger(run?.progress?.completed) ? run.progress.completed : ['succeeded', 'failed', 'cancelled', 'skipped', 'compensated', 'compensation_failed', 'non_reversible', 'terminated'].reduce((total, status) => total + Number(run?.progress?.[status] || 0), 0);
  const runActions = advertisedActions(recovery.availableActions, RUN_ACTIONS, { runId });
  const currentFailure = recovery.currentFailure || run?.failureSummary;
  const compensation = recovery.compensation || recovery.compensationProgress || {};
  const unresolved = recovery.unresolvedSideEffects || [];
  const intervention = recovery.intervention || recovery.currentIntervention;
  const timeline = recovery.timeline || recovery.recoveryTimeline || [];
  const policy = recovery.recoveryPolicy || run?.recoveryPolicy || {};

  return (
    <>
      <PageHeader eyebrow="Orchestration run" title={run ? `${run.definitionName} v${run.definitionVersion}` : 'Run unavailable'} description={run ? `Run ${run.runId} · trace ${run.traceId}` : ''} actions={<div className="flex flex-wrap gap-2"><Link to="/orchestrations/runs" className="inline-flex min-h-10 items-center border border-slate-300 px-4 py-2 text-sm font-medium">All runs</Link><SecondaryButton onClick={load} disabled={state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} /> Refresh</SecondaryButton>{run && !TERMINAL.has(run.status) ? <SecondaryButton onClick={() => setConfirming(true)} disabled={cancelling}><Ban className="h-4 w-4" /> Cancel</SecondaryButton> : null}</div>} />
      {state.error ? <ErrorAlert error={state.error} title="Run request failed" /> : null}
      {run ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Status" value={run.status} detail={`Updated ${formatDate(run.updatedAt)}`} tone={run.status === 'succeeded' ? 'emerald' : 'cyan'} /><MetricCard label="Progress" value={`${completed}/${run.progress?.total || 0}`} detail={`${run.activeNodeCount || 0} active nodes`} /><MetricCard label="Recovery status" value={recovery.status || run.recoveryStatus || 'not_required'} detail={`${recovery.recoveryAttemptCount ?? 0} recovery attempts`} tone={recovery.status === 'recovered' ? 'emerald' : 'slate'} /><MetricCard label="Duration" value={formatDuration(run.durationMs)} detail={formatDate(run.startedAt || run.createdAt)} /></div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
            <Panel>
              <div className="mb-4 flex items-center justify-between"><p className="font-semibold">Node executions</p><StatusBadge tone={tone(run.status)}>{run.status}</StatusBadge></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1280px] text-left text-sm">
                  <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-2">Node</th><th>Status</th><th>Recoverability</th><th>Dependencies</th><th>Attempts</th><th>Recovery</th><th>Compensation</th><th>Approval</th><th>Failure</th><th>Completed</th><th>Actions</th></tr></thead>
                  <tbody className="divide-y">{state.nodes.map((node) => {
                    const source = recovery.nodeActionsById?.[node.nodeRunId] || node.availableActions;
                    const actions = advertisedActions(source, NODE_ACTIONS, { nodeRunId: node.nodeRunId, runId });
                    return <tr key={node.nodeRunId}><td className="py-3"><p className="font-medium">{node.nodeKey}</p><p className="font-mono text-xs text-slate-500">{node.capability}</p></td><td><StatusBadge tone={tone(node.status)}>{node.status}</StatusBadge></td><td>{node.recoverability || '-'}</td><td>{node.dependencyNodeKeys?.join(', ') || 'Root'}</td><td>{node.attempt}/{node.maxAttempts}</td><td>{node.recoveryAttempt ?? 0}/{node.maximumRecoveryAttempts ?? '-'}</td><td><StatusBadge tone={tone(node.compensationStatus || 'not_required')}>{node.compensationStatus || 'not_required'}</StatusBadge></td><td>{node.approvalRequestId ? (node.approvalStatus || 'resolved') : 'Not required'}</td><td>{node.safeFailure ? <span title={node.safeFailure.message} className="font-mono text-xs text-rose-700">{node.safeFailure.code}</span> : '—'}</td><td className="text-xs">{formatDate(node.completedAt)}</td><td><div className="flex max-w-72 flex-wrap gap-1">{actions.map((action) => <button key={action.kind} type="button" onClick={() => setRecoveryAction(action)} className={`border px-2 py-1 text-xs font-medium ${action.danger ? 'border-rose-300 text-rose-800 hover:bg-rose-50' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>{action.label}</button>)}</div></td></tr>;
                  })}</tbody>
                </table>
              </div>
            </Panel>
            <div className="space-y-6">
              <Panel><p className="font-semibold">Recovery policy</p><dl className="mt-4 space-y-3 text-sm"><SummaryRow label="Policy" value={policy.name || policy.policyId || run.recoveryPolicyId || 'Platform default'} /><SummaryRow label="Version" value={policy.version || run.recoveryPolicyVersion || '-'} /><SummaryRow label="Strategy" value={recovery.failureStrategy || policy.defaultFailureStrategy || run.failureStrategy || '-'} mono /><SummaryRow label="Deadline" value={formatDate(recovery.recoveryDeadlineAt)} /></dl></Panel>
              <Panel><p className="font-semibold">Safe input summary</p><dl className="mt-4 space-y-3 text-sm"><SummaryRow label="Type" value={run.safeInputSummary?.type || 'unknown'} /><SummaryRow label="Fields" value={run.safeInputSummary?.fields?.join(', ') || '—'} /><SummaryRow label="Bytes" value={run.safeInputSummary?.bytes ?? '—'} /></dl></Panel>
              <Panel><p className="font-semibold">Traceability</p><dl className="mt-4 space-y-3 text-sm"><SummaryRow label="Trace ID" value={run.traceId} mono /><SummaryRow label="Request ID" value={run.requestId} mono /><SummaryRow label="Requested by" value={run.requestedBy} mono /></dl></Panel>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel className={currentFailure ? 'border-rose-200 bg-rose-50' : ''}><h2 className="font-semibold">Current failure</h2>{currentFailure ? <dl className="mt-4 space-y-3"><SummaryRow label="Code" value={currentFailure.safeFailureCode || currentFailure.code} mono /><SummaryRow label="Category" value={currentFailure.safeFailureCategory || currentFailure.category} /><SummaryRow label="Node" value={currentFailure.nodeKey || currentFailure.nodeRunId} mono /><SummaryRow label="Summary" value={currentFailure.safeSummary || currentFailure.message} /></dl> : <p className="mt-3 text-sm text-slate-500">No active failure is recorded.</p>}</Panel>
            <Panel><h2 className="font-semibold">Available actions</h2><p className="mt-1 text-xs text-slate-500">Only actions advertised for the current actor and durable state are shown.</p>{runActions.length ? <div className="mt-4 flex flex-wrap gap-2">{runActions.map((action) => <button key={action.kind} type="button" onClick={() => setRecoveryAction(action)} className={`border px-3 py-2 text-xs font-medium ${action.danger ? 'border-rose-300 text-rose-800 hover:bg-rose-50' : 'border-slate-300 text-slate-800 hover:bg-slate-50'}`}>{action.label}</button>)}</div> : <p className="mt-4 text-sm text-slate-500">No recovery action is currently available.</p>}</Panel>
            <Panel><h2 className="font-semibold">Intervention status</h2>{intervention ? <div className="mt-4"><StatusBadge tone={tone(intervention.status)}>{intervention.status}</StatusBadge><p className="mt-3 text-sm">{intervention.title || intervention.interventionType}</p><p className="mt-1 text-xs text-slate-500">Expires {formatDate(intervention.expiresAt)}</p><Link to={`/interventions/${intervention.interventionId || intervention.id}`} className="mt-4 inline-flex text-sm font-medium text-cyan-800">Open intervention</Link></div> : <p className="mt-3 text-sm text-slate-500">No active intervention is linked.</p>}</Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel><h2 className="font-semibold">Compensation progress</h2><dl className="mt-4 grid grid-cols-2 gap-4 text-sm"><SummaryRow label="Plan status" value={compensation.planStatus || compensation.status || 'not_planned'} /><SummaryRow label="Total steps" value={compensation.totalStepCount ?? compensation.total ?? 0} /><SummaryRow label="Completed" value={compensation.completedStepCount ?? compensation.completed ?? 0} /><SummaryRow label="Failed" value={compensation.failedStepCount ?? compensation.failed ?? 0} /><SummaryRow label="Non-reversible" value={compensation.nonReversibleStepCount ?? compensation.nonReversible ?? 0} /><SummaryRow label="Waived" value={compensation.waivedStepCount ?? compensation.waived ?? 0} /></dl></Panel>
            <Panel><h2 className="font-semibold">Unresolved side effects</h2>{unresolved.length ? <ul className="mt-4 divide-y text-sm">{unresolved.map((effect, index) => <li key={effect.sideEffectId || `${effect.nodeKey}_${index}`} className="py-3"><div className="flex justify-between gap-4"><span className="font-medium">{effect.nodeKey || effect.category || 'Recorded effect'}</span><StatusBadge tone="limited">{effect.status || 'unresolved'}</StatusBadge></div><p className="mt-1 font-mono text-xs text-slate-500">{effect.safeReasonCode || effect.category || '-'}</p></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No unresolved side effects are recorded.</p>}</Panel>
          </div>

          <Panel>
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Checkpoints</h2><p className="mt-1 text-xs text-slate-500">Verified checkpoints preserve safe state references and hashes.</p></div></div>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-2">Sequence</th><th>Checkpoint</th><th>Status</th><th>Run state</th><th>Completed</th><th>Created</th><th>Action</th></tr></thead><tbody className="divide-y">{state.checkpoints.length ? state.checkpoints.map((checkpoint) => { const resume = allowedEntry(checkpoint.availableActions, 'resume'); return <tr key={checkpoint.checkpointId || checkpoint.checkpointKey}><td className="py-3">{checkpoint.sequence}</td><td className="font-mono text-xs">{checkpoint.checkpointKey}</td><td><StatusBadge tone={tone(checkpoint.status)}>{checkpoint.status}</StatusBadge></td><td>{checkpoint.runStatus}</td><td>{checkpoint.completedNodeCount ?? checkpoint.completedNodeKeys?.length ?? 0}</td><td className="text-xs">{formatDate(checkpoint.createdAt)}</td><td>{resume ? <button type="button" onClick={() => setRecoveryAction({ ...resume, kind: 'resume_checkpoint', checkpointId: checkpoint.checkpointId, key: `${checkpoint.checkpointId}_resume`, label: 'Resume', title: 'Resume from this checkpoint?', description: 'Revalidate current access and resume without repeating completed logical work.', confirmLabel: 'Resume checkpoint' })} className="border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50">Resume</button> : null}</td></tr>; }) : <tr><td colSpan="7" className="py-8 text-center text-slate-500">No checkpoints are recorded.</td></tr>}</tbody></table></div>
          </Panel>

          <Panel>
            <h2 className="font-semibold">Recovery timeline</h2>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-2">Event</th><th>Transition</th><th>Safe reason</th><th>Actor</th><th>Request</th><th>Created</th></tr></thead><tbody className="divide-y">{timeline.length ? timeline.map((event, index) => <tr key={event.id || `${event.action}_${index}`}><td className="py-3 font-mono text-xs">{event.action}</td><td>{[event.fromState, event.toState].filter(Boolean).join(' → ') || '-'}</td><td className="font-mono text-xs">{event.safeReasonCode || '-'}</td><td className="font-mono text-xs">{event.actor || event.actorId || '-'}</td><td className="max-w-44 truncate font-mono text-xs">{event.requestId || '-'}</td><td className="text-xs">{formatDate(event.createdAt)}</td></tr>) : <tr><td colSpan="6" className="py-8 text-center text-slate-500">No recovery events are recorded.</td></tr>}</tbody></table></div>
          </Panel>
        </div>
      ) : null}
      <ConfirmationDialog open={confirming} title="Cancel orchestration run?" description="New node claims will stop immediately. Running Runtime Gateway invocations will receive the existing durable cancellation signal." confirmLabel="Request cancellation" busy={cancelling} onConfirm={cancel} onClose={() => setConfirming(false)} />
      <RecoveryActionDialog open={Boolean(recoveryAction)} action={recoveryAction} busy={recoveryBusy} onConfirm={applyRecoveryAction} onClose={() => !recoveryBusy && setRecoveryAction(null)} />
    </>
  );
}

function SummaryRow({ label, value, mono = false }) {
  return <div><dt className="text-xs uppercase text-slate-500">{label}</dt><dd className={`mt-1 break-words text-sm ${mono ? 'font-mono text-xs' : ''}`}>{value ?? '-'}</dd></div>;
}
