const Partner = require('../models/Partner');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { hashPartnerApiKey, verifyKey } = require('../utils/crypto');

function partnerAuthRequired(message = 'Partner API key is required.') {
  return new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, message);
}

async function authenticatePartner(request, _response, next) {
  try {
    const rawKey = request.header('X-Partner-Api-Key');
    if (!rawKey || typeof rawKey !== 'string' || rawKey.trim().length === 0) {
      next(partnerAuthRequired());
      return;
    }

    const candidateHash = hashPartnerApiKey(rawKey.trim());
    const partner = await Partner.findOne({
      status: 'active',
      apiKeyHash: candidateHash,
    })
      .select('+apiKeyHash')
      .lean();
    if (partner && !verifyKey(rawKey.trim(), partner.apiKeyHash)) {
      next(new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Partner API key is invalid.'));
      return;
    }
    if (!partner) {
      next(new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Partner API key is invalid.'));
      return;
    }

    const { apiKeyHash: _apiKeyHash, ...safePartner } = partner;
    request.partner = safePartner;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  authenticatePartner,
};
