# Ghost Bridge Trust Profile 0.1-draft

Status: **Experimental security profile**

Identifier: `ghostbridge-trust/0.1-draft`

This profile is production-oriented, but it has not completed an external security audit and is not a production certification. It may change before Protocol 1.0. It uses established JWS, JWK, JWKS, RFC 7638 thumbprint, SHA-256, HTTPS, and Ed25519 primitives through maintained runtimes. It does not invent a signature algorithm, claim formal verification, replace vendor due diligence, or establish that an issuer is commercially safe.

## Four independent trust questions

1. **Cryptographic validity:** the signature and exact signed content are valid.
2. **Issuer authenticity:** a configured root pin or approved bootstrap associates the signing-key chain with the exact HTTPS issuer.
3. **Host trust:** organization and workspace policy permit the issuer, agent, capability, risk, and authentication profile.
4. **Operational validity:** metadata, Passport, Capability Manifest, signing key, Connection, and revocation information are current and usable.

A cryptographically valid object from an unknown issuer is `cryptographically_valid_review_required` or `cryptographically_valid_untrusted_issuer`; it is never automatically “trusted.”

## Mandatory implementation

Cross-company proofs use compact JWS with a protected `alg`, `kid`, `typ`, and Ghost Bridge proof-profile header. `EdDSA` with Ed25519 is mandatory in this draft. Algorithms are selected by host policy, not by untrusted input. `none`, all `HS*` algorithms, embedded `jwk`, `jku`, `x5u`, unprotected key identifiers, and unsupported critical headers are prohibited.

The signed public DTO is canonicalized with `ghostbridge-jcs/0.1-draft`. It rejects duplicate JSON keys, prohibited prototype keys, non-finite numbers, invalid Unicode, cyclic/class instances, and configured size/depth limits.

## Trust-object chain

The exact issuer origin publishes signed issuer metadata and a bounded public JWKS. Root or recovery keys authorize issuer metadata; purpose-scoped operational keys sign Passports, Capability Manifests, Install Grant resolutions, Connection Offers, and revocation sets; Passport-authorized execution keys sign runtime evidence and Execution Receipts. Execution keys do not receive issuer authority.

A signed Passport binds the Capability Manifest digest and authorized execution-key thumbprints. A signed installation binds host audience, tenant scope, manifest digest, and Connection Offer. Request integrity binds method, path, body digest, Connection, Invocation, audience, expiry, and nonce. A signed Receipt binds the installed Passport and authorized execution key.

## Failure behavior

Unknown issuers follow explicit organization policy. Governed high-impact execution defaults to fail closed on invalid proof, wrong audience or tenant, replay, compromised key, revoked subject, rollback, or revocation data beyond policy freshness. Low-risk Core policy may permit a short, visible stale-revocation grace period, but stale status is never displayed as verified.

## Deferred assurance

External audit, certification, formal verification, Protocol 1.0 stability, real third-party interoperability, production KMS/HSM integrations, and direct autonomous agent-to-agent trust remain outside this phase.
