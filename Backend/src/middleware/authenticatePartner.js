const Partner = require('../models/Partner');
const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');
const { verifyKey } = require('../utils/crypto');

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

    const partners = await Partner.find({ status: 'active' }).select('+apiKeyHash').lean();
    const partner = partners.find((candidate) => verifyKey(rawKey.trim(), candidate.apiKeyHash));
    if (!partner) {
      next(new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Partner API key is invalid.'));
      return;
    }

    request.partner = partner;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  authenticatePartner,
};
