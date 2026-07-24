# Key management

Root/recovery, operational, and Agent execution keys have separate purposes. The mandatory draft algorithm is Ed25519 JWS `EdDSA`; this is an interoperability choice, not a claim of universal superiority. `none`, `HS*`, algorithm confusion, embedded keys, and proof-controlled key URLs are rejected.

Production implementations plug in a non-exporting KeyProvider backed by an appropriate signing service, KMS, or HSM. Phase 15C fully implements only a locally generated, test-only provider that refuses production mode.
