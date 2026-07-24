# Public-key discovery

Status: **Experimental security profile**

Validated issuer metadata declares one bounded JWKS URI. The JWKS contains public keys only. Each record binds `kid`, `kty`, `use`, `alg`, public material, state, validity, activation/retirement sequence, RFC 7638 thumbprint, and one or more purposes.

This draft mandates Ed25519 public JWKs (`kty=OKP`, `crv=Ed25519`, `alg=EdDSA`, `use=sig`). Private members, duplicate `kid`, duplicate active thumbprints, changed material under a retained `kid`, excessive keys, key/algorithm mismatch, invalid purpose, and unsupported algorithms are rejected. No proof-controlled URL is resolved.
