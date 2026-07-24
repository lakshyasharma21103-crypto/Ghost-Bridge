# Key lifecycle

Status: **Experimental security profile**

Normal lifecycle:

`generated → prepublished → active → retiring → retired`

Emergency lifecycle:

`active → compromised → revoked`

Suspension and expiry are explicit states. Only active, purpose-authorized keys sign new objects. Prepublished keys allow cache refresh before activation. Retiring keys verify bounded older objects during overlap. Retired keys may remain for historical verification but cannot sign new trust objects. Revoked and compromised keys cannot authorize installation or execution.

Every transition is audited. A `kid` is never reused, and its public-key thumbprint cannot change. Production configuration rejects the local synthetic test-key provider.
