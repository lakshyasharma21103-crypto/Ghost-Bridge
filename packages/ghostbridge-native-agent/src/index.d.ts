import type {
  AgentPassport,
  AuthenticationMode,
  CapabilityContract,
  ExecutionReceipt,
  ExecutionTask,
  InvocationEnvelope,
} from '@ghostbridge/protocol-core';

export interface SafeLogger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export interface AuthenticatedHostPrincipal {
  subjectType?: string;
  subjectId: string;
  authenticationMethod: string;
  organizationScope?: string;
  permittedOrganizationScopes?: string[];
  workspaceScope?: string;
  permittedWorkspaceScopes?: string[];
  credentialReference?: string;
}

export interface AuthorizationRequest {
  action: string;
  capabilityKey: string;
  organizationScope: string;
  workspaceScope?: string;
  connectionId?: string;
  initiatingSubject?: string;
  authenticatedPrincipal?: AuthenticatedHostPrincipal;
}

export interface SimplifiedAuthorizationDecision {
  allowed: boolean;
  code?: string;
  safeMessage?: string;
}

export interface VerifiedAuthorizationDecision {
  allowed: true;
  principalId: string;
  policyDecisionId: string;
  evaluatedAt: string;
  policyVersion: string;
}

export type AuthorizationDecision =
  | boolean
  | SimplifiedAuthorizationDecision
  | VerifiedAuthorizationDecision;

export type AuthorizationHandler = (
  request: AuthorizationRequest,
) => AuthorizationDecision | Promise<AuthorizationDecision>;

export interface ProtocolStoreCapabilities {
  readonly persistence: 'durable' | 'deterministic_local';
  readonly productionEligible: boolean;
  readonly atomicCompareAndSet: boolean;
  readonly transactionalTerminalWrite: boolean;
  readonly atomicInstallGrantRedemption: boolean;
  readonly adapterName: string;
  readonly adapterVersion: string;
}

export interface DurableProtocolStore<T = unknown> {
  readonly capabilities: ProtocolStoreCapabilities;
  get(key: string): Promise<T | undefined> | T | undefined;
  put(key: string, value: T): Promise<void> | void;
  delete(key: string): Promise<boolean> | boolean;
  has(key: string): Promise<boolean> | boolean;
  values(): Promise<T[]> | T[];
  scan?(): Promise<T[]> | T[];
  compareAndSet(
    key: string,
    expectedValue: T | undefined,
    nextValue: T,
  ): Promise<boolean> | boolean;
}

export type PromiseCompatibleTaskStore =
  | DurableProtocolStore<ExecutionTask>
  | Pick<Map<string, ExecutionTask>, 'get' | 'set'>;

export interface DurableApprovalDecisionStore
  extends DurableProtocolStore<Record<string, unknown>> {
  putDecision(decision: Record<string, unknown>): unknown;
  consumeApprovedDecision(
    criteria: Record<string, unknown>,
  ): Promise<Record<string, unknown> | undefined> | Record<string, unknown> | undefined;
}

export interface TerminalTransactionStore {
  readonly capabilities: ProtocolStoreCapabilities & {
    readonly transactionalTerminalWrite: boolean;
  };
  commitTerminal(input: {
    task: ExecutionTask;
    receipt: ExecutionReceipt;
    expectedTaskStates: string[];
  }): Promise<{
    committed: boolean;
    idempotent?: boolean;
    recoveryRequired?: boolean;
    reasonCode?: string;
    task?: ExecutionTask;
    receipt?: ExecutionReceipt;
  }>;
  recoverTerminalWrites(): Promise<Array<Record<string, unknown>>>;
}

export interface InstallGrantTransactionStore {
  readonly capabilities: ProtocolStoreCapabilities & {
    readonly atomicInstallGrantRedemption: boolean;
  };
  redeemInstallGrant(input: {
    keyHash: string;
    now: string;
    organizationScope: string;
    workspaceScope?: string;
    approvedCapabilityKeys: string[];
    connection: Record<string, unknown> & {
      connectionId: string;
    };
  }): Promise<{
    grant: Record<string, unknown>;
    connection: Record<string, unknown>;
  }>;
}

export interface ProtocolStores {
  installGrants: DurableProtocolStore;
  connections: DurableProtocolStore;
  tasks: DurableProtocolStore<ExecutionTask>;
  taskContexts: DurableProtocolStore;
  receipts: DurableProtocolStore;
  approvals: DurableProtocolStore;
  approvalDecisions: DurableApprovalDecisionStore;
  idempotency: DurableProtocolStore;
  replay: DurableProtocolStore;
  revocation: DurableProtocolStore;
  terminalTransactions: TerminalTransactionStore;
  installGrantTransactions: InstallGrantTransactionStore;
  close?(): Promise<void>;
}

export function createFileProtocolStores(options: {
  directory: string;
}): Readonly<ProtocolStores>;

export interface CapabilityHandlerContext {
  organizationScope: string;
  workspaceScope?: string;
  invocationId: string;
  taskId: string;
  initiatingSubject: string;
  deadline: string;
  idempotencyKey?: string;
  traceContext?: Record<string, string>;
  approvalReference?: string;
  signal: AbortSignal;
  logger: SafeLogger;
}

export interface CapabilityDefinition<TInput = Record<string, unknown>, TOutput = unknown> {
  contract?: Omit<CapabilityContract, 'capabilityKey'>;
  inputContract?: Record<string, unknown>;
  outputContract?: Record<string, unknown>;
  inputContractReference?: string;
  outputContractReference?: string;
  capabilityVersion?: string;
  displayName?: string;
  safeDescription?: string;
  acceptedDataClasses?: string[];
  producedDataClasses?: string[];
  prohibitedDataClasses?: string[];
  riskCategory?: CapabilityContract['riskCategory'];
  sideEffectCategory?: CapabilityContract['sideEffectCategory'];
  approvalRequirement?: string;
  idempotencyRequirement?: string;
  cancellation?: boolean;
  asynchronousExecution?: boolean;
  timeoutBounds?: { minimumMs: number; maximumMs: number };
  receiptProfile?: string;
  delegationPolicy?: Record<string, unknown>;
  delegationRequired?: boolean;
  approvalLimits?: Record<string, unknown>;
  requiredPermissions?: string[];
  status?: string;
  handler(context: {
    input: TInput;
    context: CapabilityHandlerContext;
  }): Promise<{ outcome: string; output: TOutput }>;
}

export interface GhostBridgeAgent {
  configurePassport(passport: AgentPassport): this;
  configureDiscovery(discovery: Record<string, unknown>): this;
  configureAuthorization(handler: AuthorizationHandler): this;
  configureTaskStore(store: PromiseCompatibleTaskStore): this;
  configureApprovalHandler(handler: (...args: unknown[]) => unknown): this;
  configureReceiptIssuer(issuer: (...args: unknown[]) => unknown): this;
  configureRevocationResolver(resolver: (...args: unknown[]) => unknown): this;
  configureLogger(logger: Partial<SafeLogger>): this;
  configureMetrics(
    sink: (metric: { category: string; outcome: string; value: number }) => void,
  ): this;
  capability<TInput, TOutput>(
    capabilityKey: string,
    definition: CapabilityDefinition<TInput, TOutput>,
  ): this;
  registerCapability<TInput, TOutput>(
    capabilityKey: string,
    definition: CapabilityDefinition<TInput, TOutput>,
  ): this;
  listCapabilities(): CapabilityContract[];
  searchCapabilities(query: Record<string, unknown>): Promise<Record<string, unknown>>;
  getCapabilityDetails(query: Record<string, unknown>): Promise<CapabilityContract>;
  issueInstallGrant(scope: {
    organizationScope: string;
    workspaceScope?: string;
    ttlMs?: number;
    restrictions?: string[];
    allowedCapabilityKeys?: string[];
  }):
    | { key: string; expiresAt: string; grantReference: string }
    | Promise<{ key: string; expiresAt: string; grantReference: string }>;
  resolveInstallGrant(
    key: string,
    scope: Record<string, string>,
  ): Record<string, unknown> | Promise<Record<string, unknown>>;
  resolveInstallGrantTrusted(key: string, scope: Record<string, string>): Promise<Record<string, unknown>>;
  redeemInstallGrant(
    key: string,
    scope: Record<string, unknown> & {
      organizationScope: string;
      workspaceScope?: string;
      authenticationMode?: AuthenticationMode;
      approvedCapabilityKeys?: string[];
    },
  ): Record<string, unknown> | Promise<Record<string, unknown>>;
  issueApprovalChallenge(
    input: Record<string, unknown>,
  ): Record<string, unknown> | Promise<Record<string, unknown>>;
  submitApprovalDecision(decision: Record<string, unknown>): Record<string, unknown> | Promise<Record<string, unknown>>;
  invoke(
    connectionId: string,
    envelope: InvocationEnvelope,
  ): Promise<{
    task: ExecutionTask;
    receipt?: ExecutionReceipt;
    output?: unknown;
    approvalChallenge?: Record<string, unknown>;
    idempotentReplay?: boolean;
  }>;
  getTask(taskId: string): ExecutionTask | Promise<ExecutionTask>;
  cancelTask(taskId: string): Promise<ExecutionTask>;
  getReceipt(receiptId: string): ExecutionReceipt | Promise<ExecutionReceipt>;
  checkRevocation(
    subjectType: string,
    subjectReference: string,
  ): Record<string, unknown> | Promise<Record<string, unknown>>;
  revokeConnection(
    connectionId: string,
    reasonCode?: string,
  ): Record<string, unknown> | Promise<Record<string, unknown>>;
  getConnectionCount(): number | Promise<number>;
  getMetrics(): Array<{ category: string; outcome: string; value: number }>;
  listen(options?: { port?: number; host?: string }): Promise<{
    baseUrl: string;
    address: unknown;
    close(): Promise<void>;
  }>;
  close(): Promise<void>;
}

export const AUDIT_EVENTS: readonly string[];
export function createGhostBridgeAgent(options: {
  passport: AgentPassport;
  mode?: 'localFixtureMode' | 'developmentMode' | 'productionMode';
  localFixtureMode?: boolean;
  publicBaseUrl?: string;
  approveAllFixtureCapabilities?: boolean;
  enableLegacyGrantPath?: boolean;
  stores?: Partial<ProtocolStores>;
  taskStore?: PromiseCompatibleTaskStore;
  discovery?: Record<string, unknown>;
  authenticationModes?: AuthenticationMode[];
  authenticationSetupReference?: string;
  clock?: () => number;
  authorization?: AuthorizationHandler;
  authorizationTimeoutMs?: number;
  authenticateHttpRequest?: (input: {
    request: unknown;
    operation: string;
    routeParameters: Record<string, unknown>;
    headers: Readonly<Record<string, unknown>>;
  }) => AuthenticatedHostPrincipal | Promise<AuthenticatedHostPrincipal>;
  fixtureHttpPrincipal?: AuthenticatedHostPrincipal;
  approvalHandler?: (...args: unknown[]) => unknown;
  receiptIssuer?: (...args: unknown[]) => unknown;
  receiptIssuerGuaranteesSigned?: boolean;
  receiptVerificationJwks?: Record<string, unknown>;
  receiptVerificationObserver?: (result: {
    valid: false;
    errorCode: string;
    safeMessage: string;
  }) => void;
  revocationResolver?: (...args: unknown[]) => unknown;
  logger?: Partial<SafeLogger>;
  metrics?: (metric: { category: string; outcome: string; value: number }) => void;
  auditSink?: (event: {
    event: string;
    occurredAt: string;
    fields: Record<string, unknown>;
  }) => void;
  requestIntegrity?: {
    required?: boolean;
    jwks?: Record<string, unknown>;
    audience?: string;
    replayCache?: unknown;
    [key: string]: unknown;
  };
  requestIntegrityVerifier?: (input: Record<string, unknown>) => Promise<boolean | { valid: boolean }> | boolean | { valid: boolean };
  agentSigner?: {
    kid: string;
    algorithm: 'EdDSA';
    sign(data: Uint8Array, context?: Record<string, unknown>): Promise<Uint8Array> | Uint8Array;
  };
  agentExecutionKeyId?: string;
  receiptAudience?: string;
  receiptExpiresAt?: string;
  hostAudience?: string;
  capabilityManifest?: Record<string, unknown>;
  connectionOfferSigner?: (offer: Record<string, unknown>) => Promise<Record<string, unknown>>;
  installResolutionSigner?: (resolution: Record<string, unknown>) => Promise<Record<string, unknown>>;
}): GhostBridgeAgent;
