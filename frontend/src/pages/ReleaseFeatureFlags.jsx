import { ReleaseInventory } from '../components/ReleaseInventory.jsx';

export function ReleaseFeatureFlags() {
  return (
    <ReleaseInventory
      title="Feature Flags"
      description="Versioned bounded flags, environment and region scopes, expiration, ownership, and audited kill switches."
      endpoint="/releases/feature-flags"
      emptyLabel="No release feature flags are visible."
      columns={[
        { label: 'Key', key: 'key' },
        { label: 'Version', key: 'version' },
        { label: 'Scope', key: 'scope' },
        { label: 'Status', key: 'status', status: true },
        { label: 'Default', value: (item) => item.defaultState ? 'enabled' : 'disabled' },
        { label: 'Rollout', value: (item) => `${(Number(item.rolloutPercentageBasisPoints || 0) / 100).toFixed(2)}%` },
        { label: 'Environment', key: 'allowedEnvironmentCategories' },
        { label: 'Regions', key: 'allowedRegionIds' },
        { label: 'Kill switch', value: (item) => item.killSwitch ? 'active' : 'inactive', status: true },
        { label: 'Expires', key: 'expiresAt', date: true },
        { label: 'Owner', key: 'owner' },
      ]}
      actions={[
        { label: 'Activate', path: 'activate', when: (item) => item.status === 'draft' },
        { label: 'Activate kill switch', path: 'kill-switch', when: (item) => item.status === 'active' && !item.killSwitch },
      ]}
    />
  );
}
