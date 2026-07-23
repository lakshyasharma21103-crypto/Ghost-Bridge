import {
  Activity,
  AlertTriangle,
  BarChart3,
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
  Network,
  Gauge,
  ScrollText,
  Settings,
  ShieldCheck,
  ShieldEllipsis,
  ShieldAlert,
  Scale,
  Wrench,
  Search,
  ListChecks,
  GitBranch,
  FileKey2,
  KeySquare,
  LifeBuoy,
  UserCheck,
  Workflow,
  Layers3,
  ServerCog,
  TrafficCone,
  ArchiveX,
  Rocket,
  RefreshCw,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAppState } from '../app/AppState.jsx';

const primaryItems = [
  { label: 'Overview', path: '/', icon: Home, end: true },
  { label: 'Operations', path: '/operations', icon: Gauge },
  { label: 'Scale & Capacity', path: '/operations/scale-capacity', icon: BarChart3 },
  { label: 'Queue Partitions', path: '/operations/queue-partitions', icon: Layers3 },
  { label: 'Worker Pools', path: '/operations/worker-pools', icon: ServerCog },
  { label: 'Admission & Quotas', path: '/operations/admission-quotas', icon: TrafficCone },
  { label: 'Dead Letter', path: '/operations/dead-letter', icon: ArchiveX },
  { label: 'Database & Cache', path: '/operations/database-cache', icon: ServerCog },
  { label: 'Query Performance', path: '/operations/query-performance', icon: BarChart3 },
  { label: 'Indexes', path: '/operations/database-indexes', icon: Layers3 },
  { label: 'Projections', path: '/operations/data-projections', icon: Workflow },
  { label: 'Regions', path: '/operations/regions', icon: Network },
  { label: 'Failover', path: '/operations/failover', icon: ShieldAlert },
  { label: 'Disaster Recovery', path: '/operations/disaster-recovery', icon: LifeBuoy },
  { label: 'Backups & Restores', path: '/operations/backups-restores', icon: ArchiveX },
  { label: 'DR Drills', path: '/operations/dr-drills', icon: FlaskConical },
  { label: 'Load Tests', path: '/operations/load-tests', icon: FlaskConical },
  { label: 'Performance Budgets', path: '/operations/performance-budgets', icon: ClipboardCheck },
  { label: 'Baselines', path: '/operations/baselines', icon: GitBranch },
  { label: 'Capacity Planning', path: '/operations/capacity-planning', icon: BarChart3 },
  { label: 'Release Readiness', path: '/operations/release-readiness', icon: Rocket },
  { label: 'Release Candidates', path: '/operations/release-candidates', icon: ClipboardCheck },
  { label: 'Rollouts', path: '/operations/release-rollouts', icon: GitBranch },
  { label: 'Migrations', path: '/operations/release-migrations', icon: Layers3 },
  { label: 'Feature Flags', path: '/operations/release-feature-flags', icon: TrafficCone },
  { label: 'Staging', path: '/operations/staging', icon: ServerCog },
  { label: 'Pilot Programs', path: '/operations/pilot-programs', icon: UserCheck },
  { label: 'Capability Gates', path: '/operations/capability-gates', icon: ShieldCheck },
  { label: 'Pilot Health', path: '/operations/pilot-health', icon: Activity },
  { label: 'Feedback & Support', path: '/operations/pilot-feedback-support', icon: LifeBuoy },
  { label: 'Pilot Analytics', path: '/operations/pilot-analytics', icon: BarChart3, end: true },
  { label: 'Adoption Funnels', path: '/operations/pilot-analytics/funnels', icon: GitBranch },
  { label: 'Cohorts & Retention', path: '/operations/pilot-analytics/cohorts', icon: Activity },
  { label: 'Feedback Insights', path: '/operations/pilot-analytics/feedback', icon: LifeBuoy },
  { label: 'Experiments', path: '/operations/pilot-analytics/experiments', icon: FlaskConical },
  { label: 'Product Opportunities', path: '/operations/pilot-analytics/opportunities', icon: Rocket },
  { label: 'Policies', path: '/policies', icon: ShieldEllipsis },
  { label: 'Secrets', path: '/secrets', icon: LockKeyhole },
  { label: 'Compliance', path: '/compliance', icon: Scale },
  { label: 'Enterprise Admin', path: '/enterprise-operations', icon: Wrench },
  { label: 'Orchestrations', path: '/orchestrations', icon: Network },
  { label: 'Orch Operations', path: '/orchestrations/operations', icon: Gauge },
  { label: 'Orch Analytics', path: '/orchestrations/analytics', icon: BarChart3 },
  { label: 'Orch SLOs', path: '/orchestrations/slos', icon: ClipboardCheck },
  { label: 'Orch Alerts', path: '/orchestrations/alerts', icon: AlertTriangle },
  { label: 'Recovery Policies', path: '/recovery-policies', icon: LifeBuoy },
  { label: 'Interventions', path: '/interventions', icon: UserCheck },
  { label: 'Agent Discovery', path: '/agent-discovery', icon: Search },
  { label: 'Selection Policies', path: '/selection-policies', icon: ListChecks },
  { label: 'Selection Decisions', path: '/selection-decisions', icon: GitBranch },
  { label: 'Data Contracts', path: '/data-contracts', icon: FileKey2 },
  { label: 'Delegation Grants', path: '/delegation-grants', icon: KeySquare },
  { label: 'Delegation Invocations', path: '/delegation-invocations', icon: Workflow },
  { label: 'Passports', path: '/passports', icon: ShieldCheck },
  { label: 'Install Keys', path: '/install-keys/resolve', icon: KeyRound, match: '/install-keys' },
  { label: 'Connections', path: '/connections', icon: Link2 },
  { label: 'Invocations', path: '/invocations', icon: Activity },
  { label: 'Audit Logs', path: '/audit', icon: ScrollText },
];

const commercialItems = [
  { label: 'Product Catalog', path: '/commercial/products', icon: Layers3 },
  { label: 'Plans & Pricing', path: '/commercial/plans', icon: Scale },
  { label: 'Entitlements', path: '/commercial/entitlements', icon: KeySquare },
  { label: 'Customers', path: '/commercial/customers', icon: UserCheck },
  { label: 'Subscriptions', path: '/commercial/subscriptions', icon: ScrollText },
  { label: 'Usage & Metering', path: '/commercial/usage', icon: BarChart3 },
  { label: 'Invoices', path: '/commercial/invoices', icon: ClipboardCheck },
  { label: 'Payments', path: '/commercial/payments', icon: ShieldCheck },
  { label: 'Renewals', path: '/commercial/renewals', icon: RefreshCw },
  { label: 'Customer Success', path: '/commercial/customer-success', icon: LifeBuoy },
];

const gaItems = [
  { label: 'GA Readiness', path: '/ga/readiness', icon: Gauge },
  { label: 'GA Rollouts', path: '/ga/rollouts', icon: Rocket },
  { label: 'Launch Decisions', path: '/ga/decisions', icon: GitBranch },
  { label: 'Commercial Evidence', path: '/ga/evidence', icon: FileKey2 },
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

          <div className="sidebar-nav-group">
            <p className="sidebar-section-label">Commercial</p>
            {commercialItems.map((item) => (
              <NavLink key={item.path} to={item.path} onClick={closeNavigation} className={({ isActive }) => navClassName(isActive)}>
                <item.icon className="sidebar-nav-icon" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="sidebar-nav-group">
            <p className="sidebar-section-label">General Availability</p>
            {gaItems.map((item) => (
              <NavLink key={item.path} to={item.path} onClick={closeNavigation} className={({ isActive }) => navClassName(isActive)}>
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
