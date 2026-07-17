# External Research Agent

An independently runnable and deployable Gemini-powered research runtime used through the existing Agent Passport REST adapter. The Gemini API key stays inside this service; the gateway receives only the established bearer-authenticated research response.

## API

- `GET /health` is unauthenticated process liveness. `GET /ready` checks local configuration and draining state without calling Gemini.
- `POST /v1/research/invoke` requires `Authorization: Bearer <token>` and a JSON body such as `{ "topic": "latest AI infrastructure trends" }`.

Successful invocation responses retain the existing `response.summary`, `response.sources`, and `response.runtime` contract. Runtime metadata identifies the configured provider and model without exposing credentials or provider internals.

If grounded research succeeds but transient structured formatting cannot complete within its configured attempts, the error envelope adds `recoveryRequired: true` and the allowlisted reason `FORMATTING_FAILED_AFTER_GROUNDED_RESEARCH`. Callers must not replay the full grounded-research request automatically; the service never returns or persists the intermediate research text.

## Cancellation and shutdown

Closing an active invocation's HTTP connection cooperatively aborts its current provider signal as `REQUEST_CANCELLED` with the safe reason `CLIENT_DISCONNECTED`. Cancellation is checked before every Gemini call and retry, so structured formatting cannot begin after grounded research is cancelled. The per-request active registry contains only safe correlation identifiers, an `AbortController`, and registration time; it is process-local, non-durable, and always removed when request handling ends.

Shutdown remains distinct. The service first drains existing work; after `SHUTDOWN_DRAIN_TIMEOUT_MS`, remaining provider work is aborted as `SERVICE_SHUTDOWN` with `recoveryRequired: true`. Provider stage deadlines remain `GEMINI_REQUEST_TIMEOUT`, and the outer HTTP deadline remains `REQUEST_TIMEOUT`.

A closed response channel cannot receive a cancellation result and does not prove the remote provider stopped before transmission. The Gateway must therefore treat a transmitted operation as outcome-unknown unless a separately declared runtime capability provides trusted cancellation confirmation. This service has no cancellation endpoint, durable job ID, or status-lookup capability.

## Environment

Copy `.env.example` to `.env` only for local use and replace the placeholder token. Never commit `.env`.

| Variable                                     | Required | Default       | Description                                                                                                                                               |
| -------------------------------------------- | -------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                                       | No       | `5002`        | HTTP listen port.                                                                                                                                         |
| `NODE_ENV`                                   | No       | `development` | `development`, `test`, or `production`.                                                                                                                   |
| `EXTERNAL_AGENT_RUNTIME_TOKEN`               | Yes      | None          | Random bearer secret of at least 32 characters.                                                                                                           |
| `ALLOWED_GATEWAY_ORIGINS`                    | No       | Empty         | Comma-separated HTTP(S) browser origins. Requests without an Origin header remain allowed for server-to-server invocation. CORS is not authentication.    |
| `REQUEST_TIMEOUT_MS`                         | No       | `390000`      | Overall external-agent request deadline. It must exceed every configured Gemini attempt, the maximum retry delays, and 10 seconds of processing overhead. |
| `SHUTDOWN_DRAIN_TIMEOUT_MS`                  | No       | `30000`       | Bounded time for active research to finish after readiness is disabled; provider work is aborted at the deadline.                                         |
| `AI_PROVIDER`                                | No       | `gemini`      | `gemini`, or explicit `mock` use during tests/local development. Mock is rejected in production.                                                          |
| `GEMINI_API_KEY`                             | Gemini   | None          | Gemini credential stored only in this deployment's secret manager.                                                                                        |
| `GEMINI_MODEL`                               | Gemini   | None          | Model available to the configured Gemini API project. No model is hardcoded.                                                                              |
| `GEMINI_WEB_SEARCH_ENABLED`                  | No       | `true`        | Enables Google Search grounding.                                                                                                                          |
| `GEMINI_RESEARCH_TIMEOUT_MS`                 | No       | `120000`      | Deadline for each grounded-research attempt.                                                                                                              |
| `GEMINI_FORMATTING_TIMEOUT_MS`               | No       | `60000`       | Deadline for each structured-formatting attempt.                                                                                                          |
| `GEMINI_RESEARCH_MAX_ATTEMPTS`               | No       | `2`           | Total grounded-research calls, restricted to `1` or `2`. The second call is the only retry and uses the reduced fallback profile.                         |
| `GEMINI_FORMATTING_MAX_ATTEMPTS`             | No       | `2`           | Total formatting calls, restricted to `1` or `2`. A retry reuses the in-memory grounded text and never repeats Google Search.                             |
| `GEMINI_REQUEST_TIMEOUT_MS`                  | No       | None          | Deprecated fallback used only when a stage-specific timeout is absent.                                                                                    |
| `GEMINI_RESEARCH_MAX_OUTPUT_TOKENS`          | No       | `2048`        | Bounded output space for the concise primary grounded evidence request.                                                                                   |
| `GEMINI_RESEARCH_FALLBACK_MAX_OUTPUT_TOKENS` | No       | `2048`        | Bounded output space for the concise second grounded request.                                                                                             |
| `GEMINI_FORMATTING_MAX_OUTPUT_TOKENS`        | No       | `1500`        | Maximum output tokens for the separate structured-formatting stage.                                                                                       |
| `GEMINI_MAX_OUTPUT_TOKENS`                   | No       | None          | Deprecated formatting-stage fallback. It does not raise either grounded-research cap.                                                                     |
| `GEMINI_MAX_SOURCES`                         | No       | `8`           | Maximum safe, deduplicated grounding URLs returned.                                                                                                       |
| `GEMINI_THINKING_LEVEL`                      | No       | None          | Gemini 3 formatting-stage thinking level. Grounded research explicitly uses the SDK's `LOW` level.                                                        |
| `GEMINI_THINKING_BUDGET`                     | No       | None          | Gemini 2.5-compatible thinking budget; the current Gemini 3 grounded-research gate uses `LOW` instead.                                                    |
| `EXTERNAL_AGENT_VERIFY_TIMEOUT_MS`           | No       | `410000`      | Live verifier/client deadline. It must exceed `REQUEST_TIMEOUT_MS` and remain below the Backend Runtime Gateway deadline.                                 |

Each Gemini attempt receives a fresh attempt ID, abort signal, and SDK HTTP timeout. SDK-internal retries are disabled. Grounded research retries exactly once only for provider `503 UNAVAILABLE`, provider `504 DEADLINE_EXCEEDED`, an allowlisted transient transport error, or a local provider-attempt deadline. Authentication, quota/resource exhaustion, validation, configuration, blocked responses, and invalid grounding metadata are not retried. Backoff is cancellation-aware and bounded to 1,000–1,499 ms.

Both grounded attempts enable `tools: [{ googleSearch: {} }]`. The primary response is capped at four short evidence records and 512 output tokens. The fallback is capped at two one-line records and 256 output tokens. URLs are accepted only from candidate grounding metadata; model-written URLs are never treated as sources. Formatting starts only after grounded text and genuine metadata sources validate, and formatting retries reuse that in-memory result without Google Search.

Startup validates the full worst-case budget:

```text
(research timeout × research attempts + maximum research retry delay)
+ (formatting timeout × formatting attempts + maximum formatting retry delay)
+ 10,000 ms processing overhead
< REQUEST_TIMEOUT_MS
< EXTERNAL_AGENT_VERIFY_TIMEOUT_MS
< Backend RUNTIME_INVOCATION_TIMEOUT_MS
```

With defaults, the provider budget is 372,998 ms: 241,499 ms for grounded research, 121,499 ms for formatting, and 10,000 ms for processing overhead. This remains below the unchanged 390,000 ms external request deadline, which remains below the 410,000 ms verifier and 430,000 ms gateway deadlines.

Generate a development secret without printing or committing a production credential through your platform's secret manager. The service never prints the configured token.

## Local development

From the repository root:

```sh
npm run dev:external-agent
```

To run the frontend, gateway, and external service together:

```sh
npm run dev:all
```

The existing `npm run dev`, `npm run verify:demo`, and `npm run verify:sandbox` flows remain unchanged.

Example health check:

```sh
curl http://localhost:5002/health
```

Example invocation, with the token read from your shell environment:

```sh
curl -X POST http://localhost:5002/v1/research/invoke \
  -H "Authorization: Bearer $EXTERNAL_AGENT_RUNTIME_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic":"latest AI infrastructure trends"}'
```

## Tests and verification

From the repository root:

```sh
npm run test:external-agent
npm run verify:external-agent
npm run verify:external-flow
```

The ordinary verifier starts an isolated mock-backed instance on port `5002`, checks health/authentication/validation/success behavior, confirms tokens are absent from responses and captured logs, and never calls Gemini. Set `EXTERNAL_AGENT_VERIFY_PORT` if port 5002 is occupied.

Run the separate live check only when you intend to incur one real research request:

```sh
npm run verify:gemini-agent
```

It requires `GEMINI_API_KEY`, `GEMINI_MODEL`, and `EXTERNAL_AGENT_RUNTIME_TOKEN`, and targets `http://127.0.0.1:5002` by default. Set `EXTERNAL_AGENT_VERIFY_BASE_URL` to verify an independently deployed service.

`verify:external-flow` starts the Gemini-backed external service and gateway locally, uses the configured Backend MongoDB, registers the external Agent Passport, issues and resolves a delegated install key, invokes Gemini through the normal Runtime Gateway, inspects encrypted persistence and redacted audits, and verifies one-time-key and direct-authentication failures. Because this is an explicitly billed live gate, it permits one bounded grounded-research retry for transient `408`, `429`, or `5xx` provider failures. Set `EXTERNAL_FLOW_GEMINI_RESEARCH_MAX_ATTEMPTS=1` to disable that retry. Gemini settings come from `external-agent/.env` or matching shell variables and are passed only to the external-agent instance.

For the manual integrated development flow, configure the same strong token in `external-agent/.env` as `EXTERNAL_AGENT_RUNTIME_TOKEN` and in `Backend/.env` as `EXTERNAL_TEST_AGENT_RUNTIME_TOKEN`. Also set `ALLOW_PRIVATE_RUNTIME_URLS_IN_DEV=true` when using the default loopback URL. This private-URL exception is restricted to the exact configured external health and invocation routes and is disabled outside development.

## Docker deployment

Build from this directory so the service remains an independent deployment unit:

```sh
cd external-agent
docker build -t external-research-agent:2.0.0 .
docker run --rm -p 5002:5002 \
  -e EXTERNAL_AGENT_RUNTIME_TOKEN="$EXTERNAL_AGENT_RUNTIME_TOKEN" \
  -e AI_PROVIDER=gemini \
  -e GEMINI_API_KEY="$GEMINI_API_KEY" \
  -e GEMINI_MODEL="$GEMINI_MODEL" \
  external-research-agent:2.0.0
```

For any Node or container hosting platform:

1. Build the `external-agent` directory or run `npm install --omit=dev --ignore-scripts` within it. Repository workspace installs remain locked by the root `package-lock.json`.
2. Store `EXTERNAL_AGENT_RUNTIME_TOKEN` and `GEMINI_API_KEY` in the external service's secret manager.
3. Expose the configured `PORT` over public HTTPS through the platform ingress or load balancer.
4. Configure the platform health check as `GET /health`.
5. Do not place the bearer token in image layers, build arguments, URLs, logs, or source control.

TLS is expected to terminate at the hosting platform or reverse proxy. The Node process serves HTTP inside its trusted deployment network.

## Security behavior

Bearer authentication uses a timing-safe digest comparison. The app also applies strict Zod input/output validation, a 32 KB JSON limit, request and provider timeouts, cancellation, rate limiting, single-attempt grounded research by default, explicitly bounded transient retries, one optional bounded formatting-only retry, output/source limits, security headers, optional CORS restrictions, safe request IDs, production-safe errors, redacted structured logs, and bounded graceful shutdown. Readiness becomes false before draining, new research receives 503, and active Gemini signals are aborted only after the drain deadline. Google Search results and topics are treated as untrusted data.

## Known limitations

- There is no database or service-side invocation persistence in the external service.
- The active cancellation registry is local to one process. It cannot coordinate cancellation across replicas or recover cancellation state after a restart.
- Grounded research exists only for the lifetime of a request. If transient formatting cannot complete within its bounded attempts, the safe error envelope marks recovery as required; it never persists or returns the grounded text for replay.
- The in-memory rate limiter is per process and should be replaced by shared infrastructure for horizontally scaled deployments.
- HTTPS depends on the deployment platform or reverse proxy.
- Gateway integration is development-only; production external agents must use public HTTPS endpoints and production credential provisioning policies.
