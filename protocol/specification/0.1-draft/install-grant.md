# Install Grant

An Install Grant is opaque, cryptographically random, high entropy, short-lived,
one-time by default, replay protected, revocable, auditable, and bound to its
Issuer and Agent plus Organization/Workspace where configured. It contains no
Passport data or credentials.

Resolution returns the verified public Passport, public Capability Contracts,
a secret-free Connection Offer, issuer verification summary, requested scope,
restrictions, expiration, and redemption state. Redemption is atomic and
idempotent; concurrent redemption creates one Connection.
