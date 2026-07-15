const { RuntimeError, requestCancelledError } = require('../utils/errors');

function requestTimeout(timeoutMs) {
  return function enforceRequestTimeout(request, response, next) {
    const controller = new AbortController();
    request.runtimeAbortSignal = controller.signal;

    const abortOnce = (error) => {
      if (controller.signal.aborted) return false;
      controller.abort(error);
      return true;
    };

    const timer = setTimeout(() => {
      if (!response.writableEnded && !response.destroyed) {
        const error = new RuntimeError(408, 'REQUEST_TIMEOUT', 'Request timed out.');
        if (abortOnce(error)) next(error);
      }
    }, timeoutMs);
    timer.unref();

    const clear = () => clearTimeout(timer);
    request.once('aborted', () => {
      abortOnce(requestCancelledError());
      clear();
    });
    response.once('finish', clear);
    response.once('close', () => {
      if (!response.writableEnded) {
        abortOnce(requestCancelledError());
      }
      clear();
    });
    next();
  };
}

module.exports = {
  requestTimeout,
};
