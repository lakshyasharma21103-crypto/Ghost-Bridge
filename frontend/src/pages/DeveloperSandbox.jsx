import {
  ClipboardCheck,
  Cloud,
  FilePlus2,
  FlaskConical,
  KeyRound,
  Play,
  Send,
  ShieldAlert,
  RefreshCw,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, ApiClientError } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { CopyOnceBox } from '../components/CopyOnceBox.jsx';
import { ErrorAlert } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { FieldLabel, PageHeader, Panel, PrimaryButton, SecondaryButton } from './pageChrome.jsx';

const SEEDED_SANDBOX_SLUG = 'developer-sandbox';
const SANDBOX_PARTNER_AGENT_ID = 'developer_sandbox_research_test_agent';
const initialForm = { name: 'Developer Sandbox', slug: SEEDED_SANDBOX_SLUG };
const initialLoadForm = { slug: SEEDED_SANDBOX_SLUG, apiKey: '' };
const initialExternalState = {
  baseUrl: null,
  delegatedAccessConfigured: false,
  health: null,
  passport: null,
  connection: null,
  installKey: null,
};

function partnerAuthOptions(apiKey) {
  return { headers: { 'X-Partner-Api-Key': apiKey } };
}

function sandboxPassport(passport) {
  if (!passport) return null;
  return { ...passport, passportId: passport.passportId || passport.id };
}

export function DeveloperSandbox() {
  const { recordEvent } = useAppState();
  const [form, setForm] = useState(initialForm);
  const [loadForm, setLoadForm] = useState(initialLoadForm);
  const [state, setState] = useState({
    busy: false,
    error: null,
    partner: null,
    passport: null,
    partnerApiKey: '',
    showPartnerApiKey: false,
    installKey: null,
    external: initialExternalState,
  });

  async function loadSandbox(event) {
    event.preventDefault();
    const requestedSlug = loadForm.slug.trim().toLowerCase();
    const apiKey = loadForm.apiKey.trim();
    if (!requestedSlug || !apiKey) {
      setState((current) => ({
        ...current,
        error: new ApiClientError('Partner slug and Partner API key are required.', {
          status: 400,
          code: 'VALIDATION_ERROR',
        }),
      }));
      return;
    }

    try {
      setState((current) => ({ ...current, busy: true, error: null }));
      const data = await apiClient.get('/partner/agents', partnerAuthOptions(apiKey));
      if (!data.partner || data.partner.slug !== requestedSlug) {
        throw new ApiClientError('This Partner API key does not belong to the requested partner.', {
          status: 403,
          code: 'PARTNER_SLUG_MISMATCH',
        });
      }

      const external = await apiClient.get(
        '/developer-sandbox/external-agent/status',
        partnerAuthOptions(apiKey),
      );

      const existingPassport = data.items.find(
        (item) => item.partnerAgentId === SANDBOX_PARTNER_AGENT_ID,
      );
      setState((current) => ({
        ...current,
        busy: false,
        partner: data.partner,
        passport: sandboxPassport(existingPassport),
        partnerApiKey: apiKey,
        showPartnerApiKey: false,
        installKey: null,
        external: { ...initialExternalState, ...external },
      }));
      setLoadForm((current) => ({ ...current, slug: requestedSlug, apiKey: '' }));
      recordEvent(
        'Seeded sandbox loaded',
        `${data.partner.name} / ${data.partner.slug}${existingPassport ? ' / Research Test Agent' : ''}`,
        'ready',
      );
    } catch (error) {
      setLoadForm((current) => ({ ...current, apiKey: '' }));
      setState((current) => ({ ...current, busy: false, error }));
    }
  }

  async function createPartner(event) {
    event.preventDefault();
    try {
      setState((current) => ({ ...current, busy: true, error: null }));
      const data = await apiClient.post('/developer-sandbox/partners', form);
      setState((current) => ({
        ...current,
        busy: false,
        partner: data.partner,
        partnerApiKey: data.apiKey,
        showPartnerApiKey: true,
        passport: null,
        installKey: null,
        external: initialExternalState,
      }));
      recordEvent(
        'Sandbox partner created',
        `${data.partner.name} / ${data.partner.slug}`,
        'ready',
      );
    } catch (error) {
      setState((current) => ({ ...current, busy: false, error }));
    }
  }

  async function createPassport() {
    try {
      setState((current) => ({ ...current, busy: true, error: null }));
      const data = await apiClient.post(
        `/developer-sandbox/partners/${state.partner.id}/passport`,
        {},
        partnerAuthOptions(state.partnerApiKey),
      );
      setState((current) => ({
        ...current,
        busy: false,
        passport: sandboxPassport(data),
        installKey: null,
      }));
      recordEvent('Sandbox test passport created', 'Research Test Agent / research_topic', 'ready');
    } catch (error) {
      setState((current) => ({ ...current, busy: false, error }));
    }
  }

  async function issueInstallKey() {
    try {
      setState((current) => ({ ...current, busy: true, error: null }));
      const data = await apiClient.post(
        `/developer-sandbox/passports/${state.passport.passportId}/keys`,
        {},
        partnerAuthOptions(state.partnerApiKey),
      );
      setState((current) => ({ ...current, busy: false, installKey: data }));
      recordEvent('Sandbox install key issued', `${data.installMode} / invoke scope`, 'pending');
    } catch (error) {
      setState((current) => ({ ...current, busy: false, error }));
    }
  }

  async function checkExternalAgentHealth() {
    try {
      setState((current) => ({ ...current, busy: true, error: null }));
      const [health, status] = await Promise.all([
        apiClient.get(
          '/developer-sandbox/external-agent/health',
          partnerAuthOptions(state.partnerApiKey),
        ),
        apiClient.get(
          '/developer-sandbox/external-agent/status',
          partnerAuthOptions(state.partnerApiKey),
        ),
      ]);
      setState((current) => ({
        ...current,
        busy: false,
        external: {
          ...current.external,
          ...status,
          health: health.health,
        },
      }));
      recordEvent(
        'External agent health checked',
        `${health.baseUrl} / ${health.health.healthy ? 'healthy' : 'unhealthy'}`,
        health.health.healthy ? 'ready' : 'offline',
      );
    } catch (error) {
      setState((current) => ({ ...current, busy: false, error }));
    }
  }

  async function createExternalAgentPassport() {
    try {
      setState((current) => ({ ...current, busy: true, error: null }));
      const passport = await apiClient.post(
        '/developer-sandbox/external-agent/passport',
        {},
        partnerAuthOptions(state.partnerApiKey),
      );
      setState((current) => ({
        ...current,
        busy: false,
        external: {
          ...current.external,
          passport,
          installKey: null,
        },
      }));
      recordEvent(
        'External agent passport upserted',
        `${passport.agent.name} / ${passport.status}`,
        passport.status === 'valid' ? 'ready' : 'offline',
      );
    } catch (error) {
      setState((current) => ({ ...current, busy: false, error }));
    }
  }

  async function issueExternalAgentInstallKey() {
    try {
      setState((current) => ({ ...current, busy: true, error: null }));
      const installKey = await apiClient.post(
        '/developer-sandbox/external-agent/install-key',
        {},
        partnerAuthOptions(state.partnerApiKey),
      );
      setState((current) => ({
        ...current,
        busy: false,
        external: {
          ...current.external,
          passport: {
            ...current.external.passport,
            passportId: installKey.passportId,
            status: 'valid',
            agent: installKey.agent,
          },
          installKey,
        },
      }));
      recordEvent(
        'External agent install key issued',
        `${installKey.agent.name} / invoke scope`,
        'pending',
      );
    } catch (error) {
      setState((current) => ({ ...current, busy: false, error }));
    }
  }

  function forgetPartnerApiKey() {
    setLoadForm((current) => ({ ...current, apiKey: '' }));
    setState((current) => ({
      ...current,
      error: null,
      partnerApiKey: '',
      showPartnerApiKey: false,
      installKey: null,
      external: {
        ...current.external,
        installKey: null,
      },
    }));
    recordEvent(
      'Sandbox Partner API key forgotten',
      'No Partner API key retained for this page session',
      'neutral',
    );
  }

  const hasPartnerApiKey = Boolean(state.partnerApiKey);
  const hasValidPassport = state.passport?.status === 'valid';
  const hasValidExternalPassport = state.external.passport?.status === 'valid';

  return (
    <>
      <PageHeader
        eyebrow="Development only"
        title="Developer Sandbox"
        description="Create or load a local partner and test the complete install-key flow against the mock REST agent."
      />
      <div className="mb-6 flex items-start gap-3 border-l-[3px] border-amber-500 bg-amber-50 px-5 py-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-semibold text-slate-950">
            Development only — do not use these credentials in production.
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            The Partner API key is sent only in the X-Partner-Api-Key header and held only in this
            page's memory. It is never placed in a URL or persistent browser storage.
          </p>
        </div>
      </div>
      {state.error ? <ErrorAlert error={state.error} title="Sandbox action failed" /> : null}

      <Panel className={state.error ? 'mt-6' : ''}>
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-cyan-700" />
          <h2 className="text-base font-semibold text-slate-950">Use Existing Seeded Sandbox</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter the one-time Partner API key printed by{' '}
          <span className="font-mono">npm run seed:sandbox</span>. The key is forgotten when this
          page session ends or when you clear it.
        </p>
        <form
          className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-end"
          onSubmit={loadSandbox}
        >
          <label className="block">
            <FieldLabel>Partner slug</FieldLabel>
            <input
              value={loadForm.slug}
              onChange={(event) =>
                setLoadForm((current) => ({ ...current, slug: event.target.value }))
              }
              autoCapitalize="none"
              spellCheck={false}
              className="h-10 w-full border border-slate-300 bg-white px-3 font-mono text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <label className="block">
            <FieldLabel>Partner API key</FieldLabel>
            <input
              type="password"
              value={loadForm.apiKey}
              onChange={(event) =>
                setLoadForm((current) => ({ ...current, apiKey: event.target.value }))
              }
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={
                hasPartnerApiKey ? 'Loaded for this page session' : 'agentpass_partner_...'
              }
              className="h-10 w-full border border-slate-300 bg-white px-3 font-mono text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton
              type="submit"
              disabled={state.busy || !loadForm.slug.trim() || !loadForm.apiKey.trim()}
            >
              <KeyRound className="h-4 w-4" />
              Load Sandbox
            </PrimaryButton>
            {hasPartnerApiKey ? (
              <SecondaryButton onClick={forgetPartnerApiKey}>
                <X className="h-4 w-4" />
                Forget key
              </SecondaryButton>
            ) : null}
          </div>
        </form>
        {state.partner ? (
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-200 pt-5">
            <span className="text-sm font-medium text-slate-950">{state.partner.name}</span>
            <span className="font-mono text-xs text-slate-500">{state.partner.slug}</span>
            <StatusBadge tone={hasPartnerApiKey ? 'ready' : 'pending'}>
              {hasPartnerApiKey ? 'loaded' : 'key forgotten'}
            </StatusBadge>
          </div>
        ) : null}
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-amber-700" />
            <h2 className="text-base font-semibold text-slate-950">1. Create Sandbox Partner</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            For a new sandbox only. If the seeded sandbox exists, load it above with the key printed
            by the seed command.
          </p>
          <form className="mt-5 space-y-4" onSubmit={createPartner}>
            <label className="block">
              <FieldLabel>Name</FieldLabel>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="h-10 w-full border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <label className="block">
              <FieldLabel>Slug</FieldLabel>
              <input
                value={form.slug}
                onChange={(event) =>
                  setForm((current) => ({ ...current, slug: event.target.value }))
                }
                className="h-10 w-full border border-slate-300 bg-white px-3 font-mono text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <PrimaryButton
              type="submit"
              disabled={state.busy || Boolean(state.partner)}
              className="w-full"
            >
              <KeyRound className="h-4 w-4" />
              Create Partner
            </PrimaryButton>
          </form>
          {state.partner ? (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-950">{state.partner.name}</p>
                <StatusBadge tone="ready">{state.partner.status || 'active'}</StatusBadge>
              </div>
              <p className="mt-1 font-mono text-xs text-slate-500">
                {state.partner.slug} / {state.partner.plan || 'developer'}
              </p>
              {state.showPartnerApiKey ? (
                <div className="mt-4">
                  <CopyOnceBox
                    label="Sandbox Partner API Key"
                    value={state.partnerApiKey}
                    onCopied={() =>
                      setState((current) => ({ ...current, showPartnerApiKey: false }))
                    }
                  />
                </div>
              ) : hasPartnerApiKey ? (
                <p className="mt-4 text-sm text-emerald-800">
                  Partner API key is held in memory for sandbox actions.
                </p>
              ) : (
                <p className="mt-4 text-sm text-amber-800">
                  Partner API key forgotten. Load the sandbox again to continue.
                </p>
              )}{' '}
              {hasPartnerApiKey ? (
                <SecondaryButton onClick={forgetPartnerApiKey} className="mt-4 w-full">
                  <X className="h-4 w-4" />
                  Forget Partner API Key
                </SecondaryButton>
              ) : null}
            </div>
          ) : null}
        </Panel>
        <Panel>
          <div className="flex items-center gap-2">
            <FilePlus2 className="h-4 w-4 text-cyan-700" />
            <h2 className="text-base font-semibold text-slate-950">2. Create Test Passport</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Creates Research Test Agent with <span className="font-mono">no_auth_dev</span>,{' '}
            <span className="font-mono">research_topic</span>, and the local mock REST runtime.
          </p>
          <PrimaryButton
            onClick={createPassport}
            disabled={state.busy || !state.partner || !hasPartnerApiKey || Boolean(state.passport)}
            className="mt-5 w-full"
          >
            <FilePlus2 className="h-4 w-4" />
            Create Test Passport
          </PrimaryButton>
          {state.passport ? (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-950">
                  {state.passport.agent?.name || 'Research Test Agent'}
                </p>
                <StatusBadge tone={hasValidPassport ? 'ready' : 'offline'}>
                  {state.passport.status}
                </StatusBadge>
              </div>
              <p className="mt-1 break-all font-mono text-xs text-slate-500">
                {state.passport.passportId}
              </p>
              <p className="mt-3 text-sm text-slate-700">
                {state.passport.capabilitiesCount} capability
              </p>
            </div>
          ) : (
            <p className="mt-5 border-t border-slate-200 pt-5 text-sm text-slate-500">
              No Research Test Agent passport exists for this partner.
            </p>
          )}
        </Panel>
        <Panel>
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-cyan-700" />
            <h2 className="text-base font-semibold text-slate-950">3. Issue Install Key</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Issues an invoke-scoped delegated key so resolution creates a connected runtime
            immediately.
          </p>
          <PrimaryButton
            onClick={issueInstallKey}
            disabled={
              state.busy || !hasPartnerApiKey || !hasValidPassport || Boolean(state.installKey)
            }
            className="mt-5 w-full"
          >
            <Send className="h-4 w-4" />
            Issue One-Time Install Key
          </PrimaryButton>
          {state.installKey ? (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <CopyOnceBox
                label="Sandbox Install Key"
                value={state.installKey.key}
                onCopied={() =>
                  setState((current) => ({
                    ...current,
                    installKey: { ...current.installKey, key: null },
                  }))
                }
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/install-keys/resolve"
                  className="inline-flex min-h-10 items-center gap-2 bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Resolve key
                </Link>
                <Link
                  to="/invoke/test"
                  className="inline-flex min-h-10 items-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  <Play className="h-4 w-4" />
                  Test invocation
                </Link>
              </div>
            </div>
          ) : null}
        </Panel>
      </div>

      <section className="mt-8 border border-cyan-200 bg-cyan-50/40 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-cyan-800" />
            <div>
              <p className="text-xs font-semibold uppercase text-cyan-800">
                Independent authenticated runtime
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                External Agent Integration
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Registers and invokes the separately hosted External Research Agent through
                delegated runtime access. The bearer credential stays encrypted and backend-only.
              </p>
            </div>
          </div>
          <SecondaryButton
            onClick={checkExternalAgentHealth}
            disabled={state.busy || !hasPartnerApiKey}
          >
            <RefreshCw className="h-4 w-4" />
            Check External Agent Health
          </SecondaryButton>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              External service base URL
            </p>
            <p className="mt-2 break-all font-mono text-xs leading-5 text-slate-800">
              {state.external.baseUrl || 'Load a sandbox partner to view configuration'}
            </p>
          </div>
          <div className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              External service health
            </p>
            <div className="mt-2">
              <StatusBadge
                tone={
                  state.external.health?.healthy
                    ? 'ready'
                    : state.external.health
                      ? 'offline'
                      : 'neutral'
                }
              >
                {state.external.health?.healthy
                  ? 'healthy'
                  : state.external.health
                    ? 'unhealthy'
                    : 'not checked'}
              </StatusBadge>
            </div>
            {state.external.health?.service ? (
              <p className="mt-2 text-xs text-slate-600">
                {state.external.health.service} / {state.external.health.version}
              </p>
            ) : null}
          </div>
          <div className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Passport status</p>
            <div className="mt-2">
              <StatusBadge tone={hasValidExternalPassport ? 'ready' : 'neutral'}>
                {state.external.passport?.status || 'not created'}
              </StatusBadge>
            </div>
            {state.external.passport?.passportId ? (
              <p className="mt-2 break-all font-mono text-xs text-slate-600">
                {state.external.passport.passportId}
              </p>
            ) : null}
          </div>
          <div className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Connection status</p>
            <div className="mt-2">
              <StatusBadge
                tone={state.external.connection?.status === 'connected' ? 'ready' : 'neutral'}
              >
                {state.external.connection?.status || 'not resolved'}
              </StatusBadge>
            </div>
            {state.external.connection?.connectionId ? (
              <p className="mt-2 break-all font-mono text-xs text-slate-600">
                {state.external.connection.connectionId}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Panel>
            <h3 className="text-sm font-semibold text-slate-950">External Agent Passport</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Creates or updates a bearer-authenticated REST passport whose endpoint belongs to the
              independent external service.
            </p>
            <PrimaryButton
              onClick={createExternalAgentPassport}
              disabled={state.busy || !hasPartnerApiKey}
              className="mt-4 w-full"
            >
              <FilePlus2 className="h-4 w-4" />
              Create or Update External Agent Passport
            </PrimaryButton>
            {state.external.passport?.agent ? (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="font-medium text-slate-950">{state.external.passport.agent.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {state.external.passport.agent.description}
                </p>
              </div>
            ) : null}
          </Panel>

          <Panel>
            <h3 className="text-sm font-semibold text-slate-950">Delegated Install Key</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The gateway reads the runtime token from its environment and encrypts it before
              persistence. No receiving-side credential entry is required.
            </p>
            <PrimaryButton
              onClick={issueExternalAgentInstallKey}
              disabled={
                state.busy ||
                !hasPartnerApiKey ||
                !hasValidExternalPassport ||
                Boolean(state.external.installKey)
              }
              className="mt-4 w-full"
            >
              <Send className="h-4 w-4" />
              Issue External Agent Install Key
            </PrimaryButton>
            {!state.external.delegatedAccessConfigured && hasPartnerApiKey ? (
              <p className="mt-3 text-sm text-amber-800">
                Backend delegated access is not configured.
              </p>
            ) : null}
            {state.external.installKey ? (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <CopyOnceBox
                  label="External Agent Install Key"
                  value={state.external.installKey.key}
                  onCopied={() =>
                    setState((current) => ({
                      ...current,
                      external: {
                        ...current.external,
                        installKey: { ...current.external.installKey, key: null },
                      },
                    }))
                  }
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to="/install-keys/resolve"
                    className="inline-flex min-h-10 items-center gap-2 bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Continue to Resolve Key
                  </Link>
                  {state.external.connection?.status === 'connected' ? (
                    <Link
                      to={`/invoke/test?connectionId=${state.external.connection.connectionId}`}
                      className="inline-flex min-h-10 items-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      <Play className="h-4 w-4" />
                      Test invocation
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Panel>
        </div>
      </section>
    </>
  );
}
