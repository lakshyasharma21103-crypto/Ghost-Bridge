import {
  Archive,
  CheckCircle2,
  FileCheck2,
  Gavel,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import {
  FieldLabel,
  PageHeader,
  Panel,
  PrimaryButton,
  SecondaryButton,
  formatDate,
} from './pageChrome.jsx';

const DEFAULT_WORKFLOW = {
  name: '',
  description: '',
  permission: 'connection.invoke',
  requiredDecisionCount: 1,
  expirationMinutes: 60,
};

function tone(status) {
  return (
    {
      ACTIVE: 'ready',
      APPROVED: 'ready',
      COMPLETED: 'ready',
      VALID: 'ready',
      PENDING: 'pending',
      PARTIALLY_APPROVED: 'pending',
      RUNNING: 'pending',
      DRAFT: 'pending',
      REJECTED: 'offline',
      FAILED: 'offline',
      INVALID: 'offline',
      EXPIRED: 'neutral',
      RETIRED: 'neutral',
      CANCELLED: 'neutral',
      CONSUMED: 'neutral',
    }[status] || 'neutral'
  );
}

export function Compliance() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: true, error: null });
  const [requests, setRequests] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [exports, setExports] = useState([]);
  const [holds, setHolds] = useState([]);
  const [retentionPolicies, setRetentionPolicies] = useState([]);
  const [controls, setControls] = useState([]);
  const [report, setReport] = useState(null);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(DEFAULT_WORKFLOW);
  const [busy, setBusy] = useState('');
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }),
    [identity.receivingWorkspaceId],
  );

  const load = useCallback(async () => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null });
      return;
    }
    setState({ loading: true, error: null });
    try {
      const [
        requestData,
        workflowData,
        exportData,
        holdData,
        retentionData,
        controlData,
        reportData,
      ] = await Promise.all([
        apiClient.get(`/approvals/requests?${query}`),
        apiClient.get(`/approvals/workflows?${query}`),
        apiClient.get(`/evidence/exports?${query}`),
        apiClient.get(`/evidence/legal-holds?${query}`),
        apiClient.get(`/evidence/retention?${query}`),
        apiClient.get(`/evidence/controls?${query}`),
        apiClient.get(`/evidence/reports?${query}`),
      ]);
      setRequests(requestData.items || []);
      setWorkflows(workflowData.items || []);
      setExports(exportData.items || []);
      setHolds(holdData.items || []);
      setRetentionPolicies(retentionData.items || []);
      setControls(controlData.items || []);
      setReport(reportData);
      setState({ loading: false, error: null });
    } catch (error) {
      setState({ loading: false, error });
    }
  }, [partnerConfigured, query]);

  useEffect(() => void load(), [load]);

  async function decide(request, decision) {
    const irreversible = request.fingerprintSummary?.operationType === 'INVOCATION';
    if (
      !window.confirm(
        `${decision === 'APPROVE' ? 'Approve' : 'Reject'} ${request.permission} on ${request.resourceType}?${irreversible ? ' The action may have irreversible side effects.' : ''}`,
      )
    )
      return;
    setBusy(request.approvalRequestId);
    try {
      const data = await apiClient.post(
        `/approvals/requests/${request.approvalRequestId}/${decision.toLowerCase()}`,
        {
          workspaceId: identity.receivingWorkspaceId,
          approverActorId: identity.receivingUserId,
          comment: `${decision} recorded in the compliance console.`,
        },
      );
      setSelected(data);
      recordEvent(`Approval ${decision.toLowerCase()}d`, request.permission, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  async function createWorkflow(event) {
    event.preventDefault();
    setBusy('workflow');
    try {
      await apiClient.post('/approvals/workflows', {
        workspaceId: identity.receivingWorkspaceId,
        name: draft.name,
        description: draft.description,
        expirationMs: Number(draft.expirationMinutes) * 60_000,
        target: { permissionIds: [draft.permission] },
        stages: [
          {
            stageId: 'primary_review',
            name: 'Primary review',
            requiredDecisionCount: Number(draft.requiredDecisionCount),
            distinctApprovers: true,
            excludeRequester: true,
            eligibleApprovers: {
              permissionIds: ['approval.request.approve'],
              requireHuman: true,
              requireWorkspaceMembership: true,
            },
          },
        ],
      });
      setDraft(DEFAULT_WORKFLOW);
      recordEvent('Approval workflow drafted', draft.name, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  async function activate(workflow) {
    if (
      !window.confirm(
        `Activate ${workflow.name} v${workflow.version}? The activated version becomes immutable.`,
      )
    )
      return;
    setBusy(workflow.id);
    try {
      await apiClient.post(
        `/approvals/workflows/${workflow.stableWorkflowId}/versions/${workflow.version}/activate`,
        { workspaceId: identity.receivingWorkspaceId, expectedRevision: workflow.revision },
      );
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  async function createExport() {
    if (
      !window.confirm(
        'Create a bounded evidence export for the current workspace? Private payloads and secrets are excluded.',
      )
    )
      return;
    setBusy('export');
    try {
      await apiClient.post('/evidence/exports', {
        workspaceId: identity.receivingWorkspaceId,
      });
      recordEvent('Evidence export queued', identity.receivingWorkspaceId, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Compliance governance"
        title="Approvals & evidence"
        description="Separation-of-duties workflows, normalized audit integrity, retention controls, legal holds, and bounded evidence exports."
        actions={
          <SecondaryButton onClick={load} disabled={state.loading}>
            <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
            Refresh
          </SecondaryButton>
        }
      />
      {!partnerConfigured ? (
        <div className="mb-6 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Configure a{' '}
          <Link to="/settings" className="font-semibold underline">
            Partner API key
          </Link>{' '}
          to administer compliance controls.
        </div>
      ) : null}
      {state.error ? <ErrorAlert error={state.error} title="Compliance request failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading compliance controls" /> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <Gavel className="h-5 w-5 text-cyan-700" />
            <div>
              <p className="font-semibold text-slate-950">Approval inbox</p>
              <p className="text-sm text-slate-600">
                Requests are bound to an exact fingerprint and expire automatically.
              </p>
            </div>
          </div>
          {requests.length ? (
            <div className="divide-y divide-slate-200">
              {requests.map((request) => (
                <div key={request.approvalRequestId} className="py-4">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setSelected(request)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-950">{request.permission}</span>
                      <StatusBadge tone={tone(request.status)}>{request.status}</StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {request.requesterActorId} · {request.resourceType} · {request.resourceId}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Expires {formatDate(request.expiresAt)}
                    </p>
                  </button>
                  {['PENDING', 'PARTIALLY_APPROVED'].includes(request.status) ? (
                    <div className="mt-3 flex gap-2">
                      <PrimaryButton
                        onClick={() => decide(request, 'APPROVE')}
                        disabled={Boolean(busy)}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </PrimaryButton>
                      <SecondaryButton
                        onClick={() => decide(request, 'REJECT')}
                        disabled={Boolean(busy)}
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </SecondaryButton>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No approval requests"
              detail="Requests appear here only when an active workflow matches an authorized action."
            />
          )}
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-cyan-700" />
            <div>
              <p className="font-semibold text-slate-950">Workflow versions</p>
              <p className="text-sm text-slate-600">
                Approval adds control; it never overrides RBAC or policy deny.
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-200">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-slate-950">
                    {workflow.name} <span className="text-slate-400">v{workflow.version}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {workflow.stages.length} stage(s) · revision {workflow.revision}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={tone(workflow.status)}>{workflow.status}</StatusBadge>
                  {workflow.status === 'DRAFT' ? (
                    <SecondaryButton onClick={() => activate(workflow)} disabled={Boolean(busy)}>
                      Activate
                    </SecondaryButton>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <form className="mt-5 space-y-3 border-t border-slate-200 pt-5" onSubmit={createWorkflow}>
            <p className="font-semibold text-slate-950">Create workflow draft</p>
            <label className="block">
              <FieldLabel>Name</FieldLabel>
              <input
                required
                maxLength="200"
                className="w-full border border-slate-300 px-3 py-2 text-sm"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </label>
            <label className="block">
              <FieldLabel>Description</FieldLabel>
              <input
                maxLength="2000"
                className="w-full border border-slate-300 px-3 py-2 text-sm"
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="col-span-2">
                <FieldLabel>Permission ID</FieldLabel>
                <input
                  className="w-full border border-slate-300 px-3 py-2 font-mono text-sm"
                  value={draft.permission}
                  onChange={(event) => setDraft({ ...draft, permission: event.target.value })}
                />
              </label>
              <label>
                <FieldLabel>Approvers</FieldLabel>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="w-full border border-slate-300 px-3 py-2 text-sm"
                  value={draft.requiredDecisionCount}
                  onChange={(event) =>
                    setDraft({ ...draft, requiredDecisionCount: event.target.value })
                  }
                />
              </label>
            </div>
            <PrimaryButton type="submit" disabled={busy === 'workflow' || !partnerConfigured}>
              Create draft
            </PrimaryButton>
          </form>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold text-slate-950">
              <Archive className="h-5 w-5 text-cyan-700" />
              Evidence exports
            </span>
            <PrimaryButton onClick={createExport} disabled={Boolean(busy)}>
              Create export
            </PrimaryButton>
          </div>
          {exports.length ? (
            exports.map((item) => (
              <div
                key={item.evidenceExportId}
                className="flex items-center justify-between border-t border-slate-200 py-3"
              >
                <div>
                  <p className="font-mono text-xs text-slate-700">{item.evidenceExportId}</p>
                  <p className="text-xs text-slate-500">
                    {item.eventCount ?? 0} events · {formatDate(item.requestedAt)}
                  </p>
                </div>
                <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>
              </div>
            ))
          ) : (
            <EmptyState
              title="No evidence exports"
              detail="Exports contain normalized redacted events, manifests, digests, and checkpoint references."
            />
          )}
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <FileCheck2 className="h-5 w-5 text-cyan-700" />
            Control status
          </div>
          <p className="mb-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            Control mappings are informational implementation evidence and do not constitute
            certification.
          </p>
          <div className="max-h-72 divide-y divide-slate-200 overflow-auto">
            {controls.map((control) => (
              <div key={control.controlId} className="py-3">
                <div className="flex justify-between gap-3">
                  <span className="font-mono text-xs font-semibold text-cyan-800">
                    {control.controlId}
                  </span>
                  <StatusBadge tone="ready">{control.implementationStatus}</StatusBadge>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-900">{control.title}</p>
                <p className="mt-1 text-xs text-slate-500">{control.limitations}</p>
              </div>
            ))}
          </div>
          {report ? (
            <p className="mt-4 text-xs text-slate-500">
              Active legal holds: {report.activeLegalHolds} · authorization denials:{' '}
              {report.authorizationDenials}
            </p>
          ) : null}
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <Archive className="h-5 w-5 text-cyan-700" />
            Retention & legal holds
          </div>
          <p className="mb-3 text-sm text-slate-600">
            Deletion is dry-run first and excludes evidence covered by active holds or active export
            references.
          </p>
          <div className="divide-y divide-slate-200">
            {retentionPolicies.map((policy) => (
              <div
                key={`${policy.retentionPolicyId}:${policy.version}`}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium text-slate-950">{policy.eventCategory}</p>
                  <p className="text-xs text-slate-500">
                    {policy.retentionDays} days ·{' '}
                    {policy.deletionEligible ? 'deletion eligible' : 'preserve only'}
                  </p>
                </div>
                <StatusBadge tone={tone(policy.status)}>{policy.status}</StatusBadge>
              </div>
            ))}
            {holds.map((hold) => (
              <div key={hold.legalHoldId} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-slate-950">{hold.name}</p>
                  <p className="text-xs text-slate-500">
                    Legal hold · effective {formatDate(hold.effectiveFrom)}
                  </p>
                </div>
                <StatusBadge tone={tone(hold.status)}>{hold.status}</StatusBadge>
              </div>
            ))}
          </div>
          {!retentionPolicies.length && !holds.length ? (
            <EmptyState
              title="No retention controls"
              detail="Retention policies and legal holds appear here after they are configured through the protected compliance API."
            />
          ) : null}
        </Panel>
      </div>

      {selected ? (
        <Panel className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-slate-950">Request evidence</p>
            <button type="button" className="text-sm underline" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
            <div>
              <FieldLabel>Action</FieldLabel>
              <p>{selected.permission}</p>
            </div>
            <div>
              <FieldLabel>Workflow stage</FieldLabel>
              <p>
                {selected.workflowId} / {selected.currentStageSequence}
              </p>
            </div>
            <div>
              <FieldLabel>Policy result</FieldLabel>
              <p>{selected.policySnapshot?.decision || 'ALLOW'}</p>
            </div>
            <div>
              <FieldLabel>Fingerprint</FieldLabel>
              <p className="break-all font-mono text-xs">{selected.requestFingerprint}</p>
            </div>
            <div>
              <FieldLabel>Approvals received</FieldLabel>
              <p>{selected.decisions?.filter((item) => item.decision === 'APPROVE').length || 0}</p>
            </div>
            <div>
              <FieldLabel>Recovery risk</FieldLabel>
              <p>
                {selected.fingerprintSummary?.operationType === 'RECOVERY_RETRY'
                  ? 'External side effect may already have occurred.'
                  : 'No known recovery risk recorded.'}
              </p>
            </div>
          </div>
        </Panel>
      ) : null}
    </>
  );
}
