# Passport signing

The issuer signs the public Agent Passport with a purpose-authorized operational key. The Passport binds identity/version/status/validity, declared profiles/transports/authentication/data/approval/Receipt/revocation, the exact Capability Manifest digest, and authorized Agent execution-key thumbprints.

The host verifies the proof, issuer, key purpose/state, time, policy, revocation, and manifest set/digests. It never receives source code, system prompts, hidden reasoning, private memory, credentials, runtime tokens, or private keys.
