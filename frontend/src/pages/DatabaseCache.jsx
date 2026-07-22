import { RefreshCw, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { DataPerformanceNav } from '../components/DataPerformanceNav.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { MetricCard, PageHeader, Panel, PrimaryButton, SecondaryButton } from './pageChrome.jsx';

const initialPolicy = {
  name: 'Workspace performance policy',
  maximumPageSize: 100,
  maximumBatchSize: 100,
  maximumQueryExecutionMs: 3000,
  maximumAggregationExecutionMs: 5000,
  maximumAggregationStages: 8,
  maximumLookupStages: 1,
  maximumDocumentBytes: 8388608,
  maximumCacheValueBytes: 524288,
  querySamplingRateBasisPoints: 100,
  slowQueryThresholdMs: 500,
  projectionLagThresholdMs: 60000,
  connectionPoolCategory: 'standard',
  timeoutProfile: 'standard',
  cacheEnabled: true,
  allowedCacheNamespaces: null,
  staleWhileRevalidateNamespaces: null,
  negativeCacheNamespaces: null,
  namespaceTtlOverrides: {},
};

export function DatabaseCache() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, database: {}, cache: {}, namespaces: [], policies: [] });
  const [policy, setPolicy] = useState(initialPolicy);
  const [busy, setBusy] = useState(false);
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }), [identity.receivingWorkspaceId]);
  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [database, cache, namespaces, policies] = await Promise.all([
        apiClient.get(`/data-performance/database?${query}`),
        apiClient.get(`/data-performance/cache?${query}`),
        apiClient.get(`/data-performance/cache/namespaces?${query}`),
        apiClient.get(`/data-performance/policies?${query}`),
      ]);
      const namespaceItems = namespaces.items || [];
      setState({ loading: false, error: null, database, cache, namespaces: namespaceItems, policies: policies.items || [] });
      setPolicy((current) => current.allowedCacheNamespaces ? current : ({
        ...current,
        allowedCacheNamespaces: namespaceItems.filter((entry) => entry.enabled).map((entry) => entry.namespace),
        staleWhileRevalidateNamespaces: namespaceItems.filter((entry) => entry.staleReadAllowance === 'bounded').map((entry) => entry.namespace),
        negativeCacheNamespaces: namespaceItems.filter((entry) => entry.negativeCachePolicy !== 'none').map((entry) => entry.namespace),
      }));
    } catch (error) { setState((current) => ({ ...current, loading: false, error })); }
  }, [partnerConfigured, query]);
  useEffect(() => { void load(); }, [load]);

  async function createPolicy() {
    setBusy(true);
    try {
      await apiClient.post('/data-performance/policies', {
        ...policy,
        scope: 'workspace',
        workspaceId: identity.receivingWorkspaceId,
        maximumResultBytes: 2097152,
        highDocumentsExaminedRatioThreshold: 100,
        distributedCacheEnabled: false,
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      recordEvent('Performance policy draft created', identity.receivingWorkspaceId, 'success');
      await load();
    } catch (error) { setState((current) => ({ ...current, error })); } finally { setBusy(false); }
  }

  function toggleNamespace(field, namespace, checked) {
    setPolicy((current) => {
      const next = {
        ...current,
        [field]: checked ? [...new Set([...(current[field] || []), namespace])] : (current[field] || []).filter((item) => item !== namespace),
      };
      if (field === 'allowedCacheNamespaces' && !checked) {
        next.staleWhileRevalidateNamespaces = (current.staleWhileRevalidateNamespaces || []).filter((item) => item !== namespace);
        next.negativeCacheNamespaces = (current.negativeCacheNamespaces || []).filter((item) => item !== namespace);
        next.namespaceTtlOverrides = { ...current.namespaceTtlOverrides };
        delete next.namespaceTtlOverrides[namespace];
      }
      return next;
    });
  }

  function setTtl(namespace, value) {
    setPolicy((current) => {
      const namespaceTtlOverrides = { ...current.namespaceTtlOverrides };
      if (value) namespaceTtlOverrides[namespace] = Number(value);
      else delete namespaceTtlOverrides[namespace];
      return { ...current, namespaceTtlOverrides };
    });
  }

  const { database, cache } = state;
  return (
    <>
      <PageHeader eyebrow="Operations / Data access" title="Database & Cache" description="Safe health categories, governed namespaces, bounded caching, and versioned performance policy." actions={<SecondaryButton onClick={load} disabled={state.loading}><RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />Refresh</SecondaryButton>} />
      <DataPerformanceNav />
      {state.error ? <ErrorAlert error={state.error} title="Data-access request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading database and cache health" /> : null}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Database" value={database.status || 'unknown'} detail={`Pool ${database.poolUsageCategory || 'unknown'}`} tone={database.status === 'healthy' ? 'emerald' : 'coral'} />
        <MetricCard label="Pool wait" value={database.poolWaitCategory || 'none'} detail={`Latency ${database.queryLatencyCategory || 'unknown'}`} />
        <MetricCard label="Cache adapter" value={cache.adapterType || 'unknown'} detail={cache.status || 'unknown'} tone="cyan" />
        <MetricCard label="Cache hit rate" value={cache.hitRateCategory || 'none'} detail={`Miss ${cache.missRateCategory || 'none'}`} />
        <MetricCard label="Invalidation lag" value={cache.invalidationLagCategory || 'none'} detail={`Contention ${cache.refreshContentionCategory || 'low'}`} />
      </div>
      <Panel className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-semibold text-slate-950">Cache namespaces</h2><p className="mt-1 text-xs text-slate-500">Values are intentionally never displayed.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-4 py-3">Namespace</th><th>Enabled</th><th>Adapter</th><th>TTL</th><th>Hit</th><th>Miss</th><th>Entries</th><th>Invalidation lag</th><th>Stale reads</th></tr></thead><tbody className="divide-y divide-slate-200">{state.namespaces.map((item) => <tr key={item.namespace}><td className="px-4 py-3 font-medium text-slate-900">{item.namespace}</td><td><StatusBadge status={item.enabled ? 'enabled' : 'disabled'} /></td><td>{item.adapter}</td><td>{item.defaultTtlMs} ms</td><td>{item.hitRateCategory}</td><td>{item.missRateCategory}</td><td>{item.entryCategory}</td><td>{item.invalidationLagCategory}</td><td>{item.staleReadAllowance}</td></tr>)}</tbody></table></div>
      </Panel>
      <Panel className="mt-5">
        <div className="mb-4"><h2 className="text-sm font-semibold text-slate-950">Performance policy editor</h2><p className="mt-1 text-xs text-slate-500">Creates a draft; validation and activation remain separate governed actions.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(policy).filter(([, value]) => typeof value === 'number' || typeof value === 'string').map(([key, value]) => <label key={key} className="text-xs font-medium text-slate-700">{key.replace(/([A-Z])/g, ' $1')}<input className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm" type={typeof value === 'number' ? 'number' : 'text'} value={value} onChange={(event) => setPolicy((current) => ({ ...current, [key]: typeof value === 'number' ? Number(event.target.value) : event.target.value }))} /></label>)}
        </div>
        <label className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-700"><input type="checkbox" checked={policy.cacheEnabled} onChange={(event) => setPolicy((current) => ({ ...current, cacheEnabled: event.target.checked }))} />Cache enablement</label>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-3 py-2">Namespace</th><th>Enabled</th><th>TTL override (ms)</th><th>Stale read</th><th>Negative cache</th></tr></thead><tbody>{state.namespaces.map((item) => { const enabled = (policy.allowedCacheNamespaces || []).includes(item.namespace); return <tr key={`policy-${item.namespace}`} className="border-t border-slate-200"><td className="px-3 py-2 font-medium">{item.namespace}</td><td><input aria-label={`Enable ${item.namespace}`} type="checkbox" checked={enabled} onChange={(event) => toggleNamespace('allowedCacheNamespaces', item.namespace, event.target.checked)} /></td><td><input aria-label={`TTL for ${item.namespace}`} className="w-32 border border-slate-300 px-2 py-1" type="number" min="1000" max={item.maximumTtlMs} placeholder={String(item.defaultTtlMs)} value={policy.namespaceTtlOverrides[item.namespace] || ''} disabled={!enabled} onChange={(event) => setTtl(item.namespace, event.target.value)} /></td><td><input aria-label={`Allow stale ${item.namespace}`} type="checkbox" disabled={!enabled || item.staleReadAllowance !== 'bounded'} checked={(policy.staleWhileRevalidateNamespaces || []).includes(item.namespace)} onChange={(event) => toggleNamespace('staleWhileRevalidateNamespaces', item.namespace, event.target.checked)} /></td><td><input aria-label={`Allow negative ${item.namespace}`} type="checkbox" disabled={!enabled || item.negativeCachePolicy === 'none'} checked={(policy.negativeCacheNamespaces || []).includes(item.namespace)} onChange={(event) => toggleNamespace('negativeCacheNamespaces', item.namespace, event.target.checked)} /></td></tr>; })}</tbody></table></div>
        <div className="mt-4"><PrimaryButton onClick={createPolicy} disabled={busy || !partnerConfigured}><Save className="h-4 w-4" />Create draft</PrimaryButton></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-3 py-2">Name</th><th>Version</th><th>Status</th><th>Page</th><th>Batch</th><th>Slow threshold</th><th>Pool</th></tr></thead><tbody>{state.policies.map((item) => <tr key={item.id} className="border-t border-slate-200"><td className="px-3 py-2 font-medium">{item.name}</td><td>v{item.version}</td><td><StatusBadge status={item.status} /></td><td>{item.maximumPageSize}</td><td>{item.maximumBatchSize}</td><td>{item.slowQueryThresholdMs} ms</td><td>{item.connectionPoolCategory}</td></tr>)}</tbody></table></div>
      </Panel>
    </>
  );
}
