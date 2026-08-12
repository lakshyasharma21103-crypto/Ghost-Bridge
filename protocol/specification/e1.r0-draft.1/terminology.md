# Terminology

This chapter supplies the normative terms needed by D1-01. Later chapters may
add narrower terms but cannot silently change these meanings for this release.

## REQ-TERM-0001 - Protocol identity terms

**Requirement.** The following terms MUST have these meanings:

| Term | Meaning |
| --- | --- |
| Protocol | The release-selected Ghost Bridge rules governing logical roles, authority, objects, operations, lifecycle, and verifiable interoperability; it is not any one codebase, product, transport session, or deployment policy |
| Protocol release | One exact immutable H-03 identity for a governed set of protocol semantics, compatibility declarations, and release-bound artifacts; ordering, support, package version, and finality are separate facts |

**Sources:** H-03, H-13, H-14. **Gaps:** GB-001.

## REQ-TERM-0002 - Participant and implementation terms

**Requirement.** The following terms MUST have these meanings:

| Term | Meaning |
| --- | --- |
| Client implementation | Protocol software used by a Host Application to discover an Agent, establish the selected authentication context, manage installation and Connection references, submit operations, and verify responses; it is not the authenticated principal or the source of Agent authority |
| Host Application | The application that authenticates a Host principal, presents installation or Approval information, records user intent, and invokes a Client implementation; it may apply product policy but is not automatically an authorization policy authority |
| Authenticated Host principal | The typed caller identity and context derived from verified evidence under the selected authentication profile, never from request-body self-assertion |
| Agent | The logical execution endpoint that owns Agent-executed governed operation admission and is the final protocol-floor enforcement point before Task creation or external effect |
| Agent operator | The person or service responsible for deployment configuration, capability availability, key and store operation, incident controls, and service continuity; operating an Agent does not confer Host, Approver, issuer, organization, or cross-tenant authority |

**Sources:** H-01, H-02, H-05, H-07. **Gaps:** GB-001, GB-002, GB-003.

## REQ-TERM-0003 - Authority-role terms

**Requirement.** The following terms MUST have these meanings:

| Term | Meaning |
| --- | --- |
| Approver | An authenticated and eligible human or authorized principal that may issue one immutable Decision about one exact Approval Challenge; the role supplies consent or refusal, not execution authority |
| Authorization policy authority | The logical authority that evaluates deployment policy and issues a bounded structured `ALLOW` or `DENY` for one authenticated principal and exact action inside one active Connection |
| Passport issuer | The authority that signs and publishes Passport identity/declaration material and its purpose-bound key, status, and revocation history; issuer Trust does not authorize a Host action |
| Trust verification service | The canonical logical verifier of issuer origin, signatures, key purpose and lifecycle, audience, time, scope, revocation freshness, and anti-rollback evidence; its result is evidence for an enforcer and is not authorization |
| Organization authority | The top-level tenant governance authority for organization membership, workspace delegation ceilings, approved issuer/Trust roots, and policy-authority delegation |
| Workspace authority | The authority delegated by one Organization to manage membership and stricter policy within one Workspace without weakening or exceeding the Organization ceiling |
| Organization | The exact required top-level tenant identity and governance domain to which a Connection and its governed descendants are bound |
| Workspace | An optional subordinate tenant scope represented as either explicitly absent or present with one exact non-empty value under one Organization; absence is not a wildcard, null, empty value, hierarchy, or default |

`Trust Node` MAY be used as a deployment or product name only. It MUST NOT name
a second logical authority or alter the Trust verification service's authority.

**Sources:** H-02, H-07, H-08, H-11. **Gaps:** GB-001, GB-002, GB-003.

## REQ-TERM-0004 - Installation and Connection terms

**Requirement.** The following terms MUST have these meanings:

| Term | Meaning |
| --- | --- |
| Passport | Immutable, issuer-signed Agent identity and declaration evidence, including its exact issuer, version, capabilities or manifest references, and proof context; possession or validity alone grants no Connection or Invocation authority |
| Install Grant | A bounded, time-limited, revocable installation credential whose one accepted exact-intent redemption transaction may create exactly one authoritative Connection; possession and resolution are not authority |
| Installation preview | A safe, non-authoritative presentation of the proposed Agent, scope, release, authentication result, capabilities, profiles, extensions, experiments, omissions, limits, and material restrictions before final consent |
| Consent envelope | The immutable, secret-free set of exact meanings explicitly approved after the final preview and within which final negotiation and Connection creation must remain |
| Connection | The durable protocol object created directly as `active` by the complete H-06 atomic commit, binding one owner, Agent/Passport, release, authentication, tenant scope, consent, selected capabilities/profiles, lifecycle state, and immutable evidence |
| Connection authority | The maximum installed boundary in which a request may be considered while the Connection is active; it is necessary but not sufficient and is narrowed by every current applicable authority gate |

**Sources:** H-01, H-03, H-04, H-05, H-06, H-07. **Gaps:** GB-001, GB-003.

## REQ-TERM-0005 - Governed work and evidence terms

**Requirement.** The following terms MUST have these meanings:

| Term | Meaning |
| --- | --- |
| Invocation | An authenticated request to admit one exact capability operation inside an existing Connection; it exercises existing bounded authority and does not issue new authority |
| Approval Challenge | A durable, non-authorizing request for an eligible Approver to decide one exact action using safe presentation and authority-critical bindings |
| Approval Decision | One immutable authenticated outcome for one Challenge: approved, denied, or more-information-required in semantic meaning; an approved Decision only makes exact-action Approval authority available subject to every other current gate |
| Task | The durable identity for one Invocation accepted by the final H-07 commit; candidates, Approval workflow, queues, workers, attempts, and HTTP requests are not Tasks |
| Result | The one logical immutable terminal semantic record for a Task, binding outcome, output or immutable reference, effect facts, safe failure, attempts, and terminal context |
| Receipt | Downstream purpose-bound evidence about an already terminal Task/Result snapshot; it does not create authority, control Task terminality, or prove current authorization by existence alone |
| Revocation | An authenticated, purpose- and subject-scoped authoritative security event that ends or narrows applicable current authority according to its accepted lifecycle; it does not erase immutable historical facts |

**Sources:** H-02, H-07, H-08, H-09, H-10, H-11. **Gaps:** GB-001, GB-003, GB-016.

## REQ-TERM-0006 - Core and Governed terms

**Requirement.** `Core` MUST mean the role-scoped minimum lifecycle and
interoperability facets required by the selected release for each claimed Host,
Agent, or Trust-verification role. `Governed Execution` or `governed operation`
MUST mean an operation that can exercise, create, change, consume, or act under
Connection-scoped authority or accepted work. Governed Execution MAY be globally
optional, but its applicable role facet MUST be implemented whenever a role
claims or participates in a governed feature. Core-only roles MUST safely reject
unsupported governed requirements.

**Sources:** H-04, H-05, H-12. **Gaps:** GB-001, GB-003.

## REQ-TERM-0007 - Operation-class terms

**Requirement.** Operation classes MUST have these meanings:

| Term | Meaning |
| --- | --- |
| Public pre-Connection operation | An exact release-defined metadata or Trust-evidence observation permitted without a Connection and without creating authority |
| Authenticated pre-Connection operation | An operation before Connection creation that requires authenticated or purpose-bound access, such as authentication establishment, bounded grant resolution/preview, or redemption; authentication does not change its pre-authority classification |
| Connection-governed operation | An operation whose admission, transition, or disclosure depends on one exact Connection and its current applicable authority gates |
| Historical-evidence operation | A read or verification of an already committed object, tombstone, proof, or retained history that cannot accept new work or restore current authority |

**Sources:** H-01, H-07, H-09, H-11, H-12. **Gaps:** GB-001, GB-003, GB-014, GB-015, GB-016.

## REQ-TERM-0008 - Boundaries and non-equivalences

**Requirement.** A transport connection MUST mean only the underlying HTTP,
TCP, QUIC, local IPC, or equivalent byte-delivery relationship; it MUST NOT be
treated as a protocol Connection. Implementation or deployment policy MUST mean
controls chosen by a product, Host, operator, Organization, Workspace, or
Platform; it MAY narrow behavior but MUST NOT be treated as a protocol
requirement. Historical `Delegation Grant` or similar `0.1-draft` terminology
MUST NOT be treated as Core authority in this release unless an accepted,
release-specific requirement expressly defines it. Authentication, Trust,
Connection authority, authorization, Approval, cryptographic validity, transport
success, and historical verification MUST remain non-equivalent.

**Sources:** H-01, H-02, H-03, H-12, H-14. **Gaps:** GB-001, GB-002, GB-003.
