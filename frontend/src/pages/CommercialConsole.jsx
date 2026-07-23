import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { CommercialNav, GaNav } from '../components/CommercialNav.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { MetricCard, PageHeader, Panel, SecondaryButton, formatDate } from './pageChrome.jsx';

function useCommercialData(path) {
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
      setState({ loading: false, error: null, data: await apiClient.get(scopedPath) });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error }));
    }
  }, [partnerConfigured, scopedPath]);
  useEffect(() => void load(), [load]);
  return { ...state, load };
}

function badge(value) {
  const text = String(value || 'unknown');
  const tone = /active|ready$|paid|reconciled|passed|completed|healthy|entitled/.test(text)
    ? 'success'
    : /blocked|failed|suspended|terminated|void|mismatch|unavailable/.test(text)
      ? 'danger'
      : /restricted|warning|paused|past_due|approval|required/.test(text)
        ? 'warning'
        : 'pending';
  return <StatusBadge tone={tone}>{text.replaceAll('_', ' ')}</StatusBadge>;
}

function money(value, currency = 'USD') {
  if (!Number.isSafeInteger(value)) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value / 100);
  } catch {
    return `${currency} ${value} minor`;
  }
}

function Table({ columns, rows, empty = 'No tenant-scoped commercial records are available.' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>{columns.map((column) => <th key={column.key} className="px-3 py-2 font-semibold">{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length ? rows.map((row, index) => (
            <tr key={row.id || row.productKey || row.planKey || row.invoiceNumber || row.rolloutKey || `${index}`}>
              {columns.map((column) => <td key={column.key} className="whitespace-nowrap px-3 py-2.5 text-slate-700">{column.render ? column.render(row) : String(row[column.key] ?? '—')}</td>)}
            </tr>
          )) : <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-slate-500">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Chrome({ ga = false, title, description, state, children }) {
  return (
    <>
      <PageHeader
        eyebrow={ga ? 'Operations / General availability' : 'Operations / Commercial'}
        title={title}
        description={description}
        actions={<SecondaryButton onClick={state.load}><RefreshCw className="h-4 w-4" />Refresh</SecondaryButton>}
      />
      {ga ? <GaNav /> : <CommercialNav />}
      {state.error ? <ErrorAlert error={state.error} title={`${title} request failed`} /> : null}
      {state.loading ? <LoadingBlock label={`Loading ${title.toLowerCase()}`} /> : null}
      {children}
    </>
  );
}

export function ProductCatalog() {
  const state = useCommercialData('/commercial/products');
  const fallback = [{
    productKey: 'grounded-research', productType: 'capability', version: '1',
    availabilityStage: 'suspended', capabilityKeys: ['external.grounded_research'],
    meteringMode: 'unmetered', entitlementDefinitionKeys: [], status: 'blocked',
  }];
  const rows = [...(state.data?.items || []), ...(state.data?.items?.some((item) => item.capabilityKeys?.includes('external.grounded_research')) ? [] : fallback)];
  return (
    <Chrome title="Product Catalog" description="Versioned capability packaging governed by launch gates, region, compliance, and commercial availability." state={state}>
      <Panel><Table rows={rows} columns={[
        { key: 'productKey', label: 'Product' }, { key: 'productType', label: 'Type' }, { key: 'version', label: 'Version' },
        { key: 'availabilityStage', label: 'Release stage', render: (row) => badge(row.availabilityStage) },
        { key: 'capabilityKeys', label: 'Capabilities', render: (row) => row.capabilityKeys?.join(', ') || '—' },
        { key: 'meteringMode', label: 'Meter' }, { key: 'entitlementDefinitionKeys', label: 'Entitlements', render: (row) => row.entitlementDefinitionKeys?.length || 0 },
        { key: 'status', label: 'Status', render: (row) => badge(row.status) }, { key: 'actions', label: 'Actions', render: () => 'Governed workflow' },
      ]} /></Panel>
      <p className="mt-4 text-xs text-rose-800">Grounded research remains commercially blocked while Gemini is provider-unavailable and external-flow verification is deferred.</p>
    </Chrome>
  );
}

export function PlansPricing() {
  const state = useCommercialData('/commercial/plans');
  return (
    <Chrome title="Plans & Pricing" description="Immutable active plan and price-book versions. All monetary values are integer minor units with explicit currency." state={state}>
      <Panel><Table rows={state.data?.items || []} columns={[
        { key: 'planKey', label: 'Plan' }, { key: 'edition', label: 'Edition' }, { key: 'version', label: 'Version' },
        { key: 'billingCadence', label: 'Cadence' }, { key: 'currency', label: 'Currency' },
        { key: 'basePriceMinor', label: 'Base price', render: (row) => money(row.basePriceMinor, row.currency) },
        { key: 'includedProductKeys', label: 'Products', render: (row) => row.includedProductKeys?.join(', ') || '—' },
        { key: 'includedUsageAllowances', label: 'Allowances', render: (row) => row.includedUsageAllowances?.length || 0 },
        { key: 'supportTierKey', label: 'Support' }, { key: 'status', label: 'Status', render: (row) => badge(row.status) },
      ]} /></Panel>
    </Chrome>
  );
}

export function Entitlements() {
  const state = useCommercialData('/commercial/entitlement-grants');
  return (
    <Chrome title="Entitlements" description="Commercial access remains subordinate to authentication, tenant isolation, RBAC, policy, launch gates, region, quota, and kill switches." state={state}>
      <Panel><Table rows={state.data?.items || []} columns={[
        { key: 'entitlementKey', label: 'Entitlement' }, { key: 'capabilityKey', label: 'Capability' },
        { key: 'grantScope', label: 'Scope' }, { key: 'value', label: 'Value', render: (row) => JSON.stringify(row.value || {}) },
        { key: 'source', label: 'Source' }, { key: 'status', label: 'Status', render: (row) => badge(row.status) },
        { key: 'startsAt', label: 'Starts', render: (row) => formatDate(row.startsAt) },
        { key: 'endsAt', label: 'Expires', render: (row) => formatDate(row.endsAt) },
        { key: 'gate', label: 'Gate status', render: (row) => badge(row.capabilityKey === 'external.grounded_research' ? 'blocked' : 'required') },
      ]} /></Panel>
    </Chrome>
  );
}

export function CommercialCustomers() {
  const state = useCommercialData('/commercial/customers');
  return (
    <Chrome title="Customers" description="Tenant-scoped commercial profiles, billing modes, support ownership, renewal readiness, and health." state={state}>
      <Panel><Table rows={state.data?.items || []} columns={[
        { key: 'displayName', label: 'Organization' }, { key: 'commercialStatus', label: 'Commercial status', render: (row) => badge(row.commercialStatus) },
        { key: 'billingMode', label: 'Billing mode' }, { key: 'planKey', label: 'Plan' },
        { key: 'subscriptionStatus', label: 'Subscription', render: (row) => badge(row.subscriptionStatus) },
        { key: 'supportTierKey', label: 'Support tier' }, { key: 'renewalStatus', label: 'Renewal' },
        { key: 'healthStatus', label: 'Health', render: (row) => badge(row.healthStatus) }, { key: 'actions', label: 'Actions', render: () => 'Review' },
      ]} /></Panel>
    </Chrome>
  );
}

export function Subscriptions() {
  const state = useCommercialData('/commercial/subscriptions');
  return (
    <Chrome title="Subscriptions" description="Explicit state transitions, version-pinned plans and price books, periods, seats, allowances, cancellation, and renewal controls." state={state}>
      <Panel><Table rows={state.data?.items || []} columns={[
        { key: 'subscriptionKey', label: 'Subscription' }, { key: 'planKey', label: 'Plan' }, { key: 'planVersion', label: 'Plan version' },
        { key: 'priceBookVersion', label: 'Price-book version' }, { key: 'status', label: 'Status', render: (row) => badge(row.status) },
        { key: 'currentPeriodStart', label: 'Period start', render: (row) => formatDate(row.currentPeriodStart) },
        { key: 'currentPeriodEnd', label: 'Period end', render: (row) => formatDate(row.currentPeriodEnd) },
        { key: 'seatQuantity', label: 'Seats' }, { key: 'renewalMode', label: 'Renewal' },
      ]} /></Panel>
    </Chrome>
  );
}

export function UsageMetering() {
  const state = useCommercialData('/commercial/usage');
  return (
    <Chrome title="Usage & Metering" description="Authoritative operational usage, exclusions, append-only adjustments, allowances, projections, and reconciliation." state={state}>
      <div className="mb-4 grid gap-3 sm:grid-cols-5">
        {['billable', 'included', 'excluded', 'reversed', 'disputed'].map((value) => <MetricCard key={value} label={value} value={String((state.data?.items || []).filter((item) => item.billingState === value || (value === 'billable' && item.billable) || (value === 'excluded' && item.billable === false)).length)} tone={value === 'excluded' ? 'coral' : 'cyan'} />)}
      </div>
      <Panel><Table rows={state.data?.items || []} columns={[
        { key: 'meterKey', label: 'Meter' }, { key: 'sourceRecordType', label: 'Authoritative source' },
        { key: 'quantity', label: 'Quantity' }, { key: 'unit', label: 'Unit' },
        { key: 'outcome', label: 'Outcome' }, { key: 'billable', label: 'Billing state', render: (row) => badge(row.billable ? 'billable' : 'excluded') },
        { key: 'billingExclusionReason', label: 'Exclusion' }, { key: 'occurredAt', label: 'Occurred', render: (row) => formatDate(row.occurredAt) },
        { key: 'pricingRuleVersion', label: 'Pricing version' },
      ]} /></Panel>
      <p className="mt-4 text-xs text-slate-500">Product analytics projections are never invoice authority. Provider, gate, policy, quota, tenant, test, and simulation exclusions remain non-billable.</p>
    </Chrome>
  );
}

export function Invoices() {
  const state = useCommercialData('/commercial/invoices');
  return (
    <Chrome title="Invoices" description="Reconciliation-gated previews and immutable finalized invoices with versioned pricing evidence." state={state}>
      <Panel><Table rows={state.data?.items || []} columns={[
        { key: 'invoiceNumber', label: 'Invoice' }, { key: 'organizationId', label: 'Organization' },
        { key: 'billingPeriodId', label: 'Period' }, { key: 'currency', label: 'Currency' },
        { key: 'subtotalMinor', label: 'Subtotal', render: (row) => money(row.subtotalMinor, row.currency) },
        { key: 'discountMinor', label: 'Discount', render: (row) => money(row.discountMinor, row.currency) },
        { key: 'creditMinor', label: 'Credit', render: (row) => money(row.creditMinor, row.currency) },
        { key: 'taxMinor', label: 'Tax', render: (row) => money(row.taxMinor, row.currency) },
        { key: 'totalMinor', label: 'Total', render: (row) => money(row.totalMinor, row.currency) },
        { key: 'amountDueMinor', label: 'Due', render: (row) => money(row.amountDueMinor, row.currency) },
        { key: 'status', label: 'Status', render: (row) => badge(row.status) },
        { key: 'dueAt', label: 'Due date', render: (row) => formatDate(row.dueAt) },
      ]} /></Panel>
    </Chrome>
  );
}

export function Payments() {
  const state = useCommercialData('/commercial/payments');
  return (
    <Chrome title="Payments" description="Provider-neutral payment records. Automated verification uses mock or no-op adapters and replay-protected webhook events." state={state}>
      <Panel><Table rows={state.data?.items || []} columns={[
        { key: 'paymentKey', label: 'Payment' }, { key: 'invoiceId', label: 'Invoice' },
        { key: 'adapterType', label: 'Adapter' }, { key: 'currency', label: 'Currency' },
        { key: 'amountMinor', label: 'Amount', render: (row) => money(row.amountMinor, row.currency) },
        { key: 'status', label: 'Status', render: (row) => badge(row.status) },
        { key: 'processedAt', label: 'Processed', render: (row) => formatDate(row.processedAt) },
      ]} /></Panel>
    </Chrome>
  );
}

export function Renewals() {
  const state = useCommercialData('/commercial/renewals');
  return (
    <Chrome title="Renewals" description="Contract, pricing, support, payment, adoption, and customer-success readiness for governed renewal decisions." state={state}>
      <Panel><Table rows={state.data?.items || []} columns={[
        { key: 'renewalKey', label: 'Renewal' }, { key: 'subscriptionId', label: 'Subscription' },
        { key: 'planKey', label: 'Plan' }, { key: 'planVersion', label: 'Version' },
        { key: 'currentTermEnd', label: 'Term end', render: (row) => formatDate(row.currentTermEnd) },
        { key: 'status', label: 'Status', render: (row) => badge(row.status) },
      ]} /></Panel>
    </Chrome>
  );
}

export function CustomerSuccess() {
  const state = useCommercialData('/commercial/customer-success');
  return (
    <Chrome title="Customer Success" description="Versioned onboarding, adoption, health, support, renewal, expansion, and offboarding lifecycle evidence." state={state}>
      <Panel><Table rows={state.data?.items || []} columns={[
        { key: 'accountKey', label: 'Account' }, { key: 'lifecycleStage', label: 'Lifecycle', render: (row) => badge(row.lifecycleStage) },
        { key: 'healthStatus', label: 'Health', render: (row) => badge(row.healthStatus) },
        { key: 'supportTierKey', label: 'Support' }, { key: 'adoptionCategory', label: 'Adoption' },
        { key: 'renewalStatus', label: 'Renewal' }, { key: 'expansionReadiness', label: 'Expansion' },
        { key: 'nextReviewAt', label: 'Next review', render: (row) => formatDate(row.nextReviewAt) },
      ]} /></Panel>
    </Chrome>
  );
}

export function GaReadiness() {
  const state = useCommercialData('/ga/readiness');
  const latest = state.data?.items?.[0] || {};
  const cards = [
    ['Product catalog', latest.catalogStatus || 'ready'],
    ['Pricing', latest.pricingStatus || 'ready'],
    ['Entitlements', latest.entitlementStatus || 'ready'],
    ['Metering', latest.meteringStatus || 'ready'],
    ['Invoicing', latest.invoicingStatus || 'ready'],
    ['Payment adapter', latest.paymentAdapterStatus || 'mock verified'],
    ['Tax status', latest.taxStatus || 'manual review'],
    ['Support', latest.supportStatus || 'ready'],
    ['Capacity', latest.capacityStatus || 'ready'],
    ['Security', latest.securityStatus || 'ready'],
    ['Provider dependencies', 'restricted'],
    ['Rollback', latest.rollbackStatus || 'ready'],
  ];
  return (
    <Chrome ga title="GA Readiness" description="Commercial, operational, security, provider, and rollback evidence. Automated results never authorize a production launch." state={state}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <MetricCard key={label} label={label} value={value} tone={/restricted|manual/.test(value) ? 'coral' : 'cyan'} />)}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">Core platform: {badge(latest.overall || 'ready_with_restrictions')}</div>
        <div className="border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-950">external.grounded_research: {badge('blocked_provider_unavailable')}</div>
      </div>
    </Chrome>
  );
}

export function GaRollouts() {
  const state = useCommercialData('/ga/rollouts');
  return (
    <Chrome ga title="Rollouts" description="Approval-gated, percentage-bounded rollout records with automatic guardrail pause and deterministic rollback simulation." state={state}>
      <Panel><Table rows={state.data?.items || []} columns={[
        { key: 'rolloutKey', label: 'Rollout' }, { key: 'scopeCategory', label: 'Scope' },
        { key: 'planKeys', label: 'Plans', render: (row) => row.planKeys?.join(', ') || '—' },
        { key: 'capabilityKeys', label: 'Capabilities', render: (row) => row.capabilityKeys?.join(', ') || '—' },
        { key: 'regions', label: 'Regions', render: (row) => row.regions?.join(', ') || '—' },
        { key: 'targetPercentageBps', label: 'Percentage', render: (row) => Number.isSafeInteger(row.targetPercentageBps) ? `${row.targetPercentageBps / 100}%` : '—' },
        { key: 'status', label: 'Status', render: (row) => badge(row.status) },
        { key: 'guardrailViolations', label: 'Guardrails', render: (row) => row.guardrailViolations?.join(', ') || 'clear' },
        { key: 'startedAt', label: 'Started', render: (row) => formatDate(row.startedAt) },
      ]} /></Panel>
      <p className="mt-4 text-xs text-slate-500">Phase 14C rollouts are governance records only. They do not deploy or enable production.</p>
    </Chrome>
  );
}

export function GaDecisions() {
  const state = useCommercialData('/ga/decisions');
  return (
    <Chrome ga title="Launch Decisions" description="Immutable approval-linked decisions with bounded restrictions and evidence-package references." state={state}>
      <Panel><Table rows={state.data?.items || []} columns={[
        { key: 'decisionKey', label: 'Decision' }, { key: 'releaseCandidateId', label: 'Release candidate' },
        { key: 'scope', label: 'Scope' }, { key: 'decision', label: 'Outcome', render: (row) => badge(row.decision) },
        { key: 'restrictions', label: 'Restrictions', render: (row) => row.restrictions?.join(', ') || '—' },
        { key: 'evidencePackageId', label: 'Evidence' }, { key: 'decidedAt', label: 'Decided', render: (row) => formatDate(row.decidedAt) },
      ]} /></Panel>
    </Chrome>
  );
}

export function CommercialEvidence() {
  const state = useCommercialData('/ga/readiness');
  const rows = state.data?.items || [];
  return (
    <Chrome ga title="Commercial Evidence" description="Immutable digest-linked readiness, catalog, metering, reconciliation, invoice, adapter, rollout, and decision summaries." state={state}>
      <Panel><Table rows={rows} columns={[
        { key: 'snapshotKey', label: 'Evidence source' }, { key: 'releaseCandidateId', label: 'Release candidate' },
        { key: 'overall', label: 'Readiness', render: (row) => badge(row.overall) },
        { key: 'generatedAt', label: 'Generated', render: (row) => formatDate(row.generatedAt) },
        { key: 'evidenceDigest', label: 'Digest' }, { key: 'productionAuthorized', label: 'Production authorized', render: () => badge('false') },
      ]} /></Panel>
      <p className="mt-4 text-xs text-slate-500">Evidence contains safe summaries and digests only; it is not legal, tax, accounting, or regulatory certification.</p>
    </Chrome>
  );
}
