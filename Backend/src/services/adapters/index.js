const { restAdapter } = require('./restAdapter');
const { mcpAdapter } = require('./mcp.adapter');

function runtimeSupport(runtimeType) {
  const adapter = adapters[runtimeType];
  if (!adapter) {
    return {
      type: runtimeType,
      supported: false,
      availability: 'unavailable',
      remoteTransportImplemented: false,
    };
  }
  return {
    type: runtimeType,
    supported: Boolean(adapter.supported),
    availability: adapter.availability || 'available',
    remoteTransportImplemented: adapter.remoteTransportImplemented !== false,
  };
}

const adapters = {
  rest: restAdapter,
  mcp: mcpAdapter,
};

module.exports = {
  adapters,
  runtimeSupport,
};
