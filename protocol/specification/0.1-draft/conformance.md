# Conformance

## Core profile

- **C1 — Discovery and identity:** discovery, version negotiation, profile
  declarations, Passport, and revocation declarations.
- **C2 — Installation and authentication:** C1 plus opaque Install Grant
  resolution, safe compatibility preview, authentication-mode negotiation,
  capability approval, and scoped Agent Connection.
- **C3 — Execution lifecycle:** C1-C2 plus capability discovery, bounded
  Invocation, Execution Task, Execution Receipt, standard failures, and
  authoritative connection revocation.

## Governed Execution profile

Governed Execution includes Core C1-C3.

- **G1 — Scoped access:** organization/workspace isolation, authentication, user
  authorization, and least-capability installation.
- **G2 — Policy and human control:** capability policy, Data Contract
  enforcement, prohibited-field blocking, and action-bound Approval Challenge
  and Decision.
- **G3 — Durable auditability:** idempotent side effects, durable Tasks,
  Receipts, bounded failure semantics, and revocation.

## Deprecated aliases

Draft `Level 1` through `Level 3` command names remain compatibility aliases.
They MUST NOT be interpreted as requiring delegation for Core or Governed
Execution.

## Experimental profile

Agent Coordination, including Delegation Grants and multi-agent flows, is
Experimental/Deferred and is not an active conformance dependency.
