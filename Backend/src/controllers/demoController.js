const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');

function runMockAgent(request, response, next) {
  try {
    const value = request.body?.topic || request.body?.instruction;
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Request validation failed.', [
        { path: 'instruction', message: 'instruction or topic is required.' },
      ]);
    }

    const subject = value.trim();
    response.json({
      response: {
        summary: `Demo research result for ${subject}`,
        sources: ['https://example.com/source-1'],
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  runMockAgent,
};
