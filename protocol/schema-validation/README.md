# D2-01A foundation validation

Run the implementation-neutral foundation validator from the repository root:

```text
node protocol/schema-validation/validate-foundation.mjs
```

The harness uses the existing Ajv Draft 2020-12 engine, preloads every schema
from the immutable UUID mapping in the foundation manifest, prohibits network
schema retrieval, validates the machinery assets and five fixture categories,
and runs only the bounded semantic checks transcribed from accepted authority.

`validate-foundation.mjs` is a thin deterministic entry point. Focused modules
under `lib/` own strict JSON-source parsing, canonical repository paths, bundle
loading, schema safety, provenance, release-registry validation, fixture
execution, semantic checks, and fail-closed tooling self-tests. Assets declare
schema identities, dependency edges, registry allocations, and fixture
expectations; the validator verifies those declarations without maintaining a
second protocol registry.

Artifact byte-integrity fixtures keep their exact input bytes in the closed
non-wire `semanticInput.artifactBytesHex` field. The wire value remains the
approved `ArtifactByteIntegrityRef` object. Tooling computes SHA-256 with
`node:crypto`, compares canonical unpadded base64url exactly, and checks the
exact byte length.

Every run also exercises duplicate-member parsing, strict UTF-8, path-policy,
registry exact-set/order-independence, exact-byte integrity, and deliberately
seeded validator corruptions. These are validator self-tests, not D2-05
conformance cases or D2-03 cryptographic golden vectors.

This tooling is not a conformance runner, a normative oracle, an independent
implementation, or D2-01 completion evidence. If it disagrees with accepted
H/REQ/D2-RP authority, the tooling is defective.
