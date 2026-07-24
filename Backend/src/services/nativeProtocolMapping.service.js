'use strict';

const {
  PROTOCOL_VERSION,
  DEFAULT_PROFILE_DECLARATIONS,
  digest,
  redactPublicData,
} = require('@ghostbridge/protocol-core');

const STATUS = Object.freeze({
  valid: 'active',
  connected: 'active',
  pending_auth: 'pending',
  disconnected: 'inactive',
  error: 'suspended',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

function mapInternalPassport(internal, capabilities = [], options = {}) {
  const agent = internal?.agent || {};
  const issuedAt = iso(internal?.createdAt || options.issuedAt || Date.now());
  const expiresAt = iso(options.expiresAt || new Date(Date.parse(issuedAt) + 86_400_000 * 365));
  return redactPublicData({
    protocolVersion: PROTOCOL_VERSION,
    passportId:
      options.passportId ||
      publicReference('passport', [agent.id, agent.version, internal?.partnerAgentId]),
    passportVersion: String(agent.version || options.passportVersion || '1'),
    agentId: String(agent.id || options.agentId || 'unknown-agent'),
    displayName: String(agent.name || options.displayName || 'Unnamed agent'),
    safeDescription: String(agent.description || options.safeDescription || 'No description supplied.'),
    issuer: String(
      options.issuer ||
        publicReference('issuer', [internal?.partnerId, agent.provider || 'unknown-issuer']),
    ),
    issuedAt,
    expiresAt,
    status: STATUS[internal?.status] || internal?.status || 'draft',
    capabilities: capabilities.map((item) => String(item.name || item.capabilityKey)).filter(Boolean),
    supportedProtocolVersions: [PROTOCOL_VERSION],
    profiles: DEFAULT_PROFILE_DECLARATIONS,
    supportedTransports: ['https-json'],
    dataDeclarations: options.dataDeclarations || [],
    delegationDeclarations: options.delegationDeclarations || [],
    approvalDeclarations: options.approvalDeclarations || [],
    receiptSupport: options.receiptSupport !== false,
    revocationReference: `revocations/passport/${publicReference('passport', [agent.id, agent.version])}`,
    publicVerificationReference: options.publicVerificationReference,
    documentationReferences: options.documentationReferences || [],
    extensionDeclarations: options.extensionDeclarations || [],
  });
}

function mapInternalCapability(internal, options = {}) {
  const sideEffect = {
    READ_ONLY: 'read',
    LOCAL_CHANGE: 'reversible_write',
    REMOTE_WRITE: 'external_action',
    IRREVERSIBLE: 'irreversible_write',
    UNKNOWN: 'unknown',
  }[internal?.sideEffect] || 'unknown';
  const riskCategory =
    { medium: 'moderate', LOW: 'low', MEDIUM: 'moderate', HIGH: 'high', CRITICAL: 'critical' }[
      internal?.riskLevel || internal?.classification
    ] || 'unknown';
  return {
    capabilityKey: String(internal?.name || options.capabilityKey || 'unknown.capability'),
    capabilityVersion: String(options.capabilityVersion || '1'),
    displayName: String(options.displayName || internal?.name || 'Unnamed capability'),
    safeDescription: String(internal?.description || options.safeDescription || ''),
    inputContractReference:
      options.inputContractReference ||
      publicReference('data-contract-input', [internal?.name, digest(internal?.inputSchema || {})]),
    outputContractReference:
      options.outputContractReference ||
      publicReference('data-contract-output', [internal?.name, digest(internal?.outputSchema || {})]),
    acceptedDataClasses: options.acceptedDataClasses || [],
    producedDataClasses: options.producedDataClasses || [],
    prohibitedDataClasses: options.prohibitedDataClasses || ['credential', 'secret'],
    riskCategory,
    sideEffectCategory: sideEffect,
    idempotencySupport:
      internal?.idempotencySupport === 'SUPPORTED'
        ? sideEffect === 'read'
          ? 'optional'
          : 'required'
        : 'none',
    asynchronousSupport: Boolean(options.asynchronousSupport),
    cancellationSupport: internal?.cancellationSupport === 'SUPPORTED',
    requiredPermissions: [internal?.requiredPermission].filter(Boolean),
    approvalRequirement: options.approvalRequirement || (riskCategory === 'high' ? 'conditional' : 'none'),
    delegationPolicy: {
      allowed: options.delegationAllowed === true,
      furtherDelegationAllowed: false,
    },
    timeoutBounds: options.timeoutBounds || { minimumMs: 100, maximumMs: 60_000 },
    receiptRequirement: 'required',
    status: internal?.enabled === false ? 'suspended' : 'active',
    extensions: {},
  };
}

function mapInstallKeyResolution({ installKey, passport, capabilities, identity }, options = {}) {
  return {
    protocolVersion: PROTOCOL_VERSION,
    grantReference: publicReference('install-grant', [installKey?.keyPrefix, installKey?.createdAt]),
    passport: mapInternalPassport(passport, capabilities, options.passport),
    capabilities: capabilities.map((item) => mapInternalCapability(item)),
    connectionOffer: {
      connectionOfferId: publicReference('connection-offer', [
        installKey?.keyPrefix,
        identity?.receivingWorkspaceId,
      ]),
      agentId: String(passport?.agent?.id || 'unknown-agent'),
      passportReference: publicReference('passport', [
        passport?.agent?.id,
        passport?.agent?.version,
      ]),
      protocolVersion: PROTOCOL_VERSION,
      transportCategory: 'platform-gateway',
      runtimeReference: 'platform:runtime-gateway',
      authenticationMode: 'platform_brokered',
      authenticationModes: ['platform_brokered'],
      authenticationSetupReference: 'platform:managed-credential-setup',
      expiresAt: iso(installKey?.expiresAt),
      acceptedOrganizationScope: publicScope(
        'organization',
        options.organizationScope || installKey?.partnerId,
      ),
      acceptedWorkspaceScope: String(
        identity?.receivingWorkspaceId || installKey?.usedByWorkspaceId || '',
      ),
      restrictions: options.restrictions || [],
      revocationReference: publicReference('revocation', [
        'install-grant',
        installKey?.keyPrefix,
      ]),
    },
    issuerVerification: {
      status: passport?.status === 'valid' ? 'verified' : 'unverified',
      productionTrustProfile: 'draft',
    },
    requestedScope: {
      organizationScope: publicScope(
        'organization',
        options.organizationScope || installKey?.partnerId,
      ),
      workspaceScope: String(identity?.receivingWorkspaceId || ''),
    },
    restrictions: options.restrictions || [],
    expiresAt: iso(installKey?.expiresAt),
    redemptionState:
      { active: 'available', used: 'redeemed' }[installKey?.status] || installKey?.status || 'expired',
  };
}

function mapInternalConnection(internal) {
  const snapshot = internal?.resolvedPassportSnapshot || {};
  return {
    protocolVersion: PROTOCOL_VERSION,
    connectionId: publicReference('connection', [
      snapshot?.agent?.id,
      internal?.organizationId || internal?.partnerId,
      internal?.receivingWorkspaceId,
      internal?.createdAt,
    ]),
    agentId: String(snapshot?.agent?.id || 'unknown-agent'),
    passportVersion: String(snapshot?.agent?.version || '1'),
    organizationScope: publicScope(
      'organization',
      internal?.organizationId || internal?.partnerId,
    ),
    workspaceScope: String(internal?.receivingWorkspaceId || ''),
    status: STATUS[internal?.status] || internal?.status || 'inactive',
    createdAt: iso(internal?.createdAt),
    updatedAt: iso(internal?.updatedAt || internal?.createdAt),
    revocationReference: publicReference('revocation', [
      'connection',
      snapshot?.agent?.id,
      internal?.receivingWorkspaceId,
    ]),
  };
}

function mapRuntimeRequestToInvocation(internal, options = {}) {
  return {
    protocolVersion: PROTOCOL_VERSION,
    invocationId: String(options.invocationId || internal?.invocationId || publicReference('invocation', [internal?.requestId, internal?.idempotencyKey])),
    messageId: String(options.messageId || publicReference('message', [internal?.requestId, Date.now()])),
    organizationScope: publicScope(
      'organization',
      internal?.organizationId || options.organizationScope,
    ),
    workspaceScope: String(internal?.receivingWorkspaceId || internal?.workspaceId || ''),
    initiatingSubject: String(internal?.actor?.id || internal?.receivingUserId || 'unknown-subject'),
    targetAgentId: String(options.targetAgentId || internal?.agentId || ''),
    targetPassportVersion: String(options.targetPassportVersion || internal?.passportVersion || '1'),
    capabilityKey: String(internal?.capability || internal?.capabilityKey || ''),
    capabilityVersion: String(options.capabilityVersion || '1'),
    delegationReference: options.delegationReference,
    inputContractReference: String(options.inputContractReference || 'platform:data-contract'),
    approvalReference: options.approvalReference,
    idempotencyKey: internal?.idempotencyKey,
    deadline: iso(internal?.deadline || options.deadline),
    traceContext: { traceId: String(internal?.traceId || '') },
    parentInvocationId: options.parentInvocationId,
    payload: redactPublicData(internal?.input || internal?.payload || {}),
    payloadClassification: options.payloadClassification || [],
    requestedReceiptProfile: options.requestedReceiptProfile || 'standard',
    extensions: {},
  };
}

function mapInternalDelegation(internal) {
  return {
    delegationId: publicReference('delegation', [
      internal?.sourcePassportId,
      internal?.targetPassportId,
      internal?.createdAt,
    ]),
    delegatorAgentId: String(internal?.sourcePassportVersion || 'source-agent'),
    delegateAgentId: String(internal?.targetPassportVersion || 'target-agent'),
    parentInvocationId: String(internal?.orchestrationRunId || internal?.sourceNodeRunId || ''),
    organizationScope: String(internal?.organizationId || ''),
    workspaceScope: String(internal?.workspaceId || ''),
    allowedCapabilityKeys: [internal?.targetCapability].filter(Boolean),
    allowedInputContractReferences: [
      publicReference('data-contract', [internal?.contractId, internal?.contractVersion]),
    ],
    allowedDataClasses: internal?.allowedDataClassifications || [],
    prohibitedDataClasses: ['credential', 'secret'],
    maximumInvocations: Number(internal?.invocationLimit || 1),
    remainingInvocations: Math.max(
      0,
      Number(internal?.invocationLimit || 1) - Number(internal?.invocationCount || 0),
    ),
    furtherDelegationAllowed: internal?.allowFurtherDelegation === true,
    startsAt: iso(internal?.validFrom),
    expiresAt: iso(internal?.expiresAt),
    revocationReference: publicReference('revocation', [
      'delegation',
      internal?.createdAt,
      internal?.targetCapability,
    ]),
  };
}

function mapInternalDataContract(internal, direction = 'input') {
  const allowed =
    direction === 'output' ? internal?.allowedOutputFields : internal?.allowedInputFields;
  const prohibited =
    direction === 'output' ? internal?.deniedOutputFields : internal?.deniedInputFields;
  return {
    contractKey: publicReference('data-contract', [internal?.name, internal?.version, direction]),
    contractVersion: String(internal?.version || '1'),
    direction,
    allowedFields: allowed || [],
    requiredFields: [],
    prohibitedFields: prohibited || [],
    acceptedDataClasses: internal?.allowedDataClassifications || [],
    prohibitedDataClasses: ['credential', 'secret'],
    maximumPayloadBytes: Number(internal?.maximumPayloadBytes || 256_000),
    maximumStringLength: Number(internal?.maximumStringLength || 10_000),
    maximumArrayLength: Number(internal?.maximumArrayItems || 100),
    maximumObjectDepth: Number(internal?.maximumObjectDepth || 10),
    retentionDeclaration: String(internal?.retentionPolicy?.mode || 'metadata_only'),
    redactionRequirements: (internal?.redactionRules || []).map((_, index) => `rule-${index + 1}`),
    transformationProfileReferences: [],
    status: String(internal?.status || 'draft'),
  };
}

function mapInternalApprovalChallenge(internal) {
  return {
    challengeId: String(internal?.approvalRequestId || ''),
    invocationId: String(internal?.invocationId || internal?.resourceId || ''),
    organizationScope: String(internal?.organizationId || ''),
    workspaceScope: String(internal?.workspaceId || ''),
    actionKey: String(internal?.capabilityId || internal?.operationType || ''),
    safeSummary: String(internal?.reason || 'Approval is required for this action.'),
    requiredRoleCategories: [],
    approvalLimits: {},
    expiresAt: iso(internal?.expiresAt),
    requestedBy: String(internal?.requesterActorId || ''),
    policyDecisionReference: publicReference('policy-decision', [
      internal?.requestFingerprint,
      internal?.requestedAt,
    ]),
    status: String(STATUS[internal?.status] || internal?.status || 'pending').toLowerCase(),
  };
}

function mapInternalApprovalDecision(internal) {
  return {
    challengeId: String(internal?.approvalRequestId || ''),
    decisionId: String(internal?.decisionId || ''),
    decision: String(internal?.decision || '').toLowerCase(),
    approvedLimits: {},
    decidedBy: String(internal?.approverActorId || ''),
    decidedAt: iso(internal?.decidedAt),
    safeReasonCode: internal?.comment ? 'APPROVER_COMMENT_RECORDED' : 'DECISION_RECORDED',
  };
}

function mapInternalExecutionTask(internal) {
  const state = String(
    internal?.lifecycleState || internal?.status || internal?.state || 'accepted',
  ).toLowerCase();
  const publicState =
    {
      pending: 'queued',
      validating: 'running',
      authorized: 'running',
      succeeded: 'completed',
    }[state] || state;
  return {
    taskId: publicReference('task', [
      internal?.invocationId,
      internal?.runId,
      internal?.nodeKey,
    ]),
    invocationId: String(internal?.invocationId || internal?.runId || ''),
    state: publicState,
    safeProgressCategory: publicState,
    createdAt: iso(internal?.createdAt),
    startedAt: internal?.startedAt ? iso(internal.startedAt) : undefined,
    updatedAt: iso(internal?.updatedAt || internal?.createdAt),
    completedAt: internal?.completedAt ? iso(internal.completedAt) : undefined,
    deadline: iso(internal?.deadline || internal?.expiresAt),
    cancellationSupported: Boolean(internal?.cancellationSupported),
    retryCategory: String(internal?.retryCategory || 'platform_managed'),
    safeFailureCode: internal?.safeFailureCode || internal?.failureCode,
    receiptReference: internal?.evidenceDigest
      ? publicReference('receipt', [internal.evidenceDigest])
      : undefined,
    nextActionCategory: ['completed', 'failed', 'cancelled'].includes(publicState)
      ? 'none'
      : 'poll',
  };
}

function mapInternalExecutionReceipt(internal, options = {}) {
  return {
    receiptId: publicReference('receipt', [
      internal?.eventId,
      internal?.invocationId,
      internal?.occurredAt,
    ]),
    invocationId: String(internal?.invocationId || ''),
    taskId: String(options.taskId || publicReference('task', [internal?.invocationId])),
    agentId: String(options.agentId || internal?.resourceId || 'unknown-agent'),
    passportVersion: String(options.passportVersion || '1'),
    capabilityKey: String(options.capabilityKey || internal?.action || 'unknown.capability'),
    capabilityVersion: String(options.capabilityVersion || '1'),
    organizationScope: String(internal?.organizationId || ''),
    workspaceScope: String(internal?.workspaceId || ''),
    outcome: String(options.outcome || internal?.decision || 'completed').toLowerCase(),
    outputContractReference: String(options.outputContractReference || 'platform:data-contract'),
    startedAt: iso(options.startedAt || internal?.occurredAt),
    completedAt: iso(options.completedAt || internal?.recordedAt || internal?.occurredAt),
    attemptCount: Number(options.attemptCount || 1),
    approvalReference: internal?.approvalRequestId,
    policyDecisionReference: options.policyDecisionReference,
    outputDigest: String(options.outputDigest || internal?.integrity?.eventDigest || digest({})),
    evidenceDigest: String(internal?.integrity?.eventDigest || digest(internal?.safeMetadata || {})),
    billableStatusCategory: options.billableStatusCategory,
    nonBillableReason: options.nonBillableReason,
    revocationStateAtExecution: options.revocationStateAtExecution || 'unknown',
  };
}

function mapInternalRevocation(internal, options = {}) {
  return {
    revocationId: publicReference('revocation', [
      options.subjectType,
      options.subjectReference,
      internal?.revokedAt || internal?.updatedAt,
    ]),
    subjectType: options.subjectType,
    subjectReference: options.subjectReference,
    status:
      internal?.status === 'revoked' || internal?.revokedAt || internal?.enabled === false
        ? 'revoked'
        : 'active',
    reasonCode: String(
      internal?.revocationReasonCode || options.reasonCode || 'NOT_REVOKED',
    ),
    effectiveAt: iso(internal?.revokedAt || internal?.updatedAt || internal?.createdAt),
    expiresAt: options.expiresAt ? iso(options.expiresAt) : undefined,
    replacementReference: options.replacementReference,
    issuedBy: String(internal?.revokedBy || options.issuedBy || 'platform-operator'),
  };
}

function publicReference(category, fields) {
  return `${category}_${digest(fields.map((field) => String(field || '')).join('|')).slice(0, 24)}`;
}

function publicScope(category, value) {
  const text = String(value || '');
  return /^[a-f0-9]{24}$/i.test(text) ? publicReference(category, [text]) : text;
}

function iso(value) {
  const date = value ? new Date(value) : new Date(Date.now() + 60_000);
  if (Number.isNaN(date.getTime())) return new Date(Date.now() + 60_000).toISOString();
  return date.toISOString();
}

module.exports = {
  mapInstallKeyResolution,
  mapInternalApprovalChallenge,
  mapInternalApprovalDecision,
  mapInternalCapability,
  mapInternalConnection,
  mapInternalDataContract,
  mapInternalDelegation,
  mapInternalExecutionReceipt,
  mapInternalExecutionTask,
  mapInternalPassport,
  mapInternalRevocation,
  mapRuntimeRequestToInvocation,
  publicReference,
  publicScope,
};
