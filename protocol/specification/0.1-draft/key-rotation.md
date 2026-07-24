# Key rotation and compromise recovery

Status: **Experimental security profile**

Rotation generates a key inside a non-exporting provider, prepublishes its public JWK, refreshes host caches, activates it, moves the old key to retiring, overlaps verification for unexpired objects, then retires the old key. Metadata sequence increases and cache keys include issuer, sequence, key ID, and thumbprint.

Valid installations need not be reinstalled when the issuer and root remain approved and policy permits the authorized rotation. Unexpected root/origin change, algorithm change, rollback, or policy violation requires administrator review.

On operational-key compromise, the issuer stops signing, marks the key compromised, publishes a higher-sequence emergency revocation set, activates a prepublished replacement if available, invalidates caches, blocks new installation/Connections, reevaluates active Connections, and issues replacement Passports. Root compromise requires explicit suspension and out-of-band administrator recovery; it is not silently automated.
