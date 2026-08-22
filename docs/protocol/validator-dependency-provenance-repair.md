# Primary Validator Dependency-Provenance Repair

Classification: **NON-NORMATIVE ENGINEERING / REPRODUCIBILITY EVIDENCE**

## Baseline and finding

This repair is based on commit
`2bd192913a27abeb0f24f2a7b219d062bb12ecdb`. It addresses
`PROTOCOL_VALIDATOR_DEPENDENCY_PROVENANCE`: the existing primary Ajv validator
was executable through compatible workspace dependencies and npm hoisting, but
the repository root did not directly own the validator dependency used by
`protocol/schema-validation`.

The corrected runtime-consumer inventory is:

- `backend`, which independently declares Ajv for legitimate runtime use; and
- `@ghostbridge/protocol-core`, which independently declares Ajv for legitimate
  runtime use.

Neither consumer owns Ajv on behalf of the protocol schema-validation tooling.

## Repair and executable evidence

The private repository root now owns `ajv` `8.20.0` as an exact
`devDependency`. Exact versioning makes a future primary-engine upgrade a
deliberate manifest, lock, verifier, and evidence change instead of allowing a
compatible range to silently change the engine identity.

The lockfile records the matching root ownership edge and retains the reviewed
Ajv `8.20.0` HTTPS package record and SHA-512 integrity. The integrity record
makes the selected package artifact reviewable; it is not, by itself,
supply-chain proof.

The offline, built-ins-only provenance verifier resolves `ajv/package.json` and
`ajv/dist/2020.js` as seen from both
`protocol/schema-validation/validate-r1.mjs` and
`protocol/schema-validation/lib/schema-safety.mjs`. Those source locations must
resolve the same Ajv package identity at version `8.20.0`. A physical path such
as repository-root `node_modules/ajv` is deliberately **not** an invariant;
valid npm installation layouts may differ.

The validator implementation remains unchanged. The `backend` and
`@ghostbridge/protocol-core` manifests remain unchanged. The existing Node 20
and Node 22 Phase 15C.1A matrix now runs the provenance check and the existing
foundation, R1, release-data, and Unicode executable-evidence commands. Phase
15C.2 is intentionally unchanged.

## Scope boundaries and remaining debt

Ajv is engineering tooling, not protocol authority. This repair creates no
protocol or representation decision and changes no schema, fixture, registry,
wire format, canonicalization rule, semantic predicate, validator behavior, or
Unicode evidence.

Package-manager and npm-version pinning remains separate reproducibility debt;
this repair adds no `packageManager`, npm engine constraint, `.npmrc`, or
Corepack policy. A genuinely independent second Draft 2020-12 validator remains
pending, `SECOND_VALIDATOR_EVIDENCE_PENDING` remains unchanged, and D2-01
remains incomplete.

This candidate evidence does not claim that the repair is merged, and it makes
no conformance, interoperability, production, release, or Protocol 1.0 claim.
