import { ArrowRight, CheckCircle2, ClipboardCheck, KeyRound, Link2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { FieldLabel, PageHeader, Panel, PrimaryButton } from './pageChrome.jsx';

export function ResolvePassportKey() {
  const { identity, recordEvent } = useAppState();
  const [key, setKey] = useState('');
  const [scope, setScope] = useState({
    organizationScope: 'organization_demo',
    workspaceScope: identity.receivingWorkspaceId,
  });
  const [state, setState] = useState({ resolving: false, error: null, result: null });

  async function resolveKey(event) {
    event.preventDefault();
    try {
      setState({ resolving: true, error: null, result: null });
      const data = await apiClient.post('/passports/resolve', {
        key,
        receivingWorkspaceId: scope.workspaceScope,
        receivingOrganizationId: scope.organizationScope,
      });
      setKey('');
      setState({ resolving: false, error: null, result: data });
      recordEvent('Install Grant redeemed', `${data.agent.name} / ${data.status}`, data.status === 'connected' ? 'ready' : 'pending');
    } catch (error) {
      setState({ resolving: false, error, result: null });
    }
  }

  return <>
    <PageHeader eyebrow="Ghost Bridge Native" title="Add External Agent" description="Use one opaque Install Grant to verify identity, preview compatibility, negotiate authentication, approve capabilities, and create a scoped Agent Connection. Users never enter a provider endpoint or credential." />
    <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]"><Panel><form onSubmit={resolveKey}><h2 className="text-base font-semibold text-slate-950">One-time Install Grant</h2><p className="mt-1 text-sm leading-6 text-slate-600">The raw grant is consumed by the Platform and is never returned in installation output.</p><div className="mt-6"><FieldLabel>Install Grant</FieldLabel><div className="flex flex-col gap-3 sm:flex-row"><input type="password" autoComplete="off" value={key} onChange={(event) => setKey(event.target.value)} placeholder="gb-install-… or existing install key" className="h-11 min-w-0 flex-1 border border-slate-300 bg-white px-3 font-mono text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" /><PrimaryButton type="submit" disabled={!key.trim() || !scope.organizationScope.trim() || !scope.workspaceScope.trim() || state.resolving}><KeyRound className="h-4 w-4" />{state.resolving ? 'Verifying' : 'Verify & install'}</PrimaryButton></div></div><div className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2"><label><FieldLabel>Requested organization</FieldLabel><input value={scope.organizationScope} onChange={(event) => setScope((current) => ({ ...current, organizationScope: event.target.value }))} className="h-10 w-full border border-slate-300 bg-white px-3 font-mono text-sm outline-none focus:border-cyan-600" /></label><label><FieldLabel>Requested workspace</FieldLabel><input value={scope.workspaceScope} onChange={(event) => setScope((current) => ({ ...current, workspaceScope: event.target.value }))} className="h-10 w-full border border-slate-300 bg-white px-3 font-mono text-sm outline-none focus:border-cyan-600" /></label><IdentityItem label="Receiving user" value={identity.receivingUserId} /></div></form></Panel><Panel><div className="flex gap-3"><ClipboardCheck className="mt-0.5 h-5 w-5 text-cyan-700" /><div><h2 className="font-semibold text-slate-950">Safe installation preview</h2><ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600"><li><span className="mr-2 font-mono text-cyan-800">01</span>Grant status, expiry, issuer, Agent Passport, and requested scope are verified.</li><li><span className="mr-2 font-mono text-cyan-800">02</span>Capability Contracts, restrictions, and expiration are shown without runtime secrets.</li><li><span className="mr-2 font-mono text-cyan-800">03</span>Atomic redemption creates one scoped Agent Connection, including on retry.</li></ol></div></div></Panel></div>
    {state.error ? <div className="mt-6"><ErrorAlert error={state.error} title="Could not resolve install key" /></div> : null}
    {state.result ? <section className="mt-6 border border-emerald-200 bg-white"><div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-700" /><div><p className="font-semibold text-slate-950">Installation checks completed and Connection created</p><p className="mt-1 text-sm text-emerald-900">The one-time Install Grant has been consumed. Cryptographic validity and host approval are reported separately.</p></div></div><StatusBadge tone={state.result.status === 'connected' ? 'ready' : state.result.status === 'pending_auth' ? 'pending' : 'neutral'}>{state.result.status}</StatusBadge></div></div><div className="grid gap-6 px-5 py-5 lg:grid-cols-[1fr_.9fr]"><div><p className="text-xs font-semibold uppercase text-slate-500">Agent Passport</p><h2 className="mt-2 text-xl font-semibold text-slate-950">{state.result.agent.name}</h2><p className="mt-1 text-sm text-slate-600">{state.result.agent.provider}</p><p className="mt-4 text-sm leading-6 text-slate-700">{state.result.agent.description}</p><div className="mt-5 flex flex-wrap gap-2"><StatusBadge tone={state.result.trust?.cryptographicValidity === 'valid' ? 'ready' : 'pending'}>Cryptographic: {state.result.trust?.cryptographicValidity || 'not reported'}</StatusBadge><StatusBadge tone={state.result.trust?.hostTrust === 'approved' ? 'ready' : 'pending'}>Host trust: {state.result.trust?.hostTrust || 'review policy'}</StatusBadge><StatusBadge tone="neutral">Registry: not an approval</StatusBadge><StatusBadge tone="neutral">{state.result.installScope}</StatusBadge></div>{state.result.trust ? <dl className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-200 pt-4 text-xs"><dt className="text-slate-500">Issuer ID</dt><dd className="break-all font-mono">{state.result.trust.issuerId || 'not reported'}</dd><dt className="text-slate-500">Trust profile</dt><dd>{state.result.trust.trustProfileVersion || 'not reported'}</dd><dt className="text-slate-500">Key thumbprint</dt><dd className="break-all font-mono">{state.result.trust.keyThumbprint || 'not reported'}</dd><dt className="text-slate-500">Revocation freshness</dt><dd>{state.result.trust.revocationFreshness || 'not reported'}</dd></dl> : null}</div><div className="border-l border-slate-200 pl-0 lg:pl-6"><p className="text-xs font-semibold uppercase text-slate-500">Agent Connection</p><p className="mt-2 break-all font-mono text-xs leading-6 text-slate-800">{state.result.connectionId}</p><p className="mt-4 text-sm text-slate-600">{state.result.capabilities.length} Capability Contracts available</p><Link to={`/connections/${state.result.connectionId}`} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-cyan-800 hover:text-cyan-950">Open Connection <ArrowRight className="h-4 w-4" /></Link></div></div><div className="border-t border-slate-200 px-5 py-5"><p className="text-sm font-semibold text-slate-950">Capability summary</p><div className="mt-3 grid gap-3 md:grid-cols-2">{state.result.capabilities.map((capability) => <div key={capability.name} className="border-l-2 border-cyan-600 bg-slate-50 px-4 py-3"><p className="font-medium text-slate-950">{capability.name}</p><p className="mt-1 text-sm leading-6 text-slate-600">{capability.description}</p></div>)}</div></div></section> : null}
  </>;
}

function IdentityItem({ label, value }) { return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 truncate font-mono text-xs text-slate-700">{value || 'Set in Settings'}</p></div>; }
