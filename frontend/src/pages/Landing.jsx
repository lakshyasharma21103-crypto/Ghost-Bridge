import { ArrowRight, CircleCheck, KeyRound, Link2, RadioTower } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClientError, apiClient } from '../api/apiClient.js';
import runtimeVisual from '../assets/agent-passport-runtime-visual.png';
import { StatusBadge } from '../components/StatusBadge.jsx';

export function Landing() {
  const [health, setHealth] = useState({ state: 'loading' });

  useEffect(() => {
    let active = true;
    apiClient.get('/health')
      .then((data) => active && setHealth({ state: 'ready', data }))
      .catch((error) => active && setHealth({
        state: 'offline',
        message: error instanceof ApiClientError ? error.message : 'Backend unavailable',
      }));
    return () => { active = false; };
  }, []);

  return (
    <div>
      <section className="relative min-h-[470px] overflow-hidden bg-slate-950 text-white">
        <img src={runtimeVisual} alt="Agent Passport key connecting to an AI runtime service" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-slate-950/45" />
        <div className="relative mx-auto flex min-h-[470px] max-w-7xl items-end px-5 py-10 lg:px-8 lg:py-14">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase text-cyan-200">Managed runtime infrastructure</p>
            <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">Agent Passport Runtime Gateway</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-200">One key to discover, connect, and invoke any compatible AI agent.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/passports/new" className="inline-flex min-h-10 items-center gap-2 bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-100">
                Create passport <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/install-keys/resolve" className="inline-flex min-h-10 items-center gap-2 border border-white/50 bg-slate-950/35 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15">
                Resolve install key <KeyRound className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1fr_1.55fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan-800">Two-sided MVP</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Built for both sides of an agent connection.</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <FlowStep number="01" icon={RadioTower} title="Partner issues a key" detail="A builder registers an agent passport, chooses an install mode, and shows a one-time key inside its own product." link="/partner" label="Open partner console" />
            <FlowStep number="02" icon={Link2} title="Receiving platform connects" detail="A user resolves the key once. The gateway creates a connection, imports capabilities, and invokes the agent when access is available." link="/install-keys/resolve" label="Resolve a key" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-[1.25fr_1fr] lg:px-8">
        <div className="border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Gateway status</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{health.state === 'ready' ? 'Runtime Gateway online' : health.state === 'loading' ? 'Checking runtime gateway' : 'Runtime Gateway unavailable'}</p>
            </div>
            <StatusBadge tone={health.state === 'ready' ? 'ready' : health.state === 'offline' ? 'offline' : 'pending'}>{health.state}</StatusBadge>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{health.state === 'ready' ? `Database: ${health.data.database.status}. REST runtime is available; MCP is exposed as a limited adapter until remote transport is enabled.` : health.message || 'Waiting for the health endpoint.'}</p>
        </div>
        <div className="border-l-[3px] border-cyan-600 bg-cyan-50 px-6 py-6">
          <div className="flex gap-3">
            <CircleCheck className="mt-0.5 h-5 w-5 text-cyan-700" aria-hidden="true" />
            <div>
              <p className="font-semibold text-slate-950">Identity, metadata, and runtime access travel together.</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">Install keys are one-time grants. Connections, credentials, capability schemas, health, and invocation history remain managed by the gateway.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FlowStep({ number, icon: Icon, title, detail, link, label }) {
  return (
    <div className="border-t-2 border-slate-900 pt-4">
      <div className="flex items-start gap-3">
        <span className="font-mono text-xs text-rose-600">{number}</span>
        <Icon className="h-5 w-5 text-cyan-700" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
      <Link to={link} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-800 hover:text-cyan-950">{label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
    </div>
  );
}
