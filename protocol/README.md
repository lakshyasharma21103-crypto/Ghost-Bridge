# Ghost Bridge Protocol

Ghost Bridge is an open protocol for installing external AI agents into
compatible Host Applications.

**Official tagline:** Install external agents into any compatible application.

Ghost Bridge replaces provider-specific, endpoint-first integration with a
universal Host Application to External Agent installation and execution model.
The Protocol defines portable messages, public JSON Schemas, Native SDK
contracts, and conformance behavior. The commercial Ghost Bridge Platform is
one compatible implementation, not a required dependency.

Protocol version `ghostbridge/0.1-draft` is experimental. Its Phase 15C trust
profile is a production-oriented draft, not a security certification. An
independent implementation and external security review have not been
completed.

## Repository map

- `specification/0.1-draft` — normative draft and security/privacy guidance
- `schemas/0.1-draft` — public JSON Schemas
- `examples/codeforge-agent-provider` and `examples/flowdesk-host` — independent
  universal compatibility fixtures
- `examples/governed-host-agent` — direct LedgerWorks/OpsCanvas governed fixture
- `examples/two-agent-workflow` — Experimental/Deferred coordination fixture
- `threat-model` — trust boundaries, threats, and mitigations
- `../packages/ghostbridge-protocol-core` — portable DTOs and validation
- `../packages/ghostbridge-trust` — canonicalization, issuer/JWK validation,
  proof, policy, revocation, replay, request, and receipt verification
- `../packages/ghostbridge-issuer` — reference local issuer and isolated
  test-key provider
- `../packages/ghostbridge-native-client` — generic Host Client foundation
- `../packages/ghostbridge-native-agent` — Native Agent foundation
- `../packages/ghostbridge-conformance` — local conformance foundation

Ghost Bridge Native has no dependency on legacy agent integration adapters,
URLs, clients, servers, or transports. No migration tooling for those systems
is part of the Native protocol.

## Active profiles

- **Core (C1-C3):** discovery, identity, installation, authentication,
  capabilities, Invocation, Tasks, Receipts, and revocation.
- **Governed Execution (G1-G3):** organization/workspace policy, authorization,
  Data Contracts, approval, idempotent durable execution, and audit evidence.
- **Agent Coordination:** Experimental/Deferred. Delegation and multi-agent
  coordination are not required by either active profile.

## Lifecycle

DISCOVER → VERIFY → PREVIEW COMPATIBILITY → AUTHENTICATE → INSTALL → INVOKE →
OBSERVE TASK → VERIFY RECEIPT → REVOKE

## Licensing boundary

No repository license was changed. Future open candidates include the
specification, JSON Schemas, protocol core types, conformance tests, reference
examples, and selected SDK components. Hosted control-plane, enterprise
administration, managed policy/secrets/observability, commercial operations,
support, and private deployment tooling are Platform candidates. The final
licensing split requires explicit owner approval.
