'use strict';

const crypto = require('node:crypto');
const {
  PROTOCOL_VERSION,
  boundedSerialize,
  redactPublicData,
  validateApprovalChallenge,
  validateApprovalDecision,
} = require('@ghostbridge/protocol-core');
const { createGhostBridgeClient } = require('@ghostbridge/native-client');
const { createNodeSecurityTransport, digest } = require('@ghostbridge/trust');
const { env } = require('../config/env');
const NativeClientApprovalReplay = require('../models/NativeClientApprovalReplay');
const { AppError } = require('../utils/AppError');

const BINDING_VERSION = 'phase-15c2.v1';
const FIXTURE_OPT_IN_HEADER = 'X-GhostBridge-Native-Client-Fixture';
const TERMINAL_TASK_STATES = new Set([
  'completed',
  'failed',
  'cancelled',
  'timed_out',
  'rejected',
  'revoked',
]);
const RECEIPT_OUTCOME_BY_TASK_STATE = Object.freeze({
  completed: 'completed',
  failed: 'failed',
  cancelled: 'cancelled',
  timed_out: 'timed_out',
  rejected: 'rejected',
  revoked: 'revoked',
});

const ERROR_CONTRACT = Object.freeze({
  AUTHENTICATION_REQUIRED: [401, 'AUTHENTICATION_REQUIRED', 'Agent protocol authentication is required.'],
  AUTHORIZATION_DENIED: [403, 'AUTHORIZATION_DENIED', 'The Agent protocol operation is not authorized.'],
  SCOPE_REQUIRED: [403, 'AUTHORIZATION_DENIED', 'The authenticated principal does not authorize the requested scope.'],
  SCOPE_MISMATCH: [403, 'AUTHORIZATION_DENIED', 'The authenticated principal does not authorize the requested scope.'],
  TRUST_POLICY_DENIED: [403, 'AGENT_NOT_TRUSTED', 'The Agent issuer is not trusted for this scope.'],
  ISSUER_NOT_TRUSTED: [403, 'AGENT_NOT_TRUSTED', 'The Agent issuer is not trusted for this scope.'],
  PROOF_REQUIRED: [403, 'AGENT_NOT_TRUSTED', 'Required Agent trust proof is missing.'],
  PROOF_INVALID: [403, 'AGENT_NOT_TRUSTED', 'Agent trust proof is invalid.'],
  SIGNATURE_INVALID: [403, 'AGENT_NOT_TRUSTED', 'Agent trust proof is invalid.'],
  KEY_NOT_ACTIVE: [403, 'AGENT_NOT_TRUSTED', 'Agent trust proof is invalid.'],
  KEY_NOT_FOUND: [403, 'AGENT_NOT_TRUSTED', 'Agent trust proof is invalid.'],
  PASSPORT_REVOKED: [403, 'AGENT_REVOKED', 'The Agent Passport is revoked.'],
  REVOKED: [403, 'AGENT_REVOKED', 'The Agent or Connection is revoked.'],
  CONNECTION_NOT_ACTIVE: [409, 'CONNECTION_NOT_ACTIVE', 'The Agent Connection is not active.'],
  REVOCATION_SET_STALE: [503, 'REVOCATION_STATE_STALE', 'Current revocation state is required.'],
  REVOCATION_ROLLBACK: [503, 'REVOCATION_STATE_STALE', 'Current revocation state is required.'],
  NO_COMMON_PROTOCOL_VERSION: [409, 'PROTOCOL_UNSUPPORTED', 'The Agent protocol version is unsupported.'],
  UNSUPPORTED_PROTOCOL_VERSION: [409, 'PROTOCOL_UNSUPPORTED', 'The Agent protocol version is unsupported.'],
  CAPABILITY_NOT_FOUND: [404, 'CAPABILITY_NOT_FOUND', 'The Agent capability was not found.'],
  CAPABILITY_VERSION_MISMATCH: [404, 'CAPABILITY_NOT_FOUND', 'The Agent capability version was not found.'],
  APPROVAL_REQUIRED: [409, 'APPROVAL_REQUIRED', 'The exact Agent action requires approval.'],
  APPROVAL_INVALID: [409, 'APPROVAL_INVALID', 'The Approval Decision is not valid for the exact action.'],
  APPROVAL_EXPIRED: [409, 'APPROVAL_INVALID', 'The Approval Decision is not valid for the exact action.'],
  TASK_NOT_FOUND: [404, 'TASK_NOT_FOUND', 'The Agent Task was not found.'],
  RECEIPT_PROOF_INVALID: [422, 'RECEIPT_INVALID', 'The Agent Receipt is invalid.'],
  PAYLOAD_DIGEST_MISMATCH: [422, 'RECEIPT_INVALID', 'The Agent Receipt digest does not match the result.'],
  AUDIENCE_MISMATCH: [422, 'RECEIPT_INVALID', 'The Agent Receipt audience is invalid.'],
  MESSAGE_TOO_LARGE: [502, 'RESPONSE_TOO_LARGE', 'The Agent response exceeds the configured size limit.'],
  DEADLINE_EXCEEDED: [504, 'TIMEOUT', 'The Agent protocol operation timed out.'],
  PROVIDER_UNAVAILABLE: [503, 'TRANSPORT_UNAVAILABLE', 'The Agent protocol transport is unavailable.'],
});

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function confirmation(input, names) {
  for (const name of names) {
    const value = idOf(input?.[name]);
    if (value) return value;
  }
  return '';
}

function authenticatedScope(principal, input = {}) {
  if (!principal || !principal.userId) {
    throw new AppError(
      401,
      'AUTHENTICATION_REQUIRED',
      'An authenticated Host principal is required.',
    );
  }
  const requestedWorkspace = confirmation(input, [
    'workspaceScope',
    'workspaceId',
    'receivingWorkspaceId',
  ]);
  if (!requestedWorkspace) {
    throw new AppError(403, 'AUTHORIZATION_DENIED', 'A permitted workspace is required.');
  }
  const permittedWorkspaces = new Set(
    (principal.permittedWorkspaceIds || []).map(idOf).filter(Boolean),
  );
  if (!permittedWorkspaces.has('*') && !permittedWorkspaces.has(requestedWorkspace)) {
    throw new AppError(
      403,
      'AUTHORIZATION_DENIED',
      'The requested workspace is outside the authenticated principal.',
    );
  }
  const organizationFromWorkspace = idOf(
    principal.workspaceOrganizationIds?.[requestedWorkspace],
  );
  const authoritativeOrganization =
    organizationFromWorkspace || idOf(principal.organizationId);
  const requestedOrganization = confirmation(input, [
    'organizationScope',
    'organizationId',
    'receivingOrganizationId',
  ]);
  const permittedOrganizations = new Set(
    (principal.permittedOrganizationIds || []).map(idOf).filter(Boolean),
  );
  if (
    !authoritativeOrganization ||
    (requestedOrganization && requestedOrganization !== authoritativeOrganization) ||
    (!permittedOrganizations.has('*') &&
      permittedOrganizations.size > 0 &&
      !permittedOrganizations.has(authoritativeOrganization))
  ) {
    throw new AppError(
      403,
      'AUTHORIZATION_DENIED',
      'The requested organization is outside the authenticated principal.',
    );
  }
  const requestedUser = confirmation(input, ['userId', 'receivingUserId', 'initiatingSubject']);
  if (requestedUser && requestedUser !== idOf(principal.userId)) {
    throw new AppError(
      403,
      'AUTHORIZATION_DENIED',
      'The requested user does not match the authenticated principal.',
    );
  }
  return Object.freeze({
    organizationScope: authoritativeOrganization,
    workspaceScope: requestedWorkspace,
    userId: idOf(principal.userId),
    subjectId: idOf(principal.subjectId || principal.userId),
    authenticationMethod: String(principal.authenticationMethod || 'host_principal').slice(0, 100),
  });
}

class MemoryReplayStore {
  constructor() {
    this.records = new Map();
  }

  consume(key, expiresAt) {
    const now = Date.now();
    for (const [recordKey, expiry] of this.records) {
      if (expiry <= now) this.records.delete(recordKey);
    }
    if (this.records.has(key)) {
      throw new AppError(
        409,
        'APPROVAL_INVALID',
        'The Approval Decision has already been used.',
      );
    }
    const expiry = Date.parse(expiresAt);
    this.records.set(key, Number.isFinite(expiry) ? expiry : now + 300_000);
  }
}

class MongoReplayStore {
  constructor(Model = NativeClientApprovalReplay) {
    this.Model = Model;
  }

  async consume(key, expiresAt) {
    const identifier = crypto.createHash('sha256').update(String(key)).digest('hex');
    const expiry = new Date(expiresAt);
    if (!Number.isFinite(expiry.getTime()) || expiry <= new Date()) {
      throw new AppError(409, 'APPROVAL_INVALID', 'The Approval Decision is expired.');
    }
    try {
      await this.Model.create({ _id: identifier, expiresAt: expiry });
    } catch (error) {
      if (error?.code === 11000) {
        throw new AppError(
          409,
          'APPROVAL_INVALID',
          'The Approval Decision has already been used.',
        );
      }
      throw new AppError(
        503,
        'APPROVAL_REPLAY_STATE_UNAVAILABLE',
        'Approval replay authority is unavailable.',
      );
    }
  }
}

class PlatformNativeClientAdapter {
  constructor(options = {}) {
    this.environment = options.environment || env.NODE_ENV;
    this.timeoutMs = boundedInteger(
      options.timeoutMs ?? env.PLATFORM_NATIVE_CLIENT_TIMEOUT_MS,
      50,
      120_000,
      10_000,
    );
    this.maximumResponseBytes = boundedInteger(
      options.maximumResponseBytes ?? env.PLATFORM_NATIVE_CLIENT_MAX_RESPONSE_BYTES,
      1,
      262_144,
      131_072,
    );
    this.hostAudience =
      options.hostAudience || env.PLATFORM_NATIVE_CLIENT_HOST_AUDIENCE || 'ghostbridge-platform';
    this.bindingTtlMs = boundedInteger(options.bindingTtlMs, 60_000, 86_400_000, 3_600_000);
    this.bindingSecret = String(
      options.bindingSecret || env.PLATFORM_NATIVE_CLIENT_BINDING_SECRET || '',
    );
    if (Buffer.byteLength(this.bindingSecret, 'utf8') < 32) {
      throw new TypeError('Platform Native Client binding secret must contain at least 32 bytes.');
    }
    this.clientFactory = options.clientFactory || createGhostBridgeClient;
    this.transportFactory =
      options.transportFactory ||
      ((configuration) =>
        createNodeSecurityTransport({
          timeoutMs: configuration.timeoutMs,
          maximumBytes: configuration.maximumResponseBytes,
          localFixtureMode: configuration.fixtureMode,
          allowedLocalOrigins: configuration.fixtureMode ? [configuration.baseUrl] : [],
        }));
    this.trustProvider = options.trustProvider;
    this.authenticationMaterialProvider = options.authenticationMaterialProvider;
    this.authenticationHandler = options.authenticationHandler;
    this.replayStore = options.replayStore || new MemoryReplayStore();
    this.clock = options.clock || Date.now;
    this.allowDevelopmentFixtures =
      options.allowDevelopmentFixtures ?? env.ALLOW_NATIVE_PROTOCOL_FIXTURES;
  }

  async discover(input, context = {}) {
    return this.#execute('discovery', context, async () => {
      const scope = authenticatedScope(context.principal, input);
      const session = await this.#session(input.baseUrl, scope, input, context);
      const discovery = await session.client.discover();
      const passport = await session.client.getPassport();
      const trust = await this.#verifyCurrentTrust(session.client, passport);
      const capabilities = await session.client.listCapabilities();
      const targetBinding = this.#seal('target', {
        baseUrl: session.baseUrl,
        organizationScope: scope.organizationScope,
        workspaceScope: scope.workspaceScope,
        userId: scope.userId,
        agentId: passport.agentId,
        passportId: passport.passportId,
        passportVersion: passport.passportVersion,
        issuer: passport.issuer,
        credentialReference: safeReference(input.credentialReference),
        fixtureMode: session.fixtureMode,
        trustEvidence: trust,
      });
      return Object.freeze({
        protocol: Object.freeze({
          selectedVersion: (await session.client.negotiateVersion()).selectedVersion,
          status: discovery.status,
          profiles: redactPublicData(discovery.profiles || {}),
          features: redactPublicData(discovery.features || {}),
          endpointNames: Object.freeze(Object.keys(discovery.endpoints || {}).sort()),
        }),
        agent: safePassport(passport),
        capabilities: Object.freeze(capabilities.map(safeCapability)),
        trust,
        targetBinding,
        nativeClientPath: true,
      });
    });
  }

  async install(input, context = {}) {
    return this.#execute('installation', context, async () => {
      const scope = authenticatedScope(context.principal, input);
      const session = await this.#session(input.baseUrl, scope, input, context);
      await session.client.discover();
      const passport = await session.client.getPassport();
      const approvedCapabilityKeys = boundedStringArray(
        input.approvedCapabilityKeys,
        'approvedCapabilityKeys',
      );
      const preview = await session.client.previewInstall({
        grant: requireString(input.grant, 'grant'),
        ...scope,
      });
      const previewKeys = new Set(
        (preview.capabilities || []).map((item) => item.capabilityKey),
      );
      if (
        !approvedCapabilityKeys.length ||
        approvedCapabilityKeys.some((key) => !previewKeys.has(key))
      ) {
        throw new AppError(
          403,
          'AUTHORIZATION_DENIED',
          'Approved capabilities must be an explicit subset of the verified installation preview.',
        );
      }
      const connection = await session.client.install({
        grant: input.grant,
        ...scope,
        approvedCapabilityKeys,
      });
      const trust = Object.freeze({
        category:
          preview.trust?.category ||
          (session.client.trust?.required === true
            ? 'verified_and_trusted'
            : 'explicit_development_fixture'),
        issuerId: passport.issuer,
        revocationFreshness:
          session.client.trust?.required === true ? 'verified_during_install' : 'fixture_only',
        verifiedAt: new Date(this.clock()).toISOString(),
      });
      const connectionBinding = this.#seal('connection', {
        baseUrl: session.baseUrl,
        protocolConnectionId: connection.connectionId,
        organizationScope: scope.organizationScope,
        workspaceScope: scope.workspaceScope,
        userId: scope.userId,
        agentId: connection.agentId || passport.agentId,
        passportId: passport.passportId,
        passportVersion: connection.passportVersion || passport.passportVersion,
        issuer: passport.issuer,
        approvedCapabilityKeys,
        credentialReference: safeReference(input.credentialReference),
        fixtureMode: session.fixtureMode,
        trustEvidence: trust,
      });
      return Object.freeze({
        connection: Object.freeze({
          connectionId: connection.connectionId,
          agentId: connection.agentId || passport.agentId,
          passportId: passport.passportId,
          passportVersion: connection.passportVersion || passport.passportVersion,
          organizationScope: scope.organizationScope,
          workspaceScope: scope.workspaceScope,
          status: connection.status,
          approvedCapabilityKeys: Object.freeze([...approvedCapabilityKeys]),
        }),
        trust,
        connectionBinding,
        nativeClientPath: true,
      });
    });
  }

  async invoke(input, context = {}) {
    return this.#execute('invocation', context, async () => {
      const binding = this.#open('connection', input.connectionBinding);
      const scope = this.#assertBindingScope(binding, input, context.principal);
      const session = await this.#session(binding.baseUrl, scope, binding, context);
      const { passport, trust } = await this.#verifiedBoundPassport(session.client, binding);
      const capabilityKey = requireString(input.capabilityKey || input.capability, 'capabilityKey');
      if (!binding.approvedCapabilityKeys.includes(capabilityKey)) {
        throw new AppError(
          403,
          'AUTHORIZATION_DENIED',
          'The capability is outside the approved Connection authority.',
        );
      }
      const capability = await session.client.getCapabilityDetails({
        agentId: binding.agentId,
        capabilityKey,
        capabilityVersion: input.capabilityVersion,
        organizationScope: scope.organizationScope,
        workspaceScope: scope.workspaceScope,
      });
      if (
        input.capabilityVersion &&
        String(input.capabilityVersion) !== capability.capabilityVersion
      ) {
        throw new AppError(404, 'CAPABILITY_NOT_FOUND', 'The Agent capability version was not found.');
      }
      const invocationId =
        optionalIdentifier(input.invocationId) || `invocation_${crypto.randomUUID()}`;
      const inputValue = plainInput(input.input);
      const envelope = Object.freeze({
        protocolVersion: PROTOCOL_VERSION,
        invocationId,
        messageId: optionalIdentifier(input.messageId) || `message_${crypto.randomUUID()}`,
        organizationScope: scope.organizationScope,
        workspaceScope: scope.workspaceScope,
        initiatingSubject: scope.userId,
        targetAgentId: binding.agentId,
        targetPassportVersion: binding.passportVersion,
        capabilityKey: capability.capabilityKey,
        capabilityVersion: capability.capabilityVersion,
        inputContractReference: capability.inputContractReference,
        ...(input.approvalReference
          ? { approvalReference: requireString(input.approvalReference, 'approvalReference') }
          : {}),
        ...(input.idempotencyKey
          ? { idempotencyKey: requireString(input.idempotencyKey, 'idempotencyKey') }
          : {}),
        deadline: boundedDeadline(input.deadline, this.timeoutMs, this.clock),
        traceContext: safeTraceContext(context),
        payload: inputValue,
        payloadClassification: boundedStringArray(
          input.payloadClassification || [],
          'payloadClassification',
          true,
        ),
        requestedReceiptProfile: 'standard',
      });
      const policyDecisionReference =
        safeReference(context.policyDecisionReference) ||
        'platform-native-client:host-principal-authorized';
      const result = await session.client.invoke(binding.protocolConnectionId, envelope);
      return this.#verifiedInvocationResult({
        session,
        passport,
        binding,
        envelope,
        capability,
        result,
        inputDigest: digest(inputValue),
        trust,
        policyDecisionReference,
      });
    });
  }

  async continueApproval(input, context = {}) {
    return this.#execute('approval', context, async () => {
      const approval = this.#open('approval', input.approvalBinding);
      const binding = this.#open('connection', approval.connectionBinding);
      const scope = this.#assertBindingScope(binding, input, context.principal);
      if (
        Object.hasOwn(input, 'input') &&
        digest(plainInput(input.input)) !== approval.inputDigest
      ) {
        throw new AppError(
          409,
          'APPROVAL_INVALID',
          'The payload changed after the exact action was approved.',
        );
      }
      const rawDecision = input.decision;
      if (!rawDecision || typeof rawDecision !== 'object' || Array.isArray(rawDecision)) {
        throw new AppError(409, 'APPROVAL_INVALID', 'A bounded Approval Decision is required.');
      }
      const requestedDecider = idOf(rawDecision.decidedBy);
      if (requestedDecider && requestedDecider !== scope.userId) {
        throw new AppError(
          403,
          'AUTHORIZATION_DENIED',
          'The Approval Decision identity does not match the authenticated principal.',
        );
      }
      const decision = {
        challengeId: rawDecision.challengeId,
        decisionId: requireString(rawDecision.decisionId, 'decisionId'),
        decision: rawDecision.decision,
        approvalActionDigest: rawDecision.approvalActionDigest,
        approvedLimits: rawDecision.approvedLimits || {},
        decidedBy: scope.userId,
        decidedAt: rawDecision.decidedAt || new Date(this.clock()).toISOString(),
        safeReasonCode: requireString(rawDecision.safeReasonCode, 'safeReasonCode'),
        ...(rawDecision.proof ? { proof: rawDecision.proof } : {}),
      };
      try {
        validateApprovalDecision(decision, approval.challenge, { clock: this.clock });
      } catch (error) {
        throw this.#platformError(error, 'approval');
      }
      if (decision.decision !== 'approved') {
        throw new AppError(
          409,
          'APPROVAL_INVALID',
          'Only an approved exact action can be continued.',
        );
      }
      await this.replayStore.consume(
        `${decision.decisionId}:${approval.challenge.approvalActionDigest}`,
        approval.challenge.expiresAt,
      );
      const session = await this.#session(binding.baseUrl, scope, binding, context);
      const { passport, trust } = await this.#verifiedBoundPassport(session.client, binding);
      await session.client.submitApprovalDecision(approval.challenge.challengeId, decision);
      const envelope = Object.freeze({
        ...approval.envelope,
        approvalReference: decision.decisionId,
      });
      const result = await session.client.invoke(binding.protocolConnectionId, envelope);
      return this.#verifiedInvocationResult({
        session,
        passport,
        binding,
        envelope,
        capability: approval.capability,
        result,
        inputDigest: approval.inputDigest,
        trust,
        policyDecisionReference: approval.challenge.policyDecisionReference,
      });
    });
  }

  async getTask(input, context = {}) {
    return this.#taskOperation('task_status', input, context, async (session, taskBinding) =>
      session.client.getTask(taskBinding.taskId));
  }

  async getTaskResult(input, context = {}) {
    return this.#taskOperation('task_result', input, context, async (session, taskBinding) =>
      session.client.getTask(taskBinding.taskId), { requireTerminal: true });
  }

  async cancelTask(input, context = {}) {
    return this.#taskOperation('cancellation', input, context, async (session, taskBinding) =>
      session.client.cancelTask(taskBinding.taskId), {
        requireTerminal: true,
        requiredState: 'cancelled',
      });
  }

  async getReceipt(input, context = {}) {
    return this.#execute('receipt_retrieval', context, async () => {
      const taskBinding = this.#open('task', input.taskBinding);
      const connection = this.#open('connection', taskBinding.connectionBinding);
      const scope = this.#assertBindingScope(connection, input, context.principal);
      const session = await this.#session(connection.baseUrl, scope, connection, context);
      const { passport } = await this.#verifiedBoundPassport(session.client, connection);
      const receiptId = requireString(
        input.receiptId || taskBinding.receiptReference,
        'receiptId',
      );
      if (
        taskBinding.receiptReference &&
        receiptId !== taskBinding.receiptReference
      ) {
        throw new AppError(422, 'RECEIPT_INVALID', 'The Receipt is not bound to this Task.');
      }
      const receipt = await session.client.getReceipt(receiptId);
      const verification = await this.#verifyReceipt(session.client, passport, connection, {
        receipt,
        invocation: taskBinding.invocation,
        task: { taskId: taskBinding.taskId },
        ...(Object.hasOwn(input, 'output') ? { output: input.output } : {}),
        ...(Object.hasOwn(input, 'evidence') ? { evidence: input.evidence } : {}),
      });
      return Object.freeze({ receipt, verification, nativeClientPath: true });
    });
  }

  async verifyReceipt(input, context = {}) {
    return this.getReceipt(input, context);
  }

  async checkRevocation(input, context = {}) {
    return this.#execute('revocation', context, async () => {
      const binding = this.#open('connection', input.connectionBinding);
      const scope = this.#assertBindingScope(binding, input, context.principal);
      const session = await this.#session(binding.baseUrl, scope, binding, context);
      const { passport } = await this.#verifiedBoundPassport(session.client, binding);
      const subjectType = String(input.subjectType || 'connection');
      const references = {
        connection: binding.protocolConnectionId,
        passport: passport.passportId,
      };
      if (!Object.hasOwn(references, subjectType)) {
        throw new AppError(
          403,
          'AUTHORIZATION_DENIED',
          'Only the bound Connection or Passport may be checked.',
        );
      }
      const status = await session.client.checkRevocation(subjectType, references[subjectType]);
      if (status.status !== 'active') {
        throw new AppError(403, 'AGENT_REVOKED', 'The Agent or Connection is revoked.');
      }
      return Object.freeze({
        subjectType,
        subjectReference: references[subjectType],
        status: status.status,
        reasonCode: status.reasonCode,
        effectiveAt: status.effectiveAt,
        nativeClientPath: true,
      });
    });
  }

  async #taskOperation(stage, input, context, operation, requirements = {}) {
    return this.#execute(stage, context, async () => {
      const taskBinding = this.#open('task', input.taskBinding);
      const connection = this.#open('connection', taskBinding.connectionBinding);
      const scope = this.#assertBindingScope(connection, input, context.principal);
      const session = await this.#session(connection.baseUrl, scope, connection, context);
      const { passport } = await this.#verifiedBoundPassport(session.client, connection);
      const task = await operation(session, taskBinding);
      this.#assertTask(task, taskBinding.invocation, connection);
      if (
        requirements.requireTerminal &&
        !TERMINAL_TASK_STATES.has(task.state)
      ) {
        throw new AppError(409, 'RECEIPT_INVALID', 'The Agent Task is not terminal.');
      }
      if (requirements.requiredState && task.state !== requirements.requiredState) {
        throw new AppError(
          422,
          'RECEIPT_INVALID',
          'The Agent Task did not reach the required terminal state.',
        );
      }
      let receipt;
      let verification;
      if (TERMINAL_TASK_STATES.has(task.state)) {
        if (!task.receiptReference) {
          throw new AppError(
            422,
            'RECEIPT_INVALID',
            'A terminal Agent Task requires a verifiable Receipt.',
          );
        }
        receipt = await session.client.getReceipt(task.receiptReference);
        verification = await this.#verifyReceipt(session.client, passport, connection, {
          receipt,
          task,
          invocation: taskBinding.invocation,
          ...(Object.hasOwn(input, 'output') ? { output: input.output } : {}),
          ...(Object.hasOwn(input, 'evidence') ? { evidence: input.evidence } : {}),
        });
      }
      const nextTaskBinding = this.#seal('task', {
        ...taskBinding,
        receiptReference: task.receiptReference,
      });
      return Object.freeze({
        task,
        ...(receipt ? { receipt, verification } : {}),
        taskBinding: nextTaskBinding,
        nativeClientPath: true,
      });
    });
  }

  async #verifiedInvocationResult({
    session,
    passport,
    binding,
    envelope,
    capability,
    result,
    inputDigest,
    trust,
    policyDecisionReference,
  }) {
    this.#assertTask(result.task, envelope, binding);
    let verification;
    if (result.receipt) {
      verification = await this.#verifyReceipt(session.client, passport, binding, {
        receipt: result.receipt,
        task: result.task,
        invocation: {
          ...envelope,
          connectionId: binding.protocolConnectionId,
          policyDecisionReference,
        },
        output: result.output,
      });
    } else if (TERMINAL_TASK_STATES.has(result.task.state)) {
      throw new AppError(
        422,
        'RECEIPT_INVALID',
        'A terminal Agent Task requires a signed Receipt.',
      );
    }
    const connectionBinding = this.#seal('connection', binding);
    const taskBinding = this.#seal('task', {
      connectionBinding,
      taskId: result.task.taskId,
      receiptReference: result.task.receiptReference,
      invocation: {
        invocationId: envelope.invocationId,
        connectionId: binding.protocolConnectionId,
        organizationScope: envelope.organizationScope,
        workspaceScope: envelope.workspaceScope,
        agentId: envelope.targetAgentId,
        passportVersion: envelope.targetPassportVersion,
        capabilityKey: envelope.capabilityKey,
        capabilityVersion: envelope.capabilityVersion,
        inputContractReference: envelope.inputContractReference,
        inputDigest,
        approvalReference: envelope.approvalReference,
        trustEvidence: trust,
        policyDecisionReference,
      },
    });
    let approvalBinding;
    if (result.approvalChallenge) {
      validateApprovalChallenge(result.approvalChallenge);
      if (
        result.approvalChallenge.invocationId !== envelope.invocationId ||
        result.approvalChallenge.organizationScope !== envelope.organizationScope ||
        result.approvalChallenge.workspaceScope !== envelope.workspaceScope
      ) {
        throw new AppError(
          409,
          'APPROVAL_INVALID',
          'The approval challenge is not bound to the exact invocation scope.',
        );
      }
      approvalBinding = this.#seal('approval', {
        connectionBinding,
        envelope,
        capability: safeCapability(capability),
        inputDigest,
        challenge: result.approvalChallenge,
        trustEvidence: trust,
      });
    }
    return Object.freeze({
      invocation: Object.freeze({
        invocationId: envelope.invocationId,
        connectionId: binding.protocolConnectionId,
        agentId: envelope.targetAgentId,
        passportVersion: envelope.targetPassportVersion,
        capabilityKey: envelope.capabilityKey,
        capabilityVersion: envelope.capabilityVersion,
        organizationScope: envelope.organizationScope,
        workspaceScope: envelope.workspaceScope,
        inputDigest,
        inputContractReference: envelope.inputContractReference,
        approvalReference: envelope.approvalReference,
        idempotencyReference: envelope.idempotencyKey
          ? digest(envelope.idempotencyKey)
          : undefined,
        receiptReference: result.receipt?.receiptId,
        trustEvidence: trust,
        policyDecisionReference,
      }),
      task: result.task,
      ...(result.output !== undefined ? { output: result.output } : {}),
      ...(result.receipt ? { receipt: result.receipt, verification } : {}),
      ...(result.approvalChallenge
        ? { approvalChallenge: result.approvalChallenge, approvalBinding }
        : {}),
      taskBinding,
      nativeClientPath: true,
    });
  }

  async #verifiedBoundPassport(client, binding) {
    await client.discover();
    const passport = await client.getPassport();
    for (const [field, expected] of [
      ['agentId', binding.agentId],
      ['passportId', binding.passportId],
      ['passportVersion', binding.passportVersion],
      ['issuer', binding.issuer],
    ]) {
      if (passport[field] !== expected) {
        throw new AppError(
          403,
          'AGENT_NOT_TRUSTED',
          'The live Agent Passport no longer matches the Connection binding.',
        );
      }
    }
    const trust = await this.#verifyCurrentTrust(client, passport, binding);
    return Object.freeze({ passport, trust });
  }

  async #verifyCurrentTrust(client, passport, binding = {}) {
    if (client.trust?.required !== true) {
      return Object.freeze({
        category: 'explicit_development_fixture',
        issuerId: passport.issuer,
        revocationFreshness: 'fixture_only',
        verifiedAt: new Date(this.clock()).toISOString(),
      });
    }
    const passportTrust = await client.verifyPassport(passport, {
      organizationPolicy: client.trust?.organizationPolicy,
      workspacePolicy: client.trust?.workspacePolicy,
    });
    if (passportTrust.policy?.category !== 'verified_and_trusted') {
      throw new AppError(403, 'AGENT_NOT_TRUSTED', 'The Agent issuer is not trusted for this scope.');
    }
    const revocation = await client.getRevocationSet(passport.issuer, passportTrust);
    if (!['fresh', 'nearing_expiry'].includes(revocation.verification.freshness)) {
      throw new AppError(
        503,
        'REVOCATION_STATE_STALE',
        'Current signed revocation state is required.',
      );
    }
    const relevantReferences = new Set([
      passport.passportId,
      passport.agentId,
      binding.protocolConnectionId,
    ].filter(Boolean));
    const revoked = (revocation.document.entries || []).find(
      (entry) =>
        relevantReferences.has(entry.subjectReference) &&
        entry.status !== 'active',
    );
    if (revoked) {
      throw new AppError(403, 'AGENT_REVOKED', 'The Agent or Connection is revoked.');
    }
    for (const [subjectType, subjectReference] of [
      ['passport', passport.passportId],
      ['connection', binding.protocolConnectionId],
    ]) {
      if (!subjectReference) continue;
      const status = await client.checkRevocation(subjectType, subjectReference);
      if (status.status !== 'active') {
        throw new AppError(403, 'AGENT_REVOKED', 'The Agent or Connection is revoked.');
      }
    }
    return Object.freeze({
      category: passportTrust.policy.category,
      issuerId: passport.issuer,
      verifiedKeyId: passportTrust.proof?.kid,
      trustProfileVersion: passport.trustProfileVersion,
      revocationFreshness: revocation.verification.freshness,
      revocationSequence: revocation.document.sequence,
      verifiedAt: new Date(this.clock()).toISOString(),
    });
  }

  async #verifyReceipt(client, passport, binding, input) {
    const { receipt, task, invocation } = input;
    if (
      !receipt ||
      receipt.connectionId !== binding.protocolConnectionId ||
      receipt.organizationScope !== binding.organizationScope ||
      receipt.workspaceScope !== binding.workspaceScope ||
      receipt.agentId !== binding.agentId ||
      receipt.passportVersion !== binding.passportVersion ||
      (task?.taskId && receipt.taskId !== task.taskId) ||
      (invocation?.invocationId && receipt.invocationId !== invocation.invocationId) ||
      (
        invocation?.approvalReference &&
        receipt.approvalReference !== invocation.approvalReference
      ) ||
      receipt.revocationStateAtExecution !== 'active'
    ) {
      throw new AppError(
        422,
        'RECEIPT_INVALID',
        'The Agent Receipt is not bound to the exact Task, scope, and Connection.',
      );
    }
    if (
      task?.state &&
      RECEIPT_OUTCOME_BY_TASK_STATE[task.state] !== receipt.outcome
    ) {
      throw new AppError(422, 'RECEIPT_INVALID', 'The Agent Task and Receipt disagree.');
    }
    const jwks = client.trust?.jwks || await client.getIssuerKeys(passport.issuer);
    let result;
    try {
      result = await client.verifyReceipt(receipt, {
        passport,
        jwks,
        expectedAudience: this.hostAudience,
        productionMode: this.environment === 'production',
        invocation,
        connectionTrustRecord: { connectionId: binding.protocolConnectionId },
        ...(Object.hasOwn(input, 'output') ? { actualOutput: input.output } : {}),
        ...(Object.hasOwn(input, 'evidence') ? { actualEvidence: input.evidence } : {}),
      });
    } catch (error) {
      throw new AppError(422, 'RECEIPT_INVALID', 'The Agent Receipt signature or digest is invalid.', [], {
        reasonCode: String(error?.code || error?.errorCode || 'RECEIPT_PROOF_INVALID').slice(0, 100),
      });
    }
    if (
      result.valid !== true ||
      result.proofState !== 'valid' ||
      ['invalid_due_to_revocation', 'indeterminate_due_to_compromise'].includes(
        result.historicalStatus,
      )
    ) {
      throw new AppError(422, 'RECEIPT_INVALID', 'The Agent Receipt signature is invalid.');
    }
    return Object.freeze({
      valid: true,
      proofState: result.proofState,
      historicalStatus: result.historicalStatus,
      receiptId: receipt.receiptId,
    });
  }

  #assertTask(task, invocation, binding) {
    if (
      !task ||
      task.invocationId !== invocation.invocationId ||
      (task.connectionId && task.connectionId !== binding.protocolConnectionId)
    ) {
      throw new AppError(
        422,
        'RECEIPT_INVALID',
        'The Agent Task is not bound to the exact invocation and Connection.',
      );
    }
  }

  #assertBindingScope(binding, input, principal) {
    const scope = authenticatedScope(principal, {
      ...input,
      workspaceScope:
        confirmation(input, ['workspaceScope', 'workspaceId', 'receivingWorkspaceId']) ||
        binding.workspaceScope,
      organizationScope:
        confirmation(input, ['organizationScope', 'organizationId', 'receivingOrganizationId']) ||
        binding.organizationScope,
    });
    if (
      scope.organizationScope !== binding.organizationScope ||
      scope.workspaceScope !== binding.workspaceScope ||
      scope.userId !== binding.userId
    ) {
      throw new AppError(
        403,
        'AUTHORIZATION_DENIED',
        'The sealed protocol binding belongs to another principal scope.',
      );
    }
    return scope;
  }

  async #session(baseUrlInput, scope, input, context) {
    const fixtureMode = input.fixtureMode === true || input.fixture === true;
    if (
      fixtureMode &&
      (this.environment !== 'development' ||
        context.fixtureOptIn !== true ||
        this.allowDevelopmentFixtures !== true)
    ) {
      throw new AppError(
        403,
        'FIXTURE_TRANSPORT_FORBIDDEN',
        'Native Client fixtures require explicit development environment and request opt-in.',
      );
    }
    if (this.environment === 'production' && fixtureMode) {
      throw new AppError(
        403,
        'FIXTURE_TRANSPORT_FORBIDDEN',
        'Native Client fixture transports are prohibited in production.',
      );
    }
    const baseUrl = normalizedBaseUrl(baseUrlInput);
    const trust = this.trustProvider
      ? await this.trustProvider({ baseUrl, scope, fixtureMode })
      : undefined;
    if (!fixtureMode && trust?.required !== true) {
      throw new AppError(
        503,
        'AGENT_NOT_TRUSTED',
        'Production-eligible Native Client operations require explicit Trust Node configuration.',
      );
    }
    const transport = await this.transportFactory({
      baseUrl,
      scope,
      fixtureMode,
      timeoutMs: this.timeoutMs,
      maximumResponseBytes: this.maximumResponseBytes,
    });
    const credentialReference = safeReference(input.credentialReference);
    const client = this.clientFactory({
      baseUrl,
      transport,
      timeoutMs: this.timeoutMs,
      maximumResponseBytes: this.maximumResponseBytes,
      localFixtureMode: fixtureMode,
      allowedLocalOrigins: fixtureMode ? [baseUrl] : [],
      supportedAuthenticationModes: fixtureMode
        ? ['signed_request', 'oauth', 'none']
        : ['signed_request', 'oauth'],
      authenticationHandler: async (challenge) => {
        if (this.authenticationHandler) {
          return this.authenticationHandler({
            ...challenge,
            credentialReference,
            scope,
          });
        }
        if (!credentialReference) {
          throw new AppError(
            401,
            'AUTHENTICATION_REQUIRED',
            'An opaque Agent credential reference is required.',
          );
        }
        return { credentialReference };
      },
      transportHeaders: async ({ url, method }) => {
        if (!this.authenticationMaterialProvider || !credentialReference) return {};
        const material = await this.authenticationMaterialProvider({
          credentialReference,
          scope,
          url,
          method,
        });
        if (
          !material ||
          typeof material.authorization !== 'string' ||
          !material.authorization.trim()
        ) {
          throw new AppError(
            401,
            'AUTHENTICATION_REQUIRED',
            'Agent protocol authentication material is unavailable.',
          );
        }
        return { authorization: material.authorization };
      },
      requestIdFactory: () => context.requestId || `request_${crypto.randomUUID()}`,
      traceIdFactory: () => context.traceId || `trace_${crypto.randomUUID()}`,
      trust,
    });
    return { client, baseUrl, fixtureMode };
  }

  #seal(kind, value) {
    const payload = Buffer.from(
      boundedSerialize({
        bindingVersion: BINDING_VERSION,
        kind,
        issuedAt: new Date(this.clock()).toISOString(),
        expiresAt: new Date(this.clock() + this.bindingTtlMs).toISOString(),
        value: removeUndefined(value),
      }),
      'utf8',
    ).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.bindingSecret)
      .update(payload)
      .digest('base64url');
    return `gbp1.${payload}.${signature}`;
  }

  #open(expectedKind, token) {
    const parts = String(token || '').split('.');
    if (parts.length !== 3 || parts[0] !== 'gbp1') {
      throw new AppError(403, 'AUTHORIZATION_DENIED', 'The protocol binding is invalid.');
    }
    const expected = crypto
      .createHmac('sha256', this.bindingSecret)
      .update(parts[1])
      .digest('base64url');
    const received = parts[2];
    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
    ) {
      throw new AppError(403, 'AUTHORIZATION_DENIED', 'The protocol binding is invalid.');
    }
    let envelope;
    try {
      envelope = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch {
      throw new AppError(403, 'AUTHORIZATION_DENIED', 'The protocol binding is invalid.');
    }
    if (
      envelope.bindingVersion !== BINDING_VERSION ||
      envelope.kind !== expectedKind ||
      Date.parse(envelope.expiresAt) <= this.clock() ||
      !envelope.value ||
      typeof envelope.value !== 'object'
    ) {
      throw new AppError(403, 'AUTHORIZATION_DENIED', 'The protocol binding is invalid or expired.');
    }
    return Object.freeze(structuredClone(envelope.value));
  }

  async #execute(stage, context, operation) {
    const startedAt = this.clock();
    try {
      const result = await operation();
      context.observer?.emit('info', 'platform.native_client.completed', {
        requestId: context.requestId,
        traceId: context.traceId,
        stage,
        status: 'completed',
        durationMs: Math.max(0, this.clock() - startedAt),
      });
      return result;
    } catch (error) {
      const platformError = this.#platformError(error, stage);
      context.observer?.emit('warn', 'platform.native_client.failed', {
        requestId: context.requestId,
        traceId: context.traceId,
        stage,
        status: 'failed',
        reasonCode: platformError.code,
        durationMs: Math.max(0, this.clock() - startedAt),
      });
      throw platformError;
    }
  }

  #platformError(error, stage) {
    if (error instanceof AppError) return error;
    const nativeCode = String(error?.code || error?.errorCode || '');
    let contract = ERROR_CONTRACT[nativeCode];
    if (!contract && /REVOCATION.*(?:STALE|EXPIRED|UNKNOWN)/.test(nativeCode)) {
      contract = ERROR_CONTRACT.REVOCATION_SET_STALE;
    }
    if (!contract && /RECEIPT|DIGEST|AUDIENCE/.test(nativeCode)) {
      contract = [422, 'RECEIPT_INVALID', 'The Agent Receipt is invalid.'];
    }
    if (!contract && nativeCode === 'INVALID_MESSAGE') {
      contract =
        stage.startsWith('receipt') || stage === 'cancellation' || stage === 'task_result'
          ? [422, 'RECEIPT_INVALID', 'The Agent protocol proof is invalid.']
          : [502, 'DISCOVERY_INVALID', 'The Agent protocol response is invalid.'];
    }
    contract ||= [502, 'TRANSPORT_UNAVAILABLE', 'The Agent protocol operation failed safely.'];
    return new AppError(contract[0], contract[1], contract[2], [], {
      reasonCode: nativeCode ? nativeCode.slice(0, 100) : undefined,
      retryable: error?.retryable === true,
      retryAfterMs: error?.retryAfterMs,
      stage,
      cause: error,
    });
  }
}

function safePassport(passport) {
  return Object.freeze({
    agentId: passport.agentId,
    passportId: passport.passportId,
    passportVersion: passport.passportVersion,
    displayName: passport.displayName,
    safeDescription: passport.safeDescription,
    issuer: passport.issuer,
    status: passport.status,
    supportedProtocolVersions: Object.freeze([...(passport.supportedProtocolVersions || [])]),
    receiptSupport: passport.receiptSupport === true,
  });
}

function safeCapability(capability) {
  return Object.freeze(redactPublicData({
    capabilityKey: capability.capabilityKey,
    capabilityVersion: capability.capabilityVersion,
    displayName: capability.displayName,
    safeDescription: capability.safeDescription,
    inputContractReference: capability.inputContractReference,
    outputContractReference: capability.outputContractReference,
    inputSchema: capability.inputSchema,
    outputSchema: capability.outputSchema,
    riskCategory: capability.riskCategory,
    sideEffectCategory: capability.sideEffectCategory,
    idempotencySupport: capability.idempotencySupport,
    asynchronousSupport: capability.asynchronousSupport,
    cancellationSupport: capability.cancellationSupport,
    approvalRequirement: capability.approvalRequirement,
    receiptRequirement: capability.receiptRequirement,
    status: capability.status,
  }));
}

function safeReference(value) {
  if (value == null || value === '') return undefined;
  const reference = String(value);
  if (
    reference.length > 500 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(reference) ||
    /(?:bearer|token|secret|password|private[-_]?key)=/i.test(reference)
  ) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Credential reference is invalid.');
  }
  return reference;
}

function requireString(value, field) {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} is required and bounded.`);
  }
  return value.trim();
}

function optionalIdentifier(value) {
  if (value == null || value === '') return undefined;
  const normalized = String(value);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(normalized)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Protocol identifier is invalid.');
  }
  return normalized;
}

function boundedStringArray(value, field, allowEmpty = false) {
  if (
    !Array.isArray(value) ||
    value.length > 256 ||
    (!allowEmpty && value.length === 0) ||
    value.some((item) => typeof item !== 'string' || !item || item.length > 200)
  ) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} is invalid.`);
  }
  return Object.freeze([...new Set(value)]);
}

function plainInput(value) {
  const input = value === undefined ? {} : value;
  try {
    boundedSerialize(input);
  } catch {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invocation input is not bounded plain data.');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invocation input must be an object.');
  }
  return structuredClone(input);
}

function boundedDeadline(value, timeoutMs, clock) {
  const now = clock();
  const maximum = now + timeoutMs;
  if (value === undefined) return new Date(maximum).toISOString();
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || parsed <= now || parsed > maximum) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Invocation deadline must be in the future and within the configured timeout.',
    );
  }
  return new Date(parsed).toISOString();
}

function safeTraceContext(context) {
  const result = {};
  if (context.traceId) result.traceId = String(context.traceId).slice(0, 200);
  if (context.requestId) result.requestId = String(context.requestId).slice(0, 200);
  return Object.freeze(result);
}

function normalizedBaseUrl(value) {
  const raw = requireString(value, 'baseUrl');
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new AppError(400, 'VALIDATION_ERROR', 'Agent base URL is invalid.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Agent base URL is unsafe.');
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  return parsed.toString().replace(/\/$/, '');
}

function boundedInteger(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

function removeUndefined(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== undefined).map(removeUndefined);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .map(([key, child]) => [key, removeUndefined(child)]),
  );
}

let defaultAdapter;

function createPlatformNativeClientAdapter(options) {
  return new PlatformNativeClientAdapter(options);
}

function getPlatformNativeClientAdapter() {
  if (!defaultAdapter) {
    defaultAdapter = createPlatformNativeClientAdapter({
      replayStore: new MongoReplayStore(),
      trustProvider({ scope, fixtureMode }) {
        if (fixtureMode) return { required: false, hostAudience: env.PLATFORM_NATIVE_CLIENT_HOST_AUDIENCE };
        const configured = env.PLATFORM_NATIVE_CLIENT_TRUST_POLICY || {};
        const organizationPolicy =
          configured.organizations?.[scope.organizationScope] ||
          configured.organizationPolicy;
        const workspacePolicy =
          configured.workspaces?.[scope.workspaceScope] ||
          configured.workspacePolicy;
        return {
          required: true,
          hostAudience: env.PLATFORM_NATIVE_CLIENT_HOST_AUDIENCE,
          organizationPolicy,
          workspacePolicy,
        };
      },
    });
  }
  return defaultAdapter;
}

module.exports = {
  FIXTURE_OPT_IN_HEADER,
  MemoryReplayStore,
  MongoReplayStore,
  PlatformNativeClientAdapter,
  authenticatedScope,
  createPlatformNativeClientAdapter,
  getPlatformNativeClientAdapter,
};
