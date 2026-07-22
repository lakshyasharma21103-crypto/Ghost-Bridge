import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { DataPerformanceNav } from '../components/DataPerformanceNav.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PageHeader, Panel, SecondaryButton } from './pageChrome.jsx';

export function QueryPerformance() {
  const { identity, partnerConfigured } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, shapes: [], samples: [] });
  const [plans, setPlans] = useState({});
  const [explaining, setExplaining] = useState('');
  const [filters, setFilters] = useState({ queryShapeId: '', operationType: '', status: '' });
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) }), [filters, identity.receivingWorkspaceId]);
  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try { const [shapes, samples] = await Promise.all([apiClient.get(`/data-performance/query-shapes?workspaceId=${encodeURIComponent(identity.receivingWorkspaceId)}`), apiClient.get(`/data-performance/query-samples?${query}`)]); setState({ loading: false, error: null, shapes: shapes.items || [], samples: samples.items || [] }); }
    catch (error) { setState((current) => ({ ...current, loading: false, error })); }
  }, [identity.receivingWorkspaceId, partnerConfigured, query]);
  useEffect(() => { void load(); }, [load]);

  async function explain(shape) {
    setExplaining(shape.queryShapeId);
    try {
      const result = await apiClient.post(`/data-performance/query-shapes/${encodeURIComponent(shape.queryShapeId)}/explain`, { workspaceId: identity.receivingWorkspaceId });
      setPlans((current) => ({ ...current, [shape.queryShapeId]: result }));
    } catch (error) { setState((current) => ({ ...current, error })); } finally { setExplaining(''); }
  }

  return <><PageHeader eyebrow="Operations / Data access" title="Query Performance" description="Redacted query-shape diagnostics with bounded categories and no raw filters." actions={<SecondaryButton onClick={load}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>} /><DataPerformanceNav />{state.error ? <ErrorAlert error={state.error} title="Query diagnostics failed" /> : null}{state.loading ? <LoadingBlock label="Loading query diagnostics" /> : null}<Panel className="mb-5"><div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-medium">Query shape<select className="mt-1 w-full border border-slate-300 px-3 py-2" value={filters.queryShapeId} onChange={(event) => setFilters((current) => ({ ...current, queryShapeId: event.target.value }))}><option value="">All registered shapes</option>{state.shapes.map((shape) => <option key={shape.queryShapeId}>{shape.queryShapeId}</option>)}</select></label><label className="text-xs font-medium">Operation<select className="mt-1 w-full border border-slate-300 px-3 py-2" value={filters.operationType} onChange={(event) => setFilters((current) => ({ ...current, operationType: event.target.value }))}><option value="">All operations</option><option>find_one</option><option>find_many</option><option>aggregate</option><option>find_one_and_update</option></select></label><label className="text-xs font-medium">Status<select className="mt-1 w-full border border-slate-300 px-3 py-2" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option><option value="success">Success</option><option value="failure">Failure</option></select></label></div></Panel><Panel className="mb-5 overflow-hidden p-0"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold">Registered query shapes</h2><p className="mt-1 text-xs text-slate-500">Explain returns only sanitized plan categories.</p></div><div className="max-h-72 overflow-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Shape</th><th>Consistency</th><th>Expected indexes</th><th>Timeout</th><th>Plan</th><th>Action</th></tr></thead><tbody className="divide-y divide-slate-200">{state.shapes.map((shape) => <tr key={`shape-${shape.queryShapeId}`}><td className="px-4 py-3 font-medium">{shape.queryShapeId}</td><td>{shape.consistencyClass}</td><td>{(shape.expectedIndexNames || []).join(', ')}</td><td>{shape.maximumExecutionMs} ms</td><td>{plans[shape.queryShapeId]?.winningPlanCategory || '-'}</td><td><button className="text-cyan-700 disabled:text-slate-400" disabled={Boolean(explaining)} onClick={() => explain(shape)}>{explaining === shape.queryShapeId ? 'Inspecting...' : 'Safe explain'}</button></td></tr>)}</tbody></table></div></Panel><Panel className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Query shape</th><th>Operation</th><th>Duration</th><th>Results</th><th>Examined ratio</th><th>Index</th><th>Cache</th><th>Safe failure</th><th>Sampled</th></tr></thead><tbody className="divide-y divide-slate-200">{state.samples.map((item) => <tr key={item._id || `${item.queryShapeId}-${item.sampledAt}`}><td className="px-4 py-3 font-medium">{item.queryShapeId}</td><td>{item.operationType}</td><td>{item.durationMs} ms</td><td>{item.resultCount}</td><td>{item.examinationRatioCategory}</td><td><StatusBadge status={item.indexUsageCategory} /></td><td>{item.cacheOutcome}</td><td>{item.safeFailureCode || '-'}</td><td>{item.sampledAt ? new Date(item.sampledAt).toLocaleString() : '-'}</td></tr>)}</tbody></table>{!state.samples.length ? <p className="py-8 text-center text-sm text-slate-500">No bounded samples match these filters.</p> : null}</div></Panel></>;
}
