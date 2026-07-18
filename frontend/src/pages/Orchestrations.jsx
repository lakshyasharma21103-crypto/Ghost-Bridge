import { Network, Play, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { JsonEditor } from '../components/JsonEditor.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { formatDate, PageHeader, Panel, PrimaryButton, SecondaryButton } from './pageChrome.jsx';

const STARTER_DEFINITION = JSON.stringify(
  {
    name: 'Agent orchestration',
    description: 'A compact, explicit DAG.',
    inputSchema: {
      type: 'object',
      properties: { topic: { type: 'string' } },
      required: ['topic'],
      additionalProperties: false,
    },
    outputSchema: { type: 'object' },
    nodes: [
      {
        nodeKey: 'research',
        displayName: 'Research',
        connectionId: 'replace-with-connection-object-id',
        passportId: 'replace-with-passport-object-id',
        capability: 'research',
        operation: 'research',
        inputSchema: {
          type: 'object',
          properties: { topic: { type: 'string' } },
          required: ['topic'],
          additionalProperties: false,
        },
        outputSchema: {
          type: 'object',
          properties: { summary: { type: 'string' } },
          required: ['summary'],
          additionalProperties: false,
        },
        inputMapping: { topic: '$run.input.topic' },
        dependencies: [],
        retryPolicy: { maxAttempts: 2, baseDelayMs: 1000, maxDelayMs: 10000 },
      },
    ],
    edges: [],
    concurrencyLimit: 2,
    maxRunDurationMs: 1800000,
    maxNodeExecutions: 10,
    defaultNodeTimeoutMs: 60000,
  },
  null,
  2,
);

function tone(status) {
  if (status === 'active') return 'ready';
  if (status === 'archived') return 'neutral';
  return 'pending';
}

export function Orchestrations() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: false, error: null, items: [] });
  const [draft, setDraft] = useState(STARTER_DEFINITION);
  const [creating, setCreating] = useState(false);
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId, limit: '100' }),
    [identity.receivingWorkspaceId],
  );
  const load = useCallback(() => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null, items: [] });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    apiClient
      .get(`/orchestrations/definitions?${query}`)
      .then((data) => setState({ loading: false, error: null, items: data.items || [] }))
      .catch((error) => setState({ loading: false, error, items: [] }));
  }, [partnerConfigured, query]);
  useEffect(() => load(), [load]);

  async function create(event) {
    event.preventDefault();
    setCreating(true);
    try {
      const definition = await apiClient.post('/orchestrations/definitions', {
        ...JSON.parse(draft),
        workspaceId: identity.receivingWorkspaceId,
      });
      recordEvent('Orchestration draft created', `${definition.name} v${definition.version}`, 'success');
      load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Secure multi-agent execution"
        title="Orchestrations"
        description="Versioned DAG definitions with explicit data mappings, governed approvals, and Runtime Gateway execution."
        actions={
          <div className="flex gap-2">
            <Link to="/orchestrations/runs" className="inline-flex min-h-10 items-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
              <Play className="h-4 w-4" /> Runs
            </Link>
            <SecondaryButton onClick={load} disabled={state.loading || !partnerConfigured}>
              <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} /> Refresh
            </SecondaryButton>
          </div>
        }
      />
      {!partnerConfigured ? (
        <Panel className="mb-6 border-amber-200 bg-amber-50 text-sm text-amber-950">
          Configure a Partner API key in Settings to administer orchestration definitions.
        </Panel>
      ) : null}
      {state.error ? <ErrorAlert error={state.error} title="Orchestration request failed" /> : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.6fr)]">
        <div>
          {state.loading ? <LoadingBlock label="Loading orchestration definitions" /> : null}
          {!state.loading && state.items.length ? (
            <div className="overflow-x-auto border border-slate-200 bg-white">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr><th className="px-5 py-3">Name</th><th>Version</th><th>Status</th><th>Nodes</th><th>Concurrency</th><th>Updated</th><th>Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {state.items.map((definition) => (
                    <tr key={definition.definitionId} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <Link to={`/orchestrations/definitions/${definition.definitionId}`} className="font-medium text-slate-950 hover:text-cyan-800">{definition.name}</Link>
                        <p className="mt-1 max-w-md truncate text-xs text-slate-500">{definition.description || 'No description'}</p>
                      </td>
                      <td>v{definition.version}</td>
                      <td><StatusBadge tone={tone(definition.status)}>{definition.status}</StatusBadge></td>
                      <td>{definition.nodeCount}</td>
                      <td>{definition.concurrencyLimit}</td>
                      <td className="text-xs text-slate-600">{formatDate(definition.updatedAt)}</td>
                      <td><Link to={`/orchestrations/definitions/${definition.definitionId}`} className="font-medium text-cyan-800 hover:underline">Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {!state.loading && !state.items.length ? <EmptyState title="No orchestration definitions" detail="Create a compact JSON definition after installing the required Agent Passports and connections." /> : null}
        </div>
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <Network className="h-5 w-5 text-cyan-700" />
            <div><p className="font-semibold text-slate-950">Create definition draft</p><p className="text-xs text-slate-500">Use installed passport and connection ObjectIds.</p></div>
          </div>
          <form onSubmit={create} className="space-y-4">
            <JsonEditor label="Definition JSON" value={draft} onChange={setDraft} rows={22} hint="Mappings accept run input, declared dependency outputs, safe metadata, and explicit literals only." />
            <PrimaryButton type="submit" className="w-full" disabled={creating || !partnerConfigured}>
              <Plus className="h-4 w-4" /> {creating ? 'Creating...' : 'Create draft'}
            </PrimaryButton>
          </form>
        </Panel>
      </div>
    </>
  );
}
