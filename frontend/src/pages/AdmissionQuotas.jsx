import { RefreshCw, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ProductionScaleNav } from '../components/ProductionScaleNav.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { MetricCard, PageHeader, Panel, PrimaryButton, SecondaryButton, formatDate } from './pageChrome.jsx';

const initialDraft = {
  name: 'Default workload quota',
  maximumQueuedRuns: 1000,
  maximumActiveRuns: 100,
  maximumConcurrentNodeExecutions: 50,
  maximumPayloadBytesPerJob: 1048576,
  burstCapacity: 20,
  tenantWeight: 1,
  workspaceWeight: 1,
  overloadBehavior: 'reject',
};

export function AdmissionQuotas() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, policies: [], decisions: [] });
  const [draft, setDraft] = useState(initialDraft);
  const [busy, setBusy] = useState('');
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '50' }),
    [identity.receivingWorkspaceId],
  );
  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [policies, decisions] = await Promise.all([
        apiClient.get(`/production-scale/quota-policies?${query}`),
        apiClient.get(`/production-scale/admission/decisions?${query}`),
      ]);
      setState({ loading: false, error: null, policies: policies.items || [], decisions: decisions.items || [] });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, query]);
  useEffect(() => { void load(); }, [load]);

  async function createPolicy() {
    setBusy('create');
    try {
      const numericDraft = Object.fromEntries(
        Object.entries(draft).map(([key, value]) => [
          key,
          key === 'name' || key === 'overloadBehavior' ? value : Number(value),
        ]),
      );
      await apiClient.post('/production-scale/quota-policies', {
        workspaceId: identity.receivingWorkspaceId,
        ...numericDraft,
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      recordEvent('Quota policy draft created', draft.name, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  async function policyAction(id, action) {
    setBusy(id);
    try {
      await apiClient.post(`/production-scale/quota-policies/${id}/${action}`, {
        workspaceId: identity.receivingWorkspaceId,
      });
      recordEvent(`Quota policy ${action}`, id, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  const activePolicy = state.policies.find((policy) => policy.status === 'active');
  const outcomes = state.decisions.reduce((result, decision) => {
    result[decision.decision] = (result[decision.decision] || 0) + 1;
    return result;
  }, {});
  const latest = state.decisions[0];

  return (
    <>
      <PageHeader eyebrow="Operations / Production scale" title="Admission & Quotas" description="Tenant and workspace limits, bounded scheduling weights, and immutable admission decisions with stable reason codes." actions={<SecondaryButton onClick={load} disabled={state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>} />
      <ProductionScaleNav />
      {state.error ? <ErrorAlert error={state.error} title="Admission control request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading quota controls" /> : null}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active quota" value={activePolicy ? `v${activePolicy.version}` : 'Default'} detail={activePolicy?.name || 'Platform-safe defaults'} tone="cyan" />
        <MetricCard label="Queued usage" value={latest ? latest.workspaceQueuedCount : '-'} detail={activePolicy ? `of ${activePolicy.maximumQueuedRuns}` : 'Current workspace only'} />
        <MetricCard label="Quota rejections" value={outcomes.rejected_quota || 0} detail={`${outcomes.rejected_capacity || 0} capacity rejections`} tone={(outcomes.rejected_quota || outcomes.rejected_capacity) ? 'coral' : 'emerald'} />
        <MetricCard label="Deferred" value={outcomes.accepted_deferred || 0} detail={`${outcomes.accepted || 0} accepted`} />
      </div>
      <Panel>
        <h2 className="text-sm font-semibold text-slate-950">New quota-policy version</h2>
        <p className="mt-1 text-xs text-slate-500">Drafts must be validated and activated before they affect admission.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(draft).map(([key, value]) => key === 'overloadBehavior' ? (
            <label key={key} className="text-xs font-medium text-slate-700">Overload behavior<select className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={value} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}><option value="reject">Reject</option><option value="defer">Defer</option><option value="approval_required">Approval required</option></select></label>
          ) : (
            <label key={key} className="text-xs font-medium text-slate-700">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}<input className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" type={key === 'name' ? 'text' : 'number'} value={value} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} /></label>
          ))}
        </div>
        <PrimaryButton className="mt-4" onClick={createPolicy} disabled={busy === 'create'}><Save className="h-4 w-4" />Create draft</PrimaryButton>
      </Panel>
      <Panel className="mt-5 overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">Quota policies</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Name</th><th>Version</th><th>Status</th><th>Queued / active</th><th>Node executions</th><th>Payload limit</th><th>Weights</th><th>Overload</th><th className="pr-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-200">{state.policies.map((policy) => <tr key={policy.id}><td className="px-4 py-3 font-medium">{policy.name}</td><td>v{policy.version}</td><td><StatusBadge status={policy.status} /></td><td>{policy.maximumQueuedRuns} / {policy.maximumActiveRuns}</td><td>{policy.maximumConcurrentNodeExecutions}</td><td>{Number(policy.maximumPayloadBytesPerJob || 0).toLocaleString()} B</td><td>{policy.tenantWeight} / {policy.workspaceWeight}</td><td>{policy.overloadBehavior}</td><td className="pr-4 text-right">{policy.status === 'draft' ? <div className="flex justify-end gap-2"><button className="text-cyan-700" disabled={Boolean(busy)} onClick={() => policyAction(policy.id, 'validate')}>Validate</button><button className="text-cyan-700" disabled={Boolean(busy)} onClick={() => policyAction(policy.id, 'activate')}>Activate</button></div> : '-'}</td></tr>)}</tbody></table></div>
      </Panel>
      <Panel className="mt-5 overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">Recent admission decisions</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Time</th><th>Workload</th><th>Priority</th><th>Decision</th><th>Reasons</th><th>Policy</th><th>Backpressure</th></tr></thead><tbody className="divide-y divide-slate-200">{state.decisions.map((decision) => <tr key={decision.id}><td className="px-4 py-3">{formatDate(decision.createdAt)}</td><td>{decision.workloadCategory}</td><td>{decision.priorityClass}</td><td><StatusBadge status={decision.decision} /></td><td>{(decision.safeReasonCodes || []).join(', ') || '-'}</td><td>{decision.quotaPolicyVersion ? `v${decision.quotaPolicyVersion}` : '-'}</td><td>{decision.backpressureState}</td></tr>)}</tbody></table>{!state.decisions.length && !state.loading ? <p className="py-10 text-center text-sm text-slate-500">No admission decisions are visible.</p> : null}</div>
      </Panel>
    </>
  );
}
