const mongoose = require('mongoose');
const { safeId, schema, tenantFields } = require('./releaseModelFields');
const observationSchema = schema({
  releaseCandidateId: safeId(true),
  rolloutPlanId: safeId(true),
  ...tenantFields,
  status: { type: String, enum: ['pending', 'observing', 'healthy', 'degraded', 'rollback_recommended', 'roll_forward_required', 'completed'], default: 'pending' },
  startedAt: Date,
  endsAt: Date,
  completedAt: Date,
  categories: {
    requestSuccess: safeId(),
    queueWait: safeId(),
    workerUtilization: safeId(),
    databasePressure: safeId(),
    cacheHealth: safeId(),
    projectionLag: safeId(),
    providerAvailability: safeId(),
    regionalHealth: safeId(),
    sloEvaluation: safeId(),
  },
  alertCountCategory: safeId(),
  incidentCountCategory: safeId(),
});
observationSchema.index({ releaseCandidateId: 1, rolloutPlanId: 1 }, { unique: true, name: 'release_observation_identity' });
module.exports = mongoose.models.ReleaseObservationWindow || mongoose.model('ReleaseObservationWindow', observationSchema);
