import { Ban, Eye, RefreshCw, RotateCcw, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ConfirmationDialog } from '../components/ConfirmationDialog.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, formatDuration, PageHeader, Panel, SecondaryButton } from './pageChrome.jsx';

const EMPTY_SELECTION = { loading: false, error: null, item: null, attempts: [] };

export function Invocations() {
  const { identity, partnerConfigured } = useAppState();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: null, items: [] });
  const [selected, setSelected] = useState(EMPTY_SELECTION);
  const [control, setControl] = useState({ busy: false, error: null, message: '' });
  const [confirmation, setConfirmation] = useState(null);
  const requestedInvocationId = searchParams.get('invocationId');

  const load = useCallback(async () => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null, items: [] });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await apiClient.get(`/invocations?${new URLSearchParams(identity)}`);
      setState({ loading: false, error: null, items: data.items || [] });
    } catch (error) {
      setState({ loading: false, error, items: [] });
    }
  }, [identity.receivingWorkspaceId, identity.receivingUserId, partnerConfigured]);

  const inspect = useCallback(
    async (invocationId) => {
      if (!partnerConfigured || !invocationId) {
        setSelected(EMPTY_SELECTION);
        return;
      }
      setSelected({ loading: true, error: null, item: null, attempts: [] });
      const identityQuery = new URLSearchParams(identity);
      try {
        const [item, attempts] = await Promise.all([
          apiClient.get(`/invocations/${invocationId}?${identityQuery}`),
          apiClient.get(`/invocations/${invocationId}/attempts?${identityQuery}`),
        ]);
        setSelected({
          loading: false,
          error: null,
          item,
          attempts: attempts.items || [],
        });
      } catch (error) {
        setSelected({ loading: false, error, item: null, attempts: [] });
      }
    },
    [identity.receivingWorkspaceId, identity.receivingUserId, partnerConfigured],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    inspect(requestedInvocationId);
  }, [inspect, requestedInvocationId]);

  function selectInvocation(invocationId) {
    if (requestedInvocationId === invocationId) {
      inspect(invocationId);
      return;
    }
    setSearchParams({ invocationId });
  }

  function closeDetail() {
    setSearchParams({});
    setControl({ busy: false, error: null, message: '' });
  }

  async function runControlAction() {
    if (!partnerConfigured || !confirmation || !selected.item || control.busy) return;
    const invocationId = selected.item.invocationId;
    const request = controlRequest(confirmation, selected.item, identity);
    setControl({ busy: true, error: null, message: '' });
    try {
      const result = await apiClient.post(
        `/invocations/${invocationId}/${request.endpoint}`,
        request.body,
      );
      setConfirmation(null);
      setControl({
        busy: false,
        error: null,
        message: safeActionMessage(result, confirmation.kind),
      });
      await Promise.all([load(), inspect(invocationId)]);
    } catch (error) {
      setConfirmation(null);
      setControl({ busy: false, error, message: '' });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Runtime gateway"
        title="Invocations"
        description="Inspect safe lifecycle, attempt, cancellation, progress, and recovery metadata for gateway work."
        actions={
          <SecondaryButton onClick={load} disabled={state.loading || !partnerConfigured}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </SecondaryButton>
        }
      />
      {!partnerConfigured ? (
        <div
          className="mb-6 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <ShieldAlert className="mr-2 inline h-4 w-4" aria-hidden="true" />
          <strong>Partner access required.</strong>{' '}
          <Link className="font-semibold underline" to="/settings">
            Configure a Partner API key in Settings
          </Link>{' '}
          to load workspace invocations.
        </div>
      ) : null}
      {state.error ? <ErrorAlert error={state.error} title="Could not load invocations" /> : null}
      {state.loading ? <LoadingBlock label="Loading invocations" /> : null}
      {!state.loading && !state.error ? (
        state.items.length ? (
          <>
            <InvocationTable items={state.items} onInspect={selectInvocation} />
            {selected.error ? (
              <div className="mt-6">
                <ErrorAlert error={selected.error} title="Could not load invocation detail" />
              </div>
            ) : null}
            {selected.loading ? (
              <div className="mt-6">
                <LoadingBlock label="Loading invocation detail" />
              </div>
            ) : null}
            {selected.item ? (
              <InvocationDetail
                item={selected.item}
                attempts={selected.attempts}
                partnerConfigured={partnerConfigured}
                control={control}
                onClose={closeDetail}
                onRequestAction={setConfirmation}
              />
            ) : null}
          </>
        ) : (
          <EmptyState
            title="No invocations"
            detail="Run a connected REST capability from the Test Invocation workbench to create the first record."
          />
        )
      ) : null}
      <ConfirmationDialog
        open={Boolean(confirmation)}
        title={confirmation?.title}
        description={confirmation?.description}
        confirmLabel={confirmation?.confirmLabel}
        confirmTone={confirmation?.confirmTone}
        busy={control.busy}
        onConfirm={runControlAction}
        onClose={() => !control.busy && setConfirmation(null)}
      >
        {confirmation?.warning ? (
          <p className="border-l-2 border-amber-600 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            {confirmation.warning}
          </p>
        ) : null}
      </ConfirmationDialog>
    </>
  );
}

function InvocationTable({ items, onInspect }) {
  return (
    <div className="overflow-x-auto border border-slate-200 bg-white">
      <table className="w-full min-w-[950px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3">Capability</th>
            <th className="px-5 py-3">Connection</th>
            <th className="px-5 py-3">Lifecycle</th>
            <th className="px-5 py-3">Cancellation</th>
            <th className="px-5 py-3">Duration</th>
            <th className="px-5 py-3">Created</th>
            <th className="px-5 py-3">
              <span className="sr-only">View</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((invocation) => {
            const lifecycleState = lifecycleOf(invocation);
            return (
              <tr key={invocation.invocationId} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-medium text-slate-950">
                  {invocation.capability}
                  <p className="mt-1 font-mono text-xs text-slate-500">{invocation.runtimeType}</p>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-slate-600">
                  {invocation.connectionId}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge tone={lifecycleTone(lifecycleState)}>
                    {humanize(lifecycleState)}
                  </StatusBadge>
                </td>
                <td className="px-5 py-4 text-xs text-slate-600">
                  {humanize(invocation.cancellationState || 'not_requested')}
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {formatDuration(invocation.durationMs)}
                </td>
                <td className="px-5 py-4 text-xs text-slate-600">
                  {formatDate(invocation.createdAt)}
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onInspect(invocation.invocationId)}
                    className="inline-flex h-8 w-8 items-center justify-center text-cyan-800 hover:bg-cyan-50"
                    title="View invocation"
                    aria-label={`View invocation ${invocation.invocationId}`}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InvocationDetail({
  item,
  attempts,
  partnerConfigured,
  control,
  onClose,
  onRequestAction,
}) {
  const lifecycleState = lifecycleOf(item);
  const cancellationState = item.cancellationState || 'not_requested';
  const recoveryReason = item.recoveryReasonCode || item.recoveryReason || null;
  const actions = advertisedActions(item);
  const advertised = Object.values(actions).filter(Boolean);
  const retryUnknown =
    actions.retry?.reasonCode === 'REMOTE_OUTCOME_UNKNOWN' ||
    recoveryReason === 'REMOTE_OUTCOME_UNKNOWN';
  const cancellationUnconfirmed = ['requested', 'aborting', 'outcome_unknown'].includes(
    cancellationState,
  );

  return (
    <Panel className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Invocation detail</p>
          <p className="mt-2 font-mono text-xs text-slate-600">{item.invocationId}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge tone={lifecycleTone(lifecycleState)}>{humanize(lifecycleState)}</StatusBadge>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center text-slate-500 hover:bg-slate-100"
            aria-label="Close invocation detail"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {cancellationUnconfirmed ? (
          <WarningBanner>
            Cancellation requested; remote termination is not confirmed.
          </WarningBanner>
        ) : null}
        {retryUnknown ? (
          <WarningBanner>Retry is blocked because the remote outcome is unknown.</WarningBanner>
        ) : null}
        {lifecycleState === 'recovery_required' ? (
          <WarningBanner>This invocation requires operator review.</WarningBanner>
        ) : null}
        {!partnerConfigured && advertised.length ? (
          <WarningBanner>
            Configure a Partner API key in Settings before using lifecycle controls.
          </WarningBanner>
        ) : null}
        {control.error ? (
          <ErrorAlert error={control.error} title="Invocation control failed" />
        ) : null}
        {control.message ? (
          <div
            className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            <ShieldCheck className="mr-2 inline h-4 w-4" aria-hidden="true" />
            {control.message}
          </div>
        ) : null}
      </div>

      <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Lifecycle state" value={humanize(lifecycleState)} />
        <Detail label="Cancellation state" value={humanize(cancellationState)} />
        <Detail label="Cancellation outcome" value={humanize(item.cancellationOutcome)} />
        <Detail label="Last progress stage" value={humanize(item.lastProgressStage)} />
        <Detail label="Last progress" value={formatDate(item.lastProgressAt)} />
        <Detail label="Stuck classification" value={humanize(item.stuckClassification)} />
        <Detail label="Recovery state" value={humanize(item.recoveryState)} />
        <Detail label="Recovery reason" value={recoveryReason || '-'} mono />
        <Detail label="Recovery decision" value={humanize(item.recoveryDecision)} />
        <Detail label="Decision reason" value={item.recoveryDecisionReason || '-'} mono />
        <Detail label="Recovery eligible" value={yesNo(item.recoveryEligible)} />
        <Detail label="Attempt count" value={String(item.attemptCount ?? attempts.length)} />
        <Detail label="Trace ID" value={item.traceId || '-'} mono />
        <Detail label="Request ID" value={item.requestId || '-'} mono />
        <Detail label="Terminalized" value={formatDate(item.terminalizedAt || item.terminalAt)} />
        <Detail label="Updated" value={formatDate(item.updatedAt)} />
      </dl>

      <SafeFailure item={item} />

      {advertised.length ? (
        <div className="mt-6 border-t border-slate-200 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Available controls</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Availability is determined by the Gateway recovery policy.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton
                action={actions.cancel}
                partnerConfigured={partnerConfigured}
                icon={Ban}
                label="Cancel invocation"
                onClick={() => onRequestAction(confirmationFor('cancel', actions.cancel))}
              />
              <ActionButton
                action={actions.retry}
                partnerConfigured={partnerConfigured}
                icon={RotateCcw}
                label="Retry safely"
                onClick={() => onRequestAction(confirmationFor('retry', actions.retry))}
              />
              <ActionButton
                action={actions.resolveFailed}
                partnerConfigured={partnerConfigured}
                icon={ShieldAlert}
                label="Resolve as failed"
                danger
                onClick={() =>
                  onRequestAction(confirmationFor('resolve_failed', actions.resolveFailed))
                }
              />
              <ActionButton
                action={actions.resolveCancelled}
                partnerConfigured={partnerConfigured}
                icon={Ban}
                label="Resolve as cancelled"
                danger
                onClick={() =>
                  onRequestAction(confirmationFor('resolve_cancelled', actions.resolveCancelled))
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      <AttemptTable attempts={attempts} />
    </Panel>
  );
}

function SafeFailure({ item }) {
  const errorCode = item.errorCode || item.safeError?.code || item.error?.code;
  const errorStage = item.errorStage || item.safeError?.stage || item.error?.stage;
  const retryable = item.retryable ?? item.safeError?.retryable ?? item.error?.retryable;
  if (!errorCode && !errorStage && typeof retryable !== 'boolean') return null;
  return (
    <div className="mt-6 border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-950">Safe failure metadata</h3>
      <dl className="mt-3 grid gap-4 sm:grid-cols-3">
        <Detail label="Error code" value={errorCode || '-'} mono />
        <Detail label="Stage" value={humanize(errorStage)} />
        <Detail label="Retryable" value={yesNo(retryable)} />
      </dl>
    </div>
  );
}

function AttemptTable({ attempts }) {
  return (
    <div className="mt-6 border-t border-slate-200 pt-5">
      <h3 className="text-sm font-semibold text-slate-950">Attempts</h3>
      <div className="mt-3 overflow-x-auto border border-slate-200">
        <table className="w-full min-w-[850px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Attempt</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Safe stage</th>
              <th className="px-4 py-3">Error code</th>
              <th className="px-4 py-3">Retry decision</th>
              <th className="px-4 py-3">Ambiguous</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Started</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {attempts.length ? (
              attempts.map((attempt) => (
                <tr key={attempt.attemptId || attempt.attemptNumber}>
                  <td className="px-4 py-3 font-mono">{attempt.attemptNumber}</td>
                  <td className="px-4 py-3">{humanize(attempt.status)}</td>
                  <td className="px-4 py-3">{humanize(attempt.safeStage)}</td>
                  <td className="px-4 py-3 font-mono">{attempt.errorCode || '-'}</td>
                  <td className="px-4 py-3">
                    {humanize(attempt.retryDecision)}
                    {attempt.retryReason ? (
                      <p className="mt-1 font-mono text-[10px] text-slate-500">
                        {attempt.retryReason}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{yesNo(attempt.outcomeAmbiguous)}</td>
                  <td className="px-4 py-3">{formatDuration(attempt.durationMs)}</td>
                  <td className="px-4 py-3">{formatDate(attempt.startedAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                  No execution attempts are recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionButton({ action, partnerConfigured, icon: Icon, label, onClick, danger = false }) {
  if (!action) return null;
  const disabled = !action.allowed || !partnerConfigured;
  const title = !partnerConfigured
    ? 'Partner API key required'
    : action.allowed
      ? label
      : action.reasonCode || 'The Gateway denied this action.';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex min-h-9 items-center gap-2 border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? 'border-rose-300 bg-white text-rose-800 hover:bg-rose-50'
          : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
    </button>
  );
}

function WarningBanner({ children }) {
  return (
    <div
      className="flex gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="alert"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function Detail({ label, value, mono = false }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-sm text-slate-800 ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '-'}
      </dd>
    </div>
  );
}

function advertisedActions(item) {
  const source = item.availableActions || item.actions;
  const genericResolve = actionEntry(source, ['resolve']);
  const allowedResolutions = Array.isArray(genericResolve?.allowedResolutions)
    ? genericResolve.allowedResolutions
    : [];
  return {
    cancel: actionEntry(source, ['cancel', 'cancel_invocation']),
    retry: actionEntry(source, ['retry', 'retry_safely', 'retry_allowed']),
    resolveFailed:
      actionEntry(source, ['resolveFailed', 'resolve_as_failed', 'resolve_as_failed_allowed']) ||
      (allowedResolutions.includes('failed') ? { ...genericResolve, allowed: true } : null),
    resolveCancelled:
      actionEntry(source, [
        'resolveCancelled',
        'resolve_as_cancelled',
        'resolve_as_cancelled_allowed',
      ]) ||
      (allowedResolutions.includes('cancelled') ? { ...genericResolve, allowed: true } : null),
  };
}

function actionEntry(source, names) {
  if (Array.isArray(source)) {
    return names.some((name) => source.includes(name)) ? { allowed: true } : null;
  }
  if (!source || typeof source !== 'object') return null;
  const name = names.find((candidate) => Object.hasOwn(source, candidate));
  if (!name) return null;
  const value = source[name];
  if (typeof value === 'boolean') return { allowed: value };
  if (!value || typeof value !== 'object') return null;
  return {
    ...value,
    allowed: value.allowed === true || value.available === true,
    reasonCode: value.reasonCode || value.reason || null,
  };
}

function confirmationFor(kind, action) {
  const configurations = {
    cancel: {
      kind,
      title: 'Cancel this invocation?',
      description:
        'The Gateway will request cooperative cancellation and preserve the historical execution record.',
      warning: 'Closing an HTTP connection does not prove that remote execution stopped.',
      confirmLabel: 'Request cancellation',
      confirmTone: 'danger',
    },
    retry: {
      kind,
      title: 'Retry this invocation safely?',
      description:
        'The Gateway will re-evaluate authorization, idempotency, connection health, circuit, rate-limit, and capacity protection.',
      warning: 'No retry will start unless the server proves replay is safe.',
      confirmLabel: 'Request safe retry',
      confirmTone: 'primary',
    },
    resolve_failed: {
      kind,
      title: 'Resolve this invocation as failed?',
      description:
        'This records an operator decision without deleting the invocation or its immutable attempt history.',
      confirmLabel: 'Resolve as failed',
      confirmTone: 'danger',
    },
    resolve_cancelled: {
      kind,
      title: 'Resolve this invocation as cancelled?',
      description:
        'This records an operator decision without claiming that an uncertain remote operation succeeded.',
      confirmLabel: 'Resolve as cancelled',
      confirmTone: 'danger',
    },
  };
  return { ...configurations[kind], requestReasonCode: action?.requestReasonCode };
}

function controlRequest(confirmation, item, identity) {
  const concurrency = Number.isInteger(item.version) ? { version: item.version } : {};
  if (confirmation.kind === 'cancel') {
    return {
      endpoint: 'cancel',
      body: {
        ...identity,
        reasonCode: confirmation.requestReasonCode || 'USER_REQUESTED',
        ...concurrency,
      },
    };
  }
  if (confirmation.kind === 'retry') {
    return { endpoint: 'retry', body: { ...identity, ...concurrency } };
  }
  const resolution = confirmation.kind === 'resolve_failed' ? 'failed' : 'cancelled';
  const fallbackReason =
    resolution === 'failed' ? 'OPERATOR_CONFIRMED_REMOTE_FAILURE' : 'OPERATOR_CONFIRMED_CANCELLED';
  return {
    endpoint: 'resolve',
    body: {
      ...identity,
      resolution,
      reasonCode: confirmation.requestReasonCode || fallbackReason,
      ...concurrency,
    },
  };
}

function safeActionMessage(result, kind) {
  const state =
    result?.cancellationState ||
    result?.recoveryState ||
    result?.recoveryDecision ||
    result?.status;
  const label = {
    cancel: 'Cancellation request recorded.',
    retry: 'Safe retry request processed.',
    resolve_failed: 'Invocation resolved as failed.',
    resolve_cancelled: 'Invocation resolved as cancelled.',
  }[kind];
  return state ? `${label} Current state: ${humanize(state)}.` : label;
}

function lifecycleOf(item) {
  if (item.lifecycleState) return item.lifecycleState;
  return (
    {
      queued: 'accepted',
      running: 'running',
      completed: 'succeeded',
      failed: 'failed',
    }[item.status] || 'accepted'
  );
}

function lifecycleTone(state) {
  if (state === 'succeeded') return 'ready';
  if (['failed', 'timed_out'].includes(state)) return 'offline';
  if (state === 'recovery_required') return 'limited';
  if (state === 'cancelled') return 'neutral';
  return 'pending';
}

function humanize(value) {
  const text = String(value || '')
    .replace(/[._-]+/g, ' ')
    .trim();
  return text ? text[0].toUpperCase() + text.slice(1) : '-';
}

function yesNo(value) {
  return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : '-';
}
