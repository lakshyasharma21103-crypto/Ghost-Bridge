# Distributed revocation set

Status: **Experimental security profile**

Each issuer publishes its authoritative signed snapshot. It binds issuer, set ID, monotonic sequence, generation and next-update times, status, previous-set digest, bounded entries, extensions, and a purpose-authorized proof.

Entries cover issuer, issuer key, agent key, Passport, Capability Manifest, capability, Install Grant, Connection Offer, Connection, and Receipt profile. States include active, suspended, revoked, compromised, retired, and replaced. Compromise time and replacement references are optional bounded evidence.

Hosts cache only verified sets, persist the highest sequence, verify digest chaining, and invalidate affected metadata/key/Passport/Connection results on updates. High-risk Governed actions fail closed when freshness exceeds policy. Historical Receipts remain stored and receive an explicit `valid_at_issuance`, `valid_with_current_retired_key`, `invalid_due_to_revocation`, or `indeterminate_due_to_compromise` result.
