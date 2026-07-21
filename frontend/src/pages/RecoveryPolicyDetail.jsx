import { Archive, CheckCircle2, Save, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { JsonEditor } from '../components/JsonEditor.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, PageHeader, Panel, PrimaryButton, SecondaryButton } from './pageChrome.jsx';

const EDITABLE_FIELDS = [
  'name',
  'description',
  'defaultFailureStrategy',
  'maximumRecoveryAttempts',
  'maximumCompensationAttempts',
  'recoveryBackoffPolicy',
  'compensationBackoffPolicy',
  'recoveryDeadlineMs',
  'compensationDeadlineMs',
  'allowOperatorRetry',
  'allowOperatorSkip',
  'allowOperatorResume',
  'allowOperatorCompensate',
  'allowOperatorTerminate',
  'allowOperatorAgentReplacement',
  'allowOperatorInputCorrection',
  'requireApprovalForRetry',
  'requireApprovalForSkip',
  'requireApprovalForCompensation',
  'requireApprovalForAgentReplacement',
  'requireApprovalForInputCorrection',
  'requireApprovalForForceTermination',
  'permittedFailureCategories',
  'nonRecoverableFailureCategories',
  'automaticCompensation',
  'compensateOnCancellation',
  'compensateOnTimeout',
  'compensateOnPolicyRevocation',
  'compensateOnConnectionRevocation',
  'compensationOrdering',
  'continueCompensationAfterFailure',
  'maximumParallelCompensations',
];

function editablePolicy(policy) {
  return Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, policy[field]]));
}

function actionEntry(item, name) {
  const value = item?.availableActions?.[name] ?? item?.actions?.[name];
  if (value === true) return { allowed: true };
  return value && typeof value === 'object' && value.allowed === true ? value : null;
}

function enabledNames(item, names) {
  return names.filter((name) => item?.[name] === true).map((name) => name.replace(/^(?:allowOperator|requireApprovalFor|compensateOn)/, ''));
}

export function RecoveryPolicyDetail() {
  const { policyId } = useParams();
  const navigate = useNavigate();
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: true, error: null, item: null });
  const [editor, setEditor] = useState('{}');
  const [validation, setValidation] = useState(null);
  const [busy, setBusy] = useState('');
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }),
    [identity.receivingWorkspaceId],
  );
  const load = useCallback(() => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null, item: null });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    apiClient.get(`/orchestration-recovery/policies/${policyId}?${query}`)
      .then((item) => {
        setState({ loading: false, error: null, item });
        setEditor(JSON.stringify(editablePolicy(item), null, 2));
      })
      .catch((error) => setState({ loading: false, error, item: null }));
  }, [partnerConfigured, policyId, query]);
  useEffect(() => load(), [load]);

  async function lifecycle(name) {
    setBusy(name);
    try {
      const result = await apiClient.post(
        `/orchestration-recovery/policies/${policyId}/${name}`,
        { workspaceId: identity.receivingWorkspaceId },
      );
      if (name === 'validate') setValidation(result);
      else {
        recordEvent(`Recovery policy ${name}`, `${state.item.name} v${state.item.version}`, 'success');
        load();
      }
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  async function save() {
    setBusy('save');
    try {
      const item = await apiClient.patch(`/orchestration-recovery/policies/${policyId}`, {
        ...JSON.parse(editor),
        workspaceId: identity.receivingWorkspaceId,
      });
      recordEvent('Recovery policy draft saved', `${item.name} v${item.version}`, 'success');
      if (item.policyId && item.policyId !== policyId) navigate(`/recovery-policies/${item.policyId}`);
      else load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  if (state.loading && !state.item) return <LoadingBlock label="Loading recovery policy" />;
  const item = state.item;
  const canUpdate = actionEntry(item, 'update');
  const canValidate = actionEntry(item, 'validate');
  const canActivate = actionEntry(item, 'activate');
  const canArchive = actionEntry(item, 'archive');
  const operatorActions = enabledNames(item, ['allowOperatorRetry', 'allowOperatorSkip', 'allowOperatorResume', 'allowOperatorCompensate', 'allowOperatorTerminate', 'allowOperatorAgentReplacement', 'allowOperatorInputCorrection']);
  const approvals = enabledNames(item, ['requireApprovalForRetry', 'requireApprovalForSkip', 'requireApprovalForCompensation', 'requireApprovalForAgentReplacement', 'requireApprovalForInputCorrection', 'requireApprovalForForceTermination']);
  const cancellation = enabledNames(item, ['compensateOnCancellation', 'compensateOnTimeout', 'compensateOnPolicyRevocation', 'compensateOnConnectionRevocation']);

  return (
    <>
      <PageHeader
        eyebrow="Recovery policy version"
        title={item?.name || 'Policy unavailable'}
        description={item ? `Version ${item.version} · updated ${formatDate(item.updatedAt)}` : ''}
        actions={<Link to="/recovery-policies" className="text-sm font-medium text-cyan-800">Back to recovery policies</Link>}
      />
      {state.error ? <ErrorAlert error={state.error} title="Recovery policy action failed" /> : null}
      {item ? (
        <div className="space-y-6">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3"><StatusBadge tone={item.status === 'active' ? 'ready' : item.status === 'archived' ? 'neutral' : 'pending'}>{item.status}</StatusBadge><span className="font-mono text-xs">{item.defaultFailureStrategy}</span><span className="text-xs text-slate-500">Activation state · {item.status}</span></div>
              <div className="flex flex-wrap gap-2">
                {canValidate ? <SecondaryButton onClick={() => lifecycle('validate')} disabled={Boolean(busy)}><ShieldCheck className="h-4 w-4" /> Validate</SecondaryButton> : null}
                {canActivate ? <PrimaryButton onClick={() => lifecycle('activate')} disabled={Boolean(busy)}><CheckCircle2 className="h-4 w-4" /> Activate</PrimaryButton> : null}
                {canArchive ? <SecondaryButton onClick={() => lifecycle('archive')} disabled={Boolean(busy)}><Archive className="h-4 w-4" /> Archive</SecondaryButton> : null}
              </div>
            </div>
          </Panel>
          {validation ? (
            <Panel className={validation.valid ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}>
              <h2 className="font-semibold">Validation results</h2>
              <p className="mt-1 text-sm">{validation.valid ? 'This version is ready for activation.' : 'Resolve the bounded validation errors before activation.'}</p>
              <ul className="mt-3 space-y-1 text-sm">{(validation.errors || []).map((error, index) => <li key={`${error.path || 'policy'}_${index}`}><span className="font-mono text-xs">{error.code}</span> · {error.path}: {error.message}</li>)}</ul>
            </Panel>
          ) : null}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
            <Panel>
              <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Bounded policy editor</h2><p className="text-xs text-slate-500">Saving an active version creates a new draft version.</p></div>{canUpdate ? <SecondaryButton onClick={save} disabled={Boolean(busy) || item.status === 'archived'}><Save className="h-4 w-4" /> Save</SecondaryButton> : null}</div>
              <JsonEditor label="Recovery policy JSON" value={editor} onChange={setEditor} rows={36} />
            </Panel>
            <div className="space-y-4">
              <SummaryPanel title="Default failure strategy"><SummaryRow label="Strategy" value={item.defaultFailureStrategy} mono /><SummaryRow label="Retry limits" value={item.maximumRecoveryAttempts} /><SummaryRow label="Compensation limits" value={item.maximumCompensationAttempts} /></SummaryPanel>
              <SummaryPanel title="Deadlines"><SummaryRow label="Recovery" value={`${item.recoveryDeadlineMs} ms`} /><SummaryRow label="Compensation" value={`${item.compensationDeadlineMs} ms`} /></SummaryPanel>
              <SummaryPanel title="Automatic-recovery categories"><SummaryRow label="Permitted" value={item.permittedFailureCategories?.join(', ') || 'None'} /><SummaryRow label="Non-recoverable categories" value={item.nonRecoverableFailureCategories?.join(', ') || 'None'} /></SummaryPanel>
              <SummaryPanel title="Operator permissions"><SummaryRow label="Enabled" value={operatorActions.join(', ') || 'None'} /><SummaryRow label="Approval requirements" value={approvals.join(', ') || 'None'} /></SummaryPanel>
              <SummaryPanel title="Compensation ordering"><SummaryRow label="Ordering" value={item.compensationOrdering} mono /><SummaryRow label="Parallel compensation" value={item.maximumParallelCompensations} /><SummaryRow label="Continue after failure" value={item.continueCompensationAfterFailure ? 'Yes' : 'No'} /></SummaryPanel>
              <SummaryPanel title="Cancellation behavior"><SummaryRow label="Automatic compensation" value={item.automaticCompensation ? 'Enabled' : 'Disabled'} /><SummaryRow label="Configured triggers" value={cancellation.join(', ') || 'None'} /></SummaryPanel>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SummaryPanel({ title, children }) {
  return <Panel><h2 className="text-sm font-semibold text-slate-950">{title}</h2><dl className="mt-3 space-y-3">{children}</dl></Panel>;
}

function SummaryRow({ label, value, mono = false }) {
  return <div><dt className="text-xs uppercase text-slate-500">{label}</dt><dd className={`mt-1 break-words text-sm ${mono ? 'font-mono text-xs' : ''}`}>{value ?? '-'}</dd></div>;
}
