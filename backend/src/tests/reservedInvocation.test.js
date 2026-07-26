const assert = require('node:assert/strict');
const test = require('node:test');
const Invocation = require('../models/Invocation');
const { encryptPayload } = require('../utils/crypto');
const { ErrorCodes } = require('../utils/errorCodes');
const { loadReservedInvocation } = require('../services/runtimeGateway.service');

const CONNECTION_ID = '507f1f77bcf86cd799439011';
const INVOCATION_ID = '507f1f77bcf86cd799439012';
const WORK_ITEM_ID = '507f1f77bcf86cd799439013';
const BINDING_ID = '507f1f77bcf86cd799439014';

function connection(overrides = {}) {
  return {
    _id: CONNECTION_ID,
    receivingWorkspaceId: 'workspace-a',
    runtimeType: 'rest',
    credentialBindingId: BINDING_ID,
    ...overrides,
  };
}

function actor(overrides = {}) {
  return {
    durableInvocationId: INVOCATION_ID,
    durableWorkItemId: WORK_ITEM_ID,
    durableAttemptNumber: 1,
    executionGeneration: 1,
    ...overrides,
  };
}

function invocation(overrides = {}) {
  return {
    _id: INVOCATION_ID,
    connectionId: CONNECTION_ID,
    receivingWorkspaceId: 'workspace-a',
    capability: 'research',
    lifecycleState: 'accepted',
    protectedReplayAvailable: true,
    currentWorkItemId: WORK_ITEM_ID,
    executionGeneration: 1,
    attemptCount: 0,
    retryState: 'not_scheduled',
    credentialBindingId: BINDING_ID,
    credentialRequirement: {
      adapterId: 'rest',
      purpose: 'runtime_invocation',
    },
    executionPayload: encryptPayload({ input: { topic: 'durability' } }),
    idempotencyScope: 'connection:fixture',
    idempotencyKeyHash: 'sha256:fixture',
    requestFingerprint: 'sha256:request',
    clientIdempotencyProvided: true,
    ...overrides,
  };
}

function queryResult(value) {
  const query = {
    select() {
      return query;
    },
    exec: async () => value,
  };
  return query;
}

async function withInvocationFindOne(implementation, callback) {
  const original = Invocation.findOne;
  Invocation.findOne = implementation;
  try {
    return await callback();
  } finally {
    Invocation.findOne = original;
  }
}

async function rejectsWithCode(callback, code, reasonCode) {
  await assert.rejects(callback, (error) => {
    assert.equal(error.code, code);
    if (reasonCode) assert.equal(error.reasonCode, reasonCode);
    return true;
  });
}

test('loads a reserved invocation using trusted ownership fields before credential validation', async () => {
  let observedFilter;
  await withInvocationFindOne(
    (filter) => {
      observedFilter = filter;
      return queryResult(invocation());
    },
    async () => {
      const result = await loadReservedInvocation({
        connection: connection(),
        capabilityName: 'research',
        actor: actor(),
      });
      assert.deepEqual(result.input, { topic: 'durability' });
      assert.equal(result.resumed, true);
    },
  );
  assert.deepEqual(observedFilter, {
    _id: INVOCATION_ID,
    connectionId: CONNECTION_ID,
    receivingWorkspaceId: 'workspace-a',
  });
  assert.equal(Object.hasOwn(observedFilter, 'credentialBindingId'), false);
  assert.equal(Object.hasOwn(observedFilter, 'credentialRequirement'), false);
});

test('rejects an unknown reserved invocation', async () => {
  await withInvocationFindOne(
    () => queryResult(null),
    () =>
      rejectsWithCode(
        () =>
          loadReservedInvocation({
            connection: connection(),
            capabilityName: 'research',
            actor: actor(),
          }),
        ErrorCodes.INVOCATION_NOT_FOUND,
      ),
  );
});

test('queries a reserved invocation with the current Connection ownership', async () => {
  let observedFilter;
  await withInvocationFindOne(
    (filter) => {
      observedFilter = filter;
      return queryResult(null);
    },
    () =>
      rejectsWithCode(
        () =>
          loadReservedInvocation({
            connection: connection({ _id: 'wrong-connection' }),
            capabilityName: 'research',
            actor: actor(),
          }),
        ErrorCodes.INVOCATION_NOT_FOUND,
      ),
  );
  assert.equal(observedFilter.connectionId, 'wrong-connection');
});

test('rejects a reserved invocation outside the current workspace', async () => {
  await withInvocationFindOne(
    (filter) => queryResult(filter.receivingWorkspaceId === 'workspace-b' ? null : invocation()),
    () =>
      rejectsWithCode(
        () =>
          loadReservedInvocation({
            connection: connection({ receivingWorkspaceId: 'workspace-b' }),
            capabilityName: 'research',
            actor: actor(),
          }),
        ErrorCodes.INVOCATION_NOT_FOUND,
      ),
  );
});

test('rejects a persisted credential binding mismatch', async () => {
  await withInvocationFindOne(
    () => queryResult(invocation({ credentialBindingId: '507f1f77bcf86cd799439099' })),
    () =>
      rejectsWithCode(
        () =>
          loadReservedInvocation({
            connection: connection(),
            capabilityName: 'research',
            actor: actor(),
          }),
        ErrorCodes.CREDENTIAL_VALIDATION_FAILED,
        'DURABLE_CREDENTIAL_BINDING_MISMATCH',
      ),
  );
});

test('rejects a persisted credential requirement mismatch', async () => {
  await withInvocationFindOne(
    () =>
      queryResult(
        invocation({
          credentialRequirement: { adapterId: 'mcp', purpose: 'runtime_invocation' },
        }),
      ),
    () =>
      rejectsWithCode(
        () =>
          loadReservedInvocation({
            connection: connection(),
            capabilityName: 'research',
            actor: actor(),
          }),
        ErrorCodes.CREDENTIAL_VALIDATION_FAILED,
        'DURABLE_CREDENTIAL_REQUIREMENT_MISMATCH',
      ),
  );
});

test('rejects a retry attempt mismatch', async () => {
  await withInvocationFindOne(
    () => queryResult(invocation({ attemptCount: 1, retryState: 'scheduled' })),
    () =>
      rejectsWithCode(
        () =>
          loadReservedInvocation({
            connection: connection(),
            capabilityName: 'research',
            actor: actor({ durableAttemptNumber: 1 }),
          }),
        ErrorCodes.DURABLE_WORK_FINALIZATION_CONFLICT,
        'DURABLE_ATTEMPT_MISMATCH',
      ),
  );
});

test('rejects an execution-generation mismatch', async () => {
  await withInvocationFindOne(
    () => queryResult(invocation({ executionGeneration: 2 })),
    () =>
      rejectsWithCode(
        () =>
          loadReservedInvocation({
            connection: connection(),
            capabilityName: 'research',
            actor: actor({ executionGeneration: 1 }),
          }),
        ErrorCodes.DURABLE_WORK_FINALIZATION_CONFLICT,
        'DURABLE_ATTEMPT_MISMATCH',
      ),
  );
});

test('rejects a concurrent claim whose lifecycle is no longer executable', async () => {
  await withInvocationFindOne(
    () => queryResult(invocation({ lifecycleState: 'running' })),
    () =>
      rejectsWithCode(
        () =>
          loadReservedInvocation({
            connection: connection(),
            capabilityName: 'research',
            actor: actor(),
          }),
        ErrorCodes.INVOCATION_CONCURRENT_CLAIM_REJECTED,
      ),
  );
});
