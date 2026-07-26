const { AppError } = require('../utils/AppError');
const { toApiErrorResponse } = require('../utils/apiError');
const { logger, safeLogPayload } = require('../utils/logger');

function errorHandler(error, request, response, _next) {
  const { statusCode, body, appError } = toApiErrorResponse(error, {
    requestId: request.requestId,
    traceId: request.traceId,
  });

  request.observer?.emit('error', 'request.failed', {
    status: 'failed',
    statusCode,
    errorCode: appError.code,
    stage: appError.stage,
    retryable: appError.retryable,
    invocationId: appError.invocationId,
    connectionId: appError.connectionId,
  });

  if (!(error instanceof AppError) || statusCode >= 500) {
    logger.error(
      {
        requestId: request.requestId,
        traceId: request.traceId,
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
