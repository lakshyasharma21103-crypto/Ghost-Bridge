const mongoose = require('mongoose');
const { connectDatabase, databaseStatus, disconnectDatabase } = require('../src/config/db');
const models = require('../src/models');
const core = require('../src/services/dataAccessPerformance.service');

const phaseModels = [
  models.DataAccessPerformancePolicy,
  models.CacheInvalidationEvent,
  models.QueryPerformanceSample,
  models.ProjectionMetadata,
  models.IndexDriftRecord,
];

function comparable(keys, options = {}) {
  return JSON.stringify({ keys, unique: options.unique === true, sparse: options.sparse === true, partialFilterExpression: options.partialFilterExpression || null, expireAfterSeconds: options.expireAfterSeconds ?? null, collation: options.collation || null });
}

async function duplicatePreflight(collection, keys) {
  const id = Object.fromEntries(Object.keys(keys).map((field) => [field, `$${field}`]));
  const duplicate = await collection.aggregate([
    { $group: { _id: id, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  ], { maxTimeMS: 10_000, allowDiskUse: false }).toArray();
  return duplicate.length === 0;
}

async function ensureModelIndexes(Model) {
  const collection = Model.collection;
  let existing = [];
  try { existing = await collection.indexes(); } catch (error) { if (error?.code !== 26 && error?.codeName !== 'NamespaceNotFound') throw error; }
  const results = [];
  for (const [keys, rawOptions] of Model.schema.indexes()) {
    const options = { ...rawOptions };
    const named = options.name && existing.find((entry) => entry.name === options.name);
    if (named && comparable(named.key, named) !== comparable(keys, options)) {
      results.push({ indexName: options.name, action: 'migration_required', safeReasonCode: 'INDEX_DEFINITION_MISMATCH' });
      continue;
    }
    const equivalent = existing.find((entry) => comparable(entry.key, entry) === comparable(keys, options));
    if (equivalent) { results.push({ indexName: options.name || equivalent.name, action: 'verified' }); continue; }
    if (options.unique && !(await duplicatePreflight(collection, keys))) {
      results.push({ indexName: options.name, action: 'migration_required', safeReasonCode: 'DUPLICATE_PREFLIGHT_FAILED' });
      continue;
    }
    await collection.createIndex(keys, options);
    results.push({ indexName: options.name, action: 'created' });
    existing = await collection.indexes();
  }
  return results;
}

async function migrate() {
  core.timeoutHierarchy();
  await connectDatabase();
  if (databaseStatus() !== 'connected') throw new Error('MongoDB is required for the data-access performance migration.');
  const modelResults = [];
  for (const Model of phaseModels) modelResults.push(...await ensureModelIndexes(Model));
  const manifestResults = [];
  for (const entry of core.INDEX_MANIFEST) {
    manifestResults.push(await core.reconcileGovernedIndex(entry.indexName, { allowPrivilegedUnique: true }));
  }
  return { modelResults, manifestResults };
}

if (require.main === module) {
  migrate()
    .then((result) => {
      for (const item of [...result.modelResults, ...result.manifestResults]) process.stdout.write(`${item.action.toUpperCase()} ${item.indexName}\n`);
    })
    .catch((error) => { process.stderr.write(`${error?.message || error}\n`); process.exitCode = 1; })
    .finally(() => disconnectDatabase());
}

module.exports = { ensureModelIndexes, migrate };
