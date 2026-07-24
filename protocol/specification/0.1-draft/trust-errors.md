# Trust errors

Status: **Experimental security profile**

Trust failures expose stable bounded codes and safe messages. Categories include issuer identity/discovery/metadata, JWKS/key state, algorithm/proof/signature, payload/manifest/audience/issuer mismatch, time/nonce/replay, revocation freshness/rollback, Connection trust, Receipt proof/history, and policy denial/review.

Cryptographic exception text, attacker-controlled URLs, private policy rules, key material, credentials, tokens, cookies, raw grants, and full input/output are not returned. Retryability is explicit only for safe transient discovery/freshness conditions.
