import { Layers3 } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { useAppState } from '../app/AppState.jsx';

export function Layout() {
  const { identity } = useAppState();
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-950">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">Agent Passport Runtime Gateway</p>
              <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">One key to discover, connect, and invoke any compatible AI agent.</p>
            </div>
            <div className="hidden items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 md:flex">
              <Layers3 className="h-3.5 w-3.5 text-cyan-700" aria-hidden="true" />
              <span className="max-w-48 truncate">{identity.receivingWorkspaceId || 'workspace not set'}</span>
            </div>
          </div>
        </header>
        <div className={`mx-auto ${isLanding ? 'max-w-none px-0 py-0' : 'max-w-7xl px-5 py-7 lg:px-8 lg:py-8'}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
