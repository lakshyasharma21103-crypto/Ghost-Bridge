const { restAdapter } = require('./restAdapter');
const { env } = require('../../config/env');

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
  ...(env.LEGACY_MCP_ENABLED
    ? { mcp: require('./mcp.adapter').mcpAdapter }
    : {}),
};

module.exports = {
  adapters,
  runtimeSupport,
};
