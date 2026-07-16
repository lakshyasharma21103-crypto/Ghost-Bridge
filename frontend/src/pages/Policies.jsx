import { AlertTriangle, CheckCircle2, Play, Plus, RefreshCw, Shield, XCircle } from 'lucide-react';
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

const DEFAULT_DRAFT = {
  name: '',
  description: '',
  effect: 'DENY',
  priority: 0,
  scope: 'workspace',
  permission: 'connection.invoke',
  attribute: 'capability.sideEffect',
  operator: 'EQUALS',
  value: 'IRREVERSIBLE',
};

function typedConditionValue(draft) {
  if (['IN', 'NOT_IN'].includes(draft.operator)) {
    return draft.value
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  if (draft.value === 'true') return true;
  if (draft.value === 'false') return false;
  if (draft.attribute === 'request.hour' && draft.value.trim() !== '') {
    return Number(draft.value);
  }
  return draft.value;
}

function statusTone(status) {
  return { ACTIVE: 'ready', DRAFT: 'pending', RETIRED: 'neutral' }[status] || 'neutral';
}

export function Policies() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: true, error: null, items: [] });
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [editing, setEditing] = useState(null);

  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }),
    [identity.receivingWorkspaceId],
  );
  const load = useCallback(() => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null, items: [] });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    apiClient
      .get(`/policies?${query}`)
      .then((data) => {
        setState({ loading: false, error: null, items: data.items || [] });
        setSelected(
          (current) => current && (data.items || []).find((item) => item.id === current.id),
        );
      })
      .catch((error) => setState({ loading: false, error, items: [] }));
  }, [partnerConfigured, query]);

  useEffect(() => load(), [load]);
  useEffect(() => {
    if (!partnerConfigured) return;
    apiClient
      .get(`/policies/attributes?${query}`)
      .then((data) => setAttributes(data.attributes || []))
      .catch(() => setAttributes([]));
  }, [partnerConfigured, query]);

  async function create(event) {
    event.preventDefault();
    setBusy('create');
    setResult(null);
    try {
      const payload = {
        workspaceId: identity.receivingWorkspaceId,
        policyWorkspaceId: draft.scope === 'workspace' ? identity.receivingWorkspaceId : null,
        name: draft.name,
        description: draft.description,
        effect: draft.effect,
        priority: Number(draft.priority),
        target: { permissionIds: [draft.permission] },
        condition: {
          operator: draft.operator,
          attribute: draft.attribute,
          ...(draft.operator === 'EXISTS' || draft.operator === 'NOT_EXISTS'
            ? {}
            : { value: typedConditionValue(draft) }),
        },
      };
      const created = editing
        ? await apiClient.patch(`/policies/${editing.stablePolicyId}/versions/${editing.version}`, {
            ...payload,
            expectedRevision: editing.revision,
          })
        : await apiClient.post('/policies', payload);
      setSelected(created);
      setDraft(DEFAULT_DRAFT);
      setEditing(null);
      recordEvent(
        editing ? 'Policy draft updated' : 'Policy draft created',
        `${created.name} v${created.version}`,
        'success',
      );
      load();
    } catch (error) {
      setResult({ error });
    } finally {
      setBusy('');
    }
  }

  function beginEdit(policy) {
    const leaf = policy.condition || {};
    if (Array.isArray(leaf.conditions)) {
      setResult({
        error: new Error(
          'This compound condition remains available through the policy API; the compact editor edits leaf conditions only.',
        ),
      });
      return;
    }
    setEditing(policy);
    setDraft({
      name: policy.name,
      description: policy.description || '',
      effect: policy.effect,
      priority: policy.priority,
      scope: policy.workspaceId ? 'workspace' : 'organization',
      permission: policy.target?.permissionIds?.[0] || 'connection.invoke',
      attribute: leaf.attribute || 'actor.type',
      operator: leaf.operator || 'EQUALS',
      value: Array.isArray(leaf.value) ? leaf.value.join(', ') : String(leaf.value ?? ''),
    });
  }

  async function createVersion() {
    if (!selected) return;
    setBusy('version');
    try {
      const created = await apiClient.post(`/policies/${selected.stablePolicyId}/versions`, {
        workspaceId: identity.receivingWorkspaceId,
        policyWorkspaceId: selected.workspaceId || null,
        changeSummary: `Drafted from version ${selected.version}`,
      });
      setSelected(created);
      beginEdit(created);
      load();
    } catch (error) {
      setResult({ error });
    } finally {
      setBusy('');
    }
  }

  async function action(name, suffix, body = {}) {
    if (!selected) return;
    setBusy(name);
    setResult(null);
    try {
      const data = await apiClient.post(
        `/policies/${selected.stablePolicyId}/versions/${selected.version}/${suffix}`,
        { workspaceId: identity.receivingWorkspaceId, ...body },
      );
      setResult({ name, data });
      recordEvent(`Policy ${name}`, `${selected.name} v${selected.version}`, 'success');
      if (name !== 'simulated' && name !== 'validated') load();
    } catch (error) {
      setResult({ error });
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Conditional governance"
        title="Policies"
        description="Versioned restrictions evaluated after RBAC and before credentials, durable work, or external execution."
        actions={
          <SecondaryButton onClick={load} disabled={state.loading}>
            <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
            Refresh
          </SecondaryButton>
        }
      />
      {!partnerConfigured ? (
        <div className="mb-6 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <AlertTriangle className="mr-2 inline h-4 w-4" />
          Configure a{' '}
          <Link to="/settings" className="font-semibold underline">
            Partner API key
          </Link>{' '}
          to administer policies.
        </div>
      ) : null}
      {state.error ? <ErrorAlert error={state.error} title="Could not load policies" /> : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Panel>
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <Shield className="h-5 w-5 text-cyan-700" />
            <div>
              <p className="font-semibold text-slate-950">Policy versions</p>
              <p className="text-sm text-slate-600">
                Explicit deny always wins. Active versions cannot be edited.
              </p>
            </div>
          </div>
          {state.loading ? <LoadingBlock label="Loading policies" /> : null}
          {!state.loading && state.items.length ? (
            <div className="divide-y divide-slate-200">
              {state.items.map((policy) => (
                <button
                  key={policy.id}
                  type="button"
                  onClick={() => {
                    setSelected(policy);
                    setResult(null);
                  }}
                  className={`w-full px-1 py-4 text-left ${selected?.id === policy.id ? 'bg-cyan-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-medium text-slate-950">
                      {policy.name} <span className="text-slate-400">v{policy.version}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={policy.effect === 'DENY' ? 'offline' : 'ready'}>
                        {policy.effect}
                      </StatusBadge>
                      <StatusBadge tone={statusTone(policy.status)}>{policy.status}</StatusBadge>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {policy.description || 'No description'} · priority {policy.priority}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Revision {policy.revision} · {formatDate(policy.updatedAt)}
                  </p>
                </button>
              ))}
            </div>
          ) : null}
          {!state.loading && !state.items.length ? (
            <EmptyState
              title="No conditional policies"
              detail="RBAC decisions remain unchanged until an active policy applies."
            />
          ) : null}
        </Panel>

        <div className="space-y-6">
          {selected ? (
            <Panel>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{selected.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selected.stablePolicyId} / schema v{selected.schemaVersion}
                  </p>
                </div>
                {selected.effect === 'DENY' ? (
                  <XCircle className="h-5 w-5 text-rose-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                )}
              </div>
              {selected.effect === 'DENY' ? (
                <p className="mt-4 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                  This version can explicitly block matching actions, even when an ALLOW policy also
                  matches.
                </p>
              ) : null}
              <pre className="mt-4 max-h-64 overflow-auto bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                {JSON.stringify(
                  { target: selected.target, condition: selected.condition },
                  null,
                  2,
                )}
              </pre>
              {selected.status === 'DRAFT' ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <SecondaryButton onClick={() => beginEdit(selected)} disabled={Boolean(busy)}>
                    Edit draft
                  </SecondaryButton>
                  <SecondaryButton
                    onClick={() => action('validated', 'validate')}
                    disabled={Boolean(busy)}
                  >
                    Validate
                  </SecondaryButton>
                  <SecondaryButton
                    onClick={() =>
                      action('simulated', 'simulate', {
                        permission: selected.target?.permissionIds?.[0] || 'policy.read',
                        resourceType: 'Policy',
                      })
                    }
                    disabled={Boolean(busy)}
                  >
                    <Play className="h-4 w-4" />
                    Simulate
                  </SecondaryButton>
                  <PrimaryButton
                    className="col-span-2"
                    onClick={() =>
                      action('activated', 'activate', { expectedRevision: selected.revision })
                    }
                    disabled={Boolean(busy)}
                  >
                    Activate revision {selected.revision}
                  </PrimaryButton>
                </div>
              ) : null}
              {selected.status === 'ACTIVE' ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <SecondaryButton onClick={createVersion} disabled={Boolean(busy)}>
                    Create draft version
                  </SecondaryButton>
                  <SecondaryButton
                    onClick={() =>
                      action('retired', 'retire', { expectedRevision: selected.revision })
                    }
                    disabled={Boolean(busy)}
                  >
                    Retire active version
                  </SecondaryButton>
                </div>
              ) : null}
              {result?.error ? (
                <div className="mt-4">
                  <ErrorAlert error={result.error} title="Policy action failed" />
                </div>
              ) : null}
              {result?.data ? (
                <pre className="mt-4 max-h-56 overflow-auto border border-slate-200 bg-slate-50 p-3 text-xs leading-5">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              ) : null}
            </Panel>
          ) : null}

          <Panel>
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-cyan-700" />
                <span className="font-semibold text-slate-950">
                  {editing ? `Edit ${editing.name} v${editing.version}` : 'Create draft'}
                </span>
              </span>
              {editing ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-slate-500 underline"
                  onClick={() => {
                    setEditing(null);
                    setDraft(DEFAULT_DRAFT);
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
            <form className="space-y-4" onSubmit={create}>
              <label className="block">
                <FieldLabel>Name</FieldLabel>
                <input
                  className="w-full border border-slate-300 px-3 py-2 text-sm"
                  required
                  maxLength={200}
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </label>
              <label className="block">
                <FieldLabel>Description</FieldLabel>
                <input
                  className="w-full border border-slate-300 px-3 py-2 text-sm"
                  maxLength={2000}
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <FieldLabel>Effect</FieldLabel>
                  <select
                    className="w-full border border-slate-300 px-3 py-2 text-sm"
                    value={draft.effect}
                    onChange={(event) => setDraft({ ...draft, effect: event.target.value })}
                  >
                    <option>DENY</option>
                    <option>ALLOW</option>
                  </select>
                </label>
                <label>
                  <FieldLabel>Priority</FieldLabel>
                  <input
                    type="number"
                    min="-10000"
                    max="10000"
                    className="w-full border border-slate-300 px-3 py-2 text-sm"
                    value={draft.priority}
                    onChange={(event) => setDraft({ ...draft, priority: event.target.value })}
                  />
                </label>
              </div>
              <label className="block">
                <FieldLabel>Tenant scope</FieldLabel>
                <select
                  className="w-full border border-slate-300 px-3 py-2 text-sm"
                  value={draft.scope}
                  onChange={(event) => setDraft({ ...draft, scope: event.target.value })}
                >
                  <option value="workspace">Current workspace</option>
                  <option value="organization">Entire organization</option>
                </select>
              </label>
              <label className="block">
                <FieldLabel>Permission ID</FieldLabel>
                <input
                  className="w-full border border-slate-300 px-3 py-2 font-mono text-sm"
                  value={draft.permission}
                  onChange={(event) => setDraft({ ...draft, permission: event.target.value })}
                />
              </label>
              <div className="border border-slate-200 bg-slate-50 p-3">
                <p className="mb-3 text-xs font-semibold uppercase text-slate-500">
                  Condition leaf
                </p>
                <label className="block">
                  <FieldLabel>Trusted attribute</FieldLabel>
                  <input
                    list="policy-attributes"
                    className="w-full border border-slate-300 px-3 py-2 font-mono text-sm"
                    value={draft.attribute}
                    onChange={(event) => setDraft({ ...draft, attribute: event.target.value })}
                  />
                  <datalist id="policy-attributes">
                    {attributes.map((attribute) => (
                      <option key={attribute.id} value={attribute.id} />
                    ))}
                  </datalist>
                </label>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label>
                    <FieldLabel>Operator</FieldLabel>
                    <select
                      className="w-full border border-slate-300 px-3 py-2 text-sm"
                      value={draft.operator}
                      onChange={(event) => setDraft({ ...draft, operator: event.target.value })}
                    >
                      {[
                        'EQUALS',
                        'NOT_EQUALS',
                        'IN',
                        'NOT_IN',
                        'EXISTS',
                        'NOT_EXISTS',
                        'STARTS_WITH',
                        'ENDS_WITH',
                        'CONTAINS',
                        'LESS_THAN',
                        'LESS_THAN_OR_EQUAL',
                        'GREATER_THAN',
                        'GREATER_THAN_OR_EQUAL',
                      ].map((operator) => (
                        <option key={operator}>{operator}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <FieldLabel>Value</FieldLabel>
                    <input
                      className="w-full border border-slate-300 px-3 py-2 text-sm"
                      disabled={['EXISTS', 'NOT_EXISTS'].includes(draft.operator)}
                      value={draft.value}
                      onChange={(event) => setDraft({ ...draft, value: event.target.value })}
                    />
                  </label>
                </div>
              </div>
              <PrimaryButton
                type="submit"
                className="w-full"
                disabled={busy === 'create' || !partnerConfigured}
              >
                <Plus className="h-4 w-4" />
                {editing ? `Save revision ${editing.revision}` : 'Create draft'}
              </PrimaryButton>
            </form>
          </Panel>
          <Panel>
            <details>
              <summary className="cursor-pointer font-semibold text-slate-950">
                Trusted attribute catalog ({attributes.length})
              </summary>
              <div className="mt-4 max-h-72 divide-y divide-slate-200 overflow-auto">
                {attributes.map((attribute) => (
                  <div key={attribute.id} className="py-3">
                    <p className="font-mono text-xs font-semibold text-cyan-800">{attribute.id}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {attribute.valueType} · {attribute.allowedOperators.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          </Panel>
        </div>
      </div>
    </>
  );
}
