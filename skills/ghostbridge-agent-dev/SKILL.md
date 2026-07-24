---
name: ghostbridge-agent-dev
description: Design, build, secure, and test Ghost Bridge Native agents and clients with the repository SDK.
---

# Ghost Bridge agent development

Use this skill only for Ghost Bridge Native work. Never generate adapter code
for another agent protocol.

## Discovery before implementation

Ask and record:

1. What does the agent do and who operates it?
2. Who issues and revokes the Agent Passport?
3. Is the agent local or remote?
4. Which capabilities are exposed and which have side effects?
5. Which data classes are accepted, produced, and prohibited?
6. Is delegation permitted, and within which capability and data bounds?
7. Is human approval required?
8. Is durable execution or cancellation needed?
9. Which Receipt profile is required?
10. Which Organization and Workspace scopes apply?
11. How are keys rotated and revocation caches invalidated?

Do not write implementation code until these decisions are explicit.

## Implementation

Read the relevant files in `references/`. Use
`@ghostbridge/protocol-core`, `@ghostbridge/native-agent`, and
`@ghostbridge/native-client` exactly as documented in this repository.

Generate bounded Capability Contracts and Data Contracts. Keep credentials out
of source, Passports, Connection Offers, logs, fixtures, and examples. Explain
every security-sensitive decision.

## Verification

Create tests for validation, Organization isolation, Workspace isolation,
idempotency, deadline, cancellation, approval binding, delegation bounds, data
projection, Receipt verification, and revocation. Run the package tests and
Ghost Bridge conformance verifier.

