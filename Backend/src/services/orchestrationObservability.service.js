const crypto = require('node:crypto');
const mongoose = require('mongoose');
const ApprovalRequest = require('../models/ApprovalRequest');
const AuditLog = require('../models/AuditLog');
const AgentSelectionDecision = require('../models/AgentSelectionDecision');
const CapabilityCatalogEntry = require('../models/CapabilityCatalogEntry');
const InterAgentDelegationGrant = require('../models/InterAgentDelegationGrant');
const InterAgentDelegationInvocation = require('../models/InterAgentDelegationInvocation');
const Invocation = require('../models/Invocation');
const LegalHold = require('../models/LegalHold');
const MaintenanceWindow = require('../models/MaintenanceWindow');
const OperationalIncident = require('../models/OperationalIncident');
const PassportConnection = require('../models/PassportConnection');
const RuntimeWorkItem = require('../models/RuntimeWorkItem');
const RuntimeWorkerHeartbeat = require('../models/RuntimeWorkerHeartbeat');
const OrchestrationAlert = require('../models/OrchestrationAlert');
const OrchestrationAlertRule = require('../models/OrchestrationAlertRule');
const OrchestrationCheckpoint = require('../models/OrchestrationCheckpoint');
const OrchestrationCompensationPlan = require('../models/OrchestrationCompensationPlan');
const OrchestrationCompensationRun = require('../models/OrchestrationCompensationRun');
const OrchestrationDefinition = require('../models/OrchestrationDefinition');
const OrchestrationDiagnosticExport = require('../models/OrchestrationDiagnosticExport');
const OrchestrationFleetControl = require('../models/OrchestrationFleetControl');
const OrchestrationInterventionRequest = require('../models/OrchestrationInterventionRequest');
const OrchestrationNodeRun = require('../models/OrchestrationNodeRun');
const OrchestrationOperationalSnapshot = require('../models/OrchestrationOperationalSnapshot');
const OrchestrationRecoveryDecision = require('../models/OrchestrationRecoveryDecision');
const OrchestrationRun = require('../models/OrchestrationRun');
const OrchestrationRunHealthSummary = require('../models/OrchestrationRunHealthSummary');
const OrchestrationSloEvaluation = require('../models/OrchestrationSloEvaluation');
const OrchestrationSloPolicy = require('../models/OrchestrationSloPolicy');
const OrchestrationTimelineEvent = require('../models/OrchestrationTimelineEvent');
const OrchestrationTraceSpan = require('../models/OrchestrationTraceSpan');
const { actorFromPartner, assertAuthorized } = require('./authorization.service');
const { assertOperationalAccess } = require('./operationalState.service');
const { createAuditLog } = require('./auditService');
const orchestrationMetrics = require('./orchestrationMetrics.service');
const { canonicalize, secureDigest } = require('../utils/idempotency');
const { redactSecrets } = require('../utils/redact');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const {
  ALERT_COMPARISONS,
  ALERT_RULE_STATUSES,
  ALERT_SIGNAL_TYPES,
  BOTTLENECK_CATEGORIES,
  BOTTLENECK_CONFIDENCE,
  BOUNDED_METRIC_LABELS,
  FLEET_CONTROL_ACTIONS,
  OBSERVABILITY_LIMITS,
  SAFE_CODE_PATTERN,
  SAFE_IDENTIFIER_PATTERN,
  SLO_EVALUATION_STATUSES,
  SLO_EVALUATION_WINDOWS,
  SLO_POLICY_STATUSES,
  STUCK_RUN_REASON_CODES,
  TIMELINE_EVENT_CATEGORIES,
  TRACE_ANOMALY_CODES,
  TRACE_SPAN_TYPES,
  basisPoints,
  boundedInteger,
  safeCode,
  safeIdentifier,
  windowDurationMs,
} = require('../constants/orchestrationObservability');
const {
  TERMINAL_NODE_STATUSES,
  TERMINAL_RUN_STATUSES,
} = require('../constants/orchestration');

const TERMINAL_NODE_SET = new Set(TERMINAL_NODE_STATUSES);
const TERMINAL_RUN_SET = new Set(TERMINAL_RUN_STATUSES);
const SAFE_EXPORT_DENY_PATTERN =
  /credential|authorization|install.?key|provider.?key|api.?key|bearer|token|secret|encrypted|ciphertext|hidden.?reasoning|system.?prompt|raw.?payload|private.?memory/i;
const HIGH_CARDINALITY_METRIC_LABELS = new Set([
  'runId',
  'nodeId',
  'nodeRunId',
  'traceId',
  'requestId',
  'passportId',
  'connectionId',
  'userId',
  'workerId',
]);

function idOf(value) {
  return String(value?._id || value?.id || value || '').trim();
}

function plain(value) {
  return typeof value?.toObject === 'function'
    ? value.toObject({ depopulate: true, flattenMaps: true, virtuals: false })
    : value || {};
}

function clean(value, maximum = OBSERVABILITY_LIMITS.maximumSafeSummaryLength) {
  return String(value || '').trim().slice(0, maximum);
}

function safeText(value, fallback = '') {
  return clean(redactSecrets(value == null ? fallback : value));
}

function asDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateMs(value) {
  return asDate(value)?.getTime();
}

function elapsed(start, end) {
  const left = dateMs(start);
  const right = dateMs(end);
  if (!Number.isFinite(left) || !Number.isFinite(right) || right < left) return 0;
  return right - left;
}

function latestDate(...values) {
  const dates = values.flat().map(asDate).filter(Boolean).sort((left, right) => right - left);
  return dates[0] || null;
}

function earliestDate(...values) {
  const dates = values.flat().map(asDate).filter(Boolean).sort((left, right) => left - right);
  return dates[0] || null;
}

function paging(input = {}) {
  const page = boundedInteger(input.page || 1, 1, 1, 100000);
  const limit = boundedInteger(input.limit || 25, 25, 1, OBSERVABILITY_LIMITS.maximumListLimit);
  return { page, limit, skip: (page - 1) * limit };
}

function scopeFromCaller(input = {}, caller = {}) {
  const partnerId = idOf(caller.partner?._id || caller.partnerId || caller.partner);
  if (!partnerId) {
    throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Partner API key is required.');
  }
  const workspaceId = clean(input.workspaceId || input.receivingWorkspaceId, 128);
  if (!workspaceId) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'workspaceId is required.');
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

function actor(scope, caller = {}) {
  return actorFromPartner(caller.partner || { _id: scope.partnerId }, {
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    requestId: scope.requestId,
    traceId: scope.traceId,
  });
}

async function authorize(permission, type, value, scope, caller = {}, context = {}) {
  return assertAuthorized(actor(scope, caller), permission, resource(type, value, scope), {
    workspaceId: scope.workspaceId,
    requestId: scope.requestId,
    traceId: scope.traceId,
    ...context,
  });
}

async function audit(action, type, value, scope, metadata = {}) {
  return createAuditLog(
    scope.actorType,
    scope.actorId,
    action,
    type,
    idOf(value),
    {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      receivingWorkspaceId: scope.workspaceId,
      ...redactSecrets(metadata),
    },
    { requestId: scope.requestId, traceId: scope.traceId },
  );
}

function sourceVersion(record) {
  const item = plain(record);
  return clean(item.updatedAt || item.createdAt || item.version || item.__v || 'v0', 128);
}

function eventCategoryFor(eventType = '') {
  const value = String(eventType).toLowerCase();
  if (value.includes('approval')) return 'approval';
  if (value.includes('selection') || value.includes('agent_selected')) return 'selection';
  if (value.includes('delegat') || value.includes('contract')) return 'delegation';
  if (value.includes('retry')) return 'retry';
  if (value.includes('cancel')) return 'cancellation';
  if (value.includes('recover')) return 'recovery';
  if (value.includes('compensat')) return 'compensation';
  if (value.includes('intervention')) return 'intervention';
  if (value.includes('checkpoint')) return 'checkpoint';
  if (value.includes('incident')) return 'incident';
  if (value.includes('policy') || value.includes('authorization')) return 'policy';
  if (value.includes('worker') || value.includes('queue') || value.includes('operation')) {
    return 'operational';
  }
  if (value.includes('node') || value.includes('invocation')) return 'execution';
  if (value.includes('scheduled') || value.includes('queued') || value.includes('ready')) {
    return 'scheduling';
  }
  return 'lifecycle';
}

function timelineEntry(input) {
  const eventType = clean(input.eventType, 160) || 'orchestration.event';
  const eventCategory = TIMELINE_EVENT_CATEGORIES.includes(input.eventCategory)
    ? input.eventCategory
    : eventCategoryFor(eventType);
  const occurredAt = asDate(input.occurredAt) || new Date(0);
  return {
    organizationId: clean(input.organizationId, 128),
    workspaceId: clean(input.workspaceId, 128),
    orchestrationDefinitionId: input.orchestrationDefinitionId || undefined,
    orchestrationRunId: input.orchestrationRunId,
    nodeRunId: input.nodeRunId || undefined,
    compensationRunId: input.compensationRunId || undefined,
    recoveryDecisionId: input.recoveryDecisionId || undefined,
    interventionRequestId: input.interventionRequestId || undefined,
    approvalRequestId: clean(input.approvalRequestId, 128) || undefined,
    delegationGrantId: input.delegationGrantId || undefined,
    delegationInvocationId: input.delegationInvocationId || undefined,
    selectionDecisionId: input.selectionDecisionId || undefined,
    checkpointId: input.checkpointId || undefined,
    incidentId: clean(input.incidentId, 128) || undefined,
    eventType,
    eventCategory,
    safeStatus: clean(input.safeStatus, 80) || undefined,
    safeReasonCode: input.safeReasonCode ? safeCode(input.safeReasonCode) : undefined,
    safeSummary: safeText(input.safeSummary || eventType),
    actorType: ['partner', 'user', 'system', 'service_account'].includes(input.actorType)
      ? input.actorType
      : 'unknown',
    actorId: clean(input.actorId, 128) || undefined,
    traceId: safeIdentifier(input.traceId),
    requestId: safeIdentifier(input.requestId),
    parentTraceId: safeIdentifier(input.parentTraceId),
    occurredAt,
    ingestedAt: asDate(input.ingestedAt) || new Date(),
    sourceCollection: clean(input.sourceCollection, 128) || 'derived',
    sourceRecordId: clean(input.sourceRecordId, 160) || `${eventType}:${occurredAt.toISOString()}`,
    sourceVersion: clean(input.sourceVersion, 128) || undefined,
  };
}

function sortTimeline(events) {
  return [...events]
    .sort((left, right) => {
      const byTime = new Date(left.occurredAt) - new Date(right.occurredAt);
      if (byTime) return byTime;
      const bySequence = Number(left.sequence || 0) - Number(right.sequence || 0);
      if (bySequence) return bySequence;
      return String(left.sourceRecordId).localeCompare(String(right.sourceRecordId));
    })
    .map((event, index) => ({ ...event, sequence: index + 1 }));
}

function dedupeTimeline(events) {
  const bySource = new Map();
  for (const event of events) {
    const key = [
      event.organizationId,
      event.workspaceId,
      idOf(event.orchestrationRunId),
      event.sourceCollection,
      event.sourceRecordId,
      event.eventType,
    ].join(':');
    const current = bySource.get(key);
    if (!current || new Date(event.occurredAt) < new Date(current.occurredAt)) {
      bySource.set(key, event);
    }
  }
  return sortTimeline([...bySource.values()]);
}

function auditTimelineEvent(auditRecord, run) {
  const record = plain(auditRecord);
  const metadata = record.metadata || {};
  const action = record.action || 'audit.event';
  return timelineEntry({
    organizationId: record.organizationId || metadata.organizationId || run.organizationId,
    workspaceId: record.workspaceId || metadata.workspaceId || metadata.receivingWorkspaceId || run.workspaceId,
    orchestrationDefinitionId: run.definitionId,
    orchestrationRunId: metadata.orchestrationRunId || run._id,
    nodeRunId: record.entityType === 'OrchestrationNodeRun' ? record.entityId : metadata.nodeRunId,
    compensationRunId: record.entityType === 'OrchestrationCompensationRun' ? record.entityId : metadata.compensationRunId,
    recoveryDecisionId: record.entityType === 'OrchestrationRecoveryDecision' ? record.entityId : metadata.recoveryDecisionId,
    interventionRequestId: record.entityType === 'OrchestrationInterventionRequest' ? record.entityId : metadata.interventionRequestId,
    approvalRequestId: metadata.approvalRequestId,
    delegationGrantId: record.entityType === 'InterAgentDelegationGrant' ? record.entityId : metadata.grantId,
    selectionDecisionId: record.entityType === 'AgentSelectionDecision' ? record.entityId : metadata.selectionDecisionId,
    checkpointId: record.entityType === 'OrchestrationCheckpoint' ? record.entityId : metadata.checkpointId,
    incidentId: record.entityType === 'OperationalIncident' ? record.entityId : metadata.incidentId,
    eventType: action,
    eventCategory: eventCategoryFor(action),
    safeStatus: metadata.status || metadata.toState,
    safeReasonCode: metadata.reasonCode || metadata.safeReasonCode,
    safeSummary: `${action.replaceAll('.', ' ')}${metadata.nodeKey ? ` for ${metadata.nodeKey}` : ''}`,
    actorType: record.actorType,
    actorId: record.actorId,
    traceId: record.traceId || metadata.traceId || run.traceId,
    requestId: record.requestId || metadata.requestId || run.requestId,
    parentTraceId: metadata.parentTraceId,
    occurredAt: record.createdAt,
    sourceCollection: 'AuditLog',
    sourceRecordId: idOf(record),
    sourceVersion: sourceVersion(record),
  });
}

function deriveTimelineEvents(input = {}, options = {}) {
  const run = plain(input.run);
  const now = asDate(options.now) || new Date();
  const events = [];
  const base = {
    organizationId: run.organizationId,
    workspaceId: run.workspaceId,
    orchestrationDefinitionId: run.definitionId,
    orchestrationRunId: run._id,
    traceId: run.traceId,
    requestId: run.requestId,
  };
  if (run._id) {
    events.push(
      timelineEntry({
        ...base,
        eventType: 'orchestration.run.created',
        eventCategory: 'lifecycle',
        safeStatus: run.status,
        safeSummary: `Run created for ${run.definitionName || 'orchestration'}`,
        actorType: 'service_account',
        actorId: run.requestedBy,
        occurredAt: run.createdAt || now,
        sourceCollection: 'OrchestrationRun',
        sourceRecordId: `${idOf(run)}:created`,
        sourceVersion: sourceVersion(run),
      }),
    );
    if (run.startedAt) {
      events.push(timelineEntry({
        ...base,
        eventType: 'orchestration.run.started',
        eventCategory: 'execution',
        safeStatus: 'running',
        safeSummary: 'Run execution started.',
        actorType: 'system',
        actorId: 'system:orchestration-worker',
        occurredAt: run.startedAt,
        sourceCollection: 'OrchestrationRun',
        sourceRecordId: `${idOf(run)}:started`,
        sourceVersion: sourceVersion(run),
      }));
    }
    if (TERMINAL_RUN_SET.has(run.status)) {
      events.push(timelineEntry({
        ...base,
        eventType: `orchestration.run.${run.status}`,
        eventCategory: run.status === 'cancelled' ? 'cancellation' : 'lifecycle',
        safeStatus: run.status,
        safeReasonCode: run.failureSummary?.code,
        safeSummary: `Run reached ${run.status}.`,
        actorType: 'system',
        actorId: 'system:orchestration-worker',
        occurredAt: run.completedAt || run.updatedAt || now,
        sourceCollection: 'OrchestrationRun',
        sourceRecordId: `${idOf(run)}:${run.status}`,
        sourceVersion: sourceVersion(run),
      }));
    }
  }
  for (const nodeInput of input.nodes || []) {
    const node = plain(nodeInput);
    events.push(timelineEntry({
      ...base,
      nodeRunId: node._id,
      eventType: `orchestration.node.${node.status}`,
      eventCategory: eventCategoryFor(`node.${node.status}`),
      safeStatus: node.status,
      safeReasonCode: node.safeFailure?.code || node.lastSafeFailure?.code,
      safeSummary: `${node.nodeKey || 'Node'} is ${node.status}.`,
      actorType: node.leaseOwner ? 'system' : 'unknown',
      actorId: node.leaseOwner || undefined,
      traceId: node.traceId || run.traceId,
      requestId: node.requestId || run.requestId,
      parentTraceId: node.parentTraceId || run.traceId,
      occurredAt: node.completedAt || node.startedAt || node.updatedAt || node.createdAt || now,
      sourceCollection: 'OrchestrationNodeRun',
      sourceRecordId: idOf(node),
      sourceVersion: sourceVersion(node),
    }));
    if (node.attempt > 1) {
      events.push(timelineEntry({
        ...base,
        nodeRunId: node._id,
        eventType: 'orchestration.node.retry_observed',
        eventCategory: 'retry',
        safeStatus: node.status,
        safeReasonCode: node.safeFailure?.code,
        safeSummary: `${node.nodeKey || 'Node'} has retry attempts.`,
        traceId: node.traceId || run.traceId,
        requestId: node.requestId || run.requestId,
        parentTraceId: node.parentTraceId || run.traceId,
        occurredAt: node.updatedAt || now,
        sourceCollection: 'OrchestrationNodeRun',
        sourceRecordId: `${idOf(node)}:retry:${node.attempt}`,
        sourceVersion: sourceVersion(node),
      }));
    }
  }
  for (const record of input.audits || []) events.push(auditTimelineEvent(record, run));
  for (const decisionInput of input.selections || []) {
    const decision = plain(decisionInput);
    events.push(timelineEntry({
      ...base,
      selectionDecisionId: decision._id,
      eventType: 'orchestration.selection.evaluated',
      eventCategory: 'selection',
      safeStatus: decision.decisionStatus,
      safeSummary: `Selection evaluated for ${decision.requestedCapability || 'capability'}.`,
      actorType: 'service_account',
      actorId: decision.requestedBy,
      traceId: decision.traceId || run.traceId,
      requestId: decision.requestId || run.requestId,
      occurredAt: decision.createdAt || now,
      sourceCollection: 'AgentSelectionDecision',
      sourceRecordId: idOf(decision),
      sourceVersion: sourceVersion(decision),
    }));
  }
  for (const grantInput of input.delegationGrants || []) {
    const grant = plain(grantInput);
    events.push(timelineEntry({
      ...base,
      delegationGrantId: grant._id,
      eventType: 'orchestration.delegation.grant_recorded',
      eventCategory: 'delegation',
      safeStatus: grant.status,
      safeSummary: `Delegation grant ${grant.status || 'recorded'}.`,
      actorType: 'service_account',
      actorId: grant.createdBy,
      traceId: grant.traceId || run.traceId,
      requestId: grant.requestId || run.requestId,
      occurredAt: grant.createdAt || now,
      sourceCollection: 'InterAgentDelegationGrant',
      sourceRecordId: idOf(grant),
      sourceVersion: sourceVersion(grant),
    }));
  }
  for (const delegationInput of input.delegationInvocations || []) {
    const delegation = plain(delegationInput);
    events.push(timelineEntry({
      ...base,
      delegationInvocationId: delegation._id,
      delegationGrantId: delegation.delegationGrantId,
      eventType: 'orchestration.delegation.invocation_recorded',
      eventCategory: 'delegation',
      safeStatus: delegation.status,
      safeReasonCode: delegation.safeFailureCode,
      safeSummary: `Delegated invocation ${delegation.status || 'recorded'}.`,
      traceId: delegation.traceId || run.traceId,
      requestId: delegation.requestId || run.requestId,
      parentTraceId: delegation.parentTraceId,
      occurredAt: delegation.completedAt || delegation.startedAt || delegation.createdAt || now,
      sourceCollection: 'InterAgentDelegationInvocation',
      sourceRecordId: idOf(delegation),
      sourceVersion: sourceVersion(delegation),
    }));
  }
  for (const compensationInput of input.compensations || []) {
    const compensation = plain(compensationInput);
    events.push(timelineEntry({
      ...base,
      compensationRunId: compensation._id,
      nodeRunId: compensation.originalNodeRunId,
      eventType: `orchestration.compensation.${compensation.status || 'recorded'}`,
      eventCategory: 'compensation',
      safeStatus: compensation.status,
      safeReasonCode: compensation.safeFailureCode,
      safeSummary: `Compensation ${compensation.status || 'recorded'}.`,
      traceId: compensation.traceId || run.traceId,
      requestId: compensation.requestId || run.requestId,
      parentTraceId: compensation.parentTraceId,
      occurredAt: compensation.completedAt || compensation.startedAt || compensation.createdAt || now,
      sourceCollection: 'OrchestrationCompensationRun',
      sourceRecordId: idOf(compensation),
      sourceVersion: sourceVersion(compensation),
    }));
  }
  for (const approvalInput of input.approvalRequests || input.approvals || []) {
    const approval = plain(approvalInput);
    events.push(timelineEntry({
      ...base,
      nodeRunId: approval.orchestrationNodeRunId || approval.nodeRunId,
      compensationRunId: approval.orchestrationCompensationRunId || approval.compensationRunId,
      recoveryDecisionId: approval.orchestrationRecoveryDecisionId || approval.recoveryDecisionId,
      interventionRequestId: approval.orchestrationInterventionRequestId || approval.interventionRequestId,
      approvalRequestId: approval.approvalRequestId,
      delegationGrantId: approval.interAgentDelegationGrantId,
      selectionDecisionId: approval.agentSelectionDecisionId,
      eventType: `orchestration.approval.${String(approval.status || 'pending').toLowerCase()}`,
      eventCategory: 'approval',
      safeStatus: approval.status,
      safeReasonCode: approval.invalidationReasonCode,
      safeSummary: `Approval ${approval.status || 'pending'} for ${approval.operationType || approval.permission || 'operation'}.`,
      actorType: approval.requesterActorType,
      actorId: approval.requesterActorId,
      traceId: approval.traceId || run.traceId,
      requestId: approval.requestId || run.requestId,
      parentTraceId: approval.parentTraceId || run.traceId,
      occurredAt: approval.updatedAt || approval.requestedAt || approval.createdAt || now,
      sourceCollection: 'ApprovalRequest',
      sourceRecordId: approval.approvalRequestId || idOf(approval),
      sourceVersion: sourceVersion(approval),
    }));
  }
  for (const recoveryInput of input.recoveryDecisions || []) {
    const recovery = plain(recoveryInput);
    events.push(timelineEntry({
      ...base,
      recoveryDecisionId: recovery._id,
      nodeRunId: recovery.nodeRunId,
      compensationRunId: recovery.compensationRunId,
      approvalRequestId: recovery.approvalRequestId,
      eventType: `orchestration.recovery.${recovery.decisionStatus || recovery.decisionType || 'recorded'}`,
      eventCategory: 'recovery',
      safeStatus: recovery.decisionStatus,
      safeReasonCode: recovery.safeReasonCode,
      safeSummary: `Recovery ${recovery.decisionType || 'decision'} ${recovery.decisionStatus || 'recorded'}.`,
      actorType: 'service_account',
      actorId: recovery.requestedBy,
      traceId: recovery.traceId || run.traceId,
      requestId: recovery.requestId || run.requestId,
      parentTraceId: recovery.parentTraceId || run.traceId,
      occurredAt: recovery.appliedAt || recovery.approvedAt || recovery.failedAt || recovery.expiredAt || recovery.requestedAt || recovery.createdAt || now,
      sourceCollection: 'OrchestrationRecoveryDecision',
      sourceRecordId: idOf(recovery),
      sourceVersion: sourceVersion(recovery),
    }));
  }
  for (const interventionInput of input.interventions || []) {
    const intervention = plain(interventionInput);
    events.push(timelineEntry({
      ...base,
      interventionRequestId: intervention._id,
      nodeRunId: intervention.nodeRunId,
      compensationRunId: intervention.compensationRunId,
      eventType: `orchestration.intervention.${intervention.status || 'requested'}`,
      eventCategory: 'intervention',
      safeStatus: intervention.status,
      safeReasonCode: intervention.safeFailureCode,
      safeSummary: intervention.safeSummary || intervention.title || 'Intervention requested.',
      traceId: intervention.traceId || run.traceId,
      requestId: intervention.requestId || run.requestId,
      occurredAt: intervention.resolvedAt || intervention.createdAt || now,
      sourceCollection: 'OrchestrationInterventionRequest',
      sourceRecordId: idOf(intervention),
      sourceVersion: sourceVersion(intervention),
    }));
  }
  for (const checkpointInput of input.checkpoints || []) {
    const checkpoint = plain(checkpointInput);
    events.push(timelineEntry({
      ...base,
      checkpointId: checkpoint._id,
      eventType: `orchestration.checkpoint.${checkpoint.status || 'created'}`,
      eventCategory: 'checkpoint',
      safeStatus: checkpoint.status,
      safeSummary: `Checkpoint ${checkpoint.checkpointKey || idOf(checkpoint)} ${checkpoint.status || 'created'}.`,
      traceId: checkpoint.traceId || run.traceId,
      requestId: checkpoint.requestId || run.requestId,
      occurredAt: checkpoint.verifiedAt || checkpoint.createdAt || now,
      sourceCollection: 'OrchestrationCheckpoint',
      sourceRecordId: idOf(checkpoint),
      sourceVersion: sourceVersion(checkpoint),
    }));
  }
  for (const incidentInput of input.incidents || []) {
    const incident = plain(incidentInput);
    events.push(timelineEntry({
      ...base,
      incidentId: incident.incidentId || idOf(incident),
      eventType: 'orchestration.incident.linked',
      eventCategory: 'incident',
      safeStatus: incident.status,
      safeReasonCode: incident.reasonCode,
      safeSummary: incident.title || incident.safeDescription || 'Incident linked.',
      traceId: incident.traceId || run.traceId,
      requestId: incident.requestId || run.requestId,
      occurredAt: incident.createdAt || now,
      sourceCollection: 'OperationalIncident',
      sourceRecordId: idOf(incident),
      sourceVersion: sourceVersion(incident),
    }));
  }
  return dedupeTimeline(events);
}

function spanIdFor(kind, value) {
  const candidate = safeIdentifier(value);
  if (candidate) return candidate;
  return `span_${secureDigest(`orchestration-${kind}`, value || crypto.randomUUID()).slice(-48)}`;
}

function uniqueSpanId(base, used) {
  let candidate = spanIdFor('trace', base);
  let index = 1;
  while (used.has(candidate)) {
    candidate = spanIdFor('trace', `${base}:${index}`);
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function traceSpan(input, used = new Set()) {
  const spanType = TRACE_SPAN_TYPES.includes(input.spanType) ? input.spanType : 'operator_action';
  const startedAt = asDate(input.startedAt) || new Date(0);
  const completedAt = asDate(input.completedAt);
  const spanId = uniqueSpanId(input.spanId || `${spanType}:${input.sourceId || input.operation}`, used);
  return {
    organizationId: clean(input.organizationId, 128),
    workspaceId: clean(input.workspaceId, 128),
    traceId: safeIdentifier(input.traceId),
    spanId,
    parentSpanId: input.parentSpanId ? spanIdFor('parent', input.parentSpanId) : undefined,
    orchestrationRunId: input.orchestrationRunId,
    nodeRunId: input.nodeRunId || undefined,
    invocationId: input.invocationId || undefined,
    approvalRequestId: clean(input.approvalRequestId, 128) || undefined,
    compensationRunId: input.compensationRunId || undefined,
    recoveryDecisionId: input.recoveryDecisionId || undefined,
    delegationInvocationId: input.delegationInvocationId || undefined,
    selectionDecisionId: input.selectionDecisionId || undefined,
    spanType,
    operation: clean(input.operation || spanType, 200),
    status: clean(input.status, 80) || undefined,
    safeErrorCode: input.safeErrorCode ? safeCode(input.safeErrorCode) : undefined,
    startedAt,
    completedAt: completedAt || undefined,
    durationMs: Number.isFinite(input.durationMs) ? Math.max(0, Math.trunc(input.durationMs)) : completedAt ? elapsed(startedAt, completedAt) : undefined,
    attempt: Number.isFinite(Number(input.attempt)) ? Math.max(0, Math.trunc(Number(input.attempt))) : undefined,
    queueWaitMs: Number.isFinite(input.queueWaitMs) ? Math.max(0, Math.trunc(input.queueWaitMs)) : undefined,
    executionMs: Number.isFinite(input.executionMs) ? Math.max(0, Math.trunc(input.executionMs)) : undefined,
    providerCategory: clean(input.providerCategory, 80) || undefined,
    capability: clean(input.capability, 200) || undefined,
    orchestrationNodeKey: clean(input.orchestrationNodeKey, 100) || undefined,
    createdAt: asDate(input.createdAt) || new Date(),
  };
}

function deriveTraceSpans(input = {}, options = {}) {
  const run = plain(input.run);
  const rootTraceId = safeIdentifier(run.traceId) || spanIdFor('run-trace', idOf(run));
  const used = new Set();
  const now = asDate(options.now) || new Date();
  const spans = [
    traceSpan({
      organizationId: run.organizationId,
      workspaceId: run.workspaceId,
      traceId: rootTraceId,
      spanId: rootTraceId,
      orchestrationRunId: run._id,
      spanType: 'orchestration_run',
      operation: 'orchestration.run',
      status: run.status,
      safeErrorCode: run.failureSummary?.code,
      startedAt: run.startedAt || run.createdAt || now,
      completedAt: run.completedAt,
      sourceId: idOf(run),
      createdAt: run.createdAt || now,
    }, used),
  ];
  const nodesById = new Map();
  for (const nodeInput of input.nodes || []) {
    const node = plain(nodeInput);
    nodesById.set(idOf(node), node);
    const startedAt = node.startedAt || node.createdAt || run.createdAt || now;
    spans.push(traceSpan({
      organizationId: node.organizationId || run.organizationId,
      workspaceId: node.workspaceId || run.workspaceId,
      traceId: rootTraceId,
      spanId: node.traceId || `node:${idOf(node)}`,
      parentSpanId: node.parentTraceId || rootTraceId,
      orchestrationRunId: run._id,
      nodeRunId: node._id,
      invocationId: node.invocationId,
      selectionDecisionId: node.selectionDecisionId,
      compensationRunId: node.compensationRunId,
      spanType: node.status === 'retry_wait' ? 'retry_wait' : 'node_execution',
      operation: `node.${node.operation || node.capability || node.nodeKey}`,
      status: node.status,
      safeErrorCode: node.safeFailure?.code || node.lastSafeFailure?.code,
      startedAt,
      completedAt: node.completedAt,
      attempt: node.attempt,
      queueWaitMs: elapsed(node.createdAt, node.startedAt),
      executionMs: elapsed(node.startedAt, node.completedAt),
      capability: node.capability,
      orchestrationNodeKey: node.nodeKey,
      sourceId: idOf(node),
      createdAt: node.createdAt || now,
    }, used));
  }
  for (const invocationInput of input.invocations || []) {
    const invocation = plain(invocationInput);
    const context = invocation.orchestrationContext || invocation.delegationContext || invocation.compensationContext || {};
    spans.push(traceSpan({
      organizationId: idOf(invocation.organizationId || run.organizationId),
      workspaceId: invocation.receivingWorkspaceId || run.workspaceId,
      traceId: rootTraceId,
      spanId: invocation.traceId || context.traceId || `invocation:${idOf(invocation)}`,
      parentSpanId: context.traceId || context.parentTraceId || rootTraceId,
      orchestrationRunId: run._id,
      nodeRunId: context.nodeRunId || context.originalNodeRunId,
      invocationId: invocation._id,
      spanType: 'gateway_invocation',
      operation: `gateway.${invocation.capability || context.capability || 'invoke'}`,
      status: invocation.lifecycleState || invocation.status,
      safeErrorCode: invocation.error?.code,
      startedAt: invocation.createdAt || invocation.lifecycleTimestamps?.runningAt || now,
      completedAt: invocation.terminalAt || invocation.completedAt || invocation.updatedAt,
      attempt: invocation.attemptCount,
      durationMs: invocation.durationMs,
      capability: invocation.capability || context.capability,
      orchestrationNodeKey: context.nodeKey,
      providerCategory: invocation.runtimeType,
      sourceId: idOf(invocation),
      createdAt: invocation.createdAt || now,
    }, used));
  }
  for (const decisionInput of input.selections || []) {
    const decision = plain(decisionInput);
    spans.push(traceSpan({
      organizationId: decision.organizationId || run.organizationId,
      workspaceId: decision.workspaceId || run.workspaceId,
      traceId: rootTraceId,
      spanId: `selection:${idOf(decision)}`,
      parentSpanId: rootTraceId,
      orchestrationRunId: run._id,
      selectionDecisionId: decision._id,
      spanType: 'agent_selection',
      operation: `selection.${decision.requestedCapability || 'capability'}`,
      status: decision.decisionStatus,
      startedAt: decision.createdAt || now,
      completedAt: decision.approvalResolvedAt || decision.createdAt,
      capability: decision.requestedCapability,
      orchestrationNodeKey: decision.orchestrationNodeKey,
      sourceId: idOf(decision),
      createdAt: decision.createdAt || now,
    }, used));
  }
  for (const delegationInput of input.delegationInvocations || []) {
    const delegation = plain(delegationInput);
    spans.push(traceSpan({
      organizationId: delegation.organizationId || run.organizationId,
      workspaceId: delegation.workspaceId || run.workspaceId,
      traceId: rootTraceId,
      spanId: delegation.traceId || `delegation:${idOf(delegation)}`,
      parentSpanId: delegation.parentTraceId || rootTraceId,
      orchestrationRunId: run._id,
      nodeRunId: delegation.targetNodeRunId,
      delegationInvocationId: delegation._id,
      invocationId: delegation.runtimeInvocationId,
      spanType: 'delegation',
      operation: `delegation.${delegation.capability || 'invoke'}`,
      status: delegation.status,
      safeErrorCode: delegation.safeFailureCode,
      startedAt: delegation.startedAt || delegation.createdAt || now,
      completedAt: delegation.completedAt,
      capability: delegation.capability,
      sourceId: idOf(delegation),
      createdAt: delegation.createdAt || now,
    }, used));
  }
  for (const compensationInput of input.compensations || []) {
    const compensation = plain(compensationInput);
    spans.push(traceSpan({
      organizationId: compensation.organizationId || run.organizationId,
      workspaceId: compensation.workspaceId || run.workspaceId,
      traceId: rootTraceId,
      spanId: compensation.traceId || `compensation:${idOf(compensation)}`,
      parentSpanId: compensation.parentTraceId || rootTraceId,
      orchestrationRunId: run._id,
      nodeRunId: compensation.originalNodeRunId,
      compensationRunId: compensation._id,
      invocationId: compensation.invocationId,
      spanType: 'compensation',
      operation: `compensation.${compensation.compensationOperation || compensation.compensationCapability || 'run'}`,
      status: compensation.status,
      safeErrorCode: compensation.safeFailureCode,
      startedAt: compensation.startedAt || compensation.createdAt || now,
      completedAt: compensation.completedAt,
      attempt: compensation.attempt,
      capability: compensation.compensationCapability,
      sourceId: idOf(compensation),
      createdAt: compensation.createdAt || now,
    }, used));
  }
  for (const approvalInput of input.approvalRequests || input.approvals || []) {
    const approval = plain(approvalInput);
    spans.push(traceSpan({
      organizationId: approval.organizationId || run.organizationId,
      workspaceId: approval.workspaceId || run.workspaceId,
      traceId: rootTraceId,
      spanId: approval.traceId || `approval:${approval.approvalRequestId || idOf(approval)}`,
      parentSpanId: approval.parentTraceId || rootTraceId,
      orchestrationRunId: run._id,
      nodeRunId: approval.orchestrationNodeRunId || approval.nodeRunId,
      approvalRequestId: approval.approvalRequestId,
      compensationRunId: approval.orchestrationCompensationRunId || approval.compensationRunId,
      recoveryDecisionId: approval.orchestrationRecoveryDecisionId || approval.recoveryDecisionId,
      delegationInvocationId: approval.delegationInvocationId,
      selectionDecisionId: approval.agentSelectionDecisionId,
      spanType: 'approval_wait',
      operation: `approval.${approval.operationType || approval.permission || 'request'}`,
      status: approval.status,
      safeErrorCode: approval.invalidationReasonCode,
      startedAt: approval.requestedAt || approval.createdAt || now,
      completedAt: approval.status && approval.status !== 'PENDING' ? approval.updatedAt || approval.expiresAt : undefined,
      capability: approval.capabilityId,
      orchestrationNodeKey: approval.orchestrationNodeKey,
      sourceId: approval.approvalRequestId || idOf(approval),
      createdAt: approval.createdAt || approval.requestedAt || now,
    }, used));
  }
  for (const recoveryInput of input.recoveryDecisions || []) {
    const recovery = plain(recoveryInput);
    spans.push(traceSpan({
      organizationId: recovery.organizationId || run.organizationId,
      workspaceId: recovery.workspaceId || run.workspaceId,
      traceId: rootTraceId,
      spanId: recovery.traceId || `recovery:${idOf(recovery)}`,
      parentSpanId: recovery.parentTraceId || rootTraceId,
      orchestrationRunId: run._id,
      nodeRunId: recovery.nodeRunId,
      compensationRunId: recovery.compensationRunId,
      recoveryDecisionId: recovery._id,
      spanType: 'recovery',
      operation: `recovery.${recovery.decisionType || 'decision'}`,
      status: recovery.decisionStatus,
      safeErrorCode: recovery.failedAt ? recovery.safeReasonCode : undefined,
      startedAt: recovery.requestedAt || recovery.createdAt || now,
      completedAt: recovery.appliedAt || recovery.failedAt || recovery.expiredAt || recovery.approvedAt,
      sourceId: idOf(recovery),
      createdAt: recovery.createdAt || recovery.requestedAt || now,
    }, used));
  }
  for (const checkpointInput of input.checkpoints || []) {
    const checkpoint = plain(checkpointInput);
    spans.push(traceSpan({
      organizationId: checkpoint.organizationId || run.organizationId,
      workspaceId: checkpoint.workspaceId || run.workspaceId,
      traceId: rootTraceId,
      spanId: `checkpoint:${idOf(checkpoint)}`,
      parentSpanId: checkpoint.traceId || rootTraceId,
      orchestrationRunId: run._id,
      spanType: 'checkpoint',
      operation: 'checkpoint.verify',
      status: checkpoint.status,
      startedAt: checkpoint.createdAt || now,
      completedAt: checkpoint.verifiedAt || checkpoint.createdAt,
      sourceId: idOf(checkpoint),
      createdAt: checkpoint.createdAt || now,
    }, used));
  }
  return spans.sort((left, right) => new Date(left.startedAt) - new Date(right.startedAt) || left.spanId.localeCompare(right.spanId));
}

function anomaly(code, span, details = {}) {
  return {
    code: TRACE_ANOMALY_CODES.includes(code) ? code : 'TRACE_IDENTIFIER_INVALID',
    spanType: span?.spanType,
    operation: span?.operation,
    safeSummary: code.replaceAll('_', ' ').toLowerCase(),
    ...details,
  };
}

function validateTraceSpans(spans = [], expected = {}) {
  const anomalies = [];
  const byId = new Map();
  for (const span of spans) {
    for (const field of ['traceId', 'spanId']) {
      if (!SAFE_IDENTIFIER_PATTERN.test(String(span[field] || ''))) {
        anomalies.push(anomaly('TRACE_IDENTIFIER_INVALID', span, { field }));
      }
    }
    if (span.parentSpanId && !SAFE_IDENTIFIER_PATTERN.test(String(span.parentSpanId))) {
      anomalies.push(anomaly('TRACE_IDENTIFIER_INVALID', span, { field: 'parentSpanId' }));
    }
    if (expected.organizationId && span.organizationId !== expected.organizationId) {
      anomalies.push(anomaly('TRACE_TENANT_MISMATCH', span));
    }
    if (expected.workspaceId && span.workspaceId !== expected.workspaceId) {
      anomalies.push(anomaly('TRACE_TENANT_MISMATCH', span));
    }
    if (expected.orchestrationRunId && idOf(span.orchestrationRunId) !== idOf(expected.orchestrationRunId)) {
      anomalies.push(anomaly('TRACE_RUN_MISMATCH', span));
    }
    if (span.completedAt && new Date(span.completedAt) < new Date(span.startedAt)) {
      anomalies.push(anomaly('TRACE_SPAN_SEQUENCE_INVALID', span));
    }
    if (byId.has(span.spanId)) {
      anomalies.push(anomaly('TRACE_DUPLICATE_LOGICAL_ROOT', span));
    }
    byId.set(span.spanId, span);
  }
  const roots = spans.filter((span) => !span.parentSpanId);
  if (roots.length !== 1) anomalies.push(anomaly('TRACE_DUPLICATE_LOGICAL_ROOT', roots[0] || spans[0]));
  for (const span of spans) {
    if (span.parentSpanId && !byId.has(span.parentSpanId)) {
      anomalies.push(anomaly('TRACE_PARENT_MISSING', span));
    }
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(span) {
    if (!span || visited.has(span.spanId)) return false;
    if (visiting.has(span.spanId)) return true;
    visiting.add(span.spanId);
    const parent = span.parentSpanId ? byId.get(span.parentSpanId) : null;
    const hasCycle = parent ? visit(parent) : false;
    visiting.delete(span.spanId);
    visited.add(span.spanId);
    return hasCycle;
  }
  for (const span of spans) {
    if (visit(span)) {
      anomalies.push(anomaly('TRACE_CYCLE_DETECTED', span));
      break;
    }
  }
  return { valid: anomalies.length === 0, anomalies };
}

function statusCount(nodes, status) {
  return nodes.filter((node) => node.status === status).length;
}

function progressPercent(total, terminal) {
  if (!total) return 0;
  return Math.round((terminal / total) * 10000) / 100;
}

function intentionalWaitActive(run, nodes, now) {
  const approvalWait = nodes.some((node) => node.status === 'waiting_approval');
  const interventionWait = nodes.some((node) => node.status === 'waiting_intervention');
  if (approvalWait) {
    const deadline = asDate(run.approvalDeadlineAt || run.approvalExpiresAt);
    if (!deadline || deadline > now) return true;
  }
  if (interventionWait) {
    const deadline = asDate(run.interventionDeadlineAt);
    if (!deadline || deadline > now) return true;
  }
  return false;
}

function classifyStuckRun(runInput, nodeInputs = [], options = {}) {
  const run = plain(runInput);
  const nodes = nodeInputs.map(plain);
  const now = asDate(options.now) || new Date();
  const reasons = [];
  if (!run || TERMINAL_RUN_SET.has(run.status)) return { stuck: false, reasons };
  if (options.paused || options.maintenanceMode || options.draining) return { stuck: false, reasons };
  const lastProgressAt = latestDate(
    run.completedAt,
    run.updatedAt,
    run.startedAt,
    run.createdAt,
    nodes.flatMap((node) => [node.completedAt, node.startedAt, node.updatedAt, node.heartbeatAt]),
  );
  if (
    lastProgressAt &&
    now - lastProgressAt > (options.noProgressMs || OBSERVABILITY_LIMITS.defaultNoProgressMs) &&
    !intentionalWaitActive(run, nodes, now)
  ) {
    reasons.push('RUN_NO_PROGRESS');
  }
  for (const node of nodes) {
    if (
      node.status === 'running' &&
      node.leaseExpiresAt &&
      new Date(node.leaseExpiresAt).getTime() + (options.leaseToleranceMs || OBSERVABILITY_LIMITS.defaultLeaseToleranceMs) < now.getTime()
    ) {
      reasons.push('NODE_LEASE_EXPIRED');
    }
    if (
      ['ready', 'queued'].includes(node.status) &&
      node.createdAt &&
      now - new Date(node.createdAt) > (options.queueSloMs || OBSERVABILITY_LIMITS.defaultQueueSloMs)
    ) {
      reasons.push('QUEUE_WAIT_EXCEEDED');
    }
    if (
      node.status === 'retry_wait' &&
      node.nextAttemptAt &&
      new Date(node.nextAttemptAt).getTime() + (options.retryToleranceMs || 60000) < now.getTime() &&
      options.providerBackoffActive !== true &&
      options.circuitBreakerWaitActive !== true
    ) {
      reasons.push('RETRY_SCHEDULE_MISSED');
    }
    const approvalDeadline = asDate(node.approvalDeadlineAt || run.approvalDeadlineAt || run.approvalExpiresAt);
    if (node.status === 'waiting_approval' && approvalDeadline && approvalDeadline < now) {
      reasons.push('APPROVAL_DEADLINE_EXCEEDED');
    }
    const interventionDeadline = asDate(node.interventionDeadlineAt || run.interventionDeadlineAt);
    if (node.status === 'waiting_intervention' && interventionDeadline && interventionDeadline < now) {
      reasons.push('INTERVENTION_DEADLINE_EXCEEDED');
    }
    if (
      node.status === 'compensating' &&
      (!node.heartbeatAt || now - new Date(node.heartbeatAt) > (options.heartbeatStaleMs || OBSERVABILITY_LIMITS.defaultHeartbeatStaleMs))
    ) {
      reasons.push('COMPENSATION_HEARTBEAT_MISSING');
    }
  }
  if (run.recoveryDeadlineAt && new Date(run.recoveryDeadlineAt) < now && ['recovery_pending', 'recovering'].includes(run.status)) {
    reasons.push('RECOVERY_DEADLINE_EXCEEDED');
  }
  if (run.status === 'cancel_requested' && run.cancelRequestedAt && now - new Date(run.cancelRequestedAt) > (options.cancellationMs || 300000)) {
    reasons.push('CANCELLATION_NOT_COMPLETED');
  }
  if (run.status === 'termination_requested' && run.terminationRequestedAt && now - new Date(run.terminationRequestedAt) > (options.terminationMs || 300000)) {
    reasons.push('TERMINATION_NOT_COMPLETED');
  }
  const runningCount = statusCount(nodes, 'running') + statusCount(nodes, 'compensating');
  if (Number(run.activeNodeCount || 0) > 0 && runningCount === 0) {
    reasons.push('STATE_INCONSISTENCY_DETECTED');
  }
  const safeReasons = [...new Set(reasons)].filter((reason) => STUCK_RUN_REASON_CODES.includes(reason));
  return { stuck: safeReasons.length > 0, reasons: safeReasons };
}

function nodeTiming(nodeInput, now = new Date()) {
  const node = plain(nodeInput);
  const queueWaitMs = Number.isFinite(node.queueWaitMs)
    ? Math.max(0, Number(node.queueWaitMs))
    : elapsed(node.createdAt, node.startedAt);
  const executionMs = Number.isFinite(node.executionMs)
    ? Math.max(0, Number(node.executionMs))
    : elapsed(node.startedAt, node.completedAt || (node.status === 'running' ? now : null));
  const retryDelayMs = Math.max(0, Number(node.retryDelayMs || node.retryWaitMs || 0));
  const approvalDelayMs = Math.max(0, Number(node.approvalDelayMs || 0));
  const interventionDelayMs = Math.max(0, Number(node.interventionDelayMs || 0));
  const recoveryDelayMs = Math.max(0, Number(node.recoveryDelayMs || 0));
  const compensationDelayMs = Math.max(0, Number(node.compensationDelayMs || 0));
  const totalMs =
    queueWaitMs +
    executionMs +
    retryDelayMs +
    approvalDelayMs +
    interventionDelayMs +
    recoveryDelayMs +
    compensationDelayMs;
  return {
    queueWaitMs,
    executionMs,
    retryDelayMs,
    approvalDelayMs,
    interventionDelayMs,
    recoveryDelayMs,
    compensationDelayMs,
    totalMs,
  };
}

function topologicalNodes(definition = {}, nodes = []) {
  const definitions = new Map((definition.nodes || []).map((node) => [node.nodeKey, node]));
  const byKey = new Map(nodes.map((node) => [node.nodeKey, node]));
  const keys = [...new Set([...(definition.nodes || []).map((node) => node.nodeKey), ...nodes.map((node) => node.nodeKey)])].sort();
  const indegree = new Map(keys.map((key) => [key, 0]));
  const dependents = new Map(keys.map((key) => [key, []]));
  for (const key of keys) {
    const node = byKey.get(key) || definitions.get(key) || {};
    const dependencies = [...new Set([...(node.dependencyNodeKeys || []), ...(node.dependencies || definitions.get(key)?.dependencies || [])])];
    for (const dependency of dependencies) {
      if (!indegree.has(dependency)) continue;
      indegree.set(key, (indegree.get(key) || 0) + 1);
      dependents.get(dependency).push(key);
    }
  }
  const queue = keys.filter((key) => indegree.get(key) === 0).sort();
  const ordered = [];
  while (queue.length) {
    const key = queue.shift();
    ordered.push(key);
    for (const next of (dependents.get(key) || []).sort()) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
    queue.sort();
  }
  return ordered.length === keys.length ? ordered : keys;
}

function calculateCriticalPath(definitionInput = {}, nodeInputs = [], options = {}) {
  const now = asDate(options.now) || new Date();
  const definition = plain(definitionInput);
  const nodes = nodeInputs.map(plain);
  const byKey = new Map(nodes.map((node) => [node.nodeKey, node]));
  const definitionByKey = new Map((definition.nodes || []).map((node) => [node.nodeKey, node]));
  const ordered = topologicalNodes(definition, nodes);
  const best = new Map();
  const components = {
    longestQueueWait: { nodeKey: null, durationMs: 0 },
    longestExecution: { nodeKey: null, durationMs: 0 },
    longestPolicyWait: { nodeKey: null, durationMs: 0 },
    longestApprovalWait: { nodeKey: null, durationMs: 0 },
    retryContributionMs: 0,
    recoveryContributionMs: 0,
    compensationContributionMs: 0,
  };
  for (const key of ordered) {
    const node = byKey.get(key) || { nodeKey: key };
    const definitionNode = definitionByKey.get(key) || {};
    const timing = nodeTiming(node, now);
    if (timing.queueWaitMs > components.longestQueueWait.durationMs) {
      components.longestQueueWait = { nodeKey: key, durationMs: timing.queueWaitMs };
    }
    if (timing.executionMs > components.longestExecution.durationMs) {
      components.longestExecution = { nodeKey: key, durationMs: timing.executionMs };
    }
    const policyWaitMs = Math.max(0, Number(node.policyWaitMs || node.selectionDelayMs || 0));
    if (policyWaitMs > components.longestPolicyWait.durationMs) {
      components.longestPolicyWait = { nodeKey: key, durationMs: policyWaitMs };
    }
    if (timing.approvalDelayMs > components.longestApprovalWait.durationMs) {
      components.longestApprovalWait = { nodeKey: key, durationMs: timing.approvalDelayMs };
    }
    components.retryContributionMs += timing.retryDelayMs;
    components.recoveryContributionMs += timing.recoveryDelayMs;
    components.compensationContributionMs += timing.compensationDelayMs;
    const dependencies = [...new Set([...(node.dependencyNodeKeys || []), ...(node.dependencies || definitionNode.dependencies || [])])];
    const dependencyBest = dependencies
      .map((dependency) => best.get(dependency))
      .filter(Boolean)
      .sort((left, right) => right.durationMs - left.durationMs || left.nodeSequence.join(',').localeCompare(right.nodeSequence.join(',')))[0];
    const ownDuration = ['skipped'].includes(node.status) ? 0 : timing.totalMs + policyWaitMs;
    best.set(key, {
      durationMs: ownDuration + Number(dependencyBest?.durationMs || 0),
      nodeSequence: [...(dependencyBest?.nodeSequence || []), key],
      timings: { ...timing, policyWaitMs },
    });
  }
  const observed = [...best.values()].sort((left, right) => right.durationMs - left.durationMs || left.nodeSequence.join(',').localeCompare(right.nodeSequence.join(',')))[0] || { durationMs: 0, nodeSequence: [] };
  const plannedByKey = new Map();
  for (const key of ordered) {
    const definitionNode = definitionByKey.get(key) || {};
    const dependencies = [...new Set(definitionNode.dependencies || [])];
    const dependencyBest = dependencies
      .map((dependency) => plannedByKey.get(dependency))
      .filter(Boolean)
      .sort((left, right) => right.durationMs - left.durationMs)[0];
    plannedByKey.set(key, {
      durationMs: Number(definitionNode.timeoutMs || definition.defaultNodeTimeoutMs || 0) + Number(dependencyBest?.durationMs || 0),
      nodeSequence: [...(dependencyBest?.nodeSequence || []), key],
    });
  }
  const planned = [...plannedByKey.values()].sort((left, right) => right.durationMs - left.durationMs)[0] || { durationMs: 0, nodeSequence: [] };
  return {
    plannedCriticalPath: planned.nodeSequence,
    plannedCriticalPathDurationMs: planned.durationMs,
    criticalPathNodeSequence: observed.nodeSequence,
    criticalPathDurationMs: observed.durationMs,
    totalCriticalPathDurationMs: observed.durationMs,
    ...components,
  };
}

function computeRunHealth(runInput, nodeInputs = [], options = {}) {
  const run = plain(runInput);
  const nodes = nodeInputs.map(plain);
  const now = asDate(options.now) || new Date();
  const totalNodeCount = nodes.length;
  const terminalNodeCount = nodes.filter((node) => TERMINAL_NODE_SET.has(node.status)).length;
  const criticalPath = calculateCriticalPath(run.definitionSnapshot || options.definition || {}, nodes, { now });
  const lastProgressAt = latestDate(
    run.completedAt,
    run.updatedAt,
    run.startedAt,
    run.createdAt,
    nodes.flatMap((node) => [node.completedAt, node.startedAt, node.updatedAt]),
  );
  const lastHeartbeatAt = latestDate(nodes.map((node) => node.heartbeatAt));
  const stuck = classifyStuckRun(run, nodes, options);
  let healthCategory = 'healthy';
  const safeHealthReasons = [];
  if (TERMINAL_RUN_SET.has(run.status)) healthCategory = 'terminal';
  else if (stuck.stuck) {
    healthCategory = 'stuck';
    safeHealthReasons.push(...stuck.reasons);
  } else if (['waiting_approval', 'waiting_intervention'].includes(run.status) || intentionalWaitActive(run, nodes, now)) {
    healthCategory = 'waiting';
    safeHealthReasons.push('INTENTIONAL_WAIT_ACTIVE');
  } else if (['recovery_pending', 'recovering', 'compensation_pending', 'compensating'].includes(run.status)) {
    healthCategory = 'recovering';
    safeHealthReasons.push('RECOVERY_OR_COMPENSATION_ACTIVE');
  } else if (nodes.some((node) => ['failed', 'compensation_failed'].includes(node.status))) {
    healthCategory = 'degraded';
    safeHealthReasons.push('NODE_FAILURE_PRESENT');
  } else if (nodes.some((node) => ['ready', 'queued'].includes(node.status) && node.createdAt && now - new Date(node.createdAt) > (options.delayMs || OBSERVABILITY_LIMITS.defaultQueueSloMs))) {
    healthCategory = 'delayed';
    safeHealthReasons.push('QUEUE_WAIT_APPROACHING_SLO');
  }
  const queueCandidates = nodes.filter((node) => ['ready', 'queued', 'retry_wait'].includes(node.status));
  const oldestQueued = earliestDate(queueCandidates.map((node) => node.createdAt || node.updatedAt));
  return {
    runStatus: run.status,
    progressPercent: progressPercent(totalNodeCount, terminalNodeCount),
    totalNodeCount,
    terminalNodeCount,
    succeededNodeCount: statusCount(nodes, 'succeeded'),
    failedNodeCount: statusCount(nodes, 'failed'),
    skippedNodeCount: statusCount(nodes, 'skipped'),
    cancelledNodeCount: statusCount(nodes, 'cancelled'),
    blockedNodeCount: statusCount(nodes, 'blocked'),
    waitingApprovalCount: statusCount(nodes, 'waiting_approval'),
    waitingInterventionCount: statusCount(nodes, 'waiting_intervention'),
    activeNodeCount: statusCount(nodes, 'running'),
    retryingNodeCount: statusCount(nodes, 'retry_wait'),
    compensatingNodeCount: statusCount(nodes, 'compensating') + statusCount(nodes, 'compensation_pending'),
    compensatedNodeCount: statusCount(nodes, 'compensated'),
    compensationFailedCount: statusCount(nodes, 'compensation_failed'),
    unresolvedSideEffectCount: (run.unresolvedSideEffects || []).length,
    queueAgeMs: oldestQueued ? now - oldestQueued : 0,
    totalDurationMs: run.completedAt ? elapsed(run.startedAt || run.createdAt, run.completedAt) : elapsed(run.startedAt || run.createdAt, now),
    criticalPathDurationMs: criticalPath.criticalPathDurationMs,
    currentCriticalNodeKey: criticalPath.criticalPathNodeSequence.at(-1),
    lastProgressAt,
    lastHeartbeatAt,
    staleSince: stuck.stuck ? lastProgressAt : null,
    healthCategory,
    safeHealthReasons: [...new Set(safeHealthReasons)].map((reason) => safeCode(reason)),
    criticalPath,
  };
}

function bottleneck(reasonCode, category, confidence, evidence = {}) {
  return {
    category: BOTTLENECK_CATEGORIES.includes(category) ? category : 'queue_congestion',
    reasonCode: safeCode(reasonCode),
    confidence: BOTTLENECK_CONFIDENCE.includes(confidence) ? confidence : 'possible',
    evidence: redactSecrets(evidence),
  };
}

function detectBottlenecks(input = {}, thresholds = {}) {
  const nodes = (input.nodes || []).map(plain);
  const bottlenecks = [];
  const queueThreshold = thresholds.queueWaitMs || OBSERVABILITY_LIMITS.defaultQueueSloMs;
  const slowGatewayMs = thresholds.slowGatewayMs || 300000;
  const approvalMs = thresholds.approvalWaitMs || 3600000;
  const retryThreshold = thresholds.retryCount || 2;
  const queueWorst = nodes.map((node) => ({ node, timing: nodeTiming(node) })).sort((left, right) => right.timing.queueWaitMs - left.timing.queueWaitMs)[0];
  if (queueWorst?.timing.queueWaitMs > queueThreshold) {
    bottlenecks.push(bottleneck('QUEUE_CONGESTION_DETECTED', 'queue_congestion', 'likely', {
      queueWaitMs: queueWorst.timing.queueWaitMs,
      nodeKey: queueWorst.node.nodeKey,
    }));
  }
  const slowExecution = nodes.map((node) => ({ node, timing: nodeTiming(node) })).sort((left, right) => right.timing.executionMs - left.timing.executionMs)[0];
  if (slowExecution?.timing.executionMs > slowGatewayMs) {
    bottlenecks.push(bottleneck('SLOW_RUNTIME_GATEWAY_INVOCATION', 'slow_runtime_gateway_invocation', 'likely', {
      executionMs: slowExecution.timing.executionMs,
      capability: slowExecution.node.capability,
    }));
  }
  const retried = nodes.filter((node) => Number(node.attempt || 0) > retryThreshold);
  if (retried.length) bottlenecks.push(bottleneck('REPEATED_RETRIES', 'repeated_retries', 'confirmed', { count: retried.length }));
  const approvalDelay = nodes.filter((node) => Number(node.approvalDelayMs || 0) > approvalMs || node.status === 'waiting_approval').length;
  if (approvalDelay) bottlenecks.push(bottleneck('APPROVAL_DELAY', 'approval_delay', 'possible', { waitingApprovalCount: approvalDelay }));
  const compensationDelay = nodes.filter((node) => Number(node.compensationDelayMs || 0) > slowGatewayMs || ['compensating', 'compensation_pending'].includes(node.status)).length;
  if (compensationDelay) bottlenecks.push(bottleneck('COMPENSATION_DELAY', 'compensation_delay', 'possible', { compensatingNodeCount: compensationDelay }));
  const workerSummary = input.workerSummary || {};
  if (Number(workerSummary.unhealthyWorkers || 0) > 0) {
    bottlenecks.push(bottleneck('WORKER_UNHEALTHY', 'worker_saturation', 'possible', {
      unhealthyWorkers: workerSummary.unhealthyWorkers,
      activeWorkers: workerSummary.activeWorkers,
    }));
  }
  const queueSummaries = input.queueSummaries || [];
  if (queueSummaries.some((queue) => Number(queue.oldestItemAgeMs || 0) > queueThreshold)) {
    bottlenecks.push(bottleneck('QUEUE_AGE_EXCEEDED', 'queue_congestion', 'confirmed', {
      affectedQueues: queueSummaries.filter((queue) => Number(queue.oldestItemAgeMs || 0) > queueThreshold).length,
    }));
  }
  return bottlenecks.sort((left, right) => left.category.localeCompare(right.category));
}

function normalizeSloPolicyInput(input = {}, current = {}) {
  const base = { ...plain(current), ...input };
  const status = String(base.status || current.status || 'draft').toLowerCase();
  return {
    name: clean(base.name || current.name, 200),
    description: clean(base.description || '', 2000),
    status: SLO_POLICY_STATUSES.includes(status) ? status : 'draft',
    appliesToDefinitionIds: [...new Set((base.appliesToDefinitionIds || []).map(idOf).filter(Boolean))],
    appliesToCapabilityCategories: [...new Set((base.appliesToCapabilityCategories || []).map((value) => clean(value, 80)).filter(Boolean))].sort(),
    appliesToCriticalityLevels: [...new Set((base.appliesToCriticalityLevels || []).map((value) => clean(value, 80)).filter(Boolean))].sort(),
    availabilityTargetBasisPoints: boundedInteger(base.availabilityTargetBasisPoints ?? 9900, 9900, 0, 10000),
    successTargetBasisPoints: boundedInteger(base.successTargetBasisPoints ?? 9900, 9900, 0, 10000),
    partialFailureBudgetBasisPoints: boundedInteger(base.partialFailureBudgetBasisPoints ?? 100, 100, 0, 10000),
    maximumQueueWaitMs: boundedInteger(base.maximumQueueWaitMs ?? 300000, 300000, 1, OBSERVABILITY_LIMITS.maximumSloDurationMs),
    maximumRunDurationMs: boundedInteger(base.maximumRunDurationMs ?? 1800000, 1800000, 1, OBSERVABILITY_LIMITS.maximumSloDurationMs),
    maximumNodeDurationMs: boundedInteger(base.maximumNodeDurationMs ?? 300000, 300000, 1, OBSERVABILITY_LIMITS.maximumSloDurationMs),
    maximumRecoveryDurationMs: boundedInteger(base.maximumRecoveryDurationMs ?? 900000, 900000, 1, OBSERVABILITY_LIMITS.maximumSloDurationMs),
    maximumCompensationDurationMs: boundedInteger(base.maximumCompensationDurationMs ?? 900000, 900000, 1, OBSERVABILITY_LIMITS.maximumSloDurationMs),
    maximumApprovalWaitMs: boundedInteger(base.maximumApprovalWaitMs ?? 86400000, 86400000, 1, OBSERVABILITY_LIMITS.maximumSloDurationMs),
    maximumInterventionWaitMs: boundedInteger(base.maximumInterventionWaitMs ?? 86400000, 86400000, 1, OBSERVABILITY_LIMITS.maximumSloDurationMs),
    maximumRetryRateBasisPoints: boundedInteger(base.maximumRetryRateBasisPoints ?? 1000, 1000, 0, 10000),
    maximumFailureRateBasisPoints: boundedInteger(base.maximumFailureRateBasisPoints ?? 100, 100, 0, 10000),
    maximumStuckRunCount: boundedInteger(base.maximumStuckRunCount ?? 0, 0, 0, 100000),
    evaluationWindow: SLO_EVALUATION_WINDOWS.includes(base.evaluationWindow) ? base.evaluationWindow : 'rolling_24h',
    minimumSampleSize: boundedInteger(base.minimumSampleSize ?? 10, 10, 1, 100000),
    burnRateWindows: (base.burnRateWindows || []).slice(0, 5).map((window) => ({
      window: SLO_EVALUATION_WINDOWS.includes(window.window) ? window.window : 'rolling_24h',
      burnRateThresholdScaledInteger: boundedInteger(window.burnRateThresholdScaledInteger ?? 1000, 1000, 0, 100000),
      signalType: ALERT_SIGNAL_TYPES.includes(window.signalType) ? window.signalType : 'error_budget_burn',
    })),
    alertPolicyIds: [...new Set((base.alertPolicyIds || []).map(idOf).filter(Boolean))],
  };
}

function digest(value, purpose = 'orchestration-observability') {
  return secureDigest(purpose, canonicalize(redactSecrets(value)));
}

function validateSloPolicyDocument(policyInput = {}, options = {}) {
  const policy = plain(policyInput);
  const errors = [];
  if (!policy.name) errors.push({ path: 'name', code: 'SLO_NAME_REQUIRED', message: 'SLO policy name is required.' });
  if (!SLO_POLICY_STATUSES.includes(policy.status || 'draft')) errors.push({ path: 'status', code: 'SLO_STATUS_INVALID', message: 'SLO status is invalid.' });
  if (!SLO_EVALUATION_WINDOWS.includes(policy.evaluationWindow)) errors.push({ path: 'evaluationWindow', code: 'SLO_WINDOW_INVALID', message: 'SLO evaluation window is invalid.' });
  for (const field of ['availabilityTargetBasisPoints', 'successTargetBasisPoints', 'partialFailureBudgetBasisPoints', 'maximumRetryRateBasisPoints', 'maximumFailureRateBasisPoints']) {
    const value = Number(policy[field]);
    if (!Number.isInteger(value) || value < 0 || value > 10000) {
      errors.push({ path: field, code: 'SLO_BASIS_POINTS_INVALID', message: 'SLO percentage fields must use bounded basis points.' });
    }
  }
  for (const field of ['maximumQueueWaitMs', 'maximumRunDurationMs', 'maximumNodeDurationMs', 'maximumRecoveryDurationMs', 'maximumCompensationDurationMs', 'maximumApprovalWaitMs', 'maximumInterventionWaitMs']) {
    const value = Number(policy[field]);
    if (!Number.isInteger(value) || value < 1 || value > OBSERVABILITY_LIMITS.maximumSloDurationMs) {
      errors.push({ path: field, code: 'SLO_DURATION_INVALID', message: 'SLO durations must be bounded integer milliseconds.' });
    }
  }
  if (options.activation && policy.status !== 'draft' && policy.status !== 'active') {
    errors.push({ path: 'status', code: 'SLO_ACTIVATION_STATUS_INVALID', message: 'Only draft SLO policies can be activated.' });
  }
  return {
    valid: errors.length === 0,
    errors,
    validationDigest: digest(normalizeSloPolicyInput(policy), 'orchestration-slo-policy'),
  };
}

function runMatchesSlo(policy, run) {
  const definitionIds = (policy.appliesToDefinitionIds || []).map(idOf);
  if (definitionIds.length && !definitionIds.includes(idOf(run.definitionId))) return false;
  return true;
}

function evaluateSloPolicy(policyInput = {}, runInputs = [], nodeInputs = [], healthInputs = [], options = {}) {
  const policy = normalizeSloPolicyInput(policyInput);
  const now = asDate(options.now) || new Date();
  const windowEnd = asDate(options.windowEnd) || now;
  const windowStart = asDate(options.windowStart) || new Date(windowEnd.getTime() - windowDurationMs(policy.evaluationWindow));
  const runs = runInputs.map(plain).filter((run) => {
    const completedAt = asDate(run.completedAt || run.updatedAt || run.createdAt);
    return completedAt && completedAt >= windowStart && completedAt <= windowEnd && runMatchesSlo(policy, run);
  });
  const runIds = new Set(runs.map(idOf));
  const nodes = nodeInputs.map(plain).filter((node) => runIds.has(idOf(node.orchestrationRunId)));
  const health = healthInputs.map(plain).filter((item) => runIds.has(idOf(item.orchestrationRunId)));
  const sampleSize = runs.length;
  const terminalFailures = runs.filter((run) => run.status === 'failed').length;
  const partialFailures = runs.filter((run) => run.status === 'partial_failure').length;
  const cancelled = runs.filter((run) => run.status === 'cancelled').length;
  const successes = runs.filter((run) => run.status === 'succeeded').length;
  const retryingNodes = nodes.filter((node) => Number(node.attempt || 0) > 1).length;
  const queueCompliant = nodes.filter((node) => nodeTiming(node).queueWaitMs <= policy.maximumQueueWaitMs).length;
  const nodeDurationCompliant = nodes.filter((node) => nodeTiming(node).executionMs <= policy.maximumNodeDurationMs).length;
  const runDurationCompliant = runs.filter((run) => {
    const duration = run.durationMs ?? elapsed(run.startedAt || run.createdAt, run.completedAt || windowEnd);
    return duration <= policy.maximumRunDurationMs;
  }).length;
  const stuckRunCount = health.filter((item) => item.healthCategory === 'stuck').length;
  const successRateBasisPoints = basisPoints(successes, sampleSize);
  const failureRateBasisPoints = basisPoints(terminalFailures + cancelled, sampleSize);
  const partialFailureRateBasisPoints = basisPoints(partialFailures, sampleSize);
  const retryRateBasisPoints = basisPoints(retryingNodes, Math.max(nodes.length, 1));
  const safeBreachReasons = [];
  if (sampleSize < policy.minimumSampleSize) safeBreachReasons.push('SLO_INSUFFICIENT_SAMPLE');
  if (successRateBasisPoints < policy.successTargetBasisPoints) safeBreachReasons.push('SLO_SUCCESS_RATE_BELOW_TARGET');
  if (failureRateBasisPoints > policy.maximumFailureRateBasisPoints) safeBreachReasons.push('SLO_FAILURE_RATE_ABOVE_TARGET');
  if (partialFailureRateBasisPoints > policy.partialFailureBudgetBasisPoints) safeBreachReasons.push('SLO_PARTIAL_FAILURE_BUDGET_EXCEEDED');
  if (retryRateBasisPoints > policy.maximumRetryRateBasisPoints) safeBreachReasons.push('SLO_RETRY_RATE_ABOVE_TARGET');
  if (stuckRunCount > policy.maximumStuckRunCount) safeBreachReasons.push('SLO_STUCK_RUN_COUNT_EXCEEDED');
  const errorBudget = Math.max(0, 10000 - policy.successTargetBasisPoints);
  const consumed = Math.max(0, policy.successTargetBasisPoints - successRateBasisPoints);
  const errorBudgetRemainingBasisPoints = errorBudget === 0 ? (consumed ? 0 : 10000) : Math.max(0, errorBudget - consumed);
  const burnRateScaledInteger = errorBudget === 0 ? (consumed ? 100000 : 0) : Math.round((consumed / errorBudget) * 1000);
  let evaluationStatus = 'healthy';
  if (sampleSize < policy.minimumSampleSize) evaluationStatus = 'insufficient_data';
  else if (safeBreachReasons.length) evaluationStatus = 'breached';
  else if (burnRateScaledInteger >= 700) evaluationStatus = 'at_risk';
  return {
    sloPolicyVersion: Number(policyInput.version || 1),
    windowStart,
    windowEnd,
    evaluationStatus,
    sampleSize,
    successRateBasisPoints,
    failureRateBasisPoints,
    partialFailureRateBasisPoints,
    retryRateBasisPoints,
    queueWaitComplianceBasisPoints: basisPoints(queueCompliant, Math.max(nodes.length, 1)),
    runDurationComplianceBasisPoints: basisPoints(runDurationCompliant, Math.max(sampleSize, 1)),
    nodeDurationComplianceBasisPoints: basisPoints(nodeDurationCompliant, Math.max(nodes.length, 1)),
    recoveryComplianceBasisPoints: 10000,
    compensationComplianceBasisPoints: 10000,
    errorBudgetRemainingBasisPoints,
    burnRateScaledInteger,
    stuckRunCount,
    cancellationRateBasisPoints: basisPoints(cancelled, sampleSize),
    terminalFailureRateBasisPoints: basisPoints(terminalFailures, sampleSize),
    safeBreachReasons: [...new Set(safeBreachReasons)].map((reason) => safeCode(reason)),
    generatedAt: now,
  };
}

function normalizeAlertRuleInput(input = {}, current = {}) {
  const base = { ...plain(current), ...input };
  const status = String(base.status || current.status || 'draft').toLowerCase();
  return {
    name: clean(base.name || current.name, 200),
    description: clean(base.description || '', 2000),
    status: ALERT_RULE_STATUSES.includes(status) ? status : 'draft',
    signalType: ALERT_SIGNAL_TYPES.includes(base.signalType) ? base.signalType : 'slo_breach',
    threshold: boundedInteger(base.threshold ?? 1, 1, 0, 1000000000),
    comparison: ALERT_COMPARISONS.includes(base.comparison) ? base.comparison : 'greater_than_or_equal',
    evaluationWindow: SLO_EVALUATION_WINDOWS.includes(base.evaluationWindow) ? base.evaluationWindow : 'rolling_24h',
    minimumSampleSize: boundedInteger(base.minimumSampleSize ?? 1, 1, 1, 100000),
    severity: ['info', 'warning', 'high', 'critical'].includes(base.severity) ? base.severity : 'warning',
    notificationChannels: (base.notificationChannels || []).slice(0, 10).map((channel) => ({
      channelType: ['incident', 'compliance_notification', 'audit_only'].includes(channel.channelType) ? channel.channelType : 'audit_only',
      targetId: clean(channel.targetId, 128) || undefined,
    })),
    createIncident: base.createIncident === true,
    suppressionWindowMs: boundedInteger(base.suppressionWindowMs ?? 0, 0, 0, OBSERVABILITY_LIMITS.maximumSuppressionWindowMs),
    deduplicationWindowMs: boundedInteger(base.deduplicationWindowMs ?? 3600000, 3600000, 0, OBSERVABILITY_LIMITS.maximumSuppressionWindowMs),
    autoResolve: base.autoResolve !== false,
  };
}

function validateAlertRuleDocument(ruleInput = {}) {
  const rule = plain(ruleInput);
  const errors = [];
  if (!rule.name) errors.push({ path: 'name', code: 'ALERT_RULE_NAME_REQUIRED', message: 'Alert-rule name is required.' });
  if (!ALERT_SIGNAL_TYPES.includes(rule.signalType)) errors.push({ path: 'signalType', code: 'ALERT_RULE_SIGNAL_INVALID', message: 'Alert signal is invalid.' });
  if (!ALERT_COMPARISONS.includes(rule.comparison)) errors.push({ path: 'comparison', code: 'ALERT_RULE_COMPARISON_INVALID', message: 'Alert comparison is invalid.' });
  if (!Number.isFinite(Number(rule.threshold))) errors.push({ path: 'threshold', code: 'ALERT_RULE_THRESHOLD_INVALID', message: 'Alert threshold must be a finite number.' });
  return {
    valid: errors.length === 0,
    errors,
    validationDigest: digest(normalizeAlertRuleInput(rule), 'orchestration-alert-rule'),
  };
}

function comparisonPasses(comparison, observed, threshold) {
  const left = Number(observed);
  const right = Number(threshold);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  return {
    greater_than: left > right,
    greater_than_or_equal: left >= right,
    less_than: left < right,
    less_than_or_equal: left <= right,
    equals: left === right,
  }[comparison] === true;
}

function alertFingerprint(ruleInput = {}, signalInput = {}) {
  const rule = plain(ruleInput);
  const signal = plain(signalInput);
  return secureDigest(
    'orchestration-alert-fingerprint',
    canonicalize({
      organizationId: rule.organizationId,
      workspaceId: rule.workspaceId,
      alertRuleId: idOf(rule),
      alertRuleVersion: Number(rule.version || 1),
      signalType: rule.signalType,
      severity: rule.severity,
      reasonCodes: [...new Set(signal.safeReasonCodes || signal.safeBreachReasons || [])].sort(),
      category: signal.category || signal.evaluationStatus || 'signal',
    }),
  );
}

function evaluateAlertRuleSignal(ruleInput = {}, signalInput = {}) {
  const rule = plain(ruleInput);
  const signal = plain(signalInput);
  const observed = Number(signal.observedValue ?? signal.value ?? signal.count ?? 0);
  const sampleSize = Number(signal.sampleSize ?? 1);
  const open = sampleSize >= Number(rule.minimumSampleSize || 1) && comparisonPasses(rule.comparison, observed, rule.threshold);
  return {
    open,
    observedValue: observed,
    fingerprint: alertFingerprint(rule, signal),
    safeSummary: safeText(signal.safeSummary || `${rule.signalType} ${open ? 'matched' : 'cleared'}.`),
    safeReasonCodes: [...new Set(signal.safeReasonCodes || signal.safeBreachReasons || [safeCode(rule.signalType.toUpperCase())])].map((reason) => safeCode(reason)),
    affectedDefinitionCount: boundedInteger(signal.affectedDefinitionCount || 0, 0, 0, 1000000),
    affectedRunCount: boundedInteger(signal.affectedRunCount || 0, 0, 0, 1000000),
    affectedWorkerCount: boundedInteger(signal.affectedWorkerCount || 0, 0, 0, 1000000),
  };
}

function deduplicateAlertInstance(existingInput, ruleInput, signalInput, options = {}) {
  const now = asDate(options.now) || new Date();
  const rule = plain(ruleInput);
  const evaluated = evaluateAlertRuleSignal(rule, signalInput);
  if (!evaluated.open) return { action: 'none', alert: null, evaluated };
  const existing = plain(existingInput);
  if (existing && existing.fingerprint === evaluated.fingerprint && ['open', 'acknowledged', 'suppressed'].includes(existing.status)) {
    return {
      action: 'deduplicated',
      alert: {
        ...existing,
        lastObservedAt: now,
        occurrenceCount: Number(existing.occurrenceCount || 1) + 1,
        safeSummary: evaluated.safeSummary,
      },
      evaluated,
    };
  }
  return {
    action: 'opened',
    alert: {
      alertRuleId: idOf(rule),
      alertRuleVersion: Number(rule.version || 1),
      status: 'open',
      severity: rule.severity || 'warning',
      signalType: rule.signalType,
      fingerprint: evaluated.fingerprint,
      safeSummary: evaluated.safeSummary,
      safeReasonCodes: evaluated.safeReasonCodes,
      affectedDefinitionCount: evaluated.affectedDefinitionCount,
      affectedRunCount: evaluated.affectedRunCount,
      affectedWorkerCount: evaluated.affectedWorkerCount,
      firstObservedAt: now,
      lastObservedAt: now,
      occurrenceCount: 1,
    },
    evaluated,
  };
}

function summarizeWorkerFleet(workerInputs = [], nodeInputs = [], compensationInputs = [], options = {}) {
  const now = asDate(options.now) || new Date();
  const staleMs = options.staleMs || OBSERVABILITY_LIMITS.defaultHeartbeatStaleMs;
  const workers = workerInputs.map(plain);
  const activeWorkers = workers.filter((worker) => worker.lastHeartbeatAt && now - new Date(worker.lastHeartbeatAt) <= staleMs);
  const unhealthyWorkers = workers.filter((worker) => worker.status === 'unhealthy' || !worker.lastHeartbeatAt || now - new Date(worker.lastHeartbeatAt) > staleMs);
  const claimedNodeCount = nodeInputs.filter((node) => node.leaseOwner).length;
  const claimedCompensationCount = compensationInputs.filter((item) => item.leaseOwner).length;
  return {
    configuredWorkers: workers.length,
    activeWorkers: activeWorkers.length,
    idleWorkers: activeWorkers.filter((worker) => Number(worker.activeWorkCount || 0) === 0).length,
    drainingWorkers: workers.filter((worker) => worker.draining === true || worker.status === 'draining').length,
    unhealthyWorkers: unhealthyWorkers.length,
    workerHeartbeatAgeMs: workers.map((worker) => (worker.lastHeartbeatAt ? now - new Date(worker.lastHeartbeatAt) : null)).filter(Number.isFinite),
    claimedNodeCount,
    claimedCompensationCount,
    queueDepth: nodeInputs.filter((node) => ['ready', 'queued', 'retry_wait'].includes(node.status)).length,
    oldestQueuedItemAgeMs: Math.max(0, ...nodeInputs.filter((node) => ['ready', 'queued', 'retry_wait'].includes(node.status)).map((node) => (node.createdAt ? now - new Date(node.createdAt) : 0))),
    leaseExpiryCount: nodeInputs.filter((node) => node.leaseExpiresAt && new Date(node.leaseExpiresAt) < now).length,
    recoveredLeaseCount: Number(options.recoveredLeaseCount || 0),
    claimConflictCount: Number(options.claimConflictCount || 0),
    executionThroughput: Number(options.executionThroughput || 0),
    failureCategoryCounts: options.failureCategoryCounts || {},
    status: unhealthyWorkers.length ? 'degraded' : activeWorkers.length ? 'healthy' : 'unavailable',
  };
}

function queueSummary(name, items = [], now = new Date()) {
  const queued = items.filter((item) => ['ready', 'queued', 'retry_wait', 'pending'].includes(item.status));
  const completed = items.filter((item) => ['succeeded', 'completed', 'cancelled', 'failed'].includes(item.status));
  return {
    queue: name,
    depth: queued.length,
    oldestItemAgeMs: Math.max(0, ...queued.map((item) => (item.createdAt || item.availableAt ? now - new Date(item.createdAt || item.availableAt) : 0))),
    enqueueRate: 0,
    claimRate: 0,
    completionRate: completed.length,
    failureRate: items.filter((item) => ['failed', 'dead_lettered', 'compensation_failed'].includes(item.status)).length,
    retryRate: items.filter((item) => item.status === 'retry_wait' || item.status === 'retry_scheduled').length,
    expiredLeaseCount: items.filter((item) => item.leaseExpiresAt && new Date(item.leaseExpiresAt) < now).length,
    deadLetterCount: items.filter((item) => item.status === 'dead_lettered').length,
  };
}

function summarizeQueues(input = {}, options = {}) {
  const now = asDate(options.now) || new Date();
  const nodes = (input.nodes || []).map(plain);
  const runtimeWork = (input.runtimeWork || []).map(plain);
  const compensations = (input.compensations || []).map(plain);
  const interventions = (input.interventions || []).map(plain);
  const checkpoints = (input.checkpoints || []).map(plain);
  return [
    queueSummary('orchestration-node', nodes, now),
    queueSummary('retry', nodes.filter((node) => node.status === 'retry_wait'), now),
    queueSummary('recovery', nodes.filter((node) => ['recovery_pending', 'recovering'].includes(node.status)), now),
    queueSummary('compensation', compensations, now),
    queueSummary('intervention-expiry', interventions, now),
    queueSummary('checkpoint', checkpoints, now),
    queueSummary('runtime-work', runtimeWork, now),
  ];
}

function idempotencyDiagnostic(recordInput = {}) {
  const record = plain(recordInput);
  if (record.idempotencyReplayed || record.replayed) return { category: 'idempotent_replay', safeReasonCode: 'IDEMPOTENT_REPLAY' };
  if (record.clientIdempotencyProvided === true) return { category: 'client_keyed', safeReasonCode: 'CLIENT_IDEMPOTENCY_KEY' };
  if (record.outcomeUnknown === true || record.recoveryReasonCode === 'REMOTE_OUTCOME_UNKNOWN') {
    return { category: 'outcome_unknown', safeReasonCode: 'OUTCOME_UNKNOWN' };
  }
  if (record.retryState === 'scheduled' || record.status === 'retry_wait') return { category: 'retry_replay_pending', safeReasonCode: 'RETRY_REPLAY_PENDING' };
  return { category: 'standard_execution', safeReasonCode: 'STANDARD_EXECUTION' };
}

function assertSafeExportContent(value) {
  const serialized = JSON.stringify(redactSecrets(value));
  if (SAFE_EXPORT_DENY_PATTERN.test(serialized)) {
    throw new AppError(500, 'ORCHESTRATION_DIAGNOSTIC_EXPORT_UNSAFE', 'Diagnostic export contained unsafe data.');
  }
  return JSON.parse(serialized);
}

function metricLabelsAreBounded(snapshot = {}) {
  const bad = [];
  for (const key of Object.keys(snapshot.counters || {})) {
    const labelBlock = key.match(/\{([^}]*)\}/)?.[1] || '';
    for (const label of labelBlock.split(',').filter(Boolean)) {
      const labelName = label.split('=')[0];
      if (!BOUNDED_METRIC_LABELS.includes(labelName) || HIGH_CARDINALITY_METRIC_LABELS.has(labelName)) {
        bad.push(labelName);
      }
    }
  }
  return { safe: bad.length === 0, unsafeLabels: [...new Set(bad)].sort() };
}

function filterQuarantinedCandidates(candidates = [], quarantinedConnectionIds = []) {
  const quarantined = new Set(quarantinedConnectionIds.map(idOf));
  return candidates.filter((candidate) => !quarantined.has(idOf(candidate.connectionId)));
}

function quarantineDecision(connectionId, quarantinedConnectionIds = []) {
  const quarantined = new Set(quarantinedConnectionIds.map(idOf));
  const blocked = quarantined.has(idOf(connectionId));
  return {
    allowed: !blocked,
    reasonCode: blocked ? 'ORCHESTRATION_CONNECTION_QUARANTINED' : 'ORCHESTRATION_CONNECTION_AVAILABLE',
  };
}

function fleetControlGuardDecision(input = {}) {
  if (input.workspacePaused) {
    return { allowed: false, reasonCode: 'ORCHESTRATION_WORKSPACE_PAUSED' };
  }
  if (input.definitionPaused) {
    return { allowed: false, reasonCode: 'ORCHESTRATION_DEFINITION_PAUSED' };
  }
  if (input.workersDraining) {
    return { allowed: false, reasonCode: 'ORCHESTRATION_WORKERS_DRAINING' };
  }
  if (input.connectionQuarantined) {
    return { allowed: false, reasonCode: 'ORCHESTRATION_CONNECTION_QUARANTINED' };
  }
  return { allowed: true, reasonCode: 'ORCHESTRATION_OPERATION_ALLOWED' };
}

async function activeControl(scope, scopeType, scopeId, statuses) {
  if (mongoose.connection.readyState !== 1) return null;
  return OrchestrationFleetControl.findOne({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    scopeType,
    scopeId: clean(scopeId, 160),
    status: { $in: statuses },
  }).lean();
}

async function assertWorkspaceNotPaused(scope) {
  const control = await activeControl(scope, 'workspace', scope.workspaceId, ['paused']);
  if (control) {
    throw new AppError(409, 'ORCHESTRATION_WORKSPACE_PAUSED', 'Workspace orchestration is paused.');
  }
  return true;
}

async function assertDefinitionNotPaused(definitionId, scope) {
  const control = await activeControl(scope, 'definition', idOf(definitionId), ['paused']);
  if (control) {
    throw new AppError(409, 'ORCHESTRATION_DEFINITION_PAUSED', 'Orchestration definition is paused.');
  }
  return true;
}

async function assertWorkersNotDraining(scopeInput = {}) {
  const scope = {
    organizationId: idOf(scopeInput.organizationId || scopeInput.partnerId),
    workspaceId: clean(scopeInput.workspaceId || scopeInput.receivingWorkspaceId, 128),
  };
  if (!scope.organizationId || !scope.workspaceId) return true;
  const control = await activeControl(scope, 'workers', 'orchestration-workers', ['draining']);
  if (control) {
    throw new AppError(503, 'ORCHESTRATION_WORKERS_DRAINING', 'Orchestration workers are draining.');
  }
  return true;
}

async function assertConnectionNotQuarantined(connectionId, scopeInput = {}) {
  const scope = {
    organizationId: idOf(scopeInput.organizationId || scopeInput.partnerId),
    workspaceId: clean(scopeInput.workspaceId || scopeInput.receivingWorkspaceId, 128),
  };
  if (!scope.organizationId || !scope.workspaceId) return true;
  const control = await activeControl(scope, 'connection', idOf(connectionId), ['quarantined']);
  if (control) {
    throw new AppError(409, 'ORCHESTRATION_CONNECTION_QUARANTINED', 'Connection is quarantined for orchestration.');
  }
  return true;
}

async function listQuarantinedConnectionIds(scope) {
  if (mongoose.connection.readyState !== 1) return [];
  const controls = await OrchestrationFleetControl.find({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    scopeType: 'connection',
    status: 'quarantined',
  }).select('scopeId').lean();
  return controls.map((control) => control.scopeId);
}

async function createOrReleaseControl(action, input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  const actionKey = clean(action, 80);
  if (!FLEET_CONTROL_ACTIONS.includes(actionKey)) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Fleet-control action is invalid.');
  }
  await authorize('orchestrationOperations.control', 'OrchestrationFleetControl', input.scopeId || scope.workspaceId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'LIFECYCLE_CONTROL' });
  const mapping = {
    pause_workspace: ['workspace', scope.workspaceId, 'paused'],
    resume_workspace: ['workspace', scope.workspaceId, 'released'],
    drain_workers: ['workers', 'orchestration-workers', 'draining'],
    resume_workers: ['workers', 'orchestration-workers', 'released'],
    pause_definition: ['definition', idOf(input.definitionId || input.scopeId), 'paused'],
    resume_definition: ['definition', idOf(input.definitionId || input.scopeId), 'released'],
    quarantine_connection: ['connection', idOf(input.connectionId || input.scopeId), 'quarantined'],
    unquarantine_connection: ['connection', idOf(input.connectionId || input.scopeId), 'released'],
  };
  const [scopeType, scopeId, targetStatus] = mapping[actionKey];
  if (!scopeId) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Fleet-control target is required.');
  const now = new Date();
  if (targetStatus === 'released') {
    const result = await OrchestrationFleetControl.updateMany(
      {
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        scopeType,
        scopeId,
        status: { $in: ['paused', 'draining', 'quarantined'] },
      },
      { $set: { status: 'released', releasedBy: scope.actorId, releasedAt: now } },
    );
    await audit(`orchestration.operations.${actionKey}`, 'OrchestrationFleetControl', scopeId, scope, {
      scopeType,
      scopeId,
      releasedCount: result.modifiedCount,
      safeReasonCode: safeCode(input.safeReasonCode || 'OPERATIONAL_RELEASE'),
    });
    return { scopeType, scopeId, status: 'released', releasedCount: result.modifiedCount };
  }
  const control = await OrchestrationFleetControl.findOneAndUpdate(
    {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      scopeType,
      scopeId,
      status: targetStatus,
    },
    {
      $setOnInsert: {
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        scopeType,
        scopeId,
        status: targetStatus,
        action: actionKey,
        safeReasonCode: safeCode(input.safeReasonCode || 'OPERATIONAL_CONTROL_REQUESTED'),
        safeReason: safeText(input.safeReason || input.reason || 'Operator control requested.'),
        requestedBy: scope.actorId,
        requestedAt: now,
        traceId: scope.traceId,
        requestId: scope.requestId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );
  await audit(`orchestration.operations.${actionKey}`, 'OrchestrationFleetControl', control, scope, {
    scopeType,
    scopeId,
    status: targetStatus,
    safeReasonCode: control.safeReasonCode,
  });
  return {
    controlId: idOf(control),
    scopeType,
    scopeId,
    status: control.status,
    safeReasonCode: control.safeReasonCode,
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
  if (options.privateFields) query.select('+definitionSnapshot +recoveryPolicySnapshot');
  if (options.lean !== false) query.lean();
  const run = await query;
  if (!run) throw new AppError(404, ErrorCodes.ORCHESTRATION_RUN_NOT_FOUND, 'Orchestration run was not found.');
  return run;
}

async function loadRunObservabilityRecords(runId, scope) {
  const run = await scopedRun(runId, scope, { privateFields: true });
  const [
    nodes,
    audits,
    selections,
    delegationGrants,
    delegationInvocations,
    compensations,
    approvalRequests,
    recoveryDecisions,
    compensationPlans,
    interventions,
    checkpoints,
    invocations,
    incidents,
  ] = await Promise.all([
    OrchestrationNodeRun.find({ orchestrationRunId: run._id, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).lean(),
    AuditLog.find({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      $or: [
        { 'metadata.orchestrationRunId': idOf(run._id) },
        { entityType: 'OrchestrationRun', entityId: idOf(run._id) },
      ],
    }).sort({ createdAt: 1, _id: 1 }).limit(OBSERVABILITY_LIMITS.maximumExportRecords).lean(),
    AgentSelectionDecision.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, orchestrationRunId: run._id }).lean(),
    InterAgentDelegationGrant.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, orchestrationRunId: run._id }).lean(),
    InterAgentDelegationInvocation.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, orchestrationRunId: run._id }).lean(),
    OrchestrationCompensationRun.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, orchestrationRunId: run._id }).lean(),
    ApprovalRequest.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, orchestrationRunId: idOf(run._id) }).lean(),
    OrchestrationRecoveryDecision.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, orchestrationRunId: run._id }).lean(),
    OrchestrationCompensationPlan.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, orchestrationRunId: run._id }).lean(),
    OrchestrationInterventionRequest.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, orchestrationRunId: run._id }).lean(),
    OrchestrationCheckpoint.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, orchestrationRunId: run._id }).lean(),
    Invocation.find({
      receivingWorkspaceId: scope.workspaceId,
      $or: [
        { 'orchestrationContext.orchestrationRunId': idOf(run._id) },
        { 'delegationContext.orchestrationRunId': idOf(run._id) },
        { 'compensationContext.orchestrationRunId': idOf(run._id) },
      ],
    }).select('+orchestrationContext +delegationContext +compensationContext').lean(),
    OperationalIncident.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, 'metadata.orchestrationRunId': idOf(run._id) }).lean().catch(() => []),
  ]);
  return {
    run,
    nodes,
    audits,
    selections,
    delegationGrants,
    delegationInvocations,
    compensations,
    approvalRequests,
    recoveryDecisions,
    compensationPlans,
    interventions,
    checkpoints,
    invocations,
    incidents,
  };
}

async function rebuildTimelineForRun(runId, input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationObservability.read', 'OrchestrationTimelineEvent', runId, scope, caller);
  const records = await loadRunObservabilityRecords(runId, scope);
  const events = deriveTimelineEvents(records);
  if (events.length) {
    await OrchestrationTimelineEvent.bulkWrite(
      events.map((event) => ({
        updateOne: {
          filter: {
            organizationId: event.organizationId,
            workspaceId: event.workspaceId,
            orchestrationRunId: event.orchestrationRunId,
            sourceCollection: event.sourceCollection,
            sourceRecordId: event.sourceRecordId,
            eventType: event.eventType,
          },
          update: { $set: event, $setOnInsert: { ingestedAt: new Date() } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }
  orchestrationMetrics.increment('orchestration_timeline_rebuilds', { status: 'completed' });
  await audit('orchestration.observability.timeline.rebuilt', 'OrchestrationRun', runId, scope, {
    eventCount: events.length,
  });
  return { items: events, rebuilt: events.length };
}

async function listRunTimeline(runId, input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationObservability.read', 'OrchestrationTimelineEvent', runId, scope, caller);
  await scopedRun(runId, scope);
  const pagination = paging(input);
  let total = await OrchestrationTimelineEvent.countDocuments({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    orchestrationRunId: runId,
  });
  if (!total) {
    const rebuilt = await rebuildTimelineForRun(runId, input, caller);
    total = rebuilt.items.length;
  }
  const items = await OrchestrationTimelineEvent.find({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    orchestrationRunId: runId,
  })
    .sort({ occurredAt: 1, sequence: 1, sourceRecordId: 1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();
  return { items, pagination: { page: pagination.page, limit: pagination.limit, total } };
}

async function rebuildTraceForRun(runId, input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationObservability.trace.read', 'OrchestrationTraceSpan', runId, scope, caller);
  const records = await loadRunObservabilityRecords(runId, scope);
  const spans = deriveTraceSpans(records);
  const validation = validateTraceSpans(spans, {
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    orchestrationRunId: runId,
  });
  if (spans.length) {
    await OrchestrationTraceSpan.bulkWrite(
      spans.map((span) => ({
        updateOne: {
          filter: {
            organizationId: span.organizationId,
            workspaceId: span.workspaceId,
            traceId: span.traceId,
            spanId: span.spanId,
          },
          update: { $set: span, $setOnInsert: { createdAt: new Date() } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }
  await audit(
    validation.valid
      ? 'orchestration.observability.trace.validated'
      : 'orchestration.observability.trace.anomaly_detected',
    'OrchestrationRun',
    runId,
    scope,
    { spanCount: spans.length, anomalyCodes: validation.anomalies.map((item) => item.code) },
  );
  orchestrationMetrics.increment('orchestration_trace_integrity_failures', {}, validation.anomalies.length);
  return { items: spans, validation };
}

async function getRunTrace(runId, input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationObservability.trace.read', 'OrchestrationTraceSpan', runId, scope, caller);
  await scopedRun(runId, scope);
  let items = await OrchestrationTraceSpan.find({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    orchestrationRunId: runId,
  }).sort({ startedAt: 1, spanId: 1 }).lean();
  if (!items.length) {
    const rebuilt = await rebuildTraceForRun(runId, input, caller);
    items = rebuilt.items;
  }
  const validation = validateTraceSpans(items, {
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    orchestrationRunId: runId,
  });
  return { items, validation };
}

async function getRunHealth(runId, input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationObservability.read', 'OrchestrationRunHealthSummary', runId, scope, caller);
  const run = await scopedRun(runId, scope, { privateFields: true });
  const nodes = await OrchestrationNodeRun.find({ orchestrationRunId: run._id, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).lean();
  const controls = await OrchestrationFleetControl.find({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    status: { $in: ['paused', 'draining'] },
    $or: [
      { scopeType: 'workspace', scopeId: scope.workspaceId },
      { scopeType: 'definition', scopeId: idOf(run.definitionId) },
      { scopeType: 'workers', scopeId: 'orchestration-workers' },
    ],
  }).lean();
  const summary = computeRunHealth(run, nodes, {
    paused: controls.some((control) => control.status === 'paused'),
    draining: controls.some((control) => control.status === 'draining'),
  });
  const stored = await OrchestrationRunHealthSummary.findOneAndUpdate(
    { organizationId: scope.organizationId, workspaceId: scope.workspaceId, orchestrationRunId: run._id },
    {
      $set: {
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        orchestrationDefinitionId: run.definitionId,
        orchestrationRunId: run._id,
        ...summary,
        snapshotAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );
  if (summary.healthCategory === 'stuck') {
    await audit('orchestration.observability.stuck_run.detected', 'OrchestrationRun', runId, scope, {
      safeReasonCodes: summary.safeHealthReasons,
    });
  }
  return plain(stored);
}

async function getRunCriticalPath(runId, input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationObservability.read', 'OrchestrationRun', runId, scope, caller);
  const run = await scopedRun(runId, scope, { privateFields: true });
  const nodes = await OrchestrationNodeRun.find({ orchestrationRunId: run._id, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).lean();
  return calculateCriticalPath(run.definitionSnapshot, nodes);
}

async function getRunObservability(runId, input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  const [timeline, trace, health, criticalPath] = await Promise.all([
    listRunTimeline(runId, input, caller),
    getRunTrace(runId, input, caller),
    getRunHealth(runId, input, caller),
    getRunCriticalPath(runId, input, caller),
  ]);
  const bottlenecks = detectBottlenecks({
    nodes: await OrchestrationNodeRun.find({
      orchestrationRunId: runId,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
    }).lean(),
  });
  return {
    summary: health,
    timeline: timeline.items,
    trace: trace.items,
    traceValidation: trace.validation,
    criticalPath,
    bottlenecks,
  };
}

async function operationsOverview(input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationObservability.read', 'OrchestrationOperationalSnapshot', null, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'SAFE_READ' });
  const [runRows, nodeRows, workers, runtimeWork, alerts, incidents, evaluations] = await Promise.all([
    OrchestrationRun.aggregate([
      { $match: { organizationId: scope.organizationId, workspaceId: scope.workspaceId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    OrchestrationNodeRun.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId }).lean(),
    RuntimeWorkerHeartbeat.find({}).lean(),
    RuntimeWorkItem.find({ receivingWorkspaceId: scope.workspaceId }).lean(),
    OrchestrationAlert.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, status: { $in: ['open', 'acknowledged', 'suppressed'] } }).lean(),
    OperationalIncident.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, status: { $ne: 'RESOLVED' } }).lean().catch(() => []),
    OrchestrationSloEvaluation.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId }).sort({ generatedAt: -1 }).limit(20).lean(),
  ]);
  const runSummary = Object.fromEntries(runRows.map((row) => [row._id, row.count]));
  const workerSummary = summarizeWorkerFleet(workers, nodeRows, [], {});
  const queueSummaryData = summarizeQueues({ nodes: nodeRows, runtimeWork }, {});
  const snapshot = await OrchestrationOperationalSnapshot.create({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    workerSummary,
    queueSummary: { queues: queueSummaryData },
    runSummary,
    alertSummary: {
      openAlerts: alerts.filter((alert) => alert.status === 'open').length,
      activeIncidents: incidents.length,
    },
    sloSummary: {
      breached: evaluations.filter((evaluation) => evaluation.evaluationStatus === 'breached').length,
      atRisk: evaluations.filter((evaluation) => evaluation.evaluationStatus === 'at_risk').length,
      healthy: evaluations.filter((evaluation) => evaluation.evaluationStatus === 'healthy').length,
    },
  });
  return {
    activeRuns: runSummary.running || 0,
    queuedRuns: runSummary.queued || 0,
    stuckRuns: await OrchestrationRunHealthSummary.countDocuments({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, healthCategory: 'stuck' }),
    waitingApprovals: nodeRows.filter((node) => node.status === 'waiting_approval').length,
    waitingInterventions: nodeRows.filter((node) => node.status === 'waiting_intervention').length,
    recoveringRuns: (runSummary.recovery_pending || 0) + (runSummary.recovering || 0),
    compensatingRuns: (runSummary.compensation_pending || 0) + (runSummary.compensating || 0),
    workerHealth: workerSummary,
    queues: queueSummaryData,
    openAlerts: alerts.filter((alert) => alert.status === 'open').length,
    activeIncidents: incidents.length,
    sloStatus: snapshot.sloSummary,
    snapshotId: idOf(snapshot),
  };
}

async function createSloPolicy(input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationSloPolicy.create', 'OrchestrationSloPolicy', null, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'PRIVILEGED_CONFIGURATION' });
  const normalized = normalizeSloPolicyInput(input);
  const validation = validateSloPolicyDocument(normalized);
  if (!validation.valid) throw new AppError(400, 'ORCHESTRATION_SLO_POLICY_INVALID', 'SLO policy validation failed.', validation.errors);
  const policy = await OrchestrationSloPolicy.create({
    ...normalized,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    version: 1,
    status: 'draft',
    createdBy: scope.actorId,
    updatedBy: scope.actorId,
    validationDigest: validation.validationDigest,
  });
  await audit('orchestration.slo.policy.created', 'OrchestrationSloPolicy', policy, scope, {
    version: policy.version,
    status: policy.status,
  });
  return serializeSloPolicy(policy);
}

function serializeSloPolicy(policyInput = {}) {
  const policy = plain(policyInput);
  return {
    sloPolicyId: idOf(policy),
    organizationId: policy.organizationId,
    workspaceId: policy.workspaceId,
    name: policy.name,
    description: policy.description || '',
    version: Number(policy.version || 1),
    status: policy.status,
    appliesToDefinitionIds: (policy.appliesToDefinitionIds || []).map(idOf),
    appliesToCapabilityCategories: policy.appliesToCapabilityCategories || [],
    appliesToCriticalityLevels: policy.appliesToCriticalityLevels || [],
    availabilityTargetBasisPoints: policy.availabilityTargetBasisPoints,
    successTargetBasisPoints: policy.successTargetBasisPoints,
    partialFailureBudgetBasisPoints: policy.partialFailureBudgetBasisPoints,
    maximumQueueWaitMs: policy.maximumQueueWaitMs,
    maximumRunDurationMs: policy.maximumRunDurationMs,
    maximumNodeDurationMs: policy.maximumNodeDurationMs,
    maximumRecoveryDurationMs: policy.maximumRecoveryDurationMs,
    maximumCompensationDurationMs: policy.maximumCompensationDurationMs,
    maximumApprovalWaitMs: policy.maximumApprovalWaitMs,
    maximumInterventionWaitMs: policy.maximumInterventionWaitMs,
    maximumRetryRateBasisPoints: policy.maximumRetryRateBasisPoints,
    maximumFailureRateBasisPoints: policy.maximumFailureRateBasisPoints,
    maximumStuckRunCount: policy.maximumStuckRunCount,
    evaluationWindow: policy.evaluationWindow,
    minimumSampleSize: policy.minimumSampleSize,
    burnRateWindows: policy.burnRateWindows || [],
    alertPolicyIds: (policy.alertPolicyIds || []).map(idOf),
    createdBy: policy.createdBy,
    updatedBy: policy.updatedBy,
    activatedBy: policy.activatedBy,
    archivedBy: policy.archivedBy,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
    activatedAt: policy.activatedAt,
    archivedAt: policy.archivedAt,
  };
}

async function listSloPolicies(input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationSloPolicy.read', 'OrchestrationSloPolicy', null, scope, caller);
  const pagination = paging(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (input.status) filter.status = clean(input.status, 32);
  const [items, total] = await Promise.all([
    OrchestrationSloPolicy.find(filter).sort({ updatedAt: -1, _id: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    OrchestrationSloPolicy.countDocuments(filter),
  ]);
  return { items: items.map(serializeSloPolicy), pagination: { page: pagination.page, limit: pagination.limit, total } };
}

async function updateSloPolicy(policyId, input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationSloPolicy.update', 'OrchestrationSloPolicy', policyId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'PRIVILEGED_CONFIGURATION' });
  const current = await OrchestrationSloPolicy.findOne({ _id: policyId, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).select('+validationDigest');
  if (!current) throw new AppError(404, 'ORCHESTRATION_SLO_POLICY_NOT_FOUND', 'SLO policy was not found.');
  if (current.status === 'archived') throw new AppError(409, 'ORCHESTRATION_SLO_POLICY_IMMUTABLE', 'Archived SLO policies are immutable.');
  const normalized = normalizeSloPolicyInput(input, current);
  const validation = validateSloPolicyDocument(normalized);
  if (!validation.valid) throw new AppError(400, 'ORCHESTRATION_SLO_POLICY_INVALID', 'SLO policy validation failed.', validation.errors);
  let updated;
  if (current.status === 'active') {
    const latest = await OrchestrationSloPolicy.findOne({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, name: current.name }).sort({ version: -1 }).select('version').lean();
    updated = await OrchestrationSloPolicy.create({
      ...normalized,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      version: Number(latest?.version || current.version) + 1,
      status: 'draft',
      createdBy: scope.actorId,
      updatedBy: scope.actorId,
      validationDigest: validation.validationDigest,
    });
  } else {
    Object.assign(current, normalized, { status: 'draft', updatedBy: scope.actorId, validationDigest: validation.validationDigest });
    updated = await current.save();
  }
  await audit('orchestration.slo.policy.updated', 'OrchestrationSloPolicy', updated, scope, { version: updated.version });
  return serializeSloPolicy(updated);
}

async function activateSloPolicy(policyId, input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationSloPolicy.activate', 'OrchestrationSloPolicy', policyId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'PRIVILEGED_CONFIGURATION' });
  const policy = await OrchestrationSloPolicy.findOne({ _id: policyId, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).select('+validationDigest');
  if (!policy) throw new AppError(404, 'ORCHESTRATION_SLO_POLICY_NOT_FOUND', 'SLO policy was not found.');
  if (policy.status === 'active') return serializeSloPolicy(policy);
  if (policy.status !== 'draft') throw new AppError(409, 'ORCHESTRATION_SLO_POLICY_IMMUTABLE', 'Only draft SLO policies can be activated.');
  const validation = validateSloPolicyDocument(policy.toObject(), { activation: true });
  if (!validation.valid) throw new AppError(400, 'ORCHESTRATION_SLO_POLICY_INVALID', 'SLO policy validation failed.', validation.errors);
  policy.status = 'active';
  policy.activatedBy = scope.actorId;
  policy.activatedAt = new Date();
  policy.validationDigest = validation.validationDigest;
  await policy.save();
  await audit('orchestration.slo.policy.activated', 'OrchestrationSloPolicy', policy, scope, { version: policy.version });
  return serializeSloPolicy(policy);
}

async function evaluateSloPolicyById(policyId, input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationSloPolicy.evaluate', 'OrchestrationSloPolicy', policyId, scope, caller);
  const policy = await OrchestrationSloPolicy.findOne({ _id: policyId, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).lean();
  if (!policy) throw new AppError(404, 'ORCHESTRATION_SLO_POLICY_NOT_FOUND', 'SLO policy was not found.');
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowDurationMs(policy.evaluationWindow));
  const [runs, nodes, health] = await Promise.all([
    OrchestrationRun.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, updatedAt: { $gte: windowStart, $lte: windowEnd } }).lean(),
    OrchestrationNodeRun.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, updatedAt: { $gte: windowStart } }).lean(),
    OrchestrationRunHealthSummary.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, updatedAt: { $gte: windowStart } }).lean(),
  ]);
  const evaluation = evaluateSloPolicy(policy, runs, nodes, health, { windowStart, windowEnd });
  const saved = await OrchestrationSloEvaluation.create({
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    sloPolicyId: policy._id,
    ...evaluation,
  });
  await audit('orchestration.slo.evaluated', 'OrchestrationSloEvaluation', saved, scope, {
    sloPolicyVersion: policy.version,
    evaluationStatus: evaluation.evaluationStatus,
    sampleSize: evaluation.sampleSize,
  });
  if (evaluation.evaluationStatus === 'breached') {
    await audit('orchestration.slo.breached', 'OrchestrationSloPolicy', policy, scope, {
      safeBreachReasons: evaluation.safeBreachReasons,
    });
  }
  return plain(saved);
}

async function listSloEvaluations(policyId, input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationSloPolicy.read', 'OrchestrationSloEvaluation', policyId, scope, caller);
  const pagination = paging(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (policyId) filter.sloPolicyId = policyId;
  const [items, total] = await Promise.all([
    OrchestrationSloEvaluation.find(filter).sort({ generatedAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    OrchestrationSloEvaluation.countDocuments(filter),
  ]);
  return { items, pagination: { page: pagination.page, limit: pagination.limit, total } };
}

async function createAlertRule(input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationAlertRule.create', 'OrchestrationAlertRule', null, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'PRIVILEGED_CONFIGURATION' });
  const normalized = normalizeAlertRuleInput(input);
  const validation = validateAlertRuleDocument(normalized);
  if (!validation.valid) throw new AppError(400, 'ORCHESTRATION_ALERT_RULE_INVALID', 'Alert-rule validation failed.', validation.errors);
  const rule = await OrchestrationAlertRule.create({
    ...normalized,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    version: 1,
    status: 'draft',
    createdBy: scope.actorId,
    updatedBy: scope.actorId,
    validationDigest: validation.validationDigest,
  });
  await audit('orchestration.alert.rule.created', 'OrchestrationAlertRule', rule, scope, { version: rule.version });
  return plain(rule);
}

async function listAlertRules(input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationAlertRule.read', 'OrchestrationAlertRule', null, scope, caller);
  const pagination = paging(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (input.status) filter.status = clean(input.status, 32);
  const [items, total] = await Promise.all([
    OrchestrationAlertRule.find(filter).sort({ updatedAt: -1, _id: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    OrchestrationAlertRule.countDocuments(filter),
  ]);
  return { items, pagination: { page: pagination.page, limit: pagination.limit, total } };
}

async function activateAlertRule(ruleId, input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationAlertRule.activate', 'OrchestrationAlertRule', ruleId, scope, caller);
  await assertOperationalAccess({ ...scope, operation: 'PRIVILEGED_CONFIGURATION' });
  const rule = await OrchestrationAlertRule.findOne({ _id: ruleId, organizationId: scope.organizationId, workspaceId: scope.workspaceId }).select('+validationDigest');
  if (!rule) throw new AppError(404, 'ORCHESTRATION_ALERT_RULE_NOT_FOUND', 'Alert rule was not found.');
  if (rule.status === 'active') return plain(rule);
  if (!['draft', 'muted'].includes(rule.status)) throw new AppError(409, 'ORCHESTRATION_ALERT_RULE_IMMUTABLE', 'Alert rule cannot be activated.');
  const validation = validateAlertRuleDocument(rule.toObject());
  if (!validation.valid) throw new AppError(400, 'ORCHESTRATION_ALERT_RULE_INVALID', 'Alert-rule validation failed.', validation.errors);
  rule.status = 'active';
  rule.activatedBy = scope.actorId;
  rule.activatedAt = new Date();
  rule.validationDigest = validation.validationDigest;
  await rule.save();
  await audit('orchestration.alert.rule.activated', 'OrchestrationAlertRule', rule, scope, { version: rule.version });
  return plain(rule);
}

async function openOrDeduplicateAlert(ruleInput, signalInput, scope, caller = {}) {
  const rule = plain(ruleInput);
  const evaluated = evaluateAlertRuleSignal(rule, signalInput);
  if (!evaluated.open) return { opened: false, evaluated };
  const now = new Date();
  const alert = await OrchestrationAlert.findOneAndUpdate(
    {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      alertRuleId: rule._id,
      fingerprint: evaluated.fingerprint,
    },
    {
      $set: {
        lastObservedAt: now,
        safeSummary: evaluated.safeSummary,
        safeReasonCodes: evaluated.safeReasonCodes,
        affectedDefinitionCount: evaluated.affectedDefinitionCount,
        affectedRunCount: evaluated.affectedRunCount,
        affectedWorkerCount: evaluated.affectedWorkerCount,
        traceId: caller.traceId,
        requestId: caller.requestId,
      },
      $setOnInsert: {
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        alertRuleId: rule._id,
        alertRuleVersion: Number(rule.version || 1),
        status: 'open',
        severity: rule.severity,
        signalType: rule.signalType,
        fingerprint: evaluated.fingerprint,
        firstObservedAt: now,
      },
      $inc: { occurrenceCount: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );
  await audit(alert.occurrenceCount > 1 ? 'orchestration.alert.suppressed' : 'orchestration.alert.opened', 'OrchestrationAlert', alert, scope, {
    alertRuleVersion: rule.version,
    severity: alert.severity,
    signalType: alert.signalType,
    safeReasonCodes: alert.safeReasonCodes,
  });
  return { opened: true, alert: plain(alert), evaluated };
}

async function listAlerts(input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationAlert.read', 'OrchestrationAlert', null, scope, caller);
  const pagination = paging(input);
  const filter = { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
  if (input.status) filter.status = clean(input.status, 32);
  const [items, total] = await Promise.all([
    OrchestrationAlert.find(filter).sort({ lastObservedAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
    OrchestrationAlert.countDocuments(filter),
  ]);
  return { items, pagination: { page: pagination.page, limit: pagination.limit, total } };
}

async function transitionAlert(alertId, action, input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  const permission = action === 'suppress' ? 'orchestrationAlert.suppress' : 'orchestrationAlert.manage';
  await authorize(permission, 'OrchestrationAlert', alertId, scope, caller);
  const alert = await OrchestrationAlert.findOne({ _id: alertId, organizationId: scope.organizationId, workspaceId: scope.workspaceId });
  if (!alert) throw new AppError(404, 'ORCHESTRATION_ALERT_NOT_FOUND', 'Alert was not found.');
  const now = new Date();
  if (action === 'acknowledge') {
    alert.status = 'acknowledged';
    alert.acknowledgedBy = scope.actorId;
    alert.acknowledgedAt = now;
  } else if (action === 'suppress') {
    alert.status = 'suppressed';
    alert.suppressedBy = scope.actorId;
    alert.suppressedUntil = new Date(now.getTime() + boundedInteger(input.suppressionWindowMs || 3600000, 3600000, 1, OBSERVABILITY_LIMITS.maximumSuppressionWindowMs));
  } else if (action === 'resolve') {
    alert.status = 'resolved';
    alert.resolvedBy = scope.actorId;
    alert.resolvedAt = now;
  } else {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Alert action is invalid.');
  }
  await alert.save();
  await audit(`orchestration.alert.${action === 'suppress' ? 'suppressed' : `${action}d`}`, 'OrchestrationAlert', alert, scope, {
    severity: alert.severity,
    signalType: alert.signalType,
  });
  return plain(alert);
}

async function createDiagnosticExport(runId, input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationDiagnostic.export', 'OrchestrationDiagnosticExport', runId, scope, caller);
  const [observability, evaluations, alerts] = await Promise.all([
    getRunObservability(runId, input, caller),
    OrchestrationSloEvaluation.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId }).sort({ generatedAt: -1 }).limit(20).lean(),
    OrchestrationAlert.find({ organizationId: scope.organizationId, workspaceId: scope.workspaceId }).sort({ lastObservedAt: -1 }).limit(50).lean(),
  ]);
  const safePackage = assertSafeExportContent({
    runId: idOf(runId),
    timeline: observability.timeline.slice(0, OBSERVABILITY_LIMITS.maximumExportRecords),
    trace: observability.trace.slice(0, OBSERVABILITY_LIMITS.maximumExportRecords),
    statuses: observability.summary,
    sloSummary: evaluations.map((evaluation) => ({
      sloPolicyId: idOf(evaluation.sloPolicyId),
      sloPolicyVersion: evaluation.sloPolicyVersion,
      evaluationStatus: evaluation.evaluationStatus,
      sampleSize: evaluation.sampleSize,
      safeBreachReasons: evaluation.safeBreachReasons,
      generatedAt: evaluation.generatedAt,
    })),
    alertHistory: alerts.map((alert) => ({
      alertId: idOf(alert),
      status: alert.status,
      severity: alert.severity,
      signalType: alert.signalType,
      safeSummary: alert.safeSummary,
      safeReasonCodes: alert.safeReasonCodes,
      firstObservedAt: alert.firstObservedAt,
      lastObservedAt: alert.lastObservedAt,
      occurrenceCount: alert.occurrenceCount,
    })),
  });
  const exportId = `odx_${crypto.randomUUID()}`;
  const record = await OrchestrationDiagnosticExport.create({
    exportId,
    organizationId: scope.organizationId,
    workspaceId: scope.workspaceId,
    orchestrationRunId: runId,
    safeManifest: {
      containsTimeline: true,
      containsTrace: true,
      containsStatuses: true,
      containsSloSummary: true,
      containsAlertHistory: true,
    },
    contentHash: digest(safePackage, 'orchestration-diagnostic-export'),
    recordCounts: {
      timeline: safePackage.timeline.length,
      trace: safePackage.trace.length,
      sloEvaluations: safePackage.sloSummary.length,
      alerts: safePackage.alertHistory.length,
    },
    safeReasonCode: safeCode(input.safeReasonCode || 'DIAGNOSTIC_EXPORT_REQUESTED'),
    createdBy: scope.actorId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    traceId: scope.traceId,
    requestId: scope.requestId,
  });
  await audit('orchestration.diagnostic.export.created', 'OrchestrationDiagnosticExport', record, scope, {
    exportId,
    recordCounts: record.recordCounts,
  });
  return { export: plain(record), package: safePackage };
}

async function cleanupRetention(input = {}, caller = {}) {
  const scope = scopeFromCaller(input, caller);
  await authorize('orchestrationRetention.manage', 'OrchestrationTimelineEvent', null, scope, caller);
  const retentionDays = boundedInteger(input.retentionDays || 30, 30, OBSERVABILITY_LIMITS.minimumRetentionDays, OBSERVABILITY_LIMITS.maximumRetentionDays);
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const legalHold = await LegalHold.findOne({ organizationId: scope.organizationId, status: 'active' }).lean().catch(() => null);
  if (legalHold) {
    await audit('orchestration.retention.cleaned', 'OrchestrationTimelineEvent', 'legal-hold-preserved', scope, {
      deletedCount: 0,
      preservedByLegalHold: true,
    });
    return { deletedCount: 0, preservedByLegalHold: true };
  }
  const results = await Promise.all([
    OrchestrationTimelineEvent.deleteMany({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, occurredAt: { $lt: cutoff } }),
    OrchestrationTraceSpan.deleteMany({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, startedAt: { $lt: cutoff } }),
    OrchestrationOperationalSnapshot.deleteMany({ organizationId: scope.organizationId, workspaceId: scope.workspaceId, snapshotAt: { $lt: cutoff } }),
  ]);
  const deletedCount = results.reduce((total, result) => total + Number(result.deletedCount || 0), 0);
  await audit('orchestration.retention.cleaned', 'OrchestrationTimelineEvent', 'retention-cleanup', scope, {
    deletedCount,
    retentionDays,
  });
  return { deletedCount, preservedByLegalHold: false };
}

async function ensureOrchestrationObservabilityIndexes() {
  const models = [
    OrchestrationTimelineEvent,
    OrchestrationTraceSpan,
    OrchestrationRunHealthSummary,
    OrchestrationSloPolicy,
    OrchestrationSloEvaluation,
    OrchestrationAlertRule,
    OrchestrationAlert,
    OrchestrationOperationalSnapshot,
    OrchestrationFleetControl,
    OrchestrationDiagnosticExport,
  ];
  for (const Model of models) await Model.createIndexes();
  return { models: models.map((Model) => Model.modelName) };
}

module.exports = {
  activateAlertRule,
  activateSloPolicy,
  alertFingerprint,
  assertConnectionNotQuarantined,
  assertDefinitionNotPaused,
  assertSafeExportContent,
  assertWorkersNotDraining,
  assertWorkspaceNotPaused,
  calculateCriticalPath,
  cleanupRetention,
  classifyStuckRun,
  computeRunHealth,
  createAlertRule,
  createDiagnosticExport,
  createOrReleaseControl,
  createSloPolicy,
  deduplicateAlertInstance,
  deriveTimelineEvents,
  deriveTraceSpans,
  detectBottlenecks,
  ensureOrchestrationObservabilityIndexes,
  evaluateAlertRuleSignal,
  evaluateSloPolicy,
  evaluateSloPolicyById,
  fleetControlGuardDecision,
  filterQuarantinedCandidates,
  getRunCriticalPath,
  getRunHealth,
  getRunObservability,
  getRunTrace,
  idempotencyDiagnostic,
  listAlertRules,
  listAlerts,
  listQuarantinedConnectionIds,
  listRunTimeline,
  listSloEvaluations,
  listSloPolicies,
  metricLabelsAreBounded,
  normalizeAlertRuleInput,
  normalizeSloPolicyInput,
  openOrDeduplicateAlert,
  operationsOverview,
  quarantineDecision,
  rebuildTimelineForRun,
  rebuildTraceForRun,
  serializeSloPolicy,
  summarizeQueues,
  summarizeWorkerFleet,
  transitionAlert,
  updateSloPolicy,
  validateAlertRuleDocument,
  validateSloPolicyDocument,
  validateTraceSpans,
};
