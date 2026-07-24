# Ghost Bridge trust overview

`ghostbridge-trust/0.1-draft` is a production-oriented **Experimental security profile**. It uses established cryptographic standards but is not externally audited, formally verified, production certified, or stable as Protocol 1.0.

Trust is four results, not one badge:

- cryptographic validity of the exact signed bytes;
- authentic association between an exact HTTPS issuer and an approved root;
- organization/workspace policy approval;
- current operational validity of metadata, keys, Passport, capabilities, Connection, and revocation.

An unknown issuer can be cryptographically valid without being trusted. The normative design is in [trust-profile.md](../../protocol/specification/0.1-draft/trust-profile.md).
