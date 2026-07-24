import type { TrustSigner } from '@ghostbridge/trust';

export interface KeyProvider {
  createKey(options: Record<string, unknown>): Readonly<JsonWebKey & Record<string, unknown>>;
  getPublicKey(kid: string): Readonly<JsonWebKey & Record<string, unknown>>;
  listPublicKeys(options?: Record<string, unknown>): readonly Readonly<JsonWebKey & Record<string, unknown>>[];
  sign(kid: string, data: Uint8Array, context?: Record<string, unknown>): Uint8Array;
  signer(kid: string): TrustSigner;
  getKeyState(kid: string): string;
  transitionKeyState(kid: string, nextState: string, options?: Record<string, unknown>): Readonly<JsonWebKey & Record<string, unknown>>;
  destroyTestKey(kid: string): boolean;
}

export class LocalTestKeyProvider implements KeyProvider {
  constructor(options?: Record<string, unknown>);
  createKey(options: Record<string, unknown>): Readonly<JsonWebKey & Record<string, unknown>>;
  getPublicKey(kid: string): Readonly<JsonWebKey & Record<string, unknown>>;
  listPublicKeys(options?: Record<string, unknown>): readonly Readonly<JsonWebKey & Record<string, unknown>>[];
  sign(kid: string, data: Uint8Array, context?: Record<string, unknown>): Uint8Array;
  signer(kid: string): TrustSigner;
  getKeyState(kid: string): string;
  transitionKeyState(kid: string, nextState: string, options?: Record<string, unknown>): Readonly<JsonWebKey & Record<string, unknown>>;
  destroyTestKey(kid: string): boolean;
  assertMaterialUnchanged(kid: string, publicJwk: JsonWebKey): true;
}

export class IssuerToolkit {
  constructor(options: Record<string, unknown>);
  readonly issuerId: string;
  readonly keyProvider: KeyProvider;
  metadataSequence: number;
  createIssuerMetadata(options: Record<string, unknown>): Promise<Readonly<Record<string, unknown>>>;
  publishJwks(options?: Record<string, unknown>): Readonly<Record<string, unknown>>;
  signPassport(passport: Record<string, unknown>, keyId: string): Promise<Readonly<Record<string, unknown>>>;
  createCapabilityManifest(input: Record<string, unknown>, contracts: Record<string, unknown>[], keyId: string): Promise<Readonly<Record<string, unknown>>>;
  signInstallResolution(input: Record<string, unknown>, keyId: string): Promise<Readonly<Record<string, unknown>>>;
  signConnectionOffer(input: Record<string, unknown>, keyId: string): Promise<Readonly<Record<string, unknown>>>;
  signRevocationSet(input: Record<string, unknown>, keyId: string): Promise<Readonly<Record<string, unknown>>>;
  signReceipt(input: Record<string, unknown>, keyId: string): Promise<Readonly<Record<string, unknown>>>;
  authorizeAgentExecutionKey(keyId: string, options?: Record<string, unknown>): Readonly<Record<string, unknown>>;
  prepublishKey(kid: string, sequence: number): Readonly<Record<string, unknown>>;
  activateKey(kid: string, sequence: number): Readonly<Record<string, unknown>>;
  beginRotation(oldKeyId: string, newKeyId: string, sequence: number): Readonly<Record<string, unknown>>;
  retireKey(kid: string, sequence: number): Readonly<Record<string, unknown>>;
  compromiseKey(kid: string, options?: Record<string, unknown>): Readonly<Record<string, unknown>>;
  revokeKey(kid: string, options?: Record<string, unknown>): Readonly<Record<string, unknown>>;
  auditEvents(): Record<string, unknown>[];
}

export function createLocalTestKeyProvider(options?: Record<string, unknown>): LocalTestKeyProvider;
export function createIssuerToolkit(options: Record<string, unknown>): IssuerToolkit;
export function createSyntheticIssuer(options?: Record<string, unknown>): Promise<Readonly<{
  toolkit: IssuerToolkit;
  keyProvider: LocalTestKeyProvider;
  keyIds: Readonly<Record<string, string>>;
  events: unknown[];
}>>;
