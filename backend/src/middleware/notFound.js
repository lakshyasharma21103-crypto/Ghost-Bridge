const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');

function notFound(request, _response, next) {
  next(new AppError(404, ErrorCodes.NOT_FOUND, `Route not found: ${request.method} ${request.path}`));
}

module.exports = {
  notFound,
};
