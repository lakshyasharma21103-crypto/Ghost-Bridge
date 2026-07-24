# Request integrity

`ghostbridge-http-signature/0.1-draft` is a negotiated signed-request profile following established HTTP Message Signature semantics. It binds method, path, content digest, creation/expiry, Connection, protocol, Invocation, audience, nonce, and configured tenant scope.

Changing any bound component invalidates the proof. Signed request is optional at the protocol level but mandatory when selected for a Connection. OAuth, mTLS, managed credentials, and platform-brokered modes remain separate profiles.
