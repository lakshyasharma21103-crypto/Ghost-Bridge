import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, PageHeader, Panel } from './pageChrome.jsx';

export function AgentDetail() {
  const { connectionId } = useParams();
  const { identity, partnerConfigured } = useAppState();
  const [state, setState] = useState({ loading: true, error: null, item: null });
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }), [identity.receivingWorkspaceId]);
  useEffect(() => {
    if (!partnerConfigured) return setState({ loading: false, error: null, item: null });
    apiClient.get(`/agent-discovery/agents/${connectionId}?${query}`).then((item) => setState({ loading: false, error: null, item })).catch((error) => setState({ loading: false, error, item: null }));
  }, [connectionId, partnerConfigured, query]);
  if (state.loading) return <LoadingBlock label="Loading installed agent" />;
  const agent = state.item;
  return <><PageHeader eyebrow="Safe installed-agent detail" title={agent?.agentName || 'Agent unavailable'} description={agent ? `${agent.publisherName} · passport ${agent.passportVersion}` : ''} actions={<Link to="/agent-discovery" className="text-sm font-medium text-cyan-800">Back to discovery</Link>} />{state.error ? <ErrorAlert error={state.error} title="Agent request failed" /> : null}{agent ? <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]"><Panel><dl className="grid grid-cols-2 gap-4 text-sm"><dt className="text-slate-500">Trust</dt><dd><StatusBadge tone={agent.trustTier.includes('verified') ? 'ready' : 'pending'}>{agent.trustTier}</StatusBadge></dd><dt className="text-slate-500">Verification</dt><dd>{agent.verificationStatus}</dd><dt className="text-slate-500">Connection</dt><dd>{agent.connectionStatus}</dd><dt className="text-slate-500">Health</dt><dd>{agent.healthStatus}{agent.healthSnapshotStale ? ' (stale)' : ''}</dd><dt className="text-slate-500">Readiness</dt><dd>{agent.readinessStatus}</dd><dt className="text-slate-500">Residency</dt><dd>{agent.residencyRegions.join(', ') || '-'}</dd><dt className="text-slate-500">Cost / latency</dt><dd>{agent.estimatedCostClass} / {agent.estimatedLatencyClass}</dd><dt className="text-slate-500">Snapshot</dt><dd>{formatDate(agent.healthSnapshotAt)}</dd></dl></Panel><div className="space-y-4">{agent.capabilities.map((capability) => <Panel key={capability.capabilityKey}><div className="flex justify-between gap-4"><div><h2 className="font-semibold">{capability.displayName}</h2><p className="mt-1 text-sm text-slate-600">{capability.description}</p></div><span className="font-mono text-xs">{capability.capabilityKey}@{capability.semanticVersion}</span></div><p className="mt-4 text-xs font-semibold uppercase text-slate-500">Operations</p><p className="mt-1 font-mono text-sm">{capability.operationKeys.join(', ')}</p><div className="mt-4 grid gap-4 lg:grid-cols-2"><pre className="overflow-auto bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(capability.inputSchema, null, 2)}</pre><pre className="overflow-auto bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(capability.outputSchema, null, 2)}</pre></div></Panel>)}</div></div> : null}</>;
}
