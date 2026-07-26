const Workspace = require('../models/Workspace');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { authenticatePartner } = require('./authenticatePartner');

const DEVELOPMENT_FIXTURE_HEADER = 'X-GhostBridge-Development-Identity-Fixture';

function idOf(value) {
  return String(value?._id || value?.id || value || '');
}

function authenticationRequired() {
  return new AppError(
    401,
    ErrorCodes.AUTHENTICATION_REQUIRED,
    'Authenticated Host principal is required for installation.',
  );
}

function fixturePrincipal(request) {
  if (
    env.NODE_ENV !== 'development' ||
    env.ALLOW_DEVELOPMENT_IDENTITY_FIXTURES !== true ||
    request.header(DEVELOPMENT_FIXTURE_HEADER) !== '1'
  ) {
    return undefined;
  }
  const userId = String(request.body?.receivingUserId || '').trim();
  const workspaceId = String(request.body?.receivingWorkspaceId || '').trim();
  const organizationId = String(
    request.body?.receivingOrganizationId ||
      request.body?.organizationId ||
      request.body?.requestedOrganizationScope ||
      '',
  ).trim();
  if (!userId || !workspaceId || !organizationId) throw authenticationRequired();
  return Object.freeze({
    subjectType: 'development_fixture',
    subjectId: `fixture:${userId}`,
    userId,
    organizationId,
    permittedOrganizationIds: Object.freeze([organizationId]),
    permittedWorkspaceIds: Object.freeze([workspaceId]),
    workspaceOrganizationIds: Object.freeze({ [workspaceId]: organizationId }),
    authenticationMethod: 'explicit_development_fixture',
    sessionOrCredentialReference: 'development-fixture',
    developmentFixture: true,
  });
}

async function derivePartnerPrincipal(partner) {
  const partnerId = idOf(partner);
  if (!partnerId) throw authenticationRequired();
  const workspaces = await Workspace.find({ partnerId, status: 'active' })
    .select('externalWorkspaceId organizationId')
    .lean();
  const workspaceOrganizationIds = {};
  for (const workspace of workspaces || []) {
    const workspaceId = String(workspace.externalWorkspaceId || '').trim();
    const organizationId = idOf(workspace.organizationId || partnerId);
    if (workspaceId) workspaceOrganizationIds[workspaceId] = organizationId;
  }
  const permittedWorkspaceIds = Object.keys(workspaceOrganizationIds).sort();
  const permittedOrganizationIds = [...new Set(Object.values(workspaceOrganizationIds))].sort();
  return Object.freeze({
    subjectType: 'service_account',
    subjectId: `partner:${partnerId}`,
    userId: `partner:${partnerId}`,
    ...(permittedOrganizationIds.length === 1
      ? { organizationId: permittedOrganizationIds[0] }
      : {}),
    permittedOrganizationIds: Object.freeze(permittedOrganizationIds),
    permittedWorkspaceIds: Object.freeze(permittedWorkspaceIds),
    workspaceOrganizationIds: Object.freeze(workspaceOrganizationIds),
    authenticationMethod: 'partner_api_key',
    sessionOrCredentialReference: `partner:${partnerId}:api-key`,
  });
}

function authenticateHostPrincipal(request, response, next) {
  const developmentPrincipal = fixturePrincipal(request);
  if (developmentPrincipal) {
    request.authenticatedPrincipal = developmentPrincipal;
    next();
    return;
  }
  authenticatePartner(request, response, async (error) => {
    if (error) {
      next(error);
      return;
    }
    try {
      request.authenticatedPrincipal = await derivePartnerPrincipal(request.partner);
      next();
    } catch (principalError) {
      next(principalError);
    }
  });
}

module.exports = {
  DEVELOPMENT_FIXTURE_HEADER,
  authenticateHostPrincipal,
  derivePartnerPrincipal,
  fixturePrincipal,
};
