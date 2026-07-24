# Revocation

Each issuer publishes its authoritative signed snapshot with sequence, next update, previous-set digest, and bounded entries. Hosts store the highest sequence, verify chaining, cache only valid data, and invalidate affected trust results on change.

Low-risk Core policy may allow a brief visible grace period. High-risk Governed execution defaults to fail closed when revocation is stale or unavailable. Stale is never presented as verified.
