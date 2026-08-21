# Ghost Bridge Unicode 17.0.0 source foundation

This directory freezes the Unicode-derived source material required to repair
the reusable D2-01R1 IDNA2008 predicate under accepted D2R-017A Revision 1
Option A. It is engineering evidence for `ghostbridge/e1.r0-draft.1`; it is not
a new protocol decision, a complete R1 repair, a conformance claim, or a
release artifact.

## Authority and non-authority boundary

`source/idna/Idna2008.txt` is the primary Unicode-version-specific source for
the RFC 5892 IDNA Derived Property. The generator accepts only its closed
`PVALID`, `CONTEXTJ`, `CONTEXTO`, `DISALLOWED`, and `UNASSIGNED` category set,
resolves the exact full-range `@missing` rule, rejects overlaps, and proves
complete code-point and Unicode-scalar coverage.

`IdnaMappingTable.txt` is intentionally absent. It is a UTS #46 mapping table,
not the Ghost Bridge acceptance predicate. No browser, WHATWG URL behavior,
Node/ICU/V8/OS property, JavaScript Unicode property escape, npm data table,
UTS #46 mapping, or implementation-current normalization result contributes
any generated category or property value.

The repaired R1 candidate removes `idn-hostname@15.1.11`. Its Unicode 15.1
data, UTS #46 preprocessing, normalization calls, and label-level behavior do
not participate in protocol validation. The exact direct `punycode@2.3.1`
dependency remains only as pinned RFC 3492 encode/decode machinery; the
Ghost Bridge generated data and local semantic algorithm define acceptance.

## Exact source set and justification

The digest-bound [source manifest](./source-manifest.json) records the upstream
URL, exact byte length, SHA-256, role, purpose, version evidence, and license
binding for every acquired file. The intentionally small set is:

- `idna/ReadMe.txt` and `idna/Idna2008.txt`: final 17.0.0 directory evidence
  and the primary IDNA2008 category property.
- `ucd/ReadMe.txt`: binds headerless UCD members to the final Unicode 17.0.0
  release directory.
- `ucd/UnicodeData.txt`: General_Category Mark values from field 2, canonical
  decomposition mappings, and canonical combining classes. `Mn`, `Mc`, and
  `Me` supply the leading-combining-mark predicate independently of combining
  class; combining class 9 supplies the Virama branch of CONTEXTJ.
- `ucd/DerivedNormalizationProps.txt`: `NFC_Quick_Check` and
  `Full_Composition_Exclusion`, combined with `UnicodeData.txt` for a future
  offline NFC implementation. Hangul normalization remains the standard
  algorithmic case and requires no versioned table.
- `ucd/Scripts.txt`: the Script property used by the Greek, Hebrew, Hiragana,
  Katakana, and Han CONTEXTO rules.
- `ucd/extracted/DerivedJoiningType.txt`: joining types and transparent
  skipping used by CONTEXTJ.
- `ucd/extracted/DerivedBidiClass.txt`: the complete Bidi_Class property,
  including its specialized unassigned defaults, needed to preserve
  whole-domain RFC 5893 evaluation.
- `license/Unicode-License-v3.txt`: exact acquired Unicode data-file license
  text. Every upstream header/readme copyright notice is also preserved.

`CompositionExclusions.txt` is redundant because the required full property is
present in `DerivedNormalizationProps.txt`. `DerivedCombiningClass.txt` is
redundant because `UnicodeData.txt` field 3 is already needed for normalization
decompositions. `ScriptExtensions.txt`, UAX #9 test data, normalization test
vectors, charts, fonts, and PDFs are not generator property inputs for this
foundation. These exclusions are recorded in the manifest so omission is
deliberate rather than accidental.

The official Unicode 17.0.0 `ucd/NormalizationTest.txt` is separately frozen
under `test/source/` as comparison/test-only evidence. Its dedicated test
manifest pins the versioned Unicode provenance URL, exact 2,827,429-byte
length, SHA-256
`5019ffd530751a741900c849c0e010332f142a3612234639bd200b82138a87db`,
20,034 records, and Unicode License v3 binding. It is not part of the nine-file
property-authority source set, does not change that source-set digest, and is
never read by normal protocol validation. The complete corpus is exercised
only by the Unicode test command against the frozen NFC implementation.

## Deterministic generated data

The offline generator emits UTF-8 JSON with two-space indentation, LF line
endings, fixed member order, decimal inclusive range endpoints, and one final
LF. JSON numbers never exceed `0x10FFFF`, so the representation is exact in Go,
Python, Rust, Java, JavaScript, and other ordinary JSON implementations.

- `generated/idna2008-ranges.json` contains a complete, gap-free partition of
  `U+0000..U+10FFFF` by the five IDNA2008 categories, source bindings, and both
  code-point and scalar-value counts.
- `generated/idna-properties.json` contains frozen General_Category Mark
  ranges, canonical combining classes and decompositions, full composition
  exclusions, complete NFC quick-check data, complete joining types, the
  Script subsets used by CONTEXTO, and complete Bidi classes. Its Bidi scope is
  explicitly the complete domain label sequence; the data structure does not
  authorize per-label-only validation.

The generated data is implementation-neutral evidence, not a JavaScript
serialization contract for the protocol wire. The manifest binds each output's
exact length and SHA-256. `--check` regenerates in memory and requires byte-for-
byte equality, so source corruption, output drift, a missing file, or an
unmanifested file fails closed.

## Offline reproduction

After the one-time acquisition, both commands use only checked-in files and
Node built-ins. They contain no network acquisition path:

```text
node protocol/unicode/17.0.0/generate.mjs --check
node --test protocol/unicode/17.0.0/test/unicode-data.test.mjs
```

`--write` is the explicit maintainer regeneration mode. It prints the exact
output digests and deliberately reports that the manifest must be updated;
normal validation uses `--check` and never writes or downloads data.

The tests cover exact source hashes and lengths, version evidence, source-set
inventory, malformed ranges, overlap rejection, unknown IDNA and
General_Category values, exact `Mn`/`Mc`/`Me` Mark derivation from UnicodeData
field 2, missing/default coverage, source corruption, deterministic repeated
generation, complete generated ranges, exact generated bytes, and the offline
implementation boundary.

## Remaining implementation boundary

This foundation makes the frozen data reproducible but does not replace the
current R1 DNS predicate. R1-FIX-01 still must integrate an authoritative
runtime predicate that consumes these tables and implements canonical Punycode
round trips, NFC, ContextJ, ContextO, and whole-domain Bidi without raw U-label
wire input or implicit mapping. R1-FIX-02 through R1-FIX-07 remain outside this
subtask.
