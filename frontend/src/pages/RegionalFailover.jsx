import { RefreshCw, Route, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ConfirmationDialog } from '../components/ConfirmationDialog.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { RegionalResilienceNav } from '../components/RegionalResilienceNav.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PageHeader, Panel, PrimaryButton, SecondaryButton, formatDate, formatDuration } from './pageChrome.jsx';

export function RegionalFailover() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, plans: [], regions: [], replication: [] });
  const [draft, setDraft] = useState({ sourceRegionId: '', targetRegionId: '', failoverType: 'planned_switchover', safeReasonCode: 'REGION_OPERATOR_SWITCHOVER' });
  const [selected, setSelected] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }), [identity.receivingWorkspaceId]);

  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [plans, regions, replication] = await Promise.all([
        apiClient.get(`/regional-resilience/failovers?${query}`),
        apiClient.get(`/regional-resilience/regions?${query}`),
        apiClient.get(`/regional-resilience/replication?${query}`),
      ]);
      const regionItems = regions.items || [];
      setState({ loading: false, error: null, plans: plans.items || [], regions: regionItems, replication: replication.items || [] });
      setDraft((current) => ({ ...current, sourceRegionId: current.sourceRegionId || regions.authority?.activeRegionId || regionItems[0]?.regionId || '', targetRegionId: current.targetRegionId || regionItems.find((item) => item.regionId !== regions.authority?.activeRegionId)?.regionId || '' }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, query]);

  useEffect(() => { void load(); }, [load]);

  function requestPlan(type) {
    setDraft((current) => ({ ...current, failoverType: type, safeReasonCode: type === 'emergency_failover' ? 'REGION_OUTAGE_CONFIRMED' : 'REGION_OPERATOR_SWITCHOVER' }));
    setConfirmation({ kind: 'plan', action: type === 'emergency_failover' ? 'request emergency failover' : 'plan switchover' });
  }

  async function runConfirmedAction() {
    if (!confirmation) return;
    setBusy(true);
    try {
      if (confirmation.kind === 'plan') {
        await apiClient.post('/regional-resilience/failovers/plan', { ...draft, workspaceId: identity.receivingWorkspaceId, triggerType: draft.failoverType === 'emergency_failover' ? 'regional_outage' : 'operator' }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      } else {
        const plan = confirmation.plan;
        await apiClient.post(`/regional-resilience/failovers/${plan.id}/${confirmation.action}`, {
          workspaceId: identity.receivingWorkspaceId,
          safeReasonCode: confirmation.reasonCode,
          sourceFenceConfirmed: confirmation.action === 'validate' ? confirmation.sourceFenceConfirmed === true : undefined,
          approvalRequestId: confirmation.action === 'approve' ? plan.approvalRequestId : undefined,
          acceptPotentialDataLoss: confirmation.action === 'approve' && plan.potentialDataLoss ? confirmation.acceptPotentialDataLoss === true : undefined,
        }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      }
      recordEvent('Regional failover control accepted', confirmation.action, 'success');
      setConfirmation(null);
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy(false);
    }
  }

  function replicationFor(plan) {
    return state.replication.find((item) => item.sourceRegionId === plan.sourceRegionId && item.targetRegionId === plan.targetRegionId)?.status || 'unknown';
  }

  return (
    <>
      <PageHeader eyebrow="Operations / Regional resilience" title="Failover" description="Durable planned switchover, emergency failover, and controlled failback with explicit fencing epochs." actions={<SecondaryButton onClick={load} disabled={!partnerConfigured || state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>} />
      <RegionalResilienceNav />
      {state.error ? <ErrorAlert error={state.error} title="Failover request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading failover plans" /> : null}
      <Panel className="mb-5">
        <div className="mb-4 flex items-center gap-2"><Route className="h-4 w-4 text-cyan-700" /><div><h2 className="text-sm font-semibold text-slate-950">Create governed plan</h2><p className="text-xs text-slate-500">Creation does not alter cloud routing, DNS, load balancers, or database topology.</p></div></div>
        <div className="grid gap-3 md:grid-cols-3"><label className="text-xs font-medium text-slate-700">Source region<select className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={draft.sourceRegionId} onChange={(event) => setDraft({ ...draft, sourceRegionId: event.target.value })}>{state.regions.map((region) => <option key={region.regionId} value={region.regionId}>{region.displayName}</option>)}</select></label><label className="text-xs font-medium text-slate-700">Target region<select className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={draft.targetRegionId} onChange={(event) => setDraft({ ...draft, targetRegionId: event.target.value })}>{state.regions.map((region) => <option key={region.regionId} value={region.regionId}>{region.displayName}</option>)}</select></label><label className="text-xs font-medium text-slate-700">Safe reason code<input className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={draft.safeReasonCode} onChange={(event) => setDraft({ ...draft, safeReasonCode: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 64) })} /></label></div>
        <div className="mt-4 flex flex-wrap gap-3"><PrimaryButton onClick={() => requestPlan('planned_switchover')} disabled={!draft.sourceRegionId || !draft.targetRegionId || draft.sourceRegionId === draft.targetRegionId}>Plan switchover</PrimaryButton><SecondaryButton onClick={() => requestPlan('emergency_failover')} disabled={!draft.sourceRegionId || !draft.targetRegionId || draft.sourceRegionId === draft.targetRegionId}>Request emergency failover</SecondaryButton></div>
      </Panel>
      <Panel className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">Failover plans</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Plan</th><th>Type</th><th>Source</th><th>Target</th><th>Status</th><th>Replication</th><th>Expected RPO</th><th>Expected RTO</th><th>Approval</th><th>Started</th><th className="pr-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-200">{state.plans.map((plan) => <tr key={plan.id}><td className="px-4 py-3"><button className="font-medium text-cyan-800" onClick={() => setSelected(plan)}>{plan.id.slice(-10)}</button></td><td>{plan.failoverType}</td><td>{plan.sourceRegionId}</td><td>{plan.targetRegionId}</td><td><StatusBadge status={plan.status} /></td><td>{replicationFor(plan)}</td><td>{formatDuration(plan.expectedRpoMs)}</td><td>{formatDuration(plan.expectedRtoMs)}</td><td>{plan.approvedBy ? 'approved' : plan.status === 'approval_required' ? 'required' : 'pending'}</td><td>{formatDate(plan.startedAt)}</td><td className="pr-4"><div className="flex flex-wrap gap-2">{['requested', 'validating', 'paused'].includes(plan.status) ? <button className="text-cyan-700" onClick={() => setConfirmation({ kind: 'control', action: 'validate', reasonCode: 'REGION_FAILOVER_VALIDATION', plan })}>Validate</button> : null}{plan.status === 'approval_required' ? <button className="text-cyan-700" onClick={() => setConfirmation({ kind: 'control', action: 'approve', reasonCode: 'REGION_FAILOVER_APPROVED', plan })}>Approve</button> : null}{plan.status === 'approved' ? <button className="text-rose-700" onClick={() => setConfirmation({ kind: 'control', action: 'execute', reasonCode: 'REGION_FAILOVER_EXECUTION_APPROVED', plan })}>Execute</button> : null}{plan.status === 'executing' ? <button className="text-cyan-700" onClick={() => setConfirmation({ kind: 'control', action: 'pause', reasonCode: 'REGION_FAILOVER_OPERATOR_PAUSE', plan })}>Pause</button> : null}{plan.status === 'paused' ? <button className="text-cyan-700" onClick={() => setConfirmation({ kind: 'control', action: 'resume', reasonCode: 'REGION_FAILOVER_OPERATOR_RESUME', plan })}>Resume</button> : null}{plan.status === 'succeeded' ? <button className="text-cyan-700" onClick={() => setConfirmation({ kind: 'control', action: 'failback', reasonCode: 'REGION_FAILBACK_REQUESTED', plan })}>Request failback</button> : null}</div></td></tr>)}</tbody></table>{!state.plans.length ? <p className="py-8 text-center text-sm text-slate-500">No failover plans have been created.</p> : null}</div>
      </Panel>
      {selected ? <Panel className="mt-5"><div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-700" /><h2 className="text-sm font-semibold text-slate-950">Plan timeline · {selected.id.slice(-10)}</h2></div><div className="grid gap-3 md:grid-cols-2"><div className="space-y-2">{(selected.orderedSteps || []).map((step) => <div key={step.stepKey} className="flex items-center justify-between border border-slate-200 px-3 py-2 text-xs"><span>{step.order}. {step.stepKey}</span><StatusBadge status={step.status} /></div>)}</div><dl className="grid content-start gap-3 text-xs"><Detail label="Authority epochs" value={`${selected.sourceAuthorityEpoch} → ${selected.targetAuthorityEpoch}`} /><Detail label="Queue transfer" value={selected.queueOwnershipTransferred ? 'completed' : 'pending'} /><Detail label="Cache invalidation" value={selected.cacheInvalidated ? 'completed' : 'pending'} /><Detail label="Projection recovery" value={selected.projectionsRecovered ? 'completed' : 'pending'} /><Detail label="Measured RPO / RTO" value={`${formatDuration(selected.measuredRpoMs)} / ${formatDuration(selected.measuredRtoMs)}`} /><Detail label="Incident" value={selected.incidentId || 'not linked'} /></dl></div></Panel> : null}
      <ConfirmationDialog open={Boolean(confirmation)} title={confirmation?.action || 'Regional failover control'} description={`Source: ${confirmation?.plan?.sourceRegionId || draft.sourceRegionId || '-'} · Target: ${confirmation?.plan?.targetRegionId || draft.targetRegionId || '-'}. The durable authority store, residency, policy, fencing, and approval state will be checked again.`} confirmLabel="Confirm control" busy={busy} onClose={() => !busy && setConfirmation(null)} onConfirm={runConfirmedAction}><dl className="grid gap-2 text-xs"><Detail label="Safe reason code" value={confirmation?.reasonCode || draft.safeReasonCode} /><Detail label="Approval status" value={confirmation?.plan?.approvalRequestId || 'Revalidated at execution'} /></dl>{confirmation?.action === 'validate' ? <label className="mt-3 flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" checked={confirmation.sourceFenceConfirmed === true} onChange={(event) => setConfirmation({ ...confirmation, sourceFenceConfirmed: event.target.checked })} /><span>I confirm the source region has been fenced by the external infrastructure runbook.</span></label> : null}{confirmation?.action === 'approve' && confirmation?.plan?.potentialDataLoss ? <label className="mt-3 flex items-start gap-2 text-xs text-rose-700"><input type="checkbox" checked={confirmation.acceptPotentialDataLoss === true} onChange={(event) => setConfirmation({ ...confirmation, acceptPotentialDataLoss: event.target.checked })} /><span>I explicitly accept the bounded potential data-loss window reported by this plan.</span></label> : null}</ConfirmationDialog>
    </>
  );
}

function Detail({ label, value }) { return <div><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-900">{value || '-'}</dd></div>; }
