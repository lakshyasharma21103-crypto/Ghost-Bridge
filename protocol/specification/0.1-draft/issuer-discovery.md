# Issuer discovery

Status: **Experimental security profile**

For normalized issuer origin `I`, the metadata URL is exactly:

`I/.well-known/ghostbridge-issuer`

Discovery uses HTTPS in remote mode, bounded response and decompressed size, a bounded timeout, manual redirects, and strict JSON/schema validation. Cross-origin redirects are rejected by default. Literal private, link-local, and loopback IPs are rejected outside explicit local fixture mode. Implementations should pin DNS resolution through connection establishment where their HTTP stack permits it.

Metadata binds `issuerId`, validity timestamps, monotonic `metadataSequence`, supported profiles and algorithms, same-origin JWKS and revocation endpoints, root thumbprints, policies, and a root-key proof. Hosts persist the highest trusted sequence and reject rollback, expiry, issuer mismatch, unsafe endpoints, empty algorithm lists, suspended/compromised status, and invalid required proof.
