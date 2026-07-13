import {
  Activity,
  AlertTriangle,
  ArrowRight,
  FileKey,
  KeyRound,
  Link2,
  RefreshCw,
  ScrollText,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';

const initialState = {
  loading: true,
  health: null,
  healthUnavailable: false,
  passports: null,
  connections: null,
  invocations: null,
  auditLogs: null,
};

export function Landing() {
  const { identity, partnerConfigured } = useAppState();
  const [state, setState] = useState(initialState);

  const loadOverview = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    const query = new URLSearchParams(identity);
    const requests = [
      apiClient.get('/health'),
      partnerConfigured ? apiClient.get('/partner/agents') : Promise.resolve(null),
      apiClient.get(`/connections?${query}`),
      apiClient.get(`/invocations?${query}`),
      apiClient.get(`/audit-logs?${query}`),
    ];
    const [health, passports, connections, invocations, auditLogs] =
      await Promise.allSettled(requests);
    setState({
      loading: false,
      health: health.status === 'fulfilled' ? health.value : null,
      healthUnavailable: health.status === 'rejected',
      passports:
        passports.status === 'fulfilled' && passports.value ? passports.value.items || [] : null,
      connections: connections.status === 'fulfilled' ? connections.value.items || [] : null,
      invocations: invocations.status === 'fulfilled' ? invocations.value.items || [] : null,
      auditLogs: auditLogs.status === 'fulfilled' ? auditLogs.value.items || [] : null,
    });
  }, [identity.receivingUserId, identity.receivingWorkspaceId, partnerConfigured]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const activity = useMemo(
    () => buildActivity(state, identity.receivingWorkspaceId),
    [state, identity.receivingWorkspaceId],
  );
  const validPassports = state.passports?.filter((item) => item.status === 'valid').length || 0;
  const activeConnections =
    state.connections?.filter((item) => item.status === 'connected').length || 0;

  return (
    <>
      <header className="overview-header">
        <div className="min-w-0">
          <h1 className="overview-title">Agent Passport Runtime Gateway</h1>
          <p className="overview-description">
            Manage verified agents, governed connections and runtime activity.
          </p>
        </div>
        <div className="overview-actions">
          <Link to="/install-keys/resolve" className="console-button console-button-secondary">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Resolve key
          </Link>
          <Link to="/passports/new" className="console-button console-button-primary">
            <FileKey className="h-4 w-4" aria-hidden="true" />
            Create passport
          </Link>
        </div>
      </header>

      {state.healthUnavailable ? (
        <div className="overview-warning" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Gateway unavailable</strong> — Backend connection could not be established.
          </span>
        </div>
      ) : null}

      <section className="overview-summary" aria-label="Gateway summary">
        <Metric
          label="Gateway status"
          value={state.loading ? 'Checking' : state.health ? 'Online' : 'Unavailable'}
          detail={
            state.health?.database?.status
              ? `Database ${state.health.database.status}`
              : 'Runtime health endpoint'
          }
          status={state.loading ? 'loading' : state.health ? 'ready' : 'error'}
        />
        <Metric
          label="Passports"
          value={state.passports ? state.passports.length : '—'}
          detail={
            state.passports
              ? `${validPassports} verified`
              : partnerConfigured
                ? 'Unable to load'
                : 'Partner key required'
          }
        />
        <Metric
          label="Active connections"
          value={state.connections ? activeConnections : '—'}
          detail={
            state.connections ? `${state.connections.length} total connections` : 'Unable to load'
          }
        />
        <Metric
          label="Recent invocations"
          value={state.invocations ? state.invocations.length : '—'}
          detail="Current workspace history"
        />
      </section>

      <section className="overview-activity">
        <div className="overview-section-header">
          <h2>Recent activity</h2>
          <button
            type="button"
            className="overview-refresh"
            onClick={loadOverview}
            disabled={state.loading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${state.loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
        <div className="overview-table-scroll">
          <table className="overview-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Agent / Connection</th>
                <th>Status</th>
                <th>Workspace</th>
                <th>Timestamp</th>
                <th>
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {state.loading && !activity.length ? (
                <tr>
                  <td colSpan="6" className="overview-table-message">
                    Loading recent activity…
                  </td>
                </tr>
              ) : null}
              {!state.loading && !activity.length ? (
                <tr>
                  <td colSpan="6" className="overview-table-message">
                    No recent activity for this workspace.
                  </td>
                </tr>
              ) : null}
              {activity.map((item) => (
                <ActivityRow key={item.key} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, detail, status }) {
  return (
    <div className="overview-metric">
      <p className="overview-metric-label">{label}</p>
      <div className="overview-metric-value-row">
        {status ? (
          <span className={`metric-status-dot metric-status-${status}`} aria-hidden="true" />
        ) : null}
        <p className="overview-metric-value">{value}</p>
      </div>
      <p className="overview-metric-detail">{detail}</p>
    </div>
  );
}

function ActivityRow({ item }) {
  const Icon = iconForType(item.type);
  return (
    <tr>
      <td>
        <span className="activity-type">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {item.type}
        </span>
      </td>
      <td>
        <p className="activity-title">{item.title}</p>
        {item.detail ? (
          <p className="activity-detail" title={item.detail}>
            {item.detail}
          </p>
        ) : null}
      </td>
      <td>
        <StatusIndicator status={item.status} />
      </td>
      <td>
        <span className="activity-workspace" title={item.workspace}>
          {item.workspace}
        </span>
      </td>
      <td className="activity-time">{formatDate(item.createdAt)}</td>
      <td className="activity-action-cell">
        <Link
          to={item.href}
          className="activity-action"
          aria-label={`Open ${item.type.toLowerCase()} activity`}
        >
          Open <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </td>
    </tr>
  );
}

function StatusIndicator({ status }) {
  const normalized = String(status || 'recorded').toLowerCase();
  const tone = ['valid', 'connected', 'completed', 'success', 'healthy'].includes(normalized)
    ? 'ready'
    : ['failed', 'denied', 'suspended', 'revoked', 'unhealthy'].includes(normalized)
      ? 'error'
      : ['pending', 'pending_auth', 'issued', 'created'].includes(normalized)
        ? 'pending'
        : 'neutral';
  return (
    <span className="activity-status">
      <span className={`activity-status-dot activity-status-${tone}`} />
      {humanize(normalized)}
    </span>
  );
}

function buildActivity(state, workspace) {
  const passportItems = (state.passports || []).map((item) => ({
    key: `passport_${item.id}`,
    type: 'Passport',
    title: item.agent?.name || 'Agent Passport',
    detail: item.agent?.provider,
    status: item.status,
    workspace,
    createdAt: item.createdAt,
    href: `/passports/${item.id}`,
  }));
  const connectionItems = (state.connections || []).map((item) => ({
    key: `connection_${item.connectionId}`,
    type: 'Connection',
    title: item.agent?.name || 'Agent connection',
    detail: item.connectionId,
    status: item.status,
    workspace,
    createdAt: item.createdAt,
    href: `/connections/${item.connectionId}`,
  }));
  const invocationItems = (state.invocations || []).map((item) => ({
    key: `invocation_${item.invocationId}`,
    type: 'Invocation',
    title: item.capability || 'Runtime invocation',
    detail: item.connectionId,
    status: item.status,
    workspace,
    createdAt: item.createdAt,
    href: '/invocations',
  }));
  const auditItems = (state.auditLogs || []).map((item) => ({
    key: `audit_${item.id}`,
    type: 'Audit',
    title: humanize(item.action || 'Gateway event'),
    detail: auditTarget(item),
    status: auditStatus(item.action),
    workspace,
    createdAt: item.createdAt,
    href: '/audit',
  }));

  return [...passportItems, ...connectionItems, ...invocationItems, ...auditItems]
    .filter((item) => item.createdAt)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 8);
}

function iconForType(type) {
  if (type === 'Passport') return FileKey;
  if (type === 'Connection') return Link2;
  if (type === 'Invocation') return Activity;
  return ScrollText;
}

function auditTarget(item) {
  const metadata = item.metadata || {};
  return (
    metadata.agentName ||
    metadata.connectionId ||
    metadata.passportId ||
    metadata.keyPrefix ||
    item.entityType ||
    'Gateway'
  );
}

function auditStatus(action = '') {
  const normalized = action.toLowerCase();
  if (normalized.includes('failed') || normalized.includes('denied')) return 'failed';
  if (normalized.includes('completed') || normalized.includes('connected')) return 'completed';
  if (normalized.includes('issued') || normalized.includes('created')) return 'created';
  return 'recorded';
}

function humanize(value) {
  const result = String(value || '')
    .replace(/[._-]+/g, ' ')
    .trim();
  return result ? result[0].toUpperCase() + result.slice(1) : 'Recorded';
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
