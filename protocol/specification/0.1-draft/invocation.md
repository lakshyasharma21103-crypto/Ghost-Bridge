# Invocation Envelope

An Invocation identifies the exact Agent Passport and Capability version,
Organization and optional required Workspace, initiating subject, deadline,
input contract, optional Delegation and Approval, idempotency key, trace
context, parent invocation, bounded payload/classification, receipt profile,
and extensions.

Side-effecting capabilities require idempotency. Arbitrary target URLs,
expired deadlines, scope mismatch, version mismatch, revoked subjects, and
payloads outside the Data Contract fail safely before execution.
