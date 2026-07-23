import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { ReleaseReadinessNav } from '../components/ReleaseReadinessNav.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { MetricCard, PageHeader, Panel, SecondaryButton, formatDate } from './pageChrome.jsx';

const sections = {
  Build: ['source revision', 'test status', 'artifact integrity', 'lockfile integrity', 'SBOM'],
  Security: ['secret scan', 'environment examples', 'gitignore hygiene'],
  Configuration: ['production profile', 'startup validation', 'configuration drift'],
  Database: ['migration readiness', 'index readiness', 'projection compatibility'],
  Compatibility: ['mixed-version safety', 'routing version', 'cache serialization'],
  Runtime: ['health', 'readiness', 'graceful shutdown', 'worker drain', 'queue safety'],
  Performance: ['performance baseline', 'capacity plan', 'minimum headroom'],
  Resilience: ['backup freshness', 'restore verification', 'DR readiness', 'regional sequencing'],
  Observability: ['SLO readiness', 'alert readiness', 'observation window'],
  Operations: ['ownership', 'runbooks', 'incident response', 'rollback', 'roll-forward'],
  Approvals: ['release approval', 'manual gates', 'waivers', 'release freeze'],
};

export function ReleaseReadiness() {
  const { identity, partnerConfigured } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, data: {} });
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }),
    [identity.receivingWorkspaceId],
  );
  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      setState({ loading: false, error: null, data: await apiClient.get(`/releases/readiness?${query}`) });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, query]);
  useEffect(() => void load(), [load]);
  const candidate = state.data.candidate || {};
  const cards = [
    ['Release readiness', state.data.state || 'unknown'],
    ['Source revision', candidate.sourceRevision ? `${candidate.sourceRevision.slice(0, 12)}…` : 'unknown'],
    ['Test status', candidate.testSummary?.status || 'unknown'],
    ['Secret scan', candidate.securitySummary?.status || 'unknown'],
    ['Compatibility', candidate.readinessSummary?.status || 'unknown'],
    ['Migration readiness', candidate.migrationSummary?.status || 'unknown'],
    ['Performance readiness', 'evidence required'],
    ['Capacity readiness', 'evidence required'],
    ['DR readiness', 'evidence required'],
    ['SLO readiness', 'evidence required'],
    ['Rollback readiness', candidate.migrationSummary?.status === 'passed' ? 'ready' : 'unknown'],
    ['Manual gates', `${state.data.manualGates?.length || 0} recorded`],
  ];
  return (
    <>
      <PageHeader
        eyebrow="Operations / Production release"
        title="Release Readiness"
        description="Deterministic release evidence, compatibility, operational gates, and an explicit manual production boundary."
        actions={<SecondaryButton onClick={load}><RefreshCw className="h-4 w-4" />Refresh</SecondaryButton>}
      />
      <ReleaseReadinessNav />
      {state.error ? <ErrorAlert error={state.error} title="Release readiness request failed" /> : null}
      {state.loading ? <LoadingBlock label="Evaluating release readiness" /> : null}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value], index) => (
          <MetricCard key={label} label={label} value={value} tone={index === 0 ? 'cyan' : 'slate'} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Object.entries(sections).map(([name, checks]) => (
          <Panel key={name}>
            <h2 className="text-sm font-semibold text-slate-950">{name}</h2>
            <div className="mt-3 divide-y divide-slate-100">
              {checks.map((check) => (
                <div key={check} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <span className="text-slate-700">{check}</span>
                  <StatusBadge tone="pending">evidence required</StatusBadge>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Evidence generated {formatDate(state.data.generatedAt)}. Production deployment, smoke
        tests, live Gemini verification, external flows, and heavy performance tests remain manual.
      </p>
    </>
  );
}
