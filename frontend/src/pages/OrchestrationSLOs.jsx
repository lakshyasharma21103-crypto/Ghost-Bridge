import { CheckCircle2, Gauge, Play, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { FieldLabel, MetricCard, PageHeader, Panel, PrimaryButton, SecondaryButton, formatDate } from './pageChrome.jsx';

function tone(status) {
  if (['active', 'healthy'].includes(status)) return 'ready';
  if (['breached', 'archived'].includes(status)) return 'offline';
  if (['at_risk', 'draft', 'insufficient_data'].includes(status)) return 'pending';
  return 'neutral';
}

function basisPoints(value) {
  return Math.round(Number(value || 0) * 100);
}

function percent(value) {
  return `${(Number(value || 0) / 100).toFixed(2)}%`;
}

export function OrchestrationSLOs() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null });
  const [data, setData] = useState({ policies: [], evaluations: [] });
  const [busy, setBusy] = useState('');
  const [draft, setDraft] = useState({
    name: 'Workspace orchestration success',
    successTargetPercent: 99,
    failureRatePercent: 1,
    maximumRunDurationSeconds: 1800,
    maximumQueueWaitSeconds: 300,
    minimumSampleSize: 10,
  });
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }),
    [identity.receivingWorkspaceId],
  );

  const load = useCallback(async () => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null });
      setData({ policies: [], evaluations: [] });
      return;
    }
    setState({ loading: true, error: null });
    try {
      const [policies, evaluations] = await Promise.all([
        apiClient.get(`/orchestrations/slo-policies?${query}`),
        apiClient.get(`/orchestrations/slo-evaluations?${query}`),
      ]);
      setData({ policies: policies.items || [], evaluations: evaluations.items || [] });
      setState({ loading: false, error: null });
    } catch (error) {
      setState({ loading: false, error });
    }
  }, [partnerConfigured, query]);

  useEffect(() => void load(), [load]);

  async function createPolicy(event) {
    event.preventDefault();
    setBusy('create');
    try {
      await apiClient.post('/orchestrations/slo-policies', {
        workspaceId: identity.receivingWorkspaceId,
        name: draft.name,
        status: 'draft',
        successTargetBasisPoints: basisPoints(draft.successTargetPercent),
        maximumFailureRateBasisPoints: basisPoints(draft.failureRatePercent),
        maximumRunDurationMs: Number(draft.maximumRunDurationSeconds || 0) * 1000,
        maximumQueueWaitMs: Number(draft.maximumQueueWaitSeconds || 0) * 1000,
        maximumNodeDurationMs: Number(draft.maximumRunDurationSeconds || 0) * 1000,
        minimumSampleSize: Number(draft.minimumSampleSize || 1),
        evaluationWindow: 'rolling_24h',
      });
      recordEvent('SLO policy created', draft.name, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  async function action(key, path, label) {
    setBusy(key);
    try {
      await apiClient.post(path, { workspaceId: identity.receivingWorkspaceId });
      recordEvent('SLO action completed', label, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  const breached = data.evaluations.filter((item) => item.evaluationStatus === 'breached').length;
  const atRisk = data.evaluations.filter((item) => item.evaluationStatus === 'at_risk').length;
  const healthy = data.evaluations.filter((item) => item.evaluationStatus === 'healthy').length;

  return (
    <>
      <PageHeader
        eyebrow="Orchestration SLOs"
        title="SLO policies"
        description="Workspace-level run success, queue, duration, retry, stuck-run, recovery, and compensation objectives."
        actions={
          <SecondaryButton onClick={load} disabled={state.loading || !partnerConfigured}>
            <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
            Refresh
          </SecondaryButton>
        }
      />
      {!partnerConfigured ? <Panel className="mb-6 border-amber-200 bg-amber-50 text-sm text-amber-950">Configure a Partner API key in Settings to manage orchestration SLOs.</Panel> : null}
      {state.error ? <ErrorAlert error={state.error} title="SLO request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading orchestration SLOs" /> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Healthy" value={healthy} detail="recent evaluations" tone="emerald" />
        <MetricCard label="At risk" value={atRisk} detail="burn rate signals" tone={atRisk ? 'coral' : 'slate'} />
        <MetricCard label="Breached" value={breached} detail="policy violations" tone={breached ? 'coral' : 'emerald'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.6fr)]">
        <Panel>
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <Gauge className="h-5 w-5 text-cyan-700" />
            Policies
          </div>
          {data.policies.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th>Status</th>
                    <th>Success</th>
                    <th>Failure budget</th>
                    <th>Window</th>
                    <th>Version</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.policies.map((policy) => (
                    <tr key={policy.sloPolicyId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-950">{policy.name}</p>
                        <p className="text-xs text-slate-500">Updated {formatDate(policy.updatedAt)}</p>
                      </td>
                      <td><StatusBadge tone={tone(policy.status)}>{policy.status}</StatusBadge></td>
                      <td>{percent(policy.successTargetBasisPoints)}</td>
                      <td>{percent(policy.maximumFailureRateBasisPoints)}</td>
                      <td>{policy.evaluationWindow}</td>
                      <td>v{policy.version}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {policy.status === 'draft' ? (
                            <SecondaryButton disabled={Boolean(busy)} onClick={() => action(`activate-${policy.sloPolicyId}`, `/orchestrations/slo-policies/${policy.sloPolicyId}/activate`, 'activate SLO')}>
                              <CheckCircle2 className="h-4 w-4" />
                              Activate
                            </SecondaryButton>
                          ) : null}
                          <PrimaryButton disabled={Boolean(busy)} onClick={() => action(`evaluate-${policy.sloPolicyId}`, `/orchestrations/slo-policies/${policy.sloPolicyId}/evaluate`, 'evaluate SLO')}>
                            <Play className="h-4 w-4" />
                            Evaluate
                          </PrimaryButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No SLO policies" detail="Create a policy to start tracking workspace orchestration objectives." />
          )}
        </Panel>

        <Panel>
          <div className="mb-4 font-semibold text-slate-950">Create draft</div>
          <form onSubmit={createPolicy} className="space-y-4">
            <label className="block">
              <FieldLabel>Name</FieldLabel>
              <input className="w-full border border-slate-300 px-3 py-2 text-sm" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <FieldLabel>Success %</FieldLabel>
                <input type="number" min="0" max="100" step="0.01" className="w-full border border-slate-300 px-3 py-2 text-sm" value={draft.successTargetPercent} onChange={(event) => setDraft((current) => ({ ...current, successTargetPercent: event.target.value }))} />
              </label>
              <label>
                <FieldLabel>Failure %</FieldLabel>
                <input type="number" min="0" max="100" step="0.01" className="w-full border border-slate-300 px-3 py-2 text-sm" value={draft.failureRatePercent} onChange={(event) => setDraft((current) => ({ ...current, failureRatePercent: event.target.value }))} />
              </label>
              <label>
                <FieldLabel>Run seconds</FieldLabel>
                <input type="number" min="1" className="w-full border border-slate-300 px-3 py-2 text-sm" value={draft.maximumRunDurationSeconds} onChange={(event) => setDraft((current) => ({ ...current, maximumRunDurationSeconds: event.target.value }))} />
              </label>
              <label>
                <FieldLabel>Queue seconds</FieldLabel>
                <input type="number" min="1" className="w-full border border-slate-300 px-3 py-2 text-sm" value={draft.maximumQueueWaitSeconds} onChange={(event) => setDraft((current) => ({ ...current, maximumQueueWaitSeconds: event.target.value }))} />
              </label>
            </div>
            <label className="block">
              <FieldLabel>Minimum sample</FieldLabel>
              <input type="number" min="1" className="w-full border border-slate-300 px-3 py-2 text-sm" value={draft.minimumSampleSize} onChange={(event) => setDraft((current) => ({ ...current, minimumSampleSize: event.target.value }))} />
            </label>
            <PrimaryButton className="w-full" type="submit" disabled={Boolean(busy) || !partnerConfigured}>
              <Plus className="h-4 w-4" />
              Create policy
            </PrimaryButton>
          </form>
        </Panel>
      </div>
    </>
  );
}
