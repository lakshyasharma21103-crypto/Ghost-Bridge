import { Bell, CheckCircle2, Play, Plus, RefreshCw, ShieldOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { FieldLabel, PageHeader, Panel, PrimaryButton, SecondaryButton, formatDate } from './pageChrome.jsx';

function tone(value) {
  if (['active', 'resolved', 'info'].includes(value)) return 'ready';
  if (['open', 'acknowledged', 'suppressed', 'warning', 'draft'].includes(value)) return 'pending';
  if (['high', 'critical', 'archived'].includes(value)) return 'offline';
  return 'neutral';
}

export function OrchestrationAlerts() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null });
  const [data, setData] = useState({ alerts: [], rules: [] });
  const [busy, setBusy] = useState('');
  const [draft, setDraft] = useState({
    name: 'SLO breach alert',
    signalType: 'slo_breach',
    threshold: 1,
    severity: 'high',
    createIncident: false,
  });
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }),
    [identity.receivingWorkspaceId],
  );

  const load = useCallback(async () => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null });
      setData({ alerts: [], rules: [] });
      return;
    }
    setState({ loading: true, error: null });
    try {
      const [alerts, rules] = await Promise.all([
        apiClient.get(`/orchestrations/alerts?${query}`),
        apiClient.get(`/orchestrations/alert-rules?${query}`),
      ]);
      setData({ alerts: alerts.items || [], rules: rules.items || [] });
      setState({ loading: false, error: null });
    } catch (error) {
      setState({ loading: false, error });
    }
  }, [partnerConfigured, query]);

  useEffect(() => void load(), [load]);

  async function createRule(event) {
    event.preventDefault();
    setBusy('create-rule');
    try {
      await apiClient.post('/orchestrations/alert-rules', {
        workspaceId: identity.receivingWorkspaceId,
        name: draft.name,
        signalType: draft.signalType,
        threshold: Number(draft.threshold || 1),
        comparison: 'greater_than_or_equal',
        minimumSampleSize: 1,
        severity: draft.severity,
        notificationChannels: [{ channelType: 'audit_only' }],
        createIncident: draft.createIncident,
      });
      recordEvent('Alert rule created', draft.name, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  async function action(key, path, body, label) {
    setBusy(key);
    try {
      await apiClient.post(path, { workspaceId: identity.receivingWorkspaceId, ...body });
      recordEvent('Alert action completed', label, 'success');
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
        eyebrow="Orchestration alerts"
        title="Alerts and rules"
        description="Tenant-scoped alert instances, signal rules, deduplication state, suppression, and incident handoff."
        actions={
          <SecondaryButton onClick={load} disabled={state.loading || !partnerConfigured}>
            <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
            Refresh
          </SecondaryButton>
        }
      />
      {!partnerConfigured ? <Panel className="mb-6 border-amber-200 bg-amber-50 text-sm text-amber-950">Configure a Partner API key in Settings to manage orchestration alerts.</Panel> : null}
      {state.error ? <ErrorAlert error={state.error} title="Alert request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading orchestration alerts" /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.6fr)]">
        <Panel>
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <Bell className="h-5 w-5 text-cyan-700" />
            Alert instances
          </div>
          {data.alerts.length ? (
            <div className="divide-y divide-slate-200">
              {data.alerts.map((alert) => (
                <div key={alert._id || alert.fingerprint} className="grid gap-3 py-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={tone(alert.status)}>{alert.status}</StatusBadge>
                      <StatusBadge tone={tone(alert.severity)}>{alert.severity}</StatusBadge>
                      <span className="text-xs font-medium text-slate-500">{alert.signalType}</span>
                    </div>
                    <p className="font-medium text-slate-950">{alert.safeSummary}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {alert.occurrenceCount || 1} occurrence(s), last observed {formatDate(alert.lastObservedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    {alert.status === 'open' ? (
                      <SecondaryButton disabled={Boolean(busy)} onClick={() => action(`ack-${alert._id}`, `/orchestrations/alerts/${alert._id}/acknowledge`, {}, 'acknowledge alert')}>
                        <CheckCircle2 className="h-4 w-4" />
                        Ack
                      </SecondaryButton>
                    ) : null}
                    {['open', 'acknowledged'].includes(alert.status) ? (
                      <SecondaryButton disabled={Boolean(busy)} onClick={() => action(`suppress-${alert._id}`, `/orchestrations/alerts/${alert._id}/suppress`, { suppressionWindowMs: 3600000 }, 'suppress alert')}>
                        <ShieldOff className="h-4 w-4" />
                        Suppress
                      </SecondaryButton>
                    ) : null}
                    {alert.status !== 'resolved' ? (
                      <PrimaryButton disabled={Boolean(busy)} onClick={() => action(`resolve-${alert._id}`, `/orchestrations/alerts/${alert._id}/resolve`, {}, 'resolve alert')}>
                        <CheckCircle2 className="h-4 w-4" />
                        Resolve
                      </PrimaryButton>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No alerts" detail="No orchestration alert instances match this workspace." />
          )}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <div className="mb-4 font-semibold text-slate-950">Create rule</div>
            <form onSubmit={createRule} className="space-y-4">
              <label className="block">
                <FieldLabel>Name</FieldLabel>
                <input className="w-full border border-slate-300 px-3 py-2 text-sm" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="block">
                <FieldLabel>Signal</FieldLabel>
                <select className="w-full border border-slate-300 px-3 py-2 text-sm" value={draft.signalType} onChange={(event) => setDraft((current) => ({ ...current, signalType: event.target.value }))}>
                  <option value="slo_breach">SLO breach</option>
                  <option value="stuck_runs">Stuck runs</option>
                  <option value="queue_congestion">Queue congestion</option>
                  <option value="worker_unhealthy">Worker unhealthy</option>
                  <option value="high_retry_rate">High retry rate</option>
                  <option value="compensation_failure">Compensation failure</option>
                  <option value="recovery_failure">Recovery failure</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <FieldLabel>Threshold</FieldLabel>
                  <input type="number" min="0" className="w-full border border-slate-300 px-3 py-2 text-sm" value={draft.threshold} onChange={(event) => setDraft((current) => ({ ...current, threshold: event.target.value }))} />
                </label>
                <label>
                  <FieldLabel>Severity</FieldLabel>
                  <select className="w-full border border-slate-300 px-3 py-2 text-sm" value={draft.severity} onChange={(event) => setDraft((current) => ({ ...current, severity: event.target.value }))}>
                    <option value="warning">Warning</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                    <option value="info">Info</option>
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={draft.createIncident} onChange={(event) => setDraft((current) => ({ ...current, createIncident: event.target.checked }))} />
                Create incident
              </label>
              <PrimaryButton className="w-full" type="submit" disabled={Boolean(busy) || !partnerConfigured}>
                <Plus className="h-4 w-4" />
                Create rule
              </PrimaryButton>
            </form>
          </Panel>

          <Panel>
            <div className="mb-4 font-semibold text-slate-950">Rules</div>
            {data.rules.length ? (
              <div className="divide-y divide-slate-200">
                {data.rules.map((rule) => (
                  <div key={rule._id || rule.ruleId} className="py-3 text-sm">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950">{rule.name}</p>
                      <StatusBadge tone={tone(rule.status)}>{rule.status}</StatusBadge>
                    </div>
                    <p className="text-xs text-slate-500">{rule.signalType} at {rule.threshold} - {rule.severity}</p>
                    {rule.status !== 'active' ? (
                      <SecondaryButton className="mt-3 w-full" disabled={Boolean(busy)} onClick={() => action(`activate-${rule._id}`, `/orchestrations/alert-rules/${rule._id}/activate`, {}, 'activate alert rule')}>
                        <Play className="h-4 w-4" />
                        Activate
                      </SecondaryButton>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No rules" detail="Create an alert rule to open incidents from orchestration signals." />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
