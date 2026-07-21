# Scoped Inter-Agent Delegation and Data Contracts

Phase 13D3 adds explicit, tenant/workspace-scoped delegation between frozen orchestration nodes. Ghost Bridge remains the only delegation authority: agents never mint grants, exchange credentials, or call one another. The target executes as its own installed Agent Passport and connection through the existing Runtime Gateway.

## Trust boundaries

A runtime credential authorizes the Runtime Gateway to call one installed agent. It stays encrypted and is brokered only inside the gateway. An `InterAgentDelegationGrant` is different: it authorizes the control plane to move a bounded, schema-approved subset of data from one frozen node identity to another for one purpose. It contains IDs, constraints, counters, and safe metadata—never credential material or a reusable bearer capability.

The internal delegation reference is a high-entropy, audience-bound, one-use database record. Only its hash is stored. It expires quickly, is consumed inside the delegation service immediately before gateway invocation, and is omitted from APIs, frontend state, logs, audits, snapshots, and the target payload.

Contracts, grants, invocation metadata, orchestration snapshots, audits, evidence, exports, and metrics exclude credentials, install/provider keys, authorization headers, prompts, source code, private memory, hidden reasoning, unrestricted policy context, and unrelated node output.

## Durable records and lifecycle

`InterAgentDataContract` is scoped by organization and workspace and uniquely versioned by name. Its lifecycle is:

```text
draft -> active -> archived
```

Validation is required before activation. Active versions cannot be edited in place; an update creates the next draft version. New runs may use only active, currently valid versions. A run freezes the contract ID, version, input/output schema hashes, edge endpoints, and selected agent identities. Archiving stops new use while existing runs may finish with their frozen version.

`InterAgentDelegationGrant` binds one contract version to the selected source/target passports, connections, capabilities, operations, run, and node runs. It is purpose-, classification-, time-, invocation-, and depth-bounded. Its state machine is:

```text
pending -> active -> exhausted | expired | revoked | completed
pending -> rejected | expired | revoked
```

Approval-required grants remain unusable in `pending`. Run success completes unused active grants; cancellation or failure revokes unused pending/active grants. Revocation and invocation reservation use conditional atomic updates.

`InterAgentDelegationInvocation` stores immutable binding/accounting metadata and safe statistics. Payloads are not stored in the grant or invocation record. Invocation states are:

```text
prepared -> approval_required -> invoking -> succeeded
prepared/approval_required/invoking -> failed | cancelled | rejected
failed -> invoking
```

Each distinct idempotency hash reserves one ordinal atomically. Concurrent workers cannot exceed the grant limit. A replay of the same request reuses its invocation and ordinal, and the Runtime Gateway receives a stable `inter-agent:<grant>:<invocation>` idempotency key.

## Contract validation

Activation validates scope and versioning, bounded non-executable selectors, source/target capability and operation catalogs, JSON Schemas and stable hashes, mappings, allow/deny paths, transformations, redactions, minimization settings, classification ceiling, region/residency compatibility, payload/attachment/depth limits, retention, approval conditions, central RBAC/policy authorization, and the operational guard. Failures use stable `DATA_CONTRACT_*` codes and safe field paths without values or policy internals.

Selectors support exact passport/connection identity and bounded publisher, capability category, trust tier, selection-policy, orchestration-definition, and node-key constraints. Matching is always performed inside the request organization/workspace against connected invoke-scoped installations, valid passports, and current capability catalogs. Selectors are data, not executable expressions.

## Invocation authorization and data processing

Before every invocation, the service reloads the frozen contract and grant, verifies tenant/workspace and node bindings, revalidates both passport/connection identities and versions, capabilities/operations, status, validity, approval, parent/depth rules, and operational state, atomically reserves capacity, derives the effective classification, enforces classification/region/residency support, and evaluates the existing policy engine. Any denial stops the pipeline.

Data then passes through this fixed order:

1. Safe clone and allowlist extraction from source output, run input, declared dependencies, bounded metadata, or explicit literals.
2. Denylist override.
3. Ordered deterministic transformations.
4. Field-level redaction.
5. Schema-driven minimization and bounds.
6. Contract/target input-schema validation.
7. Runtime Gateway invocation.
8. Target Passport, contract, and orchestration output-schema validation.
9. Output allowlisting and minimization.

Only own enumerable data properties are read. Accessors are rejected without execution; inherited properties are ignored. Dangerous path segments, prototypes, functions, symbols, circular structures, unsupported object types, excessive depth/arrays/strings, and oversized payloads fail closed. Hidden-reasoning and security-sensitive fields are stripped before validation and cannot be reintroduced by mappings.

The transformation language is a closed allowlist: select, rename, literal insertion, bounded string truncation, bounded array slicing, date normalization, enum mapping, numeric clamping, boolean normalization, wrapping, bounded flattening, SHA-256 hashing, and approved deterministic pseudonymization. It has no JavaScript, templates, regular-expression replacement, dynamic imports, database access, shell execution, or network access.

Redaction supports remove, fixed replacement, bounded masking/truncation, SHA-256 hashing, and approved pseudonymization. It runs before preview, audit/evidence metadata, persistence, or invocation. Minimization removes undeclared, unused, optional empty/null, and over-limit data while producing only counts and approximate byte-size categories.

## Classification, residency, approval, and delegation depth

Classification order is `public < internal < confidential < restricted`; the highest applicable source, schema, policy, and contract value wins. A downstream agent cannot lower it. The target capability and contract ceiling must both permit the result. Contract region and residency lists are compared with the target catalog and invocation metadata using bounded normalized labels; uncertainty denies the invocation.

The existing approval service is reused for contract- or policy-required delegation. Approval context contains safe identities, field names/counts, classification, purpose, size category, depth, and expiry—not values. Approval/rejection is resolved before the pending grant can transition.

Delegation is non-transitive by default. A child requires both contract and parent authorization, the parent target must be the child source, and the lowest platform/contract/grant depth bound applies. Parent cycles and repeated passport paths are rejected. Phase 13D3 supports bounded lineage; dynamic graphs and generalized agent-created subdelegation remain out of scope.

## API, operations, and retention

The Partner-authenticated APIs are mounted under `/api/v1`:

- `/inter-agent-contracts` for create/list/detail/update/validate/activate/archive.
- `/inter-agent-delegations/grants` for create/list/detail/revoke.
- `/inter-agent-delegations/evaluate` and `/preview` for authorized dry evaluation and redacted metadata-only previews.
- `/inter-agent-delegations/invocations` for safe list/detail metadata.

Every query is organization/workspace scoped and list endpoints use bounded pagination, stable sorting, escaped search, and status filters. Serializers never return payloads, idempotency hashes, internal references, or credentials.

Retention modes are `metadata_only`, `validated_output_only`, `encrypted_short_term`, and `no_payload`. The dedicated delegation-invocation record always contains safe metadata only; any retry payload handled by the existing Runtime Gateway is already redacted/minimized and encrypted under its established durable-recovery controls. Contract-filtered output is applied inside the gateway before its normal invocation persistence. Audit actions enter the existing normalized evidence chain. Tenant export includes safe contract/grant/invocation metadata, and scoped deletion removes references, invocations, grants, then contracts. Metrics use bounded status, classification, depth, size, and failure-category labels—never entity IDs.

The compact console adds Data Contracts, Delegation Grants, and Delegation Invocations views, safe details/revocation, and contract-edge selection in the orchestration definition editor. It never renders internal references or credentials.

## Migration and verification

Run the restart-safe, idempotent index/backfill migration and deterministic verifier:

```powershell
npm run migrate:inter-agent-delegation
npm run verify:inter-agent-delegation
```

The migration creates tenant/status, name/version, selector, capability, expiry, run/node, parent, ordinal, request/trace, status, hashed-idempotency, and one-use-reference indexes. It only backfills a missing orchestration-edge `mappingMode` to `direct`; existing snapshots are not rewritten.

The verifier uses two local mock agents and no provider/network/database mutation. Live Gemini and external-flow verifiers remain manual billed gates.

## Known limitations reserved for Phase 13D4+

- No cross-organization or implicit cross-workspace delegation.
- No attachments, streaming channels, dynamic graph mutation, or executable mapping language.
- No visual graph/data-contract designer beyond the compact structured editor.
- No global multi-region coordinator; residency enforcement depends on normalized catalog/contract metadata.
- No generalized agent-minted or freely transferable delegation tokens.
- No compensation/saga semantics for downstream side effects.
