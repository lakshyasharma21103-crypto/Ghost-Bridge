# Replay protection

Status: **Experimental security profile**

Replay protection asks whether an authenticated message was already presented; idempotency asks whether a repeated business operation should execute again. Both controls are required where declared and are evaluated separately.

Signed messages bind a message ID, issuance, expiry, audience, issuer/key, content digest, Connection, and nonce when challenged. A bounded atomic cache retains the tuple through its validity window. Duplicate messages/nonces, expired messages, excessive future issuance, altered content, wrong audience, and nonce reuse across Connections are rejected. A fresh authenticated request may reuse a business idempotency key and receive the existing business result.
