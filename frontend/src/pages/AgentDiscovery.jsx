import { RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PageHeader, Panel, SecondaryButton } from './pageChrome.jsx';

const initialFilters = { capability: '', operation: '', trustTier: '', publisher: '', region: '', health: '', readiness: '', costClass: '', latencyClass: '' };

export function AgentDiscovery() {
  const { identity, partnerConfigured } = useAppState();
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [state, setState] = useState({ loading: false, error: null, items: [] });
  const query = useMemo(() => {
    const value = new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' });
    Object.entries(applied).forEach(([key, item]) => item && value.set(key, item));
    return value;
  }, [applied, identity.receivingWorkspaceId]);
  const load = useCallback(() => {
    if (!partnerConfigured) return setState({ loading: false, error: null, items: [] });
    setState((current) => ({ ...current, loading: true, error: null }));
    apiClient.get(`/agent-discovery/agents?${query}`)
      .then((data) => setState({ loading: false, error: null, items: data.items || [] }))
      .catch((error) => setState({ loading: false, error, items: [] }));
  }, [partnerConfigured, query]);
  useEffect(() => load(), [load]);
  return <>
    <PageHeader eyebrow="Governed installed-agent catalog" title="Agent Discovery" description="Search safe, workspace-scoped capabilities and cached operational signals. Discovery never calls an agent runtime." actions={<SecondaryButton onClick={load} disabled={state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} /> Refresh</SecondaryButton>} />
    {state.error ? <ErrorAlert error={state.error} title="Discovery request failed" /> : null}
    <Panel className="mb-6">
      <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-5" onSubmit={(event) => { event.preventDefault(); setApplied(filters); }}>
        {Object.keys(initialFilters).map((key) => <label key={key} className="text-xs font-medium text-slate-600"><span className="mb-1 block">{key.replace(/([A-Z])/g, ' $1')}</span><input className="min-h-10 w-full border border-slate-300 px-3 text-sm" value={filters[key]} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))} /></label>)}
        <button className="inline-flex min-h-10 items-center justify-center gap-2 self-end bg-slate-950 px-4 text-sm font-medium text-white"><Search className="h-4 w-4" /> Search</button>
      </form>
    </Panel>
    {state.loading ? <LoadingBlock label="Loading installed agents" /> : null}
    {!state.loading && state.items.length ? <div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[1200px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Agent</th><th>Publisher</th><th>Capability</th><th>Trust</th><th>Verification</th><th>Connection</th><th>Health</th><th>Cost</th><th>Latency</th><th>Region</th><th>Actions</th></tr></thead><tbody className="divide-y">{state.items.map((agent) => <tr key={agent.connectionId}><td className="px-4 py-3 font-medium">{agent.agentName}<p className="text-xs text-slate-500">v{agent.passportVersion}</p></td><td>{agent.publisherName}</td><td className="font-mono text-xs">{agent.capabilityKeys.join(', ')}</td><td><StatusBadge tone={agent.trustTier.includes('verified') ? 'ready' : 'pending'}>{agent.trustTier}</StatusBadge></td><td>{agent.verificationStatus}</td><td>{agent.connectionStatus}</td><td>{agent.healthStatus}{agent.healthSnapshotStale ? ' (stale)' : ''}</td><td>{agent.estimatedCostClass}</td><td>{agent.estimatedLatencyClass}</td><td>{agent.supportedRegions.join(', ') || '-'}</td><td><Link className="font-medium text-cyan-800 hover:underline" to={`/agent-discovery/agents/${agent.connectionId}`}>Open</Link></td></tr>)}</tbody></table></div> : null}
    {!state.loading && !state.items.length ? <EmptyState title="No visible installed agents" detail="Install and connect an Agent Passport, or adjust the bounded filters." /> : null}
  </>;
}
