# Phase 15B cleanup baseline

Recorded: 2026-07-24

This baseline was captured before Phase 15B restructuring. The Phase 15A
working tree was intentionally preserved; it was not reset or rewritten.

## Repository state

- Git status: Phase 15A changes are present as an uncommitted working tree.
- Staged secret scan: no staged secret-shaped values were found.
- Tracked environment files: placeholder-only `Backend/.env.example`,
  `external-agent/.env.example`, and `frontend/.env.example`.
- Real `.env` files tracked: none.
- Frontend route declarations: 129.
- Supported Node.js version: 20 or newer.
- Module formats: CommonJS portable SDKs and backend; ESM React/Vite frontend.

## Workspaces

- `backend`
- `external-agent`
- `frontend`
- `@ghostbridge/protocol-core`
- `@ghostbridge/native-client`
- `@ghostbridge/native-agent`
- `@ghostbridge/conformance`
- `@ghostbridge/example-invoice-agent`
- `@ghostbridge/example-accounting-agent`

The four Native packages exposed a root entry point through `main` and `types`;
explicit export maps had not yet been added.

## Deterministic verification

| Check | Result |
| --- | --- |
| `npm test` | PASS, 935 tests, 0 failures |
| `npm run build --workspace frontend` | PASS, 1,682 modules transformed |
| `npm run verify:ghostbridge-native-protocol` | PASS, 26 checks |

The frontend baseline build emitted a non-failing warning for an 814.62 kB
JavaScript chunk. Public/Console route-level splitting is Phase 15B follow-up
work, not a baseline failure.

## Manual-only state

- `verify:gemini-agent = blocked_provider_unavailable`
- `verify:external-flow = deferred`
- `external.grounded_research = disabled`
- `external.grounded_research = non-billable`

No live-provider or performance command was run while recording this baseline.

