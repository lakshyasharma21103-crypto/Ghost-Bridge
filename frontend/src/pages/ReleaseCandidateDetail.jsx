import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { ReleaseReadinessNav } from '../components/ReleaseReadinessNav.jsx';
import { PageHeader, Panel } from './pageChrome.jsx';

const sections = ['Summary', 'Manifest', 'Provenance', 'Artifacts', 'Dependency Integrity', 'Compatibility', 'Migrations', 'Performance', 'Capacity', 'DR', 'SLOs', 'Runbooks', 'Manual Gates', 'Waivers', 'Evidence', 'Audit'];

export function ReleaseCandidateDetail() {
  const { candidateId } = useParams();
  const { identity } = useAppState();
  const [state, setState] = useState({ loading: true, error: null, candidate: {}, evidence: null });
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }), [identity.receivingWorkspaceId]);
  useEffect(() => {
    Promise.all([
      apiClient.get(`/releases/candidates/${encodeURIComponent(candidateId)}?${query}`),
      apiClient.get(`/releases/candidates/${encodeURIComponent(candidateId)}/evidence?${query}`).catch(() => null),
    ]).then(([candidate, evidence]) => setState({ loading: false, error: null, candidate, evidence })).catch((error) => setState({ loading: false, error, candidate: {}, evidence: null }));
  }, [candidateId, query]);
  return (
    <>
      <PageHeader eyebrow="Operations / Production release" title={state.candidate.name || 'Release Candidate'} description="Safe immutable release evidence; environment values and deployment credentials are never shown." />
      <ReleaseReadinessNav />
      {state.error ? <ErrorAlert error={state.error} title="Release candidate request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading release candidate" /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {sections.map((section) => <Panel key={section}><h2 className="text-sm font-semibold text-slate-950">{section}</h2><p className="mt-3 text-xs leading-5 text-slate-600">{section === 'Summary' ? `${state.candidate.version || '-'} · ${state.candidate.status || 'unknown'} · ${state.candidate.sourceRevision?.slice(0, 12) || '-'}` : state.evidence ? 'Immutable evidence is available in the governed package.' : 'Evidence has not been generated or is not authorized.'}</p></Panel>)}
      </div>
    </>
  );
}
