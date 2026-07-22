const crypto = require('node:crypto');
const { CACHE_NAMESPACES, CONSISTENCY_CLASSES } = require('../constants/dataAccessPerformance');
const { dataAccessError } = require('./dataAccessRegistry.service');

const namespaceRegistry = new Map(CACHE_NAMESPACES.map((entry) => [entry.namespace, Object.freeze({ ...entry })]));
const UNSAFE_KEY = /^(?:__proto__|constructor|prototype)$/i;
const SENSITIVE_KEY = /(authorization|bearer|credential|secret|token|api.?key|install.?key|password|private.?context|hidden.?reasoning|delegation.?reference|raw.?payload|decrypted)/i;
const SENSITIVE_STRING = /(?:\bBearer\s+[A-Za-z0-9._~+\/-]+=*|mongodb(?:\+srv)?:\/\/[^\s@]+@|redis:\/\/[^\s@]+@|-----BEGIN [A-Z ]+PRIVATE KEY-----)/i;
const CLASSIFICATION_RANK = Object.freeze({ public: 0, internal: 1, confidential: 2, restricted: 3 });

function namespaceDefinition(namespace) {
  const definition = namespaceRegistry.get(String(namespace || ''));
  if (!definition) throw dataAccessError('CACHE_NAMESPACE_NOT_ALLOWED', 'The cache namespace is not governed.');
  return definition;
}

function listCacheNamespaces() {
  return [...namespaceRegistry.values()].map((entry) => ({ ...entry }));
}

function digest(value, secret) {
  return crypto.createHmac('sha256', secret).update(String(value || 'none')).digest('base64url').slice(0, 24);
}

function createCacheKey(input = {}, options = {}) {
  const definition = namespaceDefinition(input.namespace);
  const secret = String(options.secret || '');
  if (Buffer.byteLength(secret, 'utf8') < 16) throw new Error('Cache key digest secret must contain at least 16 bytes.');
  const entityVersion = String(input.entityVersion || 'unversioned');
  const key = [
    'ghostbridge',
    `v${definition.serializationVersion}`,
    definition.namespace,
    `o_${digest(input.organizationId, secret)}`,
    `w_${digest(input.workspaceId, secret)}`,
    `e_${digest(`${input.entityType || 'entity'}:${input.entityId || 'none'}`, secret)}`,
    `r_${digest(entityVersion, secret)}`,
    `p_${digest(input.visibilityScope || 'default', secret)}`,
  ].join(':');
  if (Buffer.byteLength(key, 'utf8') > definition.maximumKeyBytes) {
    throw dataAccessError('CACHE_KEY_LIMIT_EXCEEDED', 'The governed cache key exceeds its namespace bound.');
  }
  return key;
}

function tenantCacheTag(organizationId, workspaceId, secret) {
  return workspaceId
    ? `workspace_${digest(`${organizationId}:${workspaceId}`, secret)}`
    : `tenant_${digest(organizationId, secret)}`;
}

function safeClone(value, path = 'value', depth = 0, seen = new Set()) {
  if (depth > 10) throw dataAccessError('CACHE_VALUE_REJECTED', 'The cache value exceeds the allowed object depth.');
  if (value == null || ['boolean', 'string'].includes(typeof value)) {
    if (typeof value === 'string' && SENSITIVE_STRING.test(value)) {
      throw dataAccessError('CACHE_VALUE_REJECTED', 'The cache value contains prohibited sensitive material.');
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw dataAccessError('CACHE_VALUE_REJECTED', 'The cache value contains a non-finite number.');
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value) || typeof value !== 'object') {
    throw dataAccessError('CACHE_VALUE_REJECTED', 'The cache value contains an unsupported type.');
  }
  if (seen.has(value)) throw dataAccessError('CACHE_VALUE_REJECTED', 'Circular cache values are prohibited.');
  seen.add(value);
  if (Array.isArray(value)) {
    if (value.length > 1_000) throw dataAccessError('CACHE_VALUE_REJECTED', 'The cache value contains an unbounded array.');
    const cloned = value.map((entry, index) => safeClone(entry, `${path}.${index}`, depth + 1, seen));
    seen.delete(value);
    return cloned;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw dataAccessError('CACHE_VALUE_REJECTED', 'Only plain JSON-compatible objects may be cached.');
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable) continue;
    if (descriptor.get || descriptor.set) throw dataAccessError('CACHE_VALUE_REJECTED', 'Cache serialization does not execute accessors.');
    if (UNSAFE_KEY.test(key) || SENSITIVE_KEY.test(key)) {
      throw dataAccessError('CACHE_VALUE_REJECTED', 'The cache value contains a prohibited field.', [{ path: `${path}.${key}`, message: 'Sensitive or executable field rejected.' }]);
    }
    output[key] = safeClone(descriptor.value, `${path}.${key}`, depth + 1, seen);
  }
  seen.delete(value);
  return output;
}

function serializeCacheValue(input = {}, options = {}) {
  const definition = namespaceDefinition(input.namespace);
  const classification = String(input.classification || 'internal');
  const scopeBinding = String(input.scopeBinding || '');
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(scopeBinding)) {
    throw dataAccessError('CACHE_VALUE_REJECTED', 'The cache scope binding is invalid.');
  }
  if (!Object.hasOwn(CLASSIFICATION_RANK, classification) || CLASSIFICATION_RANK[classification] > CLASSIFICATION_RANK[definition.allowedClassification]) {
    throw dataAccessError('CACHE_CLASSIFICATION_NOT_ALLOWED', 'The value classification is not allowed in this cache namespace.');
  }
  const now = Number(options.now || Date.now());
  const ttlMs = Math.max(1, Math.min(Number(input.ttlMs || definition.defaultTtlMs), definition.maximumTtlMs));
  const envelope = {
    serializationVersion: definition.serializationVersion,
    namespace: definition.namespace,
    classification,
    scopeBinding,
    negative: input.negative === true,
    generatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    value: safeClone(input.value),
  };
  const serialized = JSON.stringify(envelope);
  if (Buffer.byteLength(serialized, 'utf8') > definition.maximumValueBytes) {
    throw dataAccessError('CACHE_VALUE_LIMIT_EXCEEDED', 'The cache value exceeds its namespace byte limit.', [], 413);
  }
  return serialized;
}

function deserializeCacheValue(serialized, expected = {}, options = {}) {
  const definition = namespaceDefinition(expected.namespace);
  if (typeof serialized !== 'string' || Buffer.byteLength(serialized, 'utf8') > definition.maximumValueBytes) {
    throw dataAccessError('CACHE_VALUE_REJECTED', 'The cached serialization is invalid.');
  }
  let envelope;
  try {
    envelope = JSON.parse(serialized);
  } catch {
    throw dataAccessError('CACHE_VALUE_REJECTED', 'The cached serialization is invalid.');
  }
  if (
    envelope?.serializationVersion !== definition.serializationVersion ||
    envelope?.namespace !== definition.namespace ||
    envelope?.scopeBinding !== String(expected.scopeBinding || '')
  ) {
    throw dataAccessError('CACHE_VALUE_REJECTED', 'The cached serialization does not match its governed scope.');
  }
  const now = Number(options.now || Date.now());
  const expiresAt = Date.parse(envelope.expiresAt);
  if (!Number.isFinite(expiresAt)) throw dataAccessError('CACHE_VALUE_REJECTED', 'The cached expiration is invalid.');
  safeClone(envelope.value);
  return { ...envelope, expired: expiresAt <= now };
}

function entryBytes(key, value) {
  return Buffer.byteLength(String(key), 'utf8') + Buffer.byteLength(String(value), 'utf8');
}

class BoundedMemoryCacheAdapter {
  constructor(options = {}) {
    this.adapterType = 'bounded_memory';
    this.maximumEntries = Math.max(1, Math.min(Number(options.maximumEntries || 1_000), 100_000));
    this.maximumBytes = Math.max(1_024, Math.min(Number(options.maximumBytes || 32 * 1024 * 1024), 256 * 1024 * 1024));
    this.entries = new Map();
    this.tags = new Map();
    this.leases = new Map();
    this.totalBytes = 0;
    this.closed = false;
    this.statistics = { hits: 0, misses: 0, sets: 0, evictions: 0, errors: 0 };
  }

  prune(now = Date.now()) {
    for (const [key, entry] of this.entries) {
      if (entry.staleUntil > now) continue;
      this.remove(key);
    }
    for (const [key, lease] of this.leases) if (lease.expiresAt <= now) this.leases.delete(key);
  }

  remove(key) {
    const entry = this.entries.get(key);
    if (!entry) return false;
    this.entries.delete(key);
    this.totalBytes -= entry.bytes;
    for (const tag of entry.tags) {
      const keys = this.tags.get(tag);
      keys?.delete(key);
      if (!keys?.size) this.tags.delete(tag);
    }
    return true;
  }

  evict() {
    while (this.entries.size > this.maximumEntries || this.totalBytes > this.maximumBytes) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.remove(oldest);
      this.statistics.evictions += 1;
    }
  }

  async get(key, options = {}) {
    if (this.closed) return null;
    const now = Number(options.now || Date.now());
    const entry = this.entries.get(key);
    if (!entry) {
      this.statistics.misses += 1;
      return null;
    }
    if (entry.expiresAt <= now && !(options.allowStale === true && entry.staleUntil > now)) {
      this.remove(key);
      this.statistics.misses += 1;
      return null;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.statistics.hits += 1;
    return { value: entry.value, stale: entry.expiresAt <= now };
  }

  async set(key, value, options = {}) {
    if (this.closed) return false;
    const now = Number(options.now || Date.now());
    const ttlMs = Math.max(1, Math.min(Number(options.ttlMs || 60_000), 86_400_000));
    const staleTtlMs = Math.max(0, Math.min(Number(options.staleTtlMs || 0), 3_600_000));
    const bytes = entryBytes(key, value);
    if (bytes > this.maximumBytes) throw dataAccessError('CACHE_VALUE_LIMIT_EXCEEDED', 'The cache entry exceeds adapter capacity.');
    this.remove(key);
    const tags = new Set((options.tags || []).slice(0, 16).map(String));
    this.entries.set(key, { value: String(value), expiresAt: now + ttlMs, staleUntil: now + ttlMs + staleTtlMs, bytes, tags });
    this.totalBytes += bytes;
    for (const tag of tags) {
      const keys = this.tags.get(tag) || new Set();
      keys.add(key);
      this.tags.set(tag, keys);
    }
    this.statistics.sets += 1;
    this.evict();
    return true;
  }

  async delete(key) { return this.remove(key); }
  async getMany(keys, options) { return Promise.all(keys.slice(0, 250).map((key) => this.get(key, options))); }
  async setMany(entries) { return Promise.all(entries.slice(0, 250).map((entry) => this.set(entry.key, entry.value, entry.options))); }
  async deleteMany(keys) { return Promise.all(keys.slice(0, 250).map((key) => this.delete(key))); }

  async invalidateTags(tags) {
    const keys = new Set();
    for (const tag of tags.slice(0, 32)) for (const key of this.tags.get(String(tag)) || []) keys.add(key);
    await this.deleteMany([...keys]);
    return keys.size;
  }

  async increment(key, amount = 1, options = {}) {
    const current = await this.get(key);
    const value = Number(current?.value || 0) + Number(amount || 0);
    await this.set(key, String(value), options);
    return value;
  }

  async acquireLease(key, ownerToken, ttlMs, options = {}) {
    const now = Number(options.now || Date.now());
    const current = this.leases.get(key);
    if (current && current.expiresAt > now) return false;
    this.leases.set(key, { ownerToken: String(ownerToken), expiresAt: now + Math.max(1, Number(ttlMs || 1_000)) });
    return true;
  }

  async releaseLease(key, ownerToken) {
    const current = this.leases.get(key);
    if (!current || current.ownerToken !== String(ownerToken)) return false;
    this.leases.delete(key);
    return true;
  }

  async health() {
    this.prune();
    return {
      adapterType: this.adapterType,
      status: this.closed ? 'unavailable' : 'healthy',
      entryCount: this.entries.size,
      entryCategory: this.entries.size < this.maximumEntries * 0.5 ? 'low' : this.entries.size < this.maximumEntries * 0.85 ? 'moderate' : 'high',
      memoryUsageCategory: this.totalBytes < this.maximumBytes * 0.5 ? 'low' : this.totalBytes < this.maximumBytes * 0.85 ? 'moderate' : 'high',
      statistics: { ...this.statistics },
    };
  }

  async close() {
    this.closed = true;
    this.entries.clear();
    this.tags.clear();
    this.leases.clear();
    this.totalBytes = 0;
  }
}

class NoopCacheAdapter {
  constructor() { this.adapterType = 'noop'; }
  async get() { return null; }
  async set() { return false; }
  async delete() { return false; }
  async getMany(keys) { return keys.map(() => null); }
  async setMany(entries) { return entries.map(() => false); }
  async deleteMany(keys) { return keys.map(() => false); }
  async invalidateTags() { return 0; }
  async increment() { return 0; }
  async acquireLease() { return false; }
  async releaseLease() { return false; }
  async health() { return { adapterType: this.adapterType, status: 'disabled', entryCount: 0, entryCategory: 'none', memoryUsageCategory: 'none', statistics: { hits: 0, misses: 0, sets: 0, evictions: 0, errors: 0 } }; }
  async close() {}
}

class OptionalDistributedCacheAdapter {
  constructor(client, options = {}) {
    this.adapterType = 'distributed';
    this.client = client;
    this.commandTimeoutMs = Math.max(10, Math.min(Number(options.commandTimeoutMs || 500), 5_000));
    this.degraded = !client;
  }

  async command(operation, fallback) {
    if (!this.client) return fallback;
    let timer;
    try {
      const result = await Promise.race([
        Promise.resolve().then(operation),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('CACHE_COMMAND_TIMEOUT')), this.commandTimeoutMs); }),
      ]);
      this.degraded = false;
      return result;
    } catch {
      this.degraded = true;
      return fallback;
    } finally {
      clearTimeout(timer);
    }
  }

  tagKey(tag) { return `ghostbridge:cache-tag:${crypto.createHash('sha256').update(String(tag)).digest('base64url').slice(0, 32)}`; }
  async get(key) { const value = await this.command(() => this.client.get(key), null); return value == null ? null : { value, stale: false }; }
  async set(key, value, options = {}) {
    return this.command(async () => {
      const ttlMs = Math.max(1, Number(options.ttlMs || 60_000));
      const result = await this.client.set(key, value, { PX: ttlMs });
      for (const tag of (options.tags || []).slice(0, 16)) {
        const tagKey = this.tagKey(tag);
        await this.client.sAdd(tagKey, key);
        await this.client.pExpire(tagKey, ttlMs + Math.max(0, Number(options.staleTtlMs || 0)));
      }
      return result === 'OK' || result === true;
    }, false);
  }
  async delete(key) { return this.command(() => this.client.del(key), 0); }
  async getMany(keys) {
    const values = await this.command(() => this.client.mGet(keys.slice(0, 250)), keys.map(() => null));
    return values.map((value) => value == null ? null : { value, stale: false });
  }
  async setMany(entries) { return Promise.all(entries.slice(0, 250).map((entry) => this.set(entry.key, entry.value, entry.options))); }
  async deleteMany(keys) { return this.command(() => this.client.del(keys.slice(0, 250)), 0); }
  async invalidateTags(tags) {
    return this.command(async () => {
      const keys = new Set();
      const tagKeys = [];
      for (const tag of tags.slice(0, 32)) {
        const tagKey = this.tagKey(tag);
        tagKeys.push(tagKey);
        for (const key of await this.client.sMembers(tagKey)) keys.add(key);
      }
      if (keys.size) await this.client.del([...keys]);
      if (tagKeys.length) await this.client.del(tagKeys);
      return keys.size;
    }, 0);
  }
  async increment(key) { return this.command(() => this.client.incr(key), 0); }
  async acquireLease(key, ownerToken, ttlMs) { return this.command(async () => (await this.client.set(key, ownerToken, { NX: true, PX: ttlMs })) === 'OK', false); }
  async releaseLease(key, ownerToken) {
    if (typeof this.client?.eval !== 'function') return false;
    return this.command(async () => Number(await this.client.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      { keys: [key], arguments: [String(ownerToken)] },
    )) === 1, false);
  }
  async health() { return { adapterType: this.adapterType, status: this.degraded ? 'degraded' : 'healthy' }; }
  async close() { await this.command(() => this.client?.quit?.(), undefined); }
}

class CacheAsideService {
  constructor(options = {}) {
    this.adapter = options.adapter || new NoopCacheAdapter();
    this.keySecret = String(options.keySecret || 'development-cache-key-secret');
    this.singleFlights = new Map();
    this.metrics = options.metrics || { increment() {} };
  }

  async read(input, loader) {
    if (typeof input.authorize === 'function') await input.authorize();
    const definition = namespaceDefinition(input.namespace);
    if (input.consistencyClass === CONSISTENCY_CLASSES.STRONG_AUTHORITY) {
      this.metrics.increment('cache_bypass', { cacheNamespace: definition.namespace });
      return { value: await loader(), cacheOutcome: 'cache_bypass' };
    }
    const scopeBinding = digest(`${input.organizationId}:${input.workspaceId || 'none'}:${input.visibilityScope || 'default'}`, this.keySecret);
    const key = createCacheKey(input, { secret: this.keySecret });
    let cached;
    try {
      cached = await this.adapter.get(key, { allowStale: definition.staleReadAllowance === 'bounded' && input.allowStale === true });
      if (cached) {
        const envelope = deserializeCacheValue(cached.value, { namespace: definition.namespace, scopeBinding });
        if (!envelope.expired || (cached.stale && definition.staleReadAllowance === 'bounded')) {
          this.metrics.increment(cached.stale ? 'cache_stale_served' : 'cache_hit', { cacheNamespace: definition.namespace });
          return { value: envelope.negative ? null : envelope.value, cacheOutcome: cached.stale ? 'cache_stale_served' : 'cache_hit', negative: envelope.negative };
        }
      }
    } catch {
      this.metrics.increment('cache_error', { cacheNamespace: definition.namespace });
    }
    this.metrics.increment('cache_miss', { cacheNamespace: definition.namespace });
    if (this.singleFlights.has(key)) {
      this.metrics.increment('cache_refresh_contention', { cacheNamespace: definition.namespace });
      return this.singleFlights.get(key);
    }
    const operation = (async () => {
      const ownerToken = crypto.randomUUID();
      let leased = false;
      try {
        try {
          leased = await this.adapter.acquireLease(`${key}:refresh`, ownerToken, Math.min(definition.defaultTtlMs, 30_000));
        } catch {
          leased = false;
          this.metrics.increment('cache_error', { cacheNamespace: definition.namespace });
        }
        const loaded = await loader();
        const notFound = loaded == null;
        const negativeAllowed = ['immutable_not_found', 'public_not_found'].includes(definition.negativeCachePolicy) && input.negativeReason === 'not_found';
        if (notFound && !negativeAllowed) return { value: null, cacheOutcome: 'cache_miss', negative: false };
        const ttlMs = notFound ? Math.min(5_000, definition.defaultTtlMs) : Math.min(Number(input.ttlMs || definition.defaultTtlMs), definition.maximumTtlMs);
        const serialized = serializeCacheValue({ namespace: definition.namespace, classification: input.classification, scopeBinding, value: notFound ? { status: 'not_found' } : loaded, ttlMs, negative: notFound });
        try {
          const tags = [
            ...(input.tags || definition.invalidationTags),
            tenantCacheTag(input.organizationId, undefined, this.keySecret),
            ...(input.workspaceId ? [tenantCacheTag(input.organizationId, input.workspaceId, this.keySecret)] : []),
          ];
          await this.adapter.set(key, serialized, { ttlMs, staleTtlMs: definition.staleReadAllowance === 'bounded' ? Math.min(ttlMs, 30_000) : 0, tags });
        } catch {
          this.metrics.increment('cache_error', { cacheNamespace: definition.namespace });
        }
        return { value: notFound ? null : loaded, cacheOutcome: leased ? 'cache_refresh_owner' : 'cache_miss', negative: notFound };
      } finally {
        if (leased) {
          try { await this.adapter.releaseLease(`${key}:refresh`, ownerToken); } catch { this.metrics.increment('cache_error', { cacheNamespace: definition.namespace }); }
        }
      }
    })().finally(() => this.singleFlights.delete(key));
    this.singleFlights.set(key, operation);
    return operation;
  }

  async invalidate(input) {
    const definition = namespaceDefinition(input.namespace);
    if (input.key) return this.adapter.delete(input.key);
    return this.adapter.invalidateTags((input.tags || definition.invalidationTags).slice(0, 32));
  }
}

module.exports = {
  BoundedMemoryCacheAdapter,
  CacheAsideService,
  NoopCacheAdapter,
  OptionalDistributedCacheAdapter,
  createCacheKey,
  deserializeCacheValue,
  listCacheNamespaces,
  namespaceDefinition,
  safeClone,
  serializeCacheValue,
  tenantCacheTag,
};
