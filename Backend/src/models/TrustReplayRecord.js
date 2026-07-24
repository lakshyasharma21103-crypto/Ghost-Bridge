const mongoose = require('mongoose');

const trustReplayRecordSchema = new mongoose.Schema(
  {
    issuerId: { type: String, required: true, maxlength: 500 },
    keyId: { type: String, required: true, maxlength: 128 },
    messageId: { type: String, required: true, maxlength: 200 },
    audienceDigest: { type: String, required: true, maxlength: 100 },
    connectionId: { type: String, maxlength: 200 },
    nonceDigest: { type: String, maxlength: 100 },
    consumedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false, strict: 'throw' },
);

trustReplayRecordSchema.index(
  { issuerId: 1, keyId: 1, messageId: 1, audienceDigest: 1, connectionId: 1, nonceDigest: 1 },
  { unique: true, name: 'unique_authenticated_message_replay' },
);
trustReplayRecordSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'expire_trust_replay_records' },
);

module.exports =
  mongoose.models.TrustReplayRecord ||
  mongoose.model('TrustReplayRecord', trustReplayRecordSchema);
