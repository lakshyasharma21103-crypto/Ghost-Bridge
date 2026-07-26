'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  approvalActionDigest,
  createApprovalAction,
  validateApprovalChallenge,
  validateApprovalDecision,
} = require('../src');

function action(overrides = {}) {
  return {
    invocationId: 'invocation_approval_r1',
    connectionId: 'connection_approval_r1',
    capabilityKey: 'payments.transfer',
    capabilityVersion: '2.1.0',
    organizationScope: 'organization_r1',
    workspaceScope: 'workspace_r1',
    inputContractReference: 'contracts/payments.transfer/input/2.1.0',
    payload: {
      amount: 1250,
      beneficiary: {
        accountId: 'account_approved',
        routingCategory: 'domestic',
      },
    },
    sideEffectCategory: 'financial',
    approvalLimits: { maximumAmount: 2000, currency: 'USD' },
    policyDecisionReference: 'policy_decision_r1',
    validityBoundary: '2099-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('approval action digest is canonical and binds every authority field', () => {
  const canonical = approvalActionDigest(action());
  const reordered = approvalActionDigest(action({
    payload: {
      beneficiary: {
        routingCategory: 'domestic',
        accountId: 'account_approved',
      },
      amount: 1250,
    },
    approvalLimits: { currency: 'USD', maximumAmount: 2000 },
  }));
  assert.equal(reordered, canonical);

  const changes = [
    { payload: { ...action().payload, amount: 1251 } },
    { payload: { ...action().payload, beneficiary: { ...action().payload.beneficiary, accountId: 'changed' } } },
    { capabilityVersion: '2.1.1' },
    { connectionId: 'connection_other' },
    { inputContractReference: 'contracts/payments.transfer/input/3.0.0' },
    { organizationScope: 'organization_other' },
    { workspaceScope: 'workspace_other' },
    { approvalLimits: { maximumAmount: 1500, currency: 'USD' } },
    { policyDecisionReference: 'policy_decision_other' },
    { validityBoundary: '2099-01-02T00:00:00.000Z' },
  ];
  for (const change of changes) {
    assert.notEqual(approvalActionDigest(action(change)), canonical);
  }
});

test('approval validators require a well-formed matching action digest', () => {
  const approvalActionDigestValue = approvalActionDigest(action());
  const challenge = {
    challengeId: 'challenge_r1',
    invocationId: 'invocation_approval_r1',
    organizationScope: 'organization_r1',
    workspaceScope: 'workspace_r1',
    actionKey: 'payments.transfer',
    approvalActionDigest: approvalActionDigestValue,
    safeSummary: 'Approve a bounded transfer.',
    requiredRoleCategories: ['finance_manager'],
    approvalLimits: { maximumAmount: 2000, currency: 'USD' },
    expiresAt: '2099-01-01T00:00:00.000Z',
    requestedBy: 'agent_r1',
    policyDecisionReference: 'policy_decision_r1',
    status: 'pending',
  };
  const decision = {
    challengeId: challenge.challengeId,
    decisionId: 'decision_r1',
    decision: 'approved',
    approvalActionDigest: approvalActionDigestValue,
    approvedLimits: { maximumAmount: 1500, currency: 'USD' },
    decidedBy: 'approver_r1',
    decidedAt: '2026-07-26T00:00:00.000Z',
    safeReasonCode: 'WITHIN_LIMITS',
  };
  assert.equal(validateApprovalChallenge(challenge), challenge);
  assert.equal(validateApprovalDecision(decision, challenge), decision);

  assert.throws(
    () => validateApprovalChallenge({ ...challenge, approvalActionDigest: undefined }),
    (error) => error.errorCode === 'INVALID_MESSAGE' || error.errorCode === 'APPROVAL_INVALID',
  );
  assert.throws(
    () => validateApprovalChallenge({ ...challenge, approvalActionDigest: 'not-a-digest' }),
    (error) => error.errorCode === 'APPROVAL_INVALID',
  );
  assert.throws(
    () => validateApprovalDecision({ ...decision, approvalActionDigest: approvalActionDigest(action({ payload: { amount: 99 } })) }, challenge),
    (error) => error.errorCode === 'APPROVAL_INVALID',
  );
  const malformedAction = action();
  delete malformedAction.payload;
  malformedAction.payloadDigest = 'malformed';
  assert.throws(
    () => createApprovalAction(malformedAction),
    (error) => error.errorCode === 'APPROVAL_INVALID',
  );
});
