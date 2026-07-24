# Replay protection

Replay protection is separate from idempotency. The first authenticated message consumes its issuer/key/message/audience/Connection/nonce tuple until expiry. An identical authenticated message is rejected.

A fresh authenticated message can reuse the same business idempotency key and receive the stored business result. Replay cache implementations must provide bounded capacity, expiry cleanup, and atomic consumption across the execution boundary.
