import {
  Activity,
  BookOpen,
  Braces,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FlaskConical,
  Home,
  KeyRound,
  LockKeyhole,
  Link2,
  Menu,
  Gauge,
  ScrollText,
  Settings,
  ShieldCheck,
  ShieldEllipsis,
  Scale,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAppState } from '../app/AppState.jsx';

const primaryItems = [
  { label: 'Overview', path: '/', icon: Home, end: true },
  { label: 'Operations', path: '/operations', icon: Gauge },
  { label: 'Policies', path: '/policies', icon: ShieldEllipsis },
  { label: 'Secrets', path: '/secrets', icon: LockKeyhole },
  { label: 'Compliance', path: '/compliance', icon: Scale },
  { label: 'Passports', path: '/passports', icon: ShieldCheck },
  { label: 'Install Keys', path: '/install-keys/resolve', icon: KeyRound, match: '/install-keys' },
  { label: 'Connections', path: '/connections', icon: Link2 },
  { label: 'Invocations', path: '/invocations', icon: Activity },
  { label: 'Audit Logs', path: '/audit', icon: ScrollText },
];

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { identity, sandboxEnabled } = useAppState();
  const location = useLocation();

  function closeNavigation() {
    setOpen(false);
    setHelpOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="mobile-nav-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      {open ? (
        <button
          type="button"
          className="mobile-nav-overlay"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}
      <aside className={`console-sidebar ${open ? 'console-sidebar-open' : ''}`}>
        <div className="sidebar-brand-row">
          <Link to="/" className="sidebar-brand" onClick={closeNavigation}>
            <span className="sidebar-product-mark">
              <Braces className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="sidebar-brand-name">Agent Passport</span>
              <span className="sidebar-brand-detail">Runtime Gateway</span>
            </span>
          </Link>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-navigation" aria-label="Main navigation">
          <div className="sidebar-nav-group">
            {primaryItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.end}
                onClick={closeNavigation}
                className={({ isActive }) =>
                  navClassName(
                    isActive || Boolean(item.match && location.pathname.startsWith(item.match)),
                  )
                }
              >
                <item.icon className="sidebar-nav-icon" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="sidebar-developer-group">
            <p className="sidebar-section-label">Developer</p>
            <NavLink
              to="/invoke/test"
              onClick={closeNavigation}
              className={({ isActive }) => navClassName(isActive)}
            >
              <ClipboardCheck className="sidebar-nav-icon" aria-hidden="true" />
              <span>Test Invocation</span>
            </NavLink>
            {sandboxEnabled ? (
              <NavLink
                to="/developer-sandbox"
                onClick={closeNavigation}
                className={({ isActive }) => navClassName(isActive)}
              >
                <FlaskConical className="sidebar-nav-icon" aria-hidden="true" />
                <span>Developer Sandbox</span>
              </NavLink>
            ) : null}
          </div>
        </nav>

        <div className="sidebar-footer">
          {helpOpen ? (
            <div className="sidebar-help-menu">
              <p className="sidebar-help-title">Gateway help</p>
              <Link to="/settings" onClick={closeNavigation}>
                <Settings className="h-3.5 w-3.5" />
                Configure workspace
              </Link>
              <Link to="/audit" onClick={closeNavigation}>
                <BookOpen className="h-3.5 w-3.5" />
                Review audit activity
              </Link>
            </div>
          ) : null}
          <NavLink
            to="/settings"
            onClick={closeNavigation}
            className={({ isActive }) => navClassName(isActive)}
          >
            <Settings className="sidebar-nav-icon" aria-hidden="true" />
            <span>Settings</span>
          </NavLink>
          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => setHelpOpen((value) => !value)}
            aria-expanded={helpOpen}
          >
            <CircleHelp className="sidebar-nav-icon" aria-hidden="true" />
            <span>Help</span>
          </button>
          <Link to="/partner" className="sidebar-workspace" onClick={closeNavigation}>
            <span className="sidebar-workspace-avatar">
              {initials(identity.receivingWorkspaceId)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="sidebar-workspace-name">
                {identity.receivingWorkspaceId || 'Workspace not set'}
              </span>
              <span className="sidebar-workspace-user">
                {identity.receivingUserId || 'Receiving user'}
              </span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          </Link>
        </div>
      </aside>
    </>
  );
}

function navClassName(isActive) {
  return `sidebar-nav-item${isActive ? ' sidebar-nav-item-active' : ''}`;
}

function initials(value) {
  const normalized = String(value || 'AP')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim();
  return (
    normalized
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'AP'
  );
}
