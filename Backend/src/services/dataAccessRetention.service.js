const CacheInvalidationEvent = require('../models/CacheInvalidationEvent');
const QueryPerformanceSample = require('../models/QueryPerformanceSample');
const IndexDriftRecord = require('../models/IndexDriftRecord');
const LegalHold = require('../models/LegalHold');
const metrics = require('./dataAccessMetrics.service');

const RETAINED_MODELS = Object.freeze([
  { name: 'query_performance_samples', Model: QueryPerformanceSample, tenantScoped: true },
  { name: 'cache_invalidation_history', Model: CacheInvalidationEvent, tenantScoped: true },
  { name: 'index_drift_history', Model: IndexDriftRecord, tenantScoped: false },
]);

async function activeLegalHold(organizationId, workspaceId, options = {}) {
  if (!organizationId) return false;
  const now = new Date(options.now || Date.now());
  return Boolean(await (options.LegalHold || LegalHold).findOne({
    organizationId,
    status: 'ACTIVE',
    effectiveFrom: { $lte: now },
    $and: [
      { $or: [{ effectiveUntil: { $exists: false } }, { effectiveUntil: null }, { effectiveUntil: { $gt: now } }] },
      { $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }, { workspaceId }] },
    ],
  }).select('_id').lean());
}

async function cleanupPerformanceRetention(options = {}) {
  const now = new Date(options.now || Date.now());
  const maximumBatchSize = Math.max(1, Math.min(Number(options.maximumBatchSize || 100), 250));
  const results = [];
  for (const definition of options.models || RETAINED_MODELS) {
    const candidates = await definition.Model.find({ expiresAt: { $lte: now }, legalHoldProtected: { $ne: true } })
      .select('_id organizationId workspaceId')
      .sort({ expiresAt: 1, _id: 1 })
      .limit(maximumBatchSize)
      .lean();
    const deletable = [];
    const protectedIds = [];
    let holds = [];
    if (definition.tenantScoped && candidates.length) {
      const organizationIds = [...new Set(candidates.map((candidate) => candidate.organizationId).filter(Boolean))];
      holds = await (options.LegalHold || LegalHold).find({
        organizationId: { $in: organizationIds },
        status: 'ACTIVE',
        effectiveFrom: { $lte: now },
        $or: [{ effectiveUntil: { $exists: false } }, { effectiveUntil: null }, { effectiveUntil: { $gt: now } }],
      }).select('organizationId workspaceId').limit(1_001).lean();
    }
    const holdQueryOverflow = holds.length > 1_000;
    for (const candidate of candidates) {
      const protectedByHold = definition.tenantScoped && (holdQueryOverflow || holds.some((hold) => String(hold.organizationId) === String(candidate.organizationId) && (!hold.workspaceId || String(hold.workspaceId) === String(candidate.workspaceId))));
      if (protectedByHold) protectedIds.push(candidate._id);
      else deletable.push(candidate._id);
    }
    if (protectedIds.length) await definition.Model.updateMany({ _id: { $in: protectedIds } }, { $set: { legalHoldProtected: true } });
    const deletion = deletable.length ? await definition.Model.deleteMany({ _id: { $in: deletable } }) : { deletedCount: 0 };
    results.push({ collection: definition.name, scanned: candidates.length, deleted: deletion.deletedCount || 0, preserved: candidates.length - deletable.length });
  }
  metrics.increment('data_performance_retention_cleanup', { operation: 'bounded_cleanup', status: 'completed' }, results.reduce((total, item) => total + item.deleted, 0));
  return results;
}

module.exports = { RETAINED_MODELS, activeLegalHold, cleanupPerformanceRetention };
