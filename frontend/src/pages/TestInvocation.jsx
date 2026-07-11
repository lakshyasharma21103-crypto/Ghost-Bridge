import { Braces, Play, RefreshCw, TerminalSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { JsonEditor } from '../components/JsonEditor.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PageHeader, Panel, PrimaryButton, SecondaryButton } from './pageChrome.jsx';

export function TestInvocation() {
  const { identity, recordEvent } = useAppState();
  const [searchParams] = useSearchParams();
  const [connections, setConnections] = useState([]);
  const [connectionId, setConnectionId] = useState(searchParams.get('connectionId') || '');
  const [detail, setDetail] = useState(null);
  const [capabilityName, setCapabilityName] = useState('');
  const [input, setInput] = useState('{\n  "topic": "remaining FIFA matches in the US"\n}');
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState({ loading: true, invoking: false, error: null, result: null });

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    apiClient.get(`/connections?${new URLSearchParams(identity)}`)
      .then((data) => {
        if (!active) return;
        setConnections(data.items);
        setConnectionId((current) => current || data.items.find((item) => item.status === 'connected')?.connectionId || data.items[0]?.connectionId || '');
        setState((current) => ({ ...current, loading: false }));
      })
      .catch((error) => active && setState((current) => ({ ...current, loading: false, error })));
    return () => { active = false; };
  }, [identity.receivingWorkspaceId, identity.receivingUserId, reloadToken]);

  useEffect(() => {
    if (!connectionId) {
      setDetail(null);
      return undefined;
    }
    let active = true;
    apiClient.get(`/connections/${connectionId}?${new URLSearchParams(identity)}`)
      .then((data) => {
        if (!active) return;
        setDetail(data);
        const nextCapability = data.capabilities.find((capability) => capability.name === capabilityName) || data.capabilities[0];
        setCapabilityName(nextCapability?.name || '');
        if (nextCapability) setInput(JSON.stringify(exampleFromSchema(nextCapability.inputSchema), null, 2));
      })
      .catch((error) => active && setState((current) => ({ ...current, error })));
    return () => { active = false; };
  }, [connectionId, identity.receivingWorkspaceId, identity.receivingUserId, reloadToken]);

  function selectCapability(name) {
    setCapabilityName(name);
    const capability = detail?.capabilities.find((item) => item.name === name);
    if (capability) setInput(JSON.stringify(exampleFromSchema(capability.inputSchema), null, 2));
  }

  async function runInvocation() {
    try {
      setState((current) => ({ ...current, invoking: true, error: null, result: null }));
      const data = await apiClient.post(`/connections/${connectionId}/invoke`, {
        capability: capabilityName,
        input: JSON.parse(input),
        ...identity,
      });
      setState((current) => ({ ...current, invoking: false, result: data }));
      recordEvent('Runtime invocation completed', `${capabilityName} / ${data.status}`, data.status === 'completed' ? 'ready' : 'offline');
    } catch (error) {
      setState((current) => ({ ...current, invoking: false, error }));
    }
  }

  const selectedConnection = connections.find((item) => item.connectionId === connectionId);
  const invokeReady = selectedConnection?.status === 'connected' && capabilityName && !state.invoking;

  return <>
    <PageHeader
      eyebrow="Runtime gateway"
      title="Test Invocation"
      description="Run a selected capability through the managed connection. Input is validated by the capability JSON Schema before any runtime request is sent."
      actions={<SecondaryButton onClick={() => setReloadToken((value) => value + 1)}><RefreshCw className="h-4 w-4" />Reload</SecondaryButton>}
    />
    {state.error ? <div className="mb-6"><ErrorAlert error={state.error} title="Invocation failed" /></div> : null}
    {state.loading ? <LoadingBlock label="Loading connections" /> : null}
    {!state.loading && connections.length ? (
      detail ? <div className="grid gap-6 xl:grid-cols-[.78fr_1.22fr]">
        <Panel>
          <div className="flex items-center gap-2"><TerminalSquare className="h-4 w-4 text-cyan-700" /><h2 className="text-base font-semibold text-slate-950">Invocation target</h2></div>
          <div className="mt-5 space-y-5">
            <label className="block"><span className="text-sm font-medium text-slate-800">Connection</span><select value={connectionId} onChange={(event) => setConnectionId(event.target.value)} className="mt-2 h-10 w-full border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100">{connections.map((connection) => <option key={connection.connectionId} value={connection.connectionId}>{connection.agent.name} / {connection.status}</option>)}</select></label>
            <div className="border-l-2 border-slate-300 bg-slate-50 px-4 py-3"><p className="font-medium text-slate-950">{detail.agent.name}</p><p className="mt-1 text-sm text-slate-600">{detail.runtime.type.toUpperCase()} / {detail.runtime.availability}</p><div className="mt-3"><StatusBadge tone={detail.status === 'connected' ? 'ready' : 'pending'}>{detail.status}</StatusBadge></div></div>
            <label className="block"><span className="text-sm font-medium text-slate-800">Capability</span><select value={capabilityName} onChange={(event) => selectCapability(event.target.value)} className="mt-2 h-10 w-full border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100">{detail.capabilities.map((capability) => <option key={capability.name} value={capability.name}>{capability.name}</option>)}</select></label>
            {detail.runtime.type === 'mcp' && detail.runtime.availability === 'limited' ? <div className="border-l-2 border-violet-500 bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-950">MCP remote transport is not implemented in this deployment, so invocation returns a structured limitation rather than a fabricated result.</div> : null}
          </div>
        </Panel>
        <Panel>
          <div className="flex items-center gap-2"><Braces className="h-4 w-4 text-cyan-700" /><h2 className="text-base font-semibold text-slate-950">Capability input</h2></div>
          <div className="mt-5"><JsonEditor label="Input JSON" value={input} onChange={setInput} rows={14} hint="A single REST input value is mapped to the passport runtime input field when configured." /></div>
          <div className="mt-5 flex justify-end"><PrimaryButton onClick={runInvocation} disabled={!invokeReady}><Play className="h-4 w-4" />{state.invoking ? 'Running' : 'Run invocation'}</PrimaryButton></div>
        </Panel>
      </div> : <Panel><p className="text-sm text-slate-600">Select a connection to load its capability catalog.</p></Panel>
    ) : null}
    {!state.loading && !connections.length ? <Panel><p className="text-sm text-slate-600">No connections are available yet. Resolve an install key first.</p></Panel> : null}
    {state.result ? <section className="mt-6 border border-slate-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><p className="text-sm font-semibold text-slate-950">Invocation result</p><p className="mt-1 font-mono text-xs text-slate-600">{state.result.invocationId}</p></div><StatusBadge tone={state.result.status === 'completed' ? 'ready' : 'offline'}>{state.result.status}</StatusBadge></div><pre className="overflow-x-auto bg-slate-950 p-5 text-xs leading-6 text-slate-100">{JSON.stringify(state.result.output, null, 2)}</pre></section> : null}
  </>;
}

function exampleFromSchema(schema = {}) {
  if (schema.default !== undefined) return schema.default;
  if (schema.type === 'string') return schema.enum?.[0] || 'example';
  if (schema.type === 'number' || schema.type === 'integer') return 0;
  if (schema.type === 'boolean') return false;
  if (schema.type === 'array') return [exampleFromSchema(schema.items || {})];
  if (schema.type === 'object' || schema.properties) return Object.fromEntries(Object.entries(schema.properties || {}).map(([key, value]) => [key, exampleFromSchema(value)]));
  return {};
}
