import { Pause, Play, RefreshCw, ShieldAlert, Workflow } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { MetricCard, PageHeader, Panel, PrimaryButton, SecondaryButton, formatDuration } from './pageChrome.jsx';

function tone(status) {
  if (['healthy', 'ready'].includes(status)) return 'ready';
  if (['degraded', 'draining', 'stuck'].includes(status)) return 'pending';
  if (['unavailable', 'failed'].includes(status)) return 'offline';
  return 'neutral';
}

function QueueTable({ queues }) {
  if (!queues.length) return <EmptyState title="No queues" detail="No orchestration queue data is available." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Queue</th>
            <th>Depth</th>
            <th>Oldest</th>
            <th>Completed</th>
            <th>Retries</th>
            <th>Expired leases</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {queues.map((queue) => (
            <tr key={queue.queue} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-950">{queue.queue}</td>
              <td>{queue.depth}</td>
              <td>{formatDuration(queue.oldestItemAgeMs)}</td>
              <td>{queue.completionRate}</td>
              <td>{queue.retryRate}</td>
              <td>{queue.expiredLeaseCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OrchestrationOperations() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, overview: null });
  const [busy, setBusy] = useState('');
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }),
    [identity.receivingWorkspaceId],
  );

  const load = useCallback(() => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null, overview: null });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    apiClient
      .get(`/orchestrations/operations/overview?${query}`)
      .then((overview) => setState({ loading: false, error: null, overview }))
      .catch((error) => setState({ loading: false, error, overview: null }));
  }, [partnerConfigured, query]);

  useEffect(() => load(), [load]);

  async function control(key, path, label) {
    setBusy(key);
    try {
      await apiClient.post(path, {
        workspaceId: identity.receivingWorkspaceId,
        reason: `Console ${label}`,
      });
      recordEvent('Orchestration control completed', label, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  const overview = state.overview || {};
  const workerHealth = overview.workerHealth || {};
  const queues = overview.queues || [];

  return (
    <>
      <PageHeader
        eyebrow="Orchestration operations"
        title="Operations control"
        description="Run health, worker readiness, queue pressure, active waits, and guarded fleet controls for the selected workspace."
        actions={
          <div className="flex gap-2">
            <Link to="/orchestrations/analytics" className="inline-flex min-h-10 items-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
              <Workflow className="h-4 w-4" />
              Analytics
            </Link>
            <SecondaryButton onClick={load} disabled={state.loading || !partnerConfigured}>
              <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
              Refresh
            </SecondaryButton>
          </div>
        }
      />
      {!partnerConfigured ? (
        <Panel className="mb-6 border-amber-200 bg-amber-50 text-sm text-amber-950">
          Configure a Partner API key in Settings to use orchestration operations.
        </Panel>
      ) : null}
      {state.error ? <ErrorAlert error={state.error} title="Orchestration operation failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading orchestration operations" /> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active runs" value={overview.activeRuns ?? 0} detail={`${overview.queuedRuns ?? 0} queued`} tone="cyan" />
        <MetricCard label="Stuck runs" value={overview.stuckRuns ?? 0} detail={`${overview.waitingApprovals ?? 0} approval waits`} tone={overview.stuckRuns ? 'coral' : 'emerald'} />
        <MetricCard label="Open alerts" value={overview.openAlerts ?? 0} detail={`${overview.activeIncidents ?? 0} active incidents`} tone={overview.openAlerts ? 'coral' : 'slate'} />
        <MetricCard label="Workers" value={workerHealth.activeWorkers ?? 0} detail={`${workerHealth.unhealthyWorkers ?? 0} unhealthy`} tone={workerHealth.unhealthyWorkers ? 'coral' : 'emerald'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.6fr)]">
        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">Queue pressure</p>
              <p className="text-xs text-slate-500">Depth, oldest item age, retries, dead letters, and expired leases.</p>
            </div>
            <StatusBadge tone={tone(workerHealth.status)}>{workerHealth.status || 'unknown'}</StatusBadge>
          </div>
          <QueueTable queues={queues} />
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <ShieldAlert className="h-5 w-5 text-cyan-700" />
            Guarded controls
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <p>Pause blocks new orchestration starts. Drain lets workers stop claiming new nodes while in-flight work settles.</p>
            <PrimaryButton className="w-full" disabled={Boolean(busy) || !partnerConfigured} onClick={() => control('pause-workspace', '/orchestrations/controls/workspace/pause', 'workspace pause')}>
              <Pause className="h-4 w-4" />
              Pause workspace
            </PrimaryButton>
            <SecondaryButton className="w-full" disabled={Boolean(busy) || !partnerConfigured} onClick={() => control('resume-workspace', '/orchestrations/controls/workspace/resume', 'workspace resume')}>
              <Play className="h-4 w-4" />
              Resume workspace
            </SecondaryButton>
            <PrimaryButton className="w-full" disabled={Boolean(busy) || !partnerConfigured} onClick={() => control('drain-workers', '/orchestrations/controls/workers/drain', 'worker drain')}>
              <Pause className="h-4 w-4" />
              Drain workers
            </PrimaryButton>
            <SecondaryButton className="w-full" disabled={Boolean(busy) || !partnerConfigured} onClick={() => control('resume-workers', '/orchestrations/controls/workers/resume', 'worker resume')}>
              <Play className="h-4 w-4" />
              Resume workers
            </SecondaryButton>
          </div>
        </Panel>
      </div>
    </>
  );
}
