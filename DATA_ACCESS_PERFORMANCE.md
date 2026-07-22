# Data-access performance architecture

Phase 13E2 makes MongoDB access, optional caching, diagnostics, indexes, and materialized read models explicit and bounded. MongoDB remains authoritative. A cache miss, cache loss, invalidation delay, or process restart cannot change authorization, policy, revocation, cancellation, queue claims, fencing, quota accounting, or orchestration state.

## Consistency and authority

| Class | Examples | Read/write rule | Cache rule |
| --- | --- | --- | --- |
| `strong_authority` | RBAC, activation, revocation, cancellation, claims, fencing, reservations, approvals, execution state | Authoritative MongoDB path; durable write completes before success | Current decisions are bypassed; cache cannot grant authority |
| `versioned_immutable` | Passport, definition, policy, recovery-policy and contract versions | Version is immutable and historically addressable | Versioned cache key is allowed after authorization; active alias is short lived and invalidated |
| `eventual_projection` | Timelines, traces, fleet/SLO/query summaries | Rebuildable read model; response includes generated/staleness metadata | Bounded stale-while-revalidate is allowed only for registered namespaces |

Critical writes never use write-behind caching. External HTTP and agent invocations are forbidden inside database transactions. Single-document atomic updates are preferred. Short bounded transactions are reserved for genuine multi-document authority changes and use deterministic idempotency plus bounded transient retries.

Critical reads use the deployment-compatible primary-authority path. Secondary-capable reads are reserved for explicitly stale-capable analytics and must expose `generatedAt` and lag metadata. Local tests do not require a replica set.

## Governed repositories and query shapes

`Backend/src/services/dataAccessRepository.service.js` accepts a trusted context containing organization, optional workspace, actor, request, trace, visibility scope, query-shape ID, and repository budget. It centrally applies tenant scope, explicit projections, stable sort, page/result bounds, `maxTimeMS`, and a safe static query comment. Authorization remains in the existing RBAC/policy layer; the repository is an additional cross-tenant safety boundary.

`Backend/src/constants/dataAccessPerformance.js` contains the closed query-shape registry. Shapes cover run lists, ready/retry/compensation claims, delegation and selection lookups, approval/intervention queues, timelines, traces, SLOs, alerts, workers, partitions, quota/admission records, observability, performance diagnostics, invalidation claims, and projections. Shape names never contain tenant or entity IDs. Externally supplied filter/sort fields are allowlisted.

The validator rejects unknown shapes/fields, excessive filters/sorts/results/batches, oversized encoded input, `$where`, `$function`, `$accumulator`, regex operators, server-side JavaScript, arbitrary pipeline JSON, unbounded lookups/graph lookups/facets, and unbounded public collection scans. Governed aggregations begin with organization/workspace `$match`, use an allowlisted stage set, bound lookup cardinality, apply a result limit, and run with an explicit timeout. `allowDiskUse` is off unless an internal caller explicitly governs it.

The orchestration run API uses signed cursor pagination. The HMAC-protected opaque cursor binds the query shape, sort, safe filter digest, organization/workspace scope digests, last sort values, stable record ID, issue time, and expiration. Cross-scope, expired, mismatched, malformed, and tampered cursors are rejected. Large page numbers without a cursor are rejected. The progress view hydrates all page runs through one tenant-scoped aggregation; reusable bounded batch hydration and query-count probes protect other list views from N+1 access.

## Index manifest, drift, and migration

`Backend/src/services/dataAccessRegistry.service.js` defines deterministic index names, ordered key specifications, purpose, related shapes, options, and migration version. Drift comparison reports `healthy`, `missing`, `mismatched`, `unexpected`, `migration_required`, `duplicate`, or `unsupported`, including key, uniqueness, partial-filter, TTL, sparse, and collation mismatches. Unsafe unexpected names are not reflected verbatim.

Startup validates the timeout hierarchy, reads index state, and records a bounded safe drift snapshot. It does not reconcile or drop indexes. `npm run migrate:data-access-performance` is the explicit restart-safe additive migration. It verifies equivalent indexes, performs a bounded duplicate preflight before unique creation, creates missing safe indexes, and never drops or rewrites indexes. The protected reconcile API can create one manifest index only when it is non-destructive; uniqueness/TTL/key changes remain explicit migrations.

## Connections and timeouts

`Backend/src/config/db.js` retains one shared Mongoose/MongoDB client per process and applies bounded minimum/maximum pool size, maximum connecting, wait-queue timeout, server-selection timeout, socket/connect timeout, idle lifetime, and heartbeat frequency. Driver pool events feed category-only health. URIs, hosts, topology, and credentials are not returned or used as metric labels. Shutdown closes the cache and shared database client gracefully.

Validated ordering is `database operation < repository budget < service budget < HTTP timeout`. For workers it is `database operation < lease safety margin < worker operation < durable job lease`. Invalid ordering fails configuration loading. Safe error categories distinguish operation, selection, pool-wait, unavailable, and invalid-hierarchy failures.

## Cache architecture

The provider-neutral adapter operations are get/set and bulk variants, delete, tag invalidation, increment, refresh leases, health, and close.

- `BoundedMemoryCacheAdapter` provides per-process LRU eviction, entry/byte bounds, TTL, optional bounded stale lifetime, tags, and non-authoritative leases.
- `OptionalDistributedCacheAdapter` wraps a Redis-compatible injected client with command timeout, shared tag sets, atomic refresh-lease release, and graceful degradation. No cloud provisioning or credential persistence is included.
- `NoopCacheAdapter` preserves correctness with caching disabled.

Namespaces define classification ceiling, default/maximum TTL, key/value bytes, failure behavior, stale policy, tags, serialization version, compression policy, and negative-cache policy. Decrypted credentials, provider/API/install keys, authorization headers, runtime tokens, raw secrets, unrestricted payloads, internal delegation references, hidden reasoning, and mutable authority are prohibited.

Keys have the form `ghostbridge:v<serialization>:<namespace>:<tenant digest>:<workspace digest>:<entity digest>:<version digest>:<visibility digest>`. Scope/entity material uses keyed HMAC digests, never plain low-entropy hashes or raw identifiers. Keys do not authorize access.

Serialization accepts only own enumerable plain JSON data, rejects accessors without executing them, rejects executable/prototype/circular/deep structures and sensitive fields or credential-shaped strings, and enforces the namespace byte limit. Envelopes bind serialization version, namespace, classification, scope digest, generated time, expiry, negative marker, and safe value.

Cache-aside always authorizes first. Strong authority bypasses cache. Safe immutable/eventual reads may use cache, then fall back to MongoDB and store a safe projection. Per-process single flight plus optional refresh leases bound stampedes; lease failure never blocks the authoritative load. Stale serving is limited to explicitly eventual namespaces. Negative caching requires an eligible namespace, exact safe `not_found` result, tenant/workspace binding, and short TTL. Authorization/policy denials, suspensions, credential failures, and transient database/provider failures are never negative-cached.

## Durable invalidation and version aliases

`CacheInvalidationEvent` is a durable outbox-style record containing scope, namespace, entity reference/version, safe tags/reason, sequence, retry state, request/trace IDs, and a fenced lease. It never stores a cached value or raw payload. Creation follows the authoritative write; failure to delete cache never rolls back MongoDB. Workers claim in sequence with owner/epoch/expiry, process idempotently, retry with a bound, and reject stale finalization.

Immutable versions keep immutable keys during activation. Only the short-lived active alias tag is invalidated, so authorized historical reads remain valid. Each cache entry also has HMAC tenant/workspace tags. Tenant deletion invalidates the tenant tag and deletes invalidation, projection, sample, and performance-policy metadata. Local active-alias TTL is the correctness-independent upper bound when an instance misses an invalidation; authority checks still use MongoDB.

## Projections, retention, and document size

Registered projections store organization/workspace, name/version, source sequence, resumable checkpoint, processing/rebuild timestamps, generated time, status, lag category, safe failure, and fenced lease. Rebuilds are tenant scoped, idempotent, bounded by batch, backpressure aware, resumable after lease expiry, and write safe projections with idempotency keys. Source records are never overwritten. Pause/resume/rebuild APIs require RBAC, policy evaluation, operational guard, idempotency, and audit; rebuild and resume requests enter the claimable `delayed` state before a fenced worker owns them.

Pre-write size estimation categorizes `small`, `medium`, `large`, `near_limit`, or `rejected`. Cache and projection writes enforce byte/depth/array bounds and prohibit sensitive duplication. Large histories remain child collections rather than embedded unbounded arrays.

Performance retention uses bounded batches for query samples, invalidation history, and drift snapshots. The data-access worker schedules cleanup periodically and batches legal-hold lookup rather than issuing one query per candidate. Tenant-scoped candidates are conservatively preserved when any active organization/workspace legal hold applies. TTL indexes apply only when `legalHoldProtected` is false. Audit/compliance evidence is outside performance cleanup.

## Diagnostics, health, metrics, and APIs

Query samples retain only shape/operation, duration and result counts, examined/index/cache/timeout categories, consistency, safe failure, request/trace IDs, and expiry. Raw filters, search terms, payloads, credentials, and full plans have no schema fields. Slow classification reports bounded reasons without claiming causality. Explain is privileged, shape-only, scoped, bounded, and returns a sanitized category summary.

Database/cache health exposes categories only. Metrics allow bounded query shape, operation, status, namespace, outcome, health, lag, size, and duration labels. Organization, workspace, entity, user, request, trace, passport, connection, run, and node IDs are discarded from labels.

Protected endpoints live under `/api/v1/data-performance` for performance policies, query shapes/samples/slow diagnostics, index manifest/drift/reconcile, cache health/namespaces/invalidation/warmup, projections, database health, and pool categories. Every mutation uses RBAC, existing policy evaluation, operational state, idempotency, and safe audit events. There is no cache-value, raw-filter, full-plan, URI, topology, credential, or index-drop endpoint.

The developer console adds Database & Cache, Query Performance, Indexes, and Projections under Operations, preserving the compact table-first UI. Cached values are never shown. Reconciliation presents an explicit additive-only warning.

## Verification and known limitations

- `npm run verify:data-access-performance` runs the deterministic non-billed two-tenant/multi-workspace harness.
- `npm run migrate:data-access-performance` performs explicit additive index migration against configured MongoDB.
- `npm test` covers query guards, cursors, cache safety/LRU/TTL/single-flight/negative rules, drift/reconcile, timeouts, document sizes, permissions, metrics, multi-instance invalidation, resumable projections, and isolation.

No Phase 13E2 test calls Gemini or another provider.

Phase 13E3+ may add an approved Redis client package and deployment integration; Phase 13E2 provides the provider-neutral injected-client boundary but does not provision infrastructure. Cross-process local-memory eviction therefore relies on bounded alias TTL unless a shared adapter is configured. Query-plan summaries intentionally avoid unrestricted live explain input, and schema/index rollout remains an explicit operator migration.
