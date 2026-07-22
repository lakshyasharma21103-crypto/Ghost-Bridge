import { BarChart3, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { MetricCard, PageHeader, Panel, SecondaryButton, formatDate, formatDuration } from './pageChrome.jsx';

function runTone(status) {
  if (['succeeded', 'recovered'].includes(status)) return 'ready';
  if (['failed', 'cancelled', 'terminated', 'compensation_failed'].includes(status)) return 'offline';
  if (['partial_failure', 'terminated_with_accepted_risk'].includes(status)) return 'limited';
  if (['waiting_approval', 'waiting_intervention', 'recovery_pending', 'compensation_pending'].includes(status)) return 'pending';
  return 'info';
}

function sloTone(count) {
  return Number(count || 0) > 0 ? 'coral' : 'emerald';
}

export function OrchestrationAnalytics() {
  const { identity, partnerConfigured } = useAppState();
  const [state, setState] = useState({ loading: false, error: null });
  const [data, setData] = useState({ overview: {}, runs: [], alerts: [] });
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '50' }),
    [identity.receivingWorkspaceId],
  );

  const load = useCallback(async () => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null });
      setData({ overview: {}, runs: [], alerts: [] });
      return;
    }
    setState({ loading: true, error: null });
    try {
      const [overview, runs, alerts] = await Promise.all([
        apiClient.get(`/orchestrations/operations/overview?${query}`),
        apiClient.get(`/orchestrations/runs?${query}`),
        apiClient.get(`/orchestrations/alerts?${query}`),
      ]);
      setData({
        overview,
        runs: runs.items || [],
        alerts: alerts.items || [],
      });
      setState({ loading: false, error: null });
    } catch (error) {
      setState({ loading: false, error });
    }
  }, [partnerConfigured, query]);

  useEffect(() => void load(), [load]);

  const overview = data.overview || {};
  const slo = overview.sloStatus || {};
  const queues = overview.queues || [];
  const hotQueues = queues
    .filter((queue) => Number(queue.depth || 0) || Number(queue.oldestItemAgeMs || 0))
    .sort((left, right) => Number(right.oldestItemAgeMs || 0) - Number(left.oldestItemAgeMs || 0))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="Orchestration analytics"
        title="Operational analytics"
        description="Outcome trends, queue pressure, SLO posture, alert volume, and recent run history for orchestration operators."
        actions={
          <div className="flex gap-2">
            <Link to="/orchestrations/operations" className="inline-flex min-h-10 items-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
              <BarChart3 className="h-4 w-4" />
              Operations
            </Link>
            <SecondaryButton onClick={load} disabled={state.loading || !partnerConfigured}>
              <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
              Refresh
            </SecondaryButton>
          </div>
        }
      />
      {!partnerConfigured ? <Panel className="mb-6 border-amber-200 bg-amber-50 text-sm text-amber-950">Configure a Partner API key in Settings to view analytics.</Panel> : null}
      {state.error ? <ErrorAlert error={state.error} title="Could not load orchestration analytics" /> : null}
      {state.loading ? <LoadingBlock label="Loading orchestration analytics" /> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Running" value={overview.activeRuns ?? 0} detail={`${overview.queuedRuns ?? 0} queued`} tone="cyan" />
        <MetricCard label="Recovering" value={overview.recoveringRuns ?? 0} detail={`${overview.compensatingRuns ?? 0} compensating`} tone="slate" />
        <MetricCard label="SLO breaches" value={slo.breached ?? 0} detail={`${slo.atRisk ?? 0} at risk`} tone={sloTone(slo.breached)} />
        <MetricCard label="Alerts" value={data.alerts.length} detail={`${overview.openAlerts ?? 0} open`} tone={overview.openAlerts ? 'coral' : 'emerald'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-950">Recent runs</p>
              <p className="text-xs text-slate-500">Latest tenant-scoped executions and terminal outcomes.</p>
            </div>
            <Link to="/orchestrations/runs" className="text-sm font-medium text-cyan-800 hover:underline">Open runs</Link>
          </div>
          {data.runs.length ? (
            <div className="divide-y divide-slate-200">
              {data.runs.slice(0, 10).map((run) => (
                <Link key={run.runId} to={`/orchestrations/runs/${run.runId}`} className="flex items-center justify-between gap-4 py-3 text-sm hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-950">{run.definitionName || run.runId}</span>
                    <span className="block text-xs text-slate-500">{formatDate(run.startedAt || run.createdAt)} - {formatDuration(run.durationMs)}</span>
                  </span>
                  <StatusBadge tone={runTone(run.status)}>{run.status}</StatusBadge>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No recent runs" detail="Start an orchestration run to populate analytics." />
          )}
        </Panel>

        <Panel>
          <div className="mb-4">
            <p className="font-semibold text-slate-950">Queue hotspots</p>
            <p className="text-xs text-slate-500">Queues sorted by oldest pending work.</p>
          </div>
          {hotQueues.length ? (
            <div className="divide-y divide-slate-200">
              {hotQueues.map((queue) => (
                <div key={queue.queue} className="grid grid-cols-[1fr_auto] gap-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-950">{queue.queue}</p>
                    <p className="text-xs text-slate-500">{queue.depth} queued - {queue.retryRate} retries - {queue.failureRate} failures</p>
                  </div>
                  <p className="font-medium text-slate-700">{formatDuration(queue.oldestItemAgeMs)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No queue pressure" detail="No pending orchestration queue pressure was reported." />
          )}
        </Panel>
      </div>
    </>
  );
}
