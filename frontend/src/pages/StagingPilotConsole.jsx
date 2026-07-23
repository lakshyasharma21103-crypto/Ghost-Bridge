import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { PilotOperationsNav } from '../components/PilotOperationsNav.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { MetricCard, PageHeader, Panel, SecondaryButton, formatDate } from './pageChrome.jsx';

function useLaunchData(path) {
  const { identity, partnerConfigured } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, data: null });
  const scopedPath = useMemo(() => {
    const join = path.includes('?') ? '&' : '?';
    return `${path}${join}${new URLSearchParams({ workspaceId: identity.receivingWorkspaceId })}`;
  }, [identity.receivingWorkspaceId, path]);
  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      setState({ loading: false, error: null, data: await apiClient.get(scopedPath) });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, scopedPath]);
  useEffect(() => void load(), [load]);
  return { ...state, load };
}

function Chrome({ eyebrow, title, description, state, children }) {
  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={<SecondaryButton onClick={state.load}><RefreshCw className="h-4 w-4" />Refresh</SecondaryButton>}
      />
      <PilotOperationsNav />
      {state.error ? <ErrorAlert error={state.error} title={`${title} request failed`} /> : null}
      {state.loading ? <LoadingBlock label={`Loading ${title.toLowerCase()}`} /> : null}
      {children}
    </>
  );
}

function SafeTable({ columns, rows, empty = 'No records are available.' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>{columns.map((column) => <th key={column.key} className="px-3 py-2 font-semibold">{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length ? rows.map((row, rowIndex) => (
            <tr key={row.id || row.deploymentId || row.programId || row.capabilityKey || row.caseNumber || rowIndex}>
              {columns.map((column) => <td key={column.key} className="whitespace-nowrap px-3 py-2.5 text-slate-700">{column.render ? column.render(row) : String(row[column.key] ?? '—')}</td>)}
            </tr>
          )) : <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-slate-500">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function badge(value) {
  const safe = String(value || 'unknown');
  const tone = /healthy|passed|active|ready$|resolved|verified/.test(safe)
    ? 'success'
    : /blocked|failed|degraded|critical|unavailable/.test(safe)
      ? 'danger'
      : /warning|restricted|pending|approval/.test(safe)
        ? 'warning'
        : 'pending';
  return <StatusBadge tone={tone}>{safe.replaceAll('_', ' ')}</StatusBadge>;
}

export function Staging() {
  const state = useLaunchData('/launch/staging-deployments');
  const rows = state.data?.items || [];
  const latest = rows[0] || {};
  const cards = [
    ['Deployed release', latest.releaseVersion || 'not observed'], ['Source revision', latest.sourceRevision?.slice(0, 12) || 'unknown'],
    ['Staging health', latest.healthStatus || 'unknown'], ['Readiness', latest.readinessStatus || 'unknown'],
    ['Migration', latest.migrationStatus || 'unknown'], ['Indexes', latest.indexStatus || 'unknown'],
    ['Workers', latest.workerPoolCategories?.length ? 'represented' : 'unknown'], ['Smoke tests', latest.smokeTestStatus || 'not run'],
    ['Observation', latest.observationStatus || 'not started'], ['Live provider gates', latest.liveGateStatus || 'blocked'],
  ];
  return (
    <Chrome eyebrow="Operations / Controlled launch" title="Staging" description="Governed deployment records, bounded verification, and manual external execution evidence." state={state}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([label, value]) => <MetricCard key={label} label={label} value={value} tone={/blocked|unknown|not/.test(value) ? 'slate' : 'cyan'} />)}</div>
      <Panel>
        <SafeTable rows={rows} columns={[
          { key: 'deploymentId', label: 'Deployment' }, { key: 'releaseVersion', label: 'Release' },
          { key: 'deploymentTargetId', label: 'Target' }, { key: 'status', label: 'Status', render: (row) => badge(row.status) },
          { key: 'healthStatus', label: 'Health', render: (row) => badge(row.healthStatus) },
          { key: 'readinessStatus', label: 'Readiness', render: (row) => badge(row.readinessStatus) },
          { key: 'smokeTestStatus', label: 'Smoke tests' }, { key: 'liveGateStatus', label: 'Live gates', render: (row) => badge(row.liveGateStatus) },
          { key: 'deployedAt', label: 'Deployed', render: (row) => formatDate(row.deployedAt) },
          { key: 'verifiedAt', label: 'Verified', render: (row) => formatDate(row.verifiedAt) },
        ]} />
      </Panel>
      <p className="mt-4 text-xs text-slate-500">Real staging deployment remains manual or external. This console records and verifies evidence; it does not call a cloud provider.</p>
    </Chrome>
  );
}

export function CapabilityGates() {
  const state = useLaunchData('/launch/capability-gates');
  const rows = state.data?.items || [];
  return (
    <Chrome eyebrow="Operations / Controlled launch" title="Capability Gates" description="Explicit evidence gates determine whether each pilot capability may be enabled." state={state}>
      <Panel>
        <SafeTable rows={rows} columns={[
          { key: 'capabilityKey', label: 'Capability', render: (row) => <span className={row.capabilityKey === 'external.grounded_research' ? 'font-semibold text-rose-700' : ''}>{row.capabilityKey}</span> },
          { key: 'scope', label: 'Scope' }, { key: 'status', label: 'Status', render: (row) => badge(row.providerGateStatus || row.status) },
          { key: 'requiredGateKeys', label: 'Required gates', render: (row) => `${row.requiredGateKeys?.length || 0}` },
          { key: 'expiresAt', label: 'Evidence freshness', render: (row) => row.expiresAt ? formatDate(row.expiresAt) : 'no expiry' },
          { key: 'waiverAllowed', label: 'Waiver', render: (row) => row.waiverAllowed ? 'bounded' : 'not allowed' },
          { key: 'enabled', label: 'Enabled', render: (row) => badge(row.enabled ? 'enabled' : 'disabled') },
          { key: 'safeReasonCodes', label: 'Safe reasons', render: (row) => row.safeReasonCodes?.join(', ') || '—' },
          { key: 'evaluatedAt', label: 'Evaluated', render: (row) => formatDate(row.evaluatedAt) },
        ]} empty="No capability gates have been recorded. Grounded research remains disabled by default." />
      </Panel>
      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">Gemini verification is currently represented as provider unavailable and external-flow verification as deferred. Grounded research must remain disabled; a waiver never turns either gate into a pass.</div>
    </Chrome>
  );
}

export function PilotPrograms() {
  const state = useLaunchData('/launch/pilot-programs');
  const rows = state.data?.items || [];
  return (
    <Chrome eyebrow="Operations / Controlled launch" title="Pilot Programs" description="Bounded cohorts, governed enrollment, strict quotas, observation windows, and evidence-based graduation." state={state}>
      <Panel>
        <SafeTable rows={rows} columns={[
          { key: 'name', label: 'Program', render: (row) => <Link className="font-medium text-cyan-700 hover:underline" to={`/operations/pilot-programs/${row.programId}`}>{row.name}</Link> },
          { key: 'releaseCandidateId', label: 'Release' }, { key: 'status', label: 'Status', render: (row) => badge(row.status) },
          { key: 'maximumOrganizations', label: 'Organizations' }, { key: 'maximumWorkspacesPerOrganization', label: 'Workspaces / org' },
          { key: 'maximumUsersPerWorkspace', label: 'Users / workspace' }, { key: 'healthStatus', label: 'Health', render: (row) => badge(row.healthStatus) },
          { key: 'blockerCount', label: 'Blockers' }, { key: 'readinessStatus', label: 'Readiness', render: (row) => badge(row.readinessStatus) },
          { key: 'startAt', label: 'Start', render: (row) => formatDate(row.startAt) }, { key: 'expectedEndAt', label: 'End', render: (row) => formatDate(row.expectedEndAt) },
        ]} />
      </Panel>
    </Chrome>
  );
}

const detailSections = ['Summary', 'Enrollments', 'Capabilities', 'Quotas', 'Onboarding', 'Health', 'Observation', 'Incidents', 'Support', 'Feedback', 'Blockers', 'Readiness', 'Decisions', 'Evidence', 'Audit'];

export function PilotProgramDetail() {
  const { programId } = useParams();
  const state = useLaunchData(`/launch/pilot-programs/${programId}`);
  const program = state.data || {};
  return (
    <Chrome eyebrow="Operations / Pilot program" title={program.name || 'Pilot Program'} description="Tenant-scoped launch controls and evidence for one bounded cohort." state={state}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Status" value={program.status || 'unknown'} tone="cyan" />
        <MetricCard label="Release" value={program.releaseCandidateId || 'unknown'} />
        <MetricCard label="Classification limit" value={program.dataClassificationLimit || 'unknown'} />
        <MetricCard label="Observation window" value={program.observationWindowMs ? `${Math.round(program.observationWindowMs / 3600000)}h` : 'unknown'} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {detailSections.map((section) => (
          <Panel key={section}>
            <h2 className="text-sm font-semibold text-slate-950">{section}</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">Governed {section.toLowerCase()} records are scoped to this pilot and exposed without credentials or customer payloads.</p>
          </Panel>
        ))}
      </div>
    </Chrome>
  );
}

export function PilotHealth() {
  const programs = useLaunchData('/launch/pilot-programs');
  const rows = programs.data?.items || [];
  const dimensions = ['Enrollment health', 'Usage category', 'Reliability category', 'Latency category', 'Queue health', 'Worker health', 'Database health', 'Cache health', 'Regional health', 'Incidents', 'Support load', 'Provider status', 'Capacity headroom', 'SLO status'];
  return (
    <Chrome eyebrow="Operations / Controlled launch" title="Pilot Health" description="Honest, bounded summaries across release, reliability, safety, support, and provider status." state={programs}>
      <div className="grid gap-4 xl:grid-cols-2">
        {rows.length ? rows.map((program) => (
          <Panel key={program.programId}>
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-950">{program.name}</h2>{badge(program.healthStatus || 'unknown')}</div>
            <div className="mt-3 grid grid-cols-2 gap-2">{dimensions.map((dimension) => <div key={dimension} className="rounded border border-slate-100 px-3 py-2"><p className="text-[10px] uppercase text-slate-400">{dimension}</p><p className="mt-1 text-xs text-slate-700">{dimension === 'Provider status' ? 'unavailable / restricted' : 'evidence required'}</p></div>)}</div>
          </Panel>
        )) : <Panel><p className="text-xs text-slate-500">No active pilot programs are available.</p></Panel>}
      </div>
    </Chrome>
  );
}

export function FeedbackSupport() {
  const feedback = useLaunchData('/launch/feedback');
  const support = useLaunchData('/launch/support-cases');
  const state = { loading: feedback.loading || support.loading, error: feedback.error || support.error, load: () => Promise.all([feedback.load(), support.load()]) };
  return (
    <Chrome eyebrow="Operations / Controlled launch" title="Feedback & Support" description="Redacted feedback intake and tenant-scoped pilot support tracking." state={state}>
      <div className="grid gap-5">
        <Panel>
          <h2 className="mb-3 text-sm font-semibold text-slate-950">Feedback</h2>
          <SafeTable rows={feedback.data?.items || []} columns={[
            { key: 'category', label: 'Category' }, { key: 'severity', label: 'Severity', render: (row) => badge(row.severity) },
            { key: 'affectedCapabilityKey', label: 'Capability' }, { key: 'status', label: 'Status', render: (row) => badge(row.status) },
            { key: 'redactionStatus', label: 'Redaction', render: (row) => badge(row.redactionStatus) },
            { key: 'assignedOwnerReference', label: 'Owner' }, { key: 'createdAt', label: 'Submitted', render: (row) => formatDate(row.createdAt) },
            { key: 'resolvedAt', label: 'Resolved', render: (row) => formatDate(row.resolvedAt) },
          ]} />
        </Panel>
        <Panel>
          <h2 className="mb-3 text-sm font-semibold text-slate-950">Support cases</h2>
          <SafeTable rows={support.data?.items || []} columns={[
            { key: 'caseNumber', label: 'Case' }, { key: 'severity', label: 'Severity', render: (row) => badge(row.severity) },
            { key: 'category', label: 'Category' }, { key: 'status', label: 'Status', render: (row) => badge(row.status) },
            { key: 'organizationId', label: 'Organization' }, { key: 'workspaceId', label: 'Workspace' },
            { key: 'assignedOwnerReference', label: 'Owner' }, { key: 'acknowledgedAt', label: 'Acknowledged', render: (row) => formatDate(row.acknowledgedAt) },
            { key: 'resolvedAt', label: 'Resolved', render: (row) => formatDate(row.resolvedAt) },
          ]} />
        </Panel>
      </div>
    </Chrome>
  );
}
