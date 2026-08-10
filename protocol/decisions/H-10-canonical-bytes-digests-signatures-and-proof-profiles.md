# H-10 — Canonical bytes, digests, signatures, and proof profiles

## Decision ID

H-10

## Status

**ACCEPTED**

Date prepared: 2026-08-09
Approval date: 2026-08-10
Approver: Rudra
Approved option: Option B — Versioned JSON-first cryptographic profile registry

Option B now has H-10 protocol-governance decision authority. This record is
governance evidence, not the normative specification, and its cryptographic
examples are not normative vectors. Cryptographic validity remains distinct
from authorization. H-10 acceptance creates no implementation, migration,
deployment, conformance, release, or Protocol 1.0 authority.

## Decision scope

H-10 establishes the accepted, cross-language cryptographic representation for
Ghost Bridge semantic commitments and proofs at the protocol-governance
decision level. It covers:

- eligible cryptographic inputs and their canonical JSON/UTF-8 bytes;
- duplicate names, Unicode, numbers, `null`, absence, defaults, and extensions;
- unambiguous domain-separated framing;
- digest, signature, key, proof-purpose, and textual-encoding profiles;
- the approved mapping from every repository cryptographic surface to a
  versioned profile or a legacy-only classification;
- algorithm agility, historical interpretation, verification ordering,
  migration, and privacy-safe semantic failures; and
- the independent reproduction evidence reviewed before human approval.

H-10 does not select object schemas, wire fields, HTTP placement, revocation
lifecycle mechanics, concrete support dates, or release policy. It does not
authorize normative text, code, schemas, fixtures, vectors, state machines,
migration, deployment, conformance, publication, or Protocol 1.0 work.

## Affected gaps and Phase work

| Kind | Identifiers | H-10 relationship |
| --- | --- | --- |
| Canonical gaps | `GB-018`, `GB-025`, `GB-026`, `GB-027`, `GB-030`, `GB-031`, `GB-052` | Exact-action, Receipt, key/revocation, and independently reproduced cryptographic behavior remains open |
| Requirements work | `D1-04`, `D1-06` | Would consume an approved H-10 choice; not authorized here |
| Schema/vector work | `D2-01`, `D2-03` | Would create schemas and normative vectors only after separate authorization |
| Independent work | `P1-01`, `P1-03` | Would supply independent implementation and security-review evidence under later gates |

Every listed gap remains open. The Phase plan's `PENDING` entries remain
unchanged.

## Accepted-decision dependency and conflict ledger

H-01 through H-09 are accepted governance inputs. H-10 is subordinate to their
semantic and authority boundaries; it may represent their exact values but may
not reinterpret them.

Each complete H-01 through H-09 decision record, including its qualifications,
conflict ledger, deferred ownership, human disposition, and consequences, was
inspected for this decision record.

| Accepted record | Boundary H-10 must preserve | Conflict H-10 is forbidden to introduce |
| --- | --- | --- |
| H-01 | Discovery and preview are non-authoritative; durable Connection establishment is the authority boundary; historical objects retain their governing context; consent and final selection need separately bound commitments | Treating a signed preview as authority, changing the establishment boundary, or rehashing history under a current profile |
| H-02 | Authentication, Connection authority, Trust, authorization, deployment policy, Approval, execution, and evidence are distinct; the Agent is the final authorization enforcement point | Treating a valid digest/signature as authorization or merging authorization and Approval proof domains |
| H-03 | Release identities and historical interpretation are immutable; ordering is not compatibility; old evidence uses its original release/profile | Inferring compatibility from ordering, applying current defaults to old evidence, or silently relabeling legacy bytes |
| H-04 | Capability/profile selection is explicit and monotonic; required unknowns fail; no silent fallback/downgrade | Creating a cryptographic side negotiation, choosing first-common, or substituting a nearby profile |
| H-05 | Authentication purpose and audience are explicit; every governed remote request uses selected PoP semantics; reusable secrets stay out of durable Ghost Bridge artifacts | Defining authentication lifecycle, accepting a credential reference as proof, persisting reusable secrets, or allowing cross-purpose audience reuse |
| H-06 | Grant redemption uses exact field-and-presence intent equality; exact retry converges on one committed result | Changing redemption, retry, race, expiry, disclosure, or commit semantics because a digest exists |
| H-07 | Connection authority and Invocation acceptance use the full current serialized authority intersection; active is necessary but insufficient | Letting a commitment replace current authentication, Trust, authorization, policy, lifecycle, expiry, revocation, or atomic acceptance checks |
| H-08 | Approval is single-use, exact-action, purpose-bound, and consumed at the H-07 acceptance boundary | Widening the action, changing presence equality, reusing an Approval proof as request proof, or moving/restoring consumption |
| H-09 | Task is lifecycle truth, Result is terminal semantic/effect truth, and Receipt is downstream evidence; Receipt materialization may follow terminal commit | Reopening a terminal Task, rewriting a Result, making Receipt validity authority, or rerunning Task/effects after a cryptographic failure |

Further forbidden conflicts are: inventing values that an accepted decision
left absent; turning semantic sets into ordered lists or vice versa; collapsing
tagged workspace absence into `null` or empty text; treating a current
implementation as the conformance oracle; and using H-10 to decide H-11,
H-12, H-13, or H-14 policy.

## Repository evidence inspected

The audit included governance and planning records, historical prose, JSON
schemas, declarations, Protocol Core, Trust, Issuer, Native Agent, Native
Client, Platform integration, product-only hash utilities, tests, fixture
generators, and conformance planning. The evidence describes current and
historical behavior; none of it is promoted to protocol law.

### Governance, planning, prose, schema, and asset evidence

| Path or family | Surface found | Evidence status and H-owner |
| --- | --- | --- |
| `docs/protocol/phase-15d-plan.md` | H-10 definition; `D1-04`, `D1-06`, `D2-01`, `D2-03`, `P1-01`, `P1-03`; gap closure register | Governance source; demands byte-level decisions and independent reproduction but authorizes no artifact |
| `docs/protocol/normative-specification-gap-analysis.md` | `GB-018`, `GB-025`–`GB-027`, `GB-030`–`GB-031`, `GB-052` | Governance evidence; explicitly records Core/Trust digest contradiction and missing static cross-language vectors |
| `protocol/decisions/H-01-*.md` through `H-09-*.md` | Accepted semantic equality, authority, history, exact action, Task/Result/Receipt boundaries | Binding accepted governance; H-10 represents but does not alter it |
| `protocol/specification/0.1-draft/proof-profile.md` | Experimental sorted-member JSON, UTF-8, finite/resource bounds, generic proof description | Historical `0.1-draft`; incomplete on exact number, null/default, domain, and purpose rules |
| `protocol/specification/0.1-draft/trust-profile.md` | Names `ghostbridge-jcs/0.1-draft`; rejects duplicates, invalid Unicode, non-finite values | Historical experimental prose; useful evidence, not a complete language-neutral algorithm |
| `protocol/specification/0.1-draft/request-integrity.md` | JSON request descriptor described as following HTTP Message Signature concepts | Historical prose; implementation is generic JWS over a descriptor, not an RFC 9421 signature base; H-10 owns object proof bytes, H-12 transport |
| `protocol/specification/0.1-draft/receipt-proof.md` | Receipt proof and binding claims | Historical prose; lacks complete byte/profile/vector definition |
| `protocol/schemas/0.1-draft/proof.schema.json` | Fixed JWS, `ghostbridge-proof/0.1-draft`, `EdDSA`; no proof purpose/content domain | Historical schema; does not cryptographically bind purpose |
| `protocol/schemas/0.1-draft/common.schema.json` | Open generic proof definition alongside stricter proof schemas | Historical contradiction; H-13 owns openness and H-10 owns covered bytes after participation is known |
| `protocol/schemas/0.1-draft/signed-envelope.schema.json` | `payload`, `payloadDigest`, and `proof` coexist | Self-field/projection and digest-consistency rules undefined |
| `protocol/schemas/0.1-draft/execution-receipt.schema.json` and declarations | `outputDigest`, `evidenceDigest`, optional proof/linkage fields differ across schema/types/runtime | `GB-025`/`GB-026` evidence; H-09 owns semantics, H-10 crypto, H-13 schema openness |
| `protocol/schemas/0.1-draft/*` | `approvalActionDigest`, `payloadDigest`, `contentDigest`, `contractDigest`, `capabilityManifestDigest`, `connectionOfferDigest`, `previousSetDigest`, `subjectDigest`, Approval/Delegation/revocation/Receipt proof fields, key fields | Mostly bounded/open strings without exact algorithm/profile/encoding; historical only |
| `protocol/schemas/0.1-draft/issuer-metadata.schema.json` | `supportedProofProfiles`, `supportedAlgorithms`, and `supportedTrustProfiles` | Advertised support is not selected support; current arrays do not supply the H-04/H-10 no-fallback selection/binding contract |
| `protocol/schemas/0.1-draft/invocation.schema.json` and runtime declarations | `requestedReceiptProfile` / implementation `receiptProfile` | Receipt policy/profile is an H-09 semantic choice, not an H-10 crypto-profile identifier; similar names must not be inferred or substituted |
| `protocol/fixtures/`, `protocol/test-vectors/`, `protocol/conformance/` | No normative static H-10 corpus was present | `D2-03`/later work remains absent and unauthorized |

### Protocol Core surfaces

| Path / helper or field | Current input, serialization, algorithm, encoding, domain, and verification | Classification / contradiction / owner |
| --- | --- | --- |
| `packages/ghostbridge-protocol-core/src/index.js` — `boundedSerialize` | Plain-data check, then insertion-order `JSON.stringify`; UTF-8 only for byte limit | Current implementation; not canonical across construction orders; differs from approved H-10 semantics, while replacement implementation remains separately authorized |
| Same — exported `digest` | SHA-256 of `boundedSerialize(value)`; Node unpadded `base64url`; no algorithm prefix or semantic domain | Current implementation; contradicts Trust's same-named helper |
| Same — `createApprovalAction`, `canonicalizeApprovalValue`, `canonicalApprovalDigest` | Recursively sorts object keys, preserves arrays, then uses Core digest; 43-character unprefixed base64url | Current exact-action helper; useful field inventory but no number/Unicode/domain/profile contract; H-08 semantics, H-10 bytes |
| Same — `removeUndefined` | Removes undefined object members and removes undefined array elements before Approval action creation | Current implementation; silently changes array positions and conflates unsupported input with absence |
| Same — Approval action fields | `invocationId`, `connectionId`, capability key/version, org/workspace, input contract, `payloadDigest`, effect category, limits, policy decision, validity | Existing semantic evidence; H-08 owns completeness, H-10 exact representation |
| Same — Approval/Receipt validators | Approval digest fixed to 43 base64url characters; Receipt digests merely bounded strings | Shape verification does not identify algorithm, canonicalization, or domain |
| Same — test signer | `HMAC-SHA256-TEST-ONLY` over Core serialization, base64url | Test-only; forbidden as production or H-10 baseline evidence |

### Trust and Issuer surfaces

| Path / helper or field | Current input, serialization, algorithm, encoding, domain, and verification | Classification / contradiction / owner |
| --- | --- | --- |
| `packages/ghostbridge-trust/src/index.js` — profile constants | `ghostbridge-jcs/0.1-draft`, `ghostbridge-proof/0.1-draft`, `ghostbridge-http-signature/0.1-draft`, type `ghostbridge-proof+jws`, algorithm `EdDSA` | Historical experimental identifiers; one generic proof profile does not separate object purposes |
| Same — `canonicalize` | Recursive object-key `.sort()`, array order retained, `JSON.stringify` primitives; rejects non-finite numbers, cycles/classes, lone surrogates, and bounded-resource violations | Current Trust implementation; more deterministic than Core but incomplete as a language-neutral profile |
| Same — `parseJsonStrict` | Fatal UTF-8 decode for bytes; duplicate-name detection after escape decoding; prototype-key rejection; then `JSON.parse` | Current parser evidence; BOM/noncharacter/number-token policy is not an explicit protocol contract |
| Same — exported `digest` | SHA-256 of Trust canonical bytes; text is `sha256-` plus unpadded base64url; no semantic domain | Current implementation; differs from Core in both input and textual result |
| Same — `calculateJwkThumbprint` | SHA-256 over canonical public JWK members; unprefixed base64url | Current RFC 7638-like key identity; distinct special-purpose profile is needed |
| Same — `createProof` | Canonical protected header and canonical payload are independently base64url-encoded; signs ASCII `header.payload` with Ed25519; compact JWS; 64-byte signature | Current JWS proof; protected `alg`, `kid`, `typ`, `gbp`; wrapper repeats key/algorithm/time |
| Same — `verifyProof` | Requires three segments and exact header/wrapper values, rejects remote-key headers, compares payload with canonical reserialization, verifies Ed25519 using caller-supplied purpose | Current verification; key purpose is out-of-band and proof purpose/domain is not protected as an independent semantic value |
| Same — `withoutProof` | Removes only the top-level `proof` member before signing/verifying | Current self-field rule; no registry states which nested or other crypto fields participate |
| Same — request descriptor/proof | Uppercase method, path, Trust `contentDigest`, audience, Connection/release/invocation/message IDs, times, nonce, optional truthy org/workspace; generic proof and `request_signing` key purpose | Current signed-request candidate; truthiness collapses empty/absent and exact target grammar remains H-12/H-10 split |
| Same — key-purpose table | Issuer metadata, Passport, capability, install resolution, offer, revocation, Agent authorization, Receipt, request, recovery purposes | Useful purpose inventory; keys may currently list multiple purposes, so purpose isolation is not guaranteed by material |
| Same — revocation and Receipt verification | `previousSetDigest`, computed `documentDigest`, `documentOrDigest`, `previousDigest`, anti-rollback store digest, Receipt output/evidence binding, key-purpose/Passport checks | Current implementation; H-10 owns bytes, H-11 owns freshness/history/rollback and key lifecycle |
| `packages/ghostbridge-issuer/src/index.js` — signer/provider and `signDocument` | Local/test Ed25519 signs raw JWS input; generic proof is used for issuer metadata, Passport, manifests, install resolution, offers, revocation sets, and Receipts | Current implementation/test provider; caller purpose is checked but the same generic proof domain is reused |
| Same — capability/revocation helpers | `contractDigest`, manifest digests, `previousSetDigest`; some list ordering uses `localeCompare` before hashing | Current evidence; locale-dependent list preparation must not become canonical semantics |

### Native Agent and Native Client surfaces

| Path / helper or field | Current input, serialization, algorithm, encoding, domain, and verification | Classification / contradiction / owner |
| --- | --- | --- |
| `packages/ghostbridge-native-agent/src/index.js` — Install Grant `keyHash` | Core digest over an object containing the presented key | Current secret-derived lookup value; no protocol profile/domain and not suitable for public evidence |
| Same — `connectionOfferDigest` | Core digest of the signed offer, including its proof | Current implementation; differs from Trust's usual proof-excluded document treatment |
| Same — Invocation idempotency `invocationDigest` and `requestFingerprint` | Core digest over locally selected fields, insertion-order serialization | Current implementation; H-06/H-07/H-09 own semantics; approved H-10 governs future commitment bytes, while implementation remains separately authorized |
| Same — Approval binding | Core Approval helper and equality checks | Current implementation; H-08 exact fields are authoritative only as accepted semantics, not helper bytes |
| Same — Receipt construction | Trust `outputDigest` and `evidenceDigest`, but a Core-format `requestFingerprint`; then generic Issuer/Receipt proof | One Receipt mixes `sha256-` Trust values with unprefixed Core values; signature purpose remains generic/out-of-band |
| Same — data-contract references | Core digest embedded in reference paths | Current implementation-specific locator; cannot be silently converted to H-10 identity |
| `packages/ghostbridge-native-client/src/index.js` — `passportDigest` | SHA-256 over Core `boundedSerialize(passport)` including proof; unprefixed base64url | Current implementation; insertion-order and proof-inclusion conflict with Trust document digest behavior |
| Same — install-cache `grantDigest` and hashes | Inner/outer SHA-256 hex over locally serialized data; `null` is used for several missing scope/default values | Client-local cache policy, not protocol identity; null/absence conflict is material if reused |
| Same — `trustDocumentDigest` and proof verification | Trust digest of proof-excluded document; Trust verifier | Current behavior; conflicts with `passportDigest` for the same broad document family |

### Platform and product-only surfaces

| Path / helper or field | Current behavior | Classification / H-10 treatment |
| --- | --- | --- |
| `backend/src/services/platformNativeClient.service.js` | Uses Trust digest for action/input/decision/metadata values; seals a `gbp1` token with HMAC-SHA-256 over base64url Core serialization | Platform/deployment policy; not portable protocol law and not an H-10 proof substitute |
| `backend/src/utils/idempotency.js` | Custom sorted serializer supports the non-JSON token `undefined`, collapses `-0` to `0`; HMAC-SHA-256 hex with a secret and purpose string | Product idempotency/privacy helper; has useful explicit domain separation but incompatible input and encoding |
| `backend/src/utils/complianceCanonical.js` | Sorts keys, converts `Date`, filters undefined including array values; SHA-256 text `sha256:` plus lowercase hex | Product compliance evidence; incompatible with both Core and Trust profiles |
| `backend/src/services/releaseReadinessCore.service.js` | Recursive sorting uses locale comparison; SHA-256 helper over JSON | Product release evidence; locale ordering cannot define protocol bytes |
| `backend/src/services/pilotAnalyticsCore.service.js` | Sorted JSON; configurable hash name; text `<algorithm>:<hex>`; separate HMAC pseudonyms | Product analytics policy; algorithm knob and encoding are not a protocol profile |
| `backend/src/services/performanceCapacityCore.service.js` and `productionScaleOperations.service.js` | Sorted JSON SHA-256 hex and nested `sha256:` labels; mutation fingerprints | Product operations policy; double-prefix and input-projection behavior are non-portable |
| `backend/src/services/orchestration*.service.js` | `canonicalize` plus purpose-specific secret HMAC fingerprints; some pipe-delimited hashes | Deployment idempotency/observability; protected local lookup, not signed-object identity |
| `backend/src/constants/orchestrationRecovery.js`, `backend/src/services/gaCommercialCore.service.js`, regional/release/security helpers | Pipe/colon concatenation or insertion-order JSON, SHA-256/HMAC, mostly hex and truncated identifiers | Product-only identifiers; ambiguous concatenation/truncation is unacceptable for an H-10 semantic proof |

### Tests and reproducibility evidence

| Path or class | What it proves | What it does not prove |
| --- | --- | --- |
| `packages/ghostbridge-trust/test/*.test.js` | JavaScript key-order examples, duplicate-name rejection, non-finite/lone-surrogate rejection, generated Ed25519 proof and mutation checks | Independent canonical bytes, fixed cross-language signatures, domain separation, number boundaries, null/default behavior |
| `packages/ghostbridge-protocol-core/test/*.test.js` | Current Approval field mutation and nested-key ordering behavior | A language-neutral profile or static independent oracle |
| `scripts/verifyGhostBridgeBlackBoxConformance.mjs` and generated fixtures | Current black-box and mutation mechanics | Frozen H-10 normative vectors independent of official helpers |
| Repository-wide result | No static independently reproduced H-10 vector corpus was found | At the initial repository audit, the H-10 evidence gate had not yet been performed; the later RUN 2 governance evidence recorded below passed, while no normative D2-03 vector corpus has been created |

## External primary-standard comparison evidence

External standards inform the alternatives; none chooses Ghost Bridge semantics.

| Primary source | Relevant comparison evidence | Errata/relevance note |
| --- | --- | --- |
| [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259.html) | Interoperable JSON uses UTF-8; duplicate names are hazardous; binary64 and the interoperable integer range matter; a generator emits no BOM | The verified errata catalog was reviewed, including corrections concerning number grammar and Unicode code-point wording |
| [RFC 7493](https://www.rfc-editor.org/rfc/rfc7493.html) | I-JSON narrows JSON for interoperable strings, duplicate names, and numbers | Supports the deliberately strict approved H-10 subset rather than arbitrary implementation JSON |
| [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html) | JCS fixes recursive property ordering, primitive/string/number serialization, no whitespace, UTF-8 output, and no Unicode normalization | Verified erratum 7920 is relevant: rejecting parsed negative zero avoids silent collapse to `0` |
| [RFC 3629](https://www.rfc-editor.org/rfc/rfc3629.html) | Defines the UTF-8 encoding and malformed/overlong constraints used by the strict approved decoder/encoder | H-10 still chooses the no-BOM and eligible-character policy |
| [RFC 4648](https://www.rfc-editor.org/rfc/rfc4648.html) | Defines base64url alphabet and conditions for omitting padding | Approved Option B fixes one strict unpadded representation and rejects aliases; reviewed errata do not select Ghost Bridge semantics |
| [RFC 7638](https://www.rfc-editor.org/rfc/rfc7638.html) | Defines JWK thumbprints over required public members | Used only for the separately named Ed25519 public-key identity profile; it is not a general content digest |
| [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032.html) | Defines Ed25519 and fixed test vectors; Ed25519 signatures are 64 octets | Verified errata include invalid-length and scalar-range checks; maintained libraries and strict length/canonical checks remain necessary |
| [RFC 8949](https://www.rfc-editor.org/rfc/rfc8949.html) | Defines deterministic CBOR encodings and a binary-native data model | Strong Option C substrate, but adopting it would create a second semantic representation beside the JSON-first repository |
| [RFC 7515](https://www.rfc-editor.org/rfc/rfc7515.html) | JWS fixes the protected-header/payload signing-input construction | Useful envelope comparison, but it does not define Ghost Bridge object semantics or content canonicalization by itself |
| [RFC 9421](https://www.rfc-editor.org/rfc/rfc9421.html) | Defines covered HTTP components and a signature base for transport messages | Relevant to H-12 transport; verified erratum 8103 corrects a signature-parameter construction detail |
| [NIST FIPS 180-4](https://csrc.nist.gov/pubs/fips/180-4/upd1/final) | Primary specification for SHA-256 | Baseline comparison only; NIST has announced a future revision, so H-14 must track supported environments |
| [NIST FIPS 186-5](https://csrc.nist.gov/pubs/fips/186-5/final) | Current Digital Signature Standard includes EdDSA | Compliance availability varies by deployment/library; support qualification remains H-14 |

## Contradiction and undefined-behavior register

1. Protocol Core and Trust export a helper named `digest` but serialize
   differently and emit different textual formats.
2. Core's generic digest depends on JavaScript insertion order; Trust and several
   product helpers sort keys, sometimes with different comparators.
3. Trust's `.sort()` and product `localeCompare` are not one specified property
   ordering rule across locales and languages.
4. Strict Trust parsing rejects duplicate decoded names, while ordinary
   `JSON.parse` and schema paths may accept last-name-wins input.
5. No repository-wide rule states whether escaped-equivalent member names are
   duplicates before cryptographic processing.
6. No profile states whether Unicode normalization occurs; normalizing and
   non-normalizing implementations can disagree.
7. Trust rejects lone surrogates in in-memory strings, while other JSON helpers
   may stringify replacement/escape behavior differently.
8. Trust byte parsing is fatal on malformed UTF-8, but other call paths begin
   with already-decoded strings and do not prove equivalent rejection.
9. BOM behavior is not governed consistently at the cryptographic boundary.
10. `null`, absent, `undefined`, empty string, empty array, and empty object are
    treated differently across Core, Client cache, Trust, and product helpers.
11. Core Approval `removeUndefined` removes array positions, which can change
    semantic identity rather than merely omit an object member.
12. No current protocol policy limits integer values to a portable exact range;
    JavaScript can silently round values beyond `2^53 - 1`.
13. JSON serialization collapses negative zero to `0`; the repository does not
    consistently reject the information loss.
14. Exponent case, plus signs, and decimal spellings converge only where every
    implementation uses the same binary64-to-text algorithm.
15. Decimal and floating-point round-trip expectations are not specified for
    non-JavaScript implementations.
16. Trust rejects NaN and infinities; not all product helpers expose the same
    failure boundary before hashing.
17. Timestamps are generally strings but some product values become numbers or
    `Date` objects converted by helper-specific rules.
18. No universal rule distinguishes hashing raw transport bytes from hashing a
    parsed semantic projection.
19. Native Client `passportDigest` includes proof, while Trust commonly hashes
    a proof-excluded document.
20. `signed-envelope` carries payload, payload digest, and proof without a
    complete rule for excluding self-referential cryptographic fields.
21. Generic removal of `proof` does not define whether nested proofs, digests,
    or signatures participate.
22. Repository outputs use lowercase hex, unprefixed base64url, `sha256-`
    base64url, `sha256:` hex, `hmac-sha256:` hex, and truncated encodings.
23. Hex case acceptance and preservation are not governed uniformly.
24. Padded and unpadded base64url, and base64 versus base64url, are not uniformly
    rejected as distinct encodings.
25. Trust JWS signs canonical payload bytes after base64url wrapping; other
    helpers hash canonical bytes, raw text, or concatenated strings.
26. The current JWS protected header signs `kid`, but some durable digest
    surfaces transport key identity only alongside the value.
27. Trust key purpose is supplied to verification out of band and is not a
    protected proof-purpose field in the generic header.
28. Proof purpose is implicit in the caller/object path, so identical payloads
    and multi-purpose key material create cross-purpose substitution risk.
29. Audience/target is payload-dependent and not governed by one complete
    object-purpose registry.
30. Grant, Connection, Approval, Invocation, Task, Result, Receipt, Passport,
    revocation, and manifest helpers lack mutually exclusive domains.
31. A generic valid JWS can be replayed across signed object types if shape,
    audience, key purpose, and caller checks happen to overlap.
32. Algorithm/profile identifiers exist, but no complete successor, selection,
    downgrade, or verification-only legacy policy exists.
33. Key type can imply `EdDSA` operationally; inference is not prohibited by a
    normative rule.
34. Unknown algorithm/profile behavior differs between schema rejection,
    validation failure, library error, and fallback-prone product code.
35. Recomputing old evidence with current code can make an implementation result
    look like proof of original bytes when original serialization is unknown.
36. Trust rejects a noncanonical but semantically equal payload after parsing;
    Core digest paths can accept another insertion order as a different digest.
37. Ed25519 library behavior for malformed length/noncanonical encodings is not
    a repository-wide verifier contract.
38. JavaScript, Python, Go, Java, and Rust JSON libraries differ on duplicate
    names, integers, exponent formatting, surrogates, and map ordering.
39. Canonicalization failure has no common semantic category distinct from
    malformed input, unsupported profile, or invalid signature.
40. Invalid proof, unsupported proof, unavailable key, wrong purpose, revoked
    key, stale proof, and unverifiable history do not have one ordered semantic
    classification.
41. Locale-sorted capability/manifests can change array order before an otherwise
    deterministic object serialization.
42. Product pipe/colon concatenations are not length framed and can be ambiguous
    if their input alphabets expand.
43. A valid cryptographic proof is sometimes close to an execution check in
    code, creating risk that callers confuse validity with authorization.
44. Canonical/signature inputs can contain sensitive fields; debug logging or
    vector capture could violate H-05 secret-exclusion and privacy boundaries.
45. Current depth/size limits are implementation constants rather than a
    release-bound canonicalization eligibility profile.
46. Issuer metadata advertises proof/algorithm support, but the repository does
    not make advertisement, eligibility, exact selection, and proof binding one
    immutable no-fallback algorithm.
47. `requestedReceiptProfile`/`receiptProfile` names a semantic Receipt policy,
    while proof/crypto profile names select byte algorithms; the shared word
    “profile” invites inference between unrelated namespaces.

## Human decision questions

| ID | Question | Approved Option B answer |
| --- | --- | --- |
| A | Canonical semantic input? | A purpose-registered semantic projection plus required context, represented as the approved cryptographic semantic envelope; never raw transport bytes or arbitrary runtime objects |
| B | Exact JSON subset? | Strict RFC 8785 JCS over an I-JSON-compatible, additionally constrained input described below |
| C | UTF-8 rules? | Strict shortest-form UTF-8 of Unicode scalar values; malformed, overlong, surrogate, and forbidden noncharacter input rejected |
| D | BOM? | Forbidden on input to the cryptographic parser and never emitted |
| E | Duplicate names? | Rejected after escape decoding at every object depth before semantic projection |
| F | Unicode normalization? | None; code points are preserved, so normalized and non-normalized strings remain distinct |
| G | Lone surrogates? | Rejected; no repair or replacement character insertion |
| H | Object-key order? | Recursive ascending UTF-16 code-unit order required by JCS; array order preserved |
| I | String escaping? | Exact JCS/ECMAScript JSON string form defined below; no solidus, HTML, or optional escaping variants |
| J | Literals? | Lowercase `null`, `true`, and `false` only, with no whitespace |
| K | Numbers? | Finite IEEE-754 binary64 with JCS serialization, plus the stricter safe-integer and negative-zero rules below |
| L | Negative zero? | Rejected, not collapsed |
| M | Forbidden numeric values? | NaN, infinities, out-of-binary64 values, negative zero, and integer tokens outside the safe exact range |
| N | Integers beyond portable exact range? | Rejected as JSON numbers; future schemas may define bounded decimal strings |
| O | `null` versus absence? | Distinct semantic states and distinct bytes |
| P | Insert absent optional fields? | No |
| Q | Materialize defaults? | No; a default participates only if the semantic producer explicitly included it before commitment under a future approved schema |
| R | Unknown/extensions covered? | Only fields H-13 classifies as semantically participating; included participating fields are covered exactly and cannot be stripped |
| S | Extension coverage owner? | H-13 decides participation/requiredness; H-10 decides bytes once participation is known |
| T | Digest input bytes? | Exact approved frame containing domain, complete digest profile ID, and canonical semantic-envelope bytes |
| U | Baseline digest? | SHA-256 |
| V | Digest text? | Exactly 43 ASCII characters of unpadded RFC 4648 base64url for the 32 digest octets |
| W | Signature input bytes? | Exact approved frame containing signature domain, complete signature profile ID, and canonical proof-envelope bytes |
| X | Payload, digest, or envelope? | Ed25519 signs the frame directly; it does not sign a textual digest or raw transport representation |
| Y | Baseline signature? | Ed25519 as specified by RFC 8032, through a strict maintained implementation |
| Z | Signature text? | Exactly 86 ASCII characters of unpadded base64url for 64 raw signature octets |
| AA | Key identity? | Signed proof envelope contains exact key ID and RFC 7638 SHA-256 JWK thumbprint; trusted resolution must match both |
| AB | Key purpose? | Signed proof envelope contains one exact purpose and verifier requires separately authorized key metadata for that purpose |
| AC | Proof purpose? | Signed proof envelope and frame domain both bind one exact registered purpose |
| AD | Audience/resource/target? | Exact purpose-required audience and target are in the signed context; no normalization or cross-purpose reuse |
| AE | Release/profile? | Exact governing protocol release and complete crypto profile IDs are covered; history never uses current defaults |
| AF | Tenant boundaries? | Applicable objects bind exact organization plus H-07 tagged workspace absence/presence; not-applicable context is forbidden rather than guessed |
| AG | Domain separation? | Fixed magic/version and length-prefixed domain/profile fields before canonical payload |
| AH | One signature valid for two object types? | No; object/proof domains differ and purpose is also covered in the envelope |
| AI | One digest valid for two purposes? | No claim of equivalence; each semantic purpose has a distinct registered domain except deliberately shared content-addressing rows documented below |
| AJ | Algorithm agility? | Immutable complete profiles, explicit selected ID, successor profile through governance/release binding, and historical verification under original ID |
| AK | Silent fallback? | Forbidden |
| AL | Unknown profile? | Fail closed as unsupported/unknown before cryptographic verification |
| AM | Known historical but unsupported profile? | Return semantic historical-profile-unsupported/indeterminate; never try a nearby profile |
| AN | History after algorithm changes? | Resolve exact original release/profile and H-11 key/history evidence; never recompute under successor rules |
| AO | Who introduces profiles? | Human-governed H-10 successor decision plus H-03 release registration; code/config cannot create protocol profiles |
| AP | New release versus compatible support? | Any changed security-relevant byte/algorithm rule requires a new immutable profile and release declaration; adding an implementation of an unchanged profile does not |
| AQ | Field mapping? | Approved H-10 registry below |
| AR | Existing migration? | Existing values are legacy classifications unless original profile/bytes are proven; no automatic alias |
| AS | Failure classification? | Ordered semantic categories below, distinct from authorization and wire status |
| AT | H-12 remainder? | Placement, routes, media types, statuses, public vocabulary/detail, transport retry and redaction |
| AU | H-11 remainder? | Revocation/bootstrap/sequence/freshness/rollback, key lifecycle and history, compromise intervals, historical Receipt status |
| AV | H-13 remainder? | Openness, unknowns, extension namespaces/requiredness/forwarding/evolution and participation |
| AW | H-14 remainder? | Support/deprecation dates, implementation matrices, external review, residual-risk and release/graduation authority |
| AX | Evidence before acceptance? | Separately produced independent reproduction gate below |
| AY | Language combinations? | At minimum independent JavaScript, Python, and Go stacks, covering both producer/verifier directions |
| AZ | Insufficient evidence? | Official JavaScript output alone, shared Ghost Bridge canonical code, generated self-tests, prose examples, same-library wrappers, or passing current tests |

## Alternatives

### Option A — Preserve current/historical implementation-defined crypto behavior

Option A would retain Core insertion-order SHA-256/base64url, Trust sorted-JSON
`sha256-` digests and generic JWS/Ed25519 proofs, and local helper differences.
It minimizes immediate migration and is convenient for the current JavaScript
code. It also preserves the exact `GB-027` contradiction, keeps historical and
current meaning ambiguous, makes non-JavaScript reproduction depend on hidden
construction order, and leaves cross-object/key-purpose domains implicit.
Adding algorithm identifiers around inconsistent bytes would provide agility in
name only. Security consequence: valid-looking proofs and digests could still
be substituted or disagreed upon. This option is not recommended.

### Option B — Versioned JSON-first cryptographic profile registry

Option B defines one strict JCS/I-JSON-derived canonicalization profile, exact
UTF-8, an unambiguous semantic frame, SHA-256 digest and Ed25519 signature
baselines, strict unpadded base64url, protected key/proof/context fields, a
field/domain registry, no fallback, immutable historical profiles, and an
independent reproduction gate. It matches the repository's JSON objects while
removing JavaScript construction-order authority. Its cost is an intentionally
incompatible successor to all unqualified current digest/proof values and the
need for new downstream schemas/vectors. This option receives the detailed
approved algorithm below.

### Option C — Deterministic CBOR/COSE canonical cryptographic substrate

Option C would make deterministic RFC 8949 CBOR the authoritative bytes and use
COSE-style proofs, leaving JSON as a projection. It has strong binary and
numeric representation, compact bytes, and a mature protected-header model.
It would, however, introduce a second semantic data model into a repository
whose contracts, schemas, implementations, and accepted decisions are JSON
first. Every JSON/CBOR projection, extension, and historical object would need
an exact dual-representation rule; debugging and migration burden are high.
This is a credible future profile, but weaker as the mandatory first profile for
current Ghost Bridge evidence. It is not recommended.

### Option D — Envelope/transport-signature-led model

Option D would primarily use JWS and/or RFC 9421 covered components. It gains
standards reuse and protected metadata. JWS still needs exact semantic payload
bytes; HTTP signatures bind a transport representation that intermediaries may
transform and that is unavailable for durable Result/Receipt verification after
transport is gone. It also risks moving H-12 transport choices into H-10 and
does not solve every content digest. A JWS can be a carrier for a future profile,
but it cannot replace the object canonicalization/domain registry. This option
is not recommended.

## Approved decision

**OPTION B APPROVED**

Approval is at the H-10 protocol-governance decision level only. It does not
itself create normative specification text, schemas, vectors, implementation,
migration, deployment, conformance, release, or Protocol 1.0 authority.

Repository fit and security evidence favor Option B. It preserves JSON-first
semantics while defining bytes independently of JavaScript object construction;
it separates every authority-sensitive purpose, fixes encodings, and supports
immutable successor profiles without fallback. Option A preserves known
contradictions. Option C requires a dual semantic representation before the
JSON contract is stabilized. Option D solves envelope/transport signing but not
the durable semantic canonicalization problem.

The independent reproduction gate passed and Rudra completed the human review
and approval recorded below. The identifiers and algorithms below are approved
H-10 governance choices. Later H-13 field-participation decisions and all
normative, schema, implementation, migration, and release work remain
separately authorized.

## Approved Option B byte-level algorithm

### Approved profile identifiers

All identifiers are case-sensitive ASCII and are matched byte for byte. Aliases,
case folding, whitespace trimming, algorithm inference from a key, profile
inference from a digest/signature length, and partial profile negotiation are
forbidden.

| Approved identifier | Fixes |
| --- | --- |
| `gb-c14n-jcs-ijson-v1` | Eligible data model, strict parsing, JCS serialization, UTF-8, Unicode, number, null/absence, and failure rules |
| `gb-digest-jcs-sha256-v1` | `gb-c14n-jcs-ijson-v1`, the `GBCF` framing grammar, SHA-256, and 43-character unpadded base64url |
| `gb-signature-jcs-ed25519-v1` | `gb-c14n-jcs-ijson-v1`, `GBCF` framing, Ed25519, key/context binding, and 86-character unpadded base64url |
| `gb-proof-jcs-ed25519-v1` | Complete proof-envelope rules using `gb-signature-jcs-ed25519-v1`; any embedded semantic digest uses `gb-digest-jcs-sha256-v1` |
| `jwk-thumbprint-rfc7638-sha256-v1` | RFC 7638 Ed25519 public-JWK member projection, SHA-256, and 43-character unpadded base64url; separate from general Ghost Bridge content digests |

A profile ID fixes every security-relevant choice. The strings above have H-10
protocol-governance authority; their normative publication, schema placement,
implementation, and release registration remain separately authorized.

### 1–20. Eligible input and canonical byte production

1. **Input object eligibility.** The semantic input is JSON data only: `null`,
   Boolean, string, eligible number, array, or object. An in-memory object may
   contain only own enumerable string-keyed data properties. `undefined`, holes,
   accessors, symbols, functions, `BigInt`, binary buffers, `Date`, maps, sets,
   class instances, non-plain prototypes, cycles, and shared-reference semantics
   are rejected; they are never coerced.
2. **Parsing prerequisites.** Byte input is decoded once with a strict UTF-8
   decoder after the BOM and byte checks below. The parser retains number-token
   information until numeric eligibility is decided. In-memory input undergoes
   the same semantic eligibility checks. A schema/semantic layer must identify
   the exact purpose projection before canonicalization.
3. **Duplicate names.** Reject two member names at one object depth that decode
   to the same Unicode string, including escape-equivalent spellings. Detect
   before a last-name-wins object representation can discard evidence.
4. **Unicode/string eligibility.** Every string and member name is a sequence of
   Unicode scalar values. Reject unpaired surrogates and Unicode noncharacters;
   never repair, replace, or reinterpret them.
5. **Normalization.** Perform no NFC, NFD, NFKC, NFKD, case, locale, or
   identifier normalization inside H-10. Distinct code-point sequences remain
   distinct even when visually equivalent.
6. **UTF-8.** Encode the final canonical character sequence using shortest-form
   RFC 3629 UTF-8. Reject malformed, truncated, overlong, surrogate, or
   out-of-range input sequences. Emit no other charset.
7. **BOM.** Reject an initial U+FEFF byte-order mark in input to the
   cryptographic parser. Emit no BOM. U+FEFF occurring as an explicitly allowed
   scalar inside a string is data, not a BOM.
8. **Property ordering.** Recursively sort object member names by ascending
   UTF-16 code-unit values as required by JCS. Preserve array order exactly;
   never sort arrays or semantic sets unless their owning accepted semantic
   contract has already produced a specific ordered projection.
9. **Literals.** Emit exactly `null`, `true`, or `false`, lowercase, with no
   whitespace.
10. **String escaping.** Escape quotation mark as `\"`, reverse solidus as
    `\\`, and U+0008/U+0009/U+000A/U+000C/U+000D as `\b`, `\t`, `\n`, `\f`,
    `\r`. Escape every other U+0000–U+001F control as `\u00xx` with lowercase
    hexadecimal. Emit every other eligible scalar as its UTF-8 character; do
    not optionally escape solidus, HTML characters, or non-ASCII data.
11. **Number eligibility.** Accept only finite IEEE-754 binary64 semantic values.
    In addition, any mathematical integer JSON token must be within
    `-9007199254740991` through `9007199254740991`; enforce from the source token
    before conversion. A noninteger is allowed only where the owning future
    semantic schema expressly allows binary64 values.
12. **Number serialization.** Emit the shortest round-trippable ECMAScript
    `NumberToString` representation required by JCS: lowercase `e`, no redundant
    plus except where that algorithm emits it, no redundant fraction or leading
    zero, and the JCS fixed/exponent thresholds. Implementations must reproduce
    the RFC 8785 reference vectors, not use a language's arbitrary default.
13. **Negative zero.** Reject source `-0`, any negative-zero exponent/fraction
    spelling, and an in-memory value for which the runtime can determine
    negative zero. Do not canonicalize it to `0`.
14. **Large integers.** Reject integer number tokens outside the safe range even
    if binary64 happens to represent that even value. A future schema may use a
    bounded canonical decimal string; H-10 creates no such field or wire type.
15. **Null.** A present `null` is an explicit semantic value and emits `null`.
    The purpose registry/schema must allow it; otherwise reject it.
16. **Absent optional members.** Absence emits no member. Do not insert `null`,
    an empty value, or an implementation default.
17. **Defaults.** Do not materialize schema, language, server, or deployment
    defaults. A producer that semantically chooses a value must include it in the
    registered projection before commitment.
18. **Unknown/extensions.** H-13 decides whether a field or extension
    participates and whether it is required. Once participating, it is included
    exactly like any other eligible member. A verifier cannot strip, move,
    default, or reconstruct it.
19. **Cryptographic-field exclusion.** Each registry row defines an affirmative
    semantic projection. A commitment is never computed by recursively deleting
    every field named `digest`, `signature`, or `proof`. For a proof-bearing
    object, only the exact top-level carrier field identified by that row is
    outside the projected payload; every other member remains unless the row
    explicitly excludes it. A digest value is never an input to its own digest.
    Ambiguous or multiply present carriers fail rather than being guessed.
20. **Canonical bytes.** Serialize the eligible, purpose-specific semantic
    envelope using rules 1–19 with no whitespace, then UTF-8 encode it. The
    result is `payload` in the framing grammar below. Raw received JSON may be
    accepted only if strict parsing yields that semantic input; a signature
    verifier reconstructs the unique canonical bytes and does not authenticate
    a noncanonical transport spelling as such.

### Approved H-10 cryptographic semantic envelope

Every purpose first constructs this approved logical JSON object. These names
describe a future semantic artifact and do not themselves authorize a schema:

```json
{
  "context": {
    "audience": "purpose-required exact audience",
    "organization": "purpose-required exact organization",
    "protocolRelease": "exact immutable release identifier",
    "target": "purpose-required exact target",
    "workspace": { "state": "absent" }
  },
  "payload": {},
  "purpose": "exact registered semantic purpose"
}
```

`context.protocolRelease` and `purpose` are always present. The domain registry
declares each other context member mandatory or forbidden; no field is inserted
because a deployment has a default. Where H-07 scope applies, `organization` is
present and `workspace` is exactly `{"state":"absent"}` or
`{"state":"present","value":"..."}`. For a signature/proof, the envelope
also contains this required H-10 member:

```json
"signer": {
  "keyId": "exact key identifier",
  "keyPurpose": "one registered key purpose",
  "keyThumbprint": "43-character RFC 7638 profile value",
  "proofPurpose": "one registered proof purpose"
}
```

For a digest, `purpose` is exactly the frame's domain label. For a signature,
both `purpose` and `signer.proofPurpose` are exactly the frame's domain label.
There is no second alias or caller-selected purpose string. The context-presence
rules are:

| Approved domain family | `audience` | `target` | `organization` / tagged `workspace` |
| --- | --- | --- | --- |
| Authentication request/content, consent/selection, Install Grant intent/result, Connection authority, authorization action, Approval action/payload/proof, Invocation intent, Task acceptance, Result/output, Receipt semantic/evidence/signature | Required | Required | Required; workspace tag is present even when workspace is absent |
| Install resolution, Connection Offer, Delegation proof | Required | Required | Required; workspace tag is present even when workspace is absent |
| Passport, issuer metadata, capability/profile manifest, revocation status/snapshot/checkpoint, release/artifact manifest | Forbidden and absent | Forbidden and absent | Forbidden and absent; object payload carries its own issuer/subject identity |
| Extension-covered object | Exactly inherits the owning registered domain; standalone use is forbidden | Exactly inherits | Exactly inherits |

No context member may appear for a family that forbids it, and none may be
absent for a family that requires it. A future change to this matrix changes
cryptographic input and therefore requires a new profile/domain revision.

Audience, target, tenant, key, purpose, release, and payload are therefore
cryptographically covered, not merely transported beside the proof. If a future
schema uses different wire names, its normative projection must still reproduce
this exact semantic envelope or register a new profile; H-12 owns placement and
H-13 owns field participation.

### 21–30. Framing, digest, and signature construction

21. **Domain construction.** Both digest and signature input are an exact binary
    `GBCF` frame. Different purposes use different registered domain labels.
22. **Domain identifiers.** Labels are lowercase ASCII matching
    `[a-z][a-z0-9.-]{0,126}[a-z0-9]` or a one-character lowercase letter; they
    are case-sensitive, 1–128 octets, immutable, and never inferred from object
    shape.
23. **Framing/length grammar.** Multi-octet integers are unsigned big-endian.
    No separator bytes, terminators, platform strings, or concatenation rules
    exist outside this grammar:

```text
frame = magic || framing-version || domain-length || domain ||
        profile-length || profile || payload-length || payload

magic           = 4 octets: 47 42 43 46 hexadecimal (ASCII "GBCF")
framing-version = 1 octet: 01 hexadecimal
domain-length   = uint16be; value 1..128
domain          = exactly domain-length lowercase ASCII octets
profile-length  = uint16be; value 1..128
profile         = exactly profile-length case-sensitive ASCII octets
payload-length  = uint64be; exact number of following octets
payload         = exactly payload-length canonical bytes; no trailing octets
```

The complete digest profile ID occupies `profile` for a digest; the complete
signature profile ID occupies it for a signature. Any overflow, truncated
length, invalid label, extra byte, or non-minimal/alternate frame is malformed.
Release-specific resource limits must be below the framing maxima and remain
future normative/H-14 work.

24. **Digest algorithm.** SHA-256 exactly.
25. **Digest bytes.** `SHA-256(frame)` yields exactly 32 octets. The frame, not
    its text rendering and not a hex/base64 string, is the hash input.
26. **Digest text.** Unpadded RFC 4648 base64url of the 32 octets: alphabet
    `A-Z a-z 0-9 - _`, exactly 43 ASCII characters. Reject `=`, whitespace,
    standard base64 `+` or `/`, nonzero unused bits, and any decode/re-encode
    mismatch. Algorithm/profile are separate explicit metadata; length does not
    imply them.
27. **Signature input.** Construct the signature semantic envelope, canonicalize
    it, and build a frame using the signature-specific domain and
    `gb-signature-jcs-ed25519-v1`. Ed25519 signs the complete frame octets
    directly. It does not sign a textual digest, raw JSON, raw HTTP bytes, a JWS
    compact string, or an unframed concatenation.
28. **Signature algorithm.** Pure Ed25519 under RFC 8032; no prehash (`Ed25519ph`),
    context variant, Ed448, randomized wrapper, or alternate algorithm is part
    of this profile.
29. **Signature bytes.** Exactly the 64 raw Ed25519 signature octets. Verification
    rejects every other length and relies on a maintained strict implementation
    that enforces RFC 8032 point/scalar validation.
30. **Signature text.** Strict unpadded base64url, exactly 86 ASCII characters,
    with the same alphabet/canonical decoder rules as digest text.

### 31–46. Key/context binding, verification, history, and reproduction

31. **Public-key boundary.** Approved H-10 public keys are JWK objects with exactly
    the purpose-allowed public metadata and `kty:"OKP"`, `crv:"Ed25519"`, and
    `x` decoding canonically to 32 octets. No private `d` enters a protocol
    artifact. Trust/bootstrap/resolution and historical storage remain H-11.
    The approved thumbprint input is exactly the three-member object
    `{"crv":"Ed25519","kty":"OKP","x":"<canonical x>"}`, with `x` the
    strict 43-character unpadded base64url encoding of the 32 public-key octets.
    Serialize those members in the displayed JCS order, UTF-8 encode, SHA-256
    hash, and encode the 32 result octets as strict 43-character unpadded
    base64url. `kid`, `alg`, `use`, `key_ops`, `purpose`, and every private or
    deployment member are excluded from this thumbprint input.
32. **Key ID.** The exact key ID and its `jwk-thumbprint-rfc7638-sha256-v1`
    value are signed. Trusted key resolution must return a key whose ID and
    recomputed thumbprint both match; the ID alone never selects substituted
    material.
33. **Key purpose.** One exact key purpose is signed and independently required
    in trusted key metadata. Baseline conformant key material serves one Ghost
    Bridge signing purpose only; reuse of the same public-key thumbprint across
    distinct signing purposes is rejected. H-11 owns lifecycle/rotation.
34. **Proof purpose.** One exact proof purpose is signed and must equal the
    domain-registry row. Generic caller-supplied purpose without protected
    equality is insufficient.
35. **Audience/target/context.** Every row declares exact audience, target,
    object identity, parent references, nonce/time, and other context required
    by its accepted semantic owner. Values are compared byte-for-byte after
    profile validation; no URL, case, locale, or deployment normalization is
    inferred.
36. **Release/profile.** The semantic envelope contains the exact immutable
    protocol release. Frame metadata contains the complete crypto profile.
    Selected negotiation/consent/Connection evidence also binds the profile;
    omission or disagreement fails.
37. **Organization/workspace.** Where applicable, exact organization and tagged
    workspace state are covered as above. `null`, empty, body-supplied default,
    parent inference, or current database scope cannot replace the tag.
38. **Verification order.** Apply the ordered model below. No later success
    cures an earlier failure.
39. **Comparison.** Profile IDs, labels, key IDs/purposes, release IDs, audience,
    target, organization, workspace, and encoded values use exact equality.
    Digest/signature byte comparison is constant-time after strict decoding.
40. **Malformed input.** Reject before key lookup or authorization; never repair,
    normalize, coerce, delete, or default it.
41. **Unsupported profiles.** Distinguish syntactically invalid ID, unknown ID,
    known but unsupported current ID, and known historical verification-only ID.
    None triggers an alternate algorithm.
42. **Fallback.** Silent fallback, algorithm trial, key-type inference,
    digest-length inference, aliasing, first-supported choice, and downgrade to a
    legacy profile are forbidden.
43. **Historical verification.** Resolve original bytes/projection, release,
    profile, key metadata, and H-11 evidence. If any required fact is unknown,
    report indeterminate/unsupported history; never apply current defaults.
44. **Profile addition/supersession.** A changed byte, algorithm, encoding,
    purpose, or verifier rule creates a new immutable full profile through human
    H-10 governance and H-03 release declaration. Old IDs never change. H-14
    decides concrete support windows.
45. **Privacy-safe failures.** Preserve precise internal semantic categories and
    safe evidence identity; expose no canonical payload, secret, private key,
    credential, raw proof context, cross-tenant existence, or sensitive key
    history. H-12 decides public mapping/redaction.
46. **Cross-language reproduction.** Approval requires separately implemented
    canonicalizers/framers/encoders and independent key/signature tooling to
    agree byte for byte as specified in the gate below.

## Approved H-10 domain registry

No signature or digest is transferable merely because two payloads are equal.
The labels below are the approved H-10 semantic domains. H-11/H-12/H-13/H-14
own the downstream policy identified in the last column.

| Approved H-10 domain | Operation | Required distinction / semantic owner | Downstream boundary |
| --- | --- | --- | --- |
| `gb.authentication.request-content.v1` | Digest | H-05 exact request-body semantic commitment in one request context | H-12 defines body/transport decoding before semantic projection |
| `gb.authentication.request.v1` | Signature | H-05 governed request proof; exact method/operation/body commitment/Connection/audience/target/tenant/time/nonce/release | H-12 defines request-target and transport placement; H-11 key status |
| `gb.consent.envelope.v1` | Digest | H-01 exact final human-consent envelope | H-01 decides consent/material-change semantics |
| `gb.connection.selection.v1` | Digest | H-01/H-03/H-04 exact final selected result before authority commit | H-01/H-04 selection and H-06 commit remain unchanged |
| `gb.install-grant.intent.v1` | Digest | H-06 exact redemption intent, including explicit presence and stable attempt identity | H-06 equality/transaction remains unchanged |
| `gb.install-grant.result.v1` | Digest | H-06 exact authoritative redemption result identity | H-06 replay/disclosure/transaction remains unchanged |
| `gb.connection.authority.v1` | Digest | H-01/H-04/H-05/H-06/H-07 immutable Connection authority/context bundle | H-07 lifecycle and current intersection |
| `gb.authorization.action.v1` | Digest | H-02 authorization action only | Authorization remains separate from Approval; any future authorization proof needs a different registered signature domain |
| `gb.invocation.payload.v1` | Digest | Exact Invocation payload semantic commitment in its authority context | H-08 owns approved action coverage; H-13 owns payload schema/participation |
| `gb.approval.action.v1` | Digest | H-08 complete exact action and presence state | H-08 field completeness/consumption |
| `gb.approval.proof.v1` | Signature | H-08 Approval Decision proof; cannot validate as request proof | H-11 approver key history; H-12 placement |
| `gb.invocation.intent.v1` | Digest | H-07 accepted Invocation/idempotency semantic identity | H-07/H-09 atomicity and retry |
| `gb.task.acceptance.v1` | Digest | H-09 immutable Task acceptance bundle | H-09 Task lifecycle |
| `gb.result.semantic.v1` | Digest | H-09 one terminal Result and effect semantic commitment | H-09 remains terminal truth |
| `gb.result.output.v1` | Digest | H-09 exact retained/referenced output semantic commitment | H-09 owns output truth/retention; H-13 owns schema participation |
| `gb.receipt.semantic.v1` | Digest | H-09 immutable Receipt-generation semantic snapshot | Receipt cannot alter Task/Result |
| `gb.receipt.evidence.v1` | Digest | H-09 exact bounded effect/execution evidence commitment | H-09 owns effect semantics; H-11 owns historical evidence availability |
| `gb.receipt.signature.v1` | Signature | Receipt evidence for exactly one semantic Receipt | H-11 historical validity; H-12 delivery |
| `gb.passport.semantic.v1` | Digest | Exact proof-excluded Agent Passport semantic identity | H-11 history; H-13 schema participation |
| `gb.passport.signature.v1` | Signature | Agent Passport proof only | H-11 issuer/key lifecycle |
| `gb.issuer-metadata.semantic.v1` | Digest | Exact proof-excluded issuer-metadata semantic identity | H-11 bootstrap/history |
| `gb.issuer-metadata.signature.v1` | Signature | Issuer metadata proof only | H-11 bootstrap/history |
| `gb.capability.contract.v1` | Digest | Exact capability input/output contract semantic identity | H-03/H-04 immutable capability meaning; H-13 schema participation |
| `gb.capability-manifest.semantic.v1` | Digest | Exact proof-excluded capability/profile manifest identity | H-03/H-04 immutable release meaning |
| `gb.capability-manifest.signature.v1` | Signature | Capability/profile manifest proof only | H-03/H-04 immutable release meaning |
| `gb.install-resolution.signature.v1` | Signature | Install Grant resolution object proof only | H-06 disclosure semantics; H-12 placement |
| `gb.connection-offer.semantic.v1` | Digest | Exact proof-excluded Connection Offer semantic identity | H-01/H-04/H-05 semantics |
| `gb.connection-offer.signature.v1` | Signature | Connection Offer proof only | H-01/H-04/H-05 semantics |
| `gb.delegation.proof.v1` | Signature | Delegation Grant proof only; never authentication, authorization, or transferable Agent authority by itself | H-02 authority semantics; H-11 key history; H-13 schema |
| `gb.revocation.status.v1` | Digest | Point revocation-status semantic commitment only | H-11 decides its relationship to authoritative snapshots and subject states |
| `gb.revocation.status-proof.v1` | Signature | Point revocation-status proof only | H-11 decides status authority, key history, and lifecycle |
| `gb.revocation.snapshot.v1` | Digest | Exact revocation snapshot semantic commitment | H-11 decides subjects, status, freshness, and authority |
| `gb.revocation.snapshot-proof.v1` | Signature | Exact revocation snapshot proof only | H-11 decides subjects, status, freshness, and authority |
| `gb.revocation.checkpoint.v1` | Digest | Predecessor/checkpoint commitment | H-11 decides sequence, rollback, and recovery |
| `gb.release-manifest.semantic.v1` | Digest | Exact proof-excluded release/artifact manifest identity | H-03 identity; H-14 publication/support |
| `gb.release-manifest.signature.v1` | Signature | Exact release/artifact manifest evidence | H-03 identity; H-14 publication/support |
| `gb.extension.covered-object.v1` | Digest | Only an H-13-declared covered extension object, inheriting its owning context | H-13 decides participation, forwarding, and evolution; any standalone proof needs a separately registered domain |

Shared content addressing may use the same domain only when the registry says
the semantic purpose is deliberately identical, not merely because both fields
are called `payloadDigest`. Approved Option B makes no such cross-row
equivalence. Authentication, grant, authorization, Approval, Receipt, Passport,
revocation, and manifest signatures are always separate.

Approved signature domains bind these exact, case-sensitive key-purpose
identifiers. One public-key thumbprint may appear in only one row:

| Signature domain | Approved key purpose |
| --- | --- |
| `gb.authentication.request.v1` | `request_signing` |
| `gb.approval.proof.v1` | `approval_signing` |
| `gb.receipt.signature.v1` | `execution_receipt_signing` |
| `gb.passport.signature.v1` | `passport_signing` |
| `gb.issuer-metadata.signature.v1` | `issuer_metadata` |
| `gb.capability-manifest.signature.v1` | `capability_signing` |
| `gb.install-resolution.signature.v1` | `install_resolution_signing` |
| `gb.connection-offer.signature.v1` | `connection_offer_signing` |
| `gb.delegation.proof.v1` | `delegation_signing` |
| `gb.revocation.status-proof.v1` | `revocation_status_signing` |
| `gb.revocation.snapshot-proof.v1` | `revocation_snapshot_signing` |
| `gb.release-manifest.signature.v1` | `release_manifest_signing` |

The new purpose strings in this table are approved H-10 registry values, not
current Trust registry entries. In particular, current generic
`revocation_signing` does not alias either approved revocation purpose.

## Approved H-10 field-to-profile registry

`EXISTING REPOSITORY FIELD` means the name/helper exists; it does not mean its
current value is H-10 conformant. `FUTURE H-DECISION-REQUIRED SEMANTIC
COMMITMENT` marks accepted semantics for which downstream work may later create
a field/schema only after authorization.

All approved digest rows use `gb-c14n-jcs-ijson-v1` plus
`gb-digest-jcs-sha256-v1`; all approved signature rows use
`gb-c14n-jcs-ijson-v1` plus `gb-signature-jcs-ed25519-v1` and
`gb-proof-jcs-ed25519-v1`. The table abbreviates those repeated IDs as `C`, `D`,
`S`, and `P` respectively.

| Status / owner | Object; field or helper | Purpose and approved H-10 domain | Profiles / key purpose | Decisions / dependency | Migration treatment |
| --- | --- | --- | --- | --- | --- |
| EXISTING REPOSITORY FIELD | Core generic `digest` | Unregistered generic content hash; no approved H-10 domain | Current Core only; no automatic `C/D` mapping | H-10; future call-site split | Legacy-only; classify per use, never alias |
| EXISTING REPOSITORY FIELD | Trust generic `digest` | Unregistered generic document hash | Current Trust only; no automatic `C/D` mapping | H-10; future call-site split | Legacy-only even when `sha256-` verifies |
| EXISTING REPOSITORY FIELD | Core Approval `approvalActionDigest` | Exact Approval action; `gb.approval.action.v1` | `C/D`; no signing key | H-08/H-10; H-13 schema | Existing unprefixed value legacy; future value needs explicit profile metadata |
| EXISTING REPOSITORY FIELD | Approval action `payloadDigest` | Exact Invocation payload semantic commitment; `gb.invocation.payload.v1` | `C/D`, then nested under Approval action | H-08/H-10/H-13 | Current helper value legacy; future schema must define payload projection |
| EXISTING REPOSITORY FIELD | Trust request descriptor `contentDigest` | Request body semantic commitment; `gb.authentication.request-content.v1` | `C/D`, then covered by request `S/P`; `request_signing` | H-05/H-10; H-12 target/placement | Current `sha256-` value legacy experimental |
| EXISTING REPOSITORY FIELD | Request `proof` | Governed authentication request proof; `gb.authentication.request.v1` | `C/S/P`; `request_signing` | H-05/H-10/H-11/H-12 | Generic JWS is legacy; no alias to the approved proof |
| EXISTING REPOSITORY FIELD | Capability `contractDigest` | Exact capability contract content; `gb.capability.contract.v1` | `C/D`; manifest proof separate | H-03/H-04/H-10/H-13 | Current Trust value historical/legacy until original projection proven |
| EXISTING REPOSITORY FIELD | Passport `capabilityManifestDigest` | Exact manifest reference; `gb.capability-manifest.semantic.v1` | `C/D`; no signing key | H-03/H-04/H-10/H-13 | Preserve original profile; do not recompute |
| EXISTING REPOSITORY FIELD | Native Client `passportDigest` | Local Passport cache/trust identity including proof | No approved H-10 direct mapping | H-10/H-11 | Client-local legacy; replace future protocol use with registered semantic/proof identities |
| EXISTING REPOSITORY FIELD | Native Client `trustDocumentDigest` | Proof-excluded Trust document identity | Approved purpose-specific `C/D`, such as `gb.passport.semantic.v1` or `gb.issuer-metadata.semantic.v1`, only after object-type selection | H-10/H-11 | Legacy Trust value; cannot equal `passportDigest` by inference |
| EXISTING REPOSITORY FIELD | `connectionOfferDigest` | Connection Offer evidence; `gb.connection-offer.semantic.v1` | `C/D`; offer signature domain separate | H-01/H-04/H-05/H-10 | Current Core proof-inclusive digest legacy |
| EXISTING REPOSITORY FIELD | Signed envelope `payloadDigest` | Payload commitment | Purpose-specific `C/D`; envelope proof uses a distinct `S/P` domain | H-10/H-13 | Ambiguous historical values classified B/C/D below |
| EXISTING REPOSITORY FIELD | Receipt `outputDigest` | Result output semantic commitment; `gb.result.output.v1` | `C/D`; no signing key | H-09/H-10/H-13 | Current Trust value legacy; semantic projection must be fixed downstream |
| EXISTING REPOSITORY FIELD | Receipt `evidenceDigest` | Bounded execution/effect evidence commitment; `gb.receipt.evidence.v1` | `C/D`; no signing key | H-09/H-10/H-13 | Current Trust value legacy |
| EXISTING REPOSITORY FIELD | Receipt/Agent `requestFingerprint` | Invocation/idempotency equality | `C/D`; `gb.invocation.intent.v1` | H-07/H-09/H-10 | Current Core value in mixed-format Receipt is legacy |
| EXISTING REPOSITORY FIELD | Receipt `proof` / `agentExecutionKeyId` | Receipt signature; `gb.receipt.signature.v1` | `C/S/P`; `execution_receipt_signing` | H-09/H-10/H-11/H-12 | Current generic JWS is legacy; key/purpose/profile must not be backfilled |
| EXISTING REPOSITORY FIELD | Receipt `requestedReceiptProfile` / `receiptProfile` | H-09 Receipt policy, not a cryptographic suite | No `C/D/S/P` inference | H-09; H-10 profile namespace; H-13 schema | Preserve as a distinct semantic namespace; never infer proof algorithms from it |
| EXISTING REPOSITORY FIELD | Issuer metadata `proof` | `gb.issuer-metadata.signature.v1` | `C/S/P`; `issuer_metadata` | H-10/H-11/H-13 | Generic current proof legacy |
| EXISTING REPOSITORY FIELD | Issuer metadata `supportedProofProfiles`, `supportedAlgorithms`, `supportedTrustProfiles`; Trust `allowedAlgorithms` / policy `acceptedAlgorithms` | Advertisement/policy eligibility only | Approved complete H-10 IDs, never independently mixed knobs | H-03/H-04/H-10/H-14 | Historical advertisement/policy; does not prove approved-profile selection/support |
| EXISTING REPOSITORY FIELD | Passport `proof` | `gb.passport.signature.v1` | `C/S/P`; `passport_signing` | H-10/H-11/H-13 | Generic current proof legacy |
| EXISTING REPOSITORY FIELD | Capability Manifest `proof` | `gb.capability-manifest.signature.v1` | `C/S/P`; `capability_signing` | H-03/H-04/H-10/H-11/H-13 | Generic current proof legacy |
| EXISTING REPOSITORY FIELD | Install resolution `proof` | `gb.install-resolution.signature.v1` | `C/S/P`; `install_resolution_signing` | H-06/H-10/H-11/H-12 | Generic current proof legacy |
| EXISTING REPOSITORY FIELD | Connection Offer `proof` | `gb.connection-offer.signature.v1` | `C/S/P`; `connection_offer_signing` | H-01/H-04/H-05/H-10 | Generic current proof legacy |
| EXISTING REPOSITORY FIELD | Approval Decision optional `proof` | Approval Decision proof; `gb.approval.proof.v1` | Future `C/S/P`; `approval_signing` | H-08/H-10/H-11/H-13 | Open generic historical proof; purpose-ambiguous and legacy-only |
| EXISTING REPOSITORY FIELD | Delegation Grant optional `proof` | Delegation evidence; `gb.delegation.proof.v1` | Future `C/S/P`; `delegation_signing` | H-02/H-10/H-11/H-13 | Open generic historical proof; no automatic authority or approved H-10 mapping |
| EXISTING REPOSITORY FIELD | Revocation Status optional `proof` | Point status proof; `gb.revocation.status-proof.v1` | Future `C/S/P`; `revocation_status_signing` | H-10 bytes; H-11 status authority/lifecycle; H-13 schema | Open generic historical proof; not equivalent to Revocation Set proof or current generic `revocation_signing` |
| EXISTING REPOSITORY FIELD | Signed Envelope `proof` | Purpose is unspecified by the generic envelope | No generic approved domain; owning object must register one | H-10/H-13 | Legacy purpose-ambiguous carrier; never map by field name alone |
| EXISTING REPOSITORY FIELD | Receipt Proof projection `proof` | Projection/carrier for the Receipt proof | Same `gb.receipt.signature.v1`; no second signature domain | H-09/H-10/H-11/H-13 | Historical projection; must resolve to exact Receipt semantics and original proof |
| EXISTING REPOSITORY FIELD | Revocation Set `proof`, `previousSetDigest`, `subjectDigest`, anti-rollback `documentDigest` / `previousDigest` | Snapshot and checkpoint chain; `gb.revocation.snapshot.v1`, `gb.revocation.snapshot-proof.v1`, `gb.revocation.checkpoint.v1` | Future `C/D/S/P`; `revocation_snapshot_signing`; current `revocation_signing` is legacy | H-10 bytes; H-11 lifecycle/history | Preserve original chain/profile; never splice approved H-10 and legacy links |
| EXISTING REPOSITORY FIELD | Key JWK, `kid`, `rootKeyId`, `verifiedIssuerKeyId`, `oldKeyId`, `newKeyId`, Issuer `materialFingerprint`, and thumbprint helper | Public key identity, selection, transition, and verification references | `jwk-thumbprint-rfc7638-sha256-v1` | H-10 representation; H-11 namespace/lifecycle/transition | Current value usable only with proven original projection/profile and trusted history |
| EXISTING REPOSITORY FIELD | Core/Agent grant `keyHash` | Secret-derived lookup | No public H-10 profile | H-06 semantics; deployment storage/privacy | Keep deployment-private legacy lookup; do not expose or call a commitment |
| EXISTING REPOSITORY FIELD | Client cache and backend idempotency hashes | Local key lookup/fingerprint | No protocol H-10 profile | Deployment policy | Remain explicitly local; never compare as H-10 evidence |
| EXISTING REPOSITORY FIELD | Platform `#seal` token | Platform HMAC envelope | No Ghost Bridge proof profile | Platform/H-12 adapter policy | Remain deployment-private; not portable authority/proof |
| FUTURE H-DECISION-REQUIRED SEMANTIC COMMITMENT | H-01 consent envelope/final selection | `gb.consent.envelope.v1` and `gb.connection.selection.v1`; final authority bundle separately uses `gb.connection.authority.v1` | `C/D` | H-01/H-03/H-04/H-05/H-10/H-13 | New evidence only; no backfill |
| FUTURE H-DECISION-REQUIRED SEMANTIC COMMITMENT | H-02 authorization action | `gb.authorization.action.v1` | `C/D`; any future authorization proof needs a separately governed signature domain/key purpose | H-02/H-10/H-13 | New evidence; must remain distinct from Approval |
| FUTURE H-DECISION-REQUIRED SEMANTIC COMMITMENT | H-06 redemption intent/result | `gb.install-grant.intent.v1`, `gb.install-grant.result.v1` | `C/D` | H-06/H-10/H-13 | New explicitly profiled records; no rewriting legacy grants |
| FUTURE H-DECISION-REQUIRED SEMANTIC COMMITMENT | H-07 Connection authority bundle | `gb.connection.authority.v1` | `C/D` | H-07/H-10/H-11/H-13 | New connection/profile or proven migration evidence only |
| FUTURE H-DECISION-REQUIRED SEMANTIC COMMITMENT | H-07 Invocation acceptance/idempotency | `gb.invocation.intent.v1` | `C/D` | H-07/H-09/H-10/H-13 | New acceptance record; exact retry semantics unchanged |
| FUTURE H-DECISION-REQUIRED SEMANTIC COMMITMENT | H-08 full action and Decision proof | `gb.approval.action.v1`, `gb.approval.proof.v1` | `C/D/S/P`; `approval_signing` | H-08/H-10/H-11/H-13 | New Approval profile only; old proof cannot be upgraded |
| FUTURE H-DECISION-REQUIRED SEMANTIC COMMITMENT | H-09 Task acceptance | `gb.task.acceptance.v1` | `C/D` | H-09/H-10/H-13 | New Task evidence; does not create Task authority |
| FUTURE H-DECISION-REQUIRED SEMANTIC COMMITMENT | H-09 terminal Result | `gb.result.semantic.v1` | `C/D` | H-09/H-10/H-13 | New terminal commitment; Result remains truth |
| FUTURE H-DECISION-REQUIRED SEMANTIC COMMITMENT | H-09 Receipt semantic snapshot and proof | `gb.receipt.semantic.v1`, `gb.receipt.signature.v1` | `C/D/S/P`; `execution_receipt_signing` | H-09/H-10/H-11/H-13 | New materialization from immutable snapshot; never rerun execution |
| FUTURE H-DECISION-REQUIRED SEMANTIC COMMITMENT | H-03 release/artifact manifests | `gb.release-manifest.semantic.v1`, `gb.release-manifest.signature.v1` | `C/D/S/P`; `release_manifest_signing` | H-03/H-10/H-11/H-14 | New signed manifest; old artifacts retain original identity |
| FUTURE H-DECISION-REQUIRED SEMANTIC COMMITMENT | H-13 covered extension | Owning-object domain, or standalone digest `gb.extension.covered-object.v1` only if H-13 declares a separate semantic object | `C/D`; a standalone proof would need a new signature-domain row | H-10/H-13 | Cannot exist until H-13 participation is approved |

## Approved H-10 algorithm-agility rules

1. A complete profile identifier fixes canonicalization, framing, digest or
   signature algorithm, encoding, key representation, verifier rules, and
   required semantic context.
2. Identifiers and domains are case-sensitive ASCII. Aliases and equivalent
   spellings are forbidden.
3. Algorithm is never inferred from key type, signature length, digest length,
   proof carrier, object shape, current release, or implementation default.
4. The selected profile is explicitly bound by H-04/H-05 negotiation, H-01
   consent, the H-07 Connection, the semantic envelope, and the frame where
   applicable. A supported but unselected profile is rejected.
5. Unknown, syntactically invalid, unavailable, and known historical profiles
   are distinct semantic outcomes; none triggers trial verification.
6. A legacy profile may be verification-only only when its immutable definition,
   original governing release, bytes/projection, and H-11 history are known.
7. A successor is a new identifier and H-03 release declaration approved through
   human governance. It never changes an old ID's meaning.
8. Profile negotiation applies explicit eligible sets and security floors before
   selection. No first-common, preference-order, nearest, cached, provider, or
   weaker fallback is allowed.
9. Cross-release compatibility must explicitly name unchanged profile support;
   release ordering implies nothing.
10. Baseline signing key material is single-purpose across Ghost Bridge proof
    domains. Key metadata and signed envelope purpose must agree exactly.
11. The baseline proof profile permits exactly Ed25519. A future multi-algorithm
    bag is not an extension of this ID; each security-relevant suite receives a
    new complete ID.
12. H-14 later chooses concrete required/optional/verification-only support and
    deprecation dates, implementation matrices, and release gates.

## Null, absence, defaults, and extension matrix

| Input state | Semantic distinction | Approved H-10 canonical behavior / bytes | Verifier materialization | H-13 boundary |
| --- | --- | --- | --- | --- |
| Field absent | No member/value supplied | Member omitted; no member bytes | Never insert | H-13/schema decides whether absence is permitted |
| Present `null` | Explicit null value | Include member and `null` | Never treat as absence/default | H-13/schema decides whether null is permitted |
| Present empty string | Explicit zero-length string | Include `""` | Never trim or remove | Schema/extension semantics decide validity |
| Present `false` | Explicit Boolean false | Include `false` | Never treat as absent | Schema/extension semantics decide validity |
| Present `0` | Explicit numeric zero | Include `0` | Never treat as absent | Numeric field semantics remain owning schema's job |
| Present empty array | Explicit ordered empty collection | Include `[]` | Never replace with absence/default | H-13 decides extension collection participation |
| Present empty object | Explicit object with no members | Include `{}` | Never replace with absence/default | H-13 decides object openness/meaning |
| Default absent but implementation supplies one | No committed value was present | Do not include default; implementation behavior cannot alter input | Forbidden | Future schema may require producer to materialize before commitment |
| Unknown optional field | Meaning not established for this profile/release | Reject if the object is closed; otherwise follow the H-13 participation declaration | Never silently strip | H-13 owns openness and participation |
| Unknown required extension | Required meaning unsupported | Fail as unsupported required extension before crypto acceptance | Never ignore/default | H-13 owns requiredness/evolution |
| Known optional extension | Registered optional semantic value | Include exactly when present if declared participating; absence remains absence | Never synthesize | H-13 owns participation and forwarding |
| Explicit extension object | Namespaced extension container | Canonicalize every participating member recursively | Never flatten, relocate, or strip | H-13 owns namespace, openness, forwarding, evolution |

Default rule: cryptographic input contains only values explicitly present in the
registered semantic projection. No verifier inserts a schema, language,
database, environment, current-release, or deployment default. If future
governance wants a defaulted semantic value covered, the producer must first
materialize it as an explicit field under that new/updated semantic contract.

## Numeric interoperability matrix

The canonical spellings below assume the approved profile and a field whose
future semantic contract permits that numeric category. “String downstream”
means a future schema would need a bounded decimal string; this decision does
not create one.

| Input/category | Accepted semantic value? | JSON number? / canonical representation | Future schema / legacy / cross-language note |
| --- | --- | --- | --- |
| `0` | Yes | Yes; `0` | Portable |
| `-0`, `-0.0`, `-0e0` | No | Rejected; never output | Legacy JS may have stored `0`; original distinction may be unknowable |
| `1`, `-1` | Yes | Yes; `1`, `-1` | Portable |
| `1.0`, `1e0`, `1E+0` | Yes, same binary64 value | Yes; all canonicalize to `1` | Original lexical form is not semantic evidence |
| `0.000001` | Yes if fractional field allowed | Yes; `0.000001` | JCS fixed/exponent threshold must be reproduced |
| Very small, e.g. `1e-7` | Yes if finite and field permits | Yes; `1e-7` | Language formatter must match JCS exactly |
| Very large finite exponent, e.g. `1e30` | Yes only if field permits binary64 | Yes; `1e+30` | Precision/units must be semantically acceptable; otherwise reject |
| Overflow such as `1e400` | No | Rejected as non-finite | Never map to infinity |
| `2^53 - 1` (`9007199254740991`) | Yes | Yes; same decimal | Maximum portable integer |
| `2^53` (`9007199254740992`) | No as an integer | Rejected despite exact binary64 representation | String downstream if a future field needs it |
| `2^53 + 1` (`9007199254740993`) | No | Reject from token before rounding | Critical JS/non-JS disagreement risk |
| Signed 64-bit minimum/maximum | No as JSON numbers | Rejected outside safe range | Bounded signed decimal string downstream if needed; legacy evidence needs original profile |
| Unsigned 64-bit maximum | No as JSON number | Rejected | Bounded unsigned decimal string downstream if needed |
| Existing Ghost Bridge timestamps | Yes as their existing exact strings when owning semantics validate them | Not a JSON number; string bytes preserved | H-12/H-14 choose time syntax/bounds where retained; H-10 does not parse into numbers |
| Numeric epoch within safe integer | Only if a future owning schema explicitly selects it | JSON integer and JCS decimal | Do not infer from a timestamp string |
| Fractional timestamp | Not in baseline absent a future explicit contract | Rejected for timestamp fields | Prefer a future exact string representation; downstream schema decision required |
| NaN, `Infinity`, `-Infinity` | No | Not eligible JSON; rejected | Some runtime APIs admit them, so precheck is mandatory |

## Approved H-10 verification model

The verifier performs these steps in order and fails closed. A failure may be
recorded precisely internally, but H-12 alone maps it to public identifiers,
status codes, ordering disclosure, and retry transport.

1. Bound bytes/resource limits and identify the expected object/proof purpose
   from the operation and accepted historical context, never from an untrusted
   proof alone.
2. Strictly decode transport/container syntax as H-12 later specifies; reject
   malformed textual base64url before cryptographic work.
3. Strictly decode JSON/semantic input: UTF-8, BOM, duplicate, Unicode, object,
   depth/size, number, and prohibited-type checks.
4. Validate the profile/domain identifiers syntactically and require their exact
   expected values. Classify unknown canonicalization, digest, signature, and
   proof profiles separately; do not fall back.
5. Resolve the original selected release/profile and semantic projection. Reject
   wrong release/profile, missing required context, and unknown required
   extensions before treating a proof as valid.
6. Reconstruct the exact semantic envelope and canonical bytes. A
   noncanonicalizable input is distinct from malformed transport JSON.
7. Rebuild the exact frame and, for a commitment, decode and constant-time
   compare the digest bytes. A digest mismatch stops processing.
8. For a proof, require exact proof purpose, audience/target, object identity,
   tenant/scope, release/profile, key ID, key thumbprint, and key-purpose
   bindings before signature verification.
9. Resolve a trusted exact key record. Distinguish unknown key ID, substituted
   thumbprint, wrong key purpose, currently unavailable key service, and missing
   historical key evidence. Do not fetch from untrusted proof-supplied URLs.
10. Decode exactly 64 signature octets and verify Ed25519 over the exact frame.
    Distinguish malformed signature encoding from a well-formed invalid
    signature.
11. Apply proof issuance/expiry/nonce/replay freshness and H-11 current or
    historical key/revocation/compromise evidence. H-10 requires these protected
    semantic inputs but does not define H-11 history mechanics.
12. Recheck semantic consistency with the authoritative object: Connection,
    Task, Result, output/effect commitments, Passport, manifest, or chain as
    applicable.
13. Run current authentication, Connection lifecycle, Trust, authorization,
    deployment policy, Approval, deadline, replay/idempotency, and operation
    checks required by H-01 through H-09. Cryptographic validity is not
    authorization.
14. Only the full governing operation may succeed. A proof that is valid but
    unauthorized, stale, revoked/compromised, or historically indeterminate
    remains a non-success with its distinct internal semantic category.

Semantic failure classes must at least distinguish: malformed JSON/object;
noncanonicalizable input; unsupported canonicalization/digest/signature/proof
profile; invalid profile identifier; unknown key; wrong key/proof purpose;
wrong audience/target; wrong release/profile; wrong tenant/scope; digest
mismatch; malformed signature; invalid signature; current key unavailable;
historical key unavailable; revoked/compromised key; stale proof; valid but
unauthorized proof; and cryptographically valid but historically indeterminate
proof. This record assigns no HTTP status and no revocation-history algorithm.

## Migration and historical-object classification

| Class | Evidence condition | Approved H-10 treatment |
| --- | --- | --- |
| A | Original bytes and exact original profile are fully known | Verify only under that immutable profile/release; retain bytes and result; do not relabel unless it was already the future approved profile |
| B | Legacy digest exists but canonicalization profile is absent | Preserve value as an historical claim; do not recompute or use as H-10 equality proof; new governed evidence may reference the legacy claim and a new explicit commitment |
| C | Signature exists but signed bytes/projection are ambiguous | Preserve proof; report historical verification indeterminate/legacy-ambiguous; never try multiple serializations until one passes |
| D | Current code can recompute a value but the production algorithm used cannot be proven | Current equality is implementation evidence only; preserve provenance and classify as unknown original profile |
| E | Key-purpose or proof-purpose binding is missing | Even if mathematical signature verifies, classify as legacy purpose-ambiguous; do not upgrade or authorize a new context |
| F | Signature verifies only with implementation-specific serialization | Verify, if policy permits, only as that explicitly identified legacy implementation profile; never claim cross-language/H-10 conformance |
| G | Object is created under a later human-approved H-10 profile | Store exact release/profile/domain/context and evidence needed for deterministic current/historical verification; it may claim that approved profile only |

These rules preserve H-03: never invent original bytes, silently re-sign
history, label a legacy object H-10 conformant without evidence, or let current
verification rewrite historical meaning. Where migration is necessary, it
creates new explicitly governed evidence that references the unchanged old
object and states provenance; it does not alter, backfill, or alias the old
digest/signature. H-11 decides historical key/revocation evidence and H-14
decides support windows.

## Compatibility impact of accepted H-10

- Core unprefixed insertion-order digests and Trust `sha256-` digests would both
  remain legacy; neither would be silently reinterpreted as the approved Option B
  43-character value.
- Current generic `ghostbridge-proof/0.1-draft` JWS proofs would remain
  experimental legacy and would not alias purpose-specific proof profiles.
- Existing schemas lack required profile/domain/context fields; D2-01/H-13 work
  would be needed under separate authorization.
- Current Node-only tests would remain regression evidence, not the profile
  oracle. Static D2-03 vectors would be required later.
- Implementations would need strict token-aware JSON parsing, JCS number output,
  exact framing, strict base64url, single-purpose keys, and historical profile
  dispatch. That is an intentional compatibility cost.
- Rolling upgrades could not enable the successor profile until both peers
  explicitly select it under H-03/H-04/H-05 and preserve old verification where
  H-14 requires it. No fallback bridge is permitted.
- Product-only HMACs/cache fingerprints could continue for local purposes only
  when clearly namespaced and never compared with protocol commitments.

## Security and threat analysis

| Threat | Attack or failure | Approved H-10 mitigation | Residual risk / downstream owner |
| --- | --- | --- | --- |
| Serialization ambiguity | Same semantics produce different bytes | One strict eligible model and JCS bytes | Implementation bugs; D2-03/P1-03 evidence |
| Duplicate-key attack | Parser and verifier select different values | Reject decoded duplicate names before object construction | Parser bugs; H-13/D2 malicious cases |
| Unicode confusion | Visually similar strings substitute identity | Preserve exact scalars; exact comparison; display is non-authoritative | Homoglyph UI risk; H-12/H-14 presentation |
| Normalization mismatch | One stack normalizes and another does not | Explicitly no normalization | Producers may normalize before semantic construction; conformance evidence |
| Lone surrogate/malformed UTF-8 | Replacement changes signed text | Strict rejection; no repair | Runtime string APIs can hide origin; implementation review |
| Numeric precision loss | Large integer rounds to another authority value | Token-aware safe-integer rejection | Future decimal-string schemas; H-13/D2-01 |
| Negative-zero mismatch | `-0` becomes `0` | Reject all negative-zero inputs | Legacy distinction may be unknowable |
| Exponent/float disagreement | Libraries emit different shortest forms | Exact JCS binary64 serialization and vectors | Formatter defects; independent gate |
| Field omission/default injection | Verifier adds a value signer did not cover | Absence distinct; no default materialization | Semantic projection errors; H-13/D2-01 |
| Unknown-field stripping | New security field is discarded | H-13 participation plus exact covered projection; required unknown fails | H-13 decision remains open |
| Extension stripping | Intermediary removes a covered extension | Participating extension is inside canonical envelope | Extension semantics/evolution; H-13 |
| Algorithm confusion | Key/profile interpreted under another algorithm | Complete immutable profile ID; no inference/fallback | Successor governance error; H-10/H-14 |
| Profile confusion | Similar ID or partial negotiation changes rules | Case-sensitive exact ID, aliases forbidden, profile bound in consent/Connection/frame | Registry administration; H-03/H-14 |
| Key-purpose confusion | One key verifies multiple authority domains | Signed key purpose plus trusted metadata; baseline single-purpose key material | Key provisioning mistakes; H-11/H-14 |
| Proof-purpose confusion | Generic valid proof reused elsewhere | Purpose in envelope plus distinct frame domain | Registry mistake; H-10 review |
| Cross-object substitution | Receipt proof reused as Passport/Approval proof | Object-specific signature domains and context | Misregistered object type; D2-03/P1-03 |
| Cross-release substitution | Old proof applied to current semantics | Exact immutable release/profile covered | Missing history; H-11/H-14 |
| Cross-tenant substitution | Valid object moved to another org/workspace | Exact org and tagged workspace covered | Incorrect semantic projection; H-07/H-13 |
| Chosen-prefix/domain design mistake | Unrelated purposes share a preimage space | Fixed magic/version, immutable distinct labels, full profile, lengths | SHA-256/profile design review; P1-03 |
| Ambiguous concatenation | Variable strings parse two ways | Big-endian explicit lengths and no extra separators | Length parser defects; D2-03 |
| Digest encoding confusion | Hex/base64 variants compare as text | Strict 32-byte decode and one 43-character encoding | Legacy adapters; migration controls |
| Base64/base64url confusion | `+`, `/`, padding, whitespace accepted | Strict alphabet, no padding, canonical re-encode | Library permissiveness; wrapper tests |
| Noncanonical signature text | Multiple strings encode one signature | Exact 86 characters, unused-bit and re-encode checks | Library API bypass; implementation review |
| Ed25519 encoding/malleability | Malformed point/scalar accepted differently | Fixed length and strict maintained RFC 8032 verifier | Library vulnerability; H-14 support/P1-03 |
| Key substitution | Same `kid` resolves to changed material | Cover `kid` and RFC 7638 thumbprint; trusted immutable history | Resolver compromise; H-11 |
| Downgrade/fallback | Attacker forces legacy/weaker profile | Selected full profile bound everywhere; no trial or fallback | Availability loss when profile unavailable; H-14 |
| Legacy ambiguity | Current helper verifies uncertain history | Migration classes; never invent bytes/purpose | Historical status may remain indeterminate; H-11/H-14 |
| Signer/verifier library disagreement | Same value formats differently | Independent byte/digest/signature reproduction | Common upstream bug; diversify stacks/libraries |
| Intermediary reserialization | Proxy changes JSON spelling/order | Sign canonical semantic envelope, not raw transport spelling | Semantic transformation still fails equality; H-12 |
| Signing mutable transport bytes | Headers/path change in transit | Object proof uses semantic frame; request target projection explicitly selected | Exact HTTP component meaning remains H-12 |
| Crypto treated as authorization | Valid proof bypasses current gates | Required final H-01–H-09 authority checks after crypto | Caller integration bug; D2/P1 security review |
| Sensitive-input logging | Canonical payload exposes credentials/private data | H-05 input exclusion; no raw input in public errors/logs/vectors | Debug/operator leakage; H-12/H-14 |
| Pathological canonicalization DoS | Deep/large keys/numbers exhaust resources | Pre-parse byte/depth/member/string/number bounds tied to profile/release | Exact numeric bounds remain future normative/H-14 evidence |
| Self-reference | Proof/digest included in its own input | Affirmative per-row projections and exact carrier exclusion | Schema/projection mistakes; H-13/D2-01 |
| Revocation/checkpoint substitution | Valid chain digest interpreted with wrong history policy | Separate snapshot/checkpoint domains and original profile | Sequence/freshness/rollback remains H-11 |
| Receipt proof outage | Signer failure triggers execution retry | H-09 immutable snapshot; proof retry only | Evidence availability; H-11/H-14 |

## Independent reproduction evidence reviewed before human approval

The independent reproduction gate was performed and reviewed before Rudra's
approval.

- RUN 1: **FAILED** because Go was unavailable.
- RUN 2: **PASSED** with independent JavaScript, Python, and Go producers and
  verifiers.
- Review cases: **145**.

RUN 2 used these exact environments:

| Stack | Runtime / library |
| --- | --- |
| JavaScript | Node.js `v22.18.0`; OpenSSL `3.0.16`; built-in `node:crypto` |
| Python | Python `3.14.2`; `cryptography 46.0.3` |
| Go | `go version go1.26.5 windows/amd64`; standard-library `crypto/ed25519` |

The three stacks produced these exact common values:

- SHA-256 digest base64url:
  `L7eDA9bTsddS8sQRbxHONRQRNjGYPSrA7fTWB1Owxrk`
- RFC 7638 JWK thumbprint:
  `kPrK_qmxVWaYVA9wwBF6Iuo3vVzz7TxHCTwXBygrS4k`
- Deterministic Ed25519 signature base64url:
  `pdEp2A7eIz9VXg3mf4UK0YGKmHY27FOHMpMkO5m7KgxFIIFjloP31Ip2k5VSyUx-EKxTBZy6Q2edeSzqCgsDCw`

JavaScript passed, Python passed, and Go passed. Canonical bytes, GBCF
frames, SHA-256 results, JWK thumbprints, and deterministic Ed25519 signatures
agreed exactly. All nine cells in the 3x3 producer/verifier matrix passed. The
required parser, Unicode, numeric, base64url, domain, signed-context,
substitution, legacy non-alias, and no-fallback/profile checks passed. No
producer discrepancy remained.

The reviewed RUN 2 evidence files are bound by these SHA-256 values:

| RUN 2 file | SHA-256 |
| --- | --- |
| `report.md` | `9733dbc2b044c6f79346c725226a799fd90807ede2338e71bd2be72735653b95` |
| `comparison.json` | `a848e1ba0263343e059adfaa22d892895ba08a2c5091aa640876317aeaa42180` |
| `cases.json` | `6de005105b1d5a2b8fa97745c3d23de061ef026f68243980ef48ec169260f063` |
| `javascript/output.json` | `de36a29d0d6c111b68d781e208bd4646b6d18e20633c759983c577a8f61ea0e4` |
| `python/output.json` | `c308ed26d28309c9301bbd699df975b115b3d4ed2ef89f9d6956d190e3771f52` |
| `go/output.json` | `4d63f052578532d0f71b76ec90c1ed585be6bdc51a460b5564a224a3fd5e29b6` |

The RUN 2 package is governance review evidence only. It does not automatically
become a normative `D2-03` vector corpus, a `P1-01` conformance asset,
implementation, migration authority, or release evidence sufficient by itself.
Creating, publishing, or adopting normative or executable assets remains
separately authorized.

## Human approval checklist

- [x] Select Option A, B, C, D, or a fully specified qualified alternative.
- [x] Approve the exact canonicalization profile and identifier.
- [x] Approve input-object eligibility and strict parsing prerequisites.
- [x] Approve UTF-8 generation and malformed-input rules.
- [x] Approve the BOM prohibition.
- [x] Approve duplicate-name rejection after escape decoding.
- [x] Approve Unicode scalar/noncharacter eligibility.
- [x] Approve the no-normalization rule.
- [x] Approve object-key ordering and array-order preservation.
- [x] Approve literal and string-escaping rules.
- [x] Approve the binary64 and safe-integer numeric policy.
- [x] Approve the negative-zero rejection policy.
- [x] Approve timestamp and future large-integer boundaries.
- [x] Approve null, absence, empty-value, and default rules.
- [x] Approve the extension-coverage boundary with H-13.
- [x] Approve cryptographic-field exclusion and self-reference rules.
- [x] Approve the exact digest semantic input and canonical bytes.
- [x] Approve SHA-256 as the baseline digest algorithm.
- [x] Approve strict unpadded base64url digest encoding.
- [x] Approve the exact signature semantic envelope and input frame.
- [x] Approve Ed25519 as the baseline signature algorithm.
- [x] Approve strict unpadded base64url signature encoding.
- [x] Approve public JWK and thumbprint representation boundaries.
- [x] Approve the `GBCF` magic, version, lengths, and framing construction.
- [x] Approve every domain label in the approved H-10 domain registry.
- [x] Approve key-ID and key-thumbprint binding.
- [x] Approve key-purpose binding and single-purpose key-material rule.
- [x] Approve proof-purpose binding.
- [x] Approve audience, target, and semantic-context binding.
- [x] Approve exact protocol release and crypto-profile binding.
- [x] Approve organization and tagged workspace binding where applicable.
- [x] Approve every existing and future row in the field-to-profile registry.
- [x] Approve exact algorithm/profile identifiers and case sensitivity.
- [x] Approve the alias, inference, and no-fallback policy.
- [x] Approve algorithm-agility, successor, and downgrade policy.
- [x] Approve known historical and verification-only profile handling.
- [x] Approve the A–G migration classification.
- [x] Approve verification ordering and semantic failure distinctions.
- [x] Approve the separation between cryptographic validity and authorization.
- [x] Approve privacy boundaries for payloads, errors, logs, and vectors.
- [x] Approve the security/threat analysis and downstream owners.
- [x] Approve the compatibility impact and intentional legacy split.
- [x] Confirm H-01 through H-09 are preserved without reinterpretation.
- [x] Confirm H-11 retains revocation, key lifecycle/history, and rollback mechanics.
- [x] Confirm H-12 retains wire placement, HTTP, public errors, retry, and redaction.
- [x] Confirm H-13 retains openness, unknowns, extensions, and participation semantics.
- [x] Confirm H-14 retains support windows, implementation matrices, external review, residual-risk, and release authority.
- [x] Confirm D2/P1 executable and conformance work remains separately authorized.
- [x] Review independently reproduced Option B bytes, frames, digests, and signatures.
- [x] Confirm at least three independent stacks and two language families agree.
- [x] Confirm cross-producer/verifier and all required negative cases pass.
- [x] Accept all documented residual risks.
- [x] Provide approver identity.
- [x] Provide approval date.
- [x] Provide the approved option/profile bundle.
- [x] Provide every qualification or state that there are none.
- [x] Provide accepted compatibility impact.
- [x] Provide accepted security impact.
- [x] Provide a durable sign-off/reference.

## Human approval

- Approver: Rudra
- Approval date: 2026-08-10
- Approved option: Option B — Versioned JSON-first cryptographic profile registry
- Qualifications: Rudra accepted all qualifications recorded in approved
  Option B and the human approval source.
- Accepted risks: Rudra explicitly accepted the residual risks recorded in this
  H-10 decision and the human approval source.
- Compatibility impact accepted: Rudra accepted the intentional split from
  unqualified legacy Core, Trust, generic JWS, Client/local hash
  representations, together with the restrictions against historical
  reinterpretation.
- Security impact accepted: Rudra accepted the approved canonicalization,
  framing, digest, signature, domain/purpose/context binding, no-fallback,
  fail-closed, and historical-profile security effects while preserving the
  distinction between cryptographic validity and authorization.
- Independent reproduction evidence reviewed: RUN 2 — PASSED; JavaScript,
  Python, and Go; 145 review cases; complete 3x3 cross-verification.
- Sign-off/reference:
  `H-10-human-approval-rudra-2026-08-10.txt`
- Approval-source SHA-256:
  `A96A8765A48F11E33881130ED3C7C3207FDC3A79092BCEDEEB4EDE6491F66D88`
- RUN 2 report SHA-256:
  `9733dbc2b044c6f79346c725226a799fd90807ede2338e71bd2be72735653b95`
- Resulting status: **ACCEPTED**

### Accepted residual risks

Rudra accepted these residual risks at the H-10 protocol-governance decision
level:

1. intentional incompatibility with unqualified current and historical Ghost
   Bridge cryptographic representations, requiring separately governed future
   compatibility and migration work;
2. potentially indeterminate verification of historical evidence whose original
   serialization, purpose, key binding, profile, or provenance is ambiguous;
3. strict JCS/binary64 interoperability requirements that implementations must
   reproduce instead of relying on language defaults;
4. rejection of JSON or runtime values that current implementations may accept;
5. availability loss when fail-closed/no-fallback processing encounters an
   unavailable selected profile, key, or historical verification capability;
6. the need for future governed immutable profiles when baseline algorithms or
   other security-relevant rules are succeeded;
7. downstream domain, field-participation, normative, schema, and implementation
   mistakes that could fail to reproduce the approved semantics;
8. possible common interpretation errors, cryptographic-library defects, or
   future implementation bugs despite the successful three-stack reproduction;
9. privacy and logging sensitivity in canonicalization and signing workflows,
   requiring H-12 redaction and data-minimization controls; and
10. historical verification dependence on H-11 keys, sequence history,
    compromise evidence, original bytes, and other lifecycle evidence.

## Downstream ownership boundaries

### H-11

H-11 owns revocation bootstrap, revocation/checkpoint sequence and chain rules,
freshness/skew, durable highest-sequence storage, rollback recovery, key-rotation
overlap, compromise history, and historical Receipt validity mechanics. H-10
may define bytes, digests, and signatures consumed by those mechanisms but does
not decide their lifecycle/history policy.

### H-12

H-12 owns HTTP resources, routes, methods, statuses, media types, headers,
transport proof placement, TLS/DNS, redirects, streaming, public error
vocabulary, retry headers, public logging/redaction, and transport-abort
semantics. H-10 defines cryptographic semantic inputs but does not choose wire
placement or public failure mapping.

### H-13

H-13 owns object openness, unknown fields and enums, extension namespaces,
required/optional extension semantics, forwarding, and experiment lifecycle.
Once H-13 says a field participates, H-10 canonicalizes and covers it exactly;
H-10 does not decide participation by naming a canonicalizer.

### H-14

H-14 owns concrete algorithm support/deprecation windows, implementation
support matrices, required independent implementation profiles for release,
the external review gate, residual-risk authority, and final Protocol 1.0
graduation. H-10 establishes immutable transition rules but no support date or
release decision.

`D2-01`, `D2-03`, `P1-01`, and `P1-03` schemas, vectors, implementations,
reviews, and conformance work remain separately authorized work.

## Consequences of the accepted H-10 governance decision

Later, separately authorized work may cite H-10 as an accepted governance
decision when writing normative Approval and Trust/Receipt requirements,
defining H-13-approved semantic projections and schemas, creating static
cross-language vectors, implementing purpose-specific framers/digesters/signers
and verifiers, preserving legacy profiles, qualifying migration, or assembling
H-14 release evidence. H-11, H-12, H-13, H-14, D2, and P1 gates remain
required.

H-10 acceptance itself:

- closes no GB gap;
- creates no normative requirement or normative specification text;
- creates no schema;
- creates no normative fixture or vector;
- does not make the RUN 2 package normative;
- creates no executable state machine;
- changes no implementation or deployed behavior;
- authorizes no implementation;
- authorizes no migration;
- authorizes no deployment;
- establishes no conformance;
- authorizes no publication or release; and
- establishes no Protocol 1.0 claim.

## Final status

Acceptance is at the protocol-governance decision level only. It does not
itself authorize normative specification, schemas, normative vectors,
executable state machines, implementation, migration, deployment, conformance,
release, or Protocol 1.0 work.

**H-10 is ACCEPTED.**
