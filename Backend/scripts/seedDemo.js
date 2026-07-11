const { env } = require('../src/config/env');
const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const { seedFlowAiDemo } = require('../src/services/demoService');

function fail(message) {
  console.error(`FlowAI demo seed failed: ${message}`);
  process.exitCode = 1;
}

async function main() {
  if (env.NODE_ENV !== 'development') {
    fail('NODE_ENV must be development.');
    return;
  }
  if (!env.MONGODB_URI) {
    fail('MONGODB_URI must be configured before seeding the demo.');
    return;
  }

  try {
    await connectDatabase();
    if (databaseStatus() !== 'connected') {
      fail('MongoDB is unavailable. Check the local database configuration.');
      return;
    }

    const result = await seedFlowAiDemo();
    console.log('FlowAI Demo is ready.');
    console.log(`Partner: ${result.partner.name} (${result.partner.slug})`);
    console.log(`Passport ID: ${result.passport.passportId}`);
    console.log(`Runtime endpoint: ${result.runtimeEndpoint}`);
    console.log('Partner API key, shown once for this development seed:');
    console.log(result.apiKey);
  } catch (error) {
    fail(error?.code ? `${error.code}: ${error.message}` : 'Unable to seed the demo.');
  } finally {
    await disconnectDatabase().catch(() => undefined);
  }
}

void main();
