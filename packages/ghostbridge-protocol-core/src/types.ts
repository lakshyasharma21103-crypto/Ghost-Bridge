/** Portable Ghost Bridge Native 0.1-draft DTO source. Runtime exports live in index.js. */
export type ProtocolVersion = 'ghostbridge/0.1-draft';
export type ProfileId =
  | 'ghostbridge.core'
  | 'ghostbridge.governed-execution'
  | 'ghostbridge.agent-coordination.experimental';
export type AuthenticationMode =
  | 'none'
  | 'oauth'
  | 'mutual_tls'
  | 'signed_request'
  | 'managed_credential'
  | 'delegated_credential'
  | 'platform_brokered';
export type PassportStatus = 'draft' | 'active' | 'suspended' | 'expired' | 'revoked' | 'retired';
export type RiskCategory = 'low' | 'moderate' | 'high' | 'critical' | 'unknown';
export type TaskState =
  | 'accepted'
  | 'queued'
  | 'running'
  | 'waiting_for_approval'
  | 'waiting_for_dependency'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out'
  | 'recovery_required'
  | 'compensation_required'
  | 'revoked';

export interface CommonEnvelope<TPayload extends Record<string, unknown>> {
  protocolVersion: ProtocolVersion;
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

export interface RevocationStatus {
  revocationId: string;
  subjectType: 'passport' | 'install_grant' | 'connection' | 'capability' | 'delegation' | 'issuer_key';
  subjectReference: string;
  status: 'active' | 'revoked' | 'suspended';
  reasonCode: string;
  effectiveAt: string;
  expiresAt?: string;
  replacementReference?: string;
  issuedBy: string;
  proof?: Record<string, unknown>;
}
