import { Archive, CheckCircle2, Play, Save, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { JsonEditor } from '../components/JsonEditor.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, PageHeader, Panel, PrimaryButton, SecondaryButton } from './pageChrome.jsx';

function editableDefinition(definition) {
  return Object.fromEntries(
    ['name', 'description', 'inputSchema', 'outputSchema', 'nodes', 'edges', 'concurrencyLimit', 'maxRunDurationMs', 'maxNodeExecutions', 'defaultNodeTimeoutMs'].map((key) => [key, definition[key]]),
  );
}

export function OrchestrationDefinition() {
  const { definitionId } = useParams();
  const navigate = useNavigate();
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: true, error: null, item: null });
  const [editor, setEditor] = useState('{}');
  const [runInput, setRunInput] = useState('{}');
  const [validation, setValidation] = useState(null);
  const [busy, setBusy] = useState('');
  const query = useMemo(() => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }), [identity.receivingWorkspaceId]);
  const load = useCallback(() => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null, item: null });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    apiClient.get(`/orchestrations/definitions/${definitionId}?${query}`)
      .then((item) => {
        setState({ loading: false, error: null, item });
        setEditor(JSON.stringify(editableDefinition(item), null, 2));
      })
      .catch((error) => setState({ loading: false, error, item: null }));
  }, [definitionId, partnerConfigured, query]);
  useEffect(() => load(), [load]);

  async function action(name, endpoint) {
    setBusy(name);
    try {
      const result = await apiClient.post(`/orchestrations/definitions/${definitionId}/${endpoint}`, { workspaceId: identity.receivingWorkspaceId });
      if (name === 'validate') setValidation(result);
      else {
        recordEvent(`Orchestration ${name}`, `${state.item.name} v${state.item.version}`, 'success');
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
      const item = await apiClient.patch(`/orchestrations/definitions/${definitionId}`, { ...JSON.parse(editor), workspaceId: identity.receivingWorkspaceId });
      recordEvent('Orchestration draft saved', `${item.name} v${item.version}`, 'success');
      if (item.definitionId !== definitionId) navigate(`/orchestrations/definitions/${item.definitionId}`);
      else load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  async function startRun() {
    setBusy('run');
    try {
      const run = await apiClient.post(`/orchestrations/definitions/${definitionId}/runs`, { workspaceId: identity.receivingWorkspaceId, input: JSON.parse(runInput) });
      recordEvent('Orchestration run created', run.runId, 'success');
      navigate(`/orchestrations/runs/${run.runId}`);
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  if (state.loading) return <LoadingBlock label="Loading orchestration definition" />;
  const definition = state.item;
  return (
    <>
      <PageHeader eyebrow="Orchestration definition" title={definition?.name || 'Definition unavailable'} description={definition ? `Version ${definition.version} · updated ${formatDate(definition.updatedAt)}` : ''} actions={<Link to="/orchestrations" className="text-sm font-medium text-cyan-800 hover:underline">Back to definitions</Link>} />
      {state.error ? <ErrorAlert error={state.error} title="Definition action failed" /> : null}
      {definition ? (
        <div className="space-y-6">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><div className="flex items-center gap-2"><StatusBadge tone={definition.status === 'active' ? 'ready' : 'pending'}>{definition.status}</StatusBadge><span className="text-sm text-slate-600">{definition.nodeCount} nodes · concurrency {definition.concurrencyLimit}</span></div><p className="mt-3 text-sm text-slate-600">{definition.description || 'No description'}</p></div>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton onClick={() => action('validate', 'validate')} disabled={Boolean(busy)}><ShieldCheck className="h-4 w-4" /> Validate</SecondaryButton>
                {definition.status === 'draft' ? <PrimaryButton onClick={() => action('activate', 'activate')} disabled={Boolean(busy)}><CheckCircle2 className="h-4 w-4" /> Activate</PrimaryButton> : null}
                {definition.status !== 'archived' ? <SecondaryButton onClick={() => action('archive', 'archive')} disabled={Boolean(busy)}><Archive className="h-4 w-4" /> Archive</SecondaryButton> : null}
              </div>
            </div>
          </Panel>
          {validation ? <Panel className={validation.valid ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}><p className="font-semibold">{validation.valid ? 'Definition is valid' : 'Definition has validation errors'}</p><ul className="mt-3 space-y-2 text-sm">{(validation.errors || []).map((error, index) => <li key={`${error.path}_${index}`}><span className="font-mono text-xs">{error.code}</span> · {error.path}: {error.message}</li>)}</ul></Panel> : null}
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel>
              <div className="mb-4 flex items-center justify-between"><div><p className="font-semibold">Definition editor</p><p className="text-xs text-slate-500">Active versions create a new draft when saved.</p></div><SecondaryButton onClick={save} disabled={Boolean(busy) || definition.status === 'archived'}><Save className="h-4 w-4" /> Save</SecondaryButton></div>
              <JsonEditor label="Definition JSON" value={editor} onChange={setEditor} rows={26} />
            </Panel>
            <div className="space-y-6">
              <Panel><p className="font-semibold">Node table</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="py-2">Node</th><th>Capability</th><th>Dependencies</th><th>Attempts</th><th>Approval</th></tr></thead><tbody className="divide-y">{definition.nodes.map((node) => <tr key={node.nodeKey}><td className="py-3 font-medium">{node.displayName}</td><td className="font-mono text-xs">{node.capability}</td><td>{node.dependencies?.join(', ') || 'Root'}</td><td>{node.retryPolicy?.maxAttempts || 1}</td><td>{node.approvalRequirement?.required ? 'Required' : 'Policy based'}</td></tr>)}</tbody></table></div></Panel>
              <Panel><p className="font-semibold">Dependency table</p><div className="mt-3 space-y-2 text-sm">{definition.edges.length ? definition.edges.map((edge, index) => <p key={`${edge.from}_${edge.to}_${index}`}><span className="font-mono">{edge.from}</span> → <span className="font-mono">{edge.to}</span></p>) : <p>No explicit edges; node dependencies remain authoritative.</p>}</div></Panel>
              {definition.status === 'active' ? <Panel><p className="font-semibold">Start run</p><p className="mb-4 text-xs text-slate-500">Input is validated before any node is queued.</p><JsonEditor label="Run input JSON" value={runInput} onChange={setRunInput} rows={8} /><PrimaryButton className="mt-4 w-full" onClick={startRun} disabled={Boolean(busy)}><Play className="h-4 w-4" /> Start run</PrimaryButton></Panel> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
