# Issuer discovery operations

Bounded discovery validates exact issuer binding, metadata validity, supported profile/algorithm, same-origin JWKS and revocation endpoints, root proof, and monotonic sequence. Only validated documents enter caches.

Operators should alert on issuer mismatch, root-pin change, rollback, suspended/compromised state, stale metadata, cross-origin endpoint changes, or rejected network destinations. HTTP-stack DNS pinning and production egress controls require deployment-specific review.
