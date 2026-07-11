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
    const data = await resolveInstallKey(request.body, request.requestId);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  validatePassport,
  resolvePassportInstallKey,
};
