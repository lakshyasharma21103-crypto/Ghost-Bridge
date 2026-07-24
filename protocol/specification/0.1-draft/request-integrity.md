# Request integrity

Status: **Experimental security profile**

`ghostbridge-http-signature/0.1-draft` is a negotiated authentication profile. It is not mandatory for every Core implementation.

The signed descriptor follows established HTTP Message Signature concepts and binds method, target path, content digest, creation/expiry, Connection, protocol version, Invocation, nonce, audience, and configured tenant scope. Volatile proxy headers are excluded. Changing method, path, body, audience, Connection, or nonce invalidates verification.

OAuth-based user authorization, mutual TLS, managed/delegated credentials, and platform-brokered authentication remain separate negotiated profiles. This draft does not implement a general identity provider; deterministic tests use synthetic authorization.
