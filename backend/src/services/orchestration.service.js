const mongoose = require('mongoose');
const OrchestrationDefinition = require('../models/OrchestrationDefinition');
const OrchestrationRun = require('../models/OrchestrationRun');
const OrchestrationNodeRun = require('../models/OrchestrationNodeRun');
const PassportConnection = require('../models/PassportConnection');
const AgentPassport = require('../models/AgentPassport');
const Capability = require('../models/Capability');
const AgentSelectionPolicy = require('../models/AgentSelectionPolicy');
const CapabilityCatalogEntry = require('../models/CapabilityCatalogEntry');
const ApprovalRequest = require('../models/ApprovalRequest');
const AgentSelectionDecision = require('../models/AgentSelectionDecision');
const InterAgentDataContract = require('../models/InterAgentDataContract');
const OrchestrationRecoveryPolicy = require('../models/OrchestrationRecoveryPolicy');
const { evaluateSelection } = require('./agentSelection.service');
const { createGrantRecord, closeRunGrants } = require('./interAgentDelegation.service');
const { actorFromPartner, assertAuthorized } = require('./authorization.service');
const { assertOperationalAccess } = require('./operationalState.service');
const { createAuditLog } = require('./auditService');
const { env } = require('../config/env');
const {
  buildCursorFilter,
  createCursorFromRecord,
  decodeCursor,
  validateQueryRequest,
} = require('./dataAccessRegistry.service');
const { requestCancellation: cancelInvocation } = require('./invocationControl.service');
const metrics = require('./orchestrationMetrics.service');
const {
  assertDefinitionNotPaused,
  assertWorkspaceNotPaused,
} = require('./orchestrationObservability.service');
const {
  DEFAULT_ORCHESTRATION_SETTINGS,
  ORCHESTRATION_DEFINITION_STATUSES,
  ORCHESTRATION_LIMITS,
  ORCHESTRATION_NODE_STATUSES,
  ORCHESTRATION_RUN_STATUSES,
  TERMINAL_RUN_STATUSES,
} = require('../constants/orchestration');
const {
  assertSafePayload,
  definitionDigest,
  redactedSummary,
  safeDefinitionSnapshot,
  validateAgainstSchema,
  validateDefinitionDocument,
} = require('./orchestrationValidation.service');
const {
  canonicalize,
  hashesEqual,
  isDuplicateKeyError,
  normalizeClientKey,
  secureDigest,
} = require('../utils/idempotency');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { assertRegionalWriteAuthority } = require('./regionalAuthority.service');
const {
  assertAdmissionAccepted,
  releaseQuotaReservation,
  resolveWorkloadRoute,
} = require('./productionScale.service');

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function callerScope(input = {}, caller = {}) {
  const partnerId = idOf(caller.partner);
  if (!partnerId) {
    throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Partner API key is required.');
  }
  const workspaceId = String(input.workspaceId || input.receivingWorkspaceId || '').trim();
  if (!workspaceId) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
      { path: 'workspaceId', message: 'workspaceId is required.' },
    ]);
  }
  return {
    organizationId: partnerId,
    partnerId,
    workspaceId,
    actorId: `partner:${partnerId}`,
    actorType: 'partner',
    requestId: caller.requestId,
    traceId: caller.traceId,
  };
}

function resource(type, id, scope) {
  return {
    type,
    id: idOf(id) || `${type.toLowerCase()}:${scope.workspaceId}`,
    organizationId: scope.organizationId,
    partnerId: scope.partnerId,
    workspaceId: scope.workspaceId,
  };
}

async function authorize(permission, type, entityId, scope, caller, context = {}) {
  return assertAuthorized(
    actorFromPartner(caller.partner, {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      requestId: caller.requestId,
      traceId: caller.traceId,
    }),
    permission,
    resource(type, entityId, scope),
    {
      requestId: caller.requestId,
      traceId: caller.traceId,
      workspaceId: scope.workspaceId,
      ...context,
    },
  );
}

async function audit(action, type, entityId, scope, metadata = {}) {
  return createAuditLog(
    scope.actorType,
    scope.actorId,
    action,
    type,
    idOf(entityId),
    {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      receivingWorkspaceId: scope.workspaceId,
      ...metadata,
    },
    { requestId: scope.requestId, traceId: scope.traceId },
  );
}

function pagination(input = {}) {
  const page = Number(input.page || 1);
  const limit = Number(input.limit || 25);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Pagination is invalid.', [
      { path: 'pagination', message: 'page must be positive and limit must be between 1 and 100.' },
    ]);
  }
  return { page, limit, skip: (page - 1) * limit };
}

function safeSearch(value) {
  const normalized = String(value || '').trim().slice(0, 100);
  return normalized ? normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
}

function safeRecoveryPolicySnapshot(policyInput) {
  if (!policyInput) return undefined;
  const policy = typeof policyInput?.toObject === 'function' ? policyInput.toObject() : policyInput;
  const snapshot = {
    policyId: idOf(policy),
    version: Number(policy.version),
    name: String(policy.name),
    defaultFailureStrategy: policy.defaultFailureStrategy,
    maximumRecoveryAttempts: Number(policy.maximumRecoveryAttempts || 0),
    maximumCompensationAttempts: Number(policy.maximumCompensationAttempts || 0),
    recoveryBackoffPolicy: { ...(policy.recoveryBackoffPolicy || {}) },
    compensationBackoffPolicy: { ...(policy.compensationBackoffPolicy || {}) },
    recoveryDeadlineMs: Number(policy.recoveryDeadlineMs),
    compensationDeadlineMs: Number(policy.compensationDeadlineMs),
    allowOperatorRetry: policy.allowOperatorRetry === true,
    allowOperatorSkip: policy.allowOperatorSkip === true,
    allowOperatorResume: policy.allowOperatorResume === true,
    allowOperatorCompensate: policy.allowOperatorCompensate === true,
    allowOperatorTerminate: policy.allowOperatorTerminate === true,
    allowOperatorAgentReplacement: policy.allowOperatorAgentReplacement === true,
    allowOperatorInputCorrection: policy.allowOperatorInputCorrection === true,
    requireApprovalForRetry: policy.requireApprovalForRetry === true,
    requireApprovalForSkip: policy.requireApprovalForSkip === true,
    requireApprovalForCompensation: policy.requireApprovalForCompensation === true,
    requireApprovalForAgentReplacement: policy.requireApprovalForAgentReplacement === true,
    requireApprovalForInputCorrection: policy.requireApprovalForInputCorrection === true,
    requireApprovalForForceTermination: policy.requireApprovalForForceTermination === true,
    permittedFailureCategories: [...(policy.permittedFailureCategories || [])].sort(),
    nonRecoverableFailureCategories: [...(policy.nonRecoverableFailureCategories || [])].sort(),
    automaticCompensation: policy.automaticCompensation === true,
    compensateOnCancellation: policy.compensateOnCancellation === true,
    compensateOnTimeout: policy.compensateOnTimeout === true,
    compensateOnPolicyRevocation: policy.compensateOnPolicyRevocation === true,
    compensateOnConnectionRevocation: policy.compensateOnConnectionRevocation === true,
    compensationOrdering: policy.compensationOrdering,
    continueCompensationAfterFailure: policy.continueCompensationAfterFailure === true,
    maximumParallelCompensations: Number(policy.maximumParallelCompensations || 1),
    activatedAt: policy.activatedAt,
  };
  assertSafePayload(snapshot, '$recoveryPolicySnapshot');
  return Object.freeze(snapshot);
}

function normalizeRetryPolicy(input = {}) {
  return {
    maxAttempts: Number(input.maxAttempts || DEFAULT_ORCHESTRATION_SETTINGS.retryPolicy.maxAttempts),
    baseDelayMs: Number(input.baseDelayMs || DEFAULT_ORCHESTRATION_SETTINGS.retryPolicy.baseDelayMs),
    maxDelayMs: Number(input.maxDelayMs || DEFAULT_ORCHESTRATION_SETTINGS.retryPolicy.maxDelayMs),
  };
}

function normalizeCompensationDefinition(input, defaultTimeout) {
  if (!input) return undefined;
  const targetingMode = String(
    input.targetingMode || (input.selectionPolicyId ? 'governed_selection' : 'pinned'),
  );
  return {
    targetingMode,
    ...(targetingMode === 'governed_selection'
      ? {
          selectionPolicyId: input.selectionPolicyId,
          selectionConstraints: input.selectionConstraints || {},
          preferredPassportIds: [...new Set((input.preferredPassportIds || []).map(idOf))].sort(),
          excludedPassportIds: [...new Set((input.excludedPassportIds || []).map(idOf))].sort(),
        }
      : { connectionId: input.connectionId, passportId: input.passportId }),
    capability: String(input.capability || '').trim(),
    operation: String(input.operation || input.capability || '').trim(),
    inputSchema: input.inputSchema || { type: 'object', properties: {}, additionalProperties: false },
    outputSchema: input.outputSchema || { type: 'object', properties: {}, additionalProperties: false },
    inputMapping: input.inputMapping || {},
    timeoutMs: Number(input.timeoutMs || defaultTimeout),
    retryPolicy: normalizeRetryPolicy(input.retryPolicy),
    ...(input.dataContractId ? { dataContractId: input.dataContractId } : {}),
    ...(input.dataContractVersion != null
      ? { dataContractVersion: Number(input.dataContractVersion) }
      : {}),
    approvalRequirement: {
      required: input.approvalRequirement?.required === true,
      ...(input.approvalRequirement?.workflowId
        ? { workflowId: String(input.approvalRequirement.workflowId).trim() }
        : {}),
      ...(input.approvalRequirement?.reason
        ? { reason: String(input.approvalRequirement.reason).trim() }
        : {}),
    },
    expectedIdempotencyBehavior: String(
      input.expectedIdempotencyBehavior || 'ghost_bridge_keyed',
    ),
    successCriteria: input.successCriteria || {},
    continueAfterCompensationFailure: input.continueAfterCompensationFailure === true,
    parallelSafe: input.parallelSafe === true,
    dependencies: [...new Set((input.dependencies || []).map((value) => String(value).trim()))].sort(),
  };
}

function normalizeDefinitionInput(input = {}, current = {}) {
  assertSafePayload(input, '$definition');
  const defaultTimeout = Number(
    input.defaultNodeTimeoutMs ||
      current.defaultNodeTimeoutMs ||
      DEFAULT_ORCHESTRATION_SETTINGS.defaultNodeTimeoutMs,
  );
  const nodes = (input.nodes || current.nodes || []).map((node) => ({
    ...(() => {
      const targetingMode = String(node.targetingMode || (node.selectionPolicyId ? 'governed_selection' : 'pinned'));
      return targetingMode === 'governed_selection'
        ? {
            targetingMode,
            selectionPolicyId: node.selectionPolicyId,
            selectionConstraints: node.selectionConstraints || {},
            preferredPassportIds: [...new Set((node.preferredPassportIds || []).map(idOf))].sort(),
            excludedPassportIds: [...new Set((node.excludedPassportIds || []).map(idOf))].sort(),
            fallbackCandidateCount: Number(node.fallbackCandidateCount ?? 0),
            selectionTiming: String(node.selectionTiming || 'run_creation'),
          }
        : { targetingMode, connectionId: node.connectionId, passportId: node.passportId };
    })(),
    nodeKey: String(node.nodeKey || '').trim(),
    displayName: String(node.displayName || node.nodeKey || '').trim(),
    capability: String(node.capability || '').trim(),
    operation: String(node.operation || node.capability || '').trim(),
    inputSchema: node.inputSchema || { type: 'object', additionalProperties: false },
    outputSchema: node.outputSchema || { type: 'object' },
    inputMapping: node.inputMapping || {},
    timeoutMs: Number(node.timeoutMs || defaultTimeout),
    retryPolicy: normalizeRetryPolicy(node.retryPolicy),
    approvalRequirement: {
      required: node.approvalRequirement?.required === true,
      ...(node.approvalRequirement?.workflowId
        ? { workflowId: String(node.approvalRequirement.workflowId).trim() }
        : {}),
      ...(node.approvalRequirement?.reason
        ? { reason: String(node.approvalRequirement.reason).trim() }
        : {}),
    },
    policyContext: node.policyContext || {},
    continueOnFailure: node.continueOnFailure === true,
    dependencies: [...new Set((node.dependencies || []).map((value) => String(value).trim()))],
    recoverability: String(node.recoverability || (node.compensationDefinition ? 'compensatable' : 'retryable')),
    ...(node.failureStrategy ? { failureStrategy: String(node.failureStrategy) } : {}),
    ...(node.compensationDefinition
      ? { compensationDefinition: normalizeCompensationDefinition(node.compensationDefinition, defaultTimeout) }
      : {}),
    recoveryOverrides: {
      ...(node.recoveryOverrides?.maximumRecoveryAttempts != null
        ? { maximumRecoveryAttempts: Number(node.recoveryOverrides.maximumRecoveryAttempts) }
        : {}),
      ...(node.recoveryOverrides?.maximumCompensationAttempts != null
        ? { maximumCompensationAttempts: Number(node.recoveryOverrides.maximumCompensationAttempts) }
        : {}),
      ...(node.recoveryOverrides?.recoveryDeadlineMs != null
        ? { recoveryDeadlineMs: Number(node.recoveryOverrides.recoveryDeadlineMs) }
        : {}),
      ...(node.recoveryOverrides?.compensationDeadlineMs != null
        ? { compensationDeadlineMs: Number(node.recoveryOverrides.compensationDeadlineMs) }
        : {}),
    },
    interventionRequirement: {
      required: node.interventionRequirement?.required === true,
      mandatoryForSensitiveOperation:
        node.interventionRequirement?.mandatoryForSensitiveOperation === true,
      allowedActions: [...new Set((node.interventionRequirement?.allowedActions || []).map(String))].sort(),
      assignedRoleIds: [...new Set((node.interventionRequirement?.assignedRoleIds || []).map(String))].sort(),
      ...(node.interventionRequirement?.timeoutMs != null
        ? { timeoutMs: Number(node.interventionRequirement.timeoutMs) }
        : {}),
    },
    checkpointPolicy: {
      afterSuccess: node.checkpointPolicy?.afterSuccess !== false,
      afterFailure: node.checkpointPolicy?.afterFailure !== false,
      afterRecoveryDecision: node.checkpointPolicy?.afterRecoveryDecision !== false,
    },
  }));
  return {
    name: String(input.name ?? current.name ?? '').trim(),
    description: String(input.description ?? current.description ?? '').trim(),
    inputSchema: input.inputSchema || current.inputSchema || { type: 'object' },
    outputSchema: input.outputSchema || current.outputSchema || { type: 'object' },
    nodes,
    edges: (input.edges || current.edges || []).map((edge) => ({
      from: String(edge.from || '').trim(),
      to: String(edge.to || '').trim(),
      mappingMode: String(edge.mappingMode || (edge.dataContractId ? 'contract' : 'direct')),
      ...(edge.dataContractId ? { dataContractId: edge.dataContractId } : {}),
      ...(edge.dataContractVersion != null
        ? { dataContractVersion: Number(edge.dataContractVersion) }
        : {}),
      ...(edge.sourceNodeKey ? { sourceNodeKey: String(edge.sourceNodeKey).trim() } : {}),
      ...(edge.targetNodeKey ? { targetNodeKey: String(edge.targetNodeKey).trim() } : {}),
    })),
    concurrencyLimit: Number(
      input.concurrencyLimit || current.concurrencyLimit || DEFAULT_ORCHESTRATION_SETTINGS.concurrencyLimit,
    ),
    maxRunDurationMs: Number(
      input.maxRunDurationMs || current.maxRunDurationMs || DEFAULT_ORCHESTRATION_SETTINGS.maxRunDurationMs,
    ),
    maxNodeExecutions: Number(
      input.maxNodeExecutions || current.maxNodeExecutions || DEFAULT_ORCHESTRATION_SETTINGS.maxNodeExecutions,
    ),
    defaultNodeTimeoutMs: defaultTimeout,
    ...(input.recoveryPolicyId ?? current.recoveryPolicyId
      ? { recoveryPolicyId: input.recoveryPolicyId ?? current.recoveryPolicyId }
      : {}),
    ...(input.recoveryPolicyVersion ?? current.recoveryPolicyVersion
      ? { recoveryPolicyVersion: Number(input.recoveryPolicyVersion ?? current.recoveryPolicyVersion) }
      : {}),
    failureStrategy: String(input.failureStrategy ?? current.failureStrategy ?? 'fail'),
    compensationEnabled: (input.compensationEnabled ?? current.compensationEnabled) === true,
    compensateOnCancellation:
      (input.compensateOnCancellation ?? current.compensateOnCancellation) === true,
    maximumRecoveryAttempts: Number(
      input.maximumRecoveryAttempts ?? current.maximumRecoveryAttempts ?? 0,
    ),
    maximumCompensationAttempts: Number(
      input.maximumCompensationAttempts ?? current.maximumCompensationAttempts ?? 0,
    ),
    ...(input.recoveryDeadlineMs ?? current.recoveryDeadlineMs
      ? { recoveryDeadlineMs: Number(input.recoveryDeadlineMs ?? current.recoveryDeadlineMs) }
      : {}),
    ...(input.compensationDeadlineMs ?? current.compensationDeadlineMs
      ? { compensationDeadlineMs: Number(input.compensationDeadlineMs ?? current.compensationDeadlineMs) }
      : {}),
    ...(input.interventionTimeoutMs ?? current.interventionTimeoutMs
      ? { interventionTimeoutMs: Number(input.interventionTimeoutMs ?? current.interventionTimeoutMs) }
      : {}),
  };
}

function throwDefinitionValidation(result) {
  if (result.valid) return result;
  const stableCode = result.errors[0]?.code || ErrorCodes.ORCHESTRATION_DEFINITION_INVALID;
  throw new AppError(
    400,
    stableCode.startsWith('ORCHESTRATION_') ? stableCode : ErrorCodes.ORCHESTRATION_DEFINITION_INVALID,
    'Orchestration definition validation failed.',
    result.errors.slice(0, 100),
  );
}

async function validateReferences(definition, scope) {
  const result = validateDefinitionDocument(definition);
  if (!result.valid) return result;
  const pinnedNodes = definition.nodes.filter((node) => (node.targetingMode || 'pinned') === 'pinned');
  const governedNodes = definition.nodes.filter((node) => node.targetingMode === 'governed_selection');
  const compensationDefinitions = definition.nodes
    .map((node) => ({ node, compensation: node.compensationDefinition }))
    .filter((item) => item.compensation);
  const pinnedCompensations = compensationDefinitions.filter(
    (item) => (item.compensation.targetingMode || 'pinned') === 'pinned',
  );
  const governedCompensations = compensationDefinitions.filter(
    (item) => item.compensation.targetingMode === 'governed_selection',
  );
  const connectionIds = [...new Set([
    ...pinnedNodes.map((node) => idOf(node.connectionId)),
    ...pinnedCompensations.map((item) => idOf(item.compensation.connectionId)),
  ])];
  const connections = await PassportConnection.find({
    _id: { $in: connectionIds },
    receivingWorkspaceId: scope.workspaceId,
    $or: [{ organizationId: scope.organizationId }, { partnerId: scope.partnerId }],
  }).lean();
  const connectionsById = new Map(connections.map((item) => [idOf(item), item]));
  const passportIds = [...new Set([
    ...pinnedNodes.map((node) => idOf(node.passportId)),
    ...pinnedCompensations.map((item) => idOf(item.compensation.passportId)),
  ])];
  const policyIds = [...new Set([
    ...governedNodes.map((node) => idOf(node.selectionPolicyId)),
    ...governedCompensations.map((item) => idOf(item.compensation.selectionPolicyId)),
  ])];
  const referencedSelectionPassports = [...new Set([
    ...governedNodes.flatMap((node) => [
      ...(node.preferredPassportIds || []),
      ...(node.excludedPassportIds || []),
    ]),
    ...governedCompensations.flatMap((item) => [
      ...(item.compensation.preferredPassportIds || []),
      ...(item.compensation.excludedPassportIds || []),
    ]),
  ].map(idOf))];
  const contractEdges = (definition.edges || []).filter((edge) => edge.mappingMode === 'contract');
  const contractIds = [...new Set([
    ...contractEdges.map((edge) => idOf(edge.dataContractId)),
    ...compensationDefinitions.map((item) => idOf(item.compensation.dataContractId)).filter(Boolean),
  ])];
  const [passports, capabilities, selectionPolicies, accessibleSelectionPassports, dataContracts, recoveryPolicies] = await Promise.all([
    AgentPassport.find({ _id: { $in: passportIds } }).lean(),
    Capability.find({ passportId: { $in: passportIds } }).lean(),
    AgentSelectionPolicy.find({
      _id: { $in: policyIds },
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
    }).lean(),
    CapabilityCatalogEntry.distinct('passportId', {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      passportId: { $in: referencedSelectionPassports },
    }),
    InterAgentDataContract.find({
      _id: { $in: contractIds },
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
    })
      .select('+inputSchemaHash +outputSchemaHash')
      .lean(),
    definition.recoveryPolicyId
      ? OrchestrationRecoveryPolicy.find({
          _id: definition.recoveryPolicyId,
          organizationId: scope.organizationId,
          workspaceId: scope.workspaceId,
        })
          .select('+validationDigest')
          .lean()
      : [],
  ]);
  const passportsById = new Map(passports.map((item) => [idOf(item), item]));
  const capabilitiesByKey = new Map(
    capabilities.map((item) => [`${idOf(item.passportId)}:${item.name}`, item]),
  );
  const selectionPoliciesById = new Map(selectionPolicies.map((item) => [idOf(item), item]));
  const accessibleSelectionPassportIds = new Set(accessibleSelectionPassports.map(idOf));
  const contractsById = new Map(dataContracts.map((item) => [idOf(item), item]));
  const recoveryPoliciesById = new Map(recoveryPolicies.map((item) => [idOf(item), item]));
  const errors = [];
  for (const node of definition.nodes) {
    const path = `nodes.${node.nodeKey}`;
    if (node.targetingMode === 'governed_selection') {
      const policy = selectionPoliciesById.get(idOf(node.selectionPolicyId));
      if (!policy || policy.status !== 'active') {
        errors.push({
          path: `${path}.selectionPolicyId`,
          code: 'AGENT_SELECTION_POLICY_INACTIVE',
          message: 'An active selection policy is required in this tenant scope.',
        });
      } else if (policy.capabilityRequirements?.length && !policy.capabilityRequirements.includes(node.capability)) {
        errors.push({
          path: `${path}.capability`,
          code: ErrorCodes.ORCHESTRATION_CAPABILITY_DENIED,
          message: 'The selection policy does not permit this capability.',
        });
      }
      const requestedReferences = [...(node.preferredPassportIds || []), ...(node.excludedPassportIds || [])].map(idOf);
      if (requestedReferences.some((value) => !accessibleSelectionPassportIds.has(value))) {
        errors.push({
          path: `${path}.preferredPassportIds`,
          code: 'AGENT_SELECTION_REFERENCE_UNAVAILABLE',
          message: 'A selection passport reference is unavailable.',
        });
      }
      continue;
    }
    const connection = connectionsById.get(idOf(node.connectionId));
    if (!connection) {
      errors.push({
        path: `${path}.connectionId`,
        code: ErrorCodes.ORCHESTRATION_CONNECTION_SCOPE_DENIED,
        message: 'Connection is unavailable in this tenant scope.',
      });
      continue;
    }
    if (
      connection.status !== 'connected' ||
      connection.installScope !== 'invoke' ||
      idOf(connection.passportId) !== idOf(node.passportId)
    ) {
      errors.push({
        path: `${path}.connectionId`,
        code: ErrorCodes.ORCHESTRATION_CONNECTION_SCOPE_DENIED,
        message: 'Connection is not eligible for orchestration invocation.',
      });
    }
    const passport = passportsById.get(idOf(node.passportId));
    if (!passport || passport.status !== 'valid') {
      errors.push({
        path: `${path}.passportId`,
        code: ErrorCodes.PASSPORT_UNAVAILABLE,
        message: 'Agent Passport is not available for orchestration.',
      });
      continue;
    }
    node._passportVersion = passport.agent?.version;
    const capability = capabilitiesByKey.get(`${idOf(node.passportId)}:${node.capability}`);
    const declaredOperation = capability?.runtimeToolName || capability?.name;
    if (!capability || !capability.enabled || ![capability.name, declaredOperation].includes(node.operation)) {
      errors.push({
        path: `${path}.capability`,
        code: ErrorCodes.ORCHESTRATION_CAPABILITY_DENIED,
        message: 'Capability or operation is not declared and enabled by the passport.',
      });
      continue;
    }
    if (
      canonicalize(capability.inputSchema) !== canonicalize(node.inputSchema) ||
      canonicalize(capability.outputSchema) !== canonicalize(node.outputSchema)
    ) {
      errors.push({
        path: `${path}.inputSchema`,
        code: ErrorCodes.ORCHESTRATION_SCHEMA_INVALID,
        message: 'Node schemas must match the selected passport capability schemas.',
      });
    }
  }
  for (const { node, compensation } of compensationDefinitions) {
    const path = `nodes.${node.nodeKey}.compensationDefinition`;
    if ((compensation.targetingMode || 'pinned') === 'governed_selection') {
      const policy = selectionPoliciesById.get(idOf(compensation.selectionPolicyId));
      if (!policy || policy.status !== 'active') {
        errors.push({
          path: `${path}.selectionPolicyId`,
          code: 'AGENT_SELECTION_POLICY_INACTIVE',
          message: 'Compensation requires an active governed selection policy.',
        });
      } else if (
        policy.capabilityRequirements?.length &&
        !policy.capabilityRequirements.includes(compensation.capability)
      ) {
        errors.push({
          path: `${path}.capability`,
          code: ErrorCodes.ORCHESTRATION_CAPABILITY_DENIED,
          message: 'The selection policy does not permit the compensation capability.',
        });
      }
    } else {
      const connection = connectionsById.get(idOf(compensation.connectionId));
      const passport = passportsById.get(idOf(compensation.passportId));
      const capability = capabilitiesByKey.get(
        `${idOf(compensation.passportId)}:${compensation.capability}`,
      );
      const declaredOperation = capability?.runtimeToolName || capability?.name;
      if (
        !connection ||
        connection.status !== 'connected' ||
        connection.installScope !== 'invoke' ||
        idOf(connection.passportId) !== idOf(compensation.passportId)
      ) {
        errors.push({
          path: `${path}.connectionId`,
          code: ErrorCodes.ORCHESTRATION_CONNECTION_SCOPE_DENIED,
          message: 'Compensation connection is unavailable in this tenant scope.',
        });
      }
      if (!passport || passport.status !== 'valid') {
        errors.push({
          path: `${path}.passportId`,
          code: ErrorCodes.PASSPORT_UNAVAILABLE,
          message: 'Compensation Agent Passport is unavailable.',
        });
      } else {
        compensation._passportVersion = passport.agent?.version;
      }
      if (
        !capability ||
        !capability.enabled ||
        ![capability.name, declaredOperation].includes(compensation.operation)
      ) {
        errors.push({
          path: `${path}.capability`,
          code: ErrorCodes.ORCHESTRATION_CAPABILITY_DENIED,
          message: 'Compensation capability or operation is not declared and enabled.',
        });
      } else if (
        canonicalize(capability.inputSchema) !== canonicalize(compensation.inputSchema) ||
        canonicalize(capability.outputSchema) !== canonicalize(compensation.outputSchema)
      ) {
        errors.push({
          path: `${path}.inputSchema`,
          code: ErrorCodes.ORCHESTRATION_SCHEMA_INVALID,
          message: 'Compensation schemas must match the target passport capability schemas.',
        });
      }
    }
    if (compensation.dataContractId) {
      const contract = contractsById.get(idOf(compensation.dataContractId));
      if (
        !contract ||
        contract.status !== 'active' ||
        contract.version !== Number(compensation.dataContractVersion)
      ) {
        errors.push({
          path: `${path}.dataContractId`,
          code: 'DATA_CONTRACT_INACTIVE',
          message: 'Compensation requires the declared active data-contract version.',
        });
      } else if (
        contract.targetCapability !== compensation.capability ||
        contract.targetOperation !== compensation.operation
      ) {
        errors.push({
          path: `${path}.dataContractId`,
          code: 'INTER_AGENT_CAPABILITY_MISMATCH',
          message: 'Compensation target does not match its data contract.',
        });
      }
    }
  }
  if (definition.recoveryPolicyId) {
    const policy = recoveryPoliciesById.get(idOf(definition.recoveryPolicyId));
    if (
      !policy ||
      policy.status !== 'active' ||
      policy.version !== Number(definition.recoveryPolicyVersion)
    ) {
      errors.push({
        path: 'recoveryPolicyId',
        code: 'ORCHESTRATION_RECOVERY_POLICY_INACTIVE',
        message: 'An active tenant-scoped recovery-policy version is required.',
      });
    }
  }
  const nodesByKey = new Map(definition.nodes.map((node) => [node.nodeKey, node]));
  const now = new Date();
  for (const edge of contractEdges) {
    const contract = contractsById.get(idOf(edge.dataContractId));
    const sourceNode = nodesByKey.get(edge.from);
    const targetNode = nodesByKey.get(edge.to);
    if (
      !contract ||
      contract.version !== Number(edge.dataContractVersion) ||
      contract.status !== 'active' ||
      new Date(contract.validFrom) > now ||
      new Date(contract.expiresAt) <= now
    ) {
      errors.push({
        path: `edges.${edge.from}.${edge.to}.dataContractId`,
        code: 'DATA_CONTRACT_INACTIVE',
        message: 'An active immutable tenant-scoped data contract version is required.',
      });
      continue;
    }
    if (
      !sourceNode ||
      !targetNode ||
      sourceNode.capability !== contract.sourceCapability ||
      sourceNode.operation !== contract.sourceOperation ||
      targetNode.capability !== contract.targetCapability ||
      targetNode.operation !== contract.targetOperation
    ) {
      errors.push({
        path: `edges.${edge.from}.${edge.to}`,
        code: 'INTER_AGENT_CAPABILITY_MISMATCH',
        message: 'Contract capabilities and operations must match both orchestration nodes.',
      });
      continue;
    }
    edge._inputSchemaHash = contract.inputSchemaHash;
    edge._outputSchemaHash = contract.outputSchemaHash;
  }
  return {
    ...result,
    valid: errors.length === 0,
    errors,
    references: {
      connectionsById,
      passportsById,
      capabilitiesByKey,
      selectionPoliciesById,
      contractsById,
      recoveryPoliciesById,
    },
  };
}

function serializeCompensationDefinition(input) {
  if (!input) return null;
  return {
    targetingMode: input.targetingMode || 'pinned',
    ...(input.connectionId ? { connectionId: idOf(input.connectionId) } : {}),
    ...(input.passportId ? { passportId: idOf(input.passportId) } : {}),
    ...(input.selectionPolicyId ? { selectionPolicyId: idOf(input.selectionPolicyId) } : {}),
    selectionConstraints: input.selectionConstraints || {},
    preferredPassportIds: (input.preferredPassportIds || []).map(idOf),
    excludedPassportIds: (input.excludedPassportIds || []).map(idOf),
    capability: input.capability,
    operation: input.operation,
    inputSchema: input.inputSchema,
    outputSchema: input.outputSchema,
    inputMapping: input.inputMapping || {},
    timeoutMs: input.timeoutMs,
    retryPolicy: input.retryPolicy,
    ...(input.dataContractId ? { dataContractId: idOf(input.dataContractId) } : {}),
    ...(input.dataContractVersion != null
      ? { dataContractVersion: Number(input.dataContractVersion) }
      : {}),
    approvalRequirement: input.approvalRequirement || { required: false },
    expectedIdempotencyBehavior:
      input.expectedIdempotencyBehavior || 'ghost_bridge_keyed',
    successCriteria: input.successCriteria || {},
    continueAfterCompensationFailure: input.continueAfterCompensationFailure === true,
    parallelSafe: input.parallelSafe === true,
    dependencies: input.dependencies || [],
  };
}

function serializeDefinition(definitionInput) {
  const definition =
    typeof definitionInput?.toObject === 'function' ? definitionInput.toObject() : definitionInput;
  return {
    definitionId: idOf(definition),
    organizationId: definition.organizationId,
    workspaceId: definition.workspaceId,
    name: definition.name,
    description: definition.description || '',
    version: definition.version,
    status: definition.status,
    inputSchema: definition.inputSchema,
    outputSchema: definition.outputSchema,
    nodes: (definition.nodes || []).map((node) => ({
      nodeKey: node.nodeKey,
      displayName: node.displayName,
      targetingMode: node.targetingMode || 'pinned',
      ...(node.connectionId ? { connectionId: idOf(node.connectionId) } : {}),
      ...(node.passportId ? { passportId: idOf(node.passportId) } : {}),
      ...(node.selectionPolicyId ? { selectionPolicyId: idOf(node.selectionPolicyId) } : {}),
      selectionConstraints: node.selectionConstraints || {},
      preferredPassportIds: (node.preferredPassportIds || []).map(idOf),
      excludedPassportIds: (node.excludedPassportIds || []).map(idOf),
      fallbackCandidateCount: Number(node.fallbackCandidateCount ?? 0),
      selectionTiming: node.selectionTiming || 'run_creation',
      capability: node.capability,
      operation: node.operation,
      inputSchema: node.inputSchema,
      outputSchema: node.outputSchema,
      inputMapping: node.inputMapping,
      timeoutMs: node.timeoutMs,
      retryPolicy: node.retryPolicy,
      approvalRequirement: node.approvalRequirement,
      policyContext: node.policyContext,
      continueOnFailure: node.continueOnFailure === true,
      dependencies: node.dependencies || [],
      recoverability: node.recoverability || 'retryable',
      failureStrategy: node.failureStrategy || null,
      compensationDefinition: serializeCompensationDefinition(node.compensationDefinition),
      recoveryOverrides: node.recoveryOverrides || {},
      interventionRequirement: node.interventionRequirement || {},
      checkpointPolicy: node.checkpointPolicy || {},
    })),
    edges: (definition.edges || []).map((edge) => ({
      from: edge.from,
      to: edge.to,
      mappingMode: edge.mappingMode || 'direct',
      ...(edge.dataContractId ? { dataContractId: idOf(edge.dataContractId) } : {}),
      ...(edge.dataContractVersion != null
        ? { dataContractVersion: Number(edge.dataContractVersion) }
        : {}),
      sourceNodeKey: edge.sourceNodeKey || edge.from,
      targetNodeKey: edge.targetNodeKey || edge.to,
    })),
    nodeCount: definition.nodes?.length || 0,
    concurrencyLimit: definition.concurrencyLimit,
    maxRunDurationMs: definition.maxRunDurationMs,
    maxNodeExecutions: definition.maxNodeExecutions,
    defaultNodeTimeoutMs: definition.defaultNodeTimeoutMs,
    recoveryPolicyId: idOf(definition.recoveryPolicyId) || null,
    recoveryPolicyVersion: definition.recoveryPolicyVersion || null,
    failureStrategy: definition.failureStrategy || 'fail',
    compensationEnabled: definition.compensationEnabled === true,
    compensateOnCancellation: definition.compensateOnCancellation === true,
    maximumRecoveryAttempts: Number(definition.maximumRecoveryAttempts || 0),
    maximumCompensationAttempts: Number(definition.maximumCompensationAttempts || 0),
    recoveryDeadlineMs: definition.recoveryDeadlineMs || null,
    compensationDeadlineMs: definition.compensationDeadlineMs || null,
    interventionTimeoutMs: definition.interventionTimeoutMs || null,
    createdBy: definition.createdBy,
    updatedBy: definition.updatedBy,
    activatedBy: definition.activatedBy,
    activatedAt: definition.activatedAt,
    validatedAt: definition.validatedAt,
    createdAt: definition.createdAt,
    updatedAt: definition.updatedAt,
  };
}

function serializeRun(runInput, progress) {
  const run = typeof runInput?.toObject === 'function' ? runInput.toObject() : runInput;
  const startedAt = run.startedAt ? new Date(run.startedAt) : null;
  const endAt = run.completedAt ? new Date(run.completedAt) : new Date();
  return {
    runId: idOf(run),
    organizationId: run.organizationId,
    workspaceId: run.workspaceId,
    definitionId: idOf(run.definitionId),
    definitionName: run.definitionName,
    definitionVersion: run.definitionVersion,
    status: run.status,
    safeInputSummary: run.input !== undefined ? redactedSummary(run.input) : run.safeInputSummary,
    finalOutputSummary:
      run.finalOutput !== undefined ? redactedSummary(run.finalOutput) : run.finalOutputSummary,
    failureSummary: run.failureSummary || null,
    requestedBy: run.requestedBy,
    traceId: run.traceId,
    requestId: run.requestId,
    concurrencyLimit: run.concurrencyLimit,
    maxRunDurationMs: run.maxRunDurationMs,
    nodeExecutionCount: run.nodeExecutionCount,
    activeNodeCount: run.activeNodeCount,
    progress: progress || run.progress,
    startedAt: run.startedAt || null,
    completedAt: run.completedAt || null,
    cancelRequestedAt: run.cancelRequestedAt || null,
    cancelledAt: run.cancelledAt || null,
    recoveryPolicyId: idOf(run.recoveryPolicyId) || null,
    recoveryPolicyVersion: run.recoveryPolicyVersion || null,
    recoveryPolicySnapshotHash: run.recoveryPolicySnapshotHash || null,
    recoveryAttempt: Number(run.recoveryAttempt || 0),
    maximumRecoveryAttempts: Number(run.maximumRecoveryAttempts || 0),
    maximumCompensationAttempts: Number(run.maximumCompensationAttempts || 0),
    recoveryDeadlineAt: run.recoveryDeadlineAt || null,
    compensationDeadlineAt: run.compensationDeadlineAt || null,
    interventionDeadlineAt: run.interventionDeadlineAt || null,
    currentRecoveryDecisionId: idOf(run.currentRecoveryDecisionId) || null,
    compensationPlanId: idOf(run.compensationPlanId) || null,
    interventionRequestId: idOf(run.interventionRequestId) || null,
    checkpointSequence: Number(run.checkpointSequence || 0),
    unresolvedSideEffects: (run.unresolvedSideEffects || []).map((item) => ({
      nodeRunId: idOf(item.nodeRunId) || null,
      nodeKey: item.nodeKey,
      recoverability: item.recoverability,
      status: item.status,
      safeReasonCode: item.safeReasonCode,
      classification: item.classification,
      acceptedRisk: item.acceptedRisk === true,
    })),
    recoveredAt: run.recoveredAt || null,
    terminationRequestedAt: run.terminationRequestedAt || null,
    terminatedAt: run.terminatedAt || null,
    terminationReasonCode: run.terminationReasonCode || null,
    recoveryIncidentId: run.recoveryIncidentId || null,
    durationMs: startedAt ? Math.max(0, endAt.getTime() - startedAt.getTime()) : null,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

function serializeNodeRun(nodeInput) {
  const node = typeof nodeInput?.toObject === 'function' ? nodeInput.toObject() : nodeInput;
  return {
    nodeRunId: idOf(node),
    orchestrationRunId: idOf(node.orchestrationRunId),
    nodeKey: node.nodeKey,
    targetingMode: node.targetingMode || 'pinned',
    connectionId: idOf(node.connectionId),
    passportId: idOf(node.passportId),
    passportVersion: node.passportVersion,
    capability: node.capability,
    operation: node.operation,
    status: node.status,
    dependencyNodeKeys: node.dependencyNodeKeys || [],
    attempt: node.attempt,
    maxAttempts: node.maxAttempts,
    nextAttemptAt: node.nextAttemptAt || null,
    timeoutMs: node.timeoutMs,
    invocationId: idOf(node.invocationId) || null,
    requestId: node.requestId,
    traceId: node.traceId,
    parentTraceId: node.parentTraceId,
    approvalRequestId: node.approvalRequestId || null,
    selectionDecisionId: idOf(node.selectionDecisionId) || null,
    selectionApprovalRequestId: node.selectionApprovalRequestId || null,
    delegationGrantId: idOf(node.delegationGrantId) || null,
    dataContractId: idOf(node.dataContractId) || null,
    dataContractVersion: node.dataContractVersion || null,
    approvalStatus: node.status === 'waiting_approval' ? 'pending' : null,
    safeFailure: node.safeFailure || null,
    recoverability: node.recoverability || 'retryable',
    failureCategory: node.failureCategory || null,
    recoveryAttempt: Number(node.recoveryAttempt || 0),
    maximumRecoveryAttempts: Number(node.maximumRecoveryAttempts || 0),
    compensationStatus: node.compensationStatus || 'not_required',
    compensationAttempt: Number(node.compensationAttempt || 0),
    maximumCompensationAttempts: Number(node.maximumCompensationAttempts || 0),
    compensationRunId: idOf(node.compensationRunId) || null,
    recoveryDecisionId: idOf(node.recoveryDecisionId) || null,
    interventionRequestId: idOf(node.interventionRequestId) || null,
    checkpointId: idOf(node.checkpointId) || null,
    correctedInputVersion: node.correctedInputVersion || null,
    correctedInputSchemaHash: node.correctedInputSchemaHash || null,
    replacementSelectionDecisionId: idOf(node.replacementSelectionDecisionId) || null,
    replacementAppliedAt: node.replacementAppliedAt || null,
    completedSideEffectAt: node.completedSideEffectAt || null,
    compensatedAt: node.compensatedAt || null,
    skippedAt: node.skippedAt || null,
    terminatedAt: node.terminatedAt || null,
    compensationWaivedAt: node.compensationWaivedAt || null,
    compensationWaiverReasonCode: node.compensationWaiverReasonCode || null,
    startedAt: node.startedAt || null,
    completedAt: node.completedAt || null,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

async function createDefinition(input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.definition.create', 'OrchestrationDefinition', null, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'MUTATION' });
  const normalized = normalizeDefinitionInput(input);
  throwDefinitionValidation(validateDefinitionDocument(normalized));
  let definition;
  try {
    definition = await OrchestrationDefinition.create({
      ...normalized,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      version: 1,
      status: 'draft',
      createdBy: scope.actorId,
      updatedBy: scope.actorId,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, ErrorCodes.CONFLICT, 'An orchestration version already uses this name.');
    }
    throw error;
  }
  metrics.increment('orchestration_definitions_created', { status: 'draft' });
  await audit('orchestration.definition.created', 'OrchestrationDefinition', definition, scope, {
    definitionId: idOf(definition),
    version: definition.version,
    status: definition.status,
    nodeCount: definition.nodes.length,
  });
  return serializeDefinition(definition);
}

async function listDefinitions(input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.definition.read', 'OrchestrationDefinition', null, scope, caller);
  const paging = pagination(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (input.status) {
    const status = String(input.status).toLowerCase();
    if (!ORCHESTRATION_DEFINITION_STATUSES.includes(status))
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Definition status filter is invalid.');
    filter.status = status;
  }
  const search = safeSearch(input.search || input.q);
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }];
  const [items, total] = await Promise.all([
    OrchestrationDefinition.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip(paging.skip)
      .limit(paging.limit)
      .lean(),
    OrchestrationDefinition.countDocuments(filter),
  ]);
  return {
    items: items.map(serializeDefinition),
    pagination: { page: paging.page, limit: paging.limit, total },
  };
}

async function scopedDefinition(definitionId, scope, options = {}) {
  if (!mongoose.isValidObjectId(definitionId)) {
    throw new AppError(404, ErrorCodes.ORCHESTRATION_DEFINITION_NOT_FOUND, 'Orchestration definition was not found.');
  }
  const query = OrchestrationDefinition.findOne({
    _id: definitionId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
  });
  if (options.lean) query.lean();
  const definition = await query;
  if (!definition) {
    throw new AppError(404, ErrorCodes.ORCHESTRATION_DEFINITION_NOT_FOUND, 'Orchestration definition was not found.');
  }
  return definition;
}

async function getDefinition(definitionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.definition.read', 'OrchestrationDefinition', definitionId, scope, caller);
  return serializeDefinition(await scopedDefinition(definitionId, scope, { lean: true }));
}

async function updateDefinition(definitionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.definition.update', 'OrchestrationDefinition', definitionId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'MUTATION' });
  const current = await scopedDefinition(definitionId, scope);
  if (current.status === 'archived') {
    throw new AppError(409, ErrorCodes.ORCHESTRATION_DEFINITION_IMMUTABLE, 'Archived definitions are immutable.');
  }
  const normalized = normalizeDefinitionInput(input, current.toObject());
  throwDefinitionValidation(validateDefinitionDocument(normalized));
  let updated;
  if (current.status === 'active') {
    const latest = await OrchestrationDefinition.findOne({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      name: current.name,
    })
      .sort({ version: -1 })
      .select('version')
      .lean();
    updated = await OrchestrationDefinition.create({
      ...normalized,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      version: Number(latest?.version || current.version) + 1,
      status: 'draft',
      createdBy: scope.actorId,
      updatedBy: scope.actorId,
    });
  } else {
    Object.assign(current, normalized, { updatedBy: scope.actorId });
    updated = await current.save();
  }
  await audit('orchestration.definition.updated', 'OrchestrationDefinition', updated, scope, {
    definitionId: idOf(updated),
    version: updated.version,
    status: updated.status,
    nodeCount: updated.nodes.length,
  });
  return serializeDefinition(updated);
}

async function validateDefinition(definitionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.definition.validate', 'OrchestrationDefinition', definitionId, scope, caller);
  const definition = await scopedDefinition(definitionId, scope);
  const result = await validateReferences(definition.toObject(), scope);
  if (result.valid) {
    definition.validatedAt = new Date();
    definition.validationDigest = definitionDigest(definition.toObject());
    definition.updatedBy = scope.actorId;
    await definition.save();
  }
  await audit('orchestration.definition.validated', 'OrchestrationDefinition', definition, scope, {
    definitionId: idOf(definition),
    version: definition.version,
    status: result.valid ? 'valid' : 'invalid',
    reasonCode: result.errors[0]?.code,
  });
  return {
    valid: result.valid,
    errors: result.errors,
    roots: result.roots,
    topologicalOrder: result.topologicalOrder,
    validationDigest: result.valid ? definition.validationDigest : null,
  };
}

async function activateDefinition(definitionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await assertRegionalWriteAuthority({ ...scope, scope: 'workspace', regionId: input.regionId, authorityEpoch: input.authorityEpoch, authorityLeaseEpoch: input.authorityLeaseEpoch });
  await authorize('orchestration.definition.activate', 'OrchestrationDefinition', definitionId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'MUTATION' });
  const definition = await scopedDefinition(definitionId, scope);
  if (definition.status === 'active') return serializeDefinition(definition);
  if (definition.status !== 'draft') {
    throw new AppError(409, ErrorCodes.ORCHESTRATION_DEFINITION_IMMUTABLE, 'Only draft definitions may be activated.');
  }
  const plain = definition.toObject();
  const validation = await validateReferences(plain, scope);
  throwDefinitionValidation(validation);
  for (const node of plain.nodes) {
    if (node.targetingMode === 'governed_selection') {
      const selectionPolicy = validation.references.selectionPoliciesById.get(idOf(node.selectionPolicyId));
      await authorize(
        'orchestration.definition.activate',
        'OrchestrationSelectionNodeDefinition',
        `${definitionId}:${node.nodeKey}`,
        scope,
        caller,
        { selectionPolicyId: idOf(selectionPolicy), capability: node.capability, operation: node.operation },
      );
      continue;
    }
    const connection = validation.references.connectionsById.get(idOf(node.connectionId));
    const passport = validation.references.passportsById.get(idOf(node.passportId));
    const capability = validation.references.capabilitiesByKey.get(`${idOf(node.passportId)}:${node.capability}`);
    await authorize(
      'orchestration.definition.activate',
      'OrchestrationNodeDefinition',
      `${definitionId}:${node.nodeKey}`,
      scope,
      caller,
      { trustedConnection: connection, trustedPassport: passport, trustedCapability: capability },
    );
  }
  definition.status = 'active';
  definition.activatedBy = scope.actorId;
  definition.activatedAt = new Date();
  definition.validatedAt = new Date();
  definition.validationDigest = definitionDigest(plain);
  definition.updatedBy = scope.actorId;
  const activated = await definition.save();
  metrics.increment('orchestration_definitions_activated', { status: 'active' });
  await audit('orchestration.definition.activated', 'OrchestrationDefinition', activated, scope, {
    definitionId: idOf(activated),
    version: activated.version,
    status: activated.status,
    nodeCount: activated.nodes.length,
  });
  return serializeDefinition(activated);
}

async function archiveDefinition(definitionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.definition.archive', 'OrchestrationDefinition', definitionId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'MUTATION' });
  const definition = await scopedDefinition(definitionId, scope);
  if (definition.status === 'archived') return serializeDefinition(definition);
  definition.status = 'archived';
  definition.archivedAt = new Date();
  definition.updatedBy = scope.actorId;
  const archived = await definition.save();
  await audit('orchestration.definition.archived', 'OrchestrationDefinition', archived, scope, {
    definitionId: idOf(archived),
    version: archived.version,
    status: archived.status,
  });
  return serializeDefinition(archived);
}

async function startRun(definitionId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.run.create', 'OrchestrationDefinition', definitionId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'QUEUE_SUBMISSION' });
  await assertWorkspaceNotPaused(scope);
  await assertDefinitionNotPaused(definitionId, scope);
  const definition = await scopedDefinition(definitionId, scope);
  if (definition.status !== 'active') {
    throw new AppError(409, ErrorCodes.ORCHESTRATION_DEFINITION_IMMUTABLE, 'Only active definitions may start runs.');
  }
  const runInput = validateAgainstSchema(definition.inputSchema, input.input || {}, {
    path: '$run.input',
    code: 'ORCHESTRATION_RUN_INPUT_INVALID',
    message: 'Run input does not match the definition schema.',
  });
  const plain = definition.toObject();
  const validation = await validateReferences(plain, scope);
  throwDefinitionValidation(validation);
  const normalizedKey = normalizeClientKey(input.idempotencyKey);
  const idempotencyKeyHash = secureDigest('orchestration-run-key', normalizedKey.value);
  const requestFingerprint = secureDigest(
    'orchestration-run-request',
    canonicalize({
      definitionId: idOf(definition),
      version: definition.version,
      input: runInput,
      pilotProgramId: input.pilotProgramId,
      pilotUserId: input.pilotUserId || input.receivingUserId,
    }),
  );
  const existing = await OrchestrationRun.findOne({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    idempotencyKeyHash,
  }).select('+input +finalOutput +idempotencyKeyHash +requestFingerprint');
  if (existing) {
    if (!hashesEqual(existing.requestFingerprint, requestFingerprint)) {
      throw new AppError(409, ErrorCodes.IDEMPOTENCY_CONFLICT, 'Idempotency key is bound to another orchestration run.');
    }
    return { ...serializeRun(existing), idempotencyReplayed: true };
  }
  const regionalAuthority = await assertRegionalWriteAuthority({
    ...scope,
    scope: 'workspace',
    regionId: input.regionId,
    authorityEpoch: input.authorityEpoch,
    authorityLeaseEpoch: input.authorityLeaseEpoch,
  });
  const selectionResults = [];
  for (const node of plain.nodes.filter((item) => item.targetingMode === 'governed_selection')) {
    const childRequestId = `req_${secureDigest('orchestration-selection-request', `${scope.requestId || normalizedKey.value}:${node.nodeKey}`).slice(-48)}`;
    const childTraceId = `trace_${secureDigest('orchestration-selection-trace', `${scope.traceId || normalizedKey.value}:${node.nodeKey}`).slice(-48)}`;
    const decision = await evaluateSelection(
      {
        workspaceId: scope.workspaceId,
        capability: node.capability,
        operation: node.operation,
        inputSchema: node.inputSchema,
        requiredOutputSchema: node.outputSchema,
        constraints: node.selectionConstraints || {},
        preferredPassportIds: node.preferredPassportIds || [],
        excludedPassportIds: node.excludedPassportIds || [],
        selectionPolicyId: node.selectionPolicyId,
        fallbackCandidateCount: node.fallbackCandidateCount,
        orchestrationDefinitionId: definition._id,
        orchestrationNodeKey: node.nodeKey,
      },
      { ...caller, requestId: childRequestId, traceId: childTraceId },
    );
    if (!decision.selectedCandidate) {
      throw new AppError(409, 'AGENT_SELECTION_NO_CANDIDATE', 'No eligible installed agent is available for an orchestration node.', [
        { path: `nodes.${node.nodeKey}`, code: 'NO_ELIGIBLE_CANDIDATE', message: 'Governed selection produced no eligible candidate.' },
      ]);
    }
    node.connectionId = decision.selectedCandidate.connectionId;
    node.passportId = decision.selectedCandidate.passportId;
    node._passportVersion = decision.selectedCandidate.passportVersion;
    node.selectionDecisionId = decision.decisionId;
    node.selectionPolicyVersion = decision.selectionPolicyVersion;
    node.selectionApprovalRequestId = decision.approvalRequestId || undefined;
    node.fallbackCandidates = decision.fallbackCandidates || [];
    selectionResults.push({ node, decision });
  }
  const compensationSelectionResults = [];
  for (const node of plain.nodes.filter(
    (item) => item.compensationDefinition?.targetingMode === 'governed_selection',
  )) {
    const compensation = node.compensationDefinition;
    const childRequestId = `req_${secureDigest(
      'orchestration-compensation-selection-request',
      `${scope.requestId || normalizedKey.value}:${node.nodeKey}`,
    ).slice(-48)}`;
    const childTraceId = `trace_${secureDigest(
      'orchestration-compensation-selection-trace',
      `${scope.traceId || normalizedKey.value}:${node.nodeKey}`,
    ).slice(-48)}`;
    const decision = await evaluateSelection(
      {
        workspaceId: scope.workspaceId,
        capability: compensation.capability,
        operation: compensation.operation,
        inputSchema: compensation.inputSchema,
        requiredOutputSchema: compensation.outputSchema,
        constraints: compensation.selectionConstraints || {},
        preferredPassportIds: compensation.preferredPassportIds || [],
        excludedPassportIds: compensation.excludedPassportIds || [],
        selectionPolicyId: compensation.selectionPolicyId,
        fallbackCandidateCount: 0,
        orchestrationDefinitionId: definition._id,
        orchestrationNodeKey: `${node.nodeKey}:compensation`,
      },
      { ...caller, requestId: childRequestId, traceId: childTraceId },
    );
    if (!decision.selectedCandidate) {
      throw new AppError(
        409,
        'AGENT_SELECTION_NO_CANDIDATE',
        'No eligible installed agent is available for an orchestration compensation target.',
        [
          {
            path: `nodes.${node.nodeKey}.compensationDefinition`,
            code: 'NO_ELIGIBLE_COMPENSATION_CANDIDATE',
            message: 'Governed selection produced no eligible compensation candidate.',
          },
        ],
      );
    }
    compensation.connectionId = decision.selectedCandidate.connectionId;
    compensation.passportId = decision.selectedCandidate.passportId;
    compensation._passportVersion = decision.selectedCandidate.passportVersion;
    compensation.selectionDecisionId = decision.decisionId;
    compensation.selectionPolicyVersion = decision.selectionPolicyVersion;
    compensationSelectionResults.push({ node, compensation, decision });
  }
  const recoveryPolicy = plain.recoveryPolicyId
    ? validation.references.recoveryPoliciesById.get(idOf(plain.recoveryPolicyId))
    : null;
  const recoveryPolicySnapshot = safeRecoveryPolicySnapshot(recoveryPolicy);
  const recoveryPolicySnapshotHash = recoveryPolicySnapshot
    ? secureDigest('orchestration-recovery-policy-snapshot', canonicalize(recoveryPolicySnapshot))
    : undefined;
  const snapshot = safeDefinitionSnapshot(plain);
  const runId = new mongoose.Types.ObjectId();
  const admission = await assertAdmissionAccepted(
    {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      workloadCategory: 'orchestration_node',
      priorityClass: 'standard',
      admissionClass: 'standard',
      orchestrationDefinitionId: definition._id,
      orchestrationRunId: runId,
      idempotencyKey: idempotencyKeyHash,
      payloadBytesEstimate: Buffer.byteLength(canonicalize(runInput), 'utf8'),
      reservationExpiresAt: new Date(Date.now() + snapshot.maxRunDurationMs),
      regionId: regionalAuthority.context?.regionId,
      authorityEpoch: regionalAuthority.context?.authorityEpoch,
      authorityLeaseEpoch: regionalAuthority.context?.authorityLeaseEpoch,
      pilotProgramId: input.pilotProgramId,
      pilotUserId: input.pilotUserId || input.receivingUserId,
      receivingUserId: input.receivingUserId,
      capabilityKey: input.capabilityKey || 'orchestration.basic',
      dataClassification: input.dataClassification,
      residencyTag: input.residencyTag,
    },
    caller,
  );
  const routesByNodeKey = new Map();
  for (const node of snapshot.nodes) {
    const route = await resolveWorkloadRoute({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      routingKey: `${idOf(runId)}:${node.nodeKey}`,
      workloadCategory: 'orchestration_node',
      routingVersion: admission.routingVersion,
      homeRegionId: regionalAuthority.context?.regionId,
      executionRegionId: regionalAuthority.context?.regionId,
      authorityEpoch: regionalAuthority.context?.authorityEpoch,
    });
    routesByNodeKey.set(
      node.nodeKey,
      {
        workloadCategory: route.workloadCategory,
        routingVersion: route.routingVersion,
        partitionNumber: route.partitionNumber,
        partitionKey: route.partitionKey,
        workerPool: route.workerPool,
        executionRegionId: regionalAuthority.context?.regionId,
        authorityEpoch: regionalAuthority.context?.authorityEpoch,
        authorityLeaseEpoch: regionalAuthority.context?.authorityLeaseEpoch,
      },
    );
  }
  let run;
  const now = new Date();
  try {
    run = await OrchestrationRun.create({
      _id: runId,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      definitionId: definition._id,
      definitionName: definition.name,
      definitionVersion: definition.version,
      status: 'queued',
      input: runInput,
      requestedBy: scope.actorId,
      traceId: scope.traceId || `trace_${secureDigest('orchestration-trace', normalizedKey.value).slice(-48)}`,
      requestId: scope.requestId || `req_${secureDigest('orchestration-request', normalizedKey.value).slice(-48)}`,
      idempotencyKeyHash,
      requestFingerprint,
      clientIdempotencyProvided: normalizedKey.clientProvided,
      admissionDecisionId: admission.decisionId,
      quotaReservationId: admission.quotaReservationId,
      routingVersion: admission.routingVersion,
      homeRegionId: regionalAuthority.context?.regionId,
      executionRegionId: regionalAuthority.context?.regionId,
      authorityEpoch: regionalAuthority.context?.authorityEpoch,
      concurrencyLimit: snapshot.concurrencyLimit,
      maxRunDurationMs: snapshot.maxRunDurationMs,
      maxNodeExecutions: snapshot.maxNodeExecutions,
      definitionSnapshot: snapshot,
      ...(recoveryPolicySnapshot
        ? {
            recoveryPolicyId: recoveryPolicy._id,
            recoveryPolicyVersion: recoveryPolicy.version,
            recoveryPolicySnapshot,
            recoveryPolicySnapshotHash,
          }
        : {}),
      maximumRecoveryAttempts: Number(
        snapshot.maximumRecoveryAttempts || recoveryPolicySnapshot?.maximumRecoveryAttempts || 0,
      ),
      maximumCompensationAttempts: Number(
        snapshot.maximumCompensationAttempts ||
          recoveryPolicySnapshot?.maximumCompensationAttempts ||
          0,
      ),
      ...(snapshot.recoveryDeadlineMs || recoveryPolicySnapshot?.recoveryDeadlineMs
        ? {
            recoveryDeadlineAt: new Date(
              now.getTime() +
                Number(snapshot.recoveryDeadlineMs || recoveryPolicySnapshot.recoveryDeadlineMs),
            ),
          }
        : {}),
      ...(snapshot.compensationDeadlineMs || recoveryPolicySnapshot?.compensationDeadlineMs
        ? {
            compensationDeadlineAt: new Date(
              now.getTime() +
                Number(
                  snapshot.compensationDeadlineMs ||
                    recoveryPolicySnapshot.compensationDeadlineMs,
                ),
            ),
          }
        : {}),
      ...(snapshot.interventionTimeoutMs
        ? { interventionDeadlineAt: new Date(now.getTime() + snapshot.interventionTimeoutMs) }
        : {}),
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      if (admission.quotaReservationId) {
        await releaseQuotaReservation(admission.quotaReservationId, { scope }).catch(() => undefined);
      }
      throw error;
    }
    const replay = await OrchestrationRun.findOne({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      idempotencyKeyHash,
    }).select('+input +finalOutput +idempotencyKeyHash +requestFingerprint');
    if (!replay || !hashesEqual(replay.requestFingerprint, requestFingerprint)) {
      throw new AppError(409, ErrorCodes.IDEMPOTENCY_CONFLICT, 'Idempotency key is bound to another orchestration run.');
    }
    return { ...serializeRun(replay), idempotencyReplayed: true };
  }
  const nodeRuns = snapshot.nodes.map((node) => ({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    orchestrationRunId: run._id,
    nodeKey: node.nodeKey,
    targetingMode: node.targetingMode,
    connectionId: node.connectionId,
    passportId: node.passportId,
    passportVersion: node.passportVersion,
    capability: node.capability,
    operation: node.operation,
    status: node.selectionApprovalRequestId
      ? 'waiting_approval'
      : node.dependencies.length
        ? 'blocked'
        : admission.decision === 'accepted_deferred'
          ? 'retry_wait'
          : 'ready',
    ...(admission.decision === 'accepted_deferred' && !node.dependencies.length
      ? { nextAttemptAt: new Date(Date.now() + 30_000) }
      : {}),
    dependencyNodeKeys: node.dependencies,
    continueOnFailure: node.continueOnFailure,
    attempt: 0,
    maxAttempts: node.retryPolicy.maxAttempts,
    timeoutMs: node.timeoutMs,
    requestId: `req_${secureDigest('orchestration-node-request', `${idOf(run)}:${node.nodeKey}`).slice(-48)}`,
    traceId: `trace_${secureDigest('orchestration-node-trace', `${run.traceId}:${node.nodeKey}`).slice(-48)}`,
    parentTraceId: run.traceId,
    ...routesByNodeKey.get(node.nodeKey),
    admissionClass: admission.decision === 'accepted_deferred' ? 'deferred' : admission.admissionClass,
    priorityClass: admission.priorityClass,
    selectionDecisionId: node.selectionDecisionId,
    selectionApprovalRequestId: node.selectionApprovalRequestId,
    recoverability: node.recoverability || 'retryable',
    maximumRecoveryAttempts: Number(
      node.recoveryOverrides?.maximumRecoveryAttempts ??
        snapshot.maximumRecoveryAttempts ??
        recoveryPolicySnapshot?.maximumRecoveryAttempts ??
        0,
    ),
    maximumCompensationAttempts: Number(
      node.recoveryOverrides?.maximumCompensationAttempts ??
        snapshot.maximumCompensationAttempts ??
        recoveryPolicySnapshot?.maximumCompensationAttempts ??
        0,
    ),
    compensationStatus:
      node.recoverability === 'compensatable' && node.compensationDefinition
        ? 'pending'
        : node.recoverability === 'non_reversible'
          ? 'non_reversible'
          : 'not_required',
  }));
  let insertedNodes;
  try {
    insertedNodes = await OrchestrationNodeRun.insertMany(nodeRuns, { ordered: true });
  } catch (error) {
    await OrchestrationRun.updateOne(
      { _id: run._id, status: 'queued' },
      {
        $set: {
          status: 'failed',
          completedAt: new Date(),
          failureSummary: {
            code: ErrorCodes.INTERNAL_SERVER_ERROR,
            message: 'Node execution records could not be initialized.',
            category: 'persistence',
            requestId: run.requestId,
            traceId: run.traceId,
            occurredAt: new Date(),
          },
        },
      },
    );
    if (admission.quotaReservationId) {
      await releaseQuotaReservation(admission.quotaReservationId, { scope }).catch(() => undefined);
    }
    throw error;
  }
  for (const { node, decision } of selectionResults) {
    const nodeRun = insertedNodes.find((item) => item.nodeKey === node.nodeKey);
    await Promise.all([
      AgentSelectionDecision.updateOne(
        { _id: decision.decisionId, organizationId: scope.organizationId, workspaceId: scope.workspaceId },
        { $set: { orchestrationRunId: run._id } },
      ),
      decision.approvalRequestId
        ? ApprovalRequest.updateOne(
            { approvalRequestId: decision.approvalRequestId, organizationId: scope.organizationId },
            { $set: { orchestrationRunId: idOf(run), orchestrationNodeRunId: idOf(nodeRun), orchestrationNodeKey: node.nodeKey } },
          )
        : Promise.resolve(),
      audit('orchestration.node.agent_selected', 'OrchestrationNodeRun', nodeRun, scope, {
        orchestrationRunId: idOf(run),
        nodeKey: node.nodeKey,
        selectedPassportId: decision.selectedCandidate.passportId,
        selectedConnectionId: decision.selectedCandidate.connectionId,
        score: decision.selectedCandidate.score,
        policyVersion: decision.selectionPolicyVersion,
        status: decision.decisionStatus,
      }),
    ]);
  }
  for (const { node, decision } of compensationSelectionResults) {
    const nodeRun = insertedNodes.find((item) => item.nodeKey === node.nodeKey);
    await Promise.all([
      AgentSelectionDecision.updateOne(
        {
          _id: decision.decisionId,
          organizationId: scope.organizationId,
          workspaceId: scope.workspaceId,
        },
        { $set: { orchestrationRunId: run._id } },
      ),
      audit(
        'orchestration.compensation.agent_selected',
        'OrchestrationNodeRun',
        nodeRun,
        scope,
        {
          orchestrationRunId: idOf(run),
          nodeKey: node.nodeKey,
          selectedPassportId: decision.selectedCandidate.passportId,
          selectedConnectionId: decision.selectedCandidate.connectionId,
          policyVersion: decision.selectionPolicyVersion,
          status: decision.decisionStatus,
        },
      ),
    ]);
  }
  const insertedByKey = new Map(insertedNodes.map((item) => [item.nodeKey, item]));
  const snapshotNodesByKey = new Map(snapshot.nodes.map((item) => [item.nodeKey, item]));
  try {
    for (const edge of snapshot.edges.filter((item) => item.mappingMode === 'contract')) {
      const sourceNodeRun = insertedByKey.get(edge.from);
      const targetNodeRun = insertedByKey.get(edge.to);
      const sourceDefinition = snapshotNodesByKey.get(edge.from);
      const targetDefinition = snapshotNodesByKey.get(edge.to);
      const grant = await createGrantRecord(
        {
          workspaceId: scope.workspaceId,
          contractId: edge.dataContractId,
          contractVersion: edge.dataContractVersion,
          orchestrationDefinitionId: definition._id,
          orchestrationRunId: run._id,
          sourceNodeRunId: sourceNodeRun._id,
          targetNodeRunId: targetNodeRun._id,
          sourceSelectionPolicyId: sourceDefinition.selectionPolicyId,
          targetSelectionPolicyId: targetDefinition.selectionPolicyId,
          invocationLimit: 1,
          expiresAt: new Date(Math.min(
            Date.now() + snapshot.maxRunDurationMs,
            new Date(definition.expiresAt || Date.now() + snapshot.maxRunDurationMs).getTime(),
          )),
          traceId: targetNodeRun.traceId,
          requestId: targetNodeRun.requestId,
        },
        scope,
        caller,
      );
      const targetStatus = grant.status === 'pending' ? 'waiting_approval' : targetNodeRun.status;
      await OrchestrationNodeRun.updateOne(
        { _id: targetNodeRun._id, orchestrationRunId: run._id },
        {
          $set: {
            delegationGrantId: grant._id,
            dataContractId: edge.dataContractId,
            dataContractVersion: edge.dataContractVersion,
            ...(grant.approvalRequestId
              ? { approvalRequestId: grant.approvalRequestId, status: targetStatus }
              : {}),
          },
        },
      );
      targetNodeRun.delegationGrantId = grant._id;
      targetNodeRun.dataContractId = edge.dataContractId;
      targetNodeRun.dataContractVersion = edge.dataContractVersion;
      if (grant.approvalRequestId) {
        targetNodeRun.approvalRequestId = grant.approvalRequestId;
        targetNodeRun.status = targetStatus;
        const targetSeed = nodeRuns.find((item) => item.nodeKey === edge.to);
        if (targetSeed) targetSeed.status = targetStatus;
      }
      await audit('orchestration.edge.delegated', 'InterAgentDelegationGrant', grant, scope, {
        orchestrationRunId: idOf(run),
        sourceNodeKey: edge.from,
        targetNodeKey: edge.to,
        contractId: edge.dataContractId,
        contractVersion: edge.dataContractVersion,
        grantId: idOf(grant),
        status: grant.status,
      });
    }
  } catch (error) {
    await OrchestrationRun.updateOne(
      { _id: run._id, status: { $in: ['queued', 'waiting_approval'] } },
      {
        $set: {
          status: 'failed',
          completedAt: new Date(),
          failureSummary: {
            code: error.code || 'INTER_AGENT_GRANT_CREATION_FAILED',
            message: 'Contract delegation grants could not be initialized.',
            category: 'delegation',
            requestId: run.requestId,
            traceId: run.traceId,
            occurredAt: new Date(),
          },
        },
      },
    );
    await closeRunGrants(run._id, 'failed', scope);
    if (admission.quotaReservationId) {
      await releaseQuotaReservation(admission.quotaReservationId, { scope }).catch(() => undefined);
    }
    throw error;
  }
  if (nodeRuns.some((node) => node.status === 'waiting_approval')) {
    await OrchestrationRun.updateOne({ _id: run._id, status: 'queued' }, { $set: { status: 'waiting_approval' } });
    run.status = 'waiting_approval';
  }
  metrics.increment('orchestration_runs_started');
  metrics.increment('orchestration_nodes_ready', {}, nodeRuns.filter((node) => node.status === 'ready').length);
  await audit('orchestration.run.created', 'OrchestrationRun', run, scope, {
    orchestrationRunId: idOf(run),
    definitionId: idOf(definition),
    version: definition.version,
    status: run.status,
    nodeCount: nodeRuns.length,
  });
  for (const node of nodeRuns.filter((item) => item.status === 'ready')) {
    await audit('orchestration.node.ready', 'OrchestrationNodeRun', `${idOf(run)}:${node.nodeKey}`, scope, {
      orchestrationRunId: idOf(run),
      nodeKey: node.nodeKey,
      status: 'ready',
    });
  }
  try {
    const { createCheckpointForRun } = require('./orchestrationRecovery.service');
    await createCheckpointForRun(run._id, 'run-created', scope, {
      createdBy: scope.actorId,
      requestId: run.requestId,
      traceId: run.traceId,
    });
  } catch (error) {
    await audit('orchestration.checkpoint.invalidated', 'OrchestrationRun', run, scope, {
      orchestrationRunId: idOf(run),
      safeReasonCode: 'CHECKPOINT_CREATION_FAILED',
    });
  }
  return { ...serializeRun(run, { total: nodeRuns.length, ready: nodeRuns.filter((node) => node.status === 'ready').length }), idempotencyReplayed: false };
}

async function progressByRunIds(runIds, scope) {
  if (!runIds.length) return new Map();
  const rows = await OrchestrationNodeRun.aggregate([
    { $match: { organizationId: scope.organizationId, workspaceId: scope.workspaceId, orchestrationRunId: { $in: runIds.slice(0, 100) } } },
    { $group: { _id: { runId: '$orchestrationRunId', status: '$status' }, count: { $sum: 1 } } },
    { $limit: 1_000 },
  ]).option({ maxTimeMS: env.DATABASE_OPERATION_TIMEOUT_MS, allowDiskUse: false });
  const result = new Map();
  for (const row of rows) {
    const runId = idOf(row._id.runId);
    const current = result.get(runId) || { total: 0 };
    current[row._id.status] = row.count;
    current.total += row.count;
    result.set(runId, current);
  }
  return result;
}

async function listRuns(input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.run.read', 'OrchestrationRun', null, scope, caller);
  if (Number(input.page || 1) > 1 && !input.cursor) {
    throw new AppError(400, 'QUERY_CURSOR_INVALID', 'Large orchestration run lists require cursor pagination.');
  }
  const requestedFilter = {};
  if (input.status) {
    const statuses = String(input.status).split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (!statuses.length || statuses.some((status) => !ORCHESTRATION_RUN_STATUSES.includes(status)))
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Run status filter is invalid.');
    requestedFilter.status = { $in: statuses.slice(0, 10) };
  }
  if (input.definitionId) {
    if (!mongoose.isValidObjectId(input.definitionId)) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Run definition filter is invalid.');
    }
    requestedFilter.definitionId = input.definitionId;
  }
  const search = safeSearch(input.search || input.q);
  if (search) requestedFilter.definitionName = search;
  const governed = validateQueryRequest('orchestration_runs_list', { filter: requestedFilter, limit: input.limit, maximumTimeMS: env.DATABASE_OPERATION_TIMEOUT_MS });
  let filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId, ...governed.filter };
  if (input.cursor) {
    const claims = decodeCursor(input.cursor, { queryShapeId: governed.shape.queryShapeId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, sort: governed.sort, filter: governed.filter }, { secret: env.DATA_ACCESS_CURSOR_SECRET });
    filter = { $and: [filter, buildCursorFilter(claims)] };
  }
  const rows = await OrchestrationRun.find(filter)
    .select('_id organizationId workspaceId definitionId definitionName definitionVersion status failureSummary requestedBy startedAt completedAt cancelledAt cancelRequestedAt traceId requestId concurrencyLimit maxRunDurationMs nodeExecutionCount activeNodeCount recoveryPolicyId recoveryPolicyVersion recoveryPolicySnapshotHash recoveryAttempt maximumRecoveryAttempts maximumCompensationAttempts recoveryDeadlineAt compensationDeadlineAt interventionDeadlineAt currentRecoveryDecisionId compensationPlanId interventionRequestId checkpointSequence unresolvedSideEffects recoveredAt terminationRequestedAt terminatedAt terminationReasonCode recoveryIncidentId createdAt updatedAt')
    .sort(governed.sort)
    .limit(governed.limit + 1)
    .maxTimeMS(governed.maximumTimeMS)
    .comment(governed.shape.queryShapeId)
    .lean();
  const hasMore = rows.length > governed.limit;
  const items = rows.slice(0, governed.limit);
  const progress = await progressByRunIds(items.map((item) => item._id), scope);
  const nextCursor = hasMore && items.length ? createCursorFromRecord(governed.shape.queryShapeId, items.at(-1), { organizationId: scope.organizationId, workspaceId: scope.workspaceId, sort: governed.sort, filter: governed.filter }, { secret: env.DATA_ACCESS_CURSOR_SECRET }) : null;
  return {
    items: items.map((item) => serializeRun(item, progress.get(idOf(item)))),
    pagination: { page: 1, limit: governed.limit, total: null, hasMore, nextCursor },
  };
}

async function scopedRun(runId, scope, options = {}) {
  if (!mongoose.isValidObjectId(runId)) {
    throw new AppError(404, ErrorCodes.ORCHESTRATION_RUN_NOT_FOUND, 'Orchestration run was not found.');
  }
  const query = OrchestrationRun.findOne({
    _id: runId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
  });
  if (options.privateFields) query.select('+input +finalOutput +definitionSnapshot +recoveryPolicySnapshot +idempotencyKeyHash +requestFingerprint');
  if (options.lean) query.lean();
  const run = await query;
  if (!run) throw new AppError(404, ErrorCodes.ORCHESTRATION_RUN_NOT_FOUND, 'Orchestration run was not found.');
  return run;
}

async function getRun(runId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.run.read', 'OrchestrationRun', runId, scope, caller);
  const run = await scopedRun(runId, scope, { privateFields: true, lean: true });
  const progress = await progressByRunIds([run._id]);
  return serializeRun(run, progress.get(idOf(run)));
}

async function listRunNodes(runId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.run.read', 'OrchestrationRun', runId, scope, caller);
  await scopedRun(runId, scope, { lean: true });
  const paging = pagination(input);
  const filter = {
    orchestrationRunId: runId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
  };
  if (input.status) {
    const status = String(input.status).toLowerCase();
    if (!ORCHESTRATION_NODE_STATUSES.includes(status))
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Node status filter is invalid.');
    filter.status = status;
  }
  const [items, total] = await Promise.all([
    OrchestrationNodeRun.find(filter).sort({ nodeKey: 1, _id: 1 }).skip(paging.skip).limit(paging.limit).lean(),
    OrchestrationNodeRun.countDocuments(filter),
  ]);
  return { items: items.map(serializeNodeRun), pagination: { page: paging.page, limit: paging.limit, total } };
}

async function cancelRun(runId, input = {}, caller = {}) {
  const scope = callerScope(input, caller);
  await authorize('orchestration.run.cancel', 'OrchestrationRun', runId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'LIFECYCLE_CONTROL' });
  let run = await scopedRun(runId, scope);
  if (TERMINAL_RUN_STATUSES.includes(run.status)) {
    return { ...serializeRun(run), idempotent: true };
  }
  await assertRegionalWriteAuthority({ ...scope, scope: 'workspace', regionId: input.regionId, authorityEpoch: input.authorityEpoch, authorityLeaseEpoch: input.authorityLeaseEpoch });
  const now = new Date();
  if (run.status !== 'cancel_requested') {
    run = await OrchestrationRun.findOneAndUpdate(
      { _id: run._id, status: { $nin: [...TERMINAL_RUN_STATUSES, 'cancel_requested'] } },
      { $set: { status: 'cancel_requested', cancelRequestedAt: now } },
      { new: true, runValidators: true },
    );
    if (!run) run = await scopedRun(runId, scope);
    await audit('orchestration.run.cancel_requested', 'OrchestrationRun', runId, scope, {
      orchestrationRunId: runId,
      status: 'cancel_requested',
      reasonCode: 'USER_REQUESTED',
    });
    metrics.increment('orchestration_cancellations');
  }
  const cancellable = await OrchestrationNodeRun.find({
    orchestrationRunId: run._id,
    status: { $in: ['blocked', 'ready', 'queued', 'retry_wait', 'waiting_approval'] },
  }).select('_id nodeKey status');
  if (cancellable.length) {
    await OrchestrationNodeRun.updateMany(
      { _id: { $in: cancellable.map((node) => node._id) }, status: { $in: ['blocked', 'ready', 'queued', 'retry_wait', 'waiting_approval'] } },
      { $set: { status: 'cancelled', completedAt: now }, $unset: { nextAttemptAt: 1 } },
    );
    for (const node of cancellable) {
      await audit('orchestration.node.cancelled', 'OrchestrationNodeRun', node._id, scope, {
        orchestrationRunId: idOf(run),
        nodeKey: node.nodeKey,
        fromState: node.status,
        toState: 'cancelled',
        status: 'cancelled',
      });
    }
  }
  const running = await OrchestrationNodeRun.find({
    orchestrationRunId: run._id,
    status: 'running',
    invocationId: { $exists: true, $ne: null },
  }).select('invocationId connectionId');
  const connections = await PassportConnection.find({ _id: { $in: running.map((node) => node.connectionId) } })
    .select('_id receivingUserId')
    .lean();
  const connectionsById = new Map(connections.map((item) => [idOf(item), item]));
  await Promise.allSettled(
    running.map((node) => {
      const connection = connectionsById.get(idOf(node.connectionId));
      if (!connection) return undefined;
      return cancelInvocation(
        idOf(node.invocationId),
        {
          receivingWorkspaceId: scope.workspaceId,
          receivingUserId: connection.receivingUserId,
          reasonCode: 'USER_REQUESTED',
        },
        { partner: caller.partner, requestId: caller.requestId, traceId: caller.traceId },
      );
    }),
  );
  await closeRunGrants(run._id, 'cancelled', scope);
  if (run.quotaReservationId) {
    await releaseQuotaReservation(run.quotaReservationId, { scope }).catch(() => undefined);
  }
  const active = await OrchestrationNodeRun.countDocuments({ orchestrationRunId: run._id, status: 'running' });
  if (active === 0) {
    const privateState = await scopedRun(runId, scope, { privateFields: true });
    const compensateOnCancellation =
      privateState.definitionSnapshot?.compensateOnCancellation === true ||
      privateState.recoveryPolicySnapshot?.compensateOnCancellation === true;
    if (compensateOnCancellation) {
      const { beginCancellationCompensation } = require('./orchestrationRecovery.service');
      const recovery = await beginCancellationCompensation(privateState, scope, {
        caller,
        safeReasonCode: 'ORCHESTRATION_CANCELLED',
      });
      if (recovery?.run) {
        return { ...serializeRun(recovery.run), compensationPlanId: idOf(recovery.plan), idempotent: false };
      }
    }
    run = await OrchestrationRun.findOneAndUpdate(
      { _id: run._id, status: 'cancel_requested' },
      { $set: { status: 'cancelled', cancelledAt: now, completedAt: now, activeNodeCount: 0 } },
      { new: true, runValidators: true },
    );
    if (run) {
      await audit('orchestration.run.cancelled', 'OrchestrationRun', run, scope, {
        orchestrationRunId: idOf(run),
        fromState: 'cancel_requested',
        toState: 'cancelled',
        status: 'cancelled',
      });
    }
  }
  return { ...serializeRun(run || (await scopedRun(runId, scope))), idempotent: false };
}

async function ensureOrchestrationIndexes() {
  for (const Model of [OrchestrationDefinition, OrchestrationRun, OrchestrationNodeRun]) {
    await Model.createIndexes();
  }
  return { models: ['OrchestrationDefinition', 'OrchestrationRun', 'OrchestrationNodeRun'] };
}

module.exports = {
  activateDefinition,
  archiveDefinition,
  cancelRun,
  createDefinition,
  ensureOrchestrationIndexes,
  getDefinition,
  getRun,
  listDefinitions,
  listRunNodes,
  listRuns,
  normalizeDefinitionInput,
  serializeDefinition,
  serializeNodeRun,
  serializeRun,
  startRun,
  updateDefinition,
  validateDefinition,
  validateReferences,
};
