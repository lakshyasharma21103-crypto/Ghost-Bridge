import {
  Activity,
  AlertTriangle,
  Check,
  CircleAlert,
  Clock3,
  Database,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';

const WINDOWS = ['1h', '24h', '7d', '30d'];
const FUNNEL_LABELS = {
  keysResolved: 'Install keys resolved',
  passportsValidated: 'Passports validated',
  capabilityMetadataImported: 'Capability metadata imported',
  runtimeResolved: 'Runtime resolved',
  delegatedCredentialConfigured: 'Delegated credentials configured',
  connectionsCreated: 'Connections created',
  connectionsVerified: 'Connections verified',
  firstSuccessfulInvocation: 'First successful invocation',
};

export function Operations() {
  const { identity } = useAppState();
  const [windowKey, setWindowKey] = useState('24h');
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [acknowledging, setAcknowledging] = useState('');

  const loadOperations = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    const query = new URLSearchParams({ ...identity, window: windowKey });
    try {
      const [summary, latency, errors, funnel] = await Promise.all([
        apiClient.get(`/operations/summary?${query}`),
        apiClient.get(`/operations/latency?${query}`),
        apiClient.get(`/operations/errors?${query}`),
        apiClient.get(`/operations/passport-funnel?${query}`),
      ]);
      const alertQuery = new URLSearchParams({ ...identity, limit: '50' });
      const alerts = await apiClient.get(`/operations/alerts?${alertQuery}`);
      setState({ loading: false, error: '', data: { summary, latency, errors, funnel, alerts } });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || 'Operational metrics could not be loaded.',
      }));
    }
  }, [identity.receivingUserId, identity.receivingWorkspaceId, windowKey]);

  useEffect(() => {
    loadOperations();
  }, [loadOperations]);

  async function acknowledge(alertId) {
    setAcknowledging(alertId);
    try {
      await apiClient.post(`/operations/alerts/${alertId}/acknowledge`, identity);
      const query = new URLSearchParams({ ...identity, limit: '50' });
      const alerts = await apiClient.get(`/operations/alerts?${query}`);
      setState((current) => ({
        ...current,
        data: current.data ? { ...current.data, alerts } : current.data,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.message || 'Alert could not be acknowledged.',
      }));
    } finally {
      setAcknowledging('');
    }
  }

  const data = state.data;
  const summary = data?.summary;
  const latency = data?.latency;
  const invocationMetrics = summary?.invocations || {};
  const attemptMetrics = invocationMetrics.attempts || {};

  return (
    <>
      <header className="operations-header">
        <div>
          <h1 className="operations-title">Operations</h1>
          <p className="operations-description">
            Workspace-scoped runtime health, throughput, latency and internal alerts.
          </p>
        </div>
        <div className="operations-controls">
          <label className="operations-window-control">
            <span>Window</span>
            <select value={windowKey} onChange={(event) => setWindowKey(event.target.value)}>
              {WINDOWS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="overview-refresh"
            onClick={loadOperations}
            disabled={state.loading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${state.loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
      </header>

      {state.error ? (
        <div className="overview-warning" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Operations unavailable.</strong> {state.error}
          </span>
        </div>
      ) : null}

      <section className="operations-metrics" aria-label="Operational summary">
        <Metric
          label="Gateway"
          value={
            state.loading && !summary
              ? 'Checking'
              : humanize(summary?.readiness?.status || 'unavailable')
          }
          detail={
            summary
              ? `DB ${summary.readiness.database} · v${summary.readiness.version}`
              : 'Readiness'
          }
          tone={
            state.loading && !summary
              ? 'loading'
              : summary?.readiness?.status === 'ready'
                ? 'ready'
                : 'error'
          }
        />
        <Metric
          label="Install success"
          value={percent(summary?.installations?.resolutionSuccessRatePercent)}
          detail={`${number(summary?.installations?.resolutionAttempts)} resolution attempts`}
        />
        <Metric
          label="Active connections"
          value={number(summary?.connections?.active)}
          detail={`${number(summary?.connections?.total)} total`}
        />
        <Metric
          label="Invocation success"
          value={percent(summary?.invocations?.successRatePercent)}
          detail={`${number(summary?.invocations?.total)} in ${windowKey} · ${number(summary?.invocations?.ratePerHour)} / hr`}
        />
        <Metric
          label="P95 latency"
          value={duration(latency?.overall?.p95Ms)}
          detail={`${number(latency?.sample?.size)} sampled`}
        />
        <Metric
          label="Active alerts"
          value={number(summary?.alerts?.active)}
          detail={`${number(summary?.alerts?.critical)} critical · ${number(summary?.alerts?.warning)} warning`}
          tone={
            summary?.alerts?.critical ? 'error' : summary?.alerts?.warning ? 'loading' : 'ready'
          }
        />
      </section>

      <div className="operations-grid operations-grid-top">
        <Section title="Invocation activity" icon={Activity}>
          <div className="operations-stat-list operations-stat-list-odd">
            <Stat
              label="Successful"
              value={number(summary?.invocations?.successful)}
              tone="success"
            />
            <Stat label="Failed" value={number(summary?.invocations?.failed)} tone="danger" />
            <Stat
              label="Retryable failures"
              value={number(summary?.invocations?.retryableFailures)}
            />
            <Stat label="Success rate" value={percent(summary?.invocations?.successRatePercent)} />
            <Stat
              label="Recovery required"
              value={number(
                firstFinite(
                  invocationMetrics.recoveryRequired,
                  invocationMetrics.recovery_required,
                ),
              )}
              tone="warning"
            />
            <Stat
              label="External attempts"
              value={number(
                firstFinite(
                  attemptMetrics.total,
                  attemptMetrics.totalAttempts,
                  invocationMetrics.totalAttempts,
                ),
              )}
            />
            <Stat
              label="Repeated transient failures"
              value={number(
                firstFinite(
                  attemptMetrics.repeatedTransientFailures,
                  invocationMetrics.repeatedTransientFailures,
                ),
              )}
              tone="danger"
            />
          </div>
        </Section>
        <Section title="Connection health" icon={ShieldCheck}>
          <div className="operations-stat-list">
            <Stat
              label="Healthy"
              value={number(summary?.connections?.health?.healthy)}
              tone="success"
            />
            <Stat
              label="Unhealthy"
              value={number(summary?.connections?.health?.unhealthy)}
              tone="danger"
            />
            <Stat
              label="Degraded"
              value={number(summary?.connections?.health?.degraded)}
              tone="warning"
            />
            <Stat label="Unknown" value={number(summary?.connections?.health?.unknown)} />
            <Stat label="Pending auth" value={number(summary?.connections?.pendingAuth)} />
          </div>
        </Section>
      </div>

      <Section title="Runtime protection" icon={ShieldCheck} className="operations-section-spaced">
        <div className="operations-stat-list">
          <Stat
            label="Open circuits"
            value={number(summary?.protection?.circuits?.open)}
            tone="danger"
          />
          <Stat
            label="Half-open circuits"
            value={number(summary?.protection?.circuits?.halfOpen)}
            tone="warning"
          />
          <Stat
            label="Rate-limited connections"
            value={number(summary?.protection?.rateLimitedConnections)}
            tone="warning"
          />
          <Stat
            label="Active runtime work"
            value={number(summary?.protection?.capacity?.activeInvocations)}
          />
          <Stat
            label="Capacity rejections"
            value={number(summary?.protection?.capacity?.rejections)}
          />
          <Stat
            label="Service lifecycle"
            value={humanize(summary?.protection?.service?.phase || 'unavailable')}
            tone={summary?.protection?.service?.draining ? 'warning' : ''}
          />
          <Stat
            label="Recovery required"
            value={number(invocationMetrics.recoveryRequired)}
            tone="warning"
          />
        </div>
      </Section>

      <Section
        title="Internal alerts"
        icon={CircleAlert}
        className="operations-section-spaced"
        action={<span className="operations-section-note">Evaluated over a fixed 24h window</span>}
      >
        <Table
          headers={[
            'Severity',
            'Condition',
            'Observed',
            'Threshold',
            'Status',
            'First seen',
            'Last seen',
            '',
          ]}
          empty={!data?.alerts?.items?.length ? 'No active operational alerts.' : ''}
        >
          {(data?.alerts?.items || []).map((alert) => (
            <tr key={alert.alertId}>
              <td>
                <span className={`operations-severity operations-severity-${alert.severity}`}>
                  {alert.severity}
                </span>
              </td>
              <td>
                <p className="operations-cell-title">{alert.title}</p>
                <p className="operations-cell-detail">{alert.summary}</p>
              </td>
              <td>{safeMetric(alert.observedValue)}</td>
              <td>{safeMetric(alert.thresholdValue)}</td>
              <td>{humanize(alert.status)}</td>
              <td>{formatDate(alert.firstSeenAt)}</td>
              <td>{formatDate(alert.lastSeenAt)}</td>
              <td className="operations-action-cell">
                {alert.status === 'active' ? (
                  <button
                    type="button"
                    className="operations-ack"
                    onClick={() => acknowledge(alert.alertId)}
                    disabled={acknowledging === alert.alertId}
                  >
                    <Check className="h-3.5 w-3.5" />{' '}
                    {acknowledging === alert.alertId ? 'Saving' : 'Acknowledge'}
                  </button>
                ) : (
                  <span className="operations-muted">Acknowledged</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Section>

      <div className="operations-grid operations-section-spaced">
        <Section title="Installation funnel" icon={Database}>
          <div className="operations-funnel">
            {(data?.funnel?.steps || []).map((step, index) => (
              <div className="operations-funnel-row" key={step.key}>
                <span className="operations-funnel-index">{index + 1}</span>
                <span>{FUNNEL_LABELS[step.key] || humanize(step.key)}</span>
                <strong>{number(step.count)}</strong>
              </div>
            ))}
            {!data?.funnel?.steps?.length ? (
              <Empty
                compact
                text={state.loading ? 'Loading funnel…' : 'No installation activity.'}
              />
            ) : null}
          </div>
          {data?.funnel?.unavailable ? (
            <p className="operations-footnote">
              Keys issued and unresolved expirations are unavailable because they cannot be
              attributed to a receiving workspace before resolution.
            </p>
          ) : null}
        </Section>
        <Section title="Active connection checks" icon={ShieldCheck}>
          <div className="operations-health-list">
            {(summary?.connections?.items || []).map((item) => (
              <Link
                to={`/connections/${item.connectionId}`}
                className="operations-health-row"
                key={item.connectionId}
              >
                <span
                  className={`operations-health-dot operations-health-${healthTone(item.healthStatus)}`}
                />
                <span className="operations-health-name">{item.agentName}</span>
                <span>{String(item.runtimeType || 'unknown').toUpperCase()}</span>
                <span>{humanize(item.healthStatus)}</span>
                <span>{number(item.recentFailureCount)} failures</span>
                <span>{item.checkedAt ? formatDate(item.checkedAt) : 'Not checked'}</span>
                <span className="operations-link">Open</span>
              </Link>
            ))}
            {!summary?.connections?.items?.length ? (
              <Empty
                compact
                text={state.loading ? 'Loading connections…' : 'No active connections.'}
              />
            ) : null}
          </div>
        </Section>
      </div>

      <Section
        title="Latency by stage"
        icon={Clock3}
        className="operations-section-spaced"
        action={
          <span className="operations-section-note">
            Bounded to {number(latency?.sample?.limit || 10000)} most recent completed invocations
          </span>
        }
      >
        <Table
          headers={['Stage', 'Samples', 'Average', 'P50', 'P95', 'P99']}
          empty={!latency?.stages?.length ? 'No stage timing data for this window.' : ''}
        >
          {(latency?.stages || []).map((stage) => (
            <tr key={stage.stage}>
              <td>
                <span className="operations-code">{stage.stage}</span>
              </td>
              <td>{number(stage.count)}</td>
              <td>{duration(stage.averageMs)}</td>
              <td>{duration(stage.p50Ms)}</td>
              <td>{duration(stage.p95Ms)}</td>
              <td>{duration(stage.p99Ms)}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Failure breakdown" icon={AlertTriangle} className="operations-section-spaced">
        <Table
          headers={[
            'Error code',
            'Category',
            'Stage',
            'Health',
            'Runtime',
            'Provider',
            'Retryable',
            'Count',
            '% failures',
          ]}
          empty={!data?.errors?.groups?.length ? 'No failed invocations for this window.' : ''}
        >
          {(data?.errors?.groups || []).map((group, index) => (
            <tr key={`${group.errorCode}_${group.stage}_${index}`}>
              <td>
                <span className="operations-code">{group.errorCode}</span>
              </td>
              <td>{humanize(group.category)}</td>
              <td>{humanize(group.stage)}</td>
              <td>{humanize(group.connectionHealthState)}</td>
              <td>{String(group.runtimeType || 'unknown').toUpperCase()}</td>
              <td>{group.providerHttpStatus || '—'}</td>
              <td>{group.retryable ? 'Yes' : 'No'}</td>
              <td>
                <strong>{number(group.count)}</strong>
              </td>
              <td>{percent(group.percentageOfFailures)}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section
        title="Recent failed or ambiguous invocations"
        icon={AlertTriangle}
        className="operations-section-spaced"
      >
        <Table
          headers={[
            'Trace',
            'Invocation',
            'State',
            'Attempts',
            'Connection',
            'Error code',
            'Stage',
            'Retryable',
            'Retry decision',
            'Duration',
            'Time',
          ]}
          empty={
            !data?.errors?.recentFailures?.length
              ? 'No recent failed or ambiguous invocations.'
              : ''
          }
        >
          {(data?.errors?.recentFailures || []).map((item) => (
            <tr key={item.invocationId}>
              <td>
                <span className="operations-code">{shortId(item.traceId)}</span>
              </td>
              <td>
                <Link className="operations-link operations-code" to="/invocations">
                  {shortId(item.invocationId)}
                </Link>
              </td>
              <td>
                <span
                  className={`operations-severity operations-severity-${invocationStateTone(item)}`}
                >
                  {humanize(invocationState(item))}
                </span>
              </td>
              <td>{number(firstFinite(item.attemptCount, item.attempts?.count))}</td>
              <td>
                <Link
                  className="operations-link operations-code"
                  to={`/connections/${item.connectionId}`}
                >
                  {shortId(item.connectionId)}
                </Link>
              </td>
              <td>
                <span className="operations-code">{item.errorCode}</span>
              </td>
              <td>{humanize(item.stage)}</td>
              <td>{item.retryable ? 'Yes' : 'No'}</td>
              <td>
                <span className="operations-code">{retryDecisionLabel(item)}</span>
              </td>
              <td>{duration(item.durationMs)}</td>
              <td>{formatDate(item.createdAt)}</td>
            </tr>
          ))}
        </Table>
      </Section>
    </>
  );
}

function Metric({ label, value, detail, tone }) {
  return (
    <div className="operations-metric">
      <p>{label}</p>
      <div>
        <span className={`metric-status-dot metric-status-${tone || 'neutral'}`} />
        <strong>{value}</strong>
      </div>
      <small>{detail}</small>
    </div>
  );
}

function Section({ title, icon: Icon, action, className = '', children }) {
  return (
    <section className={`operations-section ${className}`}>
      <div className="operations-section-header">
        <h2>
          <Icon className="h-4 w-4" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, tone = '' }) {
  return (
    <div>
      <span>{label}</span>
      <strong className={tone ? `operations-text-${tone}` : ''}>{value}</strong>
    </div>
  );
}

function Table({ headers, empty, children }) {
  return (
    <div className="operations-table-scroll">
      <table className="operations-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={`${header}_${index}`}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td className="operations-empty" colSpan={headers.length}>
                {empty}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ text }) {
  return <p className="operations-empty-block">{text}</p>;
}

function number(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat('en').format(value) : '—';
}

function percent(value) {
  return Number.isFinite(value) ? `${number(value)}%` : '—';
}

function duration(value) {
  return Number.isFinite(value) ? `${number(value)} ms` : '—';
}

function humanize(value) {
  const text = String(value || 'unknown')
    .replace(/[._-]+/g, ' ')
    .trim();
  return text ? text[0].toUpperCase() + text.slice(1) : 'Unknown';
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function shortId(value) {
  const text = String(value || '');
  return text.length > 12 ? `${text.slice(0, 6)}…${text.slice(-4)}` : text || '—';
}

function healthTone(status) {
  if (status === 'healthy') return 'ready';
  if (['unhealthy', 'unreachable'].includes(status)) return 'error';
  return 'unknown';
}

function firstFinite(...values) {
  return values.find((value) => Number.isFinite(value));
}

function invocationState(item) {
  if (item?.status) return item.status;
  if (item?.recoveryRequired) return 'recovery_required';
  return 'failed';
}

function invocationStateTone(item) {
  const state = invocationState(item);
  if (state === 'recovery_required') return 'warning';
  if (['failed', 'timed_out'].includes(state)) return 'critical';
  return 'info';
}

function retryDecisionLabel(item) {
  const retryDecision = item?.retryDecision;
  const nestedDecision = retryDecision && typeof retryDecision === 'object' ? retryDecision : {};
  const retryState = item?.retryState && typeof item.retryState === 'object' ? item.retryState : {};
  let decision = typeof retryDecision === 'string' ? retryDecision : nestedDecision.decision;
  if (!decision && typeof nestedDecision.allowed === 'boolean') {
    decision = nestedDecision.allowed ? 'allowed' : 'denied';
  }
  if (!decision && typeof retryState.allowed === 'boolean') {
    decision = retryState.allowed ? 'allowed' : 'denied';
  }
  decision ||= retryState.decision;
  const reason =
    item?.retryReason ||
    item?.retryDecisionReason ||
    nestedDecision.reason ||
    retryState.reason ||
    item?.latestAttempt?.retryReason;
  if (!decision && !reason) return '—';
  return [decision ? humanize(decision) : null, reason ? String(reason) : null]
    .filter(Boolean)
    .join(' · ');
}

function safeMetric(value) {
  if (Number.isFinite(value)) return number(value);
  return value ? humanize(value) : '—';
}
