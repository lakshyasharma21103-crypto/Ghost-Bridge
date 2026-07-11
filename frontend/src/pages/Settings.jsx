import { Check, KeyRound, Network, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { API_BASE_URL } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { FieldLabel, PageHeader, Panel, PrimaryButton, SecondaryButton } from './pageChrome.jsx';

export function Settings() {
  const { identity, setIdentity, partnerConfigured, configurePartnerKey, recordEvent } = useAppState();
  const [workspace, setWorkspace] = useState(identity);
  const [partnerKey, setPartnerKey] = useState('');
  const [saved, setSaved] = useState(false);

  function saveIdentity(event) {
    event.preventDefault();
    setIdentity(workspace);
    setSaved(true);
    recordEvent('Receiving identity updated', `${workspace.receivingWorkspaceId} / ${workspace.receivingUserId}`, 'neutral');
  }

  function configureKey(event) {
    event.preventDefault();
    configurePartnerKey(partnerKey);
    setPartnerKey('');
    recordEvent(partnerKey ? 'Partner API key configured for this session' : 'Partner API key cleared from this session', 'No key value retained in the UI', 'neutral');
  }

  return <>
    <PageHeader eyebrow="Workspace" title="Settings" description="Configure non-secret receiving identity and transient partner API access for the current browser session." />
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]"><Panel><div className="flex items-center gap-2"><Network className="h-4 w-4 text-cyan-700" /><h2 className="text-base font-semibold text-slate-950">Receiving workspace identity</h2></div><p className="mt-1 text-sm leading-6 text-slate-600">Used to scope connection, credential, health, and invocation-history requests.</p><form onSubmit={saveIdentity} className="mt-5 space-y-4"><label className="block"><FieldLabel>Workspace ID</FieldLabel><input value={workspace.receivingWorkspaceId} onChange={(event) => setWorkspace((current) => ({ ...current, receivingWorkspaceId: event.target.value }))} className="h-10 w-full border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" /></label><label className="block"><FieldLabel>User ID</FieldLabel><input value={workspace.receivingUserId} onChange={(event) => setWorkspace((current) => ({ ...current, receivingUserId: event.target.value }))} className="h-10 w-full border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" /></label><PrimaryButton type="submit"><Check className="h-4 w-4" />Save identity</PrimaryButton>{saved ? <span className="ml-3 text-sm text-emerald-700">Saved locally.</span> : null}</form></Panel><Panel><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-700" /><h2 className="text-base font-semibold text-slate-950">Partner API access</h2></div><p className="mt-1 text-sm leading-6 text-slate-600">Required for partner passport and install-key APIs. It is held only in application memory and is not persisted or displayed after submission.</p><form onSubmit={configureKey} className="mt-5"><label className="block"><FieldLabel>Partner API key</FieldLabel><input type="password" value={partnerKey} onChange={(event) => setPartnerKey(event.target.value)} autoComplete="new-password" placeholder={partnerConfigured ? 'Configured for this session' : 'agentpass_partner_...'} className="h-10 w-full border border-slate-300 bg-white px-3 font-mono text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" /></label><div className="mt-4 flex flex-wrap gap-3"><PrimaryButton type="submit"><KeyRound className="h-4 w-4" />{partnerConfigured ? 'Replace key' : 'Configure key'}</PrimaryButton>{partnerConfigured ? <SecondaryButton onClick={() => { configurePartnerKey(''); recordEvent('Partner API key cleared from this session', 'No key value retained in the UI', 'neutral'); }}>Clear session key</SecondaryButton> : null}</div></form></Panel></div><Panel className="mt-6"><h2 className="text-base font-semibold text-slate-950">Runtime configuration</h2><dl className="mt-5 grid gap-5 md:grid-cols-3"><ConfigItem label="API base URL" value={API_BASE_URL} /><ConfigItem label="REST adapter" value="Available" /><ConfigItem label="MCP adapter" value="Supported, remote transport limited" /></dl></Panel>
  </>;
}

function ConfigItem({ label, value }) { return <div><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className="mt-2 break-words font-mono text-xs leading-6 text-slate-700">{value}</dd></div>; }
