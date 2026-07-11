import { FilePlus2, KeyRound, MoreHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PartnerAccessNotice } from './PartnerDashboard.jsx';
import { formatDate, PageHeader } from './pageChrome.jsx';

export function PassportsList() {
  const { partnerConfigured } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, items: [] });

  useEffect(() => {
    if (!partnerConfigured) return;
    let active = true;
    setState({ loading: true, error: null, items: [] });
    apiClient.get('/partner/agents')
      .then((data) => active && setState({ loading: false, error: null, items: data.items }))
      .catch((error) => active && setState({ loading: false, error, items: [] }));
    return () => { active = false; };
  }, [partnerConfigured]);

  return <>
    <PageHeader eyebrow="Partner registry" title="Passports" description="Agent Passport records registered by the current partner API key." actions={<Link to="/passports/new" className="inline-flex min-h-10 items-center gap-2 bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"><FilePlus2 className="h-4 w-4" />Create passport</Link>} />
    {!partnerConfigured ? <PartnerAccessNotice /> : null}
    {state.error ? <ErrorAlert error={state.error} title="Could not load passports" /> : null}
    {state.loading ? <LoadingBlock label="Loading passports" /> : null}
    {partnerConfigured && !state.loading && !state.error ? state.items.length ? <div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3 font-semibold">Agent</th><th className="px-5 py-3 font-semibold">Runtime</th><th className="px-5 py-3 font-semibold">Auth</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Capabilities</th><th className="px-5 py-3 font-semibold">Created</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-slate-200">{state.items.map((passport) => <tr key={passport.id} className="hover:bg-slate-50"><td className="px-5 py-4"><Link to={`/passports/${passport.id}`} className="font-medium text-slate-950 hover:text-cyan-800">{passport.agent.name}</Link><p className="mt-1 text-xs text-slate-500">{passport.agent.provider}</p></td><td className="px-5 py-4 font-mono text-xs text-slate-700">{passport.runtime.type}</td><td className="px-5 py-4 font-mono text-xs text-slate-700">{passport.auth.type}</td><td className="px-5 py-4"><StatusBadge tone={passport.status === 'valid' ? 'ready' : passport.status === 'suspended' ? 'offline' : 'pending'}>{passport.status}</StatusBadge></td><td className="px-5 py-4 text-slate-700">{passport.capabilitiesCount}</td><td className="px-5 py-4 text-xs text-slate-600">{formatDate(passport.createdAt)}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Link to={`/install-keys/issue?passportId=${passport.id}`} className="flex h-8 w-8 items-center justify-center text-cyan-800 hover:bg-cyan-50" title="Issue install key"><KeyRound className="h-4 w-4" /></Link><Link to={`/passports/${passport.id}`} className="flex h-8 w-8 items-center justify-center text-slate-700 hover:bg-slate-100" title="View passport"><MoreHorizontal className="h-4 w-4" /></Link></div></td></tr>)}</tbody></table></div> : <EmptyState title="No passports" detail="Create the first Agent Passport to begin issuing install keys." action={<Link to="/passports/new" className="text-sm font-medium text-cyan-800">Create passport</Link>} /> : null}
  </>;
}
