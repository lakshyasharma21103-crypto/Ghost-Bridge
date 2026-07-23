const mongoose = require('mongoose');

const SAFE_CATEGORY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_HASH = /^sha256:[a-f0-9]{64}$/;
const SAFE_TEXT = (value) => !/(bearer\s+|mongodb(?:\+srv)?:\/\/|redis:\/\/|credential|secret|password|api.?key|private key|provider.?account)/i.test(String(value || ''));
const count = { type: Number, required: true, min: 0, max: 100_000 };

const configurationHashSchema = new mongoose.Schema(
  {
    scaleConfigurationHash: { type: String, required: true, match: SAFE_HASH },
    performancePolicyHash: { type: String, required: true, match: SAFE_HASH },
    routingConfigurationHash: { type: String, required: true, match: SAFE_HASH },
    regionalConfigurationHash: { type: String, required: true, match: SAFE_HASH },
  },
  { _id: false, strict: 'throw' },
);

const schema = new mongoose.Schema(
  {
    fingerprintId: { type: String, required: true, trim: true, maxlength: 200, match: SAFE_CATEGORY, immutable: true },
    environmentCategory: { type: String, enum: ['local', 'ci', 'integration', 'staging', 'production_observation'], required: true, immutable: true },
    operatingSystemCategory: { type: String, required: true, trim: true, match: SAFE_CATEGORY, immutable: true },
    architectureCategory: { type: String, required: true, trim: true, match: SAFE_CATEGORY, immutable: true },
    runtimeVersion: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    applicationVersion: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    schemaVersion: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    migrationVersion: { type: String, required: true, trim: true, maxlength: 128, immutable: true },
    backendProcessCount: { ...count, immutable: true },
    executionWorkerCount: { ...count, immutable: true },
    recoveryWorkerCount: { ...count, immutable: true },
    controlPlaneWorkerCount: { ...count, immutable: true },
    databaseAdapterCategory: { type: String, required: true, trim: true, match: SAFE_CATEGORY, immutable: true },
    databaseTopologyCategory: { type: String, required: true, trim: true, match: SAFE_CATEGORY, immutable: true },
    cacheAdapterCategory: { type: String, required: true, trim: true, match: SAFE_CATEGORY, immutable: true },
    regionalSimulationCategory: { type: String, required: true, trim: true, match: SAFE_CATEGORY, immutable: true },
    cpuCapacityCategory: { type: String, required: true, trim: true, match: SAFE_CATEGORY, immutable: true },
    memoryCapacityCategory: { type: String, required: true, trim: true, match: SAFE_CATEGORY, immutable: true },
    networkCategory: { type: String, required: true, trim: true, match: SAFE_CATEGORY, immutable: true },
    configurationHashes: { type: configurationHashSchema, required: true, immutable: true },
    generatedAt: { type: Date, required: true, default: Date.now, immutable: true },
  },
  { timestamps: false, strict: 'throw' },
);

schema.index({ fingerprintId: 1 }, { unique: true, name: 'performance_environment_fingerprint_id' });
schema.index({ generatedAt: -1 }, { name: 'performance_environment_generated_at' });
for (const path of ['runtimeVersion', 'applicationVersion', 'schemaVersion', 'migrationVersion']) {
  schema.path(path).validate(SAFE_TEXT, 'Environment fingerprints must not contain credentials or environment values.');
}

module.exports = mongoose.models.PerformanceEnvironmentFingerprint || mongoose.model('PerformanceEnvironmentFingerprint', schema);
