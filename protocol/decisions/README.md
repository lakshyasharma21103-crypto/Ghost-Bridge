# Ghost Bridge protocol decision register

## Purpose

Protocol decision records preserve the human choices that are prerequisites to
the Ghost Bridge normative specification. A record explains the unresolved
question, repository evidence, viable options, security and compatibility
effects, recommendation, and the human disposition. It is governance evidence,
not a normative protocol requirement by itself.

The register prevents current JavaScript behavior, a JSON Schema, a test
expectation, a Platform policy, or an external reference practice from silently
settling an unresolved protocol question. Those sources may be evidence for a
decision, but none can approve one.

## Status values

| Status | Meaning |
| --- | --- |
| `PROPOSED` | Prepared for human review. No option has protocol authority. |
| `ACCEPTED` | An identified human approver approved an option and completed the required approval information. |
| `REJECTED` | An identified human approver declined the proposal without making it protocol law. |
| `SUPERSEDED` | A later identified record replaces this record prospectively. The earlier record remains in history. |

Only a human-approved record may become `ACCEPTED`. Codex, an implementation,
an automated test, a conformance result, or deployment behavior cannot change a
record to `ACCEPTED`.

An unresolved record remains `PROPOSED` even when every current implementation
happens to behave like one of its options. Implementation behavior cannot
settle an unresolved protocol decision.

## Traceability

Decision and implementation artifacts have distinct roles:

1. An `H-*` decision ID records a human protocol choice and its accepted risks.
2. A `GB-*` gap ID identifies the audited deficiency that required the choice.
3. A normative requirement ID in a future, human-approved specification
   expresses the accepted choice with testable requirement language.
4. A schema ID defines the wire representation required by one or more
   normative requirements.
5. A state-machine ID defines legal states, triggers, guards, effects,
   atomicity, and illegal-transition behavior required by those requirements.
6. A fixture or vector ID provides immutable input and expected evidence
   derived from requirements, schemas, or state machines.
7. A conformance case ID exercises those assets against an implementation
   through the published implementation-under-test boundary.

Traceability is many-to-many and must be explicit. A decision may close several
gaps; a requirement may depend on several accepted decisions; and a conformance
case may cite several requirements and executable assets. A passing case is
evidence about an implementation, not retroactive approval of a decision.

Every new normative specification requirement must cite its applicable
`ACCEPTED` decision records. Requirements for which no protocol decision was
needed must still cite their governing source or record that the requirement is
not decision-dependent. Schemas, state machines, fixtures, vectors, and
conformance cases must cite the requirement IDs from which they are derived and
the accepted decision IDs where applicable.

The Phase 15D.0 gap register remains the source for `GB-*` scope. This directory
does not assign normative requirement, schema, state-machine, fixture, vector,
or conformance case IDs.

## Immutable history and supersession

- A record keeps its original decision ID. IDs are never reused for a different
  question.
- While a record is `PROPOSED`, review revisions may clarify it. Material
  revisions must retain reviewable version-control history and must not present
  prior reviewer comments as approval.
- Once a record is `ACCEPTED` or `REJECTED`, its decision text, option selected,
  approval information, and accepted risks are immutable historical evidence.
  Editorial corrections must be explicit and must not change meaning.
- A changed decision requires a new decision record that cites the earlier
  record and explains migration, compatibility, security, and historical-object
  consequences.
- The earlier record becomes `SUPERSEDED` only through an identified human
  approval of the replacement. Supersession is prospective and never rewrites
  the meaning of objects, Receipts, conformance results, or other evidence
  created under the earlier decision.
- A superseding record must identify the exact requirements, schemas, state
  machines, fixtures, vectors, cases, SDK behavior, and deployed durable
  objects affected by the change.
- Deleting a dispositioned record or editing it to look as though a different
  option was originally approved is prohibited.

## Required human approval information

An approval is incomplete unless the decision record contains all of:

- **Approver:** the accountable human name or approved governance identity.
- **Approval date:** an unambiguous calendar date.
- **Approved option:** the exact option identifier and any approved
  qualifications.
- **Accepted risks:** residual risks knowingly accepted by the approver.
- **Compatibility impact:** wire, SDK, deployment, and historical-object
  consequences accepted by the approver.
- **Security impact:** security properties gained, weakened, deferred, or
  conditioned by the decision.

The approval block must also identify the resulting status and a durable
sign-off or review reference where one exists. Missing information leaves the
record `PROPOSED`.

## Current records

| Decision ID | Title | Status |
| --- | --- | --- |
| [H-01](H-01-lifecycle-initialization-and-ordering.md) | Lifecycle initialization and ordering | `ACCEPTED` |
| [H-02](H-02-roles-trust-boundaries-and-authorization-floor.md) | Roles, trust boundaries, and protocol authorization floor | `ACCEPTED` |
| [H-03](H-03-protocol-version-identity-and-history.md) | Protocol version identity, ordering, compatibility, history, and anti-downgrade binding | `ACCEPTED` |
| [H-04](H-04-capability-profile-and-optional-feature-negotiation.md) | Capability, profile, and optional-feature negotiation | `ACCEPTED` |
| [H-05](H-05-authentication-profiles-and-credential-binding.md) | Authentication profiles and credential binding | `ACCEPTED` |
| [H-06](H-06-install-grant-redemption-and-retry-semantics.md) | Install Grant redemption and retry semantics | `ACCEPTED` |
| [H-07](H-07-connection-lifecycle-and-scoped-authority.md) | Connection lifecycle and scoped authority | `ACCEPTED` |
| [H-08](H-08-exact-action-approval-lifecycle-and-consumption.md) | Exact-action Approval lifecycle and consumption | `ACCEPTED` |
| [H-09](H-09-task-result-cancellation-and-retention-model.md) | Task, result, cancellation, and retention model | `ACCEPTED` |
