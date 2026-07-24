# Key rotation

Generate inside the key provider, prepublish the public JWK, increase metadata sequence, refresh hosts, activate the replacement, overlap the old retiring key for bounded historical objects, then retire it. Never reuse a `kid` or change key material beneath it.

Unexpected root/origin/algorithm changes require administrator review. Operational compromise triggers emergency revocation, cache invalidation, Connection reevaluation, and replacement artifacts. Root compromise requires issuer suspension and out-of-band recovery.
