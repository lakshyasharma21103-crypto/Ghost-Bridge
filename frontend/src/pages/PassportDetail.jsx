import { Ban, KeyRound, PauseCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PartnerAccessNotice } from './PartnerDashboard.jsx';
import { formatDate, PageHeader, Panel, PrimaryButton, SecondaryButton } from './pageChrome.jsx';

export function PassportDetail() {
  const { passportId } = useParams();
  const { partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, data: null });
  const [tab, setTab] = useState('overview');
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(() => {
    if (!partnerConfigured || !passportId) return;
    setState({ loading: true, error: null, data: null });
    apiClient.get(`/partner/agents/${passportId}`)
      .then((data) => setState({ loading: false, error: null, data }))
      .catch((error) => setState({ loading: false, error, data: null }));
  }, [partnerConfigured, passportId]);

  useEffect(() => { load(); }, [load]);

  async function suspendPassport() {
    try {
      setActionBusy(true);
      await apiClient.post(`/partner/agents/${passportId}/revoke`, {});
      recordEvent('Passport suspended', state.data.passport.agent.name, 'offline');
      load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally { setActionBusy(false); }
  }

  async function revokeKey(key) {
    try {
      setActionBusy(true);
      await apiClient.post(`/partner/keys/${key.id}/revoke`, {});
      recordEvent('Install key revoked', key.keyPrefix, 'offline');
      load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally { setActionBusy(false); }
  }

  return <>
    <PageHeader eyebrow="Partner passport" title={state.data?.passport.agent.name || 'Passport detail'} description={state.data ? `${state.data.passport.agent.provider} / ${state.data.passport.agent.version} / ${state.data.passport.partnerAgentId}` : 'Inspect the identity, runtime contract, capabilities, and issued install keys.'} actions={<div className="flex gap-3"><Link to={`/install-keys/issue?passportId=${passportId}`} className="inline-flex min-h-10 items-center gap-2 bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"><KeyRound className="h-4 w-4" />Issue key</Link><SecondaryButton onClick={load} disabled={state.loading}><RefreshCw className="h-4 w-4" />Refresh</SecondaryButton></div>} />
    {!partnerConfigured ? <PartnerAccessNotice /> : null}
    {state.error ? <div className="mb-6"><ErrorAlert error={state.error} title="Passport action failed" /></div> : null}
    {state.loading ? <LoadingBlock label="Loading passport detail" /> : null}
    {state.data ? <PassportContent data={state.data} tab={tab} setTab={setTab} suspendPassport={suspendPassport} revokeKey={revokeKey} actionBusy={actionBusy} /> : null}
  </>;
}

function PassportContent({ data, tab, setTab, suspendPassport, revokeKey, actionBusy }) {
  const { passport, capabilities, keyStats } = data;
  return <>
    <div className="border border-slate-200 bg-white px-5 py-4"><div className="flex flex-wrap items-center gap-3"><StatusBadge tone={passport.status === 'valid' ? 'ready' : passport.status === 'suspended' ? 'offline' : 'pending'}>{passport.status}</StatusBadge><span className="text-sm text-slate-600">{passport.protocol}</span><span className="text-sm text-slate-500">{capabilities.length} capabilities</span>{passport.runtime.type === 'mcp' ? <StatusBadge tone="limited">MCP limited</StatusBadge> : <StatusBadge tone="ready">REST ready</StatusBadge>}</div></div>
    <div className="mt-6 border-b border-slate-200"><div className="flex overflow-x-auto"><TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabButton><TabButton active={tab === 'capabilities'} onClick={() => setTab('capabilities')}>Capabilities</TabButton><TabButton active={tab === 'keys'} onClick={() => setTab('keys')}>Issued keys</TabButton></div></div>
    {tab === 'overview' ? <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_1fr]"><Panel><h2 className="text-base font-semibold text-slate-950">Agent metadata</h2><dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2"><Definition label="Agent ID" value={passport.agent.id} /><Definition label="Provider" value={passport.agent.provider} /><Definition label="Version" value={passport.agent.version} /><Definition label="Created" value={formatDate(passport.createdAt)} /><div className="sm:col-span-2"><Definition label="Description" value={passport.agent.description} /></div></dl></Panel><div className="space-y-6"><Panel><h2 className="text-base font-semibold text-slate-950">Runtime</h2><dl className="mt-4 space-y-4"><Definition label="Type" value={passport.runtime.type.toUpperCase()} /><Definition label="Endpoint" value={passport.runtime.endpoint} mono /><Definition label="Method" value={passport.runtime.method || '-'} /><Definition label="Health endpoint" value={passport.health?.endpoint || 'Not declared'} mono /></dl></Panel><Panel><h2 className="text-base font-semibold text-slate-950">Authentication and install</h2><dl className="mt-4 space-y-4"><Definition label="Auth type" value={passport.auth.type} mono /><Definition label="Header / scheme" value={[passport.auth.header, passport.auth.scheme].filter(Boolean).join(' / ') || 'Not declared'} /><Definition label="Supported modes" value={passport.install.supportedModes.join(', ')} /><Definition label="User consent" value={passport.install.requiresUserConsent ? 'Required' : 'Not required'} /></dl></Panel></div><Panel className="xl:col-span-2"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-semibold text-slate-950">Passport controls</h2><p className="mt-1 text-sm text-slate-600">Suspending a passport prevents new install-key issuance and resolution.</p></div><PrimaryButton onClick={suspendPassport} disabled={passport.status === 'suspended' || actionBusy}><PauseCircle className="h-4 w-4" />{passport.status === 'suspended' ? 'Passport suspended' : 'Suspend passport'}</PrimaryButton></div>{passport.validationErrors?.length ? <div className="mt-5"><p className="text-sm font-semibold text-rose-800">Validation errors</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-700">{passport.validationErrors.map((error, index) => <li key={index}>{error.message || JSON.stringify(error)}</li>)}</ul></div> : null}</Panel></div> : null}
    {tab === 'capabilities' ? <div className="mt-6"><Panel><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-700" /><h2 className="text-base font-semibold text-slate-950">Capability contracts</h2></div><div className="mt-5 divide-y divide-slate-200">{capabilities.map((capability) => <div key={capability.id} className="py-5 first:pt-0"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium text-slate-950">{capability.name}</p><p className="mt-1 text-sm text-slate-600">{capability.description}</p></div><div className="flex items-center gap-2"><StatusBadge tone={capability.enabled ? 'ready' : 'offline'}>{capability.enabled ? 'enabled' : 'disabled'}</StatusBadge><StatusBadge tone={capability.riskLevel === 'high' ? 'offline' : capability.riskLevel === 'medium' ? 'pending' : 'ready'}>{capability.riskLevel} risk</StatusBadge></div></div><div className="mt-4 grid gap-4 xl:grid-cols-2"><SchemaBlock label="Input schema" value={capability.inputSchema} /><SchemaBlock label="Output schema" value={capability.outputSchema} /></div></div>)}</div></Panel></div> : null}
    {tab === 'keys' ? <div className="mt-6 grid gap-6 xl:grid-cols-[.72fr_1.28fr]"><Panel><h2 className="text-base font-semibold text-slate-950">Key status</h2><dl className="mt-5 grid grid-cols-2 gap-4">{['active', 'used', 'revoked', 'expired'].map((status) => <div key={status} className="border-l-2 border-slate-300 pl-3"><dt className="text-xs uppercase text-slate-500">{status}</dt><dd className="mt-1 text-2xl font-semibold text-slate-950">{keyStats.counts[status] || 0}</dd></div>)}</dl></Panel><Panel><h2 className="text-base font-semibold text-slate-950">Recent issued keys</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="pb-3">Prefix</th><th className="pb-3">Mode</th><th className="pb-3">Status</th><th className="pb-3">Expires</th><th className="pb-3"><span className="sr-only">Action</span></th></tr></thead><tbody className="divide-y divide-slate-200">{keyStats.recent.map((key) => <tr key={key.id}><td className="py-3 font-mono text-xs text-slate-700">{key.keyPrefix}</td><td className="py-3 text-xs text-slate-600">{key.installMode}</td><td className="py-3"><StatusBadge tone={key.status === 'active' ? 'ready' : key.status === 'used' ? 'neutral' : 'offline'}>{key.status}</StatusBadge></td><td className="py-3 text-xs text-slate-600">{formatDate(key.expiresAt)}</td><td className="py-3 text-right">{key.status === 'active' ? <button type="button" onClick={() => revokeKey(key)} disabled={actionBusy} className="inline-flex h-8 w-8 items-center justify-center text-rose-700 hover:bg-rose-50" title="Revoke install key"><Ban className="h-4 w-4" /></button> : null}</td></tr>)}</tbody></table></div></Panel></div> : null}
  </>;
}

function TabButton({ active, onClick, children }) { return <button type="button" onClick={onClick} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium ${active ? 'border-cyan-700 text-cyan-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{children}</button>; }
function Definition({ label, value, mono = false }) { return <div><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className={`mt-1 break-words text-sm leading-6 text-slate-800 ${mono ? 'font-mono text-xs' : ''}`}>{value || '-'}</dd></div>; }
function SchemaBlock({ label, value }) { return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><pre className="mt-2 overflow-x-auto border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">{JSON.stringify(value, null, 2)}</pre></div>; }
