# Compatibility

This chapter defines protocol compatibility independently of release ordering,
support policy, schema evolution, migration, and package versions. It does not
create a cross-release fallback algorithm.

## REQ-COMP-0001 - Sole protocol compatibility identity

**Requirement.** The exact H-03 protocol release identity MUST be the sole
identity on which protocol compatibility declarations operate. Schema-bundle,
individual-schema, profile/facet, authentication-profile, capability,
extension, experiment, package, SDK, implementation, deployment, product
channel, and support-state versions MUST NOT independently imply protocol
compatibility. A shared epoch, adjacent revision, equal stage, chronological
order, common package, common codebase, common operator, or current deployment
behavior MUST NOT establish compatibility.

**Applies to.** Release manifests, compatibility declarations, negotiation
inputs, implementation claims, and historical readers.

**Lifecycle/state impact.** None; compatibility is candidate eligibility
evidence and grants no authority.

**Semantic failure.** Compatibility inferred from any other identity or
proximity is unsupported and MUST make the affected candidate non-selectable.

**Sources:** H-03, H-13, H-14. **Gaps:** GB-005, GB-043, GB-044, GB-045.

## REQ-COMP-0002 - Exact directed immutable edges

**Requirement.** Every compatibility declaration MUST identify one exact source
release, one exact target release, the applicable communication direction and
role/profile scope, its immutable declaration identity and integrity reference,
and the exact evidence and restrictions required by the declaring release. A
declaration from release A toward release B MUST NOT imply compatibility from B
toward A. Compatibility MUST be non-transitive by default: A toward B and B
toward C MUST NOT imply A toward C. An edge MUST NOT be an alias, range,
semantic-version constraint, numeric floor, wildcard, or permission to
substitute either endpoint with a nearby, newer, older, `latest`, or `current`
release.

**Applies to.** Immutable release compatibility declarations and their use by
emitters, receivers, and historical readers.

**Lifecycle/state impact.** None; a satisfied edge may keep an exact bilateral
candidate eligible but does not select or authorize it.

**Semantic failure.** A missing required direction, scope, evidence, identity,
or integrity binding makes the applicable compatibility predicate unsatisfied;
ambiguous or conflicting declarations make the containing release metadata
invalid.

**Sources:** H-03, H-10, H-13. **Gaps:** GB-005, GB-043, GB-044, GB-045.

## REQ-COMP-0003 - Eligibility, not alternate negotiation

**Requirement.** Compatibility evidence MUST be evaluated separately for every
exact release in the bilateral supported-release intersection before H-03
ordering. It MAY establish that an implementation can genuinely emit, accept,
and interpret that exact candidate in the declared direction and scope. It MUST
NOT add a release that either participant did not advertise, substitute one
release for another after selection, translate a request to a different release
base, select a compatibility target instead of the candidate, or create a
second negotiation or retry path. Each participant MUST advertise every exact
release it genuinely supports rather than advertise one release and depend on a
compatibility edge to manufacture another candidate.

**Applies to.** Per-candidate eligibility in REQ-VERS-0014 and every
implementation's supported-release claim.

**Lifecycle/state impact.** Compatibility may remove candidates before
selection; it changes no Connection or governed object state.

**Semantic failure.** Unsatisfied required compatibility removes the exact
candidate. If no candidate remains, the result is incompatible without
cross-release fallback.

**Sources:** H-03, H-04, H-12. **Gaps:** GB-005, GB-044, GB-045.

## REQ-COMP-0004 - Historical and backward interpretation

**Requirement.** A newer implementation that consumes an older-release object
MUST interpret that object using its original exact protocol release,
specification and schema bundle, applicable extension registry and selected
extension identities, H-10 canonicalization/proof profiles, directed
compatibility declarations, and immutable evidence. It MAY do so through a
native historical reader or an explicit directed compatibility edge applicable
to the exact direction. It MUST NOT validate the object only under a current
schema, inject current defaults, backfill fields or extensions, relabel the
release, reuse a current registry, or convert historical validity into current
Connection or Invocation authority.

**Applies to.** Stored and transmitted historical Connections, Invocations,
Approvals, Tasks, Results, Receipts, Trust/revocation evidence, checkpoints,
Passports, manifests, and related durable objects.

**Lifecycle/state impact.** Historical interpretation is read-only and MUST NOT
restore, create, or widen current authority or alter original lifecycle state.

**Semantic failure.** If required original artifacts, identity, integrity, or
meaning cannot be established, the object is unsupported or historically
indeterminate under its owning decision; current semantics MUST NOT be used as a
repair.

**Sources:** H-03, H-07, H-09, H-10, H-11, H-13, H-14. **Gaps:** GB-043,
GB-044.

## REQ-COMP-0005 - Forward-compatibility safe modes

**Requirement.** Release advertisement and candidate formation MUST follow
REQ-VERS-0006: a syntactically valid canonical release advertised by only one
participant and therefore outside the exact bilateral intersection MUST NOT by
itself invalidate negotiation. Every exact intersecting release MUST resolve to
its required trusted immutable release material; an intersecting release whose
required material cannot be resolved MUST be classified as unknown and removed
from candidate eligibility. If no eligible candidate remains, negotiation MUST
be incompatible without fallback.

An actual protocol object or message whose governing release is unknown or
cannot be resolved sufficiently for semantic interpretation MUST NOT be
processed under a current, default, nearby, or otherwise substituted release.
It MUST use only the H-13 historical, preservation, or forwarding mode permitted
for its exact object and role, or semantic use MUST reject or fail closed. An
implementation encountering other newer or unknown material MUST likewise use
only the safe mode assigned by the exact release and per-object openness
registry:

- reject semantic use of an object/message whose governing release cannot be
  resolved, and reject an unknown Core member, required extension, critical
  enum, message, discriminator, or union tag;
- preserve without interpretation only at an explicit extension point and only
  for an object and role that permits preservation;
- locally ignore semantics but preserve the value only for a registered
  optional informational class whose complete omission is H-04-safe;
- forward only where expressly permitted, with lossless representation, intact
  protected content, exact release and owning object/message context, every
  applicable existing tenant, scope, principal, audience, target, Connection,
  and purpose binding, and no semantic-validity claim; or
- continue current authority evaluation only when an explicit directed H-03
  edge applies and every authority-, lifecycle-, state-, security-, Trust-,
  effect-, and required-extension semantic is understood.

A genuinely public object MUST NOT acquire fictitious tenant or principal
bindings, and public status MUST NOT imply universal forwarding or authority.
Unknown semantics MUST NEVER create present authority.
An unknown release MUST NOT be inferred from epoch/revision proximity, package
or implementation defaults, deployment behavior, `current`/`latest` metadata,
or unstated compatibility assumptions.

**Applies to.** Participant release advertisements, intersecting candidates,
and older implementations, proxies, stores, or endpoints processing objects or
messages under newer, unknown, or unresolved release material.

**Lifecycle/state impact.** Non-intersecting advertisement handling and
candidate removal create no state. Reject/preserve/ignore/forward modes MUST NOT
mutate protocol lifecycle state; authority evaluation continues only under the
final safe-mode condition.

**Semantic failure.** An unresolved intersecting candidate is removed and an
empty eligible set is incompatible without fallback. If an object's assigned
safe mode cannot be satisfied losslessly or all critical semantics are not
understood, semantic use MUST reject or fail closed without current-release
reinterpretation.

**Sources:** H-03, H-04, H-10, H-13. **Gaps:** GB-042, GB-045.

## REQ-COMP-0006 - Unknown Core, enums, and messages

**Requirement.** An unknown Core member outside an explicit registered
extension point MUST reject its owning protocol object. An unknown base message,
operation discriminator, resource kind, or Core union tag MUST reject before
dispatch and MUST NOT route to generic success, consume an Approval, create a
Task, transition lifecycle state, or trigger an effect. An unknown authority,
lifecycle, or state enum MUST reject semantic use and MUST NOT be mapped to a
known value; an unknown Task state MUST NOT be guessed terminal, nonterminal,
successful, or failed. An unknown Trust, revocation, proof, security, or
historical-verification value MUST fail closed or remain indeterminate as its
owning decision requires and MUST NOT create current authority. An unknown
algorithm, profile, authentication identity, or key purpose MUST reject the
applicable selection or verification without fallback. Only an expressly open
informational/display class MAY expose an opaque unknown value without semantic
or authority meaning.

**Applies to.** All Core protocol objects, enum classes, base message dispatch,
resource kinds, and union tags.

**Lifecycle/state impact.** Unknown critical values prevent dispatch or state
use; preservation for history/diagnostics changes no state.

**Semantic failure.** The owning object or operation is invalid, unsupported,
or indeterminate according to the class above; it MUST NOT be repaired by a
default or nearest known value.

**Sources:** H-09, H-11, H-12, H-13. **Gaps:** GB-042, GB-045.

## REQ-COMP-0007 - Immutable schema relationship

**Requirement.** Every H-03 release MUST name exactly one immutable subordinate
schema-bundle identity and integrity reference and immutable individual schema
identities within that bundle. Those schema identities, the openness registry,
extension definitions, generation inputs, and compatibility assertions MUST be
release-bound artifacts and MUST NOT be independently negotiated at runtime.
Package or SDK versions and mutable schema URLs MUST NOT select a schema or
protocol interpretation. After publication, a schema, bundle, registry, or
identity MUST NOT be overwritten, repointed, or semantically mutated in place.

**Applies to.** Release manifests, schema bundles, individual schemas,
registries, generators, runtime peers, and stored objects.

**Lifecycle/state impact.** None; schema choice follows the exact selected or
historical release and never renegotiates a Connection.

**Semantic failure.** A missing, mismatched, mutable, independently negotiated,
or altered schema artifact makes the applicable release/object unsupported or
invalid; implementations MUST NOT substitute a current schema.

**Sources:** H-03, H-10, H-13. **Gaps:** GB-005, GB-043, GB-044.

## REQ-COMP-0008 - Change and errata classification

**Requirement.** A change to accepted validation, required/optional or
absent/null/default meaning, field type or bounds, generated-type meaning,
closed Core membership, enum/message set or meaning, schema identity,
extension definition/dependency/requiredness, H-10 participation or protected
bytes, error identity/status/retry meaning, authority/security/privacy meaning,
or historical interpretation MUST NOT occur under an already published release
identity. Such a behavioral or semantic change MUST use a new H-03 release
identity, new affected immutable artifacts, and explicit directed compatibility
analysis; a breaking change to the epoch's compatibility promise MUST use a new
epoch. Same-release evolution MAY use only values and occurrences expressly
predeclared by the immutable schema and registry. An append-only erratum MAY
clarify text only when it changes none of the behaviors or identities above;
each errata-index snapshot MUST have its own immutable identity/integrity
reference and MUST NOT alter a Connection or historical object.

**Applies to.** Published specifications, schemas, registries, extensions,
profiles, compatibility material, errata, and their consumers.

**Lifecycle/state impact.** No in-place object or Connection change is
permitted; use of changed material for governed authority requires new selection
and replacement where applicable.

**Semantic failure.** A semantic mutation under an existing identity is invalid
release material and MUST NOT be emitted, accepted, selected, or used to verify
history.

**Sources:** H-03, H-07, H-10, H-12, H-13. **Gaps:** GB-043, GB-044, GB-045.

## REQ-COMP-0009 - Stored-object version pinning

**Requirement.** Every durable Connection, Invocation, Approval Challenge or
Decision, Task, Result, Receipt, Trust or revocation artifact, checkpoint,
Passport, capability contract, and other protocol object MUST retain its
original exact release meaning through an own release identity or an immutable
reference whose target supplies that identity, as its owning chapter requires.
Authority-bearing and independently historical objects MUST also retain or
resolve the original specification/schema, extension, proof-profile, and
evidence bindings needed for exact interpretation. Restart, export, storage
projection, migration tooling, and a newer reader MUST NOT omit, synthesize,
rewrite, or silently upgrade those bindings. D1-03 through D1-06 own the complete
fields and lifecycle of their object classes; this requirement defines only the
version-meaning invariant.

**Applies to.** Durable protocol stores, archives, exports, recovery paths, and
historical verification.

**Lifecycle/state impact.** Original state and meaning remain pinned; reading or
preserving an object MUST NOT create a migration or authority transition.

**Semantic failure.** Missing required original version evidence yields
unsupported or indeterminate interpretation and MUST NOT be repaired with
current defaults or fabricated negotiation evidence.

**Sources:** H-03, H-07, H-09, H-10, H-11, H-13. **Gaps:** GB-043, GB-044.

## REQ-COMP-0010 - Compatibility and support-state separation

**Requirement.** Compatibility MUST remain distinct from implementation
support, published support commitments, deprecation, withdrawal, end of life,
future-release removal, local unsupported status, abandonment, security
prohibition, and historical-only availability. An explicit compatibility edge
MUST NOT make a locally unsupported, withdrawn, or security-ineligible release
eligible for a new Connection. Ordinary deprecation MUST NOT alone imply
incompatibility or silently mutate an active Connection; support loss alone MUST
NOT silently revoke authority. H-14 MUST own publishers, support windows,
notices, EOL, withdrawal authority, emergency release governance, and release
operations. No `N`/`N-1`, latest-only, lowest-common, or similar support rule MAY
be inferred absent an exact accepted requirement.

**Applies to.** Release status/security metadata, participant support claims,
new-Connection eligibility, active Connections, and historical readers.

**Lifecycle/state impact.** Withdrawal/security rules may bar new candidates;
active-Connection action occurs only through H-07/H-11/H-14 and never rewrites
history.

**Semantic failure.** A release failing applicable current support/security
eligibility is non-selectable for a new Connection even when a compatibility
edge exists; no fallback follows.

**Sources:** H-03, H-07, H-11, H-14. **Gaps:** GB-005, GB-044.

## REQ-COMP-0011 - Immutable legacy 0.1-draft treatment

**Requirement.** `ghostbridge/0.1-draft` objects and prose MUST remain immutable
legacy historical material. They MUST NOT be relabeled as an e1 release,
backfilled with current schemas, facets, extensions, authentication proofs,
negotiation evidence, or consent, silently migrated, or interpreted as having a
directed compatibility edge not explicitly recorded by H-03. A historical
reader MAY retain or verify original evidence under the legacy identity where
its exact evidence permits, but MUST NOT restore present authority or claim
current e1 conformance from it.

**Applies to.** All legacy `ghostbridge/0.1-draft` artifacts, durable objects,
fixtures, and readers.

**Lifecycle/state impact.** Historical read/verification only; no migration,
Connection activation, or authority restoration.

**Semantic failure.** Insufficient legacy evidence remains historically
indeterminate or unsupported; it MUST NOT be fabricated or inferred from e1
material.

**Sources:** H-03, H-04, H-05, H-07, H-10, H-11, H-13, H-14. **Gaps:** GB-043,
GB-044.

## Non-normative D2 traceability

Later D2 work is expected to derive exact directed-edge, bidirectional/non-
transitive, stored-object, old-reader/new-writer, new-reader/old-writer,
unknown-value, schema-evolution, support-state, and legacy compatibility
matrices from these requirements. This chapter creates no migration, fixture,
schema, or conformance asset and closes no `GB-*` gap.
