const assert = require('node:assert/strict');
const { after, afterEach, test } = require('node:test');
const mongoose = require('mongoose');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');
const developmentSeedService = require('../services/devSeedService');

const original = {
  connect: mongoose.connect,
  disconnect: mongoose.disconnect,
  asPromise: mongoose.connection.asPromise,
  readyState: mongoose.connection.readyState,
  mongodbUri: env.MONGODB_URI,
  nodeEnv: env.NODE_ENV,
  ensureDevelopmentPartner: developmentSeedService.ensureDevelopmentPartner,
  loggerInfo: logger.info,
  loggerWarn: logger.warn,
  loggerError: logger.error,
};

let seedCalls = 0;
developmentSeedService.ensureDevelopmentPartner = async () => {
  seedCalls += 1;
};
logger.info = () => {};
logger.warn = () => {};
logger.error = () => {};

const database = require('../config/db');

function setReadyState(value) {
  mongoose.connection._readyState = value;
}

function restoreMethod(object, name, value) {
  object[name] = value;
}

afterEach(async () => {
  setReadyState(0);
  await database.disconnectDatabase();
  restoreMethod(mongoose, 'connect', original.connect);
  restoreMethod(mongoose, 'disconnect', original.disconnect);
  restoreMethod(mongoose.connection, 'asPromise', original.asPromise);
  env.MONGODB_URI = original.mongodbUri;
  env.NODE_ENV = original.nodeEnv;
  logger.info = () => {};
  logger.warn = () => {};
  logger.error = () => {};
});

after(() => {
  setReadyState(original.readyState);
  developmentSeedService.ensureDevelopmentPartner = original.ensureDevelopmentPartner;
  logger.info = original.loggerInfo;
  logger.warn = original.loggerWarn;
  logger.error = original.loggerError;
});

test('database status follows live Mongoose state and cannot remain falsely connected', () => {
  setReadyState(1);
  mongoose.connection.emit('connected');
  assert.equal(database.databaseStatus(), 'connected');

  // Even if an event is delayed or missed, readyState is authoritative.
  setReadyState(0);
  assert.equal(database.databaseStatus(), 'unavailable');

  mongoose.connection.emit('disconnected');
  assert.equal(database.databaseStatus(), 'unavailable');

  setReadyState(2);
  assert.equal(database.databaseStatus(), 'connecting');
  setReadyState(3);
  assert.equal(database.databaseStatus(), 'disconnecting');

  setReadyState(1);
  mongoose.connection.emit('reconnected');
  assert.equal(database.databaseStatus(), 'connected');
});

test('concurrent callers share one connection attempt and a later disconnect can reconnect', async () => {
  env.MONGODB_URI = 'mongodb://database.example.test/gateway';
  env.NODE_ENV = 'test';
  let connectCalls = 0;
  let releaseConnection;
  const connectionGate = new Promise((resolve) => {
    releaseConnection = resolve;
  });
  mongoose.connect = async () => {
    connectCalls += 1;
    setReadyState(2);
    await connectionGate;
    setReadyState(1);
    mongoose.connection.emit(connectCalls === 1 ? 'connected' : 'reconnected');
    return mongoose;
  };

  const seedCallsBefore = seedCalls;
  const first = database.connectDatabase();
  const second = database.connectDatabase();
  await Promise.resolve();
  assert.equal(connectCalls, 1);
  releaseConnection();
  await Promise.all([first, second]);
  assert.equal(database.databaseStatus(), 'connected');
  assert.equal(seedCalls - seedCallsBefore, 1);

  setReadyState(0);
  mongoose.connection.emit('disconnected');
  assert.equal(database.databaseStatus(), 'unavailable');

  await database.connectDatabase();
  assert.equal(connectCalls, 2);
  assert.equal(database.databaseStatus(), 'connected');
  assert.equal(seedCalls - seedCallsBefore, 2);
});

test('an already-started Mongoose connection is awaited without starting a duplicate', async () => {
  env.MONGODB_URI = 'mongodb://database.example.test/gateway';
  env.NODE_ENV = 'test';
  let connectCalls = 0;
  let releaseConnection;
  const connectionGate = new Promise((resolve) => {
    releaseConnection = resolve;
  });
  mongoose.connect = async () => {
    connectCalls += 1;
  };
  mongoose.connection.asPromise = async () => {
    await connectionGate;
    setReadyState(1);
    mongoose.connection.emit('connected');
    return mongoose.connection;
  };

  setReadyState(2);
  const pending = database.connectDatabase();
  releaseConnection();
  await pending;

  assert.equal(connectCalls, 0);
  assert.equal(database.databaseStatus(), 'connected');
});

test('a development connection failure remains retryable and logs no MongoDB URI', async () => {
  const secretUri = 'mongodb://private-user:private-password@secret-host.example/gateway';
  env.MONGODB_URI = secretUri;
  env.NODE_ENV = 'development';
  let connectCalls = 0;
  const logEntries = [];
  logger.error = (payload, message) => logEntries.push({ payload, message });
  mongoose.connect = () => {
    connectCalls += 1;
    if (connectCalls === 1) {
      setReadyState(0);
      throw new Error(`Could not connect to ${secretUri}`);
    }
    setReadyState(1);
    mongoose.connection.emit('connected');
    return mongoose;
  };

  await database.connectDatabase();
  assert.equal(database.databaseStatus(), 'unavailable');
  await database.connectDatabase();

  assert.equal(connectCalls, 2);
  assert.equal(database.databaseStatus(), 'connected');
  const serializedLogs = JSON.stringify(logEntries);
  assert.equal(serializedLogs.includes('private-password'), false);
  assert.equal(serializedLogs.includes('secret-host.example'), false);
  assert.equal(serializedLogs.includes(secretUri), false);
});

test('connection error events update availability and expose only safely redacted errors', () => {
  const secretUri = 'mongodb://private-user:private-password@secret-host.example/gateway';
  const logEntries = [];
  logger.error = (payload, message) => logEntries.push({ payload, message });
  setReadyState(0);

  const connectionError = new Error(`Driver error for ${secretUri}`);
  connectionError.code = 'SERVER_SELECTION_FAILED';
  mongoose.connection.emit('error', connectionError);

  assert.equal(database.databaseStatus(), 'unavailable');
  assert.deepEqual(logEntries[0], {
    payload: {
      error: {
        name: 'Error',
        code: 'SERVER_SELECTION_FAILED',
        internalCode: undefined,
        statusCode: undefined,
        operation: undefined,
        stage: undefined,
        retryable: undefined,
        durationMs: undefined,
        timeoutReason: undefined,
        cause: undefined,
      },
    },
    message: 'MongoDB connection error',
  });
  assert.equal(JSON.stringify(logEntries).includes('private-password'), false);
  assert.equal(JSON.stringify(logEntries).includes('secret-host.example'), false);
});

test('concurrent clean disconnects share one driver operation', async () => {
  let disconnectCalls = 0;
  let releaseDisconnect;
  const disconnectGate = new Promise((resolve) => {
    releaseDisconnect = resolve;
  });
  mongoose.disconnect = async () => {
    disconnectCalls += 1;
    setReadyState(3);
    await disconnectGate;
    setReadyState(0);
    mongoose.connection.emit('disconnected');
  };
  setReadyState(1);
  mongoose.connection.emit('connected');

  const first = database.disconnectDatabase();
  const second = database.disconnectDatabase();
  await Promise.resolve();
  assert.equal(disconnectCalls, 1);
  releaseDisconnect();
  await Promise.all([first, second]);

  assert.equal(database.databaseStatus(), 'disconnected');
});
