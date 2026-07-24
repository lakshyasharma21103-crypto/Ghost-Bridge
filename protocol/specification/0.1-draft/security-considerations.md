# Security considerations

Implementations enforce bounded bytes, strings, arrays and object depth;
reject prototype-pollution keys and non-plain data; serialize canonically where
signatures require it; validate expiration/audience/scope/version; protect
Install Grant entropy and atomic consumption; bind idempotency to request
content; check revocation; redact logs; and use low-cardinality metrics.

Phase 15A defines signer, verifier, and issuer-key resolver interfaces and
synthetic test-only signatures. It invents no algorithm. Production profiles
must use reviewed libraries and specify canonicalization, replay prevention,
key rotation, issuer compromise response, and revocation. The production trust
profile and security review remain future work.
