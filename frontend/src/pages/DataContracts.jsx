import { Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { JsonEditor } from '../components/JsonEditor.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, PageHeader, Panel, PrimaryButton, SecondaryButton } from './pageChrome.jsx';

const starter = JSON.stringify({
  name: 'Research to summary', description: 'Purpose-limited report summarization.',
  sourceSelector: { capabilityCategory: 'SEARCH', minimumTrustTier: 'registered' },
  targetSelector: { capabilityCategory: 'DOCUMENT', minimumTrustTier: 'registered' },
  sourceCapability: 'research.collect', sourceOperation: 'collect', targetCapability: 'report.summarize', targetOperation: 'summarize',
  purpose: 'Produce a bounded summary from approved research fields.', purposeCode: 'REPORT_SUMMARY',
  allowedInputSchema: { type: 'object', properties: { title: { type: 'string' }, summary: { type: 'string' }, sourceUrls: { type: 'array', items: { type: 'string' }, maxItems: 3 }, reporterEmail: { type: 'string' } }, required: ['title', 'summary'], additionalProperties: false },
  allowedOutputSchema: { type: 'object', properties: { report: { type: 'string' } }, required: ['report'], additionalProperties: false },
  sourceOutputMapping: {}, targetInputMapping: {}, downstreamOutputMapping: {},
  allowedInputFields: ['title', 'summary', 'sourceUrls', 'reporterEmail'], deniedInputFields: ['internalNotes', 'hiddenReasoning'],
  allowedOutputFields: ['report'], deniedOutputFields: [],
  transformationRules: [{ ruleId: 'limit_sources', operation: 'slice_array', path: 'sourceUrls', maximumItems: 3 }],
  redactionRules: [{ ruleId: 'redact_reporter', action: 'replace', path: 'reporterEmail', marker: '[REDACTED]' }], minimizationRules: [],
  allowedDataClassifications: ['public', 'internal', 'confidential'], maximumDataClassification: 'confidential',
  allowedRegions: [], residencyRequirements: [], maximumPayloadBytes: 256000, maximumArrayItems: 100, maximumStringLength: 10000, maximumObjectDepth: 10,
  allowAttachments: false, allowedAttachmentTypes: [], maximumAttachmentBytes: 0, allowFurtherDelegation: false, maximumDelegationDepth: 1,
  requireApproval: false, approvalConditions: {}, retentionPolicy: { mode: 'metadata_only', durationDays: 0 },
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
}, null, 2);

export function DataContracts() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, items: [] });
  const [draft, setDraft] = useState(starter); const [busy, setBusy] = useState(false);
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }), [identity.receivingWorkspaceId]);
  const load = useCallback(() => { if (!partnerConfigured) return setState({ loading: false, error: null, items: [] }); setState((value) => ({ ...value, loading: true, error: null })); apiClient.get(`/inter-agent-contracts?${query}`).then((data) => setState({ loading: false, error: null, items: data.items || [] })).catch((error) => setState({ loading: false, error, items: [] })); }, [partnerConfigured, query]);
  useEffect(() => load(), [load]);
  async function create(event) { event.preventDefault(); setBusy(true); try { const item = await apiClient.post('/inter-agent-contracts', { ...JSON.parse(draft), workspaceId: identity.receivingWorkspaceId }); recordEvent('Data contract draft created', `${item.name} v${item.version}`, 'success'); load(); } catch (error) { setState((value) => ({ ...value, error })); } finally { setBusy(false); } }
  return <><PageHeader eyebrow="Scoped inter-agent data" title="Data Contracts" description="Immutable schema-bound versions control exactly which fields may move between selected agents." actions={<SecondaryButton onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</SecondaryButton>} />{state.error ? <ErrorAlert error={state.error} title="Data contract request failed" /> : null}<div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"><div>{state.loading ? <LoadingBlock label="Loading data contracts" /> : null}{state.items.length ? <div className="overflow-x-auto border border-slate-200 bg-white"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Name</th><th>Version</th><th>Status</th><th>Source</th><th>Target</th><th>Capability</th><th>Ceiling</th><th>Approval</th><th>Expiration</th><th>Updated</th><th>Action</th></tr></thead><tbody className="divide-y">{state.items.map((item) => <tr key={item.contractId}><td className="px-4 py-3 font-medium">{item.name}</td><td>v{item.version}</td><td><StatusBadge tone={item.status === 'active' ? 'ready' : 'pending'}>{item.status}</StatusBadge></td><td className="font-mono text-xs">{item.sourceCapability}</td><td className="font-mono text-xs">{item.targetCapability}</td><td>{item.targetOperation}</td><td>{item.maximumDataClassification}</td><td>{item.requireApproval ? 'Required' : 'Policy'}</td><td className="text-xs">{formatDate(item.expiresAt)}</td><td className="text-xs">{formatDate(item.updatedAt)}</td><td><Link className="font-medium text-cyan-800" to={`/data-contracts/${item.contractId}`}>Open</Link></td></tr>)}</tbody></table></div> : !state.loading ? <EmptyState title="No data contracts" detail="Create a bounded draft, validate it, and activate an immutable version." /> : null}</div><Panel><h2 className="font-semibold">Create contract draft</h2><p className="mt-1 text-xs text-slate-500">Fixed schemas, selectors, mappings, transformations, redaction, minimization, classification, residency, approval, depth, and retention only.</p><form onSubmit={create} className="mt-4 space-y-4"><JsonEditor label="Contract JSON" value={draft} onChange={setDraft} rows={28} /><PrimaryButton type="submit" className="w-full" disabled={busy}><Plus className="h-4 w-4" /> Create draft</PrimaryButton></form></Panel></div></>;
}
