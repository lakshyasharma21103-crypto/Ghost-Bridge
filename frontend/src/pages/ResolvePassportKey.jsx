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
  const [state, setState] = useState({ resolving: false, error: null, result: null });

  async function resolveKey(event) {
    event.preventDefault();
    try {
      setState({ resolving: true, error: null, result: null });
      const data = await apiClient.post('/passports/resolve', { key, ...identity });
      setKey('');
      setState({ resolving: false, error: null, result: data });
      recordEvent('Install key resolved', `${data.agent.name} / ${data.status}`, data.status === 'connected' ? 'ready' : 'pending');
    } catch (error) {
      setState({ resolving: false, error, result: null });
    }
  }

  return <>
    <PageHeader eyebrow="Receiving platform" title="Resolve Passport Key" description="Paste an Agent Passport Install Key once to discover the agent, create a connection, and receive delegated runtime access when included." />
    <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]"><Panel><form onSubmit={resolveKey}><h2 className="text-base font-semibold text-slate-950">Agent Passport Install Key</h2><p className="mt-1 text-sm leading-6 text-slate-600">The raw key is consumed by the gateway. Continue with the returned connection ID after this step.</p><div className="mt-6"><FieldLabel>Install key</FieldLabel><div className="flex flex-col gap-3 sm:flex-row"><input type="password" autoComplete="off" value={key} onChange={(event) => setKey(event.target.value)} placeholder="agentpass_install_..." className="h-11 min-w-0 flex-1 border border-slate-300 bg-white px-3 font-mono text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" /><PrimaryButton type="submit" disabled={!key.trim() || state.resolving}><KeyRound className="h-4 w-4" />{state.resolving ? 'Resolving' : 'Resolve Key'}</PrimaryButton></div></div><div className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2"><IdentityItem label="Receiving workspace" value={identity.receivingWorkspaceId} /><IdentityItem label="Receiving user" value={identity.receivingUserId} /></div></form></Panel><Panel><div className="flex gap-3"><ClipboardCheck className="mt-0.5 h-5 w-5 text-cyan-700" /><div><h2 className="font-semibold text-slate-950">What happens next</h2><ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600"><li><span className="mr-2 font-mono text-cyan-800">01</span>Key status, expiry, and passport availability are verified.</li><li><span className="mr-2 font-mono text-cyan-800">02</span>A receiving connection is created with a safe passport snapshot.</li><li><span className="mr-2 font-mono text-cyan-800">03</span>Delegated runtime grants become encrypted connection credentials when supplied.</li></ol></div></div></Panel></div>
    {state.error ? <div className="mt-6"><ErrorAlert error={state.error} title="Could not resolve install key" /></div> : null}
    {state.result ? <section className="mt-6 border border-emerald-200 bg-white"><div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-700" /><div><p className="font-semibold text-slate-950">Agent found and connection created</p><p className="mt-1 text-sm text-emerald-900">The install key has been consumed.</p></div></div><StatusBadge tone={state.result.status === 'connected' ? 'ready' : state.result.status === 'pending_auth' ? 'pending' : 'neutral'}>{state.result.status}</StatusBadge></div></div><div className="grid gap-6 px-5 py-5 lg:grid-cols-[1fr_.9fr]"><div><p className="text-xs font-semibold uppercase text-slate-500">Agent</p><h2 className="mt-2 text-xl font-semibold text-slate-950">{state.result.agent.name}</h2><p className="mt-1 text-sm text-slate-600">{state.result.agent.provider}</p><p className="mt-4 text-sm leading-6 text-slate-700">{state.result.agent.description}</p><div className="mt-5 flex flex-wrap gap-2"><StatusBadge tone="info">{state.result.runtime.type.toUpperCase()}</StatusBadge><StatusBadge tone={state.result.auth.credentialConfigured ? 'ready' : 'pending'}>{state.result.auth.type}</StatusBadge><StatusBadge tone="neutral">{state.result.installScope}</StatusBadge></div></div><div className="border-l border-slate-200 pl-0 lg:pl-6"><p className="text-xs font-semibold uppercase text-slate-500">Connection</p><p className="mt-2 break-all font-mono text-xs leading-6 text-slate-800">{state.result.connectionId}</p><p className="mt-4 text-sm text-slate-600">{state.result.capabilities.length} capabilities imported</p><Link to={`/connections/${state.result.connectionId}`} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-cyan-800 hover:text-cyan-950">Open connection <ArrowRight className="h-4 w-4" /></Link></div></div><div className="border-t border-slate-200 px-5 py-5"><p className="text-sm font-semibold text-slate-950">Capabilities</p><div className="mt-3 grid gap-3 md:grid-cols-2">{state.result.capabilities.map((capability) => <div key={capability.name} className="border-l-2 border-cyan-600 bg-slate-50 px-4 py-3"><p className="font-medium text-slate-950">{capability.name}</p><p className="mt-1 text-sm leading-6 text-slate-600">{capability.description}</p></div>)}</div></div></section> : null}
  </>;
}

function IdentityItem({ label, value }) { return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 truncate font-mono text-xs text-slate-700">{value || 'Set in Settings'}</p></div>; }
