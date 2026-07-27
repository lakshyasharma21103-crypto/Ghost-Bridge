export const PROTOCOL_VERSION: 'ghostbridge/0.1-draft';
export const PROTOCOL_STABILITY: 'experimental';
export const ERROR_CODES: readonly string[];
export const DEFAULT_LIMITS: Readonly<WireLimits>;
export const PROFILE_IDS: Readonly<{
  core: 'ghostbridge.core';
  governedExecution: 'ghostbridge.governed-execution';
  agentCoordination: 'ghostbridge.agent-coordination.experimental';
}>;
export const AUTHENTICATION_MODES: readonly AuthenticationMode[];
export const DEFAULT_PROFILE_DECLARATIONS: Readonly<ProfileDeclarations>;

export type AuthenticationMode =
  | 'none'
  | 'oauth'
  | 'mutual_tls'
  | 'signed_request'
  | 'managed_credential'
  | 'delegated_credential'
  | 'platform_brokered';

export interface ProfileSupport {
  id?: string;
  supported: boolean;
  status?: 'draft' | 'experimental' | 'deferred' | 'deprecated';
  conformance: string[];
}

export interface ProfileDeclarations {
  core?: ProfileSupport;
  governedExecution?: ProfileSupport;
  agentCoordination?: ProfileSupport;
}

export interface WireLimits {
  maximumMessageBytes: number;
  maximumStringLength: number;
  maximumArrayLength: number;
  maximumObjectDepth: number;
}

export interface ProtocolErrorMessage {
  protocolVersion: string;
  messageType: 'protocol.error';
  errorCode: string;
  safeMessage: string;
  retryable: boolean;
  retryAfterMs?: number;
  requestId?: string;
  traceId?: string;
  details?: Record<string, unknown>;
}

export interface CommonEnvelope<TPayload extends Record<string, unknown>> {
  protocolVersion: 'ghostbridge/0.1-draft';
  messageType: string;
  messageId: string;
  issuedAt: string;
  expiresAt?: string;
  issuer: string;
  audience?: string;
  organizationScope?: string;
  workspaceScope?: string;
  subject?: string;
  requestId?: string;
  traceId?: string;
  parentMessageId?: string;
  idempotencyKey?: string;
  extensions?: Record<string, unknown>;
  proof?: Record<string, unknown>;
  payload: TPayload;
}

export class GhostBridgeProtocolError extends Error {
  protocolVersion: string;
  errorCode: string;
  safeMessage: string;
  retryable: boolean;
  retryAfterMs?: number;
  requestId?: string;
  traceId?: string;
  details?: Record<string, unknown>;
  toJSON(): ProtocolErrorMessage;
}

export interface DiscoveryDocument {
  protocol: 'ghostbridge';
  supportedVersions: string[];
  preferredVersion: string;
  status: 'experimental' | 'stable' | 'deprecated';
  features: Record<string, boolean>;
  transports: string[];
  maximumMessageBytes: number;
  endpoints: Record<string, string>;
  extensionNamespaces: string[];
  profiles?: ProfileDeclarations;
}

export interface AgentPassport {
  protocolVersion: string;
  passportId: string;
  passportVersion: string;
  agentId: string;
  displayName: string;
  safeDescription: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  status: 'draft' | 'active' | 'suspended' | 'expired' | 'revoked' | 'retired';
  capabilities: string[];
  supportedProtocolVersions: string[];
  supportedTransports: string[];
  profiles?: ProfileDeclarations;
  dataDeclarations: unknown[];
  delegationDeclarations: unknown[];
  approvalDeclarations: unknown[];
  receiptSupport: boolean;
  revocationReference: string;
  publicVerificationReference?: string;
  documentationReferences?: string[];
  extensionDeclarations?: string[];
  proof?: unknown;
}

export interface CapabilityContract {
  capabilityKey: string;
  capabilityVersion: string;
  displayName: string;
  safeDescription: string;
  inputContractReference: string;
  outputContractReference: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  acceptedDataClasses: string[];
  producedDataClasses: string[];
  prohibitedDataClasses: string[];
  riskCategory: 'low' | 'moderate' | 'high' | 'critical' | 'unknown';
  sideEffectCategory:
    | 'none'
    | 'read'
    | 'reversible_write'
    | 'irreversible_write'
    | 'external_action'
    | 'unknown';
  idempotencySupport: string;
  asynchronousSupport: boolean;
  cancellationSupport: boolean;
  requiredPermissions: string[];
  approvalRequirement: string;
  delegationPolicy: Record<string, unknown>;
  timeoutBounds: { minimumMs: number; maximumMs: number };
  receiptRequirement: string;
  status: string;
  extensions?: Record<string, unknown>;
}

export interface InstallGrantResolution {
  protocolVersion: string;
  grantReference: string;
  passport: AgentPassport;
  capabilities: CapabilityContract[];
  connectionOffer: ConnectionOffer;
  issuerVerification: Record<string, unknown>;
  requestedScope: { organizationScope: string; workspaceScope?: string };
  restrictions: string[];
  expiresAt: string;
  redemptionState: 'available' | 'redeemed' | 'expired' | 'revoked';
}

export interface ConnectionOffer {
  connectionOfferId: string;
  agentId: string;
  passportReference: string;
  protocolVersion: string;
  transportCategory: string;
  runtimeReference: string;
  authenticationMode: AuthenticationMode;
  authenticationModes?: AuthenticationMode[];
  authenticationSetupReference: string;
  expiresAt: string;
  acceptedOrganizationScope: string;
  acceptedWorkspaceScope?: string;
  restrictions: string[];
  revocationReference: string;
  proof?: Record<string, unknown>;
}

export interface InvocationEnvelope {
  protocolVersion: string;
  invocationId: string;
  messageId: string;
  organizationScope: string;
  workspaceScope?: string;
  initiatingSubject: string;
  targetAgentId: string;
  targetPassportVersion: string;
  capabilityKey: string;
  capabilityVersion: string;
  delegationReference?: string;
  inputContractReference: string;
  approvalReference?: string;
  policyDecisionReference?: string;
  idempotencyKey?: string;
  deadline: string;
  traceContext?: Record<string, string>;
  parentInvocationId?: string;
  payload: Record<string, unknown>;
  payloadClassification: string[];
  requestedReceiptProfile: string;
  extensions?: Record<string, unknown>;
}

export interface ExecutionTask {
  taskId: string;
  connectionId?: string;
  invocationId: string;
  organizationScope?: string;
  workspaceScope?: string;
  agentId?: string;
  passportVersion?: string;
  capabilityKey?: string;
  capabilityVersion?: string;
  approvalReference?: string;
  state: string;
  safeProgressCategory: string;
  createdAt: string;
  startedAt?: string;
  updatedAt: string;
  completedAt?: string;
  deadline: string;
  cancellationSupported: boolean;
  retryCategory: string;
  safeFailureCode?: string;
  receiptReference?: string;
  publicCheckpointReference?: string;
  nextActionCategory: string;
}

export interface DelegationGrant {
  delegationId: string;
  delegatorAgentId: string;
  delegateAgentId: string;
  parentInvocationId: string;
  organizationScope: string;
  workspaceScope?: string;
  allowedCapabilityKeys: string[];
  allowedInputContractReferences: string[];
  allowedDataClasses: string[];
  prohibitedDataClasses: string[];
  maximumInvocations: number;
  remainingInvocations?: number;
  furtherDelegationAllowed: boolean;
  startsAt: string;
  expiresAt: string;
  revocationReference: string;
  proof?: Record<string, unknown>;
}

export interface DataContract {
  contractKey: string;
  contractVersion: string;
  direction: 'input' | 'output' | 'bidirectional';
  allowedFields: string[];
  requiredFields: string[];
  prohibitedFields: string[];
  acceptedDataClasses: string[];
  prohibitedDataClasses: string[];
  maximumPayloadBytes: number;
  maximumStringLength: number;
  maximumArrayLength: number;
  maximumObjectDepth: number;
  retentionDeclaration: string;
  redactionRequirements: string[];
  transformationProfileReferences: string[];
  status: 'draft' | 'active' | 'deprecated' | 'revoked';
}

export interface ApprovalChallenge {
  challengeId: string;
  invocationId: string;
  organizationScope: string;
  workspaceScope?: string;
  actionKey: string;
  approvalActionDigest: string;
  safeSummary: string;
  requiredRoleCategories: string[];
  approvalLimits: Record<string, unknown>;
  expiresAt: string;
  requestedBy: string;
  policyDecisionReference: string;
  status: string;
}

export interface ApprovalDecision {
  challengeId: string;
  decisionId: string;
  decision: 'approved' | 'rejected' | 'more_information_required' | 'expired' | 'cancelled';
  approvalActionDigest: string;
  approvedLimits: Record<string, unknown>;
  decidedBy: string;
  decidedAt: string;
  safeReasonCode: string;
  proof?: Record<string, unknown>;
}

export interface ExecutionReceipt {
  receiptId: string;
  invocationId: string;
  taskId: string;
  agentId: string;
  passportVersion: string;
  capabilityKey: string;
  capabilityVersion: string;
  organizationScope: string;
  workspaceScope?: string;
  outcome:
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'timed_out'
    | 'rejected'
    | 'revoked'
    | 'partially_completed'
    | 'compensated';
  outputContractReference: string;
  startedAt: string;
  completedAt: string;
  attemptCount: number;
  approvalReference?: string;
  delegationReference?: string;
  policyDecisionReference?: string;
  requestFingerprint?: string;
  safeFailureCode?: string;
  outputDigest: string;
  evidenceDigest: string;
  billableStatusCategory?: string;
  nonBillableReason?: string;
  revocationStateAtExecution: 'active' | 'revoked' | 'unknown';
  proof?: Record<string, unknown>;
}

export interface RevocationStatus {
  revocationId: string;
  subjectType:
    | 'passport'
    | 'install_grant'
    | 'connection'
    | 'capability'
    | 'delegation'
    | 'issuer_key';
  subjectReference: string;
  status: 'active' | 'suspended' | 'revoked';
  reasonCode: string;
  effectiveAt: string;
  expiresAt?: string;
  replacementReference?: string;
  issuedBy: string;
  proof?: Record<string, unknown>;
}

export interface ProtocolSigner {
  algorithm: string;
  sign(value: unknown): string | Promise<string>;
}

export interface ProtocolVerifier {
  verify(value: unknown, signature: string): boolean | Promise<boolean>;
}

export interface IssuerKeyResolver {
  resolveIssuerKey(issuer: string, keyReference: string): Promise<unknown>;
}

export type ExtensionState =
  | 'experimental'
  | 'candidate'
  | 'official'
  | 'deprecated'
  | 'removed';

export interface ExtensionDeclaration {
  identifier: string;
  version: string;
  status: ExtensionState;
  required: boolean;
  profiles?: Array<
    | 'ghostbridge.core'
    | 'ghostbridge.governed-execution'
    | 'ghostbridge.agent-coordination.experimental'
  >;
  documentationReference?: string;
  schemaReference?: string;
  securityConsiderations?: string;
}

export function parseProtocolVersion(value: string): {
  raw: string;
  major: number;
  minor: number;
  channel: string;
  draft: boolean;
};
export function validateProtocolVersion(value: string, supportedVersions?: string[]): string;
export function negotiateVersion(options: Record<string, unknown>): {
  selectedVersion: string;
  stability: string;
  warnings: string[];
};
export function validateProfileDeclarations(value?: ProfileDeclarations): Readonly<ProfileDeclarations>;
export function negotiateAuthenticationMode(options?: {
  hostSupported?: AuthenticationMode[];
  agentSupported?: AuthenticationMode[];
  preferred?: AuthenticationMode;
}): {
  selectedMode: AuthenticationMode;
  compatibleModes: readonly AuthenticationMode[];
  explanation: string;
};
export interface CompatibilityReason {
  code: string;
}
export interface CompatibilityResult {
  status: 'compatible' | 'compatible_with_limitations' | 'incompatible';
  compatible: boolean;
  protocolVersion?: string;
  profiles: ProfileDeclarations;
  authentication?: {
    selectedMode: AuthenticationMode;
    compatibleModes: readonly AuthenticationMode[];
    explanation: string;
  };
  extensions: {
    negotiated: Array<Pick<ExtensionDeclaration, 'identifier' | 'version' | 'status'>>;
    unavailableOptional: string[];
    gracefulDegradation: boolean;
  };
  reasons: readonly CompatibilityReason[];
  limitations: readonly CompatibilityReason[];
}
export function checkCompatibility(input: Record<string, unknown>): CompatibilityResult;
export function assertCompatibility(input: Record<string, unknown>): CompatibilityResult;
export function createInstallationPreview(input: Record<string, unknown>): Record<string, unknown>;
export function assertPlainData<T>(value: T, limits?: Partial<WireLimits>): T;
export function boundedSerialize(value: unknown, limits?: Partial<WireLimits>): string;
export interface ApprovalAction {
  invocationId: string;
  connectionId: string;
  capabilityKey: string;
  capabilityVersion: string;
  organizationScope: string;
  workspaceScope?: string;
  inputContractReference: string;
  payloadDigest: string;
  sideEffectCategory?: string;
  approvalLimits: Record<string, unknown>;
  policyDecisionReference: string;
  validityBoundary: string;
}
export function createApprovalAction(input: {
  invocationId: string;
  connectionId: string;
  capabilityKey: string;
  capabilityVersion: string;
  organizationScope: string;
  workspaceScope?: string;
  inputContractReference: string;
  payload?: unknown;
  payloadDigest?: string;
  sideEffectCategory?: string;
  approvalLimits: Record<string, unknown>;
  policyDecisionReference: string;
  validityBoundary: string;
}): Readonly<ApprovalAction>;
export function approvalActionDigest(input: Parameters<typeof createApprovalAction>[0]): string;
export function safeParse<T = unknown>(value: string, limits?: Partial<WireLimits>): T;
export function protocolError(
  code: string,
  message: string,
  options?: Record<string, unknown>,
): GhostBridgeProtocolError;
export function validateDiscovery<T extends DiscoveryDocument>(value: T): T;
export function validatePassport<T extends AgentPassport>(
  value: T,
  options?: Record<string, unknown>,
): T;
export function validateCapabilityContract<T extends CapabilityContract>(value: T): T;
export function validateContractValue<T>(
  value: T,
  schema: Record<string, unknown>,
  direction?: 'input' | 'output',
): T;
export function validateInstallGrant<T extends Record<string, unknown>>(
  value: T,
  options?: Record<string, unknown>,
): T;
export function validateConnectionOffer<T extends ConnectionOffer>(value: T): T;
export function validateInvocation<T extends InvocationEnvelope>(
  value: T,
  options?: Record<string, unknown>,
): T;
export function validateDelegation<T extends DelegationGrant>(
  value: T,
  options?: Record<string, unknown>,
): T;
export function validateApprovalChallenge<T extends ApprovalChallenge>(value: T): T;
export function validateApprovalDecision<T extends ApprovalDecision>(
  value: T,
  challenge?: ApprovalChallenge,
  options?: Record<string, unknown>,
): T;
export function validateTask<T extends ExecutionTask>(value: T): T;
export function transitionTask<T extends ExecutionTask>(task: T, state: string, at?: string): T;
export function projectDataContract(
  input: Record<string, unknown>,
  contract: DataContract,
  options?: Record<string, unknown>,
): Record<string, unknown>;
export function validateReceipt<T extends ExecutionReceipt>(value: T): T;
export function validateRevocation<T extends RevocationStatus>(value: T): T;
export function validateExtensions<T extends Record<string, unknown>>(value: T): T;
export function validateExtensions<T extends ExtensionDeclaration[]>(value: T): T;
export function validateExtensionIdentifier(value: string): string;
export function validateExtensionDeclaration<T extends ExtensionDeclaration>(value: T): T;
export function negotiateExtensions(options: {
  client?: ExtensionDeclaration[];
  agent?: ExtensionDeclaration[];
}): {
  negotiated: Array<Pick<ExtensionDeclaration, 'identifier' | 'version' | 'status'>>;
  unavailableOptional: string[];
  gracefulDegradation: boolean;
};
export function redactPublicData<T>(value: T): T;
export function digest(value: unknown): string;
export function loadSchemas(): Record<string, Record<string, unknown>>;
export function createSchemaValidators(): {
  schemas: Record<string, Record<string, unknown>>;
  validate(name: string, document: unknown): unknown;
};
