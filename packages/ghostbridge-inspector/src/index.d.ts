export interface InspectorOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  allowUnsafeRemote?: boolean;
  unsafeAcknowledged?: boolean;
}

export class InspectorSecurityError extends Error {
  readonly code: 'INSPECTOR_TARGET_REJECTED';
}

export class GhostBridgeInspector {
  constructor(options: InspectorOptions);
  connect(): Promise<Record<string, unknown>>;
  inspectPassport(): Promise<Record<string, unknown>>;
  inspectIssuer(issuerId: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  inspectPassportTrust(options?: Record<string, unknown>): Promise<Record<string, unknown>>;
  inspectCapabilityIntegrity(
    manifest: Record<string, unknown>,
    contracts: Record<string, unknown>[],
    passport: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  inspectConnectionTrust(connectionId: string): Record<string, unknown>;
  inspectProfiles(): Promise<Record<string, unknown>>;
  listCapabilities(): Promise<Record<string, unknown>[]>;
  searchCapabilities(options: Record<string, unknown>): Promise<Record<string, unknown>>;
  inspectCapability(options: Record<string, unknown>): Promise<Record<string, unknown>>;
  resolveInstallGrant(grant: string, scope: Record<string, string>): Promise<Record<string, unknown>>;
  previewInstall(options: Record<string, unknown>): Promise<Record<string, unknown>>;
  install(grant: string, scope: Record<string, string>): Promise<Record<string, unknown>>;
  invoke(options: unknown, envelope?: unknown): Promise<Record<string, unknown>>;
  inspectTask(taskId: string): Promise<Record<string, unknown>>;
  cancelTask(taskId: string): Promise<Record<string, unknown>>;
  submitApprovalDecision(challengeId: string, decision: Record<string, unknown>): Promise<Record<string, unknown>>;
  inspectReceipt(receiptId: string): Promise<Record<string, unknown>>;
  inspectRevocation(subjectType: string, subjectReference: string): Promise<Record<string, unknown>>;
  previewDataContract(input: unknown, contract: unknown, options?: Record<string, unknown>): Record<string, unknown>;
  messages(): Record<string, unknown>[];
  close(): void;
}

export function assertInspectorTarget(
  value: string,
  options?: Pick<InspectorOptions, 'allowUnsafeRemote' | 'unsafeAcknowledged'>,
): { baseUrl: string; loopback: boolean; warning?: string };
export function sanitizeInspectorValue<T>(value: T): T;
export function startInspectorUi(options: InspectorOptions & {
  host?: string;
  port?: number;
}): Promise<{
  inspector: GhostBridgeInspector;
  address: unknown;
  close(): Promise<void>;
}>;
