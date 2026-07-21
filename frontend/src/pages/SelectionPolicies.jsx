import { Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { JsonEditor } from '../components/JsonEditor.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, PageHeader, Panel, PrimaryButton, SecondaryButton } from './pageChrome.jsx';

const starter = JSON.stringify({ name: 'Verified healthy agents', description: 'Deterministic workspace default.', capabilityRequirements: [], minimumTrustTier: 'registered', requiredVerificationStatuses: ['passport_validated'], allowedDataClassifications: ['public', 'internal'], maximumCostClass: 'high', maximumLatencyClass: 'slow', requireHealthy: true, requireReady: true, allowOpenCircuit: false, allowRateLimitedCandidate: false, allowUncertainSchemaCompatibility: false, fallbackCandidateCount: 3, scoreWeights: { schemaCompatibility: 25, trust: 20, health: 10, readiness: 10, latency: 10, cost: 10, publisherVerification: 5, administrativePreference: 5, recentReliability: 5 } }, null, 2);

export function SelectionPolicies() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, items: [] });
  const [draft, setDraft] = useState(starter);
  const [busy, setBusy] = useState(false);
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }), [identity.receivingWorkspaceId]);
  const load = useCallback(() => {
    if (!partnerConfigured) return setState({ loading: false, error: null, items: [] });
    setState((current) => ({ ...current, loading: true, error: null }));
    apiClient.get(`/agent-selection/policies?${query}`).then((data) => setState({ loading: false, error: null, items: data.items || [] })).catch((error) => setState({ loading: false, error, items: [] }));
  }, [partnerConfigured, query]);
  useEffect(() => load(), [load]);
  async function create(event) {
    event.preventDefault(); setBusy(true);
    try { const item = await apiClient.post('/agent-selection/policies', { ...JSON.parse(draft), workspaceId: identity.receivingWorkspaceId }); recordEvent('Selection policy created', `${item.name} v${item.version}`, 'success'); load(); }
    catch (error) { setState((current) => ({ ...current, error })); }
    finally { setBusy(false); }
  }
  return <><PageHeader eyebrow="Versioned agent governance" title="Selection Policies" description="Mandatory eligibility constraints are applied before fixed-precision scoring and deterministic tie breaking." actions={<SecondaryButton onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</SecondaryButton>} />{state.error ? <ErrorAlert error={state.error} title="Selection policy request failed" /> : null}<div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]"><div>{state.loading ? <LoadingBlock label="Loading selection policies" /> : null}{state.items.length ? <div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Policy</th><th>Version</th><th>Status</th><th>Trust</th><th>Cost</th><th>Updated</th><th>Action</th></tr></thead><tbody className="divide-y">{state.items.map((policy) => <tr key={policy.policyId}><td className="px-4 py-3 font-medium">{policy.name}<p className="text-xs text-slate-500">{policy.description}</p></td><td>v{policy.version}</td><td><StatusBadge tone={policy.status === 'active' ? 'ready' : 'pending'}>{policy.status}</StatusBadge></td><td>{policy.minimumTrustTier}</td><td>{policy.maximumCostClass}</td><td className="text-xs">{formatDate(policy.updatedAt)}</td><td><Link to={`/selection-policies/${policy.policyId}`} className="font-medium text-cyan-800">Open</Link></td></tr>)}</tbody></table></div> : !state.loading ? <EmptyState title="No selection policies" detail="Create and activate a bounded policy before using governed orchestration targeting." /> : null}</div><Panel><h2 className="font-semibold">Create policy draft</h2><form className="mt-4 space-y-4" onSubmit={create}><JsonEditor label="Policy JSON" value={draft} onChange={setDraft} rows={24} hint="Only fixed fields and integer score weights are accepted; expressions are rejected." /><PrimaryButton type="submit" className="w-full" disabled={busy}><Plus className="h-4 w-4" /> Create draft</PrimaryButton></form></Panel></div></>;
}
