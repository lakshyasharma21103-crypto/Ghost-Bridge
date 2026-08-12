# Installation

This chapter defines the pre-Connection installation and Install Grant
redemption contract for `ghostbridge/e1.r0-draft.1`. It defines semantic object
classes, previews, exact replay, and the authority-creation transaction, not
HTTP resources, schema members, canonical bytes, storage products, or locks.

## REQ-INST-0001 - Distinct Install Grant object classes

**Requirement.** An implementation MUST keep these semantic classes distinct:

| Class                                                       | Meaning and authority boundary                                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Grant secret or presentation value                          | Sensitive high-entropy bearer-like lookup/redemption material; not durable public identity or authenticated replay eligibility |
| Grant identity/reference                                    | Stable non-secret semantic identity of one issued grant; not its presentation material                                         |
| Safe lookup identity or H-10 digest slot                    | Purpose-bound non-reversible lookup representation; not proof or authority                                                     |
| Grant issuer                                                | Exact authority that issued and bound the grant under REQ-INST-0002                                                            |
| Target and scope                                            | Exact Agent/Passport/purpose, organization, tagged workspace, ceilings, limitations, and restrictions                          |
| Resolution result and informational grant state             | Non-authoritative safe preview/tombstone projection                                                                            |
| Redemption request                                          | One received attempt; several requests may present one intent                                                                  |
| Redemption-attempt identifier                               | Stable Host-generated identifier used only for one exact intent; not secret, proof, or equality by itself                      |
| Redemption intent and future H-10-qualified identity/digest | Complete authority-critical semantic selection whose exact equality controls redemption and replay                             |
| Authoritative Connection result                             | One immutable secret-free result produced only by the complete H-06 commit                                                     |

The presentation value MUST NOT be collapsed with durable grant identity,
lookup identity, attempt identity, redemption intent, or committed result.
Install Grant replay/idempotency MUST remain a separate purpose, namespace,
identity, and outcome from Invocation idempotency.

**Applies to.** Grant issuance, storage, resolution, preview, redemption,
recovery, replay, audit, and deletion/retention handling.

**Lifecycle/state impact.** Classification alone has none. Only the complete
REQ-INST-0007 commit creates Connection authority.

**Semantic failure.** A class substitution or ambiguous class is invalid and
non-authorizing; it MUST NOT disclose a committed result or create a
Connection.

**Sources:** H-01, H-05, H-06, H-07, H-10, H-12. **Gaps:** GB-009, GB-010,
GB-017.

## REQ-INST-0002 - Grant issuance authority and immutable bounds

**Requirement.** Install Grant issuance MUST be an explicitly authenticated
and authorized administrative operation under one exact grant issuer and its
organization/workspace delegation. The issuer MUST bind one non-reusable grant
identity to the exact target Agent and Passport context, installation purpose,
organization, tagged workspace value or explicit absence, issuance or
not-before boundary, exclusive expiry, ceilings, restrictions, and every other
authority-critical issuance input required by the selected release. Workspace
absence MUST NOT be wildcard or permission to choose a workspace during
redemption.

The issued presentation value MUST be unpredictable and protected as sensitive
bearer-like material, but possession or resolution of that value, reference, or
lookup identity MUST NOT prove the Host principal, tenant membership,
redemption authority, replay eligibility, or consent. Grant issuance MUST NOT
create a Connection, select final capabilities, or authorize an Invocation.

**Applies to.** Creation and delivery of every production Install Grant.

**Lifecycle/state impact.** A valid issuance creates only an `available` grant
with no Connection authority. It does not create a pending Connection.

**Semantic failure.** Missing issuer/admin authority, ambiguous delegation,
wrong or absent target/scope/purpose/bounds, or a secret/reference treated as
Host proof makes issuance invalid or non-authorizing and no redemption commit
may rely on it.

**Sources:** H-01, H-02, H-05, H-06, H-07. **Gaps:** GB-009, GB-010, GB-012.

## REQ-INST-0003 - Resolution is non-authoritative

**Requirement.** Grant resolution and preview retrieval MUST be read-only and
non-authoritative. Resolution MAY return only the bounded secret-free safe
information permitted for the exact purpose and an informational projection of
`available`, `redeemed`, `expired`, or `revoked`. It MUST NOT consume or mutate
the grant, create or recover Connection authority, prove that a redemption
transaction committed or failed, prove the authenticated replay principal,
prove replay eligibility, disclose the authoritative Connection/result, or
expose reusable grant or credential material.

After redemption, ordinary resolution MUST expose at most a safe
non-authoritative redeemed tombstone. Authoritative result recovery MUST occur
only through the exact currently eligible replay path in REQ-INST-0006 unless a
different recovery authority is separately accepted later.

**Applies to.** Grant lookup, resolution, advisory preview, and post-terminal
grant status reads.

**Lifecycle/state impact.** None. Resolution does not transition the grant or
Connection.

**Semantic failure.** Missing, expired, revoked, redeemed, cross-scope, or
unauthorized resolution remains non-authorizing and MUST NOT reveal which
protected authoritative result or principal exists; H-12 owns the public
collapse.

**Sources:** H-01, H-05, H-06, H-12. **Gaps:** GB-009, GB-010.

## REQ-INST-0004 - Advisory preview, final preview, and consent envelope

**Requirement.** An advisory installation or authentication preview MUST be
secret-free and non-authoritative. It MAY describe expected interaction,
principal category, issuer, target/audience, tenant, profile, proof class,
capabilities, restrictions, and lifecycle consequences, but it MUST NOT be
treated as final while authority-critical verified facts remain unknown.

After required authentication establishment, the Host MUST construct and
present a final secret-free preview that binds the exact validated D1-02
selection result, selected release, release/profile/capability evidence, exact
authentication result, Agent and Passport, audience/target, organization and
tagged workspace, enabled and disabled capabilities, profiles/facets,
extensions, experiments, omissions, limitations, restrictions, expiry and
lifecycle consequences, Offer/grant bounds, and all other material consent
meaning. Explicit human consent MUST bind one immutable permitted envelope and
its safe evidence identity or H-10 digest slot.

Credential material, grant presentation material, private provider responses,
and other reusable secrets MUST NOT enter either preview or the consent
envelope. Successful authentication, an advisory preview, or prior consent MUST
NOT substitute for final consent. Any material difference before commit MUST
produce a new final preview and new explicit human consent; the old consent
MUST NOT be widened, patched, or reused.

**Applies to.** Installation preview generation, display, consent, redemption
validation, replay comparison, and historical consent evidence.

**Lifecycle/state impact.** Preview and consent create no Connection authority
and do not consume a grant. Their exact immutable result becomes an H-06 commit
input.

**Semantic failure.** A stale, incomplete, secret-bearing, mismatched, mutated,
or materially changed preview/consent is invalid and prevents redemption until
new final consent exists.

**Sources:** H-01, H-04, H-05, H-06, H-10. **Gaps:** GB-009, GB-010.

## REQ-INST-0005 - Complete redemption intent

**Requirement.** Before transaction entry, the Agent MUST establish one
complete redemption intent and compare it under field-by-field selected-release
semantic equality. The intent MUST bind, as applicable:

- the non-secret grant identity and stable Host-generated redemption-attempt
  identifier;
- the authenticated replay principal derived from current selected-profile
  evidence and any separately required Host identity;
- grant issuer, purpose-bound Agent/resource target, Agent and Passport;
- exact selected release and immutable release/spec/schema/compatibility
  evidence;
- exact H-05 profile and authentication result, audience, proof class, and
  limitations;
- organization and tagged workspace value or explicit absence;
- the complete D1-02 negotiated result, including selected profiles/facets,
  capabilities and versions, disabled or omitted claims, restrictions, limits,
  extensions, experiments, and evidence identities;
- final immutable consent identity/envelope;
- applicable Offer, grant, and issuer ceilings and restrictions; and
- every other authority-critical selection, identity, validity, or safe
  immutable evidence value required by H-01 through H-06.

The stable attempt identifier MUST be generated and retained by the Host for
that one intent and MUST NOT be reused for a different intent. A repeated
request or correlation identifier MUST NOT establish intent equality. H-10 owns
the exact canonical bytes, domain, and digest representation and MUST NOT change
the semantic inventory or explicit absence/value distinctions defined here.

**Applies to.** Redemption requests, pre-transaction validation, final
transaction recheck, replay, conflict detection, and durable result evidence.

**Lifecycle/state impact.** Intent construction and validation are
non-authorizing. The exact intent becomes immutable only in a successful H-06
commit.

**Semantic failure.** A missing, unverified, ambiguous, stale, out-of-envelope,
or unequal authority-critical input makes the attempt invalid or conflicting
and creates no Connection.

**Sources:** H-01, H-03, H-04, H-05, H-06, H-10, H-13. **Gaps:** GB-009,
GB-010, GB-011, GB-012.

## REQ-INST-0006 - Exact replay eligibility and conflict

**Requirement.** An exact redemption replay MUST prove all of the following:

1. the same Install Grant identity;
2. the same stable redemption-attempt identifier;
3. equality of the complete REQ-INST-0005 intent in both value and presence;
4. the same typed authenticated replay principal and purpose-bound target as
   the committed binding; and
5. current replay eligibility under fresh verified selected-profile evidence,
   exact tenant scope, and the result-disclosure rules.

If no authoritative result committed, the exact eligible request MAY attempt
the one commit only while the grant is still `available`, authoritative time is
at or after its applicable issuance/not-before lower validity boundary and
strictly before its exclusive `expiresAt`, and no authoritative revocation has
serialized first. If the complete result committed, the exact eligible replay
MUST return the same authoritative secret-free Connection result without
mutation. Grant possession, a grant/reference digest, attempt identifier,
request or correlation identifier, body principal, response receipt, or prior
network success alone MUST NOT prove equality or eligibility.

Reuse of the grant or attempt identity by a different/ineligible principal or
with any different authority-critical value is a conflict. It MUST create no
second Connection, mutate no grant, Connection, intent, consent, or committed
result, and disclose no authoritative Connection/result or protected competing
value to that caller.

**Applies to.** Sequential, concurrent, post-restart, and lost-response
redemption repeats.

**Lifecycle/state impact.** An exact committed replay performs no transition;
an eligible precommit replay may participate in only the single first commit. A
conflict has no state effect.

**Semantic failure.** Incomplete equality, stale current evidence, ineligible
disclosure, or any differing authority-critical semantic is conflict,
unauthenticated, wrong-scope, or indeterminate as applicable and fails closed.

**Sources:** H-05, H-06, H-07, H-10, H-12. **Gaps:** GB-009, GB-012, GB-017.

## REQ-INST-0007 - Atomic authority-creation transaction

**Requirement.** The Agent MUST perform Install Grant redemption through one
deployment-neutral indivisible durable transaction or proven equivalent
serialization. Before entering it, the Agent MUST perform bounded structural
validation, authenticate the Host under the exact selected profile, derive the
principal from verified evidence, load immutable grant/Offer/Passport/preview/
consent/negotiation/authentication evidence, establish the complete intent, and
check issuer, target, scope, policy, validity, and revocation. Those preliminary
checks grant no authority.

At the transaction serialization boundary the Agent MUST reload or protect with
validated authoritative versions every raceable authority-critical input,
including grant state, intent/attempt equality, authenticated replay
eligibility, the applicable issuance/not-before lower validity boundary,
exclusive expiry, authoritative revocation, target, tenant, consent, negotiated
result, authentication, policy, conflicting result/Connection identity, and
durable storage integrity. It MUST then select exactly one of these outcomes:

- observe an existing complete exact result and, after current replay-
  eligibility verification, return it without mutation;
- observe a committed conflict or ineligible replay and fail without result
  disclosure or mutation;
- observe authoritative time before the applicable issuance/not-before lower
  validity boundary and fail non-authoritatively without changing the
  `available` grant or creating a Connection;
- observe expiry or revocation as the serialized terminal winner and create no
  Connection; or
- atomically transition the grant to `redeemed`, create exactly one complete
  Connection directly as `active`, and bind the exact intent, negotiated and
  authentication results, authoritative secret-free Connection result or its
  immutable reproducing identity, authenticated replay principal and target,
  commit time, safe conflict/recovery evidence, and any non-authorizing audit
  intent as one durable outcome.

The complete result MUST be durably observable before authority exists or a
success response is constructed. Validation success, transaction entry,
locks, leases, candidates, internal `redeeming` activity, partial writes,
adapter return, response construction or delivery, preview, audit, or metrics
MUST NOT create authority. Success audit/metrics MUST follow commit and their
failure MUST NOT roll back or duplicate it.

**Applies to.** Every initial Install Grant redemption and exact recovery
attempt.

**Lifecycle/state impact.** The full commit is the sole transition from no
Connection to one authoritative `active` Connection and from grant `available`
to `redeemed`. No protocol-visible partially authoritative grant or Connection
state exists.

**Semantic failure.** A definite precommit failure creates no Connection. A
partial, unverifiable, or indeterminate transaction outcome MUST fail closed and
enter exact recovery; it MUST NOT be labeled a clean precommit failure or used
to attempt a second Connection.

**Sources:** H-01, H-02, H-04, H-05, H-06, H-07, H-11, H-12. **Gaps:** GB-009,
GB-010, GB-011.

## REQ-INST-0008 - Concurrency, crash, and ambiguous outcome convergence

**Requirement.** Concurrent exact eligible redemptions MUST converge on one
creation commit and the same authoritative Connection result. A loser that is
otherwise exact and eligible MUST observe the committed result rather than be
treated as a terminal consumed conflict merely for losing the race. Concurrent
conflicting redemption MUST produce at most the one valid winner and MUST give
the conflict no result or mutation.

A crash definitely before commit creates no authority and permits the exact
eligible intent to try the single first commit while the grant remains
available. A crash, response-construction failure, response loss, timeout,
reset, provider disconnection, or audit failure after commit MUST preserve the
one committed result and MUST NOT restore grant availability or permit another
Connection. Transport behavior MUST NOT prove whether commit occurred.

On an ambiguous outcome, the caller MUST retain the exact intent and current
authentication context and use REQ-INST-0006 convergence. The Agent MUST reread
the authoritative transaction by its bound identities. If the complete result
is present it MUST return that result only to an eligible replay; if versions
prove no commit and the grant remains eligible, the exact attempt MAY proceed;
otherwise partial, corrupt, unavailable, rolled-back, or split-brain state MUST
remain indeterminate and non-authorizing until one exact outcome is restored.

**Applies to.** Concurrent requests, cross-instance races, client/server crash,
restart, response loss, storage timeout, and adapter ambiguity.

**Lifecycle/state impact.** At most one `available` to `redeemed` transition and
one active Connection may result. Exact postcommit recovery performs no
transition.

**Semantic failure.** Conflict or indeterminate durable state fails closed,
without a second Connection, authoritative result disclosure, rollback, or
implicit replacement.

**Sources:** H-06, H-07, H-10, H-11, H-12. **Gaps:** GB-009, GB-011, GB-017.

## REQ-INST-0009 - Grant states and expiry/revocation serialization

**Requirement.** The informational and authoritative Install Grant state
inventory MUST be exactly `available`, `redeemed`, `expired`, and `revoked`.
Internal locks, leases, attempts, or `redeeming` work MUST NOT be projected as
authority state. The legal durable transitions are:

| From                                | Serialized winner                                                                                                                 | To          | Authority effect                     |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------ |
| no grant                            | Valid authorized issuance                                                                                                         | `available` | No Connection authority              |
| `available`                         | Complete REQ-INST-0007 commit at/after the applicable issuance/not-before boundary, strictly before expiry, and before revocation | `redeemed`  | Exactly one active Connection exists |
| `available`                         | Redemption attempt before the applicable issuance/not-before boundary                                                             | `available` | No transition and no Connection      |
| `available`                         | Authoritative clock at or after exclusive expiry before commit                                                                    | `expired`   | No Connection                        |
| `available`                         | Authoritative revocation before commit                                                                                            | `revoked`   | No Connection                        |
| `redeemed`, `expired`, or `revoked` | Exact observation or permitted replay                                                                                             | same state  | No state mutation                    |

The complete validity interval MUST require authoritative time at or after the
grant's applicable issuance/not-before lower boundary and strictly before its
exclusive `expiresAt`, with no authoritative revocation serialized first. An
issued grant observed before its lower boundary remains `available` but grants
no redemption eligibility; the attempt fails non-authoritatively without a new
state until the accepted boundary is reached. At expiry equality the grant is
expired, and no skew, local clock assumption, provider value, or runtime default
may extend authority creation past that upper boundary. The lower boundary,
expiry, and H-11-qualified revocation MUST be reevaluated at the transaction
serialization point. Redemption, expiry, and revocation MUST serialize against
one grant history: a complete valid commit first yields the one redeemed result;
expiry or revocation first yields no Connection. Stale prechecks and response
timing MUST NOT override the serialized winner.

After successful commit, later grant expiry or revocation MUST NOT retroactively
rewrite the grant as unredeemed, erase or reinterpret the Connection, or create
a second Connection. Subsequent Connection consequences belong to H-07/H-11.
Terminal grant states MUST NOT return to `available` or transition to another
Connection result.

**Applies to.** Grant issuance, redemption, expiry observation, revocation,
resolution, restart, and race recovery.

**Lifecycle/state impact.** Exactly the transitions in the table; there are no
other grant authority transitions.

**Semantic failure.** Acceptance before the applicable lower validity boundary,
an illegal transition, expiry equality accepted as unexpired, stale revocation
state, or competing terminal/result mutation is invalid and MUST fail closed
without authority.

**Sources:** H-06, H-07, H-11, H-12. **Gaps:** GB-009, GB-011, GB-015.

## REQ-INST-0010 - Durable replay evidence, tombstones, and secret exclusion

**Requirement.** The grant, Connection result, and replay record MUST retain
enough immutable secret-free durable evidence to reconstruct the one exact
transaction independently of mutable defaults; prevent another authority
creation; verify exact replay eligibility; converge an eligible replay; reject
conflicting reuse without disclosing the winner; survive restart; and support
applicable historical, audit, and retention obligations. It MUST include the
safe grant/intent/result identities, authenticated replay principal and target,
commit or first terminal state/time, Connection identity when committed, and
safe conflict and recovery evidence.

Terminal tombstone and replay evidence MUST be retained for at least the
lifetime and historical-support period of the resulting Connection and every
surviving replay dependency. This chapter MUST NOT invent a longer concrete
duration. A mutable URL, `latest`/`current` pointer, package version,
deployment/provider default, cache, response, or current schema MUST NOT replace
the retained history.

Raw grant presentation values, credential material, provider secrets, private
keys, bearer material, unbounded policy or response content, and body-supplied
principal claims treated as truth MUST NOT enter Connections, replay records,
evidence bundles, tombstones, errors, logs, metrics, or audit fields. Safe bulky
immutable evidence MAY remain external only under an exact release-bound,
historically resolvable identity whose failure to resolve is non-authorizing.

**Applies to.** Committed success and terminal-failure persistence, replay,
historical support, restart, observability, and retention.

**Lifecycle/state impact.** Retention does not create, extend, restore, or
revoke Connection authority. Deletion or absence MUST NOT be interpreted as
grant availability.

**Semantic failure.** Missing, secret-bearing, mutable, corrupt, rolled-back,
duplicated, or unresolvable durable evidence is indeterminate and MUST fail
closed; recovery may restore only the one exact proven history.

**Sources:** H-05, H-06, H-07, H-10, H-11, H-12, H-14. **Gaps:** GB-009,
GB-010, GB-011, GB-017.

## Non-normative D2 traceability

Later D2 work is expected to derive Install Grant, preview/consent, redemption,
Connection-result and tombstone schemas; the H-06 state machine; and exact
replay, conflict, concurrent race, expiry/revocation, crash, restart,
lost-response, corruption, and secret-leak fixtures from these requirements.
This chapter creates none of those assets and closes no `GB-*` gap.
