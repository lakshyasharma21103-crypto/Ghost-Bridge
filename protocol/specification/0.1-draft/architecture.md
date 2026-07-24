# Architecture

Ghost Bridge separates identity, installation, governance, execution, and
evidence layers. A Client discovers an Agent, negotiates a version, validates
its Passport and Capability Contracts, resolves a one-time Install Grant, and
creates a scoped Connection. Invocations carry tenant scope, deadlines,
capability versions, data classifications, and idempotency where required.
Delegation, data projection, and approval are evaluated before execution.
Tasks expose safe progress and Receipts expose bounded evidence.

Implementations choose their own database, queue, cloud, identity provider,
policy engine, and runtime topology. Internal storage records are never wire
messages; implementers project them through explicit public DTO mappings.
