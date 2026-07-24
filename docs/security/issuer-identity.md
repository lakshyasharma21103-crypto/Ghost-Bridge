# Issuer identity

Remote issuers use normalized exact HTTPS origins. Display names do not establish identity. Discovery derives `/.well-known/ghostbridge-issuer` from the origin and rejects credentials, fragments, paths, arbitrary schemes, remote private/loopback destinations, and redirects by default.

Organizations bootstrap trust with reviewed root JWK thumbprints. Registry observation is not approval. Localhost HTTP requires explicit test mode and an exact allowlist.
