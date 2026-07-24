export const COMMANDS: readonly string[];
export const CONFORMANCE_PROFILES: Readonly<Record<string, unknown>>;
export const DEPRECATED_LEVEL_ALIASES: Readonly<Record<string, string>>;
export function assertLocalFixture(baseUrl: string): void;
export function runConformance(options: {
  command?: string;
  baseUrl: string;
  timeoutMs?: number;
  client?: unknown;
  onResult?: (result: Record<string, unknown>) => void;
  [fixture: string]: unknown;
}): Promise<{
  protocolVersion: string;
  command: string;
  passed: boolean;
  results: Array<Record<string, unknown>>;
}>;
export function runTrustConformance(options: Record<string, unknown>): Readonly<Record<string, unknown>>;
