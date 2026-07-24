# Phase 15C cleanup inventory

Recorded: 2026-07-24.

| Item | Finding | Action | Status |
|---|---|---|---|
| Phase 15A deterministic HMAC signer | Still used by legacy protocol-core fixture tests and clearly marked `TEST-ONLY`; not accepted by Trust Profile allowlist | Retained for backward-compatible non-production tests; `@ghostbridge/trust` rejects `HS*` | retained/quarantined |
| Duplicate digest helpers | Protocol-core digest serves legacy wire fixtures; trust digest adds canonical/profile semantics | Trust objects use only `@ghostbridge/trust` canonical digest | consolidated by boundary |
| Duplicate proof validators | Phase 15A uses generic proof placeholders | Production-oriented proof verification centralized in `@ghostbridge/trust` | superseded without deleting compatibility |
| Placeholder issuer verification | Native agent returned `verified_for_draft_fixture` | Replaced with separate `cryptographicStatus` and `hostTrustStatus`, both `not_evaluated` until verified | removed |
| Ambiguous install badge | UI displayed “Issuer verified” without distinct evidence | Replaced with cryptographic, host-trust, Registry, and freshness states | removed |
| Static test private keys | None found | Synthetic Ed25519 keys are generated in process and non-exported | clean |
| Production verification bypass | No Phase 15C bypass added | `trust.required` rejects missing proof; local HTTP/key provider require explicit test mode | clean |
| Provider-name branches/adapters | No Native package branch on CodeForge/provider name | Independent fixtures use public messages | clean |
| Unsigned production trust path | Legacy Core remains compatible but is not labeled trusted | Governed trust policy can require signed artifacts; no `skipVerification` option exists | bounded |
| Duplicate revocation resolver | Legacy point lookup retained for Core runtime compatibility | Signed snapshots/caching live in trust package | retained boundary |
| Fictional audit/certification claims | Registry and docs reviewed | Explicit external-audit-not-completed labels added | clean |

Historical migrations, audit evidence, secret governance, live-provider manual verifiers, and Experimental/Deferred Agent Coordination code were not removed.
