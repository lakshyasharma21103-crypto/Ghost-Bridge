'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  assertPlainData,
  boundedSerialize,
} = require('@ghostbridge/protocol-core');

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
  atomicCompareAndSet: true,
  transactionalTerminalWrite: false,
  adapterName: 'ghostbridge-json-file',
  adapterVersion: '1',
});

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function emptyState() {
  return Object.fromEntries(COLLECTION_NAMES.map((name) => [name, {}]));
}

function validKey(value) {
  const key = String(value || '');
  if (!key || key.length > 1_000 || key === '__proto__' || key === 'constructor') {
    throw new TypeError('Persistent store key is invalid.');
  }
  return key;
}

class FileProtocolDatabase {
  constructor(directory) {
    if (typeof directory !== 'string' || !directory.trim()) {
      throw new TypeError('A persistent store directory is required.');
    }
    this.directory = path.resolve(directory);
    this.statePath = path.join(this.directory, 'ghostbridge-protocol-state.json');
    this.writeSequence = 0;
    this.queue = Promise.resolve();
    fs.mkdirSync(this.directory, { recursive: true });
    this.state = this.load();
  }

  load() {
    if (!fs.existsSync(this.statePath)) return emptyState();
    const parsed = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
    assertPlainData(parsed);
    const state = emptyState();
    for (const name of COLLECTION_NAMES) {
      if (
        parsed[name] &&
        typeof parsed[name] === 'object' &&
        !Array.isArray(parsed[name])
      ) {
        state[name] = parsed[name];
      }
    }
    return state;
  }

  async read(operation) {
    await this.queue;
    return clone(operation(this.state));
  }

  async exclusive(operation) {
    const next = this.queue.then(async () => {
      const draft = clone(this.state);
      const result = await operation(draft);
      assertPlainData(draft);
      const temporaryPath = `${this.statePath}.${process.pid}.${++this.writeSequence}.tmp`;
      const handle = await fs.promises.open(temporaryPath, 'wx');
      try {
        await handle.writeFile(boundedSerialize(draft), 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      await fs.promises.rename(temporaryPath, this.statePath);
      this.state = draft;
      return clone(result);
    });
    this.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async close() {
    await this.queue;
  }
}

class FileCollectionStore {
  constructor(database, collectionName, capabilities = BASE_CAPABILITIES) {
    this.database = database;
    this.collectionName = collectionName;
    this.capabilities = Object.freeze({ ...capabilities });
  }

  async get(key) {
    const normalized = validKey(key);
    return this.database.read((state) => state[this.collectionName][normalized]);
  }

  async put(key, value) {
    const normalized = validKey(key);
    assertPlainData(value);
    await this.database.exclusive((state) => {
      state[this.collectionName][normalized] = clone(value);
    });
  }

  async delete(key) {
    const normalized = validKey(key);
    return this.database.exclusive((state) => {
      const present = Object.hasOwn(state[this.collectionName], normalized);
      delete state[this.collectionName][normalized];
      return present;
    });
  }

  async has(key) {
    const normalized = validKey(key);
    return this.database.read((state) =>
      Object.hasOwn(state[this.collectionName], normalized),
    );
  }

  async values() {
    return this.database.read((state) => Object.values(state[this.collectionName]));
  }

  async scan() {
    return this.values();
  }

  async compareAndSet(key, expectedValue, nextValue) {
    const normalized = validKey(key);
    assertPlainData(nextValue);
    return this.database.exclusive((state) => {
      const current = state[this.collectionName][normalized];
      if (boundedSerialize(current ?? null) !== boundedSerialize(expectedValue ?? null)) {
        return false;
      }
      state[this.collectionName][normalized] = clone(nextValue);
      return true;
    });
  }
}

class FileApprovalDecisionStore extends FileCollectionStore {
  constructor(database) {
    super(database, 'approvalDecisions');
  }

  async putDecision(decision) {
    assertPlainData(decision);
    await this.database.exclusive((state) => {
      const key = validKey(decision.decisionId);
      if (Object.hasOwn(state.approvalDecisions, key)) {
        throw new Error('Approval Decision already exists.');
      }
      state.approvalDecisions[key] = clone(decision);
    });
  }

  async consumeApprovedDecision(criteria) {
    assertPlainData(criteria);
    return this.database.exclusive((state) => {
      const key = validKey(criteria.decisionId);
      const current = state.approvalDecisions[key];
      if (!matchesApprovalDecision(current, criteria)) return undefined;
      state.approvalDecisions[key] = {
        ...current,
        used: true,
        consumedAt: criteria.now,
      };
      return current;
    });
  }
}

class FileTerminalTransactionStore {
  constructor(database) {
    this.database = database;
    this.capabilities = Object.freeze({
      ...BASE_CAPABILITIES,
      transactionalTerminalWrite: true,
    });
  }

  async commitTerminal({ task, receipt, expectedTaskStates = [] }) {
    assertPlainData({ task, receipt, expectedTaskStates });
    if (
      !task?.taskId ||
      !receipt?.receiptId ||
      receipt.taskId !== task.taskId ||
      task.receiptReference !== receipt.receiptId ||
      !TERMINAL_STATES.has(task.state)
    ) {
      throw new TypeError('Terminal Task and Receipt transaction is invalid.');
    }
    return this.database.exclusive((state) => {
      const current = state.tasks[task.taskId];
      if (
        current &&
        TERMINAL_STATES.has(current.state) &&
        current.receiptReference === task.receiptReference
      ) {
        return {
          committed: true,
          idempotent: true,
          task: current,
          receipt: state.receipts[current.receiptReference],
        };
      }
      if (!current || !expectedTaskStates.includes(current.state)) {
        return {
          committed: false,
          recoveryRequired: true,
          reasonCode: 'TASK_STATE_CHANGED',
        };
      }
      const existingReceipt = state.receipts[receipt.receiptId];
      if (
        existingReceipt &&
        boundedSerialize(existingReceipt) !== boundedSerialize(receipt)
      ) {
        return {
          committed: false,
          recoveryRequired: true,
          reasonCode: 'RECEIPT_ID_CONFLICT',
        };
      }
      state.receipts[receipt.receiptId] = clone(receipt);
      state.tasks[task.taskId] = clone(task);
      return {
        committed: true,
        idempotent: false,
        task,
        receipt,
      };
    });
  }

  async recoverTerminalWrites() {
    return [];
  }
}

function matchesApprovalDecision(decision, criteria) {
  if (
    !decision ||
    decision.used ||
    decision.decision !== 'approved' ||
    decision.decisionId !== criteria.decisionId ||
    decision.invocationId !== criteria.invocationId ||
    decision.actionKey !== criteria.actionKey ||
    decision.approvalActionDigest !== criteria.approvalActionDigest ||
    decision.organizationScope !== criteria.organizationScope ||
    (decision.workspaceScope || undefined) !== (criteria.workspaceScope || undefined)
  ) {
    return false;
  }
  const expiresAt = Date.parse(decision.expiresAt || decision.validUntil || '');
  return Number.isFinite(expiresAt) && expiresAt > Date.parse(criteria.now);
}

function createFileProtocolStores(options = {}) {
  const database = new FileProtocolDatabase(options.directory);
  const stores = Object.fromEntries(
    COLLECTION_NAMES.map((name) => [
      name,
      name === 'approvalDecisions'
        ? new FileApprovalDecisionStore(database)
        : new FileCollectionStore(database, name),
    ]),
  );
  stores.terminalTransactions = new FileTerminalTransactionStore(database);
  Object.defineProperty(stores, 'close', {
    enumerable: false,
    value: () => database.close(),
  });
  return Object.freeze(stores);
}

module.exports = {
  createFileProtocolStores,
};
