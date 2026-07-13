const {
  getSummary,
  getLatency,
  getErrors,
  getPassportFunnel,
  listAlerts,
  acknowledgeAlert,
} = require('../services/operationsService');

function handler(operation, source = 'query') {
  return async (request, response, next) => {
    try {
      const input = source === 'body' ? request.body : request.query;
      const data = await operation(input, request.params.id);
      response.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

const summary = handler(getSummary);
const latency = handler(getLatency);
const errors = handler(getErrors);
const passportFunnel = handler(getPassportFunnel);
const alerts = handler(listAlerts);

async function acknowledge(request, response, next) {
  try {
    const data = await acknowledgeAlert(request.params.id, request.body);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = { summary, latency, errors, passportFunnel, alerts, acknowledge };
