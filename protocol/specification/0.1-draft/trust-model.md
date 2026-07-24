# Trust model

Trust begins with an Issuer and its verifiable Agent Passport, not an arbitrary
endpoint. Clients validate status, version, expiration, audience, tenant scope,
and revocation before use. Install Grants are high-entropy, short-lived,
one-time, issuer/agent-bound, and tenant-bound where configured. Delegations
never inherit ambient authority and cannot expand capability, data class,
tenant scope, lifetime, use count, or chain depth.

The production signature suite, issuer assurance levels, key transparency,
hardware protection, and federation rules remain draft. Implementations must
not infer trust from transport reachability alone.
