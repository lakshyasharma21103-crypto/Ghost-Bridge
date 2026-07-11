const { env } = require('../src/config/env');
const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const { seedDeveloperSandbox } = require('../src/services/developerSandboxService');

function fail(message) {
  console.error(`Developer Sandbox seed failed: ${message}`);
  process.exitCode = 1;
}

async function main() {
  if (env.NODE_ENV !== 'development') {
    fail('NODE_ENV must be development.');
    return;
  }
  if (!env.MONGODB_URI) {
    fail('MONGODB_URI must be configured before seeding the sandbox.');
    return;
  }

  try {
    await connectDatabase();
    if (databaseStatus() !== 'connected') {
      fail('MongoDB is unavailable. Check the local database configuration.');
      return;
    }

    const result = await seedDeveloperSandbox();
    console.log('Developer Sandbox is ready.');
    console.log(`Partner: ${result.partner.name} (${result.partner.slug})`);
    console.log(`Passport ID: ${result.passport.passportId}`);
    console.log(`Runtime endpoint: ${result.runtimeEndpoint}`);
    if (result.created) {
      console.log('Partner API key, shown once for this development sandbox:');
      console.log(result.apiKey);
    } else {
      console.log('Existing sandbox partner retained. Its API key cannot be recovered or displayed again.');
    }
  } catch (error) {
    fail(error?.code ? `${error.code}: ${error.message}` : 'Unable to seed the sandbox.');
  } finally {
    await disconnectDatabase().catch(() => undefined);
  }
}

void main();
