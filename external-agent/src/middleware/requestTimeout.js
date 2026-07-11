const { RuntimeError } = require('../utils/errors');

function requestTimeout(timeoutMs) {
  return function enforceRequestTimeout(_request, response, next) {
    const timer = setTimeout(() => {
      if (!response.writableEnded) {
        next(new RuntimeError(408, 'REQUEST_TIMEOUT', 'Request timed out.'));
      }
    }, timeoutMs);
    timer.unref();

    const clear = () => clearTimeout(timer);
    response.once('finish', clear);
    response.once('close', clear);
    next();
  };
}

module.exports = {
  requestTimeout,
};
