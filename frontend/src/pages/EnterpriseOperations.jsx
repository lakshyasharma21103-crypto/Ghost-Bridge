import {
  AlertTriangle,
  Bell,
  Building2,
  DatabaseBackup,
  Download,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Users,
  Wrench,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/apiClient.js';
import { useAppState } from '../app/AppState.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorAlert, LoadingBlock } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PageHeader, Panel, PrimaryButton, SecondaryButton, formatDate } from './pageChrome.jsx';

function tone(status) {
  return (
    {
      active: 'ready',
      ACTIVE: 'ready',
      COMPLETED: 'ready',
      HEALTHY: 'ready',
      ready: 'ready',
      DRAFT: 'pending',
      PENDING: 'pending',
      RUNNING: 'pending',
      SCHEDULED: 'pending',
      OPEN: 'pending',
      ACKNOWLEDGED: 'pending',
      suspended: 'offline',
      disabled: 'offline',
      revoked: 'offline',
      BLOCKED: 'offline',
      FAILED: 'offline',
      CRITICAL: 'offline',
      UNKNOWN: 'neutral',
      NOT_CONFIGURED: 'neutral',
      RETIRED: 'neutral',
      RELEASED: 'neutral',
    }[status] || 'neutral'
  );
}

function TableRows({ items, empty, render }) {
  if (!items.length)
    return <EmptyState title={empty} detail="No tenant-scoped records are currently available." />;
  return <div className="divide-y divide-slate-200">{items.map(render)}</div>;
}

export function EnterpriseOperations() {
  const { identity, partnerConfigured, recordEvent } = useAppState();
  const [state, setState] = useState({ loading: true, error: null });
  const [data, setData] = useState({
    dashboard: {},
    lifecycle: {},
    maintenance: [],
    members: [],
    accounts: [],
    reviews: [],
    configurations: [],
    incidents: [],
    securityEvents: [],
    notifications: [],
    exports: [],
    recoveries: [],
    dr: [],
  });
  const [busy, setBusy] = useState('');
  const [deletionPreview, setDeletionPreview] = useState(null);
  const query = useMemo(
    () => new URLSearchParams({ workspaceId: identity.receivingWorkspaceId }),
    [identity.receivingWorkspaceId],
  );

  const load = useCallback(async () => {
    if (!partnerConfigured) {
      setState({ loading: false, error: null });
      return;
    }
    setState({ loading: true, error: null });
    try {
      const [
        dashboard,
        lifecycle,
        maintenance,
        members,
        accounts,
        reviews,
        configurations,
        incidents,
        securityEvents,
        notifications,
        exportsData,
        recoveries,
        dr,
      ] = await Promise.all([
        apiClient.get('/admin/operations/dashboard'),
        apiClient.get('/admin/operations/lifecycle'),
        apiClient.get('/admin/operations/maintenance'),
        apiClient.get(`/enterprise/users?${query}`),
        apiClient.get(`/enterprise/service-accounts?${query}`),
        apiClient.get(`/admin/operations/access-reviews?${query}`),
        apiClient.get(`/admin/operations/configurations?${query}`),
        apiClient.get(`/admin/operations/incidents?${query}`),
        apiClient.get(`/admin/operations/security-events?${query}`),
        apiClient.get(`/admin/operations/notifications?${query}`),
        apiClient.get(`/admin/operations/tenant-exports?${query}`),
        apiClient.get(`/admin/operations/recoveries?${query}`),
        apiClient.get(`/admin/operations/dr-status?${query}`),
      ]);
      setData({
        dashboard,
        lifecycle,
        maintenance: maintenance.items || [],
        members: members.items || [],
        accounts: accounts.items || [],
        reviews: reviews.items || [],
        configurations: configurations.items || [],
        incidents: incidents.items || [],
        securityEvents: securityEvents.items || [],
        notifications: notifications.items || [],
        exports: exportsData.items || [],
        recoveries: recoveries.items || [],
        dr: dr.items || [],
      });
      setState({ loading: false, error: null });
    } catch (error) {
      setState({ loading: false, error });
    }
  }, [partnerConfigured, query]);

  useEffect(() => void load(), [load]);

  async function action(key, path, body, confirmation) {
    if (confirmation && !window.confirm(confirmation)) return;
    setBusy(key);
    try {
      await apiClient.post(path, body);
      recordEvent('Enterprise operation completed', key, 'success');
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy('');
    }
  }

  const organization = data.lifecycle.organization;
  const identities = [
    ...data.members.map((item) => ({ ...item, kind: 'Member' })),
    ...data.accounts.map((item) => ({ ...item, kind: 'Service account' })),
  ].slice(0, 12);
  const governance = [
    ...data.reviews.map((item) => ({
      ...item,
      label: item.name,
      detail: `Access review · due ${formatDate(item.dueAt)}`,
    })),
    ...data.configurations.slice(0, 8).map((item) => ({
      ...item,
      label: item.name,
      detail: `${item.category} · version ${item.version}`,
    })),
  ];
  const incidentItems = [
    ...data.incidents.map((item) => ({
      ...item,
      label: item.title,
      detail: `${item.severity} incident`,
    })),
    ...data.securityEvents.map((item) => ({
      ...item,
      label: item.type,
      detail: `${item.severity} security event · ${item.occurrenceCount} occurrence(s)`,
    })),
  ].slice(0, 16);

  return (
    <>
      <PageHeader
        eyebrow="Enterprise control plane"
        title="Administration & recovery"
        description="Tenant lifecycle, maintenance, identity operations, governed configuration, incidents, data management, and recovery readiness."
        actions={
          <SecondaryButton onClick={load} disabled={state.loading}>
            <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
            Refresh
          </SecondaryButton>
        }
      />
      {!partnerConfigured ? (
        <div className="mb-6 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Configure a{' '}
          <Link to="/settings" className="font-semibold underline">
            Partner API key
          </Link>{' '}
          to use enterprise operations.
        </div>
      ) : null}
      {state.error ? <ErrorAlert error={state.error} title="Enterprise operation failed" /> : null}
      {state.loading ? <LoadingBlock label="Loading enterprise operations" /> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <Building2 className="h-5 w-5 text-cyan-700" />
            Organization lifecycle
          </div>
          <div className="flex items-center justify-between border-y border-slate-200 py-3">
            <div>
              <p className="font-medium">{organization?.name || 'Partner organization'}</p>
              <p className="text-xs text-slate-500">
                Revision {organization?.lifecycleRevision || 0} · paused work resumes only by
                controlled action
              </p>
            </div>
            <StatusBadge tone={tone(organization?.status || data.dashboard.organizationState)}>
              {organization?.status || data.dashboard.organizationState || 'active'}
            </StatusBadge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {organization?.status === 'active' ? (
              <PrimaryButton
                disabled={Boolean(busy)}
                onClick={() =>
                  action(
                    'organization-suspend',
                    '/admin/operations/organization/suspend/request',
                    {
                      expectedRevision: organization.lifecycleRevision,
                      reason: 'Administrative console suspension',
                    },
                    `Suspend organization ${organization.name}? New operations will be blocked; in-flight provider work may already have started.`,
                  )
                }
              >
                Request suspension
              </PrimaryButton>
            ) : null}
            {organization?.status === 'suspending' ? (
              <PrimaryButton
                disabled={Boolean(busy)}
                onClick={() =>
                  action(
                    'organization-suspend-complete',
                    '/admin/operations/organization/suspend/complete',
                    {
                      expectedRevision: organization.lifecycleRevision,
                      reason: 'Suspension drain classified',
                    },
                    'Complete organization suspension after reviewing drain status?',
                  )
                }
              >
                Complete suspension
              </PrimaryButton>
            ) : null}
            {organization?.status === 'suspended' ? (
              <PrimaryButton
                disabled={Boolean(busy)}
                onClick={() =>
                  action(
                    'organization-reactivate',
                    '/admin/operations/organization/reactivate/request',
                    {
                      expectedRevision: organization.lifecycleRevision,
                      reason: 'Administrative reactivation requested',
                    },
                    'Request reactivation? Critical incidents, deletion state, bindings, and worker readiness will be checked.',
                  )
                }
              >
                Request reactivation
              </PrimaryButton>
            ) : null}
            {organization?.status === 'reactivating' ? (
              <PrimaryButton
                disabled={Boolean(busy)}
                onClick={() =>
                  action(
                    'organization-reactivate-complete',
                    '/admin/operations/organization/reactivate/complete',
                    {
                      expectedRevision: organization.lifecycleRevision,
                      reason: 'Reactivation readiness validated',
                    },
                    'Complete reactivation? Paused jobs will remain paused.',
                  )
                }
              >
                Complete reactivation
              </PrimaryButton>
            ) : null}
            <SecondaryButton
              disabled={Boolean(busy)}
              onClick={() =>
                action(
                  'controlled-resume',
                  '/admin/operations/organization/resume-work',
                  { reason: 'Operator-controlled resume' },
                  'Resume blocked work? Every job will be revalidated before execution.',
                )
              }
            >
              Controlled work resume
            </SecondaryButton>
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <Wrench className="h-5 w-5 text-cyan-700" />
            Maintenance & drain
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Active</p>
              <p className="text-lg font-semibold">{data.dashboard.drain?.activeJobs || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Queued</p>
              <p className="text-lg font-semibold">{data.dashboard.drain?.queuedJobs || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Blocked</p>
              <p className="text-lg font-semibold">{data.dashboard.drain?.blockedJobs || 0}</p>
            </div>
          </div>
          <TableRows
            items={data.maintenance}
            empty="No maintenance windows"
            render={(item) => (
              <div key={item.maintenanceId} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">
                    {item.mode} · {item.scopeType}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(item.startsAt)} · revision {item.revision}
                  </p>
                </div>
                <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>
              </div>
            )}
          />
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5 text-cyan-700" />
            Members & service accounts
          </div>
          <TableRows
            items={identities}
            empty="No enterprise identities"
            render={(item) => (
              <div
                key={`${item.kind}:${item.id}`}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium">{item.displayName || item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.kind} ·{' '}
                    {item.externalWorkspaceId ||
                      item.externalWorkspaceIds?.join(', ') ||
                      'organization'}
                  </p>
                </div>
                <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>
              </div>
            )}
          />
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <Settings2 className="h-5 w-5 text-cyan-700" />
            Access reviews & configuration
          </div>
          <p className="text-sm text-slate-600">
            Review decisions and remediation are separate; active configuration versions are
            immutable.
          </p>
          <TableRows
            items={governance}
            empty="No governed administration records"
            render={(item) => (
              <div
                key={item.campaignId || `${item.configurationId}:${item.version}`}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.detail}</p>
                </div>
                <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>
              </div>
            )}
          />
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-5 w-5 text-cyan-700" />
            Incidents & security events
          </div>
          <TableRows
            items={incidentItems}
            empty="No incidents or security events"
            render={(item) => (
              <div
                key={item.incidentId || item.securityEventId}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.detail}</p>
                </div>
                <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>
              </div>
            )}
          />
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <Bell className="h-5 w-5 text-cyan-700" />
            Administrative notifications
          </div>
          <TableRows
            items={data.notifications.slice(0, 12)}
            empty="No administrative notifications"
            render={(item) => (
              <div key={item.notificationId} className="py-3">
                <div className="flex justify-between gap-3">
                  <p className="font-medium">{item.title}</p>
                  <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.safeSummary}</p>
              </div>
            )}
          />
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold">
              <Download className="h-5 w-5 text-cyan-700" />
              Tenant data management
            </span>
            <PrimaryButton
              disabled={Boolean(busy)}
              onClick={() =>
                action(
                  'tenant-export',
                  '/admin/operations/tenant-exports',
                  { workspaceId: identity.receivingWorkspaceId },
                  'Create a bounded redacted tenant export? Secrets, ciphertext, credentials, and private invocation payloads are excluded.',
                )
              }
            >
              Create export
            </PrimaryButton>
          </div>
          <TableRows
            items={data.exports}
            empty="No tenant exports"
            render={(item) => (
              <div key={item.tenantExportId} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-mono text-xs">{item.tenantExportId}</p>
                  <p className="text-xs text-slate-500">{formatDate(item.requestedAt)}</p>
                </div>
                <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>
              </div>
            )}
          />
          <div className="mt-4 border-t border-slate-200 pt-4">
            <SecondaryButton
              disabled={Boolean(busy)}
              onClick={async () => {
                setBusy('deletion-preview');
                try {
                  setDeletionPreview(
                    await apiClient.post('/admin/operations/tenant-deletion/preview', {}),
                  );
                } catch (error) {
                  setState((current) => ({ ...current, error }));
                } finally {
                  setBusy('');
                }
              }}
            >
              Preview tenant deletion
            </SecondaryButton>
          </div>
          {deletionPreview ? (
            <div className="mt-3 border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              <p className="font-semibold">Preview only — nothing deleted</p>
              <p className="mt-1">
                Organization: {deletionPreview.organizationId} · blockers:{' '}
                {deletionPreview.blockers.length} · active work:{' '}
                {deletionPreview.affected.activeWork}
              </p>
              <p className="mt-1 break-all">Fingerprint: {deletionPreview.operationFingerprint}</p>
              <p className="mt-1">Confirmation text: {deletionPreview.confirmationText}</p>
            </div>
          ) : null}
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <DatabaseBackup className="h-5 w-5 text-cyan-700" />
            Recovery & DR readiness
          </div>
          <p className="mb-3 border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
            DR status comes only from configured sources. This service does not configure MongoDB
            Atlas backups.
          </p>
          <TableRows
            items={data.dr}
            empty="No DR sources configured"
            render={(item) => (
              <div key={item.component} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{item.component.replaceAll('_', ' ')}</p>
                  <p className="text-xs text-slate-500">Source: {item.source}</p>
                </div>
                <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>
              </div>
            )}
          />
          {data.recoveries.length ? (
            <p className="mt-3 text-xs text-slate-500">
              Open recovery records: {data.recoveries.length}
            </p>
          ) : null}
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5 text-cyan-700" />
            Operational runbooks
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              'MongoDB outage',
              'Worker restart',
              'Encryption-key provider outage',
              'External-agent outage',
              'Credential compromise',
              'Tenant suspension',
              'Audit integrity failure',
              'Failed deployment rollback',
              'Accidental configuration activation',
              'Evidence-export recovery',
            ].map((item) => (
              <div key={item} className="border border-slate-200 px-3 py-2">
                {item}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
