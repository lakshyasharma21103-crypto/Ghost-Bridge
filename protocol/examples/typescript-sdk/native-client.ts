import {
  CompatibilityError,
  createGhostBridgeClient,
} from '@ghostbridge/native-client';

declare const grant: string;
declare function resolveOpaqueGrant(input: {
  grant: string;
  organizationScope: string;
  workspaceScope?: string;
}): Promise<{ baseUrl: string }>;

const host = createGhostBridgeClient({
  installGrantResolver: resolveOpaqueGrant,
  issuerKeyResolver: async () => ({ verified: true }),
  authenticationHandler: async ({ mode }) => ({
    connectionReference: `host-managed:${mode}`,
  }),
  requiredProfiles: ['ghostbridge.core'],
  supportedAuthenticationModes: ['platform_brokered', 'signed_request'],
  timeoutMs: 5_000,
});

async function run() {
  const scope = {
    organizationScope: 'org_demo',
    workspaceScope: 'workspace_development',
  };
  const preview = await host.previewInstall({ grant, ...scope });
  if (preview.compatibility.status === 'incompatible') {
    throw new CompatibilityError(
      'CORE_PROFILE_REQUIRED',
      'The external agent is not compatible with this Host Application.',
    );
  }
  const installed = await host.install({
    grant,
    ...scope,
    approvedCapabilityKeys: preview.capabilities.map(
      (capability: { capabilityKey: string }) => capability.capabilityKey,
    ),
  });
  const catalog = await host.searchCapabilities({
    query: 'create app',
    ...scope,
    limit: 10,
  });
  const result = await host.invokeAndWait<
    { name: string; template: string },
    { applicationId: string; status: string }
  >({
    connectionId: String(installed.connectionId),
    capability: catalog.items[0].capabilityKey,
    input: { name: 'Acme Portal', template: 'react' },
    idempotencyKey: 'create-acme-portal-v1',
  });
  if (result.receipt) await host.verifyReceipt(result.receipt);
  await host.revokeConnection(String(installed.connectionId));
  host.close();
}

void run();
