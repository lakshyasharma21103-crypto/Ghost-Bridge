import { RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { RegionalResilienceNav } from '../components/RegionalResilienceNav.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PageHeader, Panel, PrimaryButton, SecondaryButton, formatDuration } from './pageChrome.jsx';

const initialDraft = {
  name: 'Workspace disaster recovery', criticality: 'important', recoveryPointObjectiveMs: 60000,
  recoveryTimeObjectiveMs: 300000, preferredRecoveryRegionId: '', permittedRecoveryRegionIds: '',
  prohibitedRecoveryRegionIds: '', maximumPromotionReplicationLagMs: 30000,
  requireApprovalForFailover: true, requireApprovalForFailback: true,
  requireApprovalForDataLossAcceptance: true, degradedMode: 'read_only', backupFrequencyMs: 86400000,
  backupRetentionMs: 2592000000, restoreVerificationFrequencyMs: 604800000,
  minimumHealthyServiceCount: 1, minimumHealthyWorkerCount: 1, minimumHealthyDatabaseCategory: 'healthy',
};

export function DisasterRecovery() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, policies: [], regions: [] });
  const [draft, setDraft] = useState(initialDraft);
  const [busy, setBusy] = useState('');
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }), [identity.receivingWorkspaceId]);

  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [policies, regions] = await Promise.all([apiClient.get(`/regional-resilience/dr-policies?${query}`), apiClient.get(`/regional-resilience/regions?${query}`)]);
      const ids = (regions.items || []).map((region) => region.regionId);
      setState({ loading: false, error: null, policies: policies.items || [], regions: regions.items || [] });
      setDraft((current) => ({ ...current, preferredRecoveryRegionId: current.preferredRecoveryRegionId || ids[1] || ids[0] || '', permittedRecoveryRegionIds: current.permittedRecoveryRegionIds || ids.join(', ') }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, query]);

  useEffect(() => { void load(); }, [load]);

  async function createDraft() {
    setBusy('create');
    try {
      const list = (value) => value.split(',').map((entry) => entry.trim()).filter(Boolean);
      await apiClient.post('/regional-resilience/dr-policies', { ...draft, workspaceId: identity.receivingWorkspaceId, scope: 'workspace', permittedRecoveryRegionIds: list(draft.permittedRecoveryRegionIds), prohibitedRecoveryRegionIds: list(draft.prohibitedRecoveryRegionIds), protectedOperationCategories: ['recovery', 'compensation', 'cancellation'] }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      recordEvent('DR policy draft created', draft.name, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  async function lifecycle(policy, action) {
    setBusy(`${action}:${policy.id}`);
    try {
      await apiClient.post(`/regional-resilience/dr-policies/${policy.id}/${action}`, { workspaceId: identity.receivingWorkspaceId }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      recordEvent(`DR policy ${action} complete`, policy.name, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <PageHeader eyebrow="Operations / Regional resilience" title="Disaster Recovery" description="Versioned recovery objectives, promotion limits, approvals, degraded modes, and backup requirements." actions={<SecondaryButton onClick={load} disabled={!partnerConfigured || state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>} />
      <RegionalResilienceNav />
      {state.error ? <ErrorAlert error={state.error} title="Disaster recovery request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading disaster recovery policy" /> : null}
      <Panel className="mb-5">
        <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-700" /><div><h2 className="text-sm font-semibold text-slate-950">Disaster Recovery Policy editor</h2><p className="text-xs text-slate-500">Draft, validation, and activation are independently authorized and audited.</p></div></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TextField label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
          <SelectField label="Scope" value="workspace" options={['workspace']} />
          <SelectField label="Criticality" value={draft.criticality} options={['standard', 'important', 'critical']} onChange={(value) => setDraft({ ...draft, criticality: value })} />
          <NumberField label="RPO ms" value={draft.recoveryPointObjectiveMs} onChange={(value) => setDraft({ ...draft, recoveryPointObjectiveMs: value })} />
          <NumberField label="RTO ms" value={draft.recoveryTimeObjectiveMs} onChange={(value) => setDraft({ ...draft, recoveryTimeObjectiveMs: value })} />
          <TextField label="Permitted regions" value={draft.permittedRecoveryRegionIds} onChange={(value) => setDraft({ ...draft, permittedRecoveryRegionIds: value })} />
          <TextField label="Prohibited regions" value={draft.prohibitedRecoveryRegionIds} onChange={(value) => setDraft({ ...draft, prohibitedRecoveryRegionIds: value })} />
          <SelectField label="Preferred recovery" value={draft.preferredRecoveryRegionId} options={state.regions.map((region) => region.regionId)} onChange={(value) => setDraft({ ...draft, preferredRecoveryRegionId: value })} />
          <NumberField label="Maximum replication lag ms" value={draft.maximumPromotionReplicationLagMs} onChange={(value) => setDraft({ ...draft, maximumPromotionReplicationLagMs: value })} />
          <SelectField label="Degraded mode" value={draft.degradedMode} options={['disabled', 'read_only', 'queue_only', 'restricted_operations']} onChange={(value) => setDraft({ ...draft, degradedMode: value })} />
          <NumberField label="Backup frequency ms" value={draft.backupFrequencyMs} onChange={(value) => setDraft({ ...draft, backupFrequencyMs: value })} />
          <NumberField label="Retention ms" value={draft.backupRetentionMs} onChange={(value) => setDraft({ ...draft, backupRetentionMs: value })} />
          <NumberField label="Restore verification frequency ms" value={draft.restoreVerificationFrequencyMs} onChange={(value) => setDraft({ ...draft, restoreVerificationFrequencyMs: value })} />
          <NumberField label="Minimum healthy services" value={draft.minimumHealthyServiceCount} onChange={(value) => setDraft({ ...draft, minimumHealthyServiceCount: value })} />
          <NumberField label="Minimum healthy workers" value={draft.minimumHealthyWorkerCount} onChange={(value) => setDraft({ ...draft, minimumHealthyWorkerCount: value })} />
          <SelectField label="Minimum database health" value={draft.minimumHealthyDatabaseCategory} options={['healthy', 'elevated']} onChange={(value) => setDraft({ ...draft, minimumHealthyDatabaseCategory: value })} />
        </div>
        <div className="mt-4 grid gap-2 text-xs text-slate-700 md:grid-cols-3">{[['Failover approval', 'requireApprovalForFailover'], ['Failback approval', 'requireApprovalForFailback'], ['Data-loss acceptance', 'requireApprovalForDataLossAcceptance']].map(([label, key]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.checked })} />{label}</label>)}</div>
        <div className="mt-4"><PrimaryButton onClick={createDraft} disabled={busy === 'create' || !draft.preferredRecoveryRegionId}><Save className="h-4 w-4" />Create draft</PrimaryButton></div>
      </Panel>
      <Panel className="overflow-hidden p-0"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">Policy versions</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Policy</th><th>Scope</th><th>Criticality</th><th>RPO</th><th>RTO</th><th>Replication limit</th><th>Approvals</th><th>Degraded mode</th><th>Backup / retention</th><th>Validation</th><th>Status</th><th className="pr-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-200">{state.policies.map((policy) => <tr key={policy.id}><td className="px-4 py-3"><p className="font-medium">{policy.name}</p><p className="text-slate-500">v{policy.version}</p></td><td>{policy.scope}</td><td>{policy.criticality}</td><td>{formatDuration(policy.recoveryPointObjectiveMs)}</td><td>{formatDuration(policy.recoveryTimeObjectiveMs)}</td><td>{formatDuration(policy.maximumPromotionReplicationLagMs)}</td><td>{policy.requireApprovalForFailover ? 'failover, ' : ''}{policy.requireApprovalForFailback ? 'failback' : ''}</td><td>{policy.degradedMode}</td><td>{formatDuration(policy.backupFrequencyMs)} / {formatDuration(policy.backupRetentionMs)}</td><td>{policy.validation?.valid === true ? 'valid' : policy.validation?.valid === false ? 'invalid' : 'not validated'}</td><td><StatusBadge status={policy.status} /></td><td className="pr-4">{policy.status === 'draft' ? <div className="flex gap-2"><button className="text-cyan-700" disabled={Boolean(busy)} onClick={() => lifecycle(policy, 'validate')}>Validate</button><button className="text-cyan-700" disabled={Boolean(busy)} onClick={() => lifecycle(policy, 'activate')}>Activate</button></div> : '-'}</td></tr>)}</tbody></table>{!state.policies.length ? <p className="py-8 text-center text-sm text-slate-500">No DR policies are visible.</p> : null}</div></Panel>
    </>
  );
}

function TextField({ label, value, onChange }) { return <label className="text-xs font-medium text-slate-700">{label}<input className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function NumberField({ label, value, onChange }) { return <label className="text-xs font-medium text-slate-700">{label}<input type="number" className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
function SelectField({ label, value, options, onChange = () => {} }) { return <label className="text-xs font-medium text-slate-700">{label}<select className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
