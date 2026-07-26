const {
  upsertPartnerPassport,
  listPartnerPassports,
  getPartnerPassportDetail,
  issueInstallKey,
  suspendPassport,
  revokeInstallKey,
} = require('../services/partnerService');

async function createOrUpdateAgentPassport(request, response, next) {
  try {
    const data = await upsertPartnerPassport(request.partner, request.body, request.requestId);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function listAgents(request, response, next) {
  try {
    const data = await listPartnerPassports(request.partner);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getAgent(request, response, next) {
  try {
    const data = await getPartnerPassportDetail(request.partner, request.params.passportId);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function createInstallKey(request, response, next) {
  try {
    const data = await issueInstallKey(
      request.partner,
      request.params.passportId,
      request.body,
      request.requestId,
    );
    response.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function revokeAgent(request, response, next) {
  try {
    const data = await suspendPassport(request.partner, request.params.passportId, request.requestId);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function revokeKey(request, response, next) {
  try {
    const data = await revokeInstallKey(request.partner, request.params.keyId, request.requestId);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrUpdateAgentPassport,
  listAgents,
  getAgent,
  createInstallKey,
  revokeAgent,
  revokeKey,
};
