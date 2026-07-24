# Delegation Grant

> **Profile status: Experimental/Deferred.** Agent-to-agent Delegation belongs
> to the future Agent Coordination profile. It is not required for Core C1-C3
> or Governed Execution G1-G3 compatibility.

A Delegation Grant binds delegator, delegate, parent Invocation, tenant scope,
allowed capabilities, input contracts and data classes, prohibited classes,
maximum/remaining uses, start/expiry, revocation, and optional proof.

The delegate cannot expand any authority or extend expiration. Exhausted,
expired, revoked, cross-tenant, or capability-mismatched grants are rejected.
Further delegation is false by default and chain depth is bounded.
