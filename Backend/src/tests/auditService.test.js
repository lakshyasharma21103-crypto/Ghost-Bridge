const assert = require('node:assert/strict');
const test = require('node:test');
const AuditLog = require('../models/AuditLog');
const { listAuditLogs } = require('../services/auditService');

test('audit log reads are scoped to the receiving workspace and user and remain redacted', async () => {
  const originalFind = AuditLog.find;
  let filter;
  AuditLog.find = (nextFilter) => {
    filter = nextFilter;
    return {
      sort() {
        return this;
      },
      limit() {
        return this;
      },
      async lean() {
        return [
          {
            _id: 'audit_123',
            actorType: 'user',
            actorId: 'user_123',
            action: 'invocation.completed',
            entityType: 'Invocation',
            entityId: 'invocation_123',
            metadata: { receivingWorkspaceId: 'workspace_123', accessToken: 'must-not-leak' },
            createdAt: new Date('2030-01-01T00:00:00.000Z'),
          },
        ];
      },
    };
  };

  try {
    const result = await listAuditLogs({
      receivingWorkspaceId: 'workspace_123',
      receivingUserId: 'user_123',
    });
    assert.deepEqual(filter, {
      'metadata.receivingWorkspaceId': 'workspace_123',
      'metadata.receivingUserId': 'user_123',
    });
    assert.equal(result.items[0].metadata.accessToken, '[redacted]');
  } finally {
    AuditLog.find = originalFind;
  }
});
