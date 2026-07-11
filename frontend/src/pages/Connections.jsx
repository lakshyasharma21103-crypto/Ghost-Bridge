import { ArrowRight, Link2, PlusCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, PageHeader, SecondaryButton } from './pageChrome.jsx';

export function Connections() {
  const { identity } = useAppState();
  const [state, setState] = useState({ loading: true, error: null, items: [] });
  const load = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    apiClient.get(`/connections?${new URLSearchParams(identity)}`)
      .then((data) => setState({ loading: false, error: null, items: data.items }))
      .catch((error) => setState({ loading: false, error, items: [] }));
  }, [identity.receivingWorkspaceId, identity.receivingUserId]);
  useEffect(() => { load(); }, [load]);

  return <>
    <PageHeader eyebrow="Receiving platform" title="Connections" description="Connections are created when an install key is resolved. Use the connection ID for all later credential, health, and invocation actions." actions={<div className="flex gap-3"><Link to="/install-keys/resolve" className="inline-flex min-h-10 items-center gap-2 bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"><PlusCircle className="h-4 w-4" />Resolve key</Link><SecondaryButton onClick={load} disabled={state.loading}><RefreshCw className="h-4 w-4" />Refresh</SecondaryButton></div>} />
    {state.error ? <ErrorAlert error={state.error} title="Could not load connections" /> : null}
    {state.loading ? <LoadingBlock label="Loading connections" /> : null}
    {!state.loading && !state.error ? state.items.length ? <div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Agent</th><th className="px-5 py-3">Runtime</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-slate-200">{state.items.map((connection) => <tr key={connection.connectionId} className="hover:bg-slate-50"><td className="px-5 py-4"><Link to={`/connections/${connection.connectionId}`} className="font-medium text-slate-950 hover:text-cyan-800">{connection.agent.name}</Link><p className="mt-1 text-xs text-slate-500">{connection.agent.provider}</p></td><td className="px-5 py-4"><p className="font-mono text-xs text-slate-700">{connection.runtime.type}</p><p className="mt-1 text-xs text-slate-500">{connection.runtime.availability === 'limited' ? 'limited adapter' : 'available'}</p></td><td className="px-5 py-4"><StatusBadge tone={connection.status === 'connected' ? 'ready' : connection.status === 'pending_auth' ? 'pending' : 'neutral'}>{connection.status}</StatusBadge></td><td className="px-5 py-4 text-xs text-slate-600">{formatDate(connection.createdAt)}</td><td className="px-5 py-4 text-right"><Link to={`/connections/${connection.connectionId}`} className="inline-flex h-8 w-8 items-center justify-center text-cyan-800 hover:bg-cyan-50" title="Open connection"><ArrowRight className="h-4 w-4" /></Link></td></tr>)}</tbody></table></div> : <EmptyState title="No connections" detail="Resolve a one-time install key to create the first receiving-side connection." action={<Link to="/install-keys/resolve" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-800"><Link2 className="h-4 w-4" />Resolve install key</Link>} /> : null}
  </>;
}
