const mongoose = require('mongoose');

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_VERSION = /^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$/;
const SAFE_TEXT = (value) =>
  !/(?:bearer\s+|mongodb(?:\+srv)?:\/\/|redis(?:s)?:\/\/|password\s*[=:]|api.?key\s*[=:]|private key)/i.test(
    String(value || ''),
  );

const safeId = (required = false) => ({
  type: String,
  required,
  trim: true,
  match: SAFE_ID,
  maxlength: 128,
});
const safeVersion = (required = false) => ({
  type: String,
  required,
  trim: true,
  match: SAFE_VERSION,
  maxlength: 64,
});
const safeText = (maximum = 1_000) => ({
  type: String,
  trim: true,
  maxlength: maximum,
  validate: SAFE_TEXT,
  default: '',
});
const safeCodes = {
  type: [{ type: String, trim: true, match: SAFE_ID, maxlength: 128 }],
  default: [],
  validate: (items) => items.length <= 100,
};
const tenantFields = {
  organizationId: { type: String, required: true, trim: true, maxlength: 200, index: true },
  workspaceId: { type: String, trim: true, maxlength: 200, index: true },
};
const requestFields = {
  requestId: { type: String, trim: true, maxlength: 200, index: true },
  traceId: { type: String, trim: true, maxlength: 200, index: true },
  idempotencyKeyHash: { type: String, select: false, trim: true, maxlength: 80 },
  requestFingerprint: { type: String, select: false, trim: true, maxlength: 80 },
};

function schema(definition, options = {}) {
  return new mongoose.Schema(definition, {
    timestamps: true,
    strict: 'throw',
    optimisticConcurrency: true,
    ...options,
  });
}

module.exports = {
  SAFE_ID,
  SAFE_TEXT,
  SAFE_VERSION,
  requestFields,
  safeCodes,
  safeId,
  safeText,
  safeVersion,
  schema,
  tenantFields,
};
