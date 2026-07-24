# Authentication profiles

Connection Offer negotiation can select explicit safe-local `none`, OAuth-based user authorization, mutual TLS, signed request, managed/delegated credential, or platform-brokered authentication.

Every profile defines discovery/support, selection, user interaction, credential storage boundary, audience, refresh/revocation, proof of possession, and safe errors. Phase 15C does not build a general identity provider and automated tests use deterministic synthetic authorization only.
