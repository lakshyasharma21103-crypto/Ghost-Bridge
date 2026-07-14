# External Research Agent

An independently runnable and deployable Gemini-powered research runtime used through the existing Agent Passport REST adapter. The Gemini API key stays inside this service; the gateway receives only the established bearer-authenticated research response.

## API

- `GET /health` is unauthenticated and returns service identity and health.
- `POST /v1/research/invoke` requires `Authorization: Bearer <token>` and a JSON body such as `{ "topic": "latest AI infrastructure trends" }`.

Successful invocation responses retain the existing `response.summary`, `response.sources`, and `response.runtime` contract. Runtime metadata identifies the configured provider and model without exposing credentials or provider internals.

If grounded research succeeds but transient structured formatting cannot complete within its configured attempts, the error envelope adds `recoveryRequired: true` and the allowlisted reason `FORMATTING_FAILED_AFTER_GROUNDED_RESEARCH`. Callers must not replay the full grounded-research request automatically; the service never returns or persists the intermediate research text.

## Environment

Copy `.env.example` to `.env` only for local use and replace the placeholder token. Never commit `.env`.

| Variable                         | Required | Default       | Description                                                                                                                                            |
| -------------------------------- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PORT`                           | No       | `5002`        | HTTP listen port.                                                                                                                                      |
| `NODE_ENV`                       | No       | `development` | `development`, `test`, or `production`.                                                                                                                |
| `EXTERNAL_AGENT_RUNTIME_TOKEN`   | Yes      | None          | Random bearer secret of at least 32 characters.                                                                                                        |
| `ALLOWED_GATEWAY_ORIGINS`        | No       | Empty         | Comma-separated HTTP(S) browser origins. Requests without an Origin header remain allowed for server-to-server invocation. CORS is not authentication. |
| `REQUEST_TIMEOUT_MS`             | No       | `300000`      | Per-request timeout. Must exceed both Gemini stage deadlines plus 10 seconds of processing overhead.                                                   |
| `AI_PROVIDER`                    | No       | `gemini`      | `gemini`, or explicit `mock` use during tests/local development. Mock is rejected in production.                                                       |
| `GEMINI_API_KEY`                 | Gemini   | None          | Gemini credential stored only in this deployment's secret manager.                                                                                     |
| `GEMINI_MODEL`                   | Gemini   | None          | Model available to the configured Gemini API project. No model is hardcoded.                                                                           |
| `GEMINI_WEB_SEARCH_ENABLED`      | No       | `true`        | Enables Google Search grounding.                                                                                                                       |
| `GEMINI_RESEARCH_TIMEOUT_MS`     | No       | `180000`      | Deadline for the single-attempt grounded-research operation.                                                                                           |
| `GEMINI_FORMATTING_TIMEOUT_MS`   | No       | `90000`       | Deadline shared by all structured-formatting attempts.                                                                                                 |
| `GEMINI_FORMATTING_MAX_ATTEMPTS` | No       | `2`           | Total formatting calls, restricted to `1` or `2`. A retry reuses the in-memory grounded text and never repeats Google Search.                          |
| `GEMINI_REQUEST_TIMEOUT_MS`      | No       | None          | Deprecated fallback used only when a stage-specific timeout is absent.                                                                                 |
| `GEMINI_MAX_OUTPUT_TOKENS`       | No       | `1500`        | Maximum output tokens per Gemini call.                                                                                                                 |
| `GEMINI_MAX_SOURCES`             | No       | `8`           | Maximum safe, deduplicated grounding URLs returned.                                                                                                    |
| `GEMINI_THINKING_LEVEL`          | No       | None          | Gemini 3 thinking level. Accepted values come from the installed SDK; omit it to use the model default.                                                |
| `GEMINI_THINKING_BUDGET`         | No       | None          | Gemini 2.5 thinking budget as a non-negative integer; omit it to use the model default.                                                                |

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

`verify:external-flow` starts the Gemini-backed external service and gateway locally, uses the configured Backend MongoDB, registers the external Agent Passport, issues and resolves a delegated install key, invokes Gemini once through the normal Runtime Gateway, inspects encrypted persistence and redacted audits, and verifies one-time-key and direct-authentication failures. Gemini settings come from `external-agent/.env` or matching shell variables and are passed only to the external-agent instance.

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

Bearer authentication uses a timing-safe digest comparison. The app also applies strict Zod input/output validation, a 32 KB JSON limit, request and provider timeouts, cancellation, rate limiting, single-attempt grounded research, one optional bounded formatting-only retry, output/source limits, security headers, optional CORS restrictions, safe request IDs, production-safe errors, redacted structured logs, and graceful shutdown. Google Search results and topics are treated as untrusted data.

## Known limitations

- There is no database or service-side invocation persistence in the external service.
- Grounded research exists only for the lifetime of a request. If transient formatting cannot complete within its bounded attempts, the safe error envelope marks recovery as required; it never persists or returns the grounded text for replay.
- The in-memory rate limiter is per process and should be replaced by shared infrastructure for horizontally scaled deployments.
- HTTPS depends on the deployment platform or reverse proxy.
- Gateway integration is development-only; production external agents must use public HTTPS endpoints and production credential provisioning policies.
