import {
  Activity,
  ClipboardCheck,
  Compass,
  FlaskConical,
  FileKey,
  Home,
  KeyRound,
  Link2,
  ListChecks,
  Menu,
  PlugZap,
  ScrollText,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAppState } from '../app/AppState.jsx';

const groups = [
  {
    label: 'Partner',
    items: [
      { label: 'Dashboard', path: '/partner', icon: ShieldCheck },
      { label: 'Create Passport', path: '/passports/new', icon: FileKey },
      { label: 'Passports', path: '/passports', icon: ListChecks },
      { label: 'Issue Key', path: '/install-keys/issue', icon: KeyRound },
    ],
  },
  {
    label: 'Receiving',
    items: [
      { label: 'Resolve Key', path: '/install-keys/resolve', icon: ClipboardCheck },
      { label: 'Connections', path: '/connections', icon: Link2 },
      { label: 'Test Invocation', path: '/invoke/test', icon: PlugZap },
      { label: 'Invocations', path: '/invocations', icon: Activity },
    ],
  },
];

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const { sandboxEnabled } = useAppState();

  const navigation = (
    <>
      <NavLink
        to="/"
        end
        onClick={() => setOpen(false)}
        className={({ isActive }) => navClassName(isActive)}
      >
        <Home className="h-4 w-4" aria-hidden="true" />
        <span>Overview</span>
      </NavLink>
      {groups.map((group) => (
        <div key={group.label} className="mt-5">
          <p className="px-3 text-[11px] font-semibold uppercase text-slate-500">{group.label}</p>
          <div className="mt-2 space-y-1">
            {group.items.map((item) => (
              <NavLink key={item.path} to={item.path} onClick={() => setOpen(false)} className={({ isActive }) => navClassName(isActive)}>
                <item.icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
      {sandboxEnabled ? <div className="mt-5">
        <p className="px-3 text-[11px] font-semibold uppercase text-amber-300">Development</p>
        <div className="mt-2 space-y-1">
          <NavLink to="/developer-sandbox" onClick={() => setOpen(false)} className={({ isActive }) => navClassName(isActive)}>
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            <span>Developer Sandbox</span>
          </NavLink>
        </div>
      </div> : null}
    </>
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 left-5 z-40 flex h-11 w-11 items-center justify-center border border-slate-700 bg-slate-950 text-white shadow-lg lg:hidden" title="Open navigation">
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      {open ? <button type="button" className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation" /> : null}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[17.5rem] flex-col border-r border-slate-800 bg-slate-950 px-4 py-5 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-start justify-between px-2">
          <NavLink to="/" onClick={() => setOpen(false)} className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center bg-cyan-400 text-slate-950"><Compass className="h-5 w-5" aria-hidden="true" /></span>
            <span>
              <span className="block text-sm font-semibold">Agent Passport</span>
              <span className="mt-0.5 block text-xs text-slate-400">Runtime Gateway</span>
            </span>
          </NavLink>
          <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center text-slate-400 hover:text-white lg:hidden" title="Close navigation">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <nav className="mt-8 flex-1 overflow-y-auto pb-4">{navigation}</nav>
        <div className="border-t border-slate-800 pt-4">
          <NavLink to="/audit" onClick={() => setOpen(false)} className={({ isActive }) => navClassName(isActive)}>
            <ScrollText className="h-4 w-4" aria-hidden="true" />
            <span>Audit Logs</span>
          </NavLink>
          <NavLink to="/settings" onClick={() => setOpen(false)} className={({ isActive }) => navClassName(isActive)}>
            <Settings className="h-4 w-4" aria-hidden="true" />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>
    </>
  );
}

function navClassName(isActive) {
  return [
    'flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
    isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
  ].join(' ');
}
