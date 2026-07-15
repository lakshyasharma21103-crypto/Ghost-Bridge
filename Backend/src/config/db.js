const mongoose = require('mongoose');
const { env } = require('./env');
const { logger, safeLogPayload } = require('../utils/logger');
const { ensureDevelopmentPartner } = require('../services/devSeedService');

let databaseState = 'disconnected';
let connectPromise = null;
let disconnectPromise = null;
let intentionalDisconnect = false;

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

async function completeConnection(connectionOperation) {
  databaseState = 'connecting';
  try {
    await connectionOperation;
    if (mongoose.connection.readyState !== MONGOOSE_READY_STATE.connected) {
      throw new Error('MongoDB connection did not reach the connected state');
    }
    databaseState = 'connected';
    logger.info('MongoDB connected');
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
            serverSelectionTimeoutMS: 5000,
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

module.exports = {
  connectDatabase,
  disconnectDatabase,
  databaseStatus,
};
