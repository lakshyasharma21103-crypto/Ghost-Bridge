import { AlertTriangle, Ban, KeyRound, Plus, RefreshCw, RotateCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const inputClass =
  'mt-1 min-h-10 w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-cyan-700';

function statusTone(status) {
  return (
    {
      ACTIVE: 'ready',
      HEALTHY: 'ready',
      PENDING: 'pending',
      UNKNOWN: 'pending',
      DISABLED: 'neutral',
      PREVIOUS: 'neutral',
      REVOKED: 'failed',
      EXPIRED: 'failed',
      DESTROYED: 'failed',
      INVALID: 'failed',
    }[status] || 'neutral'
  );
}

export function Secrets() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: true, error: null, items: [] });
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState({ versions: [], bindings: [], rotations: [], health: null });
  const [keyUsage, setKeyUsage] = useState(null);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState(null);
  const secretInput = useRef(null);
  const replacementInput = useRef(null);
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
    Promise.all([
      apiClient.get(`/secrets?${query}`),
      apiClient.get(`/secrets/encryption-keys/usage?${query}`),
    ])
      .then(([secrets, usage]) => {
        const items = secrets.items || [];
        setState({ loading: false, error: null, items });
        setKeyUsage(usage);
        setSelected((current) =>
          current ? items.find((item) => item.secretId === current.secretId) || null : null,
        );
      })
      .catch((error) => setState({ loading: false, error, items: [] }));
  }, [partnerConfigured, query]);

  const loadDetail = useCallback(
    async (secret) => {
      if (!secret) {
        setDetail({ versions: [], bindings: [], rotations: [], health: null });
        return;
      }
      setBusy('detail');
      setActionError(null);
      try {
        const [versions, bindings, rotations, health] = await Promise.all([
          apiClient.get(`/secrets/${secret.secretId}/versions?${query}`),
          apiClient.get(`/secrets/${secret.secretId}/bindings?${query}`),
          apiClient.get(`/secrets/${secret.secretId}/rotations?${query}`),
          apiClient.get(`/secrets/${secret.secretId}/health?${query}`),
        ]);
        setDetail({
          versions: versions.items || [],
          bindings: bindings.items || [],
          rotations: rotations.items || [],
          health,
        });
      } catch (error) {
        setActionError(error);
      } finally {
        setBusy('');
      }
    },
    [query],
  );

  useEffect(() => load(), [load]);
  useEffect(() => {
    void loadDetail(selected);
  }, [loadDetail, selected]);

  async function createSecret(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    let credential = String(form.get('credential') || '');
    if (secretInput.current) secretInput.current.value = '';
    setBusy('create');
    setActionError(null);
    try {
      const created = await apiClient.post('/secrets', {
        workspaceId: identity.receivingWorkspaceId,
        policyWorkspaceId: identity.receivingWorkspaceId,
        name: form.get('name'),
        provider: form.get('provider'),
        credentialType: form.get('credentialType'),
        credential,
      });
      formElement.reset();
      setSelected(created);
      recordEvent('Secret created', created.safeFingerprint || created.secretId, 'success');
      load();
    } catch (error) {
      setActionError(error);
    } finally {
      credential = '';
      setBusy('');
      if (secretInput.current) secretInput.current.value = '';
    }
  }

  async function rotate(event) {
    event.preventDefault();
    if (!selected) return;
    let credential = String(new FormData(event.currentTarget).get('credential') || '');
    if (replacementInput.current) replacementInput.current.value = '';
    setBusy('rotate');
    setActionError(null);
    try {
      await apiClient.post(`/secrets/${selected.secretId}/rotate`, {
        workspaceId: identity.receivingWorkspaceId,
        credential,
        idempotencyKey: crypto.randomUUID(),
      });
      recordEvent('Credential rotated', selected.name, 'success');
      load();
      await loadDetail(selected);
    } catch (error) {
      setActionError(error);
    } finally {
      credential = '';
      setBusy('');
      if (replacementInput.current) replacementInput.current.value = '';
    }
  }

  async function action(name, suffix) {
    if (!selected) return;
    setBusy(name);
    setActionError(null);
    try {
      await apiClient.post(`/secrets/${selected.secretId}/${suffix}`, {
        workspaceId: identity.receivingWorkspaceId,
      });
      recordEvent(`Secret ${name}`, selected.name, name === 'revoked' ? 'warning' : 'success');
      setSelected(null);
      load();
    } catch (error) {
      setActionError(error);
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Credential governance"
        title="Secrets"
        description="Metadata-only inventory, version history, scoped bindings, rotation, expiry, health, and encryption-key usage. Secret values can be replaced but never revealed."
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
          to administer governed credentials.
        </div>
      ) : null}
      {state.error ? <ErrorAlert error={state.error} title="Could not load secrets" /> : null}
      {actionError ? <ErrorAlert error={actionError} title="Secret operation failed" /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <div className="space-y-6">
          <Panel>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">Secret inventory</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Safe metadata only. No reveal endpoint exists.
                </p>
              </div>
              <KeyRound className="h-5 w-5 text-cyan-800" />
            </div>
            {state.loading ? <LoadingBlock label="Loading governed secrets" /> : null}
            {!state.loading && !state.items.length ? (
              <EmptyState
                title="No governed secrets"
                description="Create the first workspace-scoped credential using the secure entry form."
              />
            ) : null}
            <div className="divide-y divide-slate-200">
              {state.items.map((secret) => (
                <button
                  key={secret.secretId}
                  type="button"
                  onClick={() => setSelected(secret)}
                  className={`grid w-full gap-3 py-4 text-left sm:grid-cols-[1fr_auto] ${selected?.secretId === secret.secretId ? 'text-cyan-900' : 'text-slate-900'}`}
                >
                  <span>
                    <span className="block font-medium">{secret.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {secret.provider} · {secret.credentialType} · {secret.bindingCount || 0}{' '}
                      binding(s)
                    </span>
                  </span>
                  <StatusBadge label={secret.status} tone={statusTone(secret.status)} />
                </button>
              ))}
            </div>
          </Panel>

          {selected ? (
            <Panel>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="font-semibold text-slate-950">{selected.name}</h2>
                  <p className="mt-1 font-mono text-xs text-slate-500">{selected.secretId}</p>
                </div>
                <div className="flex gap-2">
                  {selected.status === 'ACTIVE' ? (
                    <SecondaryButton
                      onClick={() => action('disabled', 'disable')}
                      disabled={Boolean(busy)}
                    >
                      <Ban className="h-4 w-4" /> Disable
                    </SecondaryButton>
                  ) : selected.status === 'DISABLED' ? (
                    <SecondaryButton
                      onClick={() => action('enabled', 'enable')}
                      disabled={Boolean(busy)}
                    >
                      <ShieldCheck className="h-4 w-4" /> Enable
                    </SecondaryButton>
                  ) : null}
                  {!['REVOKED', 'DESTROYED'].includes(selected.status) ? (
                    <SecondaryButton
                      onClick={() => action('revoked', 'revoke')}
                      disabled={Boolean(busy)}
                    >
                      Revoke
                    </SecondaryButton>
                  ) : null}
                </div>
              </div>
              {busy === 'detail' ? <LoadingBlock label="Loading secret metadata" /> : null}
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-slate-500">Health</dt>
                  <dd className="mt-1 font-medium">
                    {detail.health?.healthStatus || selected.healthStatus}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Expires</dt>
                  <dd className="mt-1 font-medium">{formatDate(selected.expiresAt)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Last rotation</dt>
                  <dd className="mt-1 font-medium">{formatDate(selected.lastRotatedAt)}</dd>
                </div>
              </dl>
              <h3 className="mt-6 text-sm font-semibold text-slate-950">Version history</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Version</th>
                      <th>Status</th>
                      <th>Fingerprint</th>
                      <th>Key version</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.versions.map((version) => (
                      <tr key={version.versionId}>
                        <td className="py-3">v{version.version}</td>
                        <td>{version.status}</td>
                        <td className="font-mono text-xs">{version.safeFingerprint}</td>
                        <td>{version.encryptionKeyVersion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3 className="mt-6 text-sm font-semibold text-slate-950">Credential bindings</h3>
              <div className="mt-2 space-y-2 text-sm">
                {detail.bindings.length ? (
                  detail.bindings.map((binding) => (
                    <div key={binding.bindingId} className="border border-slate-200 px-3 py-2">
                      <span className="font-mono text-xs">{binding.bindingId}</span>
                      <span className="ml-3 text-slate-600">
                        {binding.allowedAdapter} · {binding.allowedEnvironment} · {binding.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">No active binding metadata.</p>
                )}
              </div>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-6">
          <Panel>
            <h2 className="font-semibold text-slate-950">Create secret</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              The value is accepted once, encrypted immediately, cleared after submission, and
              cannot be displayed later.
            </p>
            <form className="mt-5 space-y-4" onSubmit={createSecret} autoComplete="off">
              <label className="block">
                <FieldLabel>Name</FieldLabel>
                <input className={inputClass} name="name" required maxLength={200} />
              </label>
              <label className="block">
                <FieldLabel>Provider</FieldLabel>
                <input className={inputClass} name="provider" required placeholder="gemini" />
              </label>
              <label className="block">
                <FieldLabel>Credential type</FieldLabel>
                <select className={inputClass} name="credentialType" defaultValue="api_key">
                  <option value="api_key">API key</option>
                  <option value="bearer_token">Bearer token</option>
                  <option value="delegated_runtime_access">Delegated runtime access</option>
                  <option value="webhook_signing_secret">Webhook signing secret</option>
                  <option value="client_secret">Client secret</option>
                </select>
              </label>
              <label className="block">
                <FieldLabel hint="Never repopulated or stored in browser storage.">
                  Secret value
                </FieldLabel>
                <input
                  ref={secretInput}
                  className={inputClass}
                  name="credential"
                  type="password"
                  required
                  autoComplete="new-password"
                  spellCheck="false"
                />
              </label>
              <PrimaryButton type="submit" disabled={busy === 'create'}>
                <Plus className="h-4 w-4" /> Create and encrypt
              </PrimaryButton>
            </form>
          </Panel>

          {selected && !['REVOKED', 'DESTROYED'].includes(selected.status) ? (
            <Panel>
              <h2 className="font-semibold text-slate-950">Replace credential</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Manual replacement creates, validates, and atomically activates a new version. The
                current value is never shown.
              </p>
              <form className="mt-4 space-y-4" onSubmit={rotate} autoComplete="off">
                <label className="block">
                  <FieldLabel>New secret value</FieldLabel>
                  <input
                    ref={replacementInput}
                    className={inputClass}
                    name="credential"
                    type="password"
                    required
                    autoComplete="new-password"
                    spellCheck="false"
                  />
                </label>
                <PrimaryButton type="submit" disabled={busy === 'rotate'}>
                  <RotateCw className="h-4 w-4" /> Rotate
                </PrimaryButton>
              </form>
            </Panel>
          ) : null}

          <Panel>
            <h2 className="font-semibold text-slate-950">Encryption key usage</h2>
            <p className="mt-1 text-sm text-slate-600">
              Safe counts used before retiring historical environment keys.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              {(keyUsage?.usage || []).map((item) => (
                <div
                  key={`${item.keyVersion}:${item.status}:${item.format}`}
                  className="flex justify-between border-b border-slate-100 py-2"
                >
                  <span>
                    {item.keyVersion} · {item.status}
                  </span>
                  <strong>{item.count}</strong>
                </div>
              ))}
              {!keyUsage?.usage?.length ? (
                <p className="text-slate-500">No key-version usage metadata.</p>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
