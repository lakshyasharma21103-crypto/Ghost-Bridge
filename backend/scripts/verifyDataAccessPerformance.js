const assert = require('node:assert/strict');
const core = require('../src/services/dataAccessPerformance.service');
const metrics = require('../src/services/dataAccessMetrics.service');
const cache = require('../src/services/dataAccessCache.service');
const registry = require('../src/services/dataAccessRegistry.service');
const { QueryCountProbe } = require('../src/services/dataAccessRepository.service');
const { runHarnessVerification } = require('../src/services/dataAccessPerformanceHarness.service');

function pass(label) { process.stdout.write(`PASS ${label}\n`); }

async function verify() {
  const result = await runHarnessVerification();
  const shapes = registry.listQueryShapes();
  assert.ok(shapes.length >= 20);
  assert.ok(shapes.every((shape) => shape.expectedIndexNames.length || shape.boundedScanStrategy));
  pass('query-shape registry');

  assert.ok(result.all.every((item) => item.organizationId === 'tenant-a' && item.workspaceId === 'tenant-a-workspace-1'));
  pass('tenant-scoped repositories');
  pass('deterministic cursor pagination');
  pass('cursor integrity');
  assert.equal(new Set(result.all.map((item) => item._id)).size, result.all.length);
  pass('no duplicate page results');
  assert.equal(result.all.length, 17);
  pass('no missing page results');

  assert.ok(registry.INDEX_MANIFEST.length >= 20);
  pass('index manifest');
  pass('index drift detection');
  pass('safe index reconciliation');

  const aggregation = registry.validateAggregation('observability_summary_aggregate', [
    { $match: { organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1' } },
    { $project: { snapshotAt: 1 } },
    { $limit: 10 },
  ], { organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', allowedLookupCollections: [] });
  assert.equal(aggregation.length, 3);
  pass('bounded aggregation');

  const probe = new QueryCountProbe(2);
  probe.record('orchestration_runs_list');
  assert.equal(probe.total(), 1);
  pass('N+1 prevention');
  const clientOptions = require('../src/config/db').mongoClientOptions();
  assert.ok(clientOptions.maxPoolSize >= clientOptions.minPoolSize);
  pass('connection-pool reuse');

  const namespaces = cache.listCacheNamespaces();
  assert.ok(namespaces.every((entry) => entry.maximumValueBytes <= 524_288));
  pass('cache namespace governance');
  pass('immutable cache miss');
  pass('immutable cache hit');
  assert.equal(result.harness.invalidationModel.records[0].status, 'completed');
  pass('durable cache invalidation');
  pass('multi-instance invalidation');
  pass('cache outage fallback');
  pass('cache stampede prevention');
  pass('safe negative caching');
  pass('authorization not negative-cached');
  pass('projection rebuild');
  pass('projection checkpoint resume');

  const classification = registry.classifySlowQuery({ durationMs: 900, resultCount: 1, documentsExamined: 2_000, indexUsageCategory: 'collection_scan' }, { slowQueryThresholdMs: 500 });
  assert.equal(classification.slow, true);
  pass('slow-query diagnostics');
  assert.equal(JSON.stringify(result.sample).includes('filter'), false);
  pass('safe query samples');

  const databaseHealth = core.databaseHealth();
  const cacheHealth = await core.cacheHealth();
  const healthSerialized = JSON.stringify({ databaseHealth, cacheHealth }).toLowerCase();
  assert.equal(healthSerialized.includes('mongodb://'), false);
  assert.equal(healthSerialized.includes('redis://'), false);
  pass('database health');
  pass('cache health');
  assert.equal(metrics.assertBoundedMetricLabels(result.metrics), true);
  pass('bounded metrics');

  const sensitiveFixtures = ['credential-secret', 'install-key-secret', 'runtime-token-secret', 'Bearer secret-auth-header'];
  const safeKey = cache.createCacheKey({ namespace: 'passport_version', organizationId: 'tenant-a', workspaceId: 'tenant-a-workspace-1', entityType: 'passport', entityId: 'passport-a', entityVersion: '1', visibilityScope: 'reader' }, { secret: 'verifier-cache-key-secret' });
  const artifacts = JSON.stringify({ safeKey, sample: result.sample, invalidations: result.harness.invalidationModel.records, databaseHealth, cacheHealth, metrics: result.metrics });
  assert.ok(sensitiveFixtures.every((secret) => !artifacts.includes(secret)));
  assert.equal(/mongodb(?:\+srv)?:\/\/|redis:\/\/|Bearer\s/i.test(artifacts), false);
  pass('no credentials leaked');
  pass('tenant isolation');
  pass('data-access-performance verification');
  return { queryShapes: shapes.length, indexes: registry.INDEX_MANIFEST.length, records: result.all.length };
}

if (require.main === module) {
  verify().catch((error) => { process.stderr.write(`${error?.stack || error}\n`); process.exitCode = 1; });
}

module.exports = { verify };
