import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { RecoveryActionDialog } from '../components/RecoveryActionDialog.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, PageHeader, Panel, SecondaryButton } from './pageChrome.jsx';

const ACTIONS = {
  retry: { label: 'Retry', description: 'Request another bounded attempt using the frozen recovery state.' },
  skip: { label: 'Skip', description: 'Skip this eligible node without fabricating an output.' },
  compensate: { label: 'Compensate', description: 'Create or continue the deterministic compensation plan.' },
  waive_compensation: { label: 'Waive compensation', description: 'Record an accepted-risk waiver without marking the step successful.', danger: true },
  replace_agent: { label: 'Replace agent', description: 'Use governed selection to freeze an authorized replacement.' },
  correct_input: { label: 'Correct input', description: 'Create a bounded correction version and request a new attempt.' },
  resume: { label: 'Resume', description: 'Resume from the verified durable recovery state.' },
  terminate: { label: 'Terminate run', description: 'Stop new work and preserve unresolved side effects and evidence.', danger: true },
  inspect_failure: { label: 'Record inspection', description: 'Record that the safe failure information was reviewed.' },
};

function actionEntries(item) {
  const source = item?.availableActions || item?.actions || {};
  return Object.entries(ACTIONS).flatMap(([kind, configuration]) => {
    const value = source[kind];
    const entry = value === true ? { allowed: true } : value;
    if (!entry || typeof entry !== 'object' || entry.allowed !== true) return [];
    return [{
      ...entry,
      ...configuration,
      kind,
      key: `${item.interventionId || item.id}_${kind}`,
      title: `${configuration.label} for this intervention?`,
      confirmLabel: configuration.label,
    }];
  });
}

function tone(status) {
  if (status === 'resolved') return 'ready';
  if (['rejected', 'expired', 'cancelled'].includes(status)) return 'offline';
  if (status === 'approval_required') return 'pending';
  return 'info';
}

export function InterventionDetail() {
  const { interventionId } = useParams();
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: true, error: null, item: null });
  const [selectedAction, setSelectedAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }),
    [identity.receivingWorkspaceId],
  );
  const load = useCallback(() => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null, item: null });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    apiClient.get(`/orchestration-interventions/${interventionId}?${query}`)
      .then((item) => setState({ loading: false, error: null, item }))
      .catch((error) => setState({ loading: false, error, item: null }));
  }, [interventionId, partnerConfigured, query]);
  useEffect(() => load(), [load]);

  async function resolve({ body, idempotencyKey }) {
    if (!selectedAction || busy) return;
    setBusy(true);
    try {
      await apiClient.post(
        `/orchestration-interventions/${interventionId}/resolve`,
        {
          workspaceId: identity.receivingWorkspaceId,
          resolutionAction: selectedAction.kind,
          safeResolutionReason: body.safeReasonCode,
          ...body,
        },
        { headers: { 'Idempotency-Key': idempotencyKey } },
      );
      recordEvent('Intervention resolution requested', `${selectedAction.kind} · ${interventionId}`, 'success');
      setSelectedAction(null);
      load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy(false);
    }
  }

  if (state.loading && !state.item) return <LoadingBlock label="Loading intervention" />;
  const item = state.item;
  const actions = actionEntries(item);
  const agent = item?.affectedAgent || {};
  const timeline = item?.auditTimeline || item?.timeline || [];

  return (
    <>
      <PageHeader
        eyebrow="Human intervention"
        title={item?.title || 'Intervention unavailable'}
        description={item ? `${item.interventionType} · created ${formatDate(item.createdAt)}` : ''}
        actions={<div className="flex gap-2"><Link to="/interventions" className="inline-flex min-h-10 items-center border border-slate-300 px-4 py-2 text-sm font-medium">All interventions</Link><SecondaryButton onClick={load} disabled={state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} /> Refresh</SecondaryButton></div>}
      />
      {state.error ? <ErrorAlert error={state.error} title="Intervention action failed" /> : null}
      {item ? (
        <div className="space-y-6">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">{item.safeSummary || 'No additional safe failure summary is available.'}</p></div>
              {actions.length ? <div className="flex flex-wrap gap-2">{actions.map((action) => <button key={action.kind} type="button" onClick={() => setSelectedAction(action)} className={`inline-flex min-h-9 items-center border px-3 py-2 text-xs font-medium ${action.danger ? 'border-rose-300 text-rose-800 hover:bg-rose-50' : 'border-slate-300 text-slate-800 hover:bg-slate-50'}`}>{action.label}</button>)}</div> : null}
            </div>
          </Panel>
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel>
              <h2 className="font-semibold">Safe failure summary</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <Detail label="Failure code" value={item.safeFailureCode} mono />
                <Detail label="Failure category" value={item.safeFailureCategory} />
                <Detail label="Node" value={item.nodeKey || item.nodeRunId} mono />
                <Detail label="Affected agent" value={agent.agentName || agent.name || agent.passportId || item.affectedAgentName || '-'} />
                <Detail label="Classification" value={item.classification || item.inputClassification} />
                <Detail label="Compensation availability" value={item.compensationAvailable === true || item.compensationAvailability === 'available' ? 'Available' : item.compensationAvailability || 'Unavailable'} />
                <Detail label="Recovery attempts" value={String(item.recoveryAttemptCount ?? item.recoveryAttempts ?? 0)} />
                <Detail label="Compensation attempts" value={String(item.compensationAttemptCount ?? item.compensationAttempts ?? 0)} />
              </dl>
            </Panel>
            <Panel>
              <h2 className="font-semibold">Decision linkage</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <Detail label="Run" value={item.orchestrationRunId} mono />
                <Detail label="Approval status" value={item.approvalStatus || (item.approvalRequestId ? 'Linked' : 'Not required')} />
                <Detail label="Approval request" value={item.approvalRequestId} mono />
                <Detail label="Recovery decision" value={item.recoveryDecisionId} mono />
                <Detail label="Trace ID" value={item.traceId} mono />
                <Detail label="Request ID" value={item.requestId} mono />
                <Detail label="Expires" value={formatDate(item.expiresAt)} />
                <Detail label="Resolved" value={formatDate(item.resolvedAt)} />
              </dl>
              <Link to={`/orchestrations/runs/${item.orchestrationRunId}`} className="mt-5 inline-flex text-sm font-medium text-cyan-800">Open orchestration run</Link>
            </Panel>
          </div>
          <Panel>
            <h2 className="font-semibold">Audit timeline</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-2">Event</th><th>Transition</th><th>Safe reason</th><th>Actor</th><th>Request</th><th>Created</th></tr></thead>
                <tbody className="divide-y">{timeline.length ? timeline.map((event, index) => <tr key={event.id || `${event.action}_${index}`}><td className="py-3 font-mono text-xs">{event.action}</td><td>{[event.fromState, event.toState].filter(Boolean).join(' → ') || '-'}</td><td className="font-mono text-xs">{event.safeReasonCode || '-'}</td><td className="font-mono text-xs">{event.actor || event.actorId || '-'}</td><td className="max-w-44 truncate font-mono text-xs">{event.requestId || '-'}</td><td className="text-xs">{formatDate(event.createdAt)}</td></tr>) : <tr><td colSpan="6" className="py-8 text-center text-slate-500">No intervention events are recorded.</td></tr>}</tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : null}
      <RecoveryActionDialog open={Boolean(selectedAction)} action={selectedAction} busy={busy} onConfirm={resolve} onClose={() => !busy && setSelectedAction(null)} />
    </>
  );
}

function Detail({ label, value, mono = false }) {
  return <div><dt className="text-xs uppercase text-slate-500">{label}</dt><dd className={`mt-1 break-words text-sm ${mono ? 'font-mono text-xs' : ''}`}>{value || '-'}</dd></div>;
}
