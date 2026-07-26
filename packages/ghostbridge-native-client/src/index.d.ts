import type {
  AgentPassport,
  AuthenticationMode,
  CapabilityContract,
  CompatibilityResult,
  DiscoveryDocument,
  ExecutionReceipt,
  ExecutionTask,
  InvocationEnvelope,
  ProtocolVerifier,
  ProfileDeclarations,
  RevocationStatus,
} from '@ghostbridge/protocol-core';

export interface NativeClientTransportSecurityProperties {
  dnsRebindingResistant: boolean;
  addressPinning: boolean;
  redirects: 'rejected' | string;
  tlsServerNameValidation: boolean | 'user-agent-managed';
  streamingResponseLimit?: boolean;
  implementation?: string;
}

export interface NativeClientTransportResponse {
  status: number;
  ok: boolean;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

export interface NativeClientTransport {
  readonly securityProperties: NativeClientTransportSecurityProperties;
  request(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      signal?: AbortSignal;
      timeoutMs?: number;
      maximumBytes?: number;
      expectedContentTypes?: string[];
      allowQuery?: boolean;
    },
  ): Promise<NativeClientTransportResponse>;
}

export interface GhostBridgeClientOptions {
  baseUrl?: string;
  localFixtureMode?: boolean;
  allowedLocalOrigins?: string[];
  approveAllFixtureCapabilities?: boolean;
  installGrantResolver?: (input: {
    grant: string;
    organizationScope: string;
    workspaceScope?: string;
  }) => Promise<string | { baseUrl: string }> | string | { baseUrl: string };
  issuerKeyResolver?:
    | ((issuer: string, keyReference?: string) => Promise<unknown> | unknown)
    | { resolveIssuerKey(issuer: string, keyReference?: string): Promise<unknown> };
  authenticationHandler?: (input: {
    mode: AuthenticationMode;
    setupReference?: string;
    agent: Record<string, unknown>;
    scope: { organizationScope: string; workspaceScope?: string };
  }) => Promise<{
    credentialReference?: string;
    transportBindingReference?: string;
    expiresAt?: string;
    [key: string]: unknown;
  }>;
  supportedProtocolVersions?: string[];
  profiles?: ProfileDeclarations;
  supportedAuthenticationModes?: AuthenticationMode[];
  preferredAuthenticationMode?: AuthenticationMode;
  extensions?: Array<Record<string, unknown>>;
  requiredProfiles?: string[];
  requiredGovernedFeatures?: { tasks?: boolean; receipts?: boolean };
  transport?: NativeClientTransport;
  transportHeaders?:
    | Record<string, string>
    | ((input: {
        url: string;
        method: string;
      }) => Promise<Record<string, string>> | Record<string, string>);
  serverMode?: boolean;
  /**
   * User-provided Fetch is explicitly not DNS-pinned. Trust-required
   * production Node clients reject it unless serverMode is disabled.
   */
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  requestIdFactory?: () => string;
  traceIdFactory?: () => string;
  trust?: {
    required?: boolean;
    localTestMode?: boolean;
    allowedLocalIssuers?: string[];
    hostAudience?: string;
    metadata?: Record<string, unknown>;
    jwks?: Record<string, unknown>;
    organizationPolicy?: Record<string, unknown>;
    workspacePolicy?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface ScopedCapabilityQuery {
  query?: string;
  organizationScope: string;
  workspaceScope?: string;
  riskCategories?: string[];
  sideEffectCategories?: string[];
  approvalRequired?: boolean;
  agentIds?: string[];
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
}

export interface CapabilityCatalogItem {
  agentDisplayName?: string;
  agentId?: string;
  capabilityKey: string;
  capabilityDisplayName: string;
  safeDescription: string;
  riskCategory: string;
  sideEffectCategory: string;
  approvalRequired: boolean;
  conformanceLevel?: string;
  availabilityState: string;
}

export interface CapabilityDetailsQuery {
  agentId?: string;
  capabilityKey: string;
  capabilityVersion?: string;
  organizationScope: string;
  workspaceScope?: string;
  signal?: AbortSignal;
}

export interface InvocationResult<TOutput = unknown> {
  task: ExecutionTask;
  receipt?: ExecutionReceipt;
  output?: TOutput;
  approvalChallenge?: Record<string, unknown>;
  idempotentReplay?: boolean;
}

export interface InstallationPreview {
  protocolVersion: string;
  agent: Record<string, unknown>;
  scope: { organizationScope: string; workspaceScope?: string };
  compatibility: CompatibilityResult;
  authentication: { selectedMode: AuthenticationMode; supportedModes: AuthenticationMode[] };
  profiles: ProfileDeclarations;
  extensions: Array<Record<string, unknown>>;
  capabilities: CapabilityContract[];
}

export interface InvokeOptions<TInput = Record<string, unknown>> {
  agentId?: string;
  connectionId?: string;
  capability: string;
  capabilityVersion?: string;
  input: TInput;
  organizationScope?: string;
  workspaceScope?: string;
  initiatingSubject?: string;
  invocationId?: string;
  messageId?: string;
  deadline?: string | Date;
  timeoutMs?: number;
  idempotencyKey?: string;
  approvalReference?: string;
  delegationReference?: string;
  traceContext?: Record<string, string>;
  payloadClassification?: string[];
  receiptProfile?: string;
  signal?: AbortSignal;
}

export interface WatchTaskOptions {
  signal?: AbortSignal;
  maximumAttempts?: number;
  minimumDelayMs?: number;
  maximumDelayMs?: number;
}

export class GhostBridgeError extends Error {
  constructor(code: string, message: string, options?: Record<string, unknown>);
  readonly code: string;
  readonly errorCode: string;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly requestId?: string;
  readonly traceId?: string;
  readonly details?: Record<string, unknown>;
}
export class ProtocolValidationError extends GhostBridgeError {}
export class UnsupportedProtocolVersionError extends GhostBridgeError {}
export class PassportValidationError extends GhostBridgeError {}
export class InstallGrantError extends GhostBridgeError {}
export class CapabilityNotFoundError extends GhostBridgeError {}
export class ScopeMismatchError extends GhostBridgeError {}
export class DelegationError extends GhostBridgeError {}
export class DataContractViolationError extends GhostBridgeError {}
export class ApprovalRequiredError extends GhostBridgeError {}
export class DeadlineExceededError extends GhostBridgeError {}
export class TaskCancelledError extends GhostBridgeError {}
export class RevokedError extends GhostBridgeError {}
export class RateLimitedError extends GhostBridgeError {}
export class ProviderUnavailableError extends GhostBridgeError {}
export class CompatibilityError extends GhostBridgeError {}
export class AuthenticationError extends GhostBridgeError {}
export class AuthorizationError extends GhostBridgeError {}
export class ContractViolationError extends GhostBridgeError {}
export class TaskFailedError extends GhostBridgeError {}

export class GhostBridgeClient {
  constructor(options: GhostBridgeClientOptions);
  discover(): Promise<DiscoveryDocument>;
  negotiateVersion(options?: Record<string, unknown>): Promise<{
    selectedVersion: string;
    stability: string;
    warnings: string[];
  }>;
  getPassport(): Promise<AgentPassport>;
  discoverIssuer(issuerId: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  getIssuerMetadata(issuerId: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  getIssuerKeys(metadataOrIssuer: string | Record<string, unknown>, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  evaluateIssuerTrust(input?: Record<string, unknown>): Readonly<Record<string, unknown>>;
  verifyPassport(passport: AgentPassport, options?: Record<string, unknown>): Promise<Readonly<Record<string, unknown>>>;
  verifyCapabilityManifest(manifest: Record<string, unknown>, contracts: CapabilityContract[], passport: AgentPassport, options?: Record<string, unknown>): Promise<Readonly<Record<string, unknown>>>;
  verifyInstallResolution(resolution: Record<string, unknown>, options?: Record<string, unknown>): Promise<Readonly<Record<string, unknown>>>;
  verifyConnectionOffer(offer: Record<string, unknown>, options?: Record<string, unknown>): Promise<Readonly<Record<string, unknown>>>;
  getRevocationSet(issuerId: string, options?: Record<string, unknown>): Promise<Readonly<Record<string, unknown>>>;
  refreshTrustState(issuerId: string, options?: Record<string, unknown>): Promise<Readonly<Record<string, unknown>>>;
  inspectConnectionTrust(connectionId: string): Record<string, unknown>;
  listCapabilities(): Promise<CapabilityContract[]>;
  searchCapabilities(query: ScopedCapabilityQuery): Promise<{
    items: CapabilityCatalogItem[];
    nextCursor?: string;
    totalBounded: number;
  }>;
  getCapabilityDetails(query: CapabilityDetailsQuery): Promise<CapabilityContract>;
  resolveInstallGrant(
    grant: string,
    scope: { organizationScope: string; workspaceScope?: string },
  ): Promise<Record<string, unknown>>;
  previewInstall(options: {
    grant: string;
    organizationScope: string;
    workspaceScope?: string;
  }): Promise<InstallationPreview>;
  install(
    grant: string,
    scope: { organizationScope: string; workspaceScope?: string },
  ): Promise<Record<string, unknown>>;
  install(options: {
    grant: string;
    organizationScope: string;
    workspaceScope?: string;
    approvedCapabilityKeys?: string[];
  }): Promise<Record<string, unknown>>;
  invoke<TOutput = unknown>(
    connectionId: string,
    envelope: InvocationEnvelope,
  ): Promise<InvocationResult<TOutput>>;
  invoke<TInput = Record<string, unknown>, TOutput = unknown>(
    options: InvokeOptions<TInput>,
  ): Promise<InvocationResult<TOutput>>;
  invokeAndWait<TInput = Record<string, unknown>, TOutput = unknown>(
    options: InvokeOptions<TInput>,
    waitOptions?: WatchTaskOptions,
  ): Promise<InvocationResult<TOutput>>;
  getTask(taskId: string, options?: { signal?: AbortSignal }): Promise<ExecutionTask>;
  waitForTask(taskId: string, options?: WatchTaskOptions): Promise<ExecutionTask>;
  watchTask(taskId: string, options?: WatchTaskOptions): AsyncIterable<ExecutionTask>;
  cancelTask(taskId: string): Promise<ExecutionTask>;
  submitApprovalDecision(
    challengeId: string,
    decision: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  getReceipt(receiptId: string): Promise<ExecutionReceipt>;
  verifyReceipt(
    receiptOrId: string | ExecutionReceipt,
    options?: { verifier?: ProtocolVerifier },
  ): Promise<{
    valid: boolean;
    proofState: 'valid' | 'invalid' | 'unverified';
    receipt: ExecutionReceipt;
  }>;
  checkRevocation(subjectType: string, subjectReference: string): Promise<RevocationStatus>;
  revokeConnection(
    connectionId: string,
    options?: { reasonCode?: string },
  ): Promise<RevocationStatus>;
  close(): void;
}

export function classifyRetry(
  error: unknown,
  options?: { method?: string; idempotent?: boolean; idempotencyKey?: string },
): { retryable: boolean; reason: string; retryAfterMs?: number };
export function createGhostBridgeClient(options: GhostBridgeClientOptions): GhostBridgeClient;
export function discover(
  baseUrl: string,
  options?: Omit<GhostBridgeClientOptions, 'baseUrl'>,
): Promise<DiscoveryDocument>;
