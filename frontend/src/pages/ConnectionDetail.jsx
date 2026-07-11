import { Activity, ArrowRight, HeartPulse, KeyRound, Play, RefreshCw, Wrench } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, formatDuration, PageHeader, Panel, PrimaryButton, SecondaryButton } from './pageChrome.jsx';

export function ConnectionDetail() {
  const { connectionId } = useParams();
  const { identity, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: true, error: null, connection: null, invocations: [] });
  const [health, setHealth] = useState(null);
  const [showCredential, setShowCredential] = useState(false);
  const [credential, setCredential] = useState({ type: 'api_key', value: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    Promise.all([
      apiClient.get(`/connections/${connectionId}?${new URLSearchParams(identity)}`),
      apiClient.get(`/invocations?${new URLSearchParams(identity)}`),
    ])
      .then(([connection, invocations]) => setState({ loading: false, error: null, connection, invocations: invocations.items.filter((item) => item.connectionId === connectionId) }))
      .catch((error) => setState({ loading: false, error, connection: null, invocations: [] }));
  }, [connectionId, identity.receivingWorkspaceId, identity.receivingUserId]);
  useEffect(() => { load(); }, [load]);

  async function addCredential(event) {
    event.preventDefault();
    try {
      setBusy(true);
      const credentialPayload = credential.type === 'api_key' ? { apiKey: credential.value } : { accessToken: credential.value };
      await apiClient.post(`/connections/${connectionId}/credentials`, { ...identity, type: credential.type, credential: credentialPayload });
      setCredential({ type: 'api_key', value: '' }); setShowCredential(false);
      recordEvent('Connection credential stored', state.connection.agent.name, 'ready');
      load();
    } catch (error) { setState((current) => ({ ...current, error })); } finally { setBusy(false); }
  }

  async function checkHealth() {
    try {
      setBusy(true); setHealth(null);
      const data = await apiClient.post(`/connections/${connectionId}/health`, identity);
      setHealth(data.health);
      recordEvent('Connection health checked', `${state.connection.agent.name} / ${data.health.healthy ? 'healthy' : 'unhealthy'}`, data.health.healthy ? 'ready' : 'offline');
      load();
    } catch (error) { setState((current) => ({ ...current, error })); } finally { setBusy(false); }
  }

  async function importMcpTools() {
    try {
      setBusy(true);
      const data = await apiClient.post(`/connections/${connectionId}/import-mcp-tools`, identity);
      recordEvent('MCP tools imported', `${data.importedCount} tools`, 'ready');
      load();
    } catch (error) { setState((current) => ({ ...current, error })); } finally { setBusy(false); }
  }

  return <>
    <PageHeader eyebrow="Receiving connection" title={state.connection?.agent.name || 'Connection detail'} description={state.connection ? `${state.connection.agent.provider} / ${connectionId}` : 'Inspect the safe passport snapshot, credential state, health, and invocation activity.'} actions={<div className="flex flex-wrap gap-3"><SecondaryButton onClick={load} disabled={state.loading || busy}><RefreshCw className="h-4 w-4" />Refresh</SecondaryButton>{state.connection?.status === 'connected' ? <Link to={`/invoke/test?connectionId=${connectionId}`} className="inline-flex min-h-10 items-center gap-2 bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"><Play className="h-4 w-4" />Test Invocation</Link> : null}</div>} />
    {state.error ? <div className="mb-6"><ErrorAlert error={state.error} title="Connection action failed" /></div> : null}
    {state.loading ? <LoadingBlock label="Loading connection" /> : null}
    {state.connection ? <ConnectionContent connection={state.connection} invocations={state.invocations} health={health} busy={busy} showCredential={showCredential} setShowCredential={setShowCredential} credential={credential} setCredential={setCredential} addCredential={addCredential} checkHealth={checkHealth} importMcpTools={importMcpTools} /> : null}
  </>;
}

function ConnectionContent({ connection, invocations, health, busy, showCredential, setShowCredential, credential, setCredential, addCredential, checkHealth, importMcpTools }) {
  const mcpLimited = connection.runtime.type === 'mcp' && connection.runtime.availability === 'limited';
  return <div className="space-y-6"><div className="border border-slate-200 bg-white px-5 py-4"><div className="flex flex-wrap items-center gap-3"><StatusBadge tone={connection.status === 'connected' ? 'ready' : connection.status === 'pending_auth' ? 'pending' : 'neutral'}>{connection.status}</StatusBadge><StatusBadge tone={connection.runtime.availability === 'limited' ? 'limited' : 'info'}>{connection.runtime.type.toUpperCase()} / {connection.runtime.availability}</StatusBadge><StatusBadge tone={connection.auth.credentialConfigured ? 'ready' : 'pending'}>{connection.auth.credentialConfigured ? 'credential configured' : 'credential missing'}</StatusBadge><span className="text-sm text-slate-500">Health: {connection.lastHealthStatus || 'not checked'}</span></div></div>
    <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><Panel><h2 className="text-base font-semibold text-slate-950">Agent snapshot</h2><p className="mt-2 text-sm leading-6 text-slate-600">{connection.agent.description}</p><dl className="mt-5 grid gap-5 sm:grid-cols-2"><Info label="Provider" value={connection.agent.provider} /><Info label="Install scope" value={connection.installScope} /><Info label="Runtime" value={connection.runtime.type} /><Info label="Auth" value={connection.auth.type} /></dl></Panel><Panel><h2 className="text-base font-semibold text-slate-950">Connection controls</h2><div className="mt-5 flex flex-col gap-3"><SecondaryButton onClick={checkHealth} disabled={busy}><HeartPulse className="h-4 w-4" />Check Health</SecondaryButton>{connection.status === 'pending_auth' ? <SecondaryButton onClick={() => setShowCredential((current) => !current)} disabled={busy}><KeyRound className="h-4 w-4" />Add Credential</SecondaryButton> : null}{connection.runtime.type === 'mcp' ? <SecondaryButton onClick={importMcpTools} disabled={busy}><Wrench className="h-4 w-4" />Import MCP Tools</SecondaryButton> : null}</div>{health ? <div className="mt-5 border-l-2 border-cyan-600 bg-cyan-50 px-4 py-3 text-sm"><p className="font-medium text-slate-950">{health.healthy ? 'Runtime healthy' : 'Runtime unhealthy'}</p><p className="mt-1 text-slate-700">Remote status {health.remoteStatus} / {formatDate(health.checkedAt)}</p></div> : null}{mcpLimited ? <div className="mt-5 border-l-2 border-violet-500 bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-950">MCP is represented in the gateway, but remote MCP transport and tool import are not enabled in this deployment.</div> : null}</Panel></div>
    {showCredential ? <Panel><form onSubmit={addCredential}><h2 className="text-base font-semibold text-slate-950">Add runtime credential</h2><p className="mt-1 text-sm text-slate-600">The value is sent directly to the gateway for encryption and is never returned.</p><div className="mt-5 grid gap-4 sm:grid-cols-[.45fr_1fr_auto]"><label><span className="sr-only">Credential type</span><select value={credential.type} onChange={(event) => setCredential((current) => ({ ...current, type: event.target.value }))} className="h-10 w-full border border-slate-300 bg-white px-3 text-sm"><option value="api_key">API key</option><option value="bearer_token">Bearer token</option></select></label><label><span className="sr-only">Credential value</span><input type="password" value={credential.value} onChange={(event) => setCredential((current) => ({ ...current, value: event.target.value }))} autoComplete="new-password" placeholder={credential.type === 'api_key' ? 'API key' : 'Bearer token'} className="h-10 w-full border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" /></label><PrimaryButton type="submit" disabled={!credential.value || busy}>Store credential</PrimaryButton></div></form></Panel> : null}
    <Panel><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold text-slate-950">Capabilities</h2><p className="mt-1 text-sm text-slate-600">Imported from the resolved Agent Passport.</p></div><Link to={`/invoke/test?connectionId=${connection.connectionId}`} className="text-sm font-medium text-cyan-800 hover:text-cyan-950">Open workbench <ArrowRight className="inline h-4 w-4" /></Link></div><div className="mt-5 divide-y divide-slate-200">{connection.capabilities.map((capability) => <div key={capability.name} className="py-4 first:pt-0"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium text-slate-950">{capability.name}</p><p className="mt-1 text-sm text-slate-600">{capability.description}</p></div><StatusBadge tone={capability.riskLevel === 'high' ? 'offline' : capability.riskLevel === 'medium' ? 'pending' : 'ready'}>{capability.riskLevel} risk</StatusBadge></div></div>)}</div></Panel>
    <Panel><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold text-slate-950">Recent invocations</h2><p className="mt-1 text-sm text-slate-600">Gateway records for this connection.</p></div><Link to="/invocations" className="text-sm font-medium text-cyan-800 hover:text-cyan-950">View all</Link></div>{invocations.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="pb-3">Capability</th><th className="pb-3">Status</th><th className="pb-3">Duration</th><th className="pb-3">Created</th></tr></thead><tbody className="divide-y divide-slate-200">{invocations.slice(0, 6).map((item) => <tr key={item.invocationId}><td className="py-3 font-medium text-slate-900">{item.capability}</td><td className="py-3"><StatusBadge tone={item.status === 'completed' ? 'ready' : item.status === 'failed' ? 'offline' : 'pending'}>{item.status}</StatusBadge></td><td className="py-3 text-slate-600">{formatDuration(item.durationMs)}</td><td className="py-3 text-xs text-slate-600">{formatDate(item.createdAt)}</td></tr>)}</tbody></table></div> : <div className="mt-5 border-t border-slate-200 pt-5 text-sm text-slate-600"><Activity className="mr-2 inline h-4 w-4 text-slate-400" />No invocations recorded for this connection.</div>}</Panel>
  </div>;
}

function Info({ label, value }) { return <div><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-800">{value || '-'}</dd></div>; }
