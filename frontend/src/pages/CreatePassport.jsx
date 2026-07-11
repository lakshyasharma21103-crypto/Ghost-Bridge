import { CheckCircle2, FilePlus2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert } from '../components/Feedback.jsx';
import { JsonEditor } from '../components/JsonEditor.jsx';
import { PartnerAccessNotice } from './PartnerDashboard.jsx';
import { FieldLabel, PageHeader, Panel, PrimaryButton, SecondaryButton } from './pageChrome.jsx';

const emptyCapability = () => ({
  name: 'research_topic',
  description: 'Researches a topic and returns a concise summary.',
  riskLevel: 'low',
  inputSchema: '{\n  "type": "object",\n  "properties": {\n    "topic": { "type": "string" }\n  },\n  "required": ["topic"]\n}',
  outputSchema: '{\n  "type": "object",\n  "properties": {\n    "summary": { "type": "string" },\n    "sources": { "type": "array", "items": { "type": "string" } }\n  }\n}',
});

const initialForm = {
  partnerAgentId: 'research_agent_001',
  agent: {
    id: 'research-agent', name: 'Research Agent', provider: 'FlowAI',
    description: 'Searches the web and returns cited summaries.', version: '1.0.0', iconUrl: '',
  },
  auth: { type: 'api_key', header: 'Authorization', scheme: 'Bearer', scopes: 'agent.invoke', authorizationUrl: '', tokenUrl: '' },
  runtime: { type: 'rest', endpoint: 'https://example.com/api/agent/run', method: 'POST', inputField: 'instruction', outputField: 'response', supportsStreaming: false, supportsLongRunningTasks: false },
  install: { delegated_runtime_access: true, auth_required: true, metadata_only: false, requiresUserConsent: true },
  healthEndpoint: 'https://example.com/health',
  capabilities: [emptyCapability()],
};

export function CreatePassport() {
  const { partnerConfigured, recordEvent } = useAppState();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState({ validating: false, saving: false, error: null, validation: null });

  function update(path, value) {
    setForm((current) => {
      const next = structuredClone(current);
      const keys = path.split('.');
      let target = next;
      keys.slice(0, -1).forEach((key) => { target = target[key]; });
      target[keys.at(-1)] = value;
      return next;
    });
  }

  function updateCapability(index, field, value) {
    setForm((current) => ({ ...current, capabilities: current.capabilities.map((capability, capabilityIndex) => capabilityIndex === index ? { ...capability, [field]: value } : capability) }));
  }

  function buildPayload() {
    const capabilities = form.capabilities.map((capability, index) => {
      try {
        return {
          name: capability.name.trim(),
          description: capability.description.trim(),
          inputSchema: JSON.parse(capability.inputSchema),
          outputSchema: JSON.parse(capability.outputSchema),
          riskLevel: capability.riskLevel,
        };
      } catch {
        throw new Error(`Capability ${index + 1} has invalid schema JSON.`);
      }
    });
    const auth = { type: form.auth.type };
    if (form.auth.scopes.trim()) auth.scopes = form.auth.scopes.split(',').map((scope) => scope.trim()).filter(Boolean);
    if (form.auth.header.trim()) auth.header = form.auth.header.trim();
    if (form.auth.scheme.trim()) auth.scheme = form.auth.scheme.trim();
    if (form.auth.authorizationUrl.trim()) auth.authorizationUrl = form.auth.authorizationUrl.trim();
    if (form.auth.tokenUrl.trim()) auth.tokenUrl = form.auth.tokenUrl.trim();

    const runtime = {
      type: form.runtime.type,
      endpoint: form.runtime.endpoint.trim(),
      supportsStreaming: form.runtime.supportsStreaming,
      supportsLongRunningTasks: form.runtime.supportsLongRunningTasks,
    };
    if (form.runtime.type === 'rest') {
      runtime.method = form.runtime.method;
      runtime.inputField = form.runtime.inputField.trim();
      runtime.outputField = form.runtime.outputField.trim();
    }

    const agent = Object.fromEntries(Object.entries(form.agent).filter(([, value]) => String(value).trim()));
    const supportedModes = ['delegated_runtime_access', 'auth_required', 'metadata_only'].filter((mode) => form.install[mode]);
    return {
      partnerAgentId: form.partnerAgentId.trim(),
      passport: {
        protocol: 'agent-passport.v1', agent, auth, runtime,
        install: { supportedModes, requiresUserConsent: form.install.requiresUserConsent },
        capabilities,
        ...(form.healthEndpoint.trim() ? { health: { endpoint: form.healthEndpoint.trim() } } : {}),
      },
    };
  }

  async function validatePassport() {
    try {
      setState((current) => ({ ...current, validating: true, error: null, validation: null }));
      const payload = buildPayload();
      const data = await apiClient.post('/passports/validate', payload.passport);
      setState((current) => ({ ...current, validating: false, validation: data }));
    } catch (error) {
      setState((current) => ({ ...current, validating: false, error }));
    }
  }

  async function savePassport() {
    try {
      setState((current) => ({ ...current, saving: true, error: null }));
      const payload = buildPayload();
      const data = await apiClient.post('/partner/agents', payload);
      recordEvent('Passport saved', `${payload.passport.agent.name} / ${data.capabilitiesCount} capabilities`, 'ready');
      navigate(`/passports/${data.passportId}`);
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error }));
    }
  }

  return <>
    <PageHeader eyebrow="Partner company" title="Create Agent Passport" description="Define a verified identity, runtime contract, install modes, and capability schemas for one hosted agent." actions={<div className="flex gap-3"><SecondaryButton onClick={validatePassport} disabled={state.validating}><CheckCircle2 className="h-4 w-4" />{state.validating ? 'Validating' : 'Validate'}</SecondaryButton><PrimaryButton onClick={savePassport} disabled={!partnerConfigured || state.saving}><FilePlus2 className="h-4 w-4" />{state.saving ? 'Saving' : 'Save Passport'}</PrimaryButton></div>} />
    {!partnerConfigured ? <PartnerAccessNotice /> : null}
    {state.error ? <div className="mb-6"><ErrorAlert error={state.error} title="Passport action failed" /></div> : null}
    {state.validation ? <div className="mb-6 border-l-[3px] border-emerald-600 bg-emerald-50 px-5 py-4 text-sm text-emerald-950"><p className="font-semibold">Passport is valid.</p><p className="mt-1">{state.validation.capabilityCount} capability schema{state.validation.capabilityCount === 1 ? '' : 's'} accepted for {state.validation.runtime.type.toUpperCase()} runtime.</p></div> : null}

    <div className="space-y-6">
      <Panel>
        <SectionTitle title="Identity" detail="The partner-side identifier stays stable while the public agent identity can be displayed to receiving platforms." />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TextField label="Partner agent ID" value={form.partnerAgentId} onChange={(value) => update('partnerAgentId', value)} />
          <TextField label="Agent ID" value={form.agent.id} onChange={(value) => update('agent.id', value)} />
          <TextField label="Agent name" value={form.agent.name} onChange={(value) => update('agent.name', value)} />
          <TextField label="Provider" value={form.agent.provider} onChange={(value) => update('agent.provider', value)} />
          <TextField label="Version" value={form.agent.version} onChange={(value) => update('agent.version', value)} />
          <TextField label="Icon URL" value={form.agent.iconUrl} onChange={(value) => update('agent.iconUrl', value)} placeholder="https://..." />
          <div className="md:col-span-2 xl:col-span-3"><TextAreaField label="Description" value={form.agent.description} onChange={(value) => update('agent.description', value)} rows={3} /></div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <SectionTitle title="Authentication" detail="Passport metadata never contains the credential value itself." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2"><SelectField label="Auth type" value={form.auth.type} onChange={(value) => update('auth.type', value)} options={['no_auth_dev', 'api_key', 'bearer_token', 'oauth2']} /><TextField label="Scopes" value={form.auth.scopes} onChange={(value) => update('auth.scopes', value)} hint="Comma-separated" /><TextField label="Header" value={form.auth.header} onChange={(value) => update('auth.header', value)} /><TextField label="Scheme" value={form.auth.scheme} onChange={(value) => update('auth.scheme', value)} />{form.auth.type === 'oauth2' ? <><TextField label="Authorization URL" value={form.auth.authorizationUrl} onChange={(value) => update('auth.authorizationUrl', value)} placeholder="https://..." /><TextField label="Token URL" value={form.auth.tokenUrl} onChange={(value) => update('auth.tokenUrl', value)} placeholder="https://..." /></> : null}</div>
        </Panel>
        <Panel>
          <SectionTitle title="Runtime" detail="REST is live in v1. MCP can be registered and shown as limited until remote transport is enabled." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2"><SelectField label="Runtime type" value={form.runtime.type} onChange={(value) => update('runtime.type', value)} options={['rest', 'mcp']} /><TextField label="Runtime endpoint" value={form.runtime.endpoint} onChange={(value) => update('runtime.endpoint', value)} placeholder="https://..." />{form.runtime.type === 'rest' ? <><SelectField label="Method" value={form.runtime.method} onChange={(value) => update('runtime.method', value)} options={['POST', 'PUT', 'PATCH', 'GET', 'DELETE']} /><TextField label="Input field" value={form.runtime.inputField} onChange={(value) => update('runtime.inputField', value)} /><TextField label="Output field" value={form.runtime.outputField} onChange={(value) => update('runtime.outputField', value)} /><div className="flex items-end gap-5 pb-2"><CheckField label="Streaming" checked={form.runtime.supportsStreaming} onChange={(value) => update('runtime.supportsStreaming', value)} /><CheckField label="Long-running tasks" checked={form.runtime.supportsLongRunningTasks} onChange={(value) => update('runtime.supportsLongRunningTasks', value)} /></div></> : <div className="sm:col-span-2 border-l-2 border-violet-500 bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-950">MCP passports can be created now. The gateway reports them as supported but limited until remote MCP transport is enabled.</div>}</div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle title="Install and health" detail="A one-time key grants only the modes selected here. Health checks use the declared public endpoint." />
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]"><div className="grid gap-3 sm:grid-cols-2"><CheckField label="Delegated runtime access" checked={form.install.delegated_runtime_access} onChange={(value) => update('install.delegated_runtime_access', value)} /><CheckField label="Auth required" checked={form.install.auth_required} onChange={(value) => update('install.auth_required', value)} /><CheckField label="Metadata only" checked={form.install.metadata_only} onChange={(value) => update('install.metadata_only', value)} /><CheckField label="Requires user consent" checked={form.install.requiresUserConsent} onChange={(value) => update('install.requiresUserConsent', value)} /></div><TextField label="Health endpoint" value={form.healthEndpoint} onChange={(value) => update('healthEndpoint', value)} placeholder="https://..." /></div>
      </Panel>

      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><SectionTitle title="Capabilities" detail="Each capability becomes an invocable contract with input and output JSON Schema." /><SecondaryButton onClick={() => setForm((current) => ({ ...current, capabilities: [...current.capabilities, { ...emptyCapability(), name: `capability_${current.capabilities.length + 1}` }] }))}><Plus className="h-4 w-4" />Add capability</SecondaryButton></div>
        <div className="mt-6 space-y-7">{form.capabilities.map((capability, index) => <div key={`${capability.name}_${index}`} className="border-t border-slate-200 pt-6"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-950">Capability {index + 1}</p>{form.capabilities.length > 1 ? <button type="button" onClick={() => setForm((current) => ({ ...current, capabilities: current.capabilities.filter((_, capabilityIndex) => capabilityIndex !== index) }))} className="flex h-8 w-8 items-center justify-center text-rose-700 hover:bg-rose-50" title="Remove capability"><Trash2 className="h-4 w-4" /></button> : null}</div><div className="mt-4 grid gap-4 md:grid-cols-3"><TextField label="Name" value={capability.name} onChange={(value) => updateCapability(index, 'name', value)} /><SelectField label="Risk level" value={capability.riskLevel} onChange={(value) => updateCapability(index, 'riskLevel', value)} options={['low', 'medium', 'high']} /><div className="md:col-span-3"><TextAreaField label="Description" value={capability.description} onChange={(value) => updateCapability(index, 'description', value)} rows={2} /></div></div><div className="mt-4 grid gap-5 xl:grid-cols-2"><JsonEditor label="Input schema" value={capability.inputSchema} onChange={(value) => updateCapability(index, 'inputSchema', value)} rows={12} /><JsonEditor label="Output schema" value={capability.outputSchema} onChange={(value) => updateCapability(index, 'outputSchema', value)} rows={12} /></div></div>)}</div>
      </Panel>
    </div>
  </>;
}

function SectionTitle({ title, detail }) { return <div><h2 className="text-base font-semibold text-slate-950">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p></div>; }
function TextField({ label, value, onChange, placeholder = '', hint }) { return <label className="block"><FieldLabel hint={hint}>{label}</FieldLabel><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" /></label>; }
function TextAreaField({ label, value, onChange, rows = 3 }) { return <label className="block"><FieldLabel>{label}</FieldLabel><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="w-full border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" /></label>; }
function SelectField({ label, value, onChange, options }) { return <label className="block"><FieldLabel>{label}</FieldLabel><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
function CheckField({ label, checked, onChange }) { return <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-cyan-700" />{label}</label>; }
