import { Archive, RefreshCw, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ConfirmationDialog } from '../components/ConfirmationDialog.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { RegionalResilienceNav } from '../components/RegionalResilienceNav.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PageHeader, Panel, PrimaryButton, SecondaryButton, formatDate } from './pageChrome.jsx';

export function BackupsRestores() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, backups: [], restores: [], regions: [] });
  const [draft, setDraft] = useState({ regionId: '', backupType: 'snapshot', dataClassification: 'confidential', targetRegionId: '' });
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }), [identity.receivingWorkspaceId]);

  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [backups, restores, regions] = await Promise.all([apiClient.get(`/regional-resilience/backups?${query}`), apiClient.get(`/regional-resilience/restores?${query}`), apiClient.get(`/regional-resilience/regions?${query}`)]);
      const regionItems = regions.items || [];
      setState({ loading: false, error: null, backups: backups.items || [], restores: restores.items || [], regions: regionItems });
      setDraft((current) => ({ ...current, regionId: current.regionId || regionItems[0]?.regionId || '', targetRegionId: current.targetRegionId || regionItems[1]?.regionId || regionItems[0]?.regionId || '' }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, query]);

  useEffect(() => { void load(); }, [load]);

  async function runAction() {
    if (!confirmation) return;
    setBusy(true);
    try {
      if (confirmation.type === 'backup') {
        await apiClient.post('/regional-resilience/backups', { ...draft, workspaceId: identity.receivingWorkspaceId, sourceRegionId: draft.regionId, residencyTags: state.regions.find((item) => item.regionId === draft.regionId)?.dataResidencyTags || [], schemaVersion: '1', safeReasonCode: 'DR_BACKUP_REQUESTED' }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      } else if (confirmation.type === 'verify') {
        await apiClient.post(`/regional-resilience/backups/${confirmation.backup.backupId}/verify`, { workspaceId: identity.receivingWorkspaceId, expectedCollectionSummaries: [] }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      } else if (confirmation.type === 'restore') {
        await apiClient.post('/regional-resilience/restores', { workspaceId: identity.receivingWorkspaceId, backupId: confirmation.backup.backupId, targetRegionId: draft.targetRegionId, restoreMode: 'isolated_validation', safeReasonCode: 'DR_ISOLATED_RESTORE_REQUESTED' }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      } else {
        const approval = confirmation.action === 'promote';
        await apiClient.post(`/regional-resilience/restores/${confirmation.restore.id}/${confirmation.action}`, { workspaceId: identity.receivingWorkspaceId, safeReasonCode: confirmation.reasonCode, ...(approval ? { approvalRequestId: confirmation.restore.approvalRequestId } : {}) }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      }
      recordEvent('Disaster recovery storage control accepted', confirmation.type, 'success');
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
      <PageHeader eyebrow="Operations / Regional resilience" title="Backups & Restores" description="Provider-neutral backup inventory and isolated restore validation with production promotion safeguards." actions={<SecondaryButton onClick={load} disabled={!partnerConfigured || state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>} />
      <RegionalResilienceNav />
      {state.error ? <ErrorAlert error={state.error} title="Backup or restore request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading recovery inventory" /> : null}
      <Panel className="mb-5"><div className="mb-4 flex items-center gap-2"><Archive className="h-4 w-4 text-cyan-700" /><div><h2 className="text-sm font-semibold text-slate-950">Request backup</h2><p className="text-xs text-slate-500">The configured adapter remains disabled safely until an operator configures an approved provider integration.</p></div></div><div className="grid gap-3 md:grid-cols-4"><Select label="Region" value={draft.regionId} options={state.regions.map((item) => item.regionId)} onChange={(value) => setDraft({ ...draft, regionId: value })} /><Select label="Type" value={draft.backupType} options={['snapshot', 'incremental', 'logical_export', 'point_in_time_reference']} onChange={(value) => setDraft({ ...draft, backupType: value })} /><Select label="Classification" value={draft.dataClassification} options={['public', 'internal', 'confidential', 'restricted']} onChange={(value) => setDraft({ ...draft, dataClassification: value })} /><Select label="Isolated restore target" value={draft.targetRegionId} options={state.regions.map((item) => item.regionId)} onChange={(value) => setDraft({ ...draft, targetRegionId: value })} /></div><div className="mt-4"><PrimaryButton onClick={() => setConfirmation({ type: 'backup', reasonCode: 'DR_BACKUP_REQUESTED' })} disabled={!draft.regionId}>Request backup</PrimaryButton></div></Panel>
      <Panel className="mb-5 overflow-hidden p-0"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">Backup inventory</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Backup</th><th>Region</th><th>Type</th><th>Status</th><th>Recovery point</th><th>Verification</th><th>Schema</th><th>Retention</th><th>Created</th><th className="pr-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-200">{state.backups.map((backup) => <tr key={backup.backupId}><td className="px-4 py-3 font-medium">{backup.backupId}</td><td>{backup.regionId}</td><td>{backup.backupType}</td><td><StatusBadge status={backup.status} /></td><td>{formatDate(backup.recoverableThrough)}</td><td>{backup.verificationStatus}</td><td>{backup.schemaVersion}</td><td>{formatDate(backup.expiresAt)}</td><td>{formatDate(backup.createdAt)}</td><td className="pr-4"><div className="flex gap-2">{backup.verificationStatus !== 'verified' ? <button className="text-cyan-700" onClick={() => setConfirmation({ type: 'verify', backup, reasonCode: 'DR_BACKUP_VERIFY_REQUESTED' })}>Verify backup</button> : null}{backup.verificationStatus === 'verified' ? <button className="text-cyan-700" onClick={() => setConfirmation({ type: 'restore', backup, reasonCode: 'DR_ISOLATED_RESTORE_REQUESTED' })}>Request isolated restore</button> : null}</div></td></tr>)}</tbody></table>{!state.backups.length ? <p className="py-8 text-center text-sm text-slate-500">No backup manifests are visible.</p> : null}</div></Panel>
      <Panel className="overflow-hidden p-0"><div className="border-b border-slate-200 px-5 py-4"><div className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-cyan-700" /><h2 className="text-sm font-semibold text-slate-950">Isolated restores</h2></div></div><div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Backup reference</th><th>Source</th><th>Isolated target</th><th>Status</th><th>Schema</th><th>Indexes</th><th>Integrity</th><th>Projection</th><th>Approval</th><th>Promotion</th><th className="pr-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-200">{state.restores.map((restore) => <tr key={restore.id}><td className="px-4 py-3 font-medium">{restore.backupId}</td><td>{restore.sourceRegionId}</td><td>{restore.targetRegionId}</td><td><StatusBadge status={restore.status} /></td><td>{restore.migrationStatus}</td><td>{restore.indexStatus}</td><td>{restore.integrityStatus}</td><td>{restore.projectionStatus}</td><td>{restore.approvalRequestId ? 'approved' : 'required before promotion'}</td><td>{restore.status === 'promoted' ? 'promoted' : 'isolated'}</td><td className="pr-4"><div className="flex gap-2">{['restoring', 'validating_schema', 'validating_indexes', 'validating_integrity', 'rebuilding_projections'].includes(restore.status) ? <button className="text-cyan-700" onClick={() => setConfirmation({ type: 'restore-control', action: 'validate', restore, reasonCode: 'DR_RESTORE_VALIDATE' })}>Validate restore</button> : null}{restore.status === 'ready_for_promotion' ? <button className="text-rose-700" onClick={() => setConfirmation({ type: 'restore-control', action: 'promote', restore, reasonCode: 'DR_RESTORE_PROMOTION_APPROVED' })}>Promote validated restore</button> : null}{restore.status !== 'promoted' ? <button className="text-slate-600" onClick={() => setConfirmation({ type: 'restore-control', action: 'cleanup', restore, reasonCode: 'DR_RESTORE_CLEANUP' })}>Clean up</button> : null}</div></td></tr>)}</tbody></table>{!state.restores.length ? <p className="py-8 text-center text-sm text-slate-500">No isolated restore operations are visible.</p> : null}</div></Panel>
      <ConfirmationDialog open={Boolean(confirmation)} title={confirmation?.type === 'backup' ? 'Request backup' : confirmation?.type === 'verify' ? 'Verify backup' : confirmation?.type === 'restore' ? 'Request isolated restore' : `${confirmation?.action || 'Restore'} operation`} description={`Source: ${confirmation?.backup?.regionId || confirmation?.restore?.sourceRegionId || draft.regionId || '-'} · Target: ${confirmation?.restore?.targetRegionId || (confirmation?.type === 'restore' ? draft.targetRegionId : 'provider-managed inventory')}. Residency, authorization, and approval are revalidated.`} confirmLabel="Confirm recovery control" busy={busy} onClose={() => !busy && setConfirmation(null)} onConfirm={runAction}><dl className="grid gap-2 text-xs"><div><dt className="text-slate-500">Safe reason code</dt><dd className="font-medium text-slate-900">{confirmation?.reasonCode}</dd></div><div><dt className="text-slate-500">Approval status</dt><dd className="font-medium text-amber-700">Validated at execution</dd></div></dl></ConfirmationDialog>
    </>
  );
}

function Select({ label, value, options, onChange }) { return <label className="text-xs font-medium text-slate-700">{label}<select className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
