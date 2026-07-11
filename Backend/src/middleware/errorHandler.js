const { AppError } = require('../utils/AppError');
const { toApiErrorResponse } = require('../utils/apiError');
const { logger, safeLogPayload } = require('../utils/logger');

function errorHandler(error, request, response, _next) {
  const { statusCode, body, appError } = toApiErrorResponse(error, request.requestId);

  if (!(error instanceof AppError) || statusCode >= 500) {
    logger.error(
      {
        requestId: request.requestId,
        error: safeLogPayload(error),
      },
      'Request failed',
    );
  }

  response.status(statusCode).json(body);
}

module.exports = {
  errorHandler,
};
