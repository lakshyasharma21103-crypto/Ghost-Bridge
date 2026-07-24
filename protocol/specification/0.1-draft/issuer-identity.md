# Issuer identity

Status: **Experimental security profile**

A Passport Issuer issues and maintains verifiable Agent Passports and authorizes public keys for Ghost Bridge trust objects. Remote identity is a normalized absolute HTTPS origin, such as `https://issuer.codeforge.example`; a display name such as “CodeForge” is not identity.

User information, query strings, fragments, paths, arbitrary schemes, private/loopback destinations, and policy-prohibited ports are rejected. URL parsing performs safe IDNA hostname normalization. HTTP localhost is available only with explicit local test mode and an exact allowlist. Comparisons use the normalized exact origin.

Root bootstrap is a host or administrator decision: an organization may pin root JWK thumbprints or approve them through issuer review. Registry observation does not establish issuer identity or host approval.
