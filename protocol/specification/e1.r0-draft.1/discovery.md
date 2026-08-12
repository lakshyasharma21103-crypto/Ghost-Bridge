# Discovery

This chapter defines discovery semantics for `ghostbridge/e1.r0-draft.1`.
Discovery identifies candidate material before Connection creation; it is not an
authority, Trust, authentication, transport, or lifecycle session. Exact wire
fields and the complete HTTP binding remain later D1-07 and D2 work.

## REQ-DISC-0001 - Public observation without authority

**Requirement.** Discovery MUST be a public pre-Connection observation
operation. A successful or fresh discovery response, a cache entry, and every
endpoint, Passport reference, capability reference, profile, feature, release,
extension, or experiment it advertises MUST remain candidate metadata only.
Discovery MUST NOT create or initialize a server-side authority session, select
a Connection release, establish Trust or authentication, create a Connection,
authorize an Invocation, or transfer authority between participants. A Client
SHOULD use discovery when the target is not already known; a trusted out-of-band
resolver MAY instead identify the target, and discovery MUST NOT be treated as a
universal first-request authority gate.

**Applies to.** The bootstrap discovery operation and every discovery
advertisement or cached copy.

**Lifecycle/state impact.** None: observation MUST create no protocol authority
or server-side lifecycle state.

**Semantic failure.** Any implementation that treats discovery as an authority
or initialization event MUST fail closed and MUST NOT proceed on that purported
authority.

**Sources:** H-01, H-12. **Gaps:** GB-004.

## REQ-DISC-0002 - Bootstrap operation boundary

**Requirement.** The bootstrap discovery operation MUST have the semantic HTTP
identity `GET /.well-known/ghostbridge`. It MUST identify candidate release
metadata for the exact authenticated-configured origin being observed and MUST
remain release-neutral until exact release records are evaluated under
REQ-VERS-0014. It MUST NOT be aliased, redirected into another release or
origin, or interpreted as a release-specific governed operation. The exact
media type, HTTP status behavior, TLS and DNS processing, canonical request
target, redirect handling, size and time limits, caching headers, and other
transport behavior MUST follow the D1-07 H-12 binding and are not redefined by
this chapter.

**Applies to.** The bootstrap discovery request and response class.

**Lifecycle/state impact.** None: the request is a safe reread and its response
is non-authoritative.

**Semantic failure.** A response obtained through a mismatched operation,
origin, redirect continuation, or release alias is unusable discovery metadata;
the precise public transport error remains D1-07-owned.

**Sources:** H-01, H-03, H-12. **Gaps:** GB-004, GB-005.

## REQ-DISC-0003 - Release-valid semantic content

**Requirement.** For every advertised exact protocol release, discovery MUST
convey or reference all information that the release requires for deterministic
candidate evaluation. As applicable to that release, this information MUST
include:

- the exact protocol release record and its current deployment availability;
- the immutable release, specification, schema-bundle, compatibility, and
  applicable registry artifact identities and integrity references;
- the Agent identity and Passport identity or immutable Passport reference;
- release-scoped Core facet, profile, global-feature, exact capability and
  capability-version declarations;
- exact authentication-profile identifiers;
- extension declarations and experimental-feature advertisements;
- release-defined resource or reference information;
- release-defined validity and freshness information; and
- release-defined evidence needed to bind and revalidate a later preview,
  consent envelope, and redemption result.

This semantic inventory MUST NOT be interpreted as final JSON member names or a
schema shape. Artifact and evidence identities that H-03, H-04, or H-10 requires
to be immutable, including applicable release, specification, schema-bundle,
compatibility, registry, Passport/capability, and final selected-evidence
bindings, MUST be immutable and historically resolvable. A mutable `latest` or
`current` pointer, package version, deployment lookup, current network locator,
or bare mutable URL MUST NOT satisfy such an immutable artifact or evidence
requirement.

A current network or resource locator observed through discovery MAY change for
a future installation attempt and need not itself be an immutable historical
artifact. It MUST remain untrusted candidate data governed by REQ-DISC-0006,
REQ-DISC-0007, REQ-DISC-0009, and D1-07. It MUST NOT create authority, rewrite
an existing Connection, or substitute for required immutable evidence. When
current discovery state contributes to final selection, the selection and
eventual Connection MUST retain or immutably reference the applicable release-
defined snapshot or evidence identity, integrity reference, future H-10 digest
slot, and freshness context needed to reproduce that contribution without
inventing final schema fields or canonical bytes.

**Applies to.** Each release record, immutable artifact/evidence reference, and
current network/resource locator in a discovery advertisement.

**Lifecycle/state impact.** None at discovery; the material is candidate input
for later preview and redemption validation.

**Semantic failure.** Missing release-required information, an unresolvable
required immutable artifact/evidence reference, or an identity or integrity
mismatch makes that exact release record non-selectable; malformed containing
metadata is invalid where the release cannot isolate the record safely. An
unavailable, stale, or changed current locator instead remains unusable until
the applicable safe refresh and H-12 validation succeeds and MUST NOT be treated
as immutable evidence.

**Sources:** H-01, H-03, H-04, H-10, H-13. **Gaps:** GB-004, GB-005, GB-006,
GB-042.

## REQ-DISC-0004 - Source ownership and monotonic ceilings

**Requirement.** The exact release's immutable registry or manifest MUST
determine which semantic dimensions each source is required or permitted to
carry. Passport or its immutable capability manifest MUST define the identity-
authorized maximum ceiling only for the dimensions assigned to it, including as
release-defined Agent identity, exact capability keys and versions,
profile/facet claims, extension claims, authentication identifiers, immutable
capability-contract references, and declared authority and safety restrictions.
Discovery MUST define current deployment availability for the dimensions the
release assigns to discovery. A Connection Offer or Install Grant MUST provide
the transaction-specific subset and restrictions for the dimensions the release
assigns to it and MUST narrow only eligible verified claims. Host metadata MUST
supply only requirements, interests, explicit selections where required, and
preferences among already eligible choices. Human consent MUST define the
immutable permitted subset, and deployment policy MAY deny or narrow only.

Only semantically overlapping claims MUST be intersected. A source MUST NOT be
treated as denying a dimension that the release does not require or permit that
source to carry. Passport/manifest absence therefore MUST NOT prohibit a
protocol-release advertisement, a discovery-owned global deployment feature,
an experiment, or another dimension unless the release assigns that dimension
to Passport/manifest or makes it an overlapping claim. Where Passport/manifest
is the registered ceiling for a dimension, discovery MUST NOT widen it. For
every source, absence of a required declaration MUST make that source's metadata
invalid; absence of an optional declaration MUST mean no claim; explicit false,
unsupported, disabled, excluded, or limited meaning MUST narrow; and an omitted
value MUST NOT acquire an implementation default. Current deployment
availability MUST NOT itself grant authority.

**Applies to.** The release-scoped source-ownership registry and every Passport/
manifest, discovery, Connection Offer, Install Grant, Host, consent, or policy
claim for a dimension it is required or permitted to carry.

**Lifecycle/state impact.** Candidate eligibility may narrow before Connection
creation; discovery itself changes no state.

**Semantic failure.** Required absence makes the applicable source invalid.
Where claims semantically overlap, a discovery claim exceeding its registered
Passport/manifest ceiling is invalid metadata for the affected release; a
shared identity, profile-invariant, authentication, extension, tenant, consent,
or security contradiction MUST fail the containing candidate rather than be
treated as a limitation. Absence from a source that does not own the dimension
MUST NOT create a failure or denial.

**Sources:** H-01, H-04, H-07. **Gaps:** GB-004, GB-006.

## REQ-DISC-0005 - Canonical release-record set

**Requirement.** A discovery advertisement's supported-release records MUST
form a set of unique exact H-03 release identities. Array order, object-member
order, locale collation, implementation enumeration order, and transport
arrival order MUST have no semantic effect. Duplicate exact identities,
multiple records that conflict for one exact release, a non-canonical release
identity, or conflicting immutable artifact references MUST NOT be silently
deduplicated, merged, or resolved by first-wins or last-wins behavior.
Information scoped to one exact release MUST NOT supply evidence for another
release.

**Applies to.** The release-record collection and all release-scoped discovery
declarations.

**Lifecycle/state impact.** None; validation only determines whether metadata
may enter later candidate processing.

**Semantic failure.** Any duplicate, conflict, or non-canonical identity makes
the containing discovery metadata invalid.

**Sources:** H-03, H-04. **Gaps:** GB-004, GB-005, GB-006.

## REQ-DISC-0006 - Cache identity, freshness, and revalidation

**Requirement.** A cached discovery advertisement MAY be used only as a
non-authoritative optimization. The cache entry MUST retain the exact bootstrap
origin, request context, response release identities, immutable artifact
references, and the freshness and validity evidence supplied by the applicable
release. A cache key MUST NOT merge different origins, releases, resources, or
governed representation dimensions. Transport cache freshness MUST NOT be
treated as Trust freshness, release eligibility, proof validity, deployment
availability, or authority. Stale, expired, revalidation-failed, or
context-mismatched discovery MUST NOT make an item currently eligible. Discovery
used for preview or redemption MUST satisfy every applicable release validity
rule and MUST be reread or revalidated at the controlling boundary required by
H-01 and D1-07. This chapter MUST NOT create or alter H-11 Trust-cache or
anti-rollback rules.

**Applies to.** Client, intermediary, or deployment caches of bootstrap
discovery and release metadata.

**Lifecycle/state impact.** None: cache use changes observation performance
only and cannot advance installation or Connection state.

**Semantic failure.** A stale, expired, unbound, or unverifiable cache entry is
non-selectable; required freshness failure at preview or redemption makes the
affected candidate incompatible.

**Sources:** H-01, H-03, H-04, H-11, H-12. **Gaps:** GB-004, GB-005, GB-006.

## REQ-DISC-0007 - Refresh before authority commit

**Requirement.** A safe reread MAY replace candidate discovery metadata for a
future installation attempt before final consent. Material discovery meaning
that changes after an advisory preview or after the final preview/consent
envelope is formed MUST NOT be silently substituted. If the change affects the
Agent or Passport identity, exact release, artifacts, authentication profile,
tenant or Host binding, profile/facet, capability, restriction, extension,
experiment, omission, limit, or other consented meaning, the installation flow
MUST obtain the applicable new preview and new human consent before Install
Grant consumption. Redemption MUST revalidate the exact discovery or Offer
evidence and MUST select only a result inside the immutable consent envelope.

**Applies to.** Discovery refreshes used by installation preview, consent, and
Install Grant redemption.

**Lifecycle/state impact.** Candidate metadata may be replaced before consent;
a material post-preview change returns the attempt to the accepted preview and
consent path and creates no authority.

**Semantic failure.** A material unconsented change makes the attempted
selection incompatible and MUST fail before the H-06 authority commit.

**Sources:** H-01, H-03, H-04, H-06, H-10. **Gaps:** GB-004, GB-005, GB-006.

## REQ-DISC-0008 - No active-Connection rediscovery

**Requirement.** Rediscovery, cache refresh, package or deployment upgrade,
registry change, support-metadata change, or new default MUST NOT renegotiate,
widen, narrow, migrate, relabel, or reinterpret an active or historical
Connection. Every Connection MUST remain bound to its exact committed release
and negotiated allowed set across restart. A material change intended for
future governed use MUST follow the H-07 new or replacement Connection path,
including a new preview and consent where required. Current policy, Trust,
authentication, revocation, and support action MAY narrow or deny use only as
their owning decisions permit; they MUST NOT mutate the stored negotiation
meaning.

**Applies to.** Active, suspended, terminal, replacement, and historical
Connection records when discovery or deployment state changes.

**Lifecycle/state impact.** No discovery-driven Connection transition is
permitted; only an owning H-07/H-11/H-14 rule may cause its accepted state
effect.

**Semantic failure.** A mismatch between fresh discovery and a committed
Connection is not renegotiation input; an operation attempting to use changed
meaning MUST fail against the stored Connection or use the replacement path.

**Sources:** H-01, H-03, H-04, H-07, H-11, H-14. **Gaps:** GB-004, GB-005,
GB-006, GB-044.

## REQ-DISC-0009 - Origin and endpoint safety

**Requirement.** Every URL, origin, host, port, endpoint, resource reference,
or alternative target obtained from discovery MUST be treated as untrusted
candidate data. It MUST NOT establish or change an authenticated-configured
origin, move an existing Connection to another origin, authorize credential or
secret forwarding, create cross-origin Trust or authority, permit private/on-
prem reachability, bypass H-12 TLS, DNS, address, proxy, redirect, or request-
target rules, or silently alias a release. HTTP success, cache validation, same
certificate, same DNS result, or apparent same-operator ownership MUST NOT make
a candidate authoritative.

A newly accepted Agent operational target or origin MUST enter the normal new
pre-Connection target binding, H-12 validation, preview and consent, and
Connection process; D1-07 owns the complete network procedure. An issuer-
metadata, key-history, revocation, or other Trust-resource origin MUST instead
follow its separately accepted H-11/H-12 bootstrap, disclosure, freshness,
anti-rollback, and network rules and MUST NOT be described as requiring an Agent
Connection merely because it differs from the Agent origin. Neither category
MAY forward credentials across origins, create cross-origin authority, follow a
redirect as fallback, or move an existing Connection.

**Applies to.** Discovery-provided Agent operational targets, separately
governed Trust-resource origins, other network/resource references, and every
consumer that might dereference them.

**Lifecycle/state impact.** None for an existing Connection. A distinct Agent
origin can begin only a new pre-Connection candidate flow; a distinct Trust-
resource origin remains in its H-11/H-12 evidence flow and creates no Agent
Connection state.

**Semantic failure.** Cross-origin authority movement, category confusion,
unsafe target provenance, or a failed applicable H-11/H-12 origin check makes
the target or evidence source unusable and MUST NOT trigger a weaker-origin,
redirect, credential-forwarding, Connection, or release fallback.

**Sources:** H-01, H-05, H-07, H-11, H-12. **Gaps:** GB-004, GB-045.

## REQ-DISC-0010 - Discovery openness

**Requirement.** The Discovery Core member set MUST be closed for the exact
release. Discovery MAY expose only its one release-registered advertised-
extension declaration point; arbitrary unknown members mixed into Core MUST
reject the advertisement. An unknown optional extension, profile, or feature
advertisement MAY be preserved opaquely only where the release registry permits
it, within the same bounded public origin and owning discovery context, and
without selection, semantic use, Trust, credential movement, or authority. An
unknown or unsupported required declaration MUST make the applicable candidate
incompatible. A Core discriminator or other Core value whose unknown class
requires rejection MUST NOT be converted into an opaque advertisement.

**Applies to.** Discovery Core, advertised-extension declarations, and
forwarding-only discovery intermediaries.

**Lifecycle/state impact.** None; optional opaque preservation is read-only and
non-authoritative.

**Semantic failure.** Unknown Core data makes the advertisement invalid;
unknown required extension/profile/feature data makes the applicable candidate
incompatible; allowed unknown optional advertisement is preserved or omitted as
the registry requires and remains non-selectable.

**Sources:** H-01, H-04, H-13. **Gaps:** GB-004, GB-042, GB-045.

## REQ-DISC-0011 - Discovery failure classification

**Requirement.** Discovery consumers MUST apply the following semantic outcomes
without inventing an H-12 public error identity or HTTP mapping:

| Condition | Required semantic outcome |
| --- | --- |
| Malformed advertisement or unknown Core member | Containing discovery metadata is invalid and unusable |
| Duplicate or conflicting exact release record | Containing discovery metadata is invalid; no first/last-wins repair |
| Missing or unverifiable release-required information | Affected release is non-selectable; containing metadata is invalid when safe isolation is not release-defined |
| Stale, expired, or context-mismatched metadata | Affected candidate is not currently eligible and must be safely reread/revalidated |
| Unknown optional advertisement at a permitted extension point | Preserve or omit exactly as the registry permits; never select, interpret, or authorize it |
| Unknown or unsupported required declaration | Affected candidate is incompatible; no downgrade or nearby-release fallback |
| Discovery claim exceeding an applicable registered Passport/manifest ceiling on a semantically overlapping dimension | Affected release metadata is contradictory and invalid |
| Cross-origin or otherwise unsafe candidate target | Candidate is unusable; no redirect continuation or credential forwarding |
| Material change after preview or consent | Existing attempt is non-selectable until the applicable new preview and consent path completes |
| Change after Connection activation | Existing Connection remains unchanged; use of changed semantics requires the accepted new/replacement path |

The failure outcome MUST occur before discovery contributes to final redemption
validation and MUST NOT itself create, consume, or transition a Connection,
Install Grant, Approval, Task, or other authority object.

**Applies to.** Discovery validation and every later boundary that consumes
discovery evidence.

**Lifecycle/state impact.** Invalid or incompatible candidates are excluded
before authority commit; otherwise none.

**Semantic failure.** The table is exhaustive for the listed discovery
conditions; implementations MUST NOT convert an invalid or required failure
into a success-with-limitations outcome.

**Sources:** H-01, H-03, H-04, H-06, H-12, H-13. **Gaps:** GB-004, GB-005,
GB-006, GB-042, GB-045.

## Non-normative D2 traceability

Later D2 work is expected to derive discovery schemas plus origin, cache,
freshness, refresh, mutation, downgrade, duplicate, contradiction, and unknown-
advertisement cases from these requirements. This chapter creates none of those
assets and closes no `GB-*` gap.
