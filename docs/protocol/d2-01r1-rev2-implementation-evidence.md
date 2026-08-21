# D2-01R1 Revision 2 implementation evidence

Status: repaired implementation candidate ready for independent review; not
integration, conformance, interoperability, publication, production, release,
or Protocol 1.0 evidence.

## Frozen Unicode 17.0.0 runtime

Normal Origin validation reads only the checked-in generated artifacts:

- `generated/idna2008-ranges.json`, exact SHA-256
  `83840db50200fc686ff850d4c156c47910054f118c50ea27a66d8c0ec2e17fb4`;
- `generated/idna-properties.json`, exact SHA-256
  `5291042234cb645162fc20ef5dc3a4d763302c7441428d3f0293975403679c8d`.

Initialization requires the reviewed file hashes, format identities, Unicode
version `17.0.0`, source-set SHA-256
`d290a34d75c1ddeefb728594e421b9a74b1424d64181b0788e49da5d96665d9b`,
closed property values, exact reviewed counts, ordered non-overlapping sparse
ranges, and complete gap-free IDNA, NFC quick-check, joining, and Bidi tables.
Malformed or drifted data fails during module initialization. Normal protocol
validation does not read the raw UCD sources or any test-only vector.

The runtime keeps the generated representation data, binary lookup machinery,
IDNA algorithm, Origin dispatch, and fixture corpus in separate files. It uses
no network path, URL parser, UTS #46 mapping, JavaScript Unicode property
escape, locale behavior, runtime normalization, ICU/V8/OS table, or
implementation-current Unicode semantic behavior.

## Punycode and dependency disposition

`idn-hostname@15.1.11` and its Unicode 15.1/UTS #46 semantic path are removed
from `package.json` and `package-lock.json`. The exact direct dependency
`punycode@2.3.1` is retained only as RFC 3492 encode/decode machinery. Runtime
initialization rejects another mechanism version. Ghost Bridge fixtures pin
malformed decoding, non-ASCII output, NFC, category/context/Bidi validation,
and exact decode/re-encode A-label equality; Punycode supplies no mapping,
normalization, hostname, or IDNA policy.

The wider workspace still obtains `tr46` through a backend WHATWG URL
dependency. Protocol schema validation imports neither package, and validator
import isolation rejects either as a protocol-validation dependency. Their
presence elsewhere cannot alter the frozen acceptance set.

## Frozen NFC and IDNA semantics

The local NFC implementation performs recursive canonical decomposition,
canonical combining-class ordering, canonical composition with the frozen
full-composition exclusions, and algorithmic Hangul decomposition/composition.
Acceptance compares the normalized scalar sequence with the decoded A-label
sequence and never repairs wire input. The official Unicode 17.0.0
`NormalizationTest.txt` is frozen as comparison/test-only evidence with exact
2,827,429-byte length, SHA-256
`5019ffd530751a741900c849c0e010332f142a3612234639bd200b82138a87db`,
versioned provenance, and Unicode License v3 binding. All 20,034 records are
run; normal validation never reads the file.

ContextJ implements both Virama branches and the ZWNJ joining branch with
transparent joining characters skipped through the frozen joining table.
The Virama branch is evaluated after rejecting first position but before any
after-character requirement, so terminal ZWNJ `xn--11b6iv14e` and terminal ZWJ
`xn--11b6iy14e` following U+094D pass. Terminal join controls without Virama
and incomplete joining-pattern boundaries still reject.

The RFC 5891 leading-combining-mark predicate uses frozen General_Category
Mark ranges derived from UnicodeData field 2 (`Mn`, `Mc`, and `Me`), not
Canonical_Combining_Class. This rejects PVALID U+0900 (`xn--g1b`, `Mn`) and
U+0903 (`xn--j1b`, `Mc`) even though both have CCC 0, while an ordinary
non-Mark PVALID character with CCC 0 remains eligible. CCC remains frozen and
in use for NFC and the ContextJ Virama branch.
ContextO implements the middle-dot, Greek, Hebrew, Katakana-middle-dot, and
two Arabic digit-set rules from frozen Script data. Boundary and adversarial
tests cover both join controls and every ContextO rule.

The validator decodes every wire label first, determines Bidi-domain status
from frozen Bidi_Class data across the complete decoded name, and when
triggered applies the applicable RTL or LTR rule set to every label. Evidence
includes a numeric ASCII label that passes alone but rejects beside an RTL
A-label, plus a valid mixed LTR/RTL multi-label name.

## Other review corrections

IPv6 accepts only parse-and-exact-reencode lowercase hexadecimal/colon text,
uses first-longest-run compression, and rejects dotted tails, brackets, zone
IDs, uppercase, leading-zero and compression aliases, malformed group counts,
multiple `::`, and IPv4-mapped IPv6. A non-mapped IPv4-embedded address remains
eligible in hexadecimal-only form.

Source-token number validation now additionally rejects `Object.is(value,
-0)` after binary64 conversion, covering negative underflow such as `-1e-400`
while retaining the existing positive-underflow and finite/safe-integer rules.

The raw fixture carrier validates its own shape and repeat values and performs
safe checked arithmetic before loops or allocation. Independent ceilings are
32 carrier levels, 100,000 logical work units, and 2 MiB of expanded bytes.
Tests cover empty and nested zero-output amplification, depth, multiplication
overflow, both exact ceilings and their first failures, and low-byte/high-work
input. These are fixture/evidence-tool limits, not H-12 network receive limits.

The `SemanticCommitmentRef` fixture is classified as carrier-positive rather
than owner-complete semantic-positive. The generic predicate validates only
the closed carrier grammar. A separate regression proves that an owning check
must bind the exact profile and domain and that generic syntactic validity is
not global commitment-domain authority.

## Preserved architecture and nonclaims

The repair preserves the source-token counter (including the exact 16,384
accept/16,385 reject boundary), strict UTF-8/BOM and decoded duplicate-member
handling, canonical base64url, TimeEvidence, exact artifact-byte integrity,
ExtensionIdentity, IPv4, immutable schema identities, manifest structure, and
offline schema resolution. Existing integrated schemas were not rewritten;
the new untracked R1 schemas retain their accepted candidate identities.

Second independent Draft 2020-12 validator evidence remains pending. This
candidate does not claim D2-01 completion, integration, conformance,
interoperability, independent implementation, external security review,
production readiness, release readiness, or Protocol 1.0.
