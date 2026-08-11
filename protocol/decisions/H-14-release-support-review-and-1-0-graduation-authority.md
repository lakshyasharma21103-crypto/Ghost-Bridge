# H-14 — Release, support, review, and 1.0 graduation authority

## Decision ID

`H-14`

## Title

Release, support, review, and 1.0 graduation authority

## Status

**ACCEPTED**

Rudra Sharma explicitly approved H-14 on 2026-08-11. The accepted disposition
and its durable approval evidence are recorded below. Historical alternatives
and recommendations remain in this record as decision rationale; only the
accepted disposition establishes H-14 governance.

## Date prepared

2026-08-11

## Approval date

2026-08-11

## Canonical question

The accepted disposition below resolves this canonical governance question:

Decide package ownership/names/license, release artifacts and signing authority,
support/deprecation windows, required independent implementation profiles,
interoperability matrix, external security-review gate, residual-risk
authority, and final 1.0 graduation approval.

## Why a human decision is required

Publication, support, and risk acceptance are governance acts that tests or
implementation behavior cannot decide.

## Canonical scope and required evidence

- **Affected gaps:** `GB-050` through `GB-060`.
- **Affected Phase work:** `D2-03`, `D2-04`, `D2-05`, `E-01`, `E-03`,
  `P1-01`, `P1-02`, `P1-03`, `P1-04`, and `P1-05`.
- **Required decision evidence:** approved decision record with owners and
  approvers; license/artifact inventory; support/deprecation policy; required
  evidence matrix; review/remediation threshold; residual-risk process;
  release checklist; and dated 1.0 sign-off rule.

## Governance boundary

This record preserves the proposal and repository-evidence audit that informed
the accepted decision. Current code, tests, schemas, historical draft prose,
package metadata, workspace layout, build output, CI, release scripts, Platform
approvals, GitHub configuration, and external standards remain evidence only.
None silently settles or expands H-14.

H-14 acceptance establishes the governance rules, accountable authorities,
evidence thresholds, and procedure recorded below for later evidence-bound
acts. It does not itself:

- complete Phase 15D.1, Phase 15D.2, Phase 15E, or `P1-01` through `P1-05`;
- close a `GB-*` gap;
- create normative requirements or executable assets;
- prove implementation, independent implementation, conformance, or
  interoperability;
- perform external security review or remediation;
- authorize release of an unidentified or future artifact set;
- publish or release an artifact; or
- graduate Ghost Bridge to Protocol 1.0.

The later exercise of any release, publication, residual-risk, withdrawal, or
graduation authority must identify the exact release and immutable evidence
manifest and be recorded separately. `P1-05`, not H-14 acceptance, remains the
execution point for the final dated Protocol 1.0 graduation sign-off.

## Repository evidence inspected

The evidence audit covered:

- `docs/protocol/phase-15d-plan.md` and the duplicated canonical Human Protocol
  Decision Register;
- `docs/protocol/normative-specification-gap-analysis.md`, including every
  `GB-050` through `GB-060` finding and all 60 gap rows;
- `docs/protocol/conformance-architecture.md` and its authority hierarchy,
  implementation-under-test boundary, result format, minimum PASS criteria,
  anti-TypeScript-oracle controls, and delivery gates;
- `docs/protocol/phase-15d0-reference-register.md` and
  `docs/protocol/production-protocol-benchmark.md`, using external observations
  only within their recorded comparison boundary;
- `protocol/decisions/README.md` and every complete accepted H-01 through H-13
  record, including approval, compatibility, security, residual-risk, and
  deferred-ownership sections;
- the root workspace definition and every tracked `package.json`, including
  names, versions, dependencies, exports, `files`, `private`, `license`, and
  absent `publishConfig` fields;
- the workspace dependency graph among protocol-core, Trust, Issuer, Native
  Client, Native Agent, conformance, inspector, Platform, and examples;
- `.github/workflows/phase-15c1a.yml`, `.github/workflows/phase-15c2.yml`, root
  build/test/verification scripts, package dry-run checks, and the current
  official-runtime-dependent conformance scripts;
- `RELEASE_READINESS.md`, release-readiness backend models/services/scripts,
  `GA_COMMERCIAL_OPERATIONS.md`, staging/pilot material, and their explicit
  Platform/product boundaries;
- Phase 15B/15C reports, security guidance, Trust/key/revocation material, and
  current statements about missing independent implementation, external review,
  production certification, and cross-vendor interoperability;
- tracked license, changelog, migration, support, deprecation, vulnerability,
  advisory, provenance, SBOM, signing, package-output, and release-output
  material; and
- the absence of a protocol release bundle, dedicated vulnerability-intake
  policy, public package ownership proof, protocol changelog/support policy,
  signed release manifest, normative evidence manifest, or tracked publishable
  package archive.

No external registry ownership or package-name availability was verified. The
current `@ghostbridge/*` names are repository declarations only.

## Evidence determinations and missing contracts

1. All protocol-facing packages are currently `private: true`; the principal
   protocol packages use version `0.1.0-draft` and `UNLICENSED`; no manifest
   establishes a public owner, registry, license, or publication contract.
2. The root is a private npm workspace at package version `0.1.0`; backend and
   frontend are private `0.1.0` workspaces, while `external-agent` is a private
   `2.0.0` workspace. Those package versions do not establish one H-03 release
   or compatibility relationship. Protocol Core, Native Client, Native
   Agent, Trust, Issuer, conformance, and inspector have implementation
   dependencies that do not yet express the future E-01 public role boundary.
3. The current conformance package and black-box script import official
   packages. They are implementation regression evidence, not D2-05 independent
   conformance authority.
4. No versioned portable golden corpus, normative static vector corpus,
   malicious/failure corpus, implementation-neutral result schema, or signed
   protocol asset manifest exists.
5. H-10's reviewed JavaScript/Python/Go RUN 2 is cryptographic governance
   evidence. H-10 explicitly says it is not automatically a normative D2-03
   vector corpus, a P1-01 implementation, or sufficient release evidence.
6. The historical draft and repository landing text use portable or
   independently implementable language, while the canonical audit finds that
   production implementation still requires official JavaScript and Platform
   knowledge. Release claims must use the audit determination until downstream
   evidence changes it.
7. The current CI workflows run Node implementation, Platform, database, and
   package-dry-run checks. They do not sign a coherent protocol release, run a
   clean-room independent implementation, publish an interoperability matrix,
   or perform external security review.
8. `RELEASE_READINESS.md` contains useful Platform evidence patterns for
   manifests, provenance, SBOMs, rollbacks, waivers, and operational gates, but
   the canonical audit identifies it as a Platform control plane rather than a
   protocol release system.
9. No repository-wide license file, protocol package license selection, legal
   ownership record, trademark decision, registry-control proof, dependency
   license opinion, or public contribution license contract was found.
10. No protocol-specific support duration, deprecation notice, withdrawal/EOL
    procedure, historical archive service level, changelog/migration template,
    or machine-readable support-state contract exists.
11. No protocol-specific vulnerability intake owner, confidential reporting
    channel, advisory/disclosure procedure, reviewer-independence contract, or
    remediation evidence format exists.
12. No independent production implementation, bidirectional interoperability
    report, external review/remediation report, or completed Protocol 1.0
    evidence manifest exists.
13. The Phase register's older H-03 wording mentions a supported-version window,
    but accepted H-03 explicitly assigns support durations and supported-version
    windows to H-14. Accepted H-03 controls and is not reopened here.
14. H-14's canonical affected range includes `GB-051` and `GB-052`, but their
    technical semantics remain H-13 and H-10 work. H-14 may govern only whether
    their separately produced evidence is sufficient for a release.
15. D2-05 expects identical cases against official and independent IUTs, while
    P1-01's production independent implementation depends on D2-05. That
    sequencing tension is a material human decision below, not an inferred
    early-validation rule.
16. The canonical plan definitively forbids a Protocol 1.0 claim before all
    graduation gates pass. It does not itself settle whether clearly marked
    draft, preview, prerelease, alpha/beta, or release-candidate artifacts may
    be distributed earlier.

## Affected-gap ownership ledger

H-14 affects every row below but does not absorb or close its technical owner.

| Gap | Primary work | Applicable decision ownership | H-14 boundary |
| --- | --- | --- | --- |
| `GB-050` | `D2-05` | H-14 | Select conformance release eligibility, evidence, and sequencing; do not create the harness or result schema |
| `GB-051` | `D2-03` | H-13 | Judge release sufficiency only; H-13 retains fixture/evolution semantics |
| `GB-052` | `D2-03` | H-10 | Judge release sufficiency only; H-10 retains byte/vector/cryptographic semantics |
| `GB-053` | `D2-04` | H-14 | Select malicious/failure corpus release gate; do not create the corpus |
| `GB-054` | `P1-01` | H-04 and H-14 | Select required independent production roles/profiles and evidence; H-04 retains protocol profile semantics |
| `GB-055` | `E-01` | H-02 and H-14 | Select supported package ownership/boundaries; H-02 retains role and authority separation |
| `GB-056` | `P1-04` | H-14 | Select release engineering, publication, signing, provenance, support, and authority rules |
| `GB-057` | `P1-04` | H-03 and H-14 | Select support/deprecation/EOL policy without changing H-03 identity or history |
| `GB-058` | `P1-02` | H-03 and H-14 | Select interoperability matrix/evidence without inventing compatibility |
| `GB-059` | `P1-03` | H-14 | Select review independence, remediation threshold, evidence, and release gate |
| `GB-060` | `P1-05` | H-03, H-04, and H-14 | Define future graduation authority and sign-off rule; do not execute graduation |

All eleven rows remain open. H-14 acceptance alone would close none.

## Accepted-decision dependency and conflict ledger

| Accepted record | Binding input to H-14 | Conflict H-14 must not introduce |
| --- | --- | --- |
| H-01 | Lifecycle history, consent, negotiated Connection authority, and historical object meaning are immutable | Support/publication action silently rewrites history, consent, or active authority |
| H-02 | Protocol roles and final Agent authorization floor are deployment-neutral; Platform may be stricter only | Platform/product/release infrastructure becomes protocol authority or an implementation becomes the oracle |
| H-03 | Sole release identity, ordering, explicit compatibility, immutable history, and no-new-Connection withdrawal rule; H-14 owns windows, notice, EOL, withdrawal authority, emergency/rollback governance, and active-Connection treatment | A second version system, compatibility inference, release-identity mutation, or automatic active-Connection revocation |
| H-04 | Mandatory/optional profile, facet, feature, extension, experiment, selection, and no-fallback semantics remain fixed | H-14 creates negotiation semantics; it may only select support/evidence coverage for already governed identities |
| H-05 | Authentication establishment, proof, binding, no fallback, revocation consequences, and secret handling remain fixed | A support profile weakens authentication or uses a provider/default as protocol law |
| H-06 | Committed Install Grant result and exact retry/concurrency semantics remain historical truth | Release/support change reinterprets a redemption or creates a second Connection result |
| H-07 | Active Connection changes use accepted suspension, closure, replacement, revocation, recovery, and terminal rules | Support loss silently edits active state or retention is shorter than surviving lifecycle dependencies |
| H-08 | Approval action binding, Decision evidence, single-use consumption, exact retry, and terminal history remain fixed | Release/support policy restores, widens, reuses, or deletes Approval authority |
| H-09 | Task states/terminality and Task/Result/Receipt/replay dependency horizons remain fixed | H-14 changes Task semantics or selects retention below surviving dependencies without accepted unavailable/indeterminate consequences |
| H-10 | Canonical bytes, domains, digests, signatures, proof profiles, JWK thumbprints, and historical meaning remain fixed | Supply-chain signing is treated as protocol proof, or support policy changes H-10 semantics |
| H-11 | Revocation/key/compromise history, freshness, durable floors, anti-rollback, fail-closed recovery, and historical verification remain fixed | Withdrawal erases history or archive/support policy weakens required evidence and security floors |
| H-12 | Mandatory transport, TLS/DNS, limits, errors, retry, cache, privacy, and no-secret observability floors remain fixed | A release profile silently undercuts a baseline or authorizes secret-bearing evidence/logs |
| H-13 | H-14 owns package/publisher/license, release/signing/procedure, support/EOL, production commitments, independent profiles, interoperability, review/remediation, release risk, authorization, and graduation | H-14 reinterprets openness, extension/schema identity, compatibility, experimental history, or protected Receipt meaning |

## Required non-equivalences

- **H-14 acceptance** is approval of governance rules, not use of those rules to
  authorize an exact release.
- **Publication** is distribution of an artifact; it is not proof of
  conformance, production support, or Protocol 1.0.
- **Package version** is SDK/package identity; it is not H-03 wire compatibility.
- **Artifact signature** proves integrity/provenance within its selected
  supply-chain scheme; it is not H-10 protocol-object authorization.
- **Independent cryptographic reproduction** proves byte/algorithm agreement;
  it is not D2-05 oracle independence or P1-01 protocol independence.
- **D2-05 harness independence** proves the suite is not an official-runtime
  oracle; it is not the full production independent implementation.
- **P1-01 implementation** is independently produced software; it still needs
  conformance and bidirectional interoperability evidence.
- **Conformance** is scoped to an exact role/release/profile/transport/feature
  claim; it is not external security review or risk acceptance.
- **Platform GA or release approval** is product/deployment authority; it is not
  H-14 approval, protocol release authorization, or P1-05 graduation.
- **Protocol 1.0 graduation** is the later P1-05 evidence-bound human act; no
  earlier status, package, approval date, or test run substitutes for it.

## Top-level governance alternatives

### Option A — Single accountable release authority

One designated protocol/release authority may accept release residual risk,
authorize an exact release, and later sign graduation. Producers and reviewers
may advise but the one authority is accountable.

- **Strengths:** simple ownership, fast routine/emergency decisions, low
  coordination cost.
- **Weaknesses:** concentration and key-person risk; weak protection from
  self-certification; absence can halt releases.
- **Required controls:** immutable evidence manifest, mandatory independent
  external review, public conflict disclosure, separate build/signing custody,
  and non-waivable gates.
- **H-02 risk:** unacceptable if the authority is merely the Platform/product
  operator and can convert its own implementation behavior into protocol law.

### Option B — Evidence-bound separation of duties

Protocol governance, artifact production, independent verification, external
security review, release-risk acceptance, artifact signing, release
authorization, publication, and final graduation are separated where a person
would otherwise approve their own work. One immutable evidence manifest binds
all acts.

- **Strengths:** strongest practical defense against self-certification and
  artifact substitution; clear audit trail; roles can be staffed independently.
- **Weaknesses:** more process, role-availability risk, and explicit handoffs.
- **Required controls:** conflict declarations, named role assignments per
  release, verified evidence digests, bounded delegation, and emergency rules
  that do not bypass non-waivable gates.

### Option C — Multi-party/quorum governance

Specified release, risk, withdrawal, and graduation acts require multiple
designated human approvals.

- **Strengths:** resists compromise or unilateral error by one authority.
- **Weaknesses:** highest availability and coordination cost; quorum size,
  membership, conflict rules, replacement, and deadlock handling all require
  human decisions not supplied by repository evidence.
- **Required controls:** explicit quorum, independent-member requirements,
  expiry, emergency continuity, and no vote reuse across releases.

### Option D — Product/Platform-controlled protocol release governance

The existing product or Platform release authority also controls protocol
release, risk, publication, and graduation.

- **Strengths:** reuses operational tooling and release staff.
- **Weaknesses:** highest risk that one implementation becomes protocol law;
  Platform GA can be confused with protocol maturity; independent implementers
  may lack equal governance standing.
- **H-02 constraint:** viable only if separately identified protocol authority,
  external evidence, and no-implementation-oracle rules prevent Platform policy
  from widening or replacing protocol governance. Without that qualification,
  this option conflicts with H-02.

## Comparative analysis and recommendation

| Criterion | Option A | Option B | Option C | Option D |
| --- | --- | --- | --- | --- |
| Accountability clarity | High | High | Medium/high | High operationally, low protocol independence |
| Anti-self-certification | Medium with controls | High | High | Low |
| Availability/speed | High | Medium | Low/medium | High |
| Governance complexity | Low | Medium | High | Medium |
| H-02 alignment | Conditional | Strong | Strong if independent | Weak/conditional |
| Emergency responsiveness | High | Medium/high with bounded path | Conditional on quorum | High |
| Independent implementer confidence | Medium | High | High | Low |
| Concentration risk | High | Low/medium | Low | High |

**Recommendation, not approval:** Option B best fits the canonical gaps and
accepted H-02 boundary because it binds decisions to exact evidence while
avoiding both single-person self-certification and an unspecified quorum.
Humans must still decide which roles may overlap, whether any action requires a
quorum, and who holds every role. The recommendation does not select Option B.

## Candidate authority and separation-of-duties matrix

The entries below describe candidate authority under Option B. They do not name
an officeholder or confer authority. Humans must decide permitted role overlap;
no quorum is presumed.

| Candidate role | May prepare | May verify | May approve | May sign artifacts | May publish | May accept release residual risk | May authorize exact release | May sign Protocol 1.0 graduation | Required independence/conflict constraint |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Protocol governance owner | Governance proposals and requirement trace | Decision completeness | H-* governance within granted authority | No by role alone | No | No by role alone | No by role alone | Candidate only if separately designated | Must not make implementation behavior normative |
| Package/registry owner | Package metadata and registry-control evidence | Ownership/control checks | Package administration within policy | No by role alone | Yes, only after exact authorization | No | No | No | Must prove registry/control authority; cannot choose protocol semantics |
| Release manager | Evidence inventory, candidate, checklist, manifest inputs | Completeness checks | No final self-approval | No by role alone | No | No | No | No | Cannot verify its own production evidence as independent |
| Artifact builder/producer | Reproducible artifacts, SBOM, provenance | Build reproducibility with another verifier | No | Build identity/attestation only if selected | No | No | No | No | Build identity remains distinct from approval and release authorization |
| Artifact signer/provenance authority | Signing statement for exact digests | Key/purpose and digest checks | No governance approval | Yes, for authorized exact artifacts | No by role alone | No | No | No | Supply-chain keys/domains must be separate from H-10 protocol proof keys |
| Independent evidence verifier | Conformance/interoperability/evidence audit | Yes | Verification result only | May sign verification report | No | No | No | No | Must disclose implementation, employment, financial, and authorship conflicts |
| External review coordinator | Review scope, materials, remediation register | Process completeness | No finding closure by role alone | May sign coordination record | No | No | No | No | Cannot substitute for independent reviewer |
| External security reviewer | Findings and retest evidence | Findings/remediation in approved scope | Finding closure within review role | May sign review report | No | No | No | No | Must satisfy selected independence criteria |
| Security response owner | Vulnerability triage, embargo, incident response | Remediation readiness | Emergency declaration if humans grant it | May sign advisory/incident evidence | Coordinated disclosure if granted | No by role alone | No except separately granted emergency authority | No | Must not use embargo or severity changes to evade release gates |
| Support/deprecation owner | Support matrix, notices, migration and EOL plan | Current support metadata | Support action within granted policy | May sign support metadata if granted | May publish support metadata | No | No | No | Cannot rewrite H-03 identity/history or H-07 active authority |
| Residual-risk approver | No implementation evidence | Verify risk packet completeness | Exact permitted residual-risk acceptance | May sign risk record | No | Yes, only for permitted classes | No unless separately granted | No unless separately granted | Must not own the unresolved work or declare failure passing |
| Release authorizer | No artifact production by role alone | Exact evidence manifest and gate status | Exact release authorization | Signs authorization, not necessarily artifacts | No by role alone | Only if humans combine roles | Yes, once for named digests | No unless separately designated later | Authorization is release-specific, expires on material change |
| Publication operator | Publication transaction | Registry result/digest match | No | Registry transport signature only if applicable | Yes, after authorization | No | No | No | Cannot replace, retag, or mutate authorized artifacts |
| Protocol 1.0 graduation signer | No evidence production by role alone | P1-05 completion and evidence manifest | Final dated 1.0 graduation act | Signs graduation statement | No by role alone | Records accepted graduation residual risks if granted | No implied package publication | Yes | Human must decide independence from H-14 approver and release authorizer |

## Package, ownership, and license evidence

Current repository names are candidates only:

| Current package | Current version | Current publication evidence | Current dependency boundary |
| --- | --- | --- | --- |
| `@ghostbridge/protocol-core` | `0.1.0-draft` | Private, `UNLICENSED`, registry ownership unverified | AJV plus historical schema path; implementation and schema concerns combined |
| `@ghostbridge/native-client` | `0.1.0-draft` | Private, `UNLICENSED`, registry ownership unverified | Depends on protocol-core and Trust; dev-depends on Native Agent |
| `@ghostbridge/native-agent` | `0.1.0-draft` | Private, `UNLICENSED`, registry ownership unverified | Depends on protocol-core and Trust; dev-depends on Issuer |
| `@ghostbridge/trust` | `0.1.0-draft` | Private, `UNLICENSED`, registry ownership unverified | Depends on protocol-core |
| `@ghostbridge/issuer` | `0.1.0-draft` | Private, `UNLICENSED`, registry ownership unverified | Depends on protocol-core and Trust |
| `@ghostbridge/conformance` | `0.1.0-draft` | Private, `UNLICENSED`, registry ownership unverified | Imports official protocol-core, Client, and Trust; not future D2-05 authority |
| `@ghostbridge/inspector` | `0.1.0-draft` | Private, `UNLICENSED`, registry ownership unverified | Depends on official Client, protocol-core, and Trust |

The root, backend, frontend, external-agent, and protocol example workspaces are
also private. They are not silently included in a future public protocol
artifact set, and their differing package versions do not determine H-03 wire
identity or compatibility.

No evidence establishes that the npm `@ghostbridge` scope, any listed package
name, a trademark, or another external registry namespace is available,
reserved, or controlled by an accountable publisher. Verification of registry
control and legal ownership is required before an option using those names can
be accepted or exercised.

### Package ownership and naming models

| Model | Public artifact shape | Ownership requirement | Advantages | Costs/risks |
| --- | --- | --- | --- | --- |
| P-A — Preserve current scoped role packages | Publish selected current `@ghostbridge/*` names after E-01/E-03 | Verify scope and every package name; designate package/registry owner | Familiar repository mapping and separate Client/Agent/Trust roles | Availability/control unknown; current boundaries and manifests are not publishable |
| P-B — Verified new scope with role packages | Publish equivalent role-separated packages under a newly verified scope | Human-approved owner, registry control, naming/trademark review | Avoids relying on unverified current scope and can start with clean public boundaries | Naming migration, discoverability, and ecosystem churn |
| P-C — Minimal public core plus separate optional implementations | Publish specification-derived types/validation and independently versioned Client/Agent/Trust packages | Separate owner/support contract for each artifact | Strong specification/implementation distinction; optional packages can evolve independently | More artifacts, support matrices, and version coordination |
| P-D — Private or controlled distribution | Keep packages private; distribute only approved bundles or controlled registry artifacts | Designated private publisher and access/support contract | Avoids premature public-name and license commitments | Conflicts with broad public SDK adoption goals; does not by itself satisfy independent implementation or open-protocol expectations |

### License candidates

License selection is a human/legal governance choice. The comparison is general
governance evidence, not legal advice or a conclusion about ownership,
patents, notices, trademarks, dependencies, or suitability.

| Candidate | Patent treatment to review | Adoption/contribution implications | Notice/distribution implications | Missing pre-approval evidence |
| --- | --- | --- | --- | --- |
| L-A — MIT | No express patent license in the short text; accountable legal review needed | Simple, widely familiar permissive use; contribution terms still need governance | Copyright/license notice preservation | Copyright ownership, contributor authority, dependency compatibility, trademark and registry rights |
| L-B — Apache-2.0 | Express patent terms and termination provisions require legal review | Permissive adoption with more explicit contribution/patent structure | License and applicable NOTICE handling | Same ownership/dependency evidence plus NOTICE inventory and patent review |
| L-C — Dual MIT/Apache-2.0 | Users choose either license; legal consistency and contributor grant must be reviewed | Broad permissive compatibility but more governance/documentation | Both license paths and notices must be maintained coherently | Authority to dual-license every file and dependency compatibility |
| L-D — Proprietary/non-public package distribution | Contractual rights and patent treatment depend on separate terms | Controlled support/distribution; may limit independent adoption | Contract, access, redistribution, and termination terms | Evidence that this model is consistent with protocol openness goals and legal ownership |
| L-E — Split licensing | Specification/assets and SDKs use separately approved licenses | Can distinguish standards material, test data, and implementations | Per-artifact notices and compatibility must be explicit | Exact asset boundaries, generated content rights, dependency terms, contribution policy |

**Proposal recommendation, not approval:** evaluate L-B and L-C first for public
protocol/SDK artifacts because explicit patent treatment may be material to an
interoperable ecosystem, while retaining L-D only as a real alternative if
humans choose controlled package distribution. Accountable legal review is
required before any license choice or public distribution.

## Release and publication classes

This table proposes H-14 governance classes without creating a competing H-03
identifier. A publication class describes release governance and evidence; it
is not a release identity, version, compatibility identity, or status syntax.
Every distributed artifact would retain its exact H-03 release identity/status
and immutable historical meaning.

| Candidate class | Public distribution choice | Required marking | Production-support claim | Minimum proposed gates | Candidate authorizer/signer | Support expectation | Migration and rollback/withdrawal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Internal development build | Not public by default | `internal`, non-release, exact source digest | Prohibited | Build integrity and no-secret checks | Internal build authority | None outside named environment | Destruction/rebuild allowed; no public compatibility promise |
| Public draft | Human choice: allow or disallow | Exact H-03 release identity/status, with the H-14-selected public-draft class and experimental/no-1.0 warning; the class is not an identity | Prohibited unless an explicit bounded experimental support contract is separately approved | Coherent draft artifacts, known-gap disclosure, integrity digest, minimum security scan | Designated draft publisher and signer | Best-effort or explicit bounded contract only | Withdrawal notice and archived historical identity required |
| Preview/alpha/beta prerelease | Human choice | Exact H-03 prerelease identity/status permitted by H-03, with the H-14-selected preview class and conspicuous instability/support metadata; the class creates no version syntax | Prohibited by default; human may define a narrowly scoped non-production support promise | Draft gates plus applicable schemas/assets, bounded conformance, vulnerability intake, support statement | Prerelease authorizer and artifact signer | Exact temporary window or no-support statement | Migration/withdrawal instructions and no silent upgrade |
| Release candidate | Human choice | Exact H-03 prerelease identity/status permitted by H-03, together with the H-14-selected RC publication class; H-14 creates no independent RC version syntax or compatibility identity; `NOT PROTOCOL 1.0` until P1-05 succeeds | No final production support claim; evaluation support may be explicit | Feature/wire freeze, D1/D2 candidate assets, conformance, supply-chain evidence, review in progress or complete as selected | RC authorizer and signer | Time-bounded evaluation support | Required migration, rollback, withdrawal, and artifact freeze |
| Security emergency build | Human choice; never generic bypass | Exact H-03 identity/status permitted by H-03, with the H-14-selected emergency publication class and advisory; the class creates no release identity | Only the exact emergency support commitment | Non-waivable integrity, identity, relevant conformance/security regression, authorization, and later retrospective review | Emergency authority plus signer as humans decide | Temporary, explicit scope/window | Mandatory rollback/roll-forward, key compromise handling, full re-gating for later stable evidence |
| Protocol 1.0 release | Human-selected ordering with P1-05. Exact candidate artifact bytes may be prepared or, only if the accepted policy permits it, pre-positioned/published under an explicitly non-1.0 status before graduation; no artifact, publication, tag, support state, or communication may claim Protocol 1.0 until the P1-05 graduation act succeeds | Exact H-03 identity/status governed only by H-03, with an evidence-manifest reference and the H-14-selected publication class; the class creates no final identity or status | Permitted only as approved in support policy and only after successful P1-05 for a Protocol 1.0 claim | Every Phase/P1/gap/conformance/interoperability/review/release gate | Exact release authorizer, signer, publisher, and later graduation signer | Human-approved production support only after successful P1-05 graduation | Rehearsed migration, rollback, withdrawal, archive, and incident paths; P1-05 failure leaves any permitted pre-positioned artifact explicitly non-1.0 |
| Post-1.0 maintenance/security release | Human-approved under H-03/H-13 change classification | Exact new or unchanged H-03 identity/status only as those decisions permit, with the H-14-selected maintenance publication class; the class creates no identity or compatibility meaning | Only within current support matrix | Change-class-specific normative, compatibility, conformance, security, supply-chain, and authorization gates | Per-release authorities | Per selected maintenance policy | No in-place semantic rewrite; explicit supersession/errata/release path |

Humans must still decide whether publication of the exact candidate artifact
bytes precedes, coincides with, or follows the P1-05 graduation act. If an
accepted policy later permits pre-positioning or publication before graduation,
the artifact remains explicitly non-1.0 unless and until P1-05 succeeds; a
failed P1-05 act cannot leave its artifact, tag, support state, or communication
described as Protocol 1.0. H-03 alone governs the applicable final
identity/status handling, compatibility, and immutable history. H-14 neither
defines a transition nor creates a second release-identity system.

### Prerelease-publication alternatives

- **R-A — No public protocol artifacts before P1-05.** Lowest confusion and
  support risk, but prevents broad independent feedback and makes P1-01 harder
  to conduct from public assets.
- **R-B — Public drafts and RCs with strict non-1.0 status.** Allows review and
  independent implementation while requiring exact H-03 status, immutable
  artifacts, conspicuous disclaimers, minimum security/integrity gates, a
  support statement, and withdrawal/archive procedure.
- **R-C — Public specification/test assets, private SDK packages until P1-05.**
  Supports independent implementation without implying package production
  readiness, but gives less real package-consumer feedback.
- **R-D — Invite-only preview distribution.** Reduces public confusion while
  creating access, confidentiality, and reproducibility concerns.

**Recommendation, not approval:** R-C, followed by an explicitly authorized RC
under R-B when D1/D2 candidate assets and minimum security gates exist, best
supports clean-room implementation without implying Protocol 1.0. Humans must
decide whether any prerelease may be publicly installed or production-used,
what support promise applies, and which exact gates precede it.

## Governance-level release artifact inventory

No artifact in this table is created by H-14.

| Artifact | Candidate owner | Producer | Verifier | Signer if any | Immutable identity/digest | Draft | RC | Protocol 1.0 | Retention/archive expectation | Disclosure class |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Normative specification | Protocol governance owner | Authorized specification editors | Requirement/decision reviewers | Release-manifest signer, not editor key | H-03 release plus commit and content digest | Coherent draft if published | Required/frozen | Required | Permanent immutable release archive | Public |
| Schema bundle | D2-01 asset owner | Schema producers | Independent validators and semantic-case reviewers | Asset-manifest signer | Bundle and per-schema identities/digests | If draft messages are distributed | Required | Required | At least historical object support; preferably permanent | Public |
| State-machine bundle | D2-02 asset owner | Model authors/generators | Independent transition reviewers/runners | Asset-manifest signer | Machine IDs and digests | Optional until represented as draft | Required | Required | Historical release lifetime | Public |
| Golden fixtures | D2-03 asset owner under H-13 semantics | Fixture authors | Independent consumers | Asset-manifest signer | Fixture manifest and file digests | Recommended | Required | Required | Historical conformance lifetime | Public except governed sensitive cases |
| Cryptographic vectors | D2-03 asset owner under H-10 | Independent producers | Cross-language producers/verifiers | Asset-manifest signer | Exact bytes, vector IDs, digests | Recommended | Required | Required | Permanent or algorithm-history lifetime | Public test-only keys; no production secret |
| Malicious/failure/compatibility corpus | D2-04 asset owner | Security/compatibility authors | Independent runners and reviewers | Asset-manifest signer | Corpus/version/profile digests | Selected safe subset | Required | Required | Supported/historical matrix lifetime | Public by default; embargoed exploit detail may be private temporarily |
| Conformance runner | D2-05 suite owner | Harness implementers | Forbidden-dependency and independent runner reviewers | Suite-release signer | Runner source/artifact digest | Experimental label | Required | Required | Every claimed conformance result lifetime | Public |
| Conformance result schema | D2-05 suite owner | Schema authors | Independent validators | Suite-release signer | Schema ID/digest | If results are published | Required | Required | Permanent versioned archive | Public |
| Official Client SDK/package | Package owner | E-01/E-03 implementation team | Packed-artifact conformance and consumer tests | Package/artifact signer | Package version, tarball digest, source/provenance | Human choice | Required if claimed | Required if in 1.0 artifact set | Support window plus provenance/archive | Public or controlled per package decision |
| Official Agent/server package | Package owner | E-01/E-03 implementation team | Packed-artifact conformance and consumer tests | Package/artifact signer | Package version, digest, source/provenance | Human choice | Required if claimed | Required if in 1.0 artifact set | Support window plus provenance/archive | Public or controlled |
| Trust artifact/package | Trust package owner | E-01/E-03 implementation team | Trust conformance/vector verification | Package/artifact signer | Package version, digest, source/provenance | Human choice | Required if separately claimed | Required if selected 1.0 roles depend on it | Verification/support history | Public or controlled |
| Independent implementation evidence | P1-01 evidence owner | Independent team | Clean-room auditor and conformance verifier | Independent evidence signer | Repository/artifact/design-log/result digests | Not a draft substitute | Required for final RC gate as selected | Required | Permanent graduation-evidence archive | Public summary; private clean-room detail auditable |
| Interoperability reports | P1-02 evidence owner | Official and independent operators | Independent report/evidence verifier | Report signer(s) | Matrix/run/environment/artifact digests | Optional early feedback | Required | Required | Supported matrix plus permanent graduation snapshot | Public safe report |
| Security review/remediation report | P1-03 evidence owner | Independent reviewer and remediation owners | Reviewer/retest verifier | Reviewer and closure signer(s) | Scope, finding, fix, retest, artifact digests | Optional early review | Required threshold as selected | Required | Permanent protected/public split | Public summary; sensitive annex restricted/embargoed |
| Support/deprecation policy | Support owner | P1-04 policy authors | Governance/legal/operations reviewers | Support-metadata signer | Revision, effective date, scope, digest | Required if distributed | Required | Required | Permanent history; current status separately published | Public |
| Migration/changelog | Package/protocol owners | Editors and implementation teams | Compatibility reviewers | Release-manifest signer | Release-specific digest | Required for material draft change | Required | Required | Release lifetime | Public |
| SBOM | Artifact producer/supply-chain owner | Reproducible build process | Dependency/provenance verifier | Attestation signer | Format/version/artifact-bound digest | Recommended for distributed binaries/packages | Required | Required | Artifact support plus incident horizon | Public unless justified restricted metadata |
| Provenance/attestation | Supply-chain owner | Trusted build system | Reproducibility and identity verifier | Build/attestation identity | Source/build/material/artifact digests | Recommended | Required | Required | Artifact support plus incident horizon | Public safe form |
| Release manifest | Release manager/governance owner | Manifest assembler | Independent evidence verifier | Release-manifest signer | Exact H-03 identity and all artifact digests | Required for public coherent bundle | Required | Required | Permanent immutable | Public |
| Evidence manifest | Release authorizer/governance owner | Evidence assembler | Independent evidence-hash auditor | Evidence/authorization signer | All gate evidence and authorization digests | Optional for early draft | Required | Required | Permanent immutable | Public safe index with controlled evidence links |
| Artifact signatures | Artifact-signing authority | Signing service/operator | Independent signature/key-state verifier | Selected supply-chain key | Exact artifact digest, purpose, time, key identity | Required if public policy selects it | Required | Required | Artifact and compromise-history lifetime | Public |
| Graduation report | P1-05 governance owner | Graduation evidence team | Independent evidence-hash auditor | Graduation signer | Exact evidence-manifest digest and dated decision | No | No | Required | Permanent immutable | Public safe report |

## Release and evidence manifest decision

An immutable release/evidence manifest is conceptually required to prevent a
reviewed specification, tested SDK, signed package, and published support policy
from referring to different revisions. H-14 decides the conceptual binding; a
later separately authorized phase must create its schema and instances.

| Binding | Proposed conceptual requirement | Failure consequence |
| --- | --- | --- |
| H-03 release identity/status | Exact immutable release identifier and publication status | Manifest invalid; no inferred identity from package version |
| Source/specification | Source commit and exact specification file/tree digests | Review cannot be transferred to changed prose |
| Schema bundle | Bundle identity plus every included schema identity/digest | No schema-complete release claim |
| State machines | Every applicable machine identity/digest | No lifecycle-complete release claim |
| Fixtures/vectors/corpora | Manifest/version and exact asset digests | Conformance evidence becomes mismatched/invalid |
| Conformance suite | Suite, runner, result schema, adapter contract, and digest | Results cannot support release eligibility |
| Official packages | Exact packed artifact versions/digests, source, runtime matrix, and provenance | Workspace tests or later package bytes cannot substitute |
| Independent implementation | Exact implementation artifact/source/design-log/clean-room evidence and claimed roles | P1-01 incomplete or stale |
| Interoperability | Exact matrix, environments, participants, artifacts, results, and report digests | P1-02 incomplete or stale |
| Security review/remediation | Scope, reviewer identity/independence, reviewed artifact digests, findings, fixes, retests | P1-03 incomplete or invalidated by change |
| SBOM/provenance | Exact artifact-bound SBOM and build attestations | Supply-chain gate incomplete |
| Support policy | Exact policy revision/effective date and support-matrix digest | No support/release claim |
| Residual-risk record | Exact open risks, rationale, scope, expiry/revisit, approver, and disclosure class | Release authorization incomplete |
| Release authorization | One dated authorization bound to the complete manifest digest | No publication as an authorized release |
| Publication evidence | Registry/location, immutable digest match, time, and operator evidence | Publication unverified or artifact substitution suspected |
| Graduation sign-off | Later P1-05 dated statement bound to the audited evidence-manifest digest | No Protocol 1.0 claim |

The manifest must be append-only or superseded through a new identity. An
artifact byte change, reviewed source change, dependency change that affects the
artifact, evidence replacement, support-policy material change, or signature
replacement invalidates the applicable authorization and triggers the selected
re-gating rule. A mutable `latest` URL, tag, package dist-tag, workspace path,
or Git branch is never release identity or immutable evidence.

## Release signing and supply-chain choices

### Signing-policy alternatives

- **S-A — Central offline release signer.** A designated supply-chain key signs
  the exact release/evidence manifest and artifacts. Simple verification, but
  concentrated custody and recovery risk.
- **S-B — Trusted build attestation plus separate release authorization
  signature.** Build identity attests source/materials/process/artifact while a
  distinct human-governance identity signs authorization. Strong separation,
  but more verification and key lifecycle.
- **S-C — Multi-signature release.** Multiple designated identities sign the
  same manifest. Strong compromise resistance, but quorum, tooling, recovery,
  and availability are unresolved.
- **S-D — Registry-native integrity only.** Relies on package-registry account
  and registry digests. Operationally easy, but insufficient by itself to bind
  specification, schemas, conformance, review, and support evidence.

**Recommendation, not approval:** S-B, with separately governed build,
artifact-signing, and release-authorization identities, best expresses the
evidence boundary. Humans must choose key technologies and custody procedures.

### Proposed non-negotiable supply-chain properties

These are recommended H-14 policy choices, not accepted rules:

1. Every distributed release artifact is content-addressed and tied to exact
   source, build inputs, dependency lock, runtime/toolchain, SBOM, and
   provenance.
2. Release-manifest signing keys and domains are purpose-specific and never
   silently reused as H-10 request, Approval, Receipt, issuer, Trust, or other
   protocol-object proof keys.
3. Build/attestation identity, artifact-signing identity, release authorization,
   and registry publication identity are distinguishable even if humans later
   permit some role overlap.
4. Signing custody defines access, hardware/software protection as selected,
   backup, rotation, expiry, revocation, compromise, emergency replacement,
   audit, and public verification material.
5. Key compromise triggers publication freeze, incident handling, affected
   artifact identification, signature/support metadata update, replacement
   authorization, and preservation of historical evidence. Old artifacts are
   not mutated in place.
6. Reproducibility is measured against a declared environment and permitted
   nondeterminism. A failed reproducibility check is explicit evidence, not
   silently waived.
7. SBOM and provenance bind the actual published bytes, not merely workspace
   source or a different build.
8. Dependency and vulnerability intake covers direct/transitive production
   dependencies, build tooling, conformance tooling, and signing/publishing
   systems under the selected disclosure policy.
9. Rollback and roll-forward are rehearsed against H-03 compatibility and
   H-07/H-11 anti-rollback constraints. Rollback never selects a withdrawn or
   security-forbidden release merely because its version is older.
10. Registries and publishers prohibit mutable artifact replacement. A fix uses
    a new H-03/package identity as applicable and a new evidence/authorization
    record.

External supply-chain standards may inform later implementation, but none is
selected as protocol law by this proposal.

## Evidence and release gate matrix

This matrix applies prospectively to distributions governed by the proposed
H-14 publication-class model. Internal/private development work does not need
an H-14 publication act merely to exist, and already-published repository
material remains historical evidence rather than being retroactively converted
into an H-14 release. Any new public protocol artifact distribution under this
model first requires H-14 to be `ACCEPTED`, and then requires the separately
selected class-specific evidence, exact release authorization, and publication
execution. H-14 acceptance alone publishes and authorizes nothing. The human
choice left open is whether an authorized distribution may occur before P1-05,
not whether accepted H-14 governance may be bypassed.

| Gate | Public draft candidate | RC candidate | Protocol 1.0 | Owner/executor | H-14 result if absent |
| --- | --- | --- | --- | --- | --- |
| Accepted H-01 through H-14 decisions | H-01–H-13 as applicable; H-14 must be `ACCEPTED` before any new public distribution under this model, but that acceptance is not distribution authorization | Required; H-14 acceptance is not RC authorization | Required; H-14 acceptance is not release, publication, or graduation | Protocol governance | No new public distribution governed by missing H-14; no claim governed by another missing decision |
| Phase 15D.1 normative exit | May be incomplete only with exact draft warning and scope | Required/frozen candidate | Required complete | D1 owners | Blocks RC/1.0 as selected; always blocks 1.0 |
| Phase 15D.2 executable exit | May be incomplete with exact asset inventory | Required/frozen candidate | Required complete | D2 owners | Blocks RC/1.0 as selected; always blocks 1.0 |
| H-10/D2-03 vector evidence | If crypto claim distributed | Required | Required | D2-03/H-10 evidence owners | No crypto-complete or final claim |
| D2-05 conformance suite integrity | Experimental result only if incomplete | Required | Required | D2-05 suite owner/verifiers | No release conformance eligibility |
| Official packed artifact conformance | If package distributed, exact partial status | Required for claimed packages | Required for included packages | E-01/E-03 teams | Workspace tests cannot substitute |
| Independent harness/oracle validation | Recommended | Required | Required | D2-05 independent verifier | `GB-050` remains open |
| P1-01 production independent implementation | Not required for clearly marked early draft | Required before final 1.0 RC designation as humans decide | Required | Independent team/auditor | `GB-054` remains open; blocks 1.0 |
| P1-02 interoperability | Optional early report, never inferred | Required before final 1.0 RC as humans decide | Required | P1-02 operators/verifier | `GB-058` remains open; blocks 1.0 |
| P1-03 external review/remediation | Minimum draft security review may be selected | Required threshold for final RC | Required complete | Independent reviewer/remediation verifier | `GB-059` remains open; blocks 1.0 |
| P1-04 support/release/supply-chain policy | Required for any public support promise | Required and rehearsed | Required and rehearsed | P1-04 owners | No supported release claim |
| Artifact integrity/SBOM/provenance | Minimum digest for any public bytes | Required | Required | Supply-chain owners/verifiers | No authorized coherent artifact set |
| Vulnerability intake/incident response | Required for publicly distributed security-relevant artifacts | Required | Required | Security response owner | No supported public distribution |
| Immutable release/evidence manifest | Minimal draft manifest if distributed | Required | Required and independently audited | Release manager/verifier | No evidence-bound authorization |
| Release-specific residual-risk record | Known draft risks disclosed | Required | Required | Risk approver | No authorization |
| Release authorization | Required for public artifact class selected by humans | Required | Required | Release authorizer | Publication is unauthorized |
| P1-05 graduation sign-off | Prohibited | Prohibited | Required after every gate | Graduation signer | No Protocol 1.0 claim |

## Support-policy scope matrix

Each row requires a concrete human-selected policy. Package and protocol support
are related but not interchangeable.

| Support dimension | Identity that controls | Minimum questions | Binding accepted constraint |
| --- | --- | --- | --- |
| H-03 wire release | Exact H-03 release identity | Supported releases, notice, deprecation, withdrawal, EOL, security exception, new/active Connection treatment | Identity/history immutable; withdrawn cannot create new Connections |
| Schema bundle | Release-scoped bundle/per-schema IDs | Reader/writer window, validation fixes, archive availability | H-13 compatibility and no reinterpretation |
| Official SDK package | Package version plus supported H-03 releases | Runtime/OS matrix, API support, security fixes, wire compatibility, migration | Package version never implies wire compatibility |
| Language/runtime | Named runtime and OS versions | Minimum/maximum versions, maintenance/EOL, security provider constraints | Cannot silently narrow a claimed interoperability profile |
| Authentication profile | Exact H-04/H-05 identifier | Establishment/provider support, verification-only state, deprecation/withdrawal | No fallback or secret-handling weakening |
| Cryptographic profile/algorithm | Exact H-10 profile ID | Required, optional, verification-only, deprecated, withdrawn, archive verifier | Old profile meaning immutable; no nearby-profile trial |
| Extension/experiment | Exact H-13 identity/status | Selectability, support, graduation/removal, data/history availability | No alias, reassignment, in-place graduation, or history rewrite |
| Trust/revocation evidence | Exact H-11 issuer/key/history identifiers | Online availability, snapshot/key history, archive/recovery service level | Anti-rollback/freshness/fail-closed and historical dependencies remain |
| Conformance suite/result | Suite/result schema version and digest | Active suites, historical result verification, rerun conditions | A result remains scoped to exact artifact/release/profile/role |

### Duration-policy alternatives

The numbers below are candidate policy values for comparison only. None is
settled protocol law.

| Model | Candidate wire support | Candidate SDK support | Notice/deprecation candidate | Historical verification/archive | Strengths | Risks |
| --- | --- | --- | --- | --- | --- | --- |
| W-A — Rolling N/N-1 | Current final plus immediately previous final; at least 12 months after successor | Current major/minor plus previous supported line for at least 12 months | At least 6 months ordinary notice | Permanent immutable spec/assets; operational verification for stated support window | Simple matrix and bounded cost | Calendar uncertainty; frequent releases can shorten practical support unless minimum floor controls |
| W-B — Fixed-term | Each final wire release 24 months; critical fixes during term | Included SDK line 18 months | 12 months ordinary notice, with security exception | Permanent release archive; verification services at least support term plus surviving dependencies | Predictable dates | Higher parallel-version burden; arbitrary dates may not match ecosystem cadence |
| W-C — LTS plus rapid channel | Designated LTS 36 months; non-LTS 12 months; prereleases use separate limited policy | LTS SDK 24 months; rapid SDK 12 months | LTS 12 months, rapid 6 months | Permanent immutable assets; LTS historical verification longer as dependencies require | Balances stability and evolution | LTS designation governance, dual matrices, and support capacity |
| W-D — Evidence/dependency based | No fixed promise beyond explicit per-release schedule; EOL only after successor, migration, and dependency conditions | Per-package schedule | Per-release minimum chosen before publication | Never shorter than H-07/H-09/H-11 surviving dependency horizon | Closely follows actual safety constraints | Low predictability and risk of indefinite support without hard ceilings |

**Recommendation, not approval:** W-C with an explicit dependency floor from
W-D offers predictable support while preserving H-07/H-09/H-11 history. Humans
must approve exact periods, resources, and which releases may be LTS. No period
may expire required historical evidence merely because its calendar ended.

## Deprecation, withdrawal, EOL, and active Connections

| State | New Connection eligibility | Active Connection implication | History/verification | Required governance act |
| --- | --- | --- | --- | --- |
| Supported | Eligible subject to all accepted selection/security rules | Continues only while H-07 authority intersection permits | Required per support policy | Published signed support metadata |
| Deprecated | Eligible or ineligible only as selected policy states; warning mandatory | No silent mutation; warning/migration may apply | Original meaning and required evidence retained | Notice, successor/migration, date, support promise |
| Withdrawn | Ineligible for new Connections by accepted H-03 | Human choice below; never silently revoked solely by label | Original identity/history retained | Authorized withdrawal, reason, effective time, active-treatment rule |
| Security-forbidden | Ineligible for affected use | H-07/H-11 suspension, denial, replacement, or revocation as applicable to authoritative security evidence | Security/compromise history retained | Security authority, incident/advisory, exact scope, recovery path |
| EOL/unsupported | No support promise; new eligibility must be explicitly prohibited or otherwise stated consistently | No silent state edit; unsupported operation must fail safely under selected policy | Immutable archive; verification may become explicitly unsupported/indeterminate only under accepted rules | EOL notice, archive, migration, support-state metadata |
| Archived/historical-only | Not eligible for new governed authority | No new operation; historical reads only as authorized | Historical meaning retained; service availability per archive policy | Archive identity, access, integrity, and retention record |

### Active-Connection treatment alternatives

- **A-C1 — Natural expiry with warnings.** Ordinary deprecation/withdrawal bars
  new Connections but active Connections continue until their existing expiry,
  closure, or another accepted H-07/H-11 cause. Best availability, longest
  exposure to unsupported behavior.
- **A-C2 — Bounded mandatory replacement.** Publish a deadline; active
  Connections remain unchanged until H-07 suspension/closure/replacement at the
  boundary. Better ecosystem convergence, with migration and outage risk.
- **A-C3 — Security-tiered hybrid.** Ordinary deprecation follows natural expiry
  or bounded replacement; ordinary withdrawal uses a human-selected deadline;
  authoritative security withdrawal may immediately suspend/deny or revoke only
  through H-07/H-11 semantics and exact affected scope.
- **A-C4 — Immediate end of support without lifecycle action.** Support ceases,
  but active authority is not automatically mutated. Implementations fail safely
  when dependencies are unavailable. Operationally simple but can strand
  Connections in indeterminate/unsupported states.

**Recommendation, not approval:** A-C3 best preserves H-03/H-07/H-11 while
allowing urgent security response. Humans must decide deadlines, who declares
security withdrawal, whether active Connections suspend or revoke for each
cause, and the required replacement/appeal/recovery evidence.

## Emergency release and rollback alternatives

| Question | E-A — No shortened path | E-B — Bounded emergency path | E-C — Broad emergency discretion |
| --- | --- | --- | --- |
| Declaration | Normal release authority only | Designated security response plus exact emergency authorizer | Designated operator |
| Gates shortened | None | Only named timing/process gates; technical non-waivable gates remain | Any gate the authority chooses |
| Never-waivable candidate | All normal gates | Exact H-03 identity, artifact integrity/provenance, targeted conformance/regression, no known critical/high blocker, authorization, rollback/roll-forward, no-secret evidence | None beyond repository integrity |
| Support status | Normal | Explicit temporary emergency support window | Ad hoc |
| Retrospective review | Normal | Mandatory dated review and full re-gating | Optional |
| May count for 1.0 | Only after normal completion | Never without complete ordinary P1-05 re-gating | Potentially, creating bypass risk |
| Main tradeoff | Slow incident response | Controlled speed with evidence debt | Highest bypass and self-certification risk |

**Recommendation, not approval:** E-B. Emergency status must be scoped to an
identified vulnerability/artifact set, expire, preserve evidence, and never
become routine. A rollback must pass H-03 compatibility and H-11 anti-rollback
checks; an older, withdrawn, compromised, or semantically incompatible release
is not a safe rollback merely because it was previously published.

## Independent evidence classes

These evidence classes are cumulative and non-substitutable:

1. **H-10/D2-03 cryptographic reproduction:** independent
   canonicalizers/framers/encoders and cryptographic tooling agree on exact
   vectors. It does not implement lifecycle, authority, transport, or storage.
2. **D2-05 harness/oracle/IUT independence:** independent runners, validators,
   sentinel or full IUTs, forbidden-dependency scans, and deliberately bad IUTs
   prove the suite is not an official-runtime oracle. It is not automatically a
   production implementation.
3. **P1-01 full clean-room implementation:** a production-capable implementation
   of the human-selected mandatory roles/profiles, developed from the public
   specification/assets without official implementation source or runtime
   dependency. It must independently conform and interoperate.

A report must state which class it satisfies. A cryptographic reproducer cannot
count as P1-01; a sentinel IUT cannot claim production support; and a full
independent implementation cannot make an official-dependent oracle conformant.

## Required independent implementation alternatives

| Model | Required roles | Production-capable threshold | Trust coverage | Main strength | Main weakness |
| --- | --- | --- | --- | --- | --- |
| I-A — Independent Client + Agent | One independent Client and Agent/server for mandatory H-04 facets | Durable Agent stores, restart/concurrency, selected H-12 transport/security, supported auth/profile set | Common vectors only | Exercises both wire directions at lower cost | Trust/revocation implementation ambiguity may remain hidden |
| I-B — Client + Agent + Trust verifier | I-A plus independent Trust verification library/role | All I-A requirements plus H-10/H-11 current and historical verification | Independent verifier consumes canonical issuer/key/revocation evidence | Covers critical security semantics without requiring a new service | May still share official Trust service deployment assumptions |
| I-C — Client + Agent + independently operated Trust service | I-B plus separately implemented/operated Trust service role | Production service durability, bootstrap, rotation, revocation, history, failure recovery | Full independent Trust producer/service and verifier | Strongest cross-organization evidence | Highest scope, cost, key custody, and operations burden |
| I-D — Role/profile-based matrix | Humans select exact mandatory 1.0 role/facet coverage, with at least one independent producer and consumer for every mandatory interaction | Every claimed production role passes durable/restart/security/conformance requirements | Exact role matrix may select verifier or service coverage | Traceable to H-04 and adaptable without inventing profiles | Requires a precise matrix and can be gamed if minimum coverage is too narrow |

**Recommendation, not approval:** I-D with a minimum equivalent to I-B—an
independent Client, Agent/server, and Trust verification role for every
mandatory 1.0 facet—best balances scope and ambiguity detection. Humans must
decide whether an independently operated Trust service is mandatory.

### Proposed production-capable and clean-room threshold

An accepted independent profile should require all of the following, subject to
human disposition:

- a separate repository or clearly isolated project and an independent design
  log, dependency inventory, contributor list, and source-provenance record;
- no official Ghost Bridge runtime, private helper, generated source-derived
  implementation code, or Platform dependency;
- public specification, schemas, state machines, fixtures, vectors, and an
  auditable specification-question channel as the only Ghost Bridge semantic
  sources;
- documentation of prior exposure to official source and mitigation or
  exclusion where contamination risk exists;
- at least one production Client and Agent/server path for the exact mandatory
  H-04 facets selected for 1.0; H-14 does not invent new facet semantics;
- H-05 authentication and H-12 transport/security profiles selected for the
  claim, with no fallback;
- durable storage, atomicity, restart, concurrency, clock, failure, replay,
  revocation, rollback, and historical-verification behavior applicable to the
  claimed roles;
- packed/reproducible artifact identity, supported runtime/OS declaration,
  SBOM/provenance as selected, and full claimed-role conformance; and
- bidirectional P1-02 interoperability with failures and unsupported pairs
  retained rather than omitted.

## D2-05/P1-01 sequencing alternatives

This is a material human decision. The current plan cannot silently interpret
“independent IUT” as an early sentinel or silently move P1-01.

| Option | Dependency model | Circularity | Clean-room/contamination risk | False-independence risk | Cost/confidence | Required plan/traceability update | `GB-050` / `GB-054` effect | P1-05 effect |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Q-A — Sentinel/reference IUTs during D2-05 | Small independently written good/bad IUTs prove runner/oracle behavior; P1-01 remains after D2-05 | Breaks cycle | Low if based only on published requirements; sentinel authors need isolation | Medium/high if sentinel success is overstated as protocol independence | Lowest cost; strong harness self-test but limited production confidence | Define sentinel scope and prohibit P1-01/interop claims | May close only D2-05 harness portion of `GB-050`; `GB-054` remains P1-01 | P1-05 still requires full P1-01 and rerun |
| Q-B — Re-sequence production P1-01 before D2-05 completion | Independent team begins from stable D1/D2 assets and participates in D2-05 exit | Removes logical cycle but creates iterative dependency | Higher exposure to changing assets; strong clean-room controls needed | Low if independence verified | Highest early coordination; strongest D2-05 production evidence | Move/split P1-01 prerequisite and Phase exit ordering | D2-05 and P1-01 mature together; neither closes without own evidence | Later P1-05 simpler, but Phase sequencing changes materially |
| Q-C — Split D2-05 into two gates | D2-05A proves harness/oracle independence with sentinels/runners; D2-05B later qualifies official and P1-01 production IUTs | Explicitly removes cycle | Low for A; ordinary P1-01 controls for B | Low if A is never called production conformance | Moderate cost; clearest evidence taxonomy | Create separately named/traced exit gates while retaining one gap until complete evidence | `GB-050` remains open until selected complete boundary; `GB-054` closes only through P1-01 | P1-05 requires both A and B plus P1-01/P1-02 |
| Q-D — Provisional D2-05 with later mandatory reopening | Phase 15D.2 marks harness technically ready; final qualification is deferred to P1-01 | Avoids build cycle but weakens “complete” meaning | Medium | High if provisional status is lost | Moderate cost; ambiguous status | Define provisional status and mandatory invalidation/reopen rules | `GB-050` cannot be closed at provisional point; `GB-054` unchanged | P1-05 must prove reopening/qualification completed |

**Recommendation, not approval:** Q-C most clearly preserves the distinction
between suite independence and production independent implementation while
making the cycle visible. If selected, the plan and gap traceability must name
both gates, and neither an H-14 record nor D2-05A alone may close `GB-050`.

## Interoperability matrix

| Matrix row | Required participants | Required cases | PASS proposal | Blocking failure proposal | Evidence identity |
| --- | --- | --- | --- | --- | --- |
| Official Client → independent Agent | Exact packed official Client and P1-01 Agent | Discovery through revocation; required approval/task/receipt flows | Every mandatory applicable case passes with no suite error | Any mandatory semantic, security, restart, or persistence failure | Client/Agent/suite/fixture/environment/report digests |
| Independent Client → official Agent | P1-01 Client and exact packed official Agent | Same reverse-direction lifecycle and malicious peer behavior | Same | Same | Same, with reversed artifacts |
| Common Trust/Receipt verification | Both Clients/Agents and selected Trust roles consume identical H-10/H-11 assets | Issuer/key/revocation/rollback/history/Receipt positive and negative cases | All mandatory producer/verifier directions agree | Divergent validity/authority/history result | Vector/corpus/Trust implementation/report digests |
| Mandatory release/profile/feature pairs | Every H-03 supported release and H-04 mandatory facet pair | Negotiation, binding, unknowns, limits, authentication, extensions | Complete supported pairs pass | Undocumented skip/fallback or supported pair failure | Support/compatibility ledger plus result matrix |
| Previous-release compatibility | Exact currently supported compatibility edges only | Upgrade/downgrade, stored objects, active state, history | Outcome matches explicit H-03 compatibility direction | Inferred compatibility, historical reinterpretation, or supported edge failure | Old/new artifact and compatibility-edge digests |
| Restart/retry/concurrency | Both directions on declared environments | Grant, Connection, Approval, Task, Receipt, revocation, storage/clock faults | One deterministic accepted outcome per normative rules | Duplicate authority/effect, lost history, rollback acceptance | Environment, stores, fault schedule, report digests |
| OS/runtime matrix | Every environment claimed by support policy | Install, startup, transport, storage, crypto, full applicable profile | All mandatory cases for claimed environment pass | Claimed environment differs or is omitted | OS/runtime/toolchain/artifact evidence |
| Negative/unsupported pairs | Explicit non-overlap and unsupported optional pairs | Safe rejection, no authority/state, no downgrade | Exact stable inapplicable/unsupported outcome | Pair omitted, silently coerced, or counted as pass | Complete matrix including negative rows |

Proposed interoperability PASS requires repeatable results against immutable
artifacts, no `FAIL`, `SKIP`, or `SUITE_ERROR` for any mandatory applicable row,
and explicit unsupported outcomes for non-claims. An environment-specific
exception must either narrow the published support claim before authorization
or block that claim; it cannot remain a hidden waiver. Reports should be signed
or otherwise integrity-bound and independently rerunnable.

## Conformance release gate

The future H-14 disposition must decide how D2-05 participates in eligibility.
The proposed minimum is:

1. immutable suite, case, schema, state-machine, fixture, vector, adapter, and
   result-format identities;
2. exact role, H-03 release, H-04 facet/profile, H-05 authentication profile,
   H-12 transport, optional features, IUT artifact, and environment in every
   claim;
3. runner/oracle dependencies free of official implementation helpers, with a
   process adapter importing only the public package that is itself the IUT;
4. deliberate bad-IUT and suite-defect tests, plus the human-selected Q-A/B/C/D
   sequencing model;
5. identical immutable cases and expected results for official and independent
   IUTs, with no implementation-name branch or waiver;
6. no waiver of a mandatory failure because the official package also fails;
7. no substitution of repository unit tests, Platform tests, current black-box
   scripts, or package dry runs for D2-05 conformance;
8. reproducible, integrity-protected, safely redacted result bundles; and
9. mandatory applicable cases all `PASS`; `FAIL`, `SKIP`, or `SUITE_ERROR`
   blocks that exact claim.

No current repository test or conformance output satisfies this future gate.

## External security-review alternatives and proposed scope

### Reviewer-independence alternatives

- **V-A — Independent organization with no implementation role.** Strongest
  structural independence and highest cost/procurement burden.
- **V-B — Independent named reviewers with conflict disclosure.** Reviewers did
  not author the reviewed behavior or report to the release producer for the
  engagement; practical for an open project but requires careful disclosure.
- **V-C — Mixed internal/external review.** Internal experts prepare threat and
  evidence analysis; external reviewers control findings and blocking closure.
  Efficient but external scope must not be reduced to validation of internal
  conclusions.
- **V-D — Internal review only.** Useful before external review but cannot
  satisfy canonical P1-03 external-review evidence.

**Recommendation, not approval:** V-C with V-A or V-B external control of the
final findings/retest report provides useful preparation without confusing
internal expertise with independence.

### Proposed minimum review contract

| Review dimension | Proposed minimum |
| --- | --- |
| Independence | Named reviewer/entity, authorship/employment/financial conflict disclosure, no self-review of implemented findings, and authority to report blockers |
| Timing | Feature and wire freeze after P1-02 candidate evidence; any material change triggers scoped or complete re-review |
| Protocol scope | Roles/authority, authentication, tenant isolation, Grants, Connections, Approvals, Tasks/Results/Receipts, H-10 bytes/proofs, H-11 revocation/rollback/history, H-12 transport/errors/limits/privacy, H-13 evolution, compatibility, and denial of service |
| Implementation scope | Exact official packed artifacts and exact P1-01 artifacts, stores, adapters, parser/transport behavior, concurrency/restart, key custody, deployment assumptions, and supply chain |
| Evidence scope | Normative requirements, schemas/machines, vectors/corpora, conformance/interoperability, manifest/provenance/SBOM, support/withdrawal/emergency procedures |
| Testing | Reviewer attack cases, penetration/fuzz evidence as scoped, remediation regression, applicable conformance and interoperability reruns |
| Disclosure | Public safe summary, finding/remediation status, scope and limitations; sensitive exploit annex protected/embargoed but auditable by designated authorities |
| Retest | Original reviewer or separately qualified independent verifier confirms exact changed artifacts and closure evidence |

## Security review and remediation threshold

P1-03 requires all critical/high findings to be remediated and retested. H-14
may select a stricter threshold but may not silently make unresolved
critical/high findings releasable.

| Severity/class | Release-blocking proposal | Required remediation | Required retest | Who may verify closure | May residual-risk authority accept unresolved item? | Disclosure proposal |
| --- | --- | --- | --- | --- | --- | --- |
| CRITICAL | Yes for draft support, RC, release, and 1.0 where affected | Yes before affected distribution/support | Independent retest required | Original independent reviewer or separately qualified independent verifier | No | Prompt coordinated disclosure when safe; exact sensitive detail embargoed as needed |
| HIGH | Yes for RC, supported release, and 1.0; humans must decide minimum public-draft treatment | Yes before affected RC/release/1.0 | Independent retest required | Same as CRITICAL | No under current P1-03 threshold | Public safe status and remediation; exploit detail controlled |
| MEDIUM | Default blocking for normative ambiguity, authority, cross-tenant, crypto/history, or cumulative systemic risk; otherwise human choice | Remediate or exact bounded risk record | Retest by qualified verifier for security-relevant changes | Reviewer or independent verifier as selected | Candidate only with rationale, scope, expiry, compensating controls, and disclosure | Public summary unless disclosure creates active exploit risk |
| LOW | Not automatically blocking unless mandatory requirement or aggregation makes it material | Fix, defer with dated plan, or bounded acceptance | Proportionate verification | Qualified maintainer or independent verifier as policy selects | Candidate yes | Release-note/risk summary as appropriate |
| Informational | No by severity alone | Track if useful | Not normally required | Review coordinator | Yes/not applicable | Scope/limitations summary |
| Normative ambiguity | Yes irrespective of CVSS-style severity when two conforming implementations could diverge or authority/security meaning is unclear | Requirement/governance clarification through proper versioned process | Conformance/interoperability/security rerun as affected | Protocol governance plus independent evidence verifier | No conversion of unknown into success | Public erratum/new-release record without unsafe exploit detail |
| Supply-chain integrity failure | Yes when artifact identity, provenance, signer, registry, or reviewed-byte match is uncertain | Rebuild/re-sign/re-authorize from trusted boundary and investigate | Independent digest/provenance verification | Supply-chain verifier plus security owner | No | Incident/advisory status as appropriate |

**Recommendation, not approval:** adopt the table's strict CRITICAL/HIGH and
normative-ambiguity treatment. Humans must decide MEDIUM/LOW rules, public-draft
thresholds, and closure-verifier independence.

## Residual-risk authority alternatives

| Model | Accountable approver | Separation | Permitted candidates | Never-waivable candidates | Advantages | Risks |
| --- | --- | --- | --- | --- | --- | --- |
| RR-A — Release authorizer also accepts risk | One designated release authority | None beyond evidence verification | Selected medium/low/operational risks | H-decision rewrite, mandatory conformance failure, missing required evidence, prohibited critical/high | Fast and accountable | Self-approval/concentration risk |
| RR-B — Separate residual-risk approver | Named risk authority distinct from producer and verifier; overlap with release authorizer decided by humans | Required from owner of unresolved work and evidence verifier | Explicit permitted classes only | Same plus any class humans reserve | Strong conflict control | Role availability and handoff cost |
| RR-C — Human-approved quorum | Multiple named risk authorities | Quorum and conflict rules required | Classes selected by policy | Same; quorum cannot waive a forbidden class | Compromise resistance | Deadlock and unspecified quorum risk |
| RR-D — No residual-risk acceptance for release gates | Every finding/gap/gate remediated or completed | Not applicable | None | All | Maximum formal strictness | Can make low-value or irreducible risks block indefinitely; hides inevitable operational risk unless documented separately |

**Recommendation, not approval:** RR-B. Do not infer a quorum. Humans must name
the approver, decide whether that person may also authorize release or sign
graduation, and define permitted risk classes.

Every accepted release residual risk should record:

- exact release/evidence-manifest and affected artifact/gate;
- finding/risk identity, source, severity/class, uncertainty, and owner;
- why remediation is not complete, alternatives considered, and why acceptance
  does not violate a non-waivable boundary;
- compensating controls, monitoring, support/user impact, disclosure class,
  expiry/revisit trigger, and remediation plan if any;
- accountable human approver, date, conflict declaration, and signature; and
- effect on conformance, interoperability, security review, compatibility,
  historical verification, and support claims.

A residual-risk act must never rewrite an accepted H decision, declare a
failing mandatory case passing, invent interoperability evidence, close a gap
without its artifacts, transform `unknown` into success, or waive a class the
selected threshold makes non-waivable.

## Release authorization model

The proposed sequence keeps these as separate acts: (A) evidence preparation;
(B) independent verification; (C) residual-risk acceptance where permitted;
(D) artifact signing; (E) exact release authorization; (F) publication
execution; and (G) post-publication registry/artifact digest verification and
immutable publication evidence. One release authorization applies only to the
exact manifest digest and artifact set it names. A later release, rebuilt
package, changed dependency, new signature, changed support policy, or altered
evidence needs a new or explicitly scoped replacement authorization.

### Proposed release authorization checklist

- [ ] Exact H-03 release identity and publication class are valid and immutable.
- [ ] Human-selected prerelease/final publication policy permits this class.
- [ ] Exact specification, schemas, state machines, fixtures, vectors, corpus,
      suite, package, report, policy, SBOM, and provenance inventory is complete
      for the class.
- [ ] Every artifact digest matches the independently verified evidence manifest.
- [ ] Applicable H-01 through H-14 decisions and requirement traceability are
      complete without conflict.
- [ ] Required D1/D2/E/P1 gates for this release class are complete.
- [ ] D2-05 sequencing model and conformance eligibility are satisfied.
- [ ] Every claimed official package artifact—not workspace source—passes its
      applicable conformance and clean-consumer checks.
- [ ] Required independent implementation and clean-room evidence is complete.
- [ ] Required interoperability matrix has no omitted or failing mandatory pair.
- [ ] External review scope, findings, remediation, and independent retests meet
      the selected threshold.
- [ ] No unresolved CRITICAL/HIGH finding or normative ambiguity violates the
      selected non-waivable rules.
- [ ] Residual risks are exact, permitted, signed, unexpired, and manifest-bound.
- [ ] Package/registry ownership, license, notices, and accountable legal review
      are complete for distributed artifacts.
- [ ] Reproducible build, SBOM, provenance, dependency/vulnerability intake,
      artifact signatures, key state, and registry controls pass.
- [ ] Support/runtime/profile matrix, notice, migration/changelog,
      deprecation/withdrawal/EOL, archive, vulnerability, incident, emergency,
      rollback, and roll-forward procedures are published or bound as required.
- [ ] Public/private evidence is safely redacted under H-12 and designated
      authorities can audit restricted evidence.
- [ ] The release authorizer has reviewed the exact evidence-manifest digest,
      conflicts, failures, waivers, limitations, and publication target.
- [ ] A dated, release-specific authorization statement is signed.

Completion of this checklist would be evidence for a separately recorded act;
this proposal completes none of its boxes.

### Proposed post-publication verification / publication-evidence step

After publication, the publication operator and/or an independent verifier
checks the bytes actually available at the publication location against the
exact digests named by the release authorization. The resulting record includes
the registry or location, observation time, artifact and manifest digests,
publication result, operator/verifier identity, and any relevant registry
metadata.

A mismatch freezes further publication and triggers the selected incident and
recovery process. It does not silently modify, expand, or retroactively repair
the earlier authorization. Publication evidence becomes an input to every
later gate that requires proof of actual distribution, including any applicable
P1-05 ordering selected by humans. This post-publication record is produced
after publication and is not a prerequisite to the earlier exact release
authorization act. This separation does not decide whether publication
precedes, coincides with, or follows P1-05.

## Protocol 1.0 graduation rule

H-14 acceptance would define the future authority and rule. It would not execute
graduation and would not make the H-14 approval date the graduation date.

### Mandatory future P1-05 checklist

- [ ] Phase 15D.1 exit criteria are complete.
- [ ] Phase 15D.2 exit criteria are complete, including the human-selected
      D2-05/P1-01 sequencing model.
- [ ] Phase 15E exit criteria are complete on packed official artifacts.
- [ ] `P1-01` production independent implementation and clean-room audit are
      complete for the selected mandatory roles/profiles.
- [ ] `P1-02` bidirectional interoperability and supported compatibility matrix
      are complete and reproducible.
- [ ] `P1-03` external protocol/implementation review, remediation, independent
      retest, and disclosure obligations are complete.
- [ ] `P1-04` support, compatibility, deprecation, release, vulnerability,
      rollback, signing, SBOM, provenance, and supply-chain policy is complete
      and rehearsed.
- [ ] All 60 `GB-*` gaps are closed with their required evidence; no proposal or
      decision acceptance substitutes for closure.
- [ ] Every mandatory conformance case for every claimed 1.0 role/release/
      profile/transport/feature/environment is `PASS`.
- [ ] Every required artifact and evidence item is tied to one immutable audited
      evidence-manifest digest.
- [ ] No artifact or reviewed input changed after its applicable conformance,
      interoperability, security review, or authorization without re-gating.
- [ ] All residual risks and allowed optional deferrals are explicit, permitted,
      unexpired, disclosed as selected, and bound to the evidence manifest.
- [ ] Release authorization and publication status for the exact 1.0 artifact
      set meet the human-selected ordering rule.
- [ ] A designated human graduation authority reviews the complete P1-05 report
      and signs an exact dated statement bound to the evidence-manifest digest.

Humans must decide whether the P1-05 graduation signer may be the same person
who approved H-14, accepted release risk, or authorized the release, or whether
Option B/C independence applies. No signer or date is populated here.

### Candidate future graduation statement form

The later record should identify the human governance identity, date, exact
H-03 final release, evidence-manifest digest, completed gate set, accepted
residual risks/deferrals, release/publication status, and an unambiguous
statement that Protocol 1.0 graduation is approved. This describes required
fields only; it is not a sign-off and contains no future date or approver.

## Graduation failure, invalidation, and reopening

| Event | Proposed consequence before graduation | Proposed consequence after graduation/publication |
| --- | --- | --- |
| Blocking gap reopens | P1-05 stops; affected evidence is invalid | Incident/erratum/new release or support action; history unchanged |
| Evidence digest changes | Authorization and sign-off candidate invalid | Treat as different artifact/evidence; investigate substitution and re-gate |
| Package changes after review | Re-run affected conformance/interoperability/security/supply-chain gates | New package release/evidence; never replace bytes in place |
| Independent implementation fails | P1-01/P1-02 incomplete; no 1.0 | Suspend affected claim/support; investigate specification versus implementation defect |
| Interoperability regresses | P1-02 incomplete | Publish support/advisory state; remediate and rerun exact matrix |
| Review finds new blocker | P1-03 incomplete | Security incident process; withdraw/security-forbid as evidence requires; remediate/retest |
| Signing key compromised | Freeze authorization/publication using key; replace custody and signatures through new evidence | Identify affected artifacts, publish compromise/revocation evidence, re-sign/re-authorize without mutating old record |
| Support policy materially changes | New policy review and manifest digest required | Prospective support metadata/update; release identity/history unchanged |
| Evidence manifest incomplete/unavailable | No release/graduation act | Current claim becomes unverifiable/incident state; archive recovery or explicit indeterminate status |

There is no “almost 1.0” status that bypasses a failed gate. A candidate remains
draft/prerelease/RC or becomes blocked/withdrawn under the selected policy.

## Post-1.0 maintenance boundary

| Change class | H-14 governance implication | Controlling non-H-14 boundary |
| --- | --- | --- |
| Security patch with no protocol-semantic change | New exact package/artifact evidence, targeted review/conformance, support/advisory, signing, authorization, and publication | H-03 determines release identity; H-10/H-11/H-12 security semantics unchanged |
| Non-semantic specification erratum | Use H-03 immutable errata process, review classification, evidence update, and publication authorization | Cannot change interoperable behavior or historical meaning |
| New H-03 protocol release | Full applicable D/E/P1 compatibility, support, security, release, and evidence gating | H-03 identity/order/compatibility; H-13 schema/evolution |
| Deprecated release | Publish notice, support/migration status, matrix updates, archive, and active-Connection plan | H-03 identity/history; H-07 lifecycle |
| Withdrawn release | Authorized signed support/security state; bar new Connections; execute selected active treatment | H-03 no-new-Connection rule; H-07/H-11 active/security consequences |
| SDK-only patch | Package/API/support/reproducibility/conformance evidence for unchanged supported wire claims | Package version does not create wire release or compatibility |
| Protocol-semantic change | New/superseding human governance and H-03/H-13-compatible release; complete affected gates | Never an in-place patch or support-metadata reinterpretation |

H-14 does not redefine H-03 release/errata/history or H-13 extension/schema
evolution. A future material governance change requires a new human-approved
decision record with compatibility, migration, security, historical-object,
asset, implementation, and deployed-object consequences.

## Vulnerability, disclosure, and incident governance

The repository lacks a protocol-specific vulnerability-intake and coordinated
disclosure contract. Candidate H-14 policy must decide:

- the accountable intake owner and authenticated confidential reporting path;
- triage, acknowledgment, severity, affected-release/artifact identification,
  duplicate handling, and safe reporter communication;
- embargo access, conflict restrictions, retention, encryption/access controls,
  and prohibition on private details in ordinary telemetry;
- who may authorize a public advisory, coordinated disclosure, temporary
  support restriction, emergency build, withdrawal, or security-forbidden state;
- remediation ownership, conformance/interoperability/security retest, artifact
  rebuild/re-sign/re-authorization, and post-incident review;
- artifact, publisher-account, registry, provenance, SBOM, and signing-key
  compromise response; and
- preservation of the original affected artifacts, evidence, H-11 history,
  advisory timeline, and safe public status without exposing secrets.

Disclosure timing cannot be used to hide an unresolved blocker from designated
release/graduation authorities. Public summaries must be sufficient to state
scope, affected releases, status, mitigations, and residual risk while a
restricted annex preserves actionable exploit detail for authorized review.

## Archive and retention policy matrix

Concrete periods remain a human decision and must satisfy H-07/H-09/H-11
dependency floors.

| Evidence class | Candidate policy owner | Minimum dependency | Proposed archive property | Loss consequence |
| --- | --- | --- | --- | --- |
| Versioned specification/errata | Protocol governance owner | Permanent release identity/history | Immutable public archive, digest and supersession/errata links | Historical meaning cannot be reliably resolved |
| Schema bundles | D2/schema archive owner | Every surviving object/compatibility claim | Immutable bundle and per-schema retrieval | Validation/history becomes unsupported/indeterminate |
| State machines | D2/model archive owner | Every result/claim using them | Immutable machine definitions and digests | Conformance/history cannot be reproduced |
| Fixtures/vectors/corpora | D2 asset owner | Every supported/reviewed suite and historical claim | Immutable versioned corpus; test-only secrets only | Results/reviews cannot be reproduced |
| Release/evidence manifests and signatures | Release governance/signer | Permanent release/authorization history | Immutable public safe manifest and key/signature history | Release integrity/authority becomes indeterminate |
| H-11 revocation/key/compromise history | Trust/history owner | Every surviving current or historical verification dependency | Authenticated, anti-rollback, durable archive/service level | Current/historical verification fails closed or becomes indeterminate |
| Task/Result/Receipt/replay evidence | Deployment/support owner under H-09 | Greatest surviving retry, effect, dispute, audit, Receipt, and history horizon | Minimized protected evidence/tombstone per accepted policy | Replay/terminal truth or history cannot be proven; never grants authority |
| Conformance results | D2-05/report owner | Claimed artifact/support and graduation history | Signed/hash-bound safe result bundle | Claim becomes unverifiable |
| Interoperability reports | P1-02 owner | Supported matrix and graduation history | Safe immutable reports plus controlled raw evidence | Pair claim becomes unverifiable |
| Security review/remediation | P1-03/review owner | Release support, advisory, and graduation history | Public summary plus protected finding/retest annex | Risk/closure cannot be audited |
| SBOM/provenance/build evidence | Supply-chain owner | Artifact support, vulnerability, and incident horizon | Artifact-bound immutable records | Dependency/source integrity becomes indeterminate |
| Graduation evidence | P1-05 governance owner | Permanent Protocol 1.0 historical claim | Permanent public safe report and auditable controlled evidence | Protocol 1.0 claim cannot be substantiated |

Deletion or service unavailability never proves an event or authority did not
exist. Where accepted H-09/H-11 rules permit it, historical verification may
become explicitly unavailable, unsupported, or indeterminate; it never becomes
success through absence.

## H-14 and Platform boundary

Existing Platform GA, release candidate state, internal approval, CI success,
deployment status, support tier, product rollout, package dry run, or hosted
release does not equal:

- H-14 approval;
- protocol conformance or independent implementation;
- P1-02 interoperability or P1-03 external review;
- protocol release authorization for an evidence-bound artifact set;
- P1-05 graduation; or
- Protocol 1.0.

A Platform may consume approved protocol artifacts, apply stricter policy, and
reuse non-governing operational patterns. It cannot weaken H-01 through H-13,
replace H-14 evidence gates, transfer final Agent authority, or make its own
runtime/test/release state the protocol oracle.

## Threat analysis

| Threat/failure | Asset at risk | Proposed mitigation | Residual/deferred risk |
| --- | --- | --- | --- |
| One entity self-authors, tests, reviews, accepts risk, signs, and releases | Governance integrity | Option B separation, conflict disclosure, independent review, exact manifest | Role scarcity and collusion remain |
| Artifact signing key compromised | Artifact authenticity and support metadata | Purpose-specific custody, rotation/revocation, freeze, incident, re-sign/re-authorize | Compromise detection delay; verifier key-update availability |
| Publisher/registry account compromised | Distribution integrity | Strong account controls, independent artifact signatures, post-publish digest verification, freeze/withdrawal | Registry operational dependency |
| Package-name takeover, typosquat, or confusion | Consumer identity | Verified scope/name ownership, exact package inventory, signed manifest, no aliases | External registry/trademark disputes |
| License inconsistency across packages/assets | Legal distribution and adoption | Human/legal inventory, per-artifact license/NOTICE, reproducible package content audit | Ownership or dependency facts may remain unavailable |
| Source differs from reviewed/released artifact | Review and conformance validity | Reproducible builds, provenance, packed-artifact tests, digest-bound evidence | Toolchain nondeterminism/compromise |
| Mutable artifact replacement | Immutable history | Registry immutability, content digests, new identity for fixes, publication audit | Registry behavior outside repository control |
| Missing/inconsistent SBOM or provenance | Vulnerability response and source trust | Artifact-bound generation/verification and release block | Incomplete transitive/tooling metadata |
| Non-reproducible build | Artifact confidence | Declared environment, independent rebuild, explicit nondeterminism | Platform/toolchain variance |
| Official implementation becomes conformance oracle | Independent correctness | D2-05 boundary, forbidden imports, sentinels/bad IUTs, independent runner | Shared specification misunderstanding |
| Toy independent implementation passes only happy path | P1-01 evidence | Production threshold, durable/restart/security cases, complete role/profile claim | Minimal scope can still miss optional ecosystem behavior |
| Independent source contamination | Clean-room claim | Design log, prior-exposure disclosure, dependency/source audit, isolated team/channel | Knowledge contamination is difficult to prove negatively |
| False bidirectional interoperability | Interoperability confidence | Both directions, common Trust vectors, faults/restart, immutable report evidence | Environment-specific bugs outside tested matrix |
| Unsupported matrix pair silently omitted | Compatibility/support truth | Complete supported and negative matrix; omissions block claim | Matrix growth and operational cost |
| External reviewer conflict | Security confidence | Independence criteria, conflict disclosure, external control of findings/retest | Undisclosed relationships or narrow scope |
| Critical/high finding waived or severity downgraded | Release security | Non-waivable threshold, independent classification/retest, audit trail | Severity disagreement and coordinated exploitation |
| Residual-risk authority becomes universal waiver | Gate integrity | Permitted-class list, exact scope/expiry, no pass conversion, separate approver | Governance pressure and repeated extensions |
| Support metadata stale or forged | Selection and lifecycle safety | Signed/versioned current metadata, freshness, archive, incident response | Availability may fail closed |
| Premature deprecation/withdrawal strands Connections/history | Availability and historical truth | Notice/migration, H-07 active-treatment plan, H-11 archive floor | Urgent security events may require availability loss |
| Support shorter than H-09/H-11 evidence need | Replay, effects, historical verification | Dependency-max retention floor and explicit unavailable/indeterminate outcome | Storage/legal/privacy conflicts |
| Emergency process becomes routine bypass | Review and release integrity | Exact incident scope, expiry, non-waivable gates, retrospective full re-gating | Time pressure and overbroad emergency declarations |
| Rollback selects older withdrawn/insecure semantics | Authority and anti-downgrade | H-03 compatibility/security eligibility and H-11 anti-rollback before rollback | No safe rollback may exist |
| Package version mistaken for wire compatibility | Interoperability | Separate identities/support matrix; manifest binds both | Ecosystem/tooling UI may still simplify labels |
| Prerelease mistaken for Protocol 1.0 | User trust/support | Exact H-03 status, warnings, no-1.0 claim, distinct graduation report | Marketing/documentation drift |
| H-14 approval mistaken for P1-05 graduation | Governance truth | Required non-equivalence and later dated manifest-bound sign-off | Shorthand “H-14 owns graduation” remains easy to misuse |
| Platform GA mistaken for protocol release | Protocol independence | H-02/H-14 boundary and separate evidence/authority | Shared branding/tooling confusion |
| Manifest contains mismatched artifact revisions | Coherent release identity | Independent digest/trace audit and authorization bound to one manifest | Assembly error or compromised producer |
| Artifact changes after conformance/review | Evidence validity | Material-change invalidation and mandatory re-gating | Determining affected gate scope requires judgment |
| Review/remediation evidence not retained | Future audit/security response | Protected/public archive and manifest links | Confidentiality and deletion requirements |
| Post-release vulnerability invalidates support assumptions | Users and historical claims | Intake, advisory, withdrawal/emergency/rebuild, exact current support state | Detection delay and downstream lag |
| Release evidence leaks secrets/tenant data | Privacy and security | H-12 no-secret floor, allowlist/redaction, safe summaries/hashes, controlled annex | Tool/log/crash metadata leakage |
| Graduation signer compromised or misrepresented | Protocol 1.0 claim | Named governance identity, manifest-bound signature, public verification, supersession/incident process | Identity recovery and false third-party claims |

No mitigation in this table is implemented by this proposal.

## Privacy and disclosure analysis

- External review reports may contain working exploits, vulnerable paths,
  private topology, or remediation details. A public safe report and restricted
  auditable annex should be distinct.
- Vulnerability/advisory embargo data requires purpose-limited access,
  authentication, retention, disclosure authority, and incident audit.
- SBOM/provenance can expose internal filenames, users, absolute paths, build
  hosts, repository locations, dependency sources, or CI metadata. Public
  output must be allowlisted and artifact-relevant.
- Conformance/interoperability reports can expose environment, tenant,
  Connection, request, trace, credentials, Grant/Approval material, prompts,
  output, private keys, or network endpoints. H-12's no-secret/no-cross-tenant
  floor remains mandatory.
- Public residual-risk and incident disclosure must identify affected releases,
  impact, status, and mitigation without publishing reusable exploit secrets or
  protected tenant data.
- Private evidence is not exempt from integrity, retention, conflict, or audit
  requirements. Designated release, review, risk, and graduation authorities
  must be able to verify it.
- Hashing sensitive material does not automatically make it safe; small-domain,
  linkable, or user-derived values require H-12/H-10-qualified treatment.
- Publication operators and registries should receive only the evidence and
  credentials needed for their role. Registry credentials never enter a public
  release/evidence manifest.

## Legal and license boundary

License, copyright ownership, contributor authority, patent treatment,
trademark, package scope, registry control, export/compliance obligations,
third-party notices, and dependency-license compatibility cannot be established
from the audited repository alone. This record provides no legal advice and
makes no legal suitability claim.

Before final human approval of package/license choices, accountable legal review
must identify who has authority to license each artifact, whether generated and
contributed material is covered, which notices are required, whether selected
dependencies are compatible with distribution, how names/marks may be used, and
whether the chosen public/private model is enforceable. Missing evidence must
remain recorded; it cannot be inferred from `UNLICENSED`, a package name, a Git
history, or repository access.

## Compatibility, migration, and operational impact

| Area | Expected impact if a future option is accepted | Boundary |
| --- | --- | --- |
| Historical `ghostbridge/0.1-draft` | Remains immutable legacy; may receive explicit support/archive status only | Never relabel, backfill, or claim future conformance |
| Active Connections | May need warnings, bounded replacement, suspension, denial, closure, or revocation under selected support/security policy | Only accepted H-07/H-11 transitions; no silent mutation |
| Tasks/Results/Receipts | Retention/storage costs and historical readers may increase | H-09/H-11 dependency floors and disclosure authorization |
| Package boundaries | E-01/E-03 may rename/split exports and remove private/Platform coupling | Package version distinct from wire release; migration guide required |
| Current tests/conformance | Remain regression evidence; future D2-05 may expose different failures | No grandfathering or official oracle |
| CI/build/release | New reproducible packed-artifact, conformance, independent, interop, review, SBOM, provenance, signing, and manifest gates | Existing workflows do not satisfy them automatically |
| Platform release/GA | Must consume protocol evidence and may add stricter product gates | Cannot become protocol authority or weaken protocol floor |
| Independent implementers | Gain public stable assets/question channel but carry clean-room and matrix burden | No official source/runtime dependency |
| Publishers/operators | Need registry control, key custody, incident response, archive, support, and evidence operations | Exact authority and conflicts remain human choices |
| Users | Receive clearer status/support/security signals but may face migration or fail-closed availability loss | No prerelease/1.0 or package/wire confusion |

No migration, package split, registry action, publication, or operational change
is authorized here.

## Residual risks of every option

1. Accountable governance roles may be unavailable, concentrated, conflicted,
   or colluding even under separation of duties.
2. External package/registry names or ownership may be unavailable or disputed.
3. Legal ownership, patent, trademark, contribution, and dependency-license
   evidence may delay or prohibit a preferred distribution model.
4. Reproducible build and provenance systems can share compromised toolchains or
   incomplete dependency metadata.
5. Signing and publisher credentials can be compromised before detection.
6. Independent implementation clean-room evidence cannot perfectly prove
   absence of prior knowledge or shared conceptual bugs.
7. Sentinel IUTs may validate a harness without exercising production behavior;
   re-sequencing P1-01 may expose the independent team to unstable assets.
8. A complete interoperability matrix can become expensive across releases,
   profiles, runtimes, operating systems, storage modes, and security states.
9. External review can miss vulnerabilities, use a narrow scope, or become
   stale after a material change.
10. Strict non-waivable gates can reduce availability and delay critical fixes;
    permissive waivers can normalize unsafe release pressure.
11. Support and historical archive promises may exceed long-term staffing,
    storage, legal, key, registry, or infrastructure capacity.
12. Privacy, deletion, incident embargo, and long-lived H-09/H-11 evidence needs
    can conflict.
13. Emergency releases and rollbacks can introduce incompatibility or incomplete
    evidence even under a bounded process.
14. Prerelease publication can be mistaken for production support or Protocol
    1.0 despite warnings.
15. Package versions, tags, dist-tags, Platform GA states, and marketing can be
    mistaken for H-03 identity or P1-05 graduation.
16. Evidence manifests may be complete syntactically while containing incorrect,
    fraudulently verified, or mutually dependent evidence.
17. Severity and material-change judgments remain human and can be manipulated.
18. Withdrawal or EOL may strand active Connections, implementations, and
    historical verification even without changing their meaning.
19. A post-1.0 vulnerability can invalidate assumptions that were reasonable at
    graduation and require urgent support/withdrawal action.
20. The operational cost of Option B/C may itself encourage informal bypasses if
    roles, tools, and service levels are not funded.

## Consolidated recommendation

The following is a coherent recommended bundle for human review, not an
approved disposition:

- Option B evidence-bound separation of duties, with humans explicitly deciding
  which roles may overlap and whether any act requires a quorum;
- a verified role-separated public package model after E-01/E-03, without
  assuming that current `@ghostbridge/*` names are available or controlled;
- legal evaluation of Apache-2.0 and dual MIT/Apache-2.0 before selecting any
  public license;
- R-C public specification/test assets before 1.0, followed only by an
  explicitly authorized, conspicuously non-1.0 RC if humans permit it;
- S-B separate build attestation and release-authorization signing identities;
- W-C LTS/rapid support structure with W-D dependency floors, with all concrete
  periods requiring human approval and support-capacity evidence;
- A-C3 security-tiered active-Connection treatment;
- E-B bounded emergency releases with non-waivable gates and full retrospective
  re-gating;
- I-D role/profile-based independent evidence with at least independent Client,
  Agent/server, and Trust verification coverage equivalent to I-B;
- Q-C split D2-05 harness-independence and production-IUT qualification gates;
- V-C internal preparation plus V-A/V-B-controlled external findings and retest;
- strict CRITICAL/HIGH and normative-ambiguity release blocks;
- RR-B separate residual-risk authority; and
- a later P1-05 graduation signer whose required independence from the H-14
  approver, risk approver, and release authorizer remains a human choice.

This recommendation follows current evidence and accepted H-01 through H-13.
It confers no authority and may be accepted, rejected, qualified, or replaced by
humans.

## Accepted disposition

Rudra Sharma approved Option B — Evidence-bound separation of duties with the
complete qualifications in this section. These qualifications control over the
historical alternatives and recommendations above.

### 1. Governance and quorum

- There is no generic quorum.
- Evidence-bound separation of duties applies.
- One accountable actor performs each governed act unless a separately
  approved rule requires a quorum.
- Implementation behavior, Platform GA, CI, package versions, tests, or product
  approval never become protocol authority merely by existing.

### 2. Standing governance identities

The following standing capacities are approved:

- **Protocol Governance Owner:** Rudra Sharma — Protocol Governance Owner.
- **H-14 Human Approver:** Rudra Sharma — H-14 Human Approver.
- **Package / Registry Governance Owner:** Rudra Sharma — Package / Registry
  Governance Owner.
- **Security Response / Vulnerability Owner:** Rudra Sharma — Security Response
  / Vulnerability Owner.
- **Support / Deprecation / Withdrawal / Archive Owner:** Rudra Sharma — Support
  / Deprecation / Withdrawal / Archive Owner.

The same human may occupy these standing roles, but each remains a distinct
authority capacity. Common occupancy does not waive release-specific
independence requirements.

### 3. Separation of duties

| Role pair | Accepted rule | Qualification |
| --- | --- | --- |
| Protocol Governance Owner / Release Manager | May overlap | The overlap grants no independent-verification or release authority by itself |
| Package Owner / Publication Operator | May overlap | Independent post-publication verification is required |
| Builder / release Artifact Signer | Must separate | Builder may produce a build attestation but may not hold release-signing authority for its own build |
| Builder / Independent Evidence Verifier | Must separate | Production cannot independently verify itself |
| Release Manager / Independent Evidence Verifier | Must separate | Evidence assembly cannot independently verify itself |
| Implementation Author / External Security Reviewer | Must separate | External review cannot be self-review |
| Owner of unresolved risk / Residual-Risk Approver | Must separate | The unresolved-work owner cannot accept its own risk |
| Residual-Risk Approver / Release Authorizer | Must separate | Risk acceptance and exact release authorization are distinct acts |
| Release Authorizer / Publication Operator | May overlap | Independent post-publication verification remains required |
| H-14 Approver / Release Authorizer | May overlap conditionally | Only when the approver did not produce or independently verify the evidence being authorized |
| H-14 Approver / P1-05 Graduation Signer | May overlap conditionally | Only when conflict-free and holding no incompatible release-specific role |
| Release Authorizer / P1-05 Graduation Signer | Must separate | Graduation cannot be the release authorizer approving its own act |
| Platform/Product Authority / Protocol Authority | Separate authority capacities required | The same human/entity may occupy both only through explicit separate designation; Platform authority alone confers no protocol authority |

No role overlap may convert implementation or operational ownership into
independent verification.

### 4. Package architecture and package-control amendment

The accepted architecture is P-C-shaped:

- specification-derived public protocol/core and test assets;
- separately governed and independently versioned Client, Agent/server, Trust,
  conformance, and other implementation packages;
- E-01/E-03 implement the eventual package boundaries; and
- package versions do not create H-03 protocol identity or compatibility.

Exact external registry names are not approved as controlled merely by H-14.
Current `@ghostbridge/*` declarations remain candidates until verified.

The accepted package-control amendment makes exact external registry
availability/control a **non-waivable pre-publication gate**, rather than an
H-14 governance-acceptance prerequisite. Before first publication, evidence
must establish:

- an accountable registry/package owner;
- verified account/scope control and publisher identity;
- a package-to-owner mapping;
- naming/trademark review;
- a recovery/compromise procedure; and
- immutable release-manifest binding.

### 5. License and LEGAL-PATH-B

The intended default is the Apache License 2.0 for public Ghost Bridge protocol
code, SDK code, schemas, conformance tooling, and test assets, subject to
accountable legal review of the exact artifact set.

LEGAL-PATH-B is accepted. Legal clearance is not an H-14 governance-acceptance
prerequisite; it is a **non-waivable pre-publication gate**. Applicable review
must cover authority to license, copyright ownership, contributor authority,
generated material, patent implications, trademark/package naming,
dependency-license compatibility, required notices, redistribution obligations,
and suitability of the exact distribution model.

If legal review rejects Apache-2.0 for an artifact, that artifact cannot be
published until a separately approved replacement-license decision exists.
H-14 supplies no legal advice and does not establish legal suitability.

### 6. Release and publication classes

The approved H-14 governance classes are:

- Internal development build;
- Public draft;
- Preview / alpha / beta prerelease;
- Release candidate;
- Security emergency build;
- Protocol 1.0 release; and
- Post-1.0 maintenance/security release.

These classes are not H-03 release identities. H-03 remains the sole release
identity, version, compatibility, and immutable-history authority.

The accepted prerelease model is R-C followed, when separately authorized, by
R-B:

- safe public specification/test/reference assets may be published before 1.0
  only after accepted H-14 governance and separate exact publication
  authorization;
- official production SDK/package publication remains private until a
  separately authorized RC stage unless an exact later authorization permits
  otherwise;
- public RCs before P1-05 are conspicuously `NOT PROTOCOL 1.0`;
- prereleases have no production-support claim by default; and
- any prerelease support is explicit and bounded.

### 7. Release/evidence-manifest binding

The conceptual immutable release/evidence-manifest binding is approved. As
applicable it binds the exact H-03 release identity/status, source/specification,
schema bundles, state machines, fixtures/vectors/corpora, conformance suite,
packed official artifacts, independent implementation evidence,
interoperability evidence, external review/remediation evidence,
SBOM/provenance, support policy, residual-risk record, release authorization,
publication evidence, and future graduation evidence.

H-14 creates neither a manifest schema nor an instance. Mutable branches,
`latest` tags, dist-tags, and workspace paths cannot substitute for immutable
evidence identity.

### 8. Signing and supply chain

S-B is accepted: trusted build attestation plus a separate
release-authorization signing identity. Build, provenance, artifact signing,
release authorization, publication, and H-10 protocol-proof identities remain
distinguishable. Supply-chain keys must not silently reuse H-10 protocol-object
proof keys. Exact technologies and key instances remain later P1-04 and
release-specific evidence.

### 9. Support policy and support-capacity amendment

W-C LTS plus rapid channel with W-D dependency floors is accepted with these
minimums:

| Support dimension | Accepted minimum |
| --- | --- |
| LTS wire release support | 36 months |
| Non-LTS final wire support | 12 months |
| LTS official SDK support | 24 months |
| Rapid/non-LTS SDK support | 12 months |
| Ordinary LTS deprecation notice | 12 months |
| Ordinary rapid-channel deprecation notice | 6 months |

These are minimum floors, not mandatory termination dates. Exact calendar dates
are assigned per release before authorization. No calendar expiry may undercut
a longer surviving H-07, H-09, or H-11 dependency. Permanent governance,
specification, release, and graduation evidence remains permanently archived
where this disposition requires it.

The accepted support-capacity amendment makes concrete staffing, funding,
registry, archive, key-custody, incident-response, and infrastructure capacity
evidence a **non-waivable pre-supported-release / support-claim gate**, rather
than an H-14 governance-acceptance prerequisite.

### 10. Deprecation, withdrawal, and active Connections

A-C3, the security-tiered hybrid, is accepted.

- Ordinary deprecation supplies warning/migration, remains selectable until the
  selected policy makes it non-selectable or withdrawn, and silently mutates no
  active Connection.
- Ordinary withdrawal invokes H-03's bar on new Connections and bounded
  migration/replacement treatment; lifecycle action occurs only through H-07.
- Security withdrawal is scoped to authoritative security evidence; H-07/H-11
  govern suspension, denial, replacement, closure, or revocation, and history
  is never rewritten.
- Support loss alone does not silently revoke authority.

### 11. Emergency release and rollback

E-B, the bounded emergency path, is accepted. Emergency governance may shorten
only permitted administrative/process timing. It requires exact scope and
identity, provenance/integrity, targeted regression evidence, exact
authorization, temporary support status, rollback/roll-forward planning,
retrospective review, and eventual full re-gating. The accepted non-waivable
floor always applies.

### 12. D2-05/P1-01 sequencing

Q-C is accepted:

- **D2-05A** proves harness/oracle independence with sentinel/reference IUTs,
  deliberately bad IUTs, forbidden-dependency checks, and
  implementation-neutral outcomes.
- **D2-05B** later qualifies exact official and P1-01 production IUTs.

D2-05A is not a P1-01 production-independent implementation. `GB-050` remains
open until the full selected D2-05 evidence boundary is met; `GB-054` remains
open until P1-01 evidence exists. Future plan/traceability edits are downstream
execution.

### 13. Independent implementation

I-D with minimum I-B-equivalent coverage is accepted. Minimum Protocol 1.0
independent evidence requires an independent Client, independent Agent/server,
and independent Trust verification covering all mandatory selected H-04
facets, H-05 authentication, H-12 transport/security, durability/restart,
concurrency/atomicity, failure/retry, revocation/rollback, historical
verification, conformance, and bidirectional interoperability.

An independently operated Trust service is not mandatory for baseline 1.0;
independent Trust verification is mandatory. A cryptographic reproducer or
sentinel IUT does not satisfy P1-01.

### 14. Clean-room floor

The candidate clean-room requirements are accepted: isolation,
provenance/design logs, prior-exposure disclosure, no official runtime/private
helper dependency, public normative assets as semantic sources, an auditable
question channel, dependency provenance, packed/reproducible artifacts, an
exact claimed matrix, conformance, and interoperability.

### 15. Interoperability

The approved minimum bidirectional matrix includes official Client to
independent Agent, independent Client to official Agent, common Trust/Receipt
verification, every mandatory release/profile/feature pair, supported
compatibility edges, restart/retry/concurrency/failure, claimed OS/runtime
environments, and explicit unsupported/negative pairs.

Final release evidence requires **two complete clean reruns per claimed
environment**, using exact immutable artifact/evidence identities. Intervening
failures may not be hidden.

### 16. Conformance release gate

The approved gate requires immutable suite identity, exact scope, an
implementation-neutral runner/oracle, no official helper as semantic oracle,
`PASS` for every mandatory applicable case, no mandatory `FAIL`, `SKIP`, or
`SUITE_ERROR`, testing of exact packed artifacts, reproducible integrity-bound
evidence, and independent result verification. Unit tests, Platform tests,
package dry runs, and official-to-official runs cannot substitute.

### 17. External security review

V-C internal preparation with V-A/V-B external control of findings and retest
is accepted. Independent external review covers protocol semantics and exact
official and independent implementation artifacts. Material change after the
review freeze requires applicable re-review.

### 18. Remediation threshold

Unresolved CRITICAL, unresolved HIGH, normative ambiguity capable of divergent
conforming behavior or authority/security meaning, and unresolved supply-chain
integrity failure are non-waivable blockers. CRITICAL/HIGH remediation requires
independent retest. MEDIUM may be accepted only through the bounded
residual-risk process and never in violation of the non-waivable floor. LOW may
be fixed or boundedly deferred/accepted under that process.

### 19. Residual risk

RR-B, separate residual-risk authority, is accepted. The residual-risk
approver must be separate from the unresolved-risk owner, independent evidence
verifier, and exact release authorizer. Only explicitly permitted medium, low,
or bounded operational risks may be accepted.

Release-specific acceptance is exact, manifest-bound, reasoned, dated, signed,
conflict-disclosed, scoped, and revisitable or expiring where applicable. It
cannot convert a failed mandatory gate into success.

### 20. Non-waivable floor

Neither residual-risk nor emergency authority may waive:

- H-01 through H-13 semantics or history;
- accepted H-14 governance once applicable;
- required human protocol decisions;
- exact H-03 identity and compatibility;
- mandatory conformance success and required interoperability;
- CRITICAL, HIGH, normative-ambiguity, or supply-chain integrity blockers;
- artifact/evidence digest integrity and required provenance;
- H-10, H-11, and H-12 floors;
- cross-tenant and authority restrictions;
- required independent implementation or external review/remediation;
- exact release authorization before governed publication;
- accepted H-14 governance before new H-14-governed publication;
- successful P1-05 before any Protocol 1.0 claim; or
- the prohibition on converting unknown, unavailable, omitted, or
  indeterminate evidence into success.

### 21. Release/publication sequence

The accepted sequence is:

1. evidence preparation;
2. independent verification;
3. permitted residual-risk acceptance;
4. artifact signing;
5. exact release authorization;
6. publication; and
7. post-publication verification.

Authorization applies only to the exact immutable manifest/artifact set.
Actually published bytes are verified afterward. A mismatch freezes
publication and triggers incident handling.

### 22. Protocol 1.0 publication ordering

Exact candidate artifacts may be prepared and authorized. Immutable candidate
bytes may be pre-positioned or publicly distributed before graduation only as
explicitly non-1.0 RC artifacts. The actual distributed bytes are
digest-verified and P1-05 evaluates their exact evidence manifest. Only after
successful P1-05 may tags, support state, documentation, publication state,
marketing, or other communications claim Protocol 1.0. Failed P1-05 leaves the
candidate artifacts non-1.0.

### 23. Protocol 1.0 graduation

P1-05 remains the sole final Protocol 1.0 graduation execution point. H-14
acceptance is not graduation, and the H-14 approval date is not a graduation
date.

The future graduation signer must differ from the exact release authorizer and
residual-risk approver, and must not be the artifact builder, independent
verifier, or external reviewer for that release. The signer may be the H-14
approver only when conflict-free and holding none of those incompatible roles.
The later P1-05 record supplies the signer and date.

### 24. Vulnerability and incident governance

The standing Security Response Owner model and the proposed confidential
intake, triage, embargo, remediation, retest, advisory, emergency withdrawal,
registry/key compromise, evidence retention, and safe-disclosure requirements
are accepted.

### 25. Archive and retention

Permanent historical governance evidence includes at least versioned
specifications/errata, release/evidence manifests, release authorizations,
artifact identities/public signatures, and Protocol 1.0 graduation records.
Other governed evidence survives at least the greatest applicable support,
audit, dispute, historical-verification, H-07, H-09, or H-11 dependency
horizon.

### 26. Post-1.0 maintenance

The candidate maintenance boundary is accepted. H-03/H-13 remain controlling
for semantic change, release identity, errata, schema/evolution, and history.
Support metadata cannot silently reinterpret protocol semantics.

### 27. Accepted governance residual risks

All twenty governance residual risks in “Residual risks of every option” are
accepted subject to the approved mitigations. This is governance-level risk
acceptance only. It is not future release-specific vulnerability acceptance,
waives no non-waivable blocker, closes no `GB-*` gap, and does not convert
failing evidence into passing evidence. The original twenty-risk list remains
the controlling inventory.

### 28. Compatibility, security, privacy, legal-process, and operational impact

The candidate impacts are accepted, including that:

- `ghostbridge/0.1-draft` remains immutable historical material;
- active Connections are never silently mutated;
- H-03 remains the sole protocol release/compatibility identity authority;
- H-13 remains schema/evolution authority;
- package identity remains distinct from wire identity;
- later package restructuring requires migration guidance;
- existing tests remain implementation regression evidence only;
- later conformance may expose defects;
- Platform governance cannot replace protocol governance; and
- H-14 acceptance itself authorizes no implementation, migration, deployment,
  publication, or release.

The accepted security impact is stronger separation of duties, independent
external review, non-waivable blockers, supply-chain identity separation,
incident-response governance, and an independent P1-05 graduation boundary,
while retaining the accepted twenty governance residual risks.

## Human question resolution

The following table preserves the original 1–67 traceability. “Prospective”
means the governance rule is accepted here while the exact release-specific
value remains a mandatory input to the exact release/evidence record. No future
artifact digest, key, reviewer, release date, package coordinate, or P1-05
signer is invented.

| # | Original subject | Accepted resolution |
| ---: | --- | --- |
| 1 | Top-level governance model | Resolved by Accepted disposition §1: Option B with evidence-bound separation and no generic quorum. |
| 2 | Protocol Governance Owner | Resolved by §2: Rudra Sharma — Protocol Governance Owner. |
| 3 | Package/registry owner | Resolved by §§2 and 4: Rudra Sharma holds the standing governance capacity; exact package-to-owner mappings remain a non-waivable pre-publication record. |
| 4 | Release Manager | Resolved prospectively by H-14 rule; concrete value supplied by the exact release/evidence record under §3. |
| 5 | Build/provenance controller | Resolved prospectively by H-14 rule; concrete value supplied by the exact release/evidence record under §§3 and 8. |
| 6 | Artifact/release-manifest signing keys | Resolved prospectively by H-14 rule; concrete value supplied by the exact release/evidence record under §§3 and 8. |
| 7 | Security response and vulnerability intake | Resolved by §§2 and 24: Rudra Sharma holds the standing owner capacity; incident-specific actors/evidence are recorded later. |
| 8 | Support/deprecation/withdrawal/EOL/archive owner | Resolved by §§2, 9, 10, and 25: Rudra Sharma holds the standing owner capacity. |
| 9 | External-review coordinator | Resolved prospectively by H-14 rule; concrete value supplied by the exact P1-03 review/evidence record under §§3 and 17. |
| 10 | Independent release-evidence verifier | Resolved prospectively by H-14 rule; concrete value supplied by the exact release/evidence record under §§3, 15, and 16. |
| 11 | Residual-risk authority | Resolved prospectively by H-14 rule; concrete value supplied by the exact residual-risk/release record under §§3 and 19. |
| 12 | Exact release authorizer | Resolved prospectively by H-14 rule; concrete value supplied by the exact release/evidence record under §§3 and 21. |
| 13 | Publication operator | Resolved prospectively by H-14 rule; concrete value supplied by the exact publication-evidence record under §§3 and 21. |
| 14 | Future Protocol 1.0 graduation signer | Resolved prospectively by H-14 rule; concrete value supplied by the later P1-05 record under §23. |
| 15 | Permitted and prohibited role overlap | Resolved by §3's complete separation-of-duties table. |
| 16 | Quorum | Resolved by §1: no generic quorum; any future exception requires a separately approved complete rule. |
| 17 | External package names | Resolved by §4: the P-C-shaped architecture is accepted; exact coordinates remain candidates until the non-waivable pre-publication control gate passes. |
| 18 | Registry control evidence | Resolved prospectively by §4; concrete proof is supplied by the pre-publication package-control record. |
| 19 | Distribution architecture | Resolved by §4: P-C-shaped architecture. |
| 20 | License | Resolved by §5: intended default Apache License 2.0 subject to LEGAL-PATH-B. |
| 21 | Accountable legal review | Resolved prospectively by §5; concrete legal clearance is supplied before publication and is non-waivable. |
| 22 | Governance publication classes | Resolved by §6; the seven listed classes are accepted as H-14 governance classes only. |
| 23 | Distribution before P1-05 | Resolved by §§6 and 22: R-C followed by separately authorized R-B; any pre-graduation public candidate remains explicitly non-1.0. |
| 24 | Prerelease naming, production use, and support | Resolved by §6: no production-support claim by default; any support is explicit and bounded. |
| 25 | Per-class markings and gates | Resolved prospectively by H-14 rule; concrete value supplied by the exact release/evidence record under §§6 and 21. |
| 26 | Artifact inventory | Resolved by §7 and the retained governance-level inventory; concrete class-specific artifacts are supplied by the exact release record. |
| 27 | Immutable manifest bindings | Resolved by §7; schema and instances remain downstream. |
| 28 | Public and restricted evidence | Resolved by the retained privacy/disclosure analysis and §7; concrete classifications are supplied by exact evidence records. |
| 29 | Signing model and identity separation | Resolved by §8: S-B and distinct H-10 protocol-proof identities. |
| 30 | Signing-key lifecycle | Resolved prospectively by H-14 rule; concrete technologies, keys, operators, and events are supplied by P1-04/release evidence under §8. |
| 31 | Reproducibility, SBOM, provenance, intake, digest check | Resolved prospectively by §§7, 8, and 21; concrete values are supplied by the exact release/evidence record. |
| 32 | Support-duration model and periods | Resolved by §9: W-C plus W-D floors and the six approved numeric minimums; exact calendar dates are supplied per release. |
| 33 | Support capacity | Resolved prospectively by §9; concrete capacity evidence is a non-waivable pre-supported-release/support-claim record. |
| 34 | Deprecation selectability | Resolved by §10: ordinary deprecation remains selectable until accepted policy makes it non-selectable or withdrawn. |
| 35 | Ordinary active-Connection treatment | Resolved by §10: A-C3 with no silent mutation and H-07-governed bounded treatment. |
| 36 | Security-withdrawal authority and scope | Resolved prospectively by §§2, 10, and 24; concrete scope/action is supplied by the exact incident/security record. |
| 37 | Emergency declaration and shortcuts | Resolved prospectively by §§11 and 20: E-B, with concrete incident authorities/timing supplied by the exact emergency record. |
| 38 | Rollback/roll-forward evidence | Resolved prospectively by §11; concrete value supplied by the exact emergency/release evidence record. |
| 39 | D2-05/P1-01 sequencing | Resolved by §12: Q-C. |
| 40 | Plan and traceability edits | Resolved by §12 as downstream execution; acceptance defines D2-05A/B but performs no edit and closes neither `GB-050` nor `GB-054`. |
| 41 | Independent implementation model | Resolved by §13: I-D with minimum I-B-equivalent coverage. |
| 42 | Required roles/profiles/environments | Resolved prospectively by §§13 and 14; the mandatory floor is accepted and exact claimed environments are supplied by P1-01/release evidence. |
| 43 | Trust verifier versus service | Resolved by §13: independent Trust verification is mandatory; an independently operated Trust service is not baseline-mandatory. |
| 44 | Clean-room requirements | Resolved by §14; concrete team/provenance/audit evidence is supplied by P1-01. |
| 45 | Interoperability matrix | Resolved by §15: the retained proposed minimum matrix is accepted. |
| 46 | Interoperability PASS and reruns | Resolved by §15: mandatory success plus two complete clean reruns per claimed environment. |
| 47 | Environment-specific exceptions | Resolved by §15 and the retained matrix: explicit unsupported/negative rows cannot be hidden or widen claims. |
| 48 | Conformance release eligibility | Resolved prospectively by §16; concrete suite/result/artifact identities are supplied by D2-05/release evidence. |
| 49 | External-review independence model | Resolved by §17: V-C with V-A/V-B external control. |
| 50 | External-review scope | Resolved by §17 and the retained review contract: protocol plus exact official and independent artifacts. |
| 51 | Review freeze and re-review | Resolved prospectively by §17; concrete freeze point, digests, and re-review scope are supplied by P1-03 evidence. |
| 52 | Remediation thresholds | Resolved by §18. |
| 53 | Remediation verifier and retest | Resolved prospectively by §§17 and 18; concrete reviewer/verifier identity and retest evidence are supplied by P1-03. |
| 54 | Residual-risk model | Resolved by §19: RR-B. |
| 55 | Waivable/non-waivable classes and record | Resolved by §§19 and 20; concrete permitted risk acceptance is supplied by the exact manifest-bound risk record. |
| 56 | Release-authorization checklist and signer | Resolved prospectively by §21 and the retained checklist; concrete signer and statement are supplied by the exact release record. |
| 57 | Authorization/publication/post-verification | Resolved by §21; concrete publication evidence is supplied after actual publication. |
| 58 | Future P1-05 checklist | Resolved by §23 and the retained mandatory checklist; acceptance defines but does not execute it. |
| 59 | Graduation-signer overlap | Resolved by §§3 and 23; the concrete eligible signer is supplied by the later P1-05 record. |
| 60 | Publication/P1-05 ordering | Resolved by §22: candidate bytes may be non-1.0 before graduation; no Protocol 1.0 claim precedes successful P1-05. |
| 61 | Graduation invalidation/reopening | Resolved prospectively by §23 and the retained failure table; concrete events are handled by P1-05 or later incident records. |
| 62 | Post-1.0 change classes | Resolved by §26 and the retained maintenance table. |
| 63 | Vulnerability/incident ownership | Resolved by §§2 and 24: Rudra Sharma holds the standing Security Response / Vulnerability Owner capacity. |
| 64 | Archive and retention | Resolved by §§9 and 25; concrete release dates/locations remain exact archive/evidence records. |
| 65 | Compatibility, migration, operational, security, privacy, legal, and disclosure consequences | Resolved and accepted by §28 subject to the stated boundaries and later non-waivable gates. |
| 66 | Original governance residual risks | Resolved by §27: all twenty are accepted at governance level subject to mitigations and non-waiver qualifications. |
| 67 | H-14 approver and durable sign-off | Resolved by §2 and the Human disposition: Rudra Sharma, 2026-08-11, bound to the recorded source and hashes. |

### Historical question text (resolved)

The verbatim proposal questions below are retained as decision history. Every
item is resolved by the mapping above; their interrogative form does not denote
an open H-14 governance issue.

1. Is Option A, B, C, D, or another fully specified top-level governance model
   selected?
2. Who is the accountable protocol governance owner?
3. Who is the package/registry owner for each proposed external artifact?
4. Who is the release manager?
5. Who controls reproducible builds and build provenance?
6. Who may hold and operate artifact/release-manifest signing keys?
7. Who is the security response and vulnerability-intake owner?
8. Who owns support, deprecation, withdrawal, EOL, and archive operations?
9. Who coordinates external security review without substituting for the
   independent reviewer?
10. Who independently verifies release evidence?
11. Who may accept release residual risk?
12. Who may authorize one exact release?
13. Who may execute publication?
14. Who may sign the future Protocol 1.0 graduation statement?
15. Which roles may be held by the same human/entity, and which must be separate
    because of authorship, implementation, review, risk, signing, publication,
    or financial conflicts?
16. Does any act require multiple approvals? If so, what exact quorum,
    independence, replacement, expiry, emergency, and deadlock rule is approved?
17. Which current or new package names are proposed for public distribution?
18. What evidence proves control of every registry scope/name and publisher
    identity before acceptance or publication?
19. Is package distribution public, controlled/private, split by artifact, or
    another model?
20. Which license option is selected for the specification, schemas, test
    assets, conformance tools, official SDKs, examples, and other artifacts?
21. Has accountable legal review confirmed ownership, contributor authority,
    patent/trademark treatment, dependency compatibility, and notice duties for
    that exact split?
22. Are internal development, public draft, preview/alpha/beta, release
    candidate, emergency build, Protocol 1.0, and maintenance/security release
    the approved governance classes, or how are they amended without replacing
    H-03 identity/status semantics?
23. May public drafts, prereleases, RCs, or installable packages be distributed
    before P1-05?
24. Which prerelease classes may be called a “release,” used in production, or
    receive any support promise?
25. What exact status, warning, disclaimer, evidence, signer, authorizer,
    migration, withdrawal, and archive rules apply to each prerelease class?
26. Is the governance-level artifact inventory complete, and which artifacts
    are required for public draft, RC, Protocol 1.0, and maintenance releases?
27. What exact immutable release/evidence-manifest bindings are required?
28. Which evidence is public, which is restricted, and how do designated
    authorities audit restricted evidence?
29. Which signing model is selected, and how are build, attestation, artifact,
    authorization, publication, and H-10 protocol-proof identities separated?
30. What signing-key custody, rotation, revocation, compromise, backup,
    emergency replacement, and public verification process is approved?
31. What reproducible-build threshold, SBOM format/scope, provenance content,
    dependency/vulnerability intake, and post-publication digest check is
    required?
32. Which support-duration model is selected, with what exact wire, schema, SDK,
    runtime, authentication, cryptographic, extension, Trust, conformance, notice,
    deprecation, withdrawal, EOL, archive, and historical-verification periods?
33. What evidence shows the selected support promises are operationally funded
    and sustainable?
34. Does ordinary deprecation preserve new-Connection eligibility until
    withdrawal, or make the item non-selectable earlier?
35. For ordinary support loss or withdrawal, do active Connections continue to
    natural expiry, require bounded replacement, become unsupported without
    lifecycle mutation, or follow another H-07-compatible model?
36. For security withdrawal, who decides the exact affected scope and whether
    active Connections suspend, deny, replace, close, or revoke under H-07/H-11?
37. Who may declare an emergency release, which gates may be shortened, which
    can never be waived, what temporary support applies, and when is full
    retrospective review/re-gating due?
38. What rollback/roll-forward, key-compromise, and emergency-withdrawal evidence
    is mandatory?
39. Is Q-A, Q-B, Q-C, Q-D, or another coherent D2-05/P1-01 sequencing model
    selected?
40. What exact plan, exit-criteria, and `GB-050`/`GB-054` traceability edits will
    the selected sequencing model later require?
41. Is I-A, I-B, I-C, I-D, or another independent implementation profile
    selected?
42. Which H-04 roles/facets, H-05 authentication profiles, H-12 transport
    profiles, persistence/restart/security features, runtimes, and operating
    environments must the production independent implementation support?
43. Is an independent Trust verifier sufficient, or is an independently
    implemented/operated Trust service required?
44. What exact clean-room rules, prior-exposure disclosures, dependency/source
    restrictions, design log, question channel, and audit evidence are required?
45. Is the proposed bidirectional interoperability matrix complete?
46. What constitutes PASS, which failures block which class, how many reruns and
    environments are required, and how are reports signed/hash-bound?
47. How are environment-specific exceptions represented without hiding or
    widening the support claim?
48. What exact D2-05 conformance result, suite identity, role/release/profile/
    transport scope, independent validator, and mandatory-case policy makes an
    artifact release-eligible?
49. Is V-A, V-B, V-C, or another external-review independence model selected?
50. Must external review cover the protocol and both exact official and P1-01
    implementation artifacts, with the complete authority, crypto, state,
    transport, privacy, and supply-chain scope proposed above?
51. At what freeze point does review begin, and which material changes trigger
    scoped or complete re-review?
52. Are CRITICAL, HIGH, MEDIUM, LOW, informational, normative ambiguity, and
    supply-chain integrity thresholds approved exactly as proposed or amended?
53. Who may verify remediation closure, and when must the original reviewer
    retest?
54. Is RR-A, RR-B, RR-C, RR-D, or another residual-risk model selected?
55. Which risk classes may be accepted, which are never waivable, and what
    rationale, expiry, revisit, disclosure, and manifest binding is mandatory?
56. Is the release authorization checklist complete, and which authority signs
    the exact manifest-bound statement?
57. Does publication occur only after release authorization, and how is the
    published registry/artifact digest independently verified?
58. Is the future P1-05 graduation checklist approved as the minimum rule?
59. May the future P1-05 graduation signer be the H-14 approver, residual-risk
    approver, release authorizer, artifact signer, or Platform owner, or must a
    different independence rule apply?
60. Must publication of the exact 1.0 artifact set precede, coincide with, or
    follow the P1-05 graduation act, and how is failure between those acts
    handled?
61. Are the graduation invalidation/reopening rules complete for reopened gaps,
    changed digests/artifacts, failed independent evidence, interop regression,
    new review blockers, compromised keys, support changes, and incomplete
    manifests?
62. What post-1.0 rules distinguish a security patch, non-semantic erratum, new
    H-03 release, deprecated/withdrawn release, SDK-only patch, and semantic
    protocol change?
63. Who owns vulnerability intake, embargo, disclosure, advisory, remediation,
    emergency withdrawal, artifact/key compromise, and post-incident evidence?
64. What exact archive availability and retention policy applies to every
    long-lived artifact/evidence class, subject to H-07/H-09/H-11 floors?
65. Are the compatibility, migration, operational, security, privacy, legal,
    and disclosure consequences recorded in this proposal understood and
    accepted or amended?
66. Is every residual risk recorded above accepted, rejected, mitigated, or
    amended explicitly?
67. Who is the accountable human approver for the final H-14 disposition, and
    what durable sign-off/reference will bind that approval?

## Human approval checklist

Checked boxes record resolution of H-14 governance policy only. They do not
claim that any deferred release-specific evidence, downstream artifact, review,
authorization, publication, or P1-05 act exists.

- [x] Select Option B and every qualification in Accepted disposition §§1–28.
- [x] Name the standing accountable authorities and approve all role-overlap,
      separation-of-duties, conflict, and no-generic-quorum rules.
- [x] Approve the P-C-shaped package architecture and the package-control
      amendment that makes exact names/control a non-waivable pre-publication
      gate; no external coordinate is claimed as controlled by this check.
- [x] Approve intended Apache-2.0 and LEGAL-PATH-B; exact legal clearance remains
      a non-waivable pre-publication gate.
- [x] Approve release/publication classes and R-C followed by separately
      authorized, explicitly non-1.0 R-B prerelease governance.
- [x] Approve the governance-level release artifact inventory and public/private
      disclosure classes; exact artifacts remain later evidence.
- [x] Approve immutable release/evidence-manifest conceptual bindings; no schema
      or instance is created.
- [x] Approve S-B build/provenance/SBOM/dependency/signing/key/compromise and
      rollback governance; exact technologies and keys remain later evidence.
- [x] Approve W-C plus W-D and the six numeric minimum floors, with exact dates
      per release and the support-capacity amendment before a supported claim.
- [x] Approve A-C3 ordinary and security active-Connection treatment under
      H-07/H-11.
- [x] Approve E-B emergency declaration, non-waivable gates, temporary status,
      retrospective review, and re-gating.
- [x] Select Q-C D2-05A/D2-05B sequencing; future plan/traceability edits remain
      downstream and close no gap here.
- [x] Select I-D with minimum I-B-equivalent roles/profiles and the approved
      production/clean-room threshold.
- [x] Approve the bidirectional interoperability matrix, mandatory PASS policy,
      two-rerun rule, environment coverage, and report integrity.
- [x] Approve the D2-05 conformance release gate; no result is created.
- [x] Approve V-C with V-A/V-B external control, complete scope, timing,
      disclosure, and retest rules; no review is claimed complete.
- [x] Approve the CRITICAL/HIGH, normative-ambiguity, supply-chain, MEDIUM, and
      LOW remediation treatment in §18.
- [x] Approve RR-B, permitted classes, the complete non-waivable floor, record,
      expiry, conflict, and disclosure rules; no release-specific risk is
      accepted here.
- [x] Approve the release-authorization checklist and release-specific authority
      rule; no exact release is authorized.
- [x] Approve the future P1-05 checklist, signer-independence rule, and
      publication/graduation ordering; P1-05 is not executed.
- [x] Approve failure/reopening, post-1.0 maintenance,
      vulnerability/disclosure, incident, archive, and retention governance.
- [x] Confirm H-01 through H-13 are preserved and no H-14 choice redefines their
      semantics or history.
- [x] Confirm `GB-051` technical fixture/evolution semantics remain H-13-owned,
      `GB-052` cryptographic/vector semantics remain H-10-owned, and H-14 governs
      only release-evidence sufficiency.
- [x] Accept the stated compatibility, migration, operational, security,
      privacy, legal-process, and disclosure impacts without authorizing their
      downstream execution.
- [x] Accept all twenty recorded governance residual risks subject to approved
      mitigations and the non-waiver qualification.
- [x] Record approver identity, approval date, exact approved option/subchoices,
      three material amendments, accepted risks, compatibility impact, security
      impact, and durable sign-off/reference.

## Human disposition

**Human approval statement:** “I approve H-14.”

**Approver:** Rudra Sharma — H-14 Human Approver

**Approval date:** 2026-08-11

**Approved option:** Option B — Evidence-bound separation of duties

**Approved qualifications:** The complete Accepted disposition §§1–28,
including the package-control non-waivable pre-publication amendment,
LEGAL-PATH-B, and the support-capacity non-waivable
pre-supported-release/support-claim amendment.

**Standing governance identities:**

- Rudra Sharma — Protocol Governance Owner;
- Rudra Sharma — H-14 Human Approver;
- Rudra Sharma — Package / Registry Governance Owner;
- Rudra Sharma — Security Response / Vulnerability Owner; and
- Rudra Sharma — Support / Deprecation / Withdrawal / Archive Owner.

**Accepted risks:** All twenty risks in “Residual risks of every option” are
accepted as governance residual risks subject to the recorded mitigations. This
acceptance is not future release-specific vulnerability acceptance, waives no
non-waivable blocker, closes no `GB-*` gap, and cannot turn failing, missing,
unknown, unavailable, omitted, or indeterminate evidence into success.

**Compatibility impact:** The compatibility, migration, historical,
operational, privacy, legal-process, and disclosure impacts in §28 and the
retained analysis are accepted. `ghostbridge/0.1-draft` remains immutable;
H-03 remains the sole release identity/compatibility authority; H-13 remains
schema/evolution authority; package identity remains distinct from wire
identity; no active Connection is silently mutated; and later restructuring
requires migration guidance.

**Security impact:** The disposition establishes separation of duties,
independent review control, non-waivable remediation and evidence blockers,
H-10/supply-chain signing separation, incident-response governance, and an
independent P1-05 graduation boundary. The original twenty governance risks
remain accepted with their mitigations and without release-specific waiver.

**Durable approval source:**
`.git/H-14-human-approval-rudra-sharma-2026-08-11.txt`

**Approval-source SHA-256:**
`523E31708E5430458BDE3073FDA290957B5BBF55C089C06C38744CDD8F3C835C`

**Approved candidate-disposition SHA-256:**
`5A6193FAB971AF3160E4245349AD2B36564F88340866788B47E9F186D52E3892`

## Resulting status

`ACCEPTED`

## Final governance boundary

- H-01 through H-13 remain `ACCEPTED` and unchanged.
- H-14 is `ACCEPTED` with the exact human disposition above.
- All 60 `GB-*` gaps remain open; H-14 acceptance closes none.
- H-14 is the final `H-*` decision in the current register, but not the final
  downstream gate.
- H-14 acceptance completes no D1, D2, E, or P1 work item.
- No normative specification is completed or modified.
- No schema, schema bundle, or manifest is created.
- No executable state machine is created.
- No fixture, vector, or conformance case is created.
- No SDK artifact, package, implementation, or independent implementation is
  created.
- No conformance or interoperability run is performed.
- No external security review or remediation is performed.
- No migration or deployment is authorized.
- No release authorization for an artifact set is exercised.
- No publication or release is performed.
- No Protocol 1.0 graduation occurs.
- The H-14 approval date is not a P1-05 or Protocol 1.0 graduation date.
- Future P1-05 evidence-backed human sign-off remains required.

**H-14 is ACCEPTED.**
