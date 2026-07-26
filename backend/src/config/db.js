const mongoose = require('mongoose');
const { env } = require('./env');
const { logger, safeLogPayload } = require('../utils/logger');
const { ensureDevelopmentPartner } = require('../services/devSeedService');

let databaseState = 'disconnected';
let connectPromise = null;
let disconnectPromise = null;
let intentionalDisconnect = false;
const poolState = {
  checkedOut: 0,
  waitQueueEntered: 0,
  waitQueueExited: 0,
  checkoutFailures: 0,
};

const MONGOOSE_READY_STATE = Object.freeze({
  disconnected: 0,
  connected: 1,
  connecting: 2,
  disconnecting: 3,
});

function handleConnected() {
  databaseState = 'connected';
}

function handleDisconnected() {
  const expectedDisconnect =
    intentionalDisconnect || databaseState === 'disconnecting' || databaseState === 'disconnected';
  databaseState = expectedDisconnect ? 'disconnected' : 'unavailable';
  if (!expectedDisconnect) {
    logger.warn('MongoDB disconnected unexpectedly');
  }
}

function handleReconnected() {
  databaseState = 'connected';
  logger.info('MongoDB reconnected');
}

function handleConnectionError(error) {
  if (mongoose.connection.readyState !== MONGOOSE_READY_STATE.connected) {
    databaseState = 'unavailable';
  }
  logger.error({ error: safeLogPayload(error) }, 'MongoDB connection error');
}

mongoose.connection.on('connected', handleConnected);
mongoose.connection.on('disconnected', handleDisconnected);
mongoose.connection.on('reconnected', handleReconnected);
mongoose.connection.on('error', handleConnectionError);

function hasAuthSource(uri) {
  return /[?&]authSource=/i.test(uri);
}

function mongoClientOptions() {
  return {
    minPoolSize: env.MONGODB_MIN_POOL_SIZE,
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
    maxConnecting: env.MONGODB_MAX_CONNECTING,
    waitQueueTimeoutMS: env.MONGODB_WAIT_QUEUE_TIMEOUT_MS,
    serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    socketTimeoutMS: env.MONGODB_SOCKET_TIMEOUT_MS,
    connectTimeoutMS: env.MONGODB_CONNECT_TIMEOUT_MS,
    maxIdleTimeMS: env.MONGODB_MAX_IDLE_TIME_MS,
    heartbeatFrequencyMS: env.MONGODB_HEARTBEAT_FREQUENCY_MS,
  };
}

function attachPoolInstrumentation(client) {
  if (!client || client.__ghostBridgePoolInstrumentation) return;
  Object.defineProperty(client, '__ghostBridgePoolInstrumentation', { value: true });
  client.on?.('connectionCheckedOut', () => { poolState.checkedOut += 1; });
  client.on?.('connectionCheckedIn', () => { poolState.checkedOut = Math.max(0, poolState.checkedOut - 1); });
  client.on?.('connectionCheckOutStarted', () => { poolState.waitQueueEntered += 1; });
  client.on?.('connectionCheckOutFailed', () => { poolState.checkoutFailures += 1; });
  client.on?.('connectionCheckedOut', () => { poolState.waitQueueExited += 1; });
}

async function completeConnection(connectionOperation) {
  databaseState = 'connecting';
  try {
    await connectionOperation;
    if (mongoose.connection.readyState !== MONGOOSE_READY_STATE.connected) {
      throw new Error('MongoDB connection did not reach the connected state');
    }
    databaseState = 'connected';
    logger.info('MongoDB connected');
    attachPoolInstrumentation(mongoose.connection.getClient?.());
    await ensureDevelopmentPartner();
  } catch (error) {
    databaseState = 'unavailable';
    logger.error({ error: safeLogPayload(error) }, 'MongoDB connection failed');
    if (env.NODE_ENV === 'production') {
      throw error;
    }
  }
}

function beginConnection(connectionFactory) {
  databaseState = 'connecting';
  const connectionOperation = Promise.resolve().then(connectionFactory);
  const trackedAttempt = completeConnection(connectionOperation).finally(() => {
    if (connectPromise === trackedAttempt) connectPromise = null;
  });
  connectPromise = trackedAttempt;
  return trackedAttempt;
}

function connectDatabase() {
  if (!env.MONGODB_URI) {
    databaseState = 'not_configured';
    logger.warn('MongoDB URI is not configured; backend is running without persistence');
    return Promise.resolve();
  }

  if (connectPromise) return connectPromise;

  if (mongoose.connection.readyState === MONGOOSE_READY_STATE.connected) {
    databaseState = 'connected';
    return Promise.resolve();
  }

  const connectionFactory =
    mongoose.connection.readyState === MONGOOSE_READY_STATE.connecting
      ? () => mongoose.connection.asPromise()
      : () =>
          mongoose.connect(env.MONGODB_URI, {
            dbName: env.MONGODB_DB_NAME,
            ...mongoClientOptions(),
            autoIndex: env.NODE_ENV !== 'production',
            ...(!hasAuthSource(env.MONGODB_URI) ? { authSource: env.MONGODB_AUTH_SOURCE } : {}),
          });

  return beginConnection(connectionFactory);
}

function disconnectDatabase() {
  if (disconnectPromise) return disconnectPromise;
  if (mongoose.connection.readyState === MONGOOSE_READY_STATE.disconnected) {
    databaseState = 'disconnected';
    return Promise.resolve();
  }

  intentionalDisconnect = true;
  databaseState = 'disconnecting';
  const operation = Promise.resolve().then(() => mongoose.disconnect());
  const trackedAttempt = operation.finally(() => {
    databaseState =
      mongoose.connection.readyState === MONGOOSE_READY_STATE.disconnected
        ? 'disconnected'
        : 'unavailable';
    intentionalDisconnect = false;
    if (disconnectPromise === trackedAttempt) disconnectPromise = null;
  });
  disconnectPromise = trackedAttempt;
  return trackedAttempt;
}

function databaseStatus() {
  if (mongoose.connection.readyState === MONGOOSE_READY_STATE.connected) return 'connected';
  if (mongoose.connection.readyState === MONGOOSE_READY_STATE.connecting) return 'connecting';
  if (mongoose.connection.readyState === MONGOOSE_READY_STATE.disconnecting) {
    return 'disconnecting';
  }
  if (databaseState === 'connected' || databaseState === 'connecting') return 'unavailable';
  return databaseState;
}

function connectionPoolSummary() {
  const maximum = env.MONGODB_MAX_POOL_SIZE;
  const usageRatio = maximum ? poolState.checkedOut / maximum : 0;
  const pending = Math.max(0, poolState.waitQueueEntered - poolState.waitQueueExited - poolState.checkoutFailures);
  return {
    status: databaseStatus() === 'connected' ? 'healthy' : databaseStatus() === 'not_configured' ? 'disabled' : 'unavailable',
    configuredMinimum: env.MONGODB_MIN_POOL_SIZE,
    configuredMaximum: maximum,
    poolUsageCategory: usageRatio < 0.5 ? 'low' : usageRatio < 0.8 ? 'moderate' : usageRatio < 0.95 ? 'high' : 'critical',
    poolWaitCategory: pending === 0 ? 'none' : pending < 5 ? 'low' : pending < 20 ? 'moderate' : 'high',
    checkoutFailureCategory: poolState.checkoutFailures === 0 ? 'none' : poolState.checkoutFailures < 5 ? 'low' : 'high',
  };
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  databaseStatus,
  connectionPoolSummary,
  mongoClientOptions,
};
