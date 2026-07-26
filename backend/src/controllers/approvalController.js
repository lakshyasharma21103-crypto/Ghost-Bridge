const service = require('../services/approval.service');

function caller(request) {
  return { partner: request.partner, requestId: request.requestId, traceId: request.traceId };
}

function input(request) {
  return { ...request.query, ...request.body };
}

function handler(operation, statusCode = 200) {
  return async (request, response, next) => {
    try {
      const data = await operation(request, input(request), caller(request));
      response.status(statusCode).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  activateWorkflow: handler((request, value, actor) =>
    service.activateWorkflow(request.params.workflowId, request.params.version, value, actor),
  ),
  approveRequest: handler((request, value, actor) =>
    service.decideApprovalRequest(request.params.approvalRequestId, 'APPROVE', value, actor),
  ),
  cancelRequest: handler((request, value, actor) =>
    service.cancelApprovalRequest(request.params.approvalRequestId, value, actor),
  ),
  createRequest: handler(
    (_request, value, actor) => service.createApprovalRequest(value, actor),
    201,
  ),
  createWorkflow: handler(
    (_request, value, actor) => service.createWorkflowDraft(value, actor),
    201,
  ),
  createWorkflowVersion: handler(
    (request, value, actor) =>
      service.createWorkflowVersion(request.params.workflowId, value, actor),
    201,
  ),
  getRequest: handler((request, value, actor) =>
    service.getApprovalRequest(request.params.approvalRequestId, value, actor),
  ),
  getWorkflow: handler((request, value, actor) =>
    service.getWorkflow(request.params.workflowId, value, actor),
  ),
  listNotifications: handler((_request, value, actor) => service.listNotifications(value, actor)),
  listRequests: handler((_request, value, actor) => service.listApprovalRequests(value, actor)),
  listWorkflows: handler((_request, value, actor) => service.listWorkflows(value, actor)),
  rejectRequest: handler((request, value, actor) =>
    service.decideApprovalRequest(request.params.approvalRequestId, 'REJECT', value, actor),
  ),
  retireWorkflow: handler((request, value, actor) =>
    service.retireWorkflow(request.params.workflowId, request.params.version, value, actor),
  ),
  simulateWorkflow: handler(async (request, value) => {
    const result = await service.evaluateApprovalRequirement({
      ...value,
      organizationId: String(request.partner?._id || value.organizationId || ''),
      workspaceId: value.workspaceId || value.receivingWorkspaceId,
    });
    return {
      required: result.required,
      decision: result.decision,
      requirements: result.requirements,
    };
  }),
  updateWorkflow: handler((request, value, actor) =>
    service.updateWorkflowDraft(request.params.workflowId, request.params.version, value, actor),
  ),
  validateWorkflow: handler(async (request, value, actor) => {
    const result = await service.getWorkflow(request.params.workflowId, value, actor);
    const workflow = result.items.find(
      (item) => Number(item.version) === Number(request.params.version),
    );
    return workflow
      ? service.validateWorkflowDefinition(workflow)
      : { valid: false, errors: [{ path: 'version', message: 'Workflow version was not found.' }] };
  }),
};
