const {
  createSandboxPartner,
  createSandboxPassport,
  issueSandboxInstallKey,
} = require('../services/developerSandboxService');
const {
  checkExternalAgentHealth,
  externalAgentSandboxStatus,
  issueExternalAgentInstallKey,
  upsertExternalAgentPassport,
} = require('../services/externalAgentSandboxService');

function status(_request, response) {
  response.json({ success: true, data: { enabled: true, environment: 'development' } });
}

async function createPartner(request, response, next) {
  try {
    const data = await createSandboxPartner(request.body, request.requestId);
    response.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function createPassport(request, response, next) {
  try {
    const data = await createSandboxPassport(
      request.partner,
      request.params.partnerId,
      request.requestId,
    );
    response.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function issueInstallKey(request, response, next) {
  try {
    const data = await issueSandboxInstallKey(
      request.partner,
      request.params.passportId,
      request.requestId,
    );
    response.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function externalAgentStatus(request, response, next) {
  try {
    const data = await externalAgentSandboxStatus(request.partner);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function externalAgentHealth(request, response, next) {
  try {
    const data = await checkExternalAgentHealth(request.partner);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function createExternalAgentPassport(request, response, next) {
  try {
    const data = await upsertExternalAgentPassport(request.partner, request.requestId);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function createExternalAgentInstallKey(request, response, next) {
  try {
    const data = await issueExternalAgentInstallKey(request.partner, request.requestId);
    response.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  status,
  createPartner,
  createPassport,
  issueInstallKey,
  externalAgentStatus,
  externalAgentHealth,
  createExternalAgentPassport,
  createExternalAgentInstallKey,
};
