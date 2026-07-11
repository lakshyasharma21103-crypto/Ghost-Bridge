const { RuntimeError } = require('../utils/errors');

function requestTimeout(timeoutMs) {
  return function enforceRequestTimeout(request, response, next) {
    const controller = new AbortController();
    request.runtimeAbortSignal = controller.signal;

    const timer = setTimeout(() => {
      if (!response.writableEnded) {
        const error = new RuntimeError(408, 'REQUEST_TIMEOUT', 'Request timed out.');
        controller.abort(error);
        next(error);
      }
    }, timeoutMs);
    timer.unref();

    const clear = () => clearTimeout(timer);
    request.once('aborted', () => {
      controller.abort(new DOMException('Client disconnected', 'AbortError'));
      clear();
    });
    response.once('finish', clear);
    response.once('close', () => {
      if (!response.writableEnded) {
        controller.abort(new DOMException('Client disconnected', 'AbortError'));
      }
      clear();
    });
    next();
  };
}

module.exports = {
  requestTimeout,
};
