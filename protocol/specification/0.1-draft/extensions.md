# Extensions

An Extension Declaration MAY list the protocol profile identifiers to which it
applies. Compatibility is evaluated before grant redemption. An unsupported
required extension makes the Agent incompatible; an unsupported optional
extension produces a compatible-with-limitations result. Extensions MUST NOT
weaken Core or Governed Execution requirements.

Optional extensions use globally distinguishable namespaced keys such as
`dev.example.feature`. Unknown optional extensions may be ignored. Unknown
required behavior fails safely and must not be silently treated as supported.

Extensions cannot weaken tenant isolation, revocation, capability scope,
delegation limits, data boundaries, approval binding, or message bounds.
