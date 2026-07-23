import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { PilotAnalyticsNav } from '../components/PilotAnalyticsNav.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { MetricCard, PageHeader, Panel, SecondaryButton, formatDate } from './pageChrome.jsx';

function useAnalyticsData(path, method = 'GET') {
  const { identity, partnerConfigured } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, data: null });
  const scopedPath = useMemo(() => {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}${new URLSearchParams({ workspaceId: identity.receivingWorkspaceId })}`;
  }, [identity.receivingWorkspaceId, path]);
  const load = useCallback(async () => {
    if (!partnerConfigured) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      setState({ loading: false, error: null, data: method === 'POST' ? await apiClient.post(scopedPath, {}) : await apiClient.get(scopedPath) });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [method, partnerConfigured, scopedPath]);
  useEffect(() => void load(), [load]);
  return { ...state, load };
}

function Chrome({ title, description, state, children }) {
  return (
    <>
      <PageHeader
        eyebrow="Operations / Product learning"
        title={title}
        description={description}
        actions={<SecondaryButton onClick={state.load}><RefreshCw className="h-4 w-4" />Refresh</SecondaryButton>}
      />
      <PilotAnalyticsNav />
      {state.error ? <ErrorAlert error={state.error} title={`${title} request failed`} /> : null}
      {state.loading ? <LoadingBlock label={`Loading ${title.toLowerCase()}`} /> : null}
      {children}
    </>
  );
}

function badge(value) {
  const text = String(value || 'unknown');
  const tone = /healthy|complete$|available|ready$|active|positive|passed/.test(text)
    ? 'success'
    : /blocked|invalid|degraded|failed|stopped|unavailable/.test(text)
      ? 'danger'
      : /warning|restricted|insufficient|incomplete|paused/.test(text)
        ? 'warning'
        : 'pending';
  return <StatusBadge tone={tone}>{text.replaceAll('_', ' ')}</StatusBadge>;
}

function Table({ columns, rows, empty = 'No analytics are available for this reporting window.' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>{columns.map((column) => <th key={column.key} className="px-3 py-2 font-semibold">{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length ? rows.map((row, index) => (
            <tr key={row.id || row.eventKey || row.themeKey || row.experimentId || row.opportunityId || `${index}`}>
              {columns.map((column) => <td key={column.key} className="whitespace-nowrap px-3 py-2.5 text-slate-700">{column.render ? column.render(row) : String(row[column.key] ?? '—')}</td>)}
            </tr>
          )) : <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-slate-500">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function value(result, suffix = '') {
  if (!result || result.state !== 'available') return result?.state?.replaceAll('_', ' ') || 'unknown';
  return `${result.value}${suffix}`;
}

export function PilotAnalyticsOverview() {
  const adoption = useAnalyticsData('/pilot-analytics/adoption');
  const quality = useAnalyticsData('/pilot-analytics/events/quality');
  const coverage = useAnalyticsData('/pilot-analytics/instrumentation-coverage');
  const readiness = useAnalyticsData('/pilot-analytics/expansion-readiness');
  const state = { loading: adoption.loading || quality.loading || coverage.loading || readiness.loading, error: adoption.error || quality.error || coverage.error || readiness.error, load: () => Promise.all([adoption.load(), quality.load(), coverage.load(), readiness.load()]) };
  const data = adoption.data || {};
  const cards = [
    ['Enrolled organizations', data.enrolledOrganizations ?? 'unknown'],
    ['Active workspaces', data.activeWorkspaces ?? 'unknown'],
    ['Activated users', data.activeSubjects ?? 'unknown'],
    ['First-value rate', data.firstValueRate ? value(data.firstValueRate, '%') : 'insufficient data'],
    ['Successful run rate', value(data.successfulRunRate, '%')],
    ['Repeat use', data.repeatUseCategory || 'unknown'],
    ['Advanced adoption', data.advancedCapabilityCategory || 'unknown'],
    ['Provider blocked', data.providerBlockedUsage ?? 0],
    ['Support load', data.supportLoadCategory || 'unknown'],
    ['Data quality', quality.data?.status || 'unknown'],
    ['Instrumentation', coverage.data?.status || 'unknown'],
    ['Expansion readiness', readiness.data?.outcome || 'unknown'],
  ];
  return (
    <Chrome title="Pilot Analytics" description="Privacy-safe adoption, reliability-adjusted usage, and advisory expansion evidence. The reporting window and denominator are always explicit." state={state}>
      <div className="mb-4 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        Reporting window: {data.reportingWindow?.start || 'pilot window start'} — {data.reportingWindow?.end || 'current bounded window'} · Denominator: {data.denominator ?? 'unknown'}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, cardValue]) => <MetricCard key={label} label={label} value={String(cardValue).replaceAll('_', ' ')} tone={/blocked|invalid|degraded/.test(String(cardValue)) ? 'coral' : 'cyan'} />)}</div>
      <p className="mt-4 text-xs text-slate-500">Analytics are advisory evidence, never authorization or execution authority. Missing analytics do not block core correctness controls.</p>
    </Chrome>
  );
}

export function AdoptionFunnels() {
  const onboarding = useAnalyticsData('/pilot-analytics/funnels/pilot_onboarding/evaluate', 'POST');
  const activation = useAnalyticsData('/pilot-analytics/funnels/pilot_activation/evaluate', 'POST');
  const orchestration = useAnalyticsData('/pilot-analytics/funnels/pilot_orchestration_value/evaluate', 'POST');
  const capability = useAnalyticsData('/pilot-analytics/funnels/pilot_capability_adoption/evaluate', 'POST');
  const state = { loading: [onboarding, activation, orchestration, capability].some((item) => item.loading), error: [onboarding, activation, orchestration, capability].find((item) => item.error)?.error, load: () => Promise.all([onboarding.load(), activation.load(), orchestration.load(), capability.load()]) };
  const columns = [
    { key: 'eventKey', label: 'Step' }, { key: 'entered', label: 'Entered' }, { key: 'completed', label: 'Completed' },
    { key: 'conversion', label: 'Conversion', render: (row) => value(row.conversion, '%') }, { key: 'dropOff', label: 'Drop-off' },
    { key: 'platformBlocked', label: 'Platform blocked' }, { key: 'gateBlocked', label: 'Gate blocked' },
    { key: 'quotaBlocked', label: 'Quota blocked' }, { key: 'providerBlocked', label: 'Provider blocked' },
    { key: 'medianDurationCategory', label: 'Median duration' },
  ];
  return (
    <Chrome title="Adoption Funnels" description="Deterministic onboarding, activation, orchestration, and capability funnels with explicit blocked-activity categories." state={state}>
      <div className="grid gap-5">
        {[['Onboarding funnel', onboarding], ['Activation funnel', activation], ['Orchestration funnel', orchestration], ['Capability adoption funnel', capability]].map(([title, source]) => (
          <Panel key={title}><h2 className="mb-3 text-sm font-semibold text-slate-950">{title}</h2><Table columns={columns} rows={source.data?.steps || []} /></Panel>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">Gate, quota, provider, policy, and platform blocks are separated from voluntary drop-off. Absence alone is not interpreted as intent.</p>
    </Chrome>
  );
}

export function CohortsRetention() {
  const state = useAnalyticsData('/pilot-analytics/retention');
  const periods = state.data?.periods || {};
  const rows = state.data ? [{
    cohort: 'Current onboarding cohort',
    cohortSize: state.data.cohortSize ?? state.data.cohortSizeCategory,
    day1: value(periods.day1, '%'), day7: value(periods.day7, '%'),
    day14: value(periods.day14, '%'), day30: value(periods.day30, '%'),
    state: state.data.state,
  }] : [];
  return (
    <Chrome title="Cohorts & Retention" description="Behavioral retention cohorts with minimum-size suppression and honest insufficient-data states." state={state}>
      <Panel>
        <div className="mb-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {['Pilot program', 'Onboarding cohort', 'Release version', 'Workspace category', 'Capability category', 'Time window'].map((label) => <div key={label} className="border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">{label}: all allowed</div>)}
        </div>
        <Table rows={rows} columns={[
          { key: 'cohort', label: 'Cohort' }, { key: 'cohortSize', label: 'Cohort size' },
          { key: 'day1', label: 'Day 1' }, { key: 'day7', label: 'Day 7' },
          { key: 'day14', label: 'Day 14' }, { key: 'day30', label: 'Day 30' },
          { key: 'state', label: 'Privacy state', render: (row) => badge(row.state) },
        ]} />
      </Panel>
    </Chrome>
  );
}

export function CapabilityAdoption() {
  const state = useAnalyticsData('/pilot-analytics/adoption/capabilities');
  const rows = state.data?.items || [{
    capabilityKey: 'external.grounded_research', eligible: 0, discovered: 0, firstUse: 0,
    successfulFirstUse: 0, repeatUse: 0, gateBlocked: 1, providerBlocked: 1, quotaBlocked: 0,
    reliabilityAdjustedAdoption: { state: 'blocked_provider' }, recommendation: 'provider_gate_must_pass',
  }];
  return (
    <Chrome title="Capability Adoption" description="Reliability-adjusted capability adoption with explicit gate, quota, and provider friction." state={state}>
      <Panel><Table rows={rows} columns={[
        { key: 'capabilityKey', label: 'Capability', render: (row) => <span className={row.capabilityKey === 'external.grounded_research' ? 'font-semibold text-rose-700' : ''}>{row.capabilityKey}</span> },
        { key: 'eligible', label: 'Eligible' }, { key: 'discovered', label: 'Discovered' }, { key: 'firstUse', label: 'First use' },
        { key: 'successfulFirstUse', label: 'Successful first' }, { key: 'repeatUse', label: 'Repeat use' },
        { key: 'gateBlocked', label: 'Gate blocked' }, { key: 'providerBlocked', label: 'Provider blocked' }, { key: 'quotaBlocked', label: 'Quota blocked' },
        { key: 'reliabilityAdjustedAdoption', label: 'Adjusted adoption', render: (row) => value(row.reliabilityAdjustedAdoption, '%') },
        { key: 'recommendation', label: 'Recommendation', render: (row) => badge(row.recommendation) },
      ]} /></Panel>
      <div className="mt-4 border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">external.grounded_research remains disabled: Gemini verification is blocked by provider unavailability and external-flow verification is deferred. This is provider-blocked activity, not abandonment.</div>
    </Chrome>
  );
}

export function FeedbackInsights() {
  const state = useAnalyticsData('/pilot-analytics/feedback/themes');
  return (
    <Chrome title="Feedback Insights" description="Deterministically categorized feedback themes and support linkage without unrestricted feedback text." state={state}>
      <Panel><Table rows={state.data?.items || []} columns={[
        { key: 'themeKey', label: 'Theme' }, { key: 'trendCategory', label: 'Trend', render: (row) => badge(row.trendCategory) },
        { key: 'affectedCapabilityKeys', label: 'Capabilities', render: (row) => row.affectedCapabilityKeys?.join(', ') || '—' },
        { key: 'severityCategory', label: 'Severity' }, { key: 'affectedOrganizationCountCategory', label: 'Organizations' },
        { key: 'supportLinkCategory', label: 'Support linkage' }, { key: 'confidenceCategory', label: 'Confidence' },
        { key: 'ownerReference', label: 'Owner' }, { key: 'opportunityStatus', label: 'Opportunity' },
      ]} /></Panel>
    </Chrome>
  );
}

export function PilotExperiments() {
  const state = useAnalyticsData('/pilot-analytics/experiments');
  return (
    <Chrome title="Experiments" description="Approved, deterministic pilot experiments that cannot weaken security, isolation, encryption, residency, or fencing." state={state}>
      <Panel><Table rows={state.data?.items || []} columns={[
        { key: 'name', label: 'Experiment' }, { key: 'hypothesisId', label: 'Hypothesis' },
        { key: 'experimentType', label: 'Type' }, { key: 'eligibilityCohortKey', label: 'Cohort' },
        { key: 'status', label: 'Status', render: (row) => badge(row.status) },
        { key: 'variants', label: 'Variants', render: (row) => row.variants?.map((item) => item.key).join(', ') || '—' },
        { key: 'minimumSampleSize', label: 'Sample size' }, { key: 'primaryOutcome', label: 'Primary outcome' },
        { key: 'guardrailState', label: 'Guardrails', render: (row) => badge(row.guardrailState || 'not evaluated') },
        { key: 'createdAt', label: 'Created', render: (row) => formatDate(row.createdAt) },
      ]} /></Panel>
      <p className="mt-4 text-xs text-slate-500">Assignment is not exposure or authorization. Results remain advisory and never expand a pilot automatically.</p>
    </Chrome>
  );
}

export function ProductOpportunities() {
  const state = useAnalyticsData('/pilot-analytics/opportunities');
  return (
    <Chrome title="Product Opportunities" description="Evidence-linked product opportunities and advisory prioritization." state={state}>
      <Panel><Table rows={state.data?.items || []} columns={[
        { key: 'title', label: 'Opportunity' }, { key: 'opportunityType', label: 'Type' },
        { key: 'affectedCapabilityKeys', label: 'Capabilities', render: (row) => row.affectedCapabilityKeys?.join(', ') || '—' },
        { key: 'evidenceReferences', label: 'Evidence', render: (row) => `${row.evidenceReferences?.length || 0} references` },
        { key: 'impactCategory', label: 'Impact' }, { key: 'effortCategory', label: 'Effort' },
        { key: 'confidenceCategory', label: 'Confidence' }, { key: 'riskCategory', label: 'Risk' },
        { key: 'status', label: 'Status', render: (row) => badge(row.status) }, { key: 'ownerReference', label: 'Owner' },
      ]} /></Panel>
    </Chrome>
  );
}

export function AnalyticsDataQuality() {
  const quality = useAnalyticsData('/pilot-analytics/events/quality');
  const coverage = useAnalyticsData('/pilot-analytics/instrumentation-coverage');
  const state = { loading: quality.loading || coverage.loading, error: quality.error || coverage.error, load: () => Promise.all([quality.load(), coverage.load()]) };
  const q = quality.data || {};
  const c = coverage.data || {};
  const rows = [
    ['Required events', c.requiredEventCount ?? 'unknown'],
    ['Observed events', c.observedEventCount ?? 'unknown'],
    ['Missing events', c.missingEventDefinitionKeys?.length ?? 'unknown'],
    ['Schema failures', c.schemaFailureCount ?? 0],
    ['Duplicates', c.deduplicationCount ?? 0],
    ['Redactions', c.redactionCount ?? 0],
    ['Source-sequence gaps', q.sourceSequenceGapCount ?? 'unknown'],
    ['Projection lag', q.projectionLagCategory || 'unknown'],
    ['Backfill status', q.backfillStatus || 'not requested'],
  ].map(([metric, metricValue]) => ({ metric, value: metricValue }));
  return (
    <Chrome title="Data Quality" description="Instrumentation coverage, ordering, duplicates, schema health, projection lag, and bounded backfill state." state={state}>
      <div className="mb-4 grid gap-3 sm:grid-cols-2"><MetricCard label="Quality" value={q.status || 'unknown'} tone={q.status === 'healthy' ? 'emerald' : 'coral'} /><MetricCard label="Coverage" value={c.status || 'unknown'} tone={c.status === 'complete' ? 'emerald' : 'coral'} /></div>
      <Panel><Table rows={rows} columns={[{ key: 'metric', label: 'Check' }, { key: 'value', label: 'Observed' }]} /></Panel>
    </Chrome>
  );
}
