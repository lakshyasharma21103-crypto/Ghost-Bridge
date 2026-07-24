# Proof profile

Status: **Experimental security profile**

`ghostbridge-proof/0.1-draft` uses compact JWS over a validated public DTO serialized by `ghostbridge-jcs/0.1-draft`. Protected headers are:

- `alg`: host-allowlisted `EdDSA`
- `kid`: bounded issuer-local identifier
- `typ`: `ghostbridge-proof+jws`
- `gbp`: `ghostbridge-proof/0.1-draft`

Key lookup starts only from validated issuer metadata and its JWKS. Proof header URLs and embedded keys are rejected. `kid` is an identifier, not evidence. Verification checks exact payload bytes, purpose, issuer, audience when required, time window, key state, key validity, revocation, and policy.

`ghostbridge-jcs/0.1-draft` sorts object properties lexicographically, uses JSON primitive serialization and UTF-8, preserves valid Unicode code points, and enforces finite numbers and resource bounds. Signed data must be a validated DTO, not a database model or class instance.
