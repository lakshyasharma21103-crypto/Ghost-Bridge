const mongoose = require('mongoose');
const { env } = require('./env');
const { logger, safeLogPayload } = require('../utils/logger');
const { ensureDevelopmentPartner } = require('../services/devSeedService');

let databaseState = 'disconnected';

function hasAuthSource(uri) {
  return /[?&]authSource=/i.test(uri);
}

async function connectDatabase() {
  if (!env.MONGODB_URI) {
    databaseState = 'not_configured';
    logger.warn('MongoDB URI is not configured; backend is running without persistence');
    return;
  }

  if (databaseState === 'connected' || databaseState === 'connecting') {
    return;
  }

  databaseState = 'connecting';
  try {
    await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 5000,
      autoIndex: env.NODE_ENV !== 'production',
      ...(!hasAuthSource(env.MONGODB_URI) ? { authSource: env.MONGODB_AUTH_SOURCE } : {}),
    });
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

async function disconnectDatabase() {
  if (databaseState === 'connected' || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  databaseState = 'disconnected';
}

function databaseStatus() {
  if (mongoose.connection.readyState === 1) return 'connected';
  return databaseState;
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  databaseStatus,
};
