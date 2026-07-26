const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { validateAgentPassportV1 } = require('../services/passportValidator');
const { resolveInstallKey } = require('../services/connectionService');

function validatePassport(request, response, next) {
  const result = validateAgentPassportV1(request.body);

  if (!result.valid) {
    next(
      new AppError(
        400,
        ErrorCodes.PASSPORT_VALIDATION_FAILED,
        'Agent Passport validation failed.',
        result.errors,
      ),
    );
    return;
  }

  response.json({
    success: true,
    data: {
      valid: true,
      protocol: result.passport.protocol,
      agent: result.passport.agent,
      runtime: {
        type: result.passport.runtime.type,
        endpoint: result.passport.runtime.endpoint,
        method: result.passport.runtime.method,
      },
      install: {
        supportedModes: result.passport.install.supportedModes,
        requiresUserConsent: result.passport.install.requiresUserConsent,
      },
      capabilityCount: result.passport.capabilities.length,
    },
  });
}

async function resolvePassportInstallKey(request, response, next) {
  try {
    const principal = installationPrincipal(request);
    const resolver = request.app?.locals?.resolveInstallKey || resolveInstallKey;
    const data = await resolver({
      key: request.body?.key,
      receivingUserId: principal.userId,
      receivingWorkspaceId: principal.workspaceId,
      receivingOrganizationId: principal.organizationId,
    }, {
      requestId: request.requestId,
      traceId: request.traceId,
      observer: request.observer,
    });
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

function installationPrincipal(request) {
  const requestedUserId = String(request.body?.receivingUserId || '').trim();
  const requestedWorkspaceId = String(request.body?.receivingWorkspaceId || '').trim();
  const requestedOrganizationId = String(
    request.body?.receivingOrganizationId ||
      request.body?.organizationId ||
      request.body?.requestedOrganizationScope ||
      '',
  ).trim();
  const principal = request.authenticatedPrincipal;
  if (!principal) {
    throw new AppError(
      401,
      ErrorCodes.AUTHENTICATION_REQUIRED,
      'Authenticated Host principal is required for installation.',
    );
  }
  const permittedWorkspaces = new Set(principal.permittedWorkspaceIds || []);
  const workspaceOrganizationId =
    principal.workspaceOrganizationIds?.[requestedWorkspaceId] || principal.organizationId;
  if (
    !principal.userId ||
    !requestedWorkspaceId ||
    (requestedUserId && requestedUserId !== principal.userId) ||
    (requestedOrganizationId && requestedOrganizationId !== workspaceOrganizationId) ||
    !permittedWorkspaces.has(requestedWorkspaceId)
  ) {
    throw new AppError(
      403,
      ErrorCodes.FORBIDDEN,
      'Requested installation scope is outside the authenticated principal.',
    );
  }
  return {
    userId: principal.userId,
    workspaceId: requestedWorkspaceId,
    organizationId: workspaceOrganizationId,
  };
}

module.exports = {
  validatePassport,
  resolvePassportInstallKey,
  installationPrincipal,
};
