const express = require('express');
const { authenticatePartner } = require('../middleware/authenticatePartner');
const { requiresPermission } = require('../middleware/requiresPermission');
const controller = require('../controllers/approvalController');

const approvalRouter = express.Router();
approvalRouter.use(authenticatePartner);

approvalRouter.get(
  '/workflows',
  requiresPermission('approval.workflow.read', { resourceType: 'ApprovalWorkflow' }),
  controller.listWorkflows,
);
approvalRouter.post(
  '/workflows',
  requiresPermission('approval.workflow.create', { resourceType: 'ApprovalWorkflow' }),
  controller.createWorkflow,
);
approvalRouter.post(
  '/workflows/simulate',
  requiresPermission('approval.workflow.read', { resourceType: 'ApprovalWorkflow' }),
  controller.simulateWorkflow,
);
approvalRouter.get(
  '/workflows/:workflowId',
  requiresPermission('approval.workflow.read', { resourceType: 'ApprovalWorkflow' }),
  controller.getWorkflow,
);
approvalRouter.post(
  '/workflows/:workflowId/versions',
  requiresPermission('approval.workflow.update', { resourceType: 'ApprovalWorkflow' }),
  controller.createWorkflowVersion,
);
approvalRouter.patch(
  '/workflows/:workflowId/versions/:version',
  requiresPermission('approval.workflow.update', { resourceType: 'ApprovalWorkflow' }),
  controller.updateWorkflow,
);
approvalRouter.post(
  '/workflows/:workflowId/versions/:version/validate',
  requiresPermission('approval.workflow.read', { resourceType: 'ApprovalWorkflow' }),
  controller.validateWorkflow,
);
approvalRouter.post(
  '/workflows/:workflowId/versions/:version/activate',
  requiresPermission('approval.workflow.activate', { resourceType: 'ApprovalWorkflow' }),
  controller.activateWorkflow,
);
approvalRouter.post(
  '/workflows/:workflowId/versions/:version/retire',
  requiresPermission('approval.workflow.retire', { resourceType: 'ApprovalWorkflow' }),
  controller.retireWorkflow,
);

approvalRouter.get(
  '/requests',
  requiresPermission('approval.request.read', { resourceType: 'ApprovalRequest' }),
  controller.listRequests,
);
approvalRouter.post(
  '/requests',
  requiresPermission('approval.request.create', { resourceType: 'ApprovalRequest' }),
  controller.createRequest,
);
approvalRouter.get(
  '/requests/:approvalRequestId',
  requiresPermission('approval.request.read', { resourceType: 'ApprovalRequest' }),
  controller.getRequest,
);
approvalRouter.post(
  '/requests/:approvalRequestId/approve',
  requiresPermission('approval.request.approve', { resourceType: 'ApprovalRequest' }),
  controller.approveRequest,
);
approvalRouter.post(
  '/requests/:approvalRequestId/reject',
  requiresPermission('approval.request.reject', { resourceType: 'ApprovalRequest' }),
  controller.rejectRequest,
);
approvalRouter.post(
  '/requests/:approvalRequestId/cancel',
  requiresPermission('approval.request.cancel', { resourceType: 'ApprovalRequest' }),
  controller.cancelRequest,
);
approvalRouter.get(
  '/notifications',
  requiresPermission('approval.request.read', { resourceType: 'ComplianceNotification' }),
  controller.listNotifications,
);

module.exports = { approvalRouter };
