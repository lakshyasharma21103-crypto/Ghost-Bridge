import { FlaskConical, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ConfirmationDialog } from '../components/ConfirmationDialog.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { RegionalResilienceNav } from '../components/RegionalResilienceNav.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PageHeader, Panel, PrimaryButton, SecondaryButton, formatDate, formatDuration } from './pageChrome.jsx';

export function DrDrills() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, drills: [], regions: [] });
  const [draft, setDraft] = useState({ name: 'Quarterly regional recovery drill', drillType: 'control_plane_simulation', sourceRegionId: '', targetRegionId: '' });
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }), [identity.receivingWorkspaceId]);

  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [drills, regions] = await Promise.all([apiClient.get(`/regional-resilience/drills?${query}`), apiClient.get(`/regional-resilience/regions?${query}`)]);
      const regionItems = regions.items || [];
      setState({ loading: false, error: null, drills: drills.items || [], regions: regionItems });
      setDraft((current) => ({ ...current, sourceRegionId: current.sourceRegionId || regions.authority?.activeRegionId || regionItems[0]?.regionId || '', targetRegionId: current.targetRegionId || regionItems.find((item) => item.regionId !== regions.authority?.activeRegionId)?.regionId || '' }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, query]);

  useEffect(() => { void load(); }, [load]);

  async function runAction() {
    if (!confirmation) return;
    setBusy(true);
    try {
      if (confirmation.type === 'create') {
        await apiClient.post('/regional-resilience/drills', { ...draft, workspaceId: identity.receivingWorkspaceId, infrastructureMode: 'deterministic_simulation', plannedStartAt: new Date().toISOString(), safeReasonCode: 'DR_DRILL_SCHEDULED' }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      } else {
        await apiClient.post(`/regional-resilience/drills/${confirmation.drill.id}/${confirmation.action}`, { workspaceId: identity.receivingWorkspaceId, safeReasonCode: confirmation.reasonCode }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      }
      recordEvent('DR drill control accepted', confirmation.action || 'schedule', 'success');
      setConfirmation(null);
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Operations / Regional resilience" title="DR Drills" description="Deterministic or isolated exercises that verify fencing, queue transfer, recovery objectives, and safe failback." actions={<SecondaryButton onClick={load} disabled={!partnerConfigured || state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>} />
      <RegionalResilienceNav />
      {state.error ? <ErrorAlert error={state.error} title="DR drill request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading disaster recovery drills" /> : null}
      <Panel className="mb-5"><div className="mb-4 flex items-center gap-2"><FlaskConical className="h-4 w-4 text-cyan-700" /><div><h2 className="text-sm font-semibold text-slate-950">Schedule safe drill</h2><p className="text-xs text-slate-500">Console-created drills are restricted to deterministic simulation; real infrastructure actions remain manual.</p></div></div><div className="grid gap-3 md:grid-cols-4"><label className="text-xs font-medium text-slate-700">Drill name<input className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><Select label="Type" value={draft.drillType} options={['control_plane_simulation', 'worker_region_loss', 'primary_region_loss', 'backup_restore_validation', 'failover_and_failback']} onChange={(value) => setDraft({ ...draft, drillType: value })} /><Select label="Source" value={draft.sourceRegionId} options={state.regions.map((region) => region.regionId)} onChange={(value) => setDraft({ ...draft, sourceRegionId: value })} /><Select label="Target" value={draft.targetRegionId} options={state.regions.map((region) => region.regionId)} onChange={(value) => setDraft({ ...draft, targetRegionId: value })} /></div><div className="mt-4"><PrimaryButton onClick={() => setConfirmation({ type: 'create', action: 'schedule drill', reasonCode: 'DR_DRILL_SCHEDULED' })} disabled={!draft.sourceRegionId || !draft.targetRegionId || draft.sourceRegionId === draft.targetRegionId}>Schedule drill</PrimaryButton></div></Panel>
      <Panel className="overflow-hidden p-0"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">Drill history</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Drill</th><th>Type</th><th>Source</th><th>Target</th><th>Status</th><th>Expected RPO</th><th>Measured RPO</th><th>Expected RTO</th><th>Measured RTO</th><th>Last run</th><th className="pr-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-200">{state.drills.map((drill) => <tr key={drill.id}><td className="px-4 py-3"><p className="font-medium">{drill.name}</p><p className="text-slate-500">{(drill.safeFindings || []).length} findings</p></td><td>{drill.drillType}</td><td>{drill.sourceRegionId}</td><td>{drill.targetRegionId}</td><td><StatusBadge status={drill.status} /></td><td>{formatDuration(drill.expectedRpoMs)}</td><td>{formatDuration(drill.measuredRpoMs)}</td><td>{formatDuration(drill.expectedRtoMs)}</td><td>{formatDuration(drill.measuredRtoMs)}</td><td>{formatDate(drill.completedAt || drill.startedAt)}</td><td className="pr-4"><div className="flex gap-2">{!drill.approvedBy && ['draft', 'scheduled'].includes(drill.status) ? <button className="text-cyan-700" onClick={() => setConfirmation({ type: 'control', action: 'approve', drill, reasonCode: 'DR_DRILL_APPROVED' })}>Approve</button> : null}{drill.approvedBy && drill.status === 'scheduled' ? <button className="text-rose-700" onClick={() => setConfirmation({ type: 'control', action: 'run', drill, reasonCode: 'DR_DRILL_EXECUTION_APPROVED' })}>Run drill</button> : null}{!['succeeded', 'failed', 'cancelled'].includes(drill.status) ? <button className="text-slate-600" onClick={() => setConfirmation({ type: 'control', action: 'cancel', drill, reasonCode: 'DR_DRILL_CANCELLED' })}>Cancel</button> : null}</div></td></tr>)}</tbody></table>{!state.drills.length ? <p className="py-8 text-center text-sm text-slate-500">No DR drills have been scheduled.</p> : null}</div></Panel>
      <ConfirmationDialog open={Boolean(confirmation)} title={confirmation?.action || 'DR drill control'} description={`Source: ${confirmation?.drill?.sourceRegionId || draft.sourceRegionId || '-'} · Target: ${confirmation?.drill?.targetRegionId || draft.targetRegionId || '-'}. Approval and policy status will be revalidated.`} confirmLabel="Confirm drill control" busy={busy} onClose={() => !busy && setConfirmation(null)} onConfirm={runAction}><dl className="grid gap-2 text-xs"><div><dt className="text-slate-500">Safe reason code</dt><dd className="font-medium text-slate-900">{confirmation?.reasonCode}</dd></div><div><dt className="text-slate-500">Execution boundary</dt><dd className="font-medium text-slate-900">Deterministic simulation or approved isolated target</dd></div></dl></ConfirmationDialog>
    </>
  );
}

function Select({ label, value, options, onChange }) { return <label className="text-xs font-medium text-slate-700">{label}<select className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
