const { env } = require('../config/env');
const Partner = require('../models/Partner');
const { hashPartnerApiKey } = require('../utils/crypto');
const { logger } = require('../utils/logger');

async function ensureDevelopmentPartner() {
  if (env.NODE_ENV !== 'development' || !env.DEV_PARTNER_API_KEY) return null;

  const partner = await Partner.findOneAndUpdate(
    { slug: env.DEV_PARTNER_SLUG },
    {
      $set: {
        name: env.DEV_PARTNER_NAME,
        slug: env.DEV_PARTNER_SLUG,
        status: 'active',
        apiKeyHash: hashPartnerApiKey(env.DEV_PARTNER_API_KEY),
        plan: 'developer',
      },
      $setOnInsert: {
        allowedOrigins: [],
      },
    },
    { upsert: true, new: true },
  ).lean();

  logger.info({ partnerId: String(partner._id), slug: partner.slug }, 'Development partner seed is ready');
  return partner;
}

module.exports = {
  ensureDevelopmentPartner,
};
