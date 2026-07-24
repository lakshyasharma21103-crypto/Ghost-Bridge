export type TrustResultCategory =
  | 'verified_and_trusted'
  | 'cryptographically_valid_review_required'
  | 'cryptographically_valid_untrusted_issuer'
  | 'verified_with_warning'
  | 'indeterminate'
  | 'suspended'
  | 'revoked'
  | 'blocked'
  | 'invalid';

export interface TrustProof {
  format: 'JWS';
  profile: 'ghostbridge-proof/0.1-draft';
  protectedJws: string;
  kid: string;
  algorithm: 'EdDSA';
  createdAt: string;
}

export interface TrustSigner {
  kid: string;
  algorithm: 'EdDSA';
  sign(data: Uint8Array, context?: Record<string, unknown>): Promise<Uint8Array> | Uint8Array;
}

export class GhostBridgeTrustError extends Error {
  code: string;
  safeMessage: string;
  retryable: boolean;
  details?: Record<string, unknown>;
  toJSON(): Record<string, unknown>;
}

export class ReplayCache {
  constructor(options?: { maximumEntries?: number; clock?: () => number });
  consume(input: Record<string, unknown>): boolean;
  prune(now?: number): void;
}

export class RevocationCache {
  constructor(options?: { maximumEntries?: number });
  put(issuer: string, document: Record<string, unknown>, verification: Record<string, unknown>): unknown;
  get(issuer: string): unknown;
  lookup(issuer: string, subjectType: string, subjectReference: string, options?: Record<string, unknown>): unknown;
  invalidate(issuer: string): boolean;
}

export class AntiRollbackStore {
  observe(namespace: string, issuer: string, sequence: number): number;
}

export class IssuerReviewWorkflow {
  constructor(options?: {
    clock?: () => number;
    audit?: (event: string, fields: Record<string, unknown>) => void;
    localTestMode?: boolean;
    allowedLocalIssuers?: string[];
  });
  discover(input: Record<string, unknown>): Readonly<Record<string, unknown>>;
  requestReview(issuerId: string, context?: Record<string, unknown>): Readonly<Record<string, unknown>>;
  decide(issuerId: string, decision: string, context?: Record<string, unknown>): Readonly<Record<string, unknown>>;
  expire(issuerId: string, context?: Record<string, unknown>): Readonly<Record<string, unknown>>;
  get(issuerId: string): Readonly<Record<string, unknown>> | undefined;
  list(): Readonly<Record<string, unknown>>[];
}

export const TRUST_PROFILE_VERSION: 'ghostbridge-trust/0.1-draft';
export const CANONICALIZATION_PROFILE: 'ghostbridge-jcs/0.1-draft';
export const PROOF_PROFILE: 'ghostbridge-proof/0.1-draft';
export const REQUEST_INTEGRITY_PROFILE: 'ghostbridge-http-signature/0.1-draft';
export const MANDATORY_ALGORITHM: 'EdDSA';
export const ALLOWED_ALGORITHMS: readonly ['EdDSA'];
export const KEY_STATES: readonly string[];
export const KEY_PURPOSES: readonly string[];
export const ISSUER_REVIEW_STATES: readonly string[];
export const TRUST_ERROR_CODES: readonly string[];
export const DEFAULT_TRUST_LIMITS: Readonly<Record<string, number>>;

export function normalizeIssuerId(value: string, options?: Record<string, unknown>): string;
export function issuerDiscoveryUrl(value: string, options?: Record<string, unknown>): string;
export function discoverIssuer(value: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
export function loadIssuerJwks(metadata: Record<string, unknown>, options?: Record<string, unknown>): Promise<Readonly<Record<string, unknown>>>;
export function validateIssuerMetadata(value: unknown, options?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function validateJwks(value: unknown, options?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function validatePublicJwk(value: unknown, options?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function calculateJwkThumbprint(jwk: JsonWebKey): string;
export function canonicalize(value: unknown, options?: Record<string, unknown>): string;
export function parseJsonStrict(value: string | Uint8Array, options?: Record<string, unknown>): unknown;
export function digest(value: unknown): string;
export function createProof(payload: unknown, signer: TrustSigner, options?: Record<string, unknown>): Promise<TrustProof>;
export function signDocument<T extends object>(document: T, signer: TrustSigner, options?: Record<string, unknown>): Promise<T & { proof: TrustProof }>;
export function verifyProof(payload: unknown, proof: TrustProof, jwks: unknown, options?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function verifyDocument(document: unknown, jwks: unknown, options?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function validateCapabilityManifest(manifest: unknown, contracts: unknown[], passport: unknown, options?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function validateAgentExecutionKey(passport: unknown, key: unknown, options?: Record<string, unknown>): unknown;
export function evaluateTrustPolicy(input?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function validateRevocationSet(document: unknown, jwks: unknown, options?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function revocationFreshness(document: unknown, options?: Record<string, unknown>): string;
export function signRequest(request: unknown, signer: TrustSigner, options?: Record<string, unknown>): Promise<Readonly<Record<string, unknown>>>;
export function verifyRequest(request: unknown, signedRequest: unknown, jwks: unknown, options?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function verifyReceipt(receipt: unknown, passport: unknown, jwks: unknown, options?: Record<string, unknown>): Readonly<Record<string, unknown>>;
export function historicalReceiptStatus(receipt: unknown, key: unknown, revocationEntry?: unknown): string;
export function assertKeyTransition(from: string, to: string): true;
