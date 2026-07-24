# Revocation

Revocable subjects are Passports, Install Grants, Connections, Capabilities,
Delegations, and issuer keys. Status includes an opaque revocation ID, subject,
status/reason, effective time, optional temporary expiry/replacement, issuer,
and optional proof.

Revocation is checked before installation and Invocation. Cache lifetime is
bounded; critical changes invalidate relevant caches. Replacement never
automatically restores trust.
