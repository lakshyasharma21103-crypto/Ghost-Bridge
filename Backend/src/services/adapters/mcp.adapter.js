// LEGACY QUARANTINE: retained only for historical stored Passport/Connection
// compatibility. Ghost Bridge Native must never import this module. Do not add
// new features; removal is planned after a backward-compatible data migration.
const MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED = 'MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED';
const MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED_MESSAGE =
  'MCP runtime adapter is configured but remote MCP transport is not implemented yet.';

function notImplementedResult() {
  return {
    ok: false,
    error: {
      code: MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED,
      message: MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED_MESSAGE,
    },
  };
}

async function initialize(_connection) {
  return notImplementedResult();
}

async function listTools(_connection) {
  return notImplementedResult();
}

async function callTool(_connection, _toolName, _args) {
  return notImplementedResult();
}

async function invoke(connection, capability, input) {
  const toolName = capability?.runtimeToolName || capability?.name;
  return callTool(connection, toolName, input);
}

async function cleanup() {
  return notImplementedResult();
}

const mcpAdapter = {
  name: 'mcp',
  supported: true,
  availability: 'limited',
  remoteTransportImplemented: false,
  description: 'MCP adapter interface is available; remote MCP transport is not implemented in this deployment.',
  initialize,
  listTools,
  callTool,
  invoke,
  cleanup,
};

module.exports = {
  MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED,
  MCP_REMOTE_RUNTIME_NOT_IMPLEMENTED_MESSAGE,
  notImplementedResult,
  initialize,
  listTools,
  callTool,
  invoke,
  cleanup,
  mcpAdapter,
};
