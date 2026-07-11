import { Clock3, KeyRound, Send, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { CopyOnceBox } from '../components/CopyOnceBox.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { PartnerAccessNotice } from './PartnerDashboard.jsx';
import { FieldLabel, PageHeader, Panel, PrimaryButton } from './pageChrome.jsx';

export function IssuePassportKey() {
  const { partnerConfigured, recordEvent } = useAppState();
  const [searchParams] = useSearchParams();
  const [passports, setPassports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState(null);
  const [form, setForm] = useState({
    passportId: searchParams.get('passportId') || '', installMode: 'auth_required', scope: 'invoke', expiresInMinutes: 15,
    accessToken: '', expiresAt: '',
  });

  useEffect(() => {
    if (!partnerConfigured) return;
    let active = true;
    setLoading(true);
    apiClient.get('/partner/agents')
      .then((data) => { if (active) { setPassports(data.items); setLoading(false); setForm((current) => ({ ...current, passportId: current.passportId || data.items[0]?.id || '' })); } })
      .catch((nextError) => active && (setError(nextError), setLoading(false)));
    return () => { active = false; };
  }, [partnerConfigured]);

  async function issueKey() {
    try {
      setIssuing(true); setError(null); setIssued(null);
      const body = { scope: form.scope, installMode: form.installMode, expiresInMinutes: Number(form.expiresInMinutes) };
      if (form.installMode === 'delegated_runtime_access') {
        body.runtimeGrant = { type: 'bearer_token', accessToken: form.accessToken };
        if (form.expiresAt) body.runtimeGrant.expiresAt = new Date(form.expiresAt).toISOString();
      }
      const data = await apiClient.post(`/partner/agents/${form.passportId}/keys`, body);
      setIssued(data);
      recordEvent('One-time install key issued', `${form.installMode} / ${form.scope} / expires ${new Date(data.expiresAt).toLocaleTimeString()}`, 'ready');
    } catch (nextError) {
      setError(nextError);
    } finally { setIssuing(false); }
  }

  return <>
    <PageHeader eyebrow="Partner company" title="Issue Passport Key" description="Mint a short-lived, one-time install/connect grant for one registered Agent Passport." />
    {!partnerConfigured ? <PartnerAccessNotice /> : null}
    {error ? <div className="mb-6"><ErrorAlert error={error} title="Could not issue install key" /></div> : null}
    {loading ? <LoadingBlock label="Loading passports" /> : null}
    {partnerConfigured && !loading ? <div className="grid gap-6 xl:grid-cols-[1fr_.85fr]"><Panel><form onSubmit={(event) => { event.preventDefault(); issueKey(); }}><h2 className="text-base font-semibold text-slate-950">Key grant</h2><p className="mt-1 text-sm leading-6 text-slate-600">The partner controls the runtime access that travels with this single-use key.</p><div className="mt-6 space-y-5"><label className="block"><FieldLabel>Agent Passport</FieldLabel><select value={form.passportId} onChange={(event) => setForm((current) => ({ ...current, passportId: event.target.value }))} className="h-10 w-full border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100">{passports.map((passport) => <option key={passport.id} value={passport.id}>{passport.agent.name} / {passport.agent.provider}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><SelectControl label="Install mode" value={form.installMode} onChange={(value) => setForm((current) => ({ ...current, installMode: value }))} options={['delegated_runtime_access', 'auth_required', 'metadata_only']} /><SelectControl label="Scope" value={form.scope} onChange={(value) => setForm((current) => ({ ...current, scope: value }))} options={['invoke', 'connect', 'resolve_only']} /></div><label className="block"><FieldLabel hint="Between 1 and 1440 minutes">Expires in minutes</FieldLabel><input type="number" min="1" max="1440" value={form.expiresInMinutes} onChange={(event) => setForm((current) => ({ ...current, expiresInMinutes: event.target.value }))} className="h-10 w-full border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" /></label>{form.installMode === 'delegated_runtime_access' ? <div className="border-l-2 border-cyan-600 bg-cyan-50 px-4 py-4"><p className="font-medium text-slate-950">Delegated runtime grant</p><p className="mt-1 text-sm leading-6 text-slate-700">The grant is encrypted by the backend and never returned in the response.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block sm:col-span-2"><FieldLabel>Bearer access token</FieldLabel><input type="password" autoComplete="new-password" value={form.accessToken} onChange={(event) => setForm((current) => ({ ...current, accessToken: event.target.value }))} className="h-10 w-full border border-cyan-200 bg-white px-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" /></label><label className="block"><FieldLabel hint="Optional">Grant expiry</FieldLabel><input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))} className="h-10 w-full border border-cyan-200 bg-white px-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" /></label></div></div> : null}<PrimaryButton type="submit" disabled={!form.passportId || issuing || (form.installMode === 'delegated_runtime_access' && !form.accessToken)} className="w-full"><Send className="h-4 w-4" />{issuing ? 'Issuing key' : 'Issue One-Time Install Key'}</PrimaryButton></div></form></Panel><div className="space-y-6"><Panel><div className="flex gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 text-amber-700" /><div><h2 className="font-semibold text-slate-950">One-time key handling</h2><p className="mt-2 text-sm leading-6 text-slate-600">This key is shown only once and expires soon. Send it directly to the receiving platform; do not add it to source control, tickets, or logs.</p></div></div></Panel>{issued ? <Panel><div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-cyan-700" /><h2 className="text-base font-semibold text-slate-950">Install key issued</h2></div><p className="mt-2 text-sm text-slate-600">{issued.installMode} / expires {new Date(issued.expiresAt).toLocaleString()}</p><div className="mt-5"><CopyOnceBox label="Agent Passport Install Key" value={issued.key} onCopied={() => setIssued((current) => ({ ...current, key: null }))} /></div>{!issued.key ? <p className="mt-3 text-sm font-medium text-emerald-800">Key copied and hidden from this session.</p> : null}</Panel> : <Panel><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-slate-500" /><p className="text-sm font-medium text-slate-900">No raw key is retained here.</p></div><p className="mt-2 text-sm leading-6 text-slate-600">Issue a key to reveal it once in this panel.</p></Panel>}</div></div> : null}
  </>;
}

function SelectControl({ label, value, onChange, options }) { return <label className="block"><FieldLabel>{label}</FieldLabel><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
