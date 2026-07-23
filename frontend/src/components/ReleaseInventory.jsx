import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ConfirmationDialog } from './ConfirmationDialog.jsx';
import { ErrorAlert, LoadingBlock } from './Feedback.jsx';
import { ReleaseReadinessNav } from './ReleaseReadinessNav.jsx';
import { StatusBadge } from './StatusBadge.jsx';
import { PageHeader, Panel, SecondaryButton, formatDate } from '../pages/pageChrome.jsx';

export function ReleaseInventory({
  title,
  description,
  endpoint,
  columns,
  detailPath,
  actions = [],
  emptyLabel,
}) {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, items: [] });
  const [confirmation, setConfirmation] = useState(null);
  const [reasonCode, setReasonCode] = useState('');
  const [busy, setBusy] = useState(false);
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }),
    [identity.receivingWorkspaceId],
  );
  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const result = await apiClient.get(`${endpoint}?${query}`);
      setState({
        loading: false,
        error: null,
        items: Array.isArray(result) ? result : result.items || [],
      });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [endpoint, partnerConfigured, query]);
  useEffect(() => void load(), [load]);

  async function confirmAction() {
    if (!confirmation || !reasonCode.trim()) return;
    setBusy(true);
    try {
      await apiClient.post(
        `${endpoint}/${encodeURIComponent(idOf(confirmation.item))}/${confirmation.action.path}`,
        { workspaceId: identity.receivingWorkspaceId, reasonCode },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
      recordEvent(
        `Release ${confirmation.action.label.toLowerCase()} requested`,
        idOf(confirmation.item),
        'success',
      );
      setConfirmation(null);
      setReasonCode('');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations / Production release"
        title={title}
        description={description}
        actions={
          <SecondaryButton onClick={load} disabled={!partnerConfigured || state.loading}>
            <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
            Refresh
          </SecondaryButton>
        }
      />
      <ReleaseReadinessNav />
      {state.error ? <ErrorAlert error={state.error} title={`${title} request failed`} /> : null}
      {state.loading ? <LoadingBlock label={`Loading ${title.toLowerCase()}`} /> : null}
      <div className="mb-5 border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
        Deployment execution remains manual. This console stores safe control-plane metadata and
        never displays environment values, credentials, connection strings, or provider tokens.
      </div>
      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th key={column.label} className="px-4 py-3">{column.label}</th>
                ))}
                {actions.length || detailPath ? <th className="px-4 py-3">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {state.items.map((item) => (
                <tr key={idOf(item)}>
                  {columns.map((column) => (
                    <td key={column.label} className="px-4 py-3 text-slate-700">
                      {cell(column, item)}
                    </td>
                  ))}
                  {actions.length || detailPath ? (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {detailPath ? (
                          <Link className="text-cyan-700" to={detailPath(item)}>View</Link>
                        ) : null}
                        {actions
                          .filter((action) => !action.when || action.when(item))
                          .map((action) => (
                            <button
                              key={action.path}
                              className="text-slate-700 hover:text-cyan-800"
                              onClick={() => setConfirmation({ item, action })}
                            >
                              {action.label}
                            </button>
                          ))}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {!state.items.length && !state.loading ? (
            <p className="py-10 text-center text-sm text-slate-500">{emptyLabel}</p>
          ) : null}
        </div>
      </Panel>
      <ConfirmationDialog
        open={Boolean(confirmation)}
        title={confirmation?.action.label || 'Confirm release action'}
        description="This governed operation requires a bounded reason code and may also require an approval grant."
        confirmLabel={confirmation?.action.label}
        busy={busy}
        onClose={() => {
          setConfirmation(null);
          setReasonCode('');
        }}
        onConfirm={confirmAction}
      >
        <label className="text-xs font-medium text-slate-700">
          Reason code
          <input
            value={reasonCode}
            onChange={(event) =>
              setReasonCode(
                event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 128),
              )
            }
            placeholder="RELEASE_CHANGE_APPROVED"
            className="mt-1 w-full border border-slate-300 px-3 py-2 font-mono text-xs"
          />
        </label>
      </ConfirmationDialog>
    </>
  );
}

function cell(column, item) {
  const value = column.value ? column.value(item) : item[column.key];
  if (column.status) return <StatusBadge tone={tone(value)}>{value || 'unknown'}</StatusBadge>;
  if (column.date) return formatDate(value);
  if (Array.isArray(value)) return value.join(', ') || '-';
  return value == null || value === '' ? '-' : String(value);
}

function tone(value) {
  if (['approved', 'succeeded', 'active', 'completed', 'ready_for_approval', 'validated'].includes(value)) return 'ready';
  if (['failed', 'blocked', 'validation_failed', 'rollback_required'].includes(value)) return 'offline';
  if (['draft', 'validating', 'approval_required', 'paused', 'executing'].includes(value)) return 'pending';
  return 'neutral';
}

export function idOf(item) {
  return (
    item?.id ||
    item?._id ||
    item?.releaseCandidateId ||
    item?.rolloutId ||
    item?.migrationPlanId ||
    item?.key ||
    ''
  );
}
