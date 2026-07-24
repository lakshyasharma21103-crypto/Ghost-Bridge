import { ChevronDown, CircleHelp } from 'lucide-react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppState } from '../app/AppState.jsx';
import { Sidebar } from './Sidebar.jsx';

export function Layout() {
  const { identity, serverEnvironment, partnerConfigured } = useAppState();
  const location = useLocation();
  const gatewayReady = serverEnvironment && serverEnvironment !== 'unavailable';

  if (!partnerConfigured) {
    return <Navigate to="/console/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="console-shell">
      <Sidebar />
      <div className="console-workspace">
        <header className="console-topbar">
          <p className="console-topbar-title">{getPageName(location.pathname)}</p>
          <div className="console-topbar-actions">
            <div
              className="gateway-indicator"
              aria-label={gatewayReady ? 'Gateway online' : 'Gateway unavailable'}
            >
              <span
                className={`gateway-dot ${gatewayReady ? 'gateway-dot-online' : serverEnvironment === null ? 'gateway-dot-loading' : 'gateway-dot-offline'}`}
              />
              <span>
                {gatewayReady
                  ? 'Gateway online'
                  : serverEnvironment === null
                    ? 'Checking gateway'
                    : 'Gateway unavailable'}
              </span>
            </div>
            <Link
              to="/settings"
              className="workspace-selector"
              aria-label="Open workspace settings"
            >
              <span className="workspace-selector-label">Workspace</span>
              <span className="workspace-selector-value">
                {identity.receivingWorkspaceId || 'Not configured'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            </Link>
            <Link
              to="/settings"
              className="topbar-help"
              aria-label="Help and settings"
              title="Help and settings"
            >
              <CircleHelp className="h-[18px] w-[18px]" aria-hidden="true" />
            </Link>
          </div>
        </header>
        <main className="console-content">
          <div className="console-content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function getPageName(pathname) {
  if (pathname === '/') return 'Overview';
  if (pathname === '/partner') return 'Dashboard';
  if (pathname === '/operations') return 'Operations';
  if (pathname === '/passports/new') return 'Create Passport';
  if (pathname.startsWith('/passports')) return 'Passports';
  if (pathname.startsWith('/install-keys')) return 'Install Keys';
  if (pathname.startsWith('/connections')) return 'Connections';
  if (pathname.startsWith('/invoke')) return 'Test Invocation';
  if (pathname.startsWith('/invocations')) return 'Invocations';
  if (pathname.startsWith('/audit')) return 'Audit Logs';
  if (pathname.startsWith('/developer-sandbox')) return 'Developer Sandbox';
  if (pathname.startsWith('/settings')) return 'Settings';
  return 'Agent Passport';
}
