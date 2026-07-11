import { Activity, FileKey, KeyRound, Link2, Plus, ScrollText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, MetricCard, PageHeader, Panel } from './pageChrome.jsx';

export function PartnerDashboard() {
  const { partnerConfigured, identity } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, data: null });

  useEffect(() => {
    if (!partnerConfigured) return;
    let active = true;
    setState({ loading: true, error: null, data: null });
    Promise.all([
      apiClient.get('/partner/agents'),
      apiClient.get(`/connections?${new URLSearchParams(identity)}`),
      apiClient.get(`/invocations?${new URLSearchParams(identity)}`),
      apiClient.get(`/audit-logs?${new URLSearchParams(identity)}`),
    ])
      .then(async ([passports, connections, invocations, auditLogs]) => {
        const details = await Promise.all(passports.items.map((item) => apiClient.get(`/partner/agents/${item.id}`)));
        if (!active) return;
        const issuedKeys = details.reduce((count, detail) => count + Object.values(detail.keyStats.counts || {}).reduce((total, value) => total + value, 0), 0);
        setState({ loading: false, error: null, data: { passports: passports.items, issuedKeys, connections: connections.items, invocations: invocations.items, auditLogs: auditLogs.items || [] } });
      })
      .catch((error) => active && setState({ loading: false, error, data: null }));
    return () => { active = false; };
  }, [partnerConfigured, identity.receivingWorkspaceId, identity.receivingUserId]);

  return (
    <>
      <PageHeader
        eyebrow="Partner company"
        title="Partner dashboard"
        description="Register agents, issue one-time install keys, and track how the current receiving workspace is using connected runtime agents."
        actions={<Link to="/passports/new" className="inline-flex min-h-10 items-center gap-2 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-800"><Plus className="h-4 w-4" />Create passport</Link>}
      />

      {!partnerConfigured ? <PartnerAccessNotice /> : null}
      {state.error ? <ErrorAlert error={state.error} title="Could not load partner dashboard" /> : null}
      {state.loading ? <LoadingBlock label="Loading partner activity" /> : null}
      {state.data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Passports" value={state.data.passports.length} detail="Registered for this partner" tone="cyan" />
            <MetricCard label="Issued keys" value={state.data.issuedKeys} detail="Across registered passports" tone="coral" />
            <MetricCard label="Active connections" value={state.data.connections.filter((item) => item.status === 'connected').length} detail="Current receiving workspace" tone="emerald" />
            <MetricCard label="Invocations" value={state.data.invocations.length} detail="Current receiving workspace" tone="slate" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <Panel>
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-sm font-semibold text-slate-950">Registered passports</p><p className="mt-1 text-sm text-slate-600">Latest partner agents and runtime readiness.</p></div>
                <Link to="/passports" className="text-sm font-medium text-cyan-800 hover:text-cyan-950">View all</Link>
              </div>
              {state.data.passports.length ? <div className="mt-5 divide-y divide-slate-200">{state.data.passports.slice(0, 5).map((passport) => <PassportRow key={passport.id} passport={passport} />)}</div> : <EmptyState title="No passports yet" detail="Create a passport to make an agent available for the install-key flow." action={<Link to="/passports/new" className="text-sm font-medium text-cyan-800">Create passport</Link>} />}
            </Panel>
            <Panel>
              <div className="flex items-center gap-2"><ScrollText className="h-4 w-4 text-cyan-700" /><p className="text-sm font-semibold text-slate-950">Recent activity</p></div>
              <div className="mt-4 space-y-4">
                {state.data.auditLogs.length ? state.data.auditLogs.slice(0, 6).map((event) => <div key={event.id} className="border-l-2 border-slate-300 pl-3"><p className="text-sm font-medium text-slate-900">{event.action}</p><p className="mt-1 text-xs text-slate-600">{event.entityType}</p><p className="mt-1 text-xs text-slate-400">{formatDate(event.createdAt)}</p></div>) : <p className="text-sm leading-6 text-slate-600">Gateway audit activity will appear here after this workspace resolves a key or invokes an agent.</p>}
              </div>
            </Panel>
          </div>
        </>
      ) : null}
    </>
  );
}

function PassportRow({ passport }) {
  return <Link to={`/passports/${passport.id}`} className="flex items-center justify-between gap-4 py-3 transition hover:bg-slate-50"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-950">{passport.agent.name}</p><p className="mt-1 text-xs text-slate-500">{passport.agent.provider} / {passport.runtime.type.toUpperCase()} / {passport.capabilitiesCount} capabilities</p></div><StatusBadge tone={passport.status === 'valid' ? 'ready' : passport.status === 'suspended' ? 'offline' : 'pending'}>{passport.status}</StatusBadge></Link>;
}

export function PartnerAccessNotice() {
  return <div className="mb-6 border-l-[3px] border-amber-500 bg-amber-50 px-5 py-4"><div className="flex items-start gap-3"><KeyRound className="mt-0.5 h-5 w-5 text-amber-700" /><div><p className="font-semibold text-slate-950">Partner API key required for this session.</p><p className="mt-1 text-sm leading-6 text-slate-700">Set a partner key in Settings to create passports, inspect key history, or issue an install key. The key is kept only in memory and is never displayed after configuration.</p><Link to="/settings" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-amber-900">Open settings <KeyRound className="h-4 w-4" /></Link></div></div></div>;
}
