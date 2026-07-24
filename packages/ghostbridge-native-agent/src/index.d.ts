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
  delegationReference?: string;
  delegation?: Record<string, unknown>;
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
  configureAuthorization(
    handler: (request: Record<string, unknown>) =>
      | boolean
      | { allowed: boolean; code?: string; safeMessage?: string }
      | Promise<boolean | { allowed: boolean; code?: string; safeMessage?: string }>,
  ): this;
  configureTaskStore(store: Map<string, ExecutionTask>): this;
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
  }): { key: string; expiresAt: string; grantReference: string };
  resolveInstallGrant(key: string, scope: Record<string, string>): Record<string, unknown>;
  resolveInstallGrantTrusted(key: string, scope: Record<string, string>): Promise<Record<string, unknown>>;
  redeemInstallGrant(
    key: string,
    scope: Record<string, unknown> & {
      organizationScope: string;
      workspaceScope?: string;
      authenticationMode?: AuthenticationMode;
      approvedCapabilityKeys?: string[];
    },
  ): Record<string, unknown>;
  registerDelegation(grant: Record<string, unknown>): Record<string, unknown>;
  issueApprovalChallenge(input: Record<string, unknown>): Record<string, unknown>;
  submitApprovalDecision(decision: Record<string, unknown>): Record<string, unknown>;
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
  getTask(taskId: string): ExecutionTask;
  cancelTask(taskId: string): ExecutionTask;
  getReceipt(receiptId: string): ExecutionReceipt;
  checkRevocation(subjectType: string, subjectReference: string): Record<string, unknown>;
  revokeConnection(connectionId: string, reasonCode?: string): Record<string, unknown>;
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
  discovery?: Record<string, unknown>;
  authenticationModes?: AuthenticationMode[];
  authenticationSetupReference?: string;
  clock?: () => number;
  authorization?: (...args: unknown[]) => unknown;
  approvalHandler?: (...args: unknown[]) => unknown;
  receiptIssuer?: (...args: unknown[]) => unknown;
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
