import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, PageHeader, SecondaryButton } from './pageChrome.jsx';

export function SelectionDecisions() {
  const { identity, partnerConfigured } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, items: [] });
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }), [identity.receivingWorkspaceId]);
  const load = useCallback(() => { if (!partnerConfigured) return setState({ loading: false, error: null, items: [] }); setState((current) => ({ ...current, loading: true, error: null })); apiClient.get(`/agent-selection/decisions?${query}`).then((data) => setState({ loading: false, error: null, items: data.items || [] })).catch((error) => setState({ loading: false, error, items: [] })); }, [partnerConfigured, query]);
  useEffect(() => load(), [load]);
  return <><PageHeader eyebrow="Immutable explainable outcomes" title="Selection Decisions" description="Review governed decisions, frozen candidate snapshots, approvals, and aggregate exclusion reasons." actions={<SecondaryButton onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</SecondaryButton>} />{state.error ? <ErrorAlert error={state.error} title="Decision request failed" /> : null}{state.loading ? <LoadingBlock label="Loading selection decisions" /> : null}{state.items.length ? <div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[940px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Capability</th><th>Selected agent</th><th>Score</th><th>Status</th><th>Policy</th><th>Trace</th><th>Created</th><th>Action</th></tr></thead><tbody className="divide-y">{state.items.map((item) => <tr key={item.decisionId}><td className="px-4 py-3 font-mono text-xs">{item.requestedCapability}<p>{item.requestedOperation}</p></td><td>{item.selectedCandidate?.agentName || item.selectedCandidate?.passportId || '-'}</td><td>{item.selectedCandidate?.score ?? '-'}</td><td><StatusBadge tone={item.decisionStatus === 'selected' ? 'ready' : item.decisionStatus === 'rejected' ? 'error' : 'pending'}>{item.decisionStatus}</StatusBadge></td><td>v{item.selectionPolicyVersion}</td><td className="max-w-40 truncate font-mono text-xs">{item.traceId}</td><td className="text-xs">{formatDate(item.createdAt)}</td><td><Link to={`/selection-decisions/${item.decisionId}`} className="font-medium text-cyan-800">Open</Link></td></tr>)}</tbody></table></div> : !state.loading ? <EmptyState title="No selection decisions" detail="Evaluate a selection or start a governed-selection orchestration run." /> : null}</>;
}
