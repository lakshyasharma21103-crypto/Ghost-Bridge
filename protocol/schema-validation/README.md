# D2-01A foundation validation

Run the implementation-neutral foundation validator from the repository root:

```text
node protocol/schema-validation/validate-foundation.mjs
```

The harness uses the existing Ajv Draft 2020-12 engine, preloads every schema
from the immutable UUID mapping in the foundation manifest, prohibits network
schema retrieval, validates the machinery assets and five fixture categories,
and runs only the bounded semantic checks transcribed from accepted authority.

This tooling is not a conformance runner, a normative oracle, an independent
implementation, or D2-01 completion evidence. If it disagrees with accepted
H/REQ/D2-RP authority, the tooling is defective.
