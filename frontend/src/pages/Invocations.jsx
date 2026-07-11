import { Eye, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, formatDuration, PageHeader, Panel, SecondaryButton } from './pageChrome.jsx';

export function Invocations() {
  const { identity } = useAppState();
  const [state, setState] = useState({ loading: true, error: null, items: [] });
  const [selected, setSelected] = useState({ loading: false, error: null, item: null });
  const load = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    apiClient.get(`/invocations?${new URLSearchParams(identity)}`)
      .then((data) => setState({ loading: false, error: null, items: data.items }))
      .catch((error) => setState({ loading: false, error, items: [] }));
  }, [identity.receivingWorkspaceId, identity.receivingUserId]);
  useEffect(() => { load(); }, [load]);

  async function inspect(invocationId) {
    try {
      setSelected({ loading: true, error: null, item: null });
      const item = await apiClient.get(`/invocations/${invocationId}?${new URLSearchParams(identity)}`);
      setSelected({ loading: false, error: null, item });
    } catch (error) { setSelected({ loading: false, error, item: null }); }
  }

  return <>
    <PageHeader eyebrow="Runtime gateway" title="Invocations" description="Every gateway attempt records its connection, capability, runtime status, timing, safe output, and structured error when applicable." actions={<SecondaryButton onClick={load} disabled={state.loading}><RefreshCw className="h-4 w-4" />Refresh</SecondaryButton>} />
    {state.error ? <ErrorAlert error={state.error} title="Could not load invocations" /> : null}
    {state.loading ? <LoadingBlock label="Loading invocations" /> : null}
    {!state.loading && !state.error ? state.items.length ? <><div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Capability</th><th className="px-5 py-3">Connection</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Duration</th><th className="px-5 py-3">Created</th><th className="px-5 py-3"><span className="sr-only">View</span></th></tr></thead><tbody className="divide-y divide-slate-200">{state.items.map((invocation) => <tr key={invocation.invocationId} className="hover:bg-slate-50"><td className="px-5 py-4 font-medium text-slate-950">{invocation.capability}<p className="mt-1 font-mono text-xs text-slate-500">{invocation.runtimeType}</p></td><td className="px-5 py-4 font-mono text-xs text-slate-600">{invocation.connectionId}</td><td className="px-5 py-4"><StatusBadge tone={invocation.status === 'completed' ? 'ready' : invocation.status === 'failed' ? 'offline' : 'pending'}>{invocation.status}</StatusBadge></td><td className="px-5 py-4 text-slate-700">{formatDuration(invocation.durationMs)}</td><td className="px-5 py-4 text-xs text-slate-600">{formatDate(invocation.createdAt)}</td><td className="px-5 py-4 text-right"><button type="button" onClick={() => inspect(invocation.invocationId)} className="inline-flex h-8 w-8 items-center justify-center text-cyan-800 hover:bg-cyan-50" title="View invocation"><Eye className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>{selected.error ? <div className="mt-6"><ErrorAlert error={selected.error} title="Could not load invocation detail" /></div> : null}{selected.loading ? <div className="mt-6"><LoadingBlock label="Loading invocation detail" /></div> : null}{selected.item ? <InvocationDetail item={selected.item} /> : null}</> : <EmptyState title="No invocations" detail="Run a connected REST capability from the Test Invocation workbench to create the first record." /> : null}
  </>;
}

function InvocationDetail({ item }) { return <Panel className="mt-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-slate-500">Invocation detail</p><p className="mt-2 font-mono text-xs text-slate-600">{item.invocationId}</p></div><StatusBadge tone={item.status === 'completed' ? 'ready' : item.status === 'failed' ? 'offline' : 'pending'}>{item.status}</StatusBadge></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><div><p className="text-sm font-semibold text-slate-950">Output</p><pre className="mt-2 max-h-96 overflow-auto border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700">{JSON.stringify(item.output, null, 2)}</pre></div><div><p className="text-sm font-semibold text-slate-950">Error</p><pre className="mt-2 max-h-96 overflow-auto border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700">{JSON.stringify(item.error, null, 2)}</pre></div></div></Panel>; }
