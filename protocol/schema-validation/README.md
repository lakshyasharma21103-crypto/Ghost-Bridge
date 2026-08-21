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

## D2-01R1 Revision 2 shared vocabulary

Run the focused R1 validator from the repository root:

```text
node protocol/schema-validation/validate-r1.mjs
```

R1 adds immutable schemas for `CanonicalBase64url32Octets`,
`SemanticCommitmentRef`, and the structured `Origin`. It reuses the existing
`TimeEvidence`, `ArtifactByteIntegrityRef`, and `ExtensionIdentity` schemas and
converges their executable predicates into the single semantic-check registry.
The fixture-schema declarations and executable registry are checked as an
exact union, and duplicate registrations fail closed.

The protocol raw-input scanner is separate from structural schema validation.
It accepts an already materialized `Uint8Array` plus a mandatory caller byte
ceiling, then applies strict UTF-8, BOM rejection, decoded duplicate-member
detection, Unicode scalar/noncharacter and 64-KiB decoded-string rules,
source-number and negative-zero rules, nesting 16, 256 array entries, 256
unique object names, and the accepted D2R-029A 16,384-token ceiling before
ordinary object parsing. Recognition of token 16,385 rejects immediately.
The generic scanner does not claim to prevent network or runtime allocation of
the supplied byte buffer; transport streaming/read enforcement remains later
H-12 work.

Raw fixtures carry exact bytes as lowercase hexadecimal segments with explicit
repeat structure. The runner validates shape and repeat counts, performs
safe-integer arithmetic before loops or allocation, and independently enforces
a 32-level carrier-depth ceiling, 100,000 logical-work-unit ceiling, and
2-MiB expanded-byte ceiling. Empty and nested zero-output repeats consume work
budget. The runner then materializes the byte stream once; it never parses or
reserializes the carried JSON source.
The corpus proves the exact 16,383, 16,384, and 16,385 token boundary and keeps
malformed UTF-8, BOM, duplicate names, escape-equivalent names, and number
spellings byte-exact.

Origin validation prechecks the wire value as lowercase ASCII and dispatches
the tagged host before canonical validation. DNS validation consumes only the
exact-hash-verified generated Unicode 17.0.0 Ghost Bridge artifacts. A-labels
use the direct `punycode@2.3.1` dependency only for RFC 3492 decode/encode,
then require scalar validity, custom frozen-data NFC equality, the frozen
IDNA2008 category, ContextJ, ContextO, exact A-label round trip, and complete-
domain Bidi validation. No UTS #46 mapping, runtime normalization, Unicode
property escape, URL parser, ICU, V8, OS table, or dependency IDNA policy can
alter acceptance. IPv4 and hexadecimal-only IPv6 use parse and canonical
re-encode equality, with IPv4-mapped IPv6 rejected. `http` is only a
structurally representable scheme here and creates no Governed-origin or
transport authority. R1 implements no loopback context, DNS resolution,
redirect, proxy, rebinding, or connected-target policy.

## D2-01B release-data assets

Run the atomic release-data validator from the repository root:

```text
node protocol/schema-validation/validate-release-data.mjs
```

The maintained semantic source is
`protocol/schema-validation/release-data/e1.r0-draft.1.source.json`. It embeds
the complete seven-artifact semantic content. The generator copies that
content without semantic transformation and serializes JSON as strict UTF-8,
two-space indentation, LF newlines, no BOM, and one terminal LF. It then hashes
the exact generated bytes and creates the single release-data manifest at
`protocol/registries/e1.r0-draft.1/release-registry.json`.

The separate
`protocol/schema-validation/release-data/e1.r0-draft.1.conformance-lock.json`
is nonsemantic build/conformance evidence. It pins the canonical maintained
source projection and every exact generated artifact identity, SHA-256, and
byte length. It is not protocol or wire authority, and ordinary `--write`
never creates or updates it. A semantic-source change therefore fails until a
reviewed lock update is supplied independently.

Regenerate or verify byte-for-byte reproduction with:

```text
node protocol/schema-validation/generate-release-data.mjs --write
node protocol/schema-validation/generate-release-data.mjs --check
```

Before `--write` changes any established file, it strict-reads and structurally
validates the maintained source, executes the complete registered semantic
checker inventory, verifies the independent conformance lock, and validates the
complete generated candidate in memory. The write path repeats that preflight,
requires its private candidate fingerprint to match the previously reviewed
candidate, and writes only from the private fresh snapshot. Mutating a returned
preflight object therefore cannot alter the bytes selected for writing.

The writer then requires the current manifest's exact seven-entry set, every
current file and typed identity, and exact current manifest hashes and lengths.
Missing or malformed current state has no bootstrap fallback. It captures the
exact validated bytes, stages all seven artifacts followed by the manifest, and
rechecks each target against the captured bytes immediately before replacement.
Concurrent changes fail closed and are not overwritten during bounded recovery.
After all eight replacements, the writer reloads the on-disk set and repeats
class-set, integrity, structure, semantic-checker, conformance-lock, and exact
reproduction verification before reporting success. Deterministic self-tests
cover replacement races, post-write verification failure, and safe restoration.
Portable filesystems cannot provide one atomic rename across eight paths, so any
unrestorable concurrent state is reported as a hard generator error requiring
repository recovery before reuse.

The manifest requires exactly one artifact for each accepted class. Typed UUID
identity, class, exact release, artifact schema, immutable POSIX-relative path,
SHA-256, and exact byte length are cross-checked before any subordinate artifact
bytes are decoded or parsed. Only after all seven pass integrity, strict JSON,
structural schema, and semantic checks does the set load atomically.

Release-data semantic constraints are registered as named executable checker
functions. Every registered D2-01B checker enforces its invariant and the exact
conformance-lock projection for the artifact classes it owns. Full semantic and
bundle validation require lock evidence. The foundation validator instead uses
an explicitly named D2-01A regression-only invariant path and does not report
D2-01B checker execution. D2-01B validation records the checkers that actually
returned successfully and requires the registered and executed ID sets to equal
the inventory ID set exactly; missing, disabled, duplicate, unmapped, and
undeclared checkers reject.

The release-data corpus is dispatch-routed from
`protocol/fixtures/wire/e1.r0-draft.1/release-data/corpus.json`. Every case has
a stable ID and exact expected disposition/diagnostic. The runner enumerates
cases by deterministic code-unit order and rejects unknown scenarios, duplicate
IDs, stale generated bytes, orphan semantic constraints, symlinks, path
traversal, unreferenced artifacts, and implicit network schema loading.

Generator metadata, local paths outside the declared repository-relative asset
paths, runtime behavior, SDK behavior, and tests are nonsemantic. The generator
and validators import no Ghost Bridge runtime or SDK.
