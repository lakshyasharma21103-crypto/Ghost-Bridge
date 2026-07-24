# Ghost Bridge Native threat model

Primary assets are Agent/Issuer identity, Install Grants, Connection authority,
tenant scope, delegated authority, approval decisions, execution integrity,
Receipts, and revocation freshness.

| Threat | Required mitigation |
| --- | --- |
| Passport impersonation or stale identity | issuer verification, expiry, version and revocation checks |
| Install Grant theft/replay | high entropy, short TTL, hashing at rest, scope binding, atomic one-time consumption |
| Cross-tenant confused deputy | mandatory Organization scope and Workspace binding where configured |
| Delegation expansion | exact capability/data/scope/lifetime/use bounds; no ambient authority |
| Payload smuggling | allowlist projection, size/depth/array/string limits, prohibited-key detection |
| Approval replay | exact Invocation/action/scope/limits/expiry binding and single use |
| Duplicate side effects | content-bound idempotency and atomic result reuse |
| Receipt leakage | digests and safe metadata only |
| Revocation delay | bounded caches and critical invalidation |
| Supply-chain or issuer compromise | reviewed libraries, key rotation, compromise procedure, authoritative revocation |

Residual Phase 15A risks include the draft production trust profile, lack of an
external review, and lack of a second independent implementation.
