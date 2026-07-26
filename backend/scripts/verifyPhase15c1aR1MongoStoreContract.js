'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const {
  PROTOCOL_VERSION,
  boundedSerialize,
  digest,
} = require('@ghostbridge/protocol-core');
const {
  createGhostBridgeAgent,
} = require('../../packages/ghostbridge-native-agent/src');

const { MongoClient } = mongoose.mongo;
const CAPABILITY_KEY = 'fixture.mongo_store_contract';
const COLLECTION_NAMES = Object.freeze([
  'installGrants',
  'connections',
  'tasks',
  'taskContexts',
  'receipts',
  'approvals',
  'approvalDecisions',
  'idempotency',
  'replay',
  'revocation',
]);
const TERMINAL_STATES = new Set([
  'completed',
  'failed',
  'cancelled',
  'timed_out',
  'revoked',
]);
const BASE_CAPABILITIES = Object.freeze({
  persistence: 'durable',
  productionEligible: true,
  atomicCompareAndSet: true,
  transactionalTerminalWrite: false,
  atomicInstallGrantRedemption: false,
  adapterName: 'ghostbridge-mongodb',
  adapterVersion: '1',
});
const TRANSACTION_OPTIONS = Object.freeze({
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
  readPreference: 'primary',
});

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function storeError(errorCode, message = errorCode) {
  const error = new Error(message);
  error.code = errorCode;
  error.errorCode = errorCode;
  return error;
}

function safeKey(value) {
  const key = String(value || '');
  if (!key || key.length > 1_000 || key.includes('\0')) {
    throw new TypeError('MongoDB protocol store key is invalid.');
  }
  return key;
}

async function runTransaction(client, operation) {
  const session = client.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await operation(session);
    }, TRANSACTION_OPTIONS);
    return result;
  } finally {
    await session.endSession();
  }
}

class MongoProtocolCollectionStore {
  constructor(client, collection) {
    this.client = client;
    this.collection = collection;
    this.capabilities = BASE_CAPABILITIES;
  }

  async get(key) {
    const document = await this.collection.findOne({ _id: safeKey(key) });
    return clone(document?.value);
  }

  async put(key, value) {
    await this.collection.replaceOne(
      { _id: safeKey(key) },
      { _id: safeKey(key), value: clone(value) },
      { upsert: true },
    );
  }

  async delete(key) {
    const result = await this.collection.deleteOne({ _id: safeKey(key) });
    return result.deletedCount === 1;
  }

  async has(key) {
    return (await this.collection.countDocuments(
      { _id: safeKey(key) },
      { limit: 1 },
    )) === 1;
  }

  async values() {
    const documents = await this.collection.find({}).sort({ _id: 1 }).toArray();
    return documents.map((document) => clone(document.value));
  }

  async scan() {
    return this.values();
  }

  async compareAndSet(key, expectedValue, nextValue) {
    const normalized = safeKey(key);
    return runTransaction(this.client, async (session) => {
      const current = await this.collection.findOne(
        { _id: normalized },
        { session },
      );
      if (
        boundedSerialize(current?.value ?? null) !==
        boundedSerialize(expectedValue ?? null)
      ) {
        return false;
      }
      await this.collection.replaceOne(
        { _id: normalized },
        { _id: normalized, value: clone(nextValue) },
        { upsert: true, session },
      );
      return true;
    });
  }
}

class MongoApprovalDecisionStore extends MongoProtocolCollectionStore {
  async putDecision(decision) {
    await this.collection.insertOne({
      _id: safeKey(decision.decisionId),
      value: clone(decision),
    });
  }

  async consumeApprovedDecision(criteria) {
    const workspaceMatch = criteria.workspaceScope
      ? { 'value.workspaceScope': criteria.workspaceScope }
      : { 'value.workspaceScope': { $exists: false } };
    const result = await this.collection.findOneAndUpdate(
      {
        _id: safeKey(criteria.decisionId),
        'value.used': { $ne: true },
        'value.decision': 'approved',
        'value.invocationId': criteria.invocationId,
        'value.actionKey': criteria.actionKey,
        'value.approvalActionDigest': criteria.approvalActionDigest,
        'value.organizationScope': criteria.organizationScope,
        'value.expiresAt': { $gt: criteria.now },
        ...workspaceMatch,
      },
      {
        $set: {
          'value.used': true,
          'value.consumedAt': criteria.now,
        },
      },
      { returnDocument: 'before' },
    );
    const document =
      result && Object.hasOwn(result, '_id') ? result : result?.value;
    return clone(document?.value);
  }
}

class MongoTerminalTransactionStore {
  constructor(client, tasks, receipts, failureInjection) {
    this.client = client;
    this.tasks = tasks;
    this.receipts = receipts;
    this.failureInjection = failureInjection;
    this.capabilities = Object.freeze({
      ...BASE_CAPABILITIES,
      transactionalTerminalWrite: true,
    });
  }

  async commitTerminal({ task, receipt, expectedTaskStates = [] }) {
    if (
      !task?.taskId ||
      !receipt?.receiptId ||
      receipt.taskId !== task.taskId ||
      task.receiptReference !== receipt.receiptId ||
      !TERMINAL_STATES.has(task.state)
    ) {
      throw new TypeError('Terminal Task and Receipt transaction is invalid.');
    }
    return runTransaction(this.client, async (session) => {
      const currentDocument = await this.tasks.findOne(
        { _id: safeKey(task.taskId) },
        { session },
      );
      const current = currentDocument?.value;
      if (
        current &&
        TERMINAL_STATES.has(current.state) &&
        current.receiptReference === task.receiptReference
      ) {
        const storedReceipt = await this.receipts.findOne(
          { _id: current.receiptReference },
          { session },
        );
        return {
          committed: true,
          idempotent: true,
          task: clone(current),
          receipt: clone(storedReceipt?.value),
        };
      }
      if (!current || !expectedTaskStates.includes(current.state)) {
        return {
          committed: false,
          recoveryRequired: true,
          reasonCode: 'TASK_STATE_CHANGED',
        };
      }
      const existingReceipt = await this.receipts.findOne(
        { _id: safeKey(receipt.receiptId) },
        { session },
      );
      if (
        existingReceipt &&
        boundedSerialize(existingReceipt.value) !== boundedSerialize(receipt)
      ) {
        return {
          committed: false,
          recoveryRequired: true,
          reasonCode: 'RECEIPT_ID_CONFLICT',
        };
      }
      await this.receipts.replaceOne(
        { _id: safeKey(receipt.receiptId) },
        { _id: safeKey(receipt.receiptId), value: clone(receipt) },
        { upsert: true, session },
      );
      if (this.failureInjection.terminalAfterReceiptWrite) {
        this.failureInjection.terminalAfterReceiptWrite = false;
        throw new Error('Injected terminal transaction failure.');
      }
      await this.tasks.replaceOne(
        { _id: safeKey(task.taskId) },
        { _id: safeKey(task.taskId), value: clone(task) },
        { session },
      );
      return {
        committed: true,
        idempotent: false,
        task: clone(task),
        receipt: clone(receipt),
      };
    });
  }

  async recoverTerminalWrites() {
    return [];
  }
}

class MongoInstallGrantTransactionStore {
  constructor(client, installGrants, connections) {
    this.client = client;
    this.installGrants = installGrants;
    this.connections = connections;
    this.capabilities = Object.freeze({
      ...BASE_CAPABILITIES,
      atomicInstallGrantRedemption: true,
    });
  }

  async redeemInstallGrant(input) {
    return runTransaction(this.client, async (session) => {
      const grantDocument = await this.installGrants.findOne(
        { _id: safeKey(input.keyHash) },
        { session },
      );
      const grant = grantDocument?.value;
      if (!grant) throw storeError('INSTALL_GRANT_INVALID');
      if (grant.status === 'redeemed') {
        throw storeError('INSTALL_GRANT_ALREADY_REDEEMED');
      }
      if (grant.status === 'revoked') throw storeError('REVOKED');
      if (grant.status !== 'active') throw storeError('INSTALL_GRANT_INVALID');
      if (
        !Number.isFinite(Date.parse(input.now)) ||
        !Number.isFinite(Date.parse(grant.expiresAt)) ||
        Date.parse(grant.expiresAt) <= Date.parse(input.now)
      ) {
        throw storeError('INSTALL_GRANT_EXPIRED');
      }
      if (
        grant.organizationScope !== input.organizationScope ||
        (grant.workspaceScope || undefined) !==
          (input.workspaceScope || undefined)
      ) {
        throw storeError('SCOPE_MISMATCH');
      }
      const enabledCapabilityKeys = [
        ...new Set(input.approvedCapabilityKeys || []),
      ];
      if (
        enabledCapabilityKeys.length === 0 ||
        enabledCapabilityKeys.some(
          (capabilityKey) =>
            !grant.allowedCapabilityKeys.includes(capabilityKey),
        )
      ) {
        throw storeError('AUTHORIZATION_DENIED');
      }
      const connectionId = safeKey(input.connection?.connectionId);
      const existingConnection = await this.connections.findOne(
        { _id: connectionId },
        { session },
      );
      if (existingConnection) throw storeError('INSTALL_GRANT_INVALID');
      const connection = {
        ...clone(input.connection),
        organizationScope: grant.organizationScope,
        ...(grant.workspaceScope
          ? { workspaceScope: grant.workspaceScope }
          : {}),
        enabledCapabilityKeys,
        disabledCapabilityKeys: grant.allowedCapabilityKeys.filter(
          (capabilityKey) => !enabledCapabilityKeys.includes(capabilityKey),
        ),
      };
      const updatedGrant = {
        ...grant,
        status: 'redeemed',
        redeemedAt: input.now,
        connectionId,
      };
      await this.connections.insertOne(
        { _id: connectionId, value: clone(connection) },
        { session },
      );
      const update = await this.installGrants.replaceOne(
        { _id: safeKey(input.keyHash), 'value.status': 'active' },
        { _id: safeKey(input.keyHash), value: clone(updatedGrant) },
        { session },
      );
      if (update.modifiedCount !== 1) {
        throw storeError('INSTALL_GRANT_ALREADY_REDEEMED');
      }
      return {
        grant: clone(updatedGrant),
        connection: clone(connection),
      };
    });
  }
}

function createMongoProtocolStores(client, databaseName, failureInjection = {}) {
  const database = client.db(databaseName);
  const collections = Object.fromEntries(
    COLLECTION_NAMES.map((name) => [
      name,
      database.collection(`native_agent_${name}`),
    ]),
  );
  const stores = Object.fromEntries(
    COLLECTION_NAMES.map((name) => [
      name,
      name === 'approvalDecisions'
        ? new MongoApprovalDecisionStore(client, collections[name])
        : new MongoProtocolCollectionStore(client, collections[name]),
    ]),
  );
  stores.terminalTransactions = new MongoTerminalTransactionStore(
    client,
    collections.tasks,
    collections.receipts,
    failureInjection,
  );
  stores.installGrantTransactions = new MongoInstallGrantTransactionStore(
    client,
    collections.installGrants,
    collections.connections,
  );
  return Object.freeze(stores);
}

function fixturePassport(now = Date.now()) {
  return {
    protocolVersion: PROTOCOL_VERSION,
    passportId: 'passport_mongo_store_contract',
    passportVersion: '1',
    agentId: 'agent_mongo_store_contract',
    displayName: 'MongoDB Store Contract Agent',
    safeDescription: 'A bounded MongoDB production-store contract verifier.',
    issuer: 'https://issuer.example',
    issuedAt: new Date(now - 60_000).toISOString(),
    expiresAt: new Date(now + 86_400_000).toISOString(),
    status: 'active',
    capabilities: [CAPABILITY_KEY],
    supportedProtocolVersions: [PROTOCOL_VERSION],
    supportedTransports: ['https-json'],
    dataDeclarations: [],
    delegationDeclarations: [],
    approvalDeclarations: [],
    receiptSupport: true,
    revocationReference: 'https://issuer.example/revocations/passport',
  };
}

function registerCapability(agent) {
  agent.capability(CAPABILITY_KEY, {
    contract: {
      capabilityVersion: '1',
      displayName: 'MongoDB contract capability',
      safeDescription: 'Exercises the MongoDB Native Agent store contract.',
      inputContractReference: 'data:mongo-contract-input@1',
      outputContractReference: 'data:mongo-contract-output@1',
      acceptedDataClasses: ['business'],
      producedDataClasses: ['business'],
      prohibitedDataClasses: ['secret'],
      riskCategory: 'low',
      sideEffectCategory: 'read',
      idempotencySupport: 'optional',
      asynchronousSupport: true,
      cancellationSupport: true,
      requiredPermissions: [],
      approvalRequirement: 'none',
      delegationPolicy: { allowed: false },
      timeoutBounds: { minimumMs: 1, maximumMs: 10_000 },
      receiptRequirement: 'required',
      status: 'active',
    },
    handler: async ({ input }) => ({ outcome: 'completed', output: input }),
  });
}

function isolatedDatabaseName() {
  const base = String(process.env.MONGODB_DB_NAME || 'ghost_bridge_ci')
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .slice(0, 32);
  return `${base}_native_${randomUUID().replaceAll('-', '').slice(0, 10)}`;
}

async function main() {
  const uri = process.env.MONGODB_STORE_URI || process.env.MONGODB_URI;
  assert.ok(uri, 'MONGODB_STORE_URI or MONGODB_URI is required.');
  const databaseName = isolatedDatabaseName();
  const failureInjection = {};
  let client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  let cleanupClient = client;
  try {
    await client.connect();
    const hello = await client.db('admin').command({ hello: 1 });
    assert.ok(
      hello.setName,
      'MongoDB Native Agent store verification requires a replica set.',
    );
    const stores = createMongoProtocolStores(
      client,
      databaseName,
      failureInjection,
    );
    const passport = fixturePassport();
    const agent = createGhostBridgeAgent({
      mode: 'productionMode',
      publicBaseUrl: 'https://agent.example',
      hostAudience: 'host-mongo-store-contract',
      passport,
      stores,
      authorization: async () => ({
        allowed: true,
        principalId: 'host-mongo-store-contract',
        policyDecisionId: 'policy-mongo-store-contract',
        evaluatedAt: new Date().toISOString(),
        policyVersion: '1',
      }),
      revocationResolver: async () => ({
        status: 'active',
        freshness: 'fresh',
      }),
      receiptIssuer: async () => ({}),
      receiptIssuerGuaranteesSigned: true,
      receiptVerificationJwks: { keys: [] },
      authenticateHttpRequest: async () => ({
        subjectId: 'host-mongo-store-contract',
        authenticationMethod: 'mutual_tls',
        organizationScope: 'org_mongo_store_contract',
      }),
    });
    registerCapability(agent);

    const scope = {
      organizationScope: 'org_mongo_store_contract',
      workspaceScope: 'workspace_mongo_store_contract',
      allowedCapabilityKeys: [CAPABILITY_KEY],
    };
    const issuedGrant = await agent.issueInstallGrant(scope);
    const redemptionScope = {
      organizationScope: scope.organizationScope,
      workspaceScope: scope.workspaceScope,
      approvedCapabilityKeys: [CAPABILITY_KEY],
      hostAudience: 'host-mongo-store-contract',
    };
    const redemptions = await Promise.allSettled([
      agent.redeemInstallGrant(issuedGrant.key, redemptionScope),
      agent.redeemInstallGrant(issuedGrant.key, redemptionScope),
    ]);
    const winners = redemptions.filter((result) => result.status === 'fulfilled');
    const losers = redemptions.filter((result) => result.status === 'rejected');
    assert.equal(winners.length, 1);
    assert.equal(losers.length, 1);
    assert.equal(
      losers[0].reason.errorCode,
      'INSTALL_GRANT_ALREADY_REDEEMED',
    );
    const grantKeyHash = digest({ key: issuedGrant.key });
    const storedGrant = await stores.installGrants.get(grantKeyHash);
    const storedConnections = await stores.connections.values();
    assert.equal(storedConnections.length, 1);
    assert.equal(storedGrant.status, 'redeemed');
    assert.equal(storedGrant.connectionId, storedConnections[0].connectionId);
    assert.equal(
      winners[0].value.connectionId,
      storedConnections[0].connectionId,
    );

    const approvalNow = new Date().toISOString();
    const approvalDecision = {
      decisionId: 'decision_mongo_store_contract',
      decision: 'approved',
      invocationId: 'invocation_mongo_store_contract',
      actionKey: CAPABILITY_KEY,
      approvalActionDigest: 'approval-action-digest-mongo-store-contract',
      organizationScope: scope.organizationScope,
      workspaceScope: scope.workspaceScope,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      used: false,
    };
    await stores.approvalDecisions.putDecision(approvalDecision);
    const approvalCriteria = {
      decisionId: approvalDecision.decisionId,
      invocationId: approvalDecision.invocationId,
      actionKey: approvalDecision.actionKey,
      approvalActionDigest: approvalDecision.approvalActionDigest,
      organizationScope: approvalDecision.organizationScope,
      workspaceScope: approvalDecision.workspaceScope,
      now: approvalNow,
    };
    const consumptions = await Promise.all([
      stores.approvalDecisions.consumeApprovedDecision(approvalCriteria),
      stores.approvalDecisions.consumeApprovedDecision(approvalCriteria),
    ]);
    assert.equal(consumptions.filter(Boolean).length, 1);
    assert.equal(
      (await stores.approvalDecisions.get(approvalDecision.decisionId)).used,
      true,
    );

    const runningTask = {
      taskId: 'task_mongo_store_contract',
      state: 'running',
    };
    const receipt = {
      receiptId: 'receipt_mongo_store_contract',
      taskId: runningTask.taskId,
    };
    const terminalTask = {
      ...runningTask,
      state: 'completed',
      receiptReference: receipt.receiptId,
    };
    await stores.tasks.put(runningTask.taskId, runningTask);
    const terminal = await stores.terminalTransactions.commitTerminal({
      task: terminalTask,
      receipt,
      expectedTaskStates: ['running'],
    });
    assert.equal(terminal.committed, true);
    assert.equal(
      (await stores.tasks.get(runningTask.taskId)).receiptReference,
      receipt.receiptId,
    );
    assert.equal(
      (await stores.receipts.get(receipt.receiptId)).taskId,
      runningTask.taskId,
    );

    const rollbackTask = {
      taskId: 'task_mongo_store_contract_rollback',
      state: 'running',
    };
    const rollbackReceipt = {
      receiptId: 'receipt_mongo_store_contract_rollback',
      taskId: rollbackTask.taskId,
    };
    await stores.tasks.put(rollbackTask.taskId, rollbackTask);
    failureInjection.terminalAfterReceiptWrite = true;
    await assert.rejects(
      () =>
        stores.terminalTransactions.commitTerminal({
          task: {
            ...rollbackTask,
            state: 'failed',
            receiptReference: rollbackReceipt.receiptId,
          },
          receipt: rollbackReceipt,
          expectedTaskStates: ['running'],
        }),
      /Injected terminal transaction failure/,
    );
    assert.equal(
      (await stores.tasks.get(rollbackTask.taskId)).state,
      'running',
    );
    assert.equal(
      await stores.receipts.get(rollbackReceipt.receiptId),
      undefined,
    );

    await client.close();
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
    cleanupClient = client;
    await client.connect();
    const reconstructed = createMongoProtocolStores(client, databaseName);
    assert.equal(
      (await reconstructed.installGrants.get(grantKeyHash)).connectionId,
      storedConnections[0].connectionId,
    );
    assert.equal(
      (await reconstructed.connections.get(storedConnections[0].connectionId))
        .status,
      'active',
    );
    assert.equal(
      (await reconstructed.approvalDecisions.get(approvalDecision.decisionId))
        .used,
      true,
    );
    assert.equal(
      (await reconstructed.tasks.get(runningTask.taskId)).receiptReference,
      receipt.receiptId,
    );
    assert.equal(
      (await reconstructed.receipts.get(receipt.receiptId)).taskId,
      runningTask.taskId,
    );
    assert.equal(
      (await reconstructed.tasks.get(rollbackTask.taskId)).state,
      'running',
    );
    assert.equal(
      await reconstructed.receipts.get(rollbackReceipt.receiptId),
      undefined,
    );

    process.stdout.write(
      `${JSON.stringify({
        phase: '15C.1A-R1',
        verifier: 'mongo-store-contract',
        status: 'PASS',
        database: 'isolated',
        completedAt: new Date().toISOString(),
      })}\n`,
    );
  } finally {
    try {
      await cleanupClient.db(databaseName).dropDatabase();
    } finally {
      await cleanupClient.close();
    }
  }
}

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({
      phase: '15C.1A-R1',
      verifier: 'mongo-store-contract',
      status: 'FAIL',
      error: String(error?.message || error).slice(0, 500),
    })}\n`,
  );
  process.exitCode = 1;
});
