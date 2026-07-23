import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { ReleaseReadinessNav } from '../components/ReleaseReadinessNav.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PageHeader, Panel } from './pageChrome.jsx';

const stages = ['preparing', 'migrating', 'deploying_canary', 'observing_canary', 'expanding', 'verifying', 'succeeded'];
const details = ['Canary percentage', 'Old and new version categories', 'Instance-version summary', 'Worker drain status', 'Queue safety status', 'Migration status', 'Health gates', 'Readiness gates', 'SLO gates', 'Performance gates', 'Observation window', 'Incident', 'Audit timeline'];

export function ReleaseRolloutDetail() {
  const { rolloutId } = useParams();
  const { identity } = useAppState();
  const [state, setState] = useState({ loading: true, error: null, item: {} });
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }), [identity.receivingWorkspaceId]);
  useEffect(() => {
    apiClient.get(`/releases/rollouts/${encodeURIComponent(rolloutId)}?${query}`).then((item) => setState({ loading: false, error: null, item })).catch((error) => setState({ loading: false, error, item: {} }));
  }, [query, rolloutId]);
  return (
    <>
      <PageHeader eyebrow="Operations / Production release" title="Rollout Detail" description="Ordered stages, mixed-version safety, worker draining, queue preservation, gates, incidents, and audit state." />
      <ReleaseReadinessNav />
      {state.error ? <ErrorAlert error={state.error} title="Rollout request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading rollout" /> : null}
      <Panel className="mb-4"><h2 className="text-sm font-semibold">Ordered rollout stages</h2><div className="mt-4 flex flex-wrap gap-2">{stages.map((stage) => <StatusBadge key={stage} tone={state.item.currentStage === stage ? 'info' : 'neutral'}>{stage}</StatusBadge>)}</div></Panel>
      <div className="grid gap-4 xl:grid-cols-2">{details.map((detail) => <Panel key={detail}><h2 className="text-sm font-semibold text-slate-950">{detail}</h2><p className="mt-3 text-xs text-slate-600">Safe bounded metadata only; detailed provider payloads are not retained.</p></Panel>)}</div>
    </>
  );
}
