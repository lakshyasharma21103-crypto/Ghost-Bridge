import { RefreshCw, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ConfirmationDialog } from '../components/ConfirmationDialog.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { RegionalResilienceNav } from '../components/RegionalResilienceNav.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { MetricCard, PageHeader, Panel, SecondaryButton, formatDate } from './pageChrome.jsx';

export function Regions() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, regions: [], authority: null, replication: [] });
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }), [identity.receivingWorkspaceId]);

  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [regions, authority, replication] = await Promise.all([
        apiClient.get(`/regional-resilience/regions?${query}`),
        apiClient.get(`/regional-resilience/write-authority?${query}`),
        apiClient.get(`/regional-resilience/replication?${query}`),
      ]);
      setState({ loading: false, error: null, regions: regions.items || [], authority, replication: replication.items || [] });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, query]);

  useEffect(() => { void load(); }, [load]);

  async function runControl() {
    if (!confirmation) return;
    setBusy(true);
    try {
      await apiClient.post(`/regional-resilience/regions/${confirmation.regionId}/${confirmation.action}`, {
        workspaceId: identity.receivingWorkspaceId,
        safeReasonCode: confirmation.reasonCode,
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      recordEvent(`Regional ${confirmation.action} requested`, confirmation.regionId, 'success');
      setConfirmation(null);
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy(false);
    }
  }

  const authority = state.authority || {};
  const healthCounts = state.regions.reduce((counts, region) => ({ ...counts, [region.state]: (counts[region.state] || 0) + 1 }), {});
  const eligibleReplication = state.replication.find((item) => item.promotionEligible);
  return (
    <>
      <PageHeader eyebrow="Operations / Regional resilience" title="Regions" description="Single-writer regional readiness, bounded health, queue ownership, and safe operational controls." actions={<SecondaryButton onClick={load} disabled={!partnerConfigured || state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>} />
      <RegionalResilienceNav />
      {state.error ? <ErrorAlert error={state.error} title="Regional status request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading regional status" /> : null}
      <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Active write region" value={authority.activeRegionId || 'Unavailable'} detail={`Epoch ${authority.authorityEpoch || 0}`} tone={authority.status === 'active' ? 'emerald' : 'coral'} />
        <MetricCard label="Regional health" value={healthCounts.healthy || 0} detail="healthy regions" tone="emerald" />
        <MetricCard label="Replication health" value={eligibleReplication?.status || 'unknown'} detail={eligibleReplication ? 'promotion eligible' : 'not proven'} tone={eligibleReplication ? 'cyan' : 'coral'} />
        <MetricCard label="Active regions" value={state.regions.filter((item) => item.enabled !== false).length} detail={`${healthCounts.degraded || 0} degraded`} />
        <MetricCard label="Isolated regions" value={healthCounts.isolated || 0} detail={`${healthCounts.unavailable || 0} unavailable`} tone={(healthCounts.isolated || healthCounts.unavailable) ? 'coral' : 'slate'} />
        <MetricCard label="Failover readiness" value={eligibleReplication ? 'ready' : 'intervention'} detail="fencing and residency required" tone={eligibleReplication ? 'emerald' : 'coral'} />
        <MetricCard label="RPO status" value={eligibleReplication ? 'compliant' : 'unknown'} detail="never inferred from unknown lag" />
        <MetricCard label="RTO status" value="not evaluated" detail="evaluated during recovery" />
      </div>
      <Panel className="mb-5">
        <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 text-cyan-700" /><div><h2 className="text-sm font-semibold text-slate-950">Write Authority</h2><p className="mt-1 text-xs text-slate-500">Current region {authority.activeRegionId || '-'} · epoch {authority.authorityEpoch || 0} · lease {authority.status || 'missing'} · last transfer {formatDate(authority.lastTransitionAt)}</p><p className="mt-2 text-xs text-slate-500">Safe reasons: {(authority.safeReasonCodes || []).join(', ') || 'No active transition'}</p></div></div>
      </Panel>
      <Panel className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">Regional inventory</h2><p className="mt-1 text-xs text-slate-500">Provider-neutral categories only; private topology and lease material are never displayed.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Region</th><th>Role</th><th>State</th><th>Services</th><th>Database</th><th>Replication</th><th>Workers</th><th>Queue</th><th>Authority</th><th>Heartbeat</th><th className="pr-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-200">{state.regions.map((region) => <tr key={region.regionId}><td className="px-4 py-3"><p className="font-medium text-slate-900">{region.displayName}</p><p className="text-slate-500">{region.regionId}</p></td><td>{region.role}</td><td><StatusBadge status={region.state} /></td><td>{region.health?.serviceHealthCategory || 'unknown'} ({region.healthyServiceCount})</td><td>{region.health?.databaseHealthCategory || 'unknown'}</td><td>{region.health?.replicationHealthCategory || 'unknown'}</td><td>{region.activeWorkerCount}</td><td>{region.health?.queuedWorkCategory || 'unknown'}</td><td>{region.writeAuthority ? `writer · e${region.authorityEpoch}` : 'fenced'}</td><td>{formatDate(region.health?.snapshotAt)}</td><td className="pr-4"><div className="flex gap-2">{region.state === 'isolated' ? <button className="text-cyan-700" onClick={() => setConfirmation({ regionId: region.regionId, action: 'unisolate', reasonCode: 'REGION_ISOLATION_REMOVAL_APPROVED' })}>Unisolate</button> : <button className="text-rose-700" onClick={() => setConfirmation({ regionId: region.regionId, action: 'isolate', reasonCode: 'REGION_OPERATOR_ISOLATION' })}>Isolate</button>}<button className="text-cyan-700" onClick={() => setConfirmation({ regionId: region.regionId, action: 'drain', reasonCode: 'REGION_OPERATOR_DRAIN' })}>Drain</button>{region.writeAuthority ? <button className="text-rose-700" onClick={() => setConfirmation({ regionId: region.regionId, action: 'freeze-writes', reasonCode: 'REGION_OPERATOR_WRITE_FREEZE' })}>Freeze writes</button> : null}</div></td></tr>)}</tbody></table>{!state.regions.length ? <p className="py-8 text-center text-sm text-slate-500">No active regional configuration is visible.</p> : null}</div>
      </Panel>
      <ConfirmationDialog open={Boolean(confirmation)} title={`${confirmation?.action || 'Regional'} control`} description={`Source region: ${confirmation?.regionId || '-'}. Approval and policy status will be revalidated by the control plane.`} confirmLabel={`Confirm ${confirmation?.action || 'action'}`} busy={busy} onClose={() => !busy && setConfirmation(null)} onConfirm={runControl}><dl className="grid gap-2 text-xs"><div><dt className="text-slate-500">Safe reason code</dt><dd className="font-medium text-slate-900">{confirmation?.reasonCode}</dd></div><div><dt className="text-slate-500">Approval status</dt><dd className="font-medium text-amber-700">Validated at execution</dd></div></dl></ConfirmationDialog>
    </>
  );
}
