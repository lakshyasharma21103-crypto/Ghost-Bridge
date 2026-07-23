const { AppError } = require('../utils/AppError');
const { ErrorCodes } = require('../utils/errorCodes');

const TEST_FAULT_CONTROL_HEADER = /^(?:x-)?(?:ghost-bridge-)?(?:test-)?(?:fault|failure)-injection(?:-|$)/i;

function rejectTestFaultControls(request, _response, next) {
  const prohibitedHeader = Object.keys(request.headers || {}).find((name) => TEST_FAULT_CONTROL_HEADER.test(name));
  if (!prohibitedHeader) {
    next();
    return;
  }
  next(new AppError(
    400,
    ErrorCodes.PERFORMANCE_FAULT_INJECTION_DENIED,
    'Test fault-injection controls are not accepted on application request paths.',
  ));
}

module.exports = { rejectTestFaultControls };
