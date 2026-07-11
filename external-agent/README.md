# External Research Agent

An independently runnable and deployable authenticated REST runtime used to prove external Agent Passport interoperability. It intentionally returns deterministic research-style output and is not an LLM-powered agent. The gateway's development-only External Agent Integration can register its passport and carry this service's bearer token through encrypted delegated runtime access.

## API

- `GET /health` is unauthenticated and returns service identity and health.
- `POST /v1/research/invoke` requires `Authorization: Bearer <token>` and a JSON body such as `{ "topic": "latest AI infrastructure trends" }`.

Successful invocation responses include `response.runtime.service: "external-research-agent"`, proving that the response came from this service rather than the gateway mock runtime.

## Environment

Copy `.env.example` to `.env` only for local use and replace the placeholder token. Never commit `.env`.

| Variable                       | Required | Default       | Description                                                                                                                                            |
| ------------------------------ | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PORT`                         | No       | `5002`        | HTTP listen port.                                                                                                                                      |
| `NODE_ENV`                     | No       | `development` | `development`, `test`, or `production`.                                                                                                                |
| `EXTERNAL_AGENT_RUNTIME_TOKEN` | Yes      | None          | Random bearer secret of at least 32 characters.                                                                                                        |
| `ALLOWED_GATEWAY_ORIGINS`      | No       | Empty         | Comma-separated HTTP(S) browser origins. Requests without an Origin header remain allowed for server-to-server invocation. CORS is not authentication. |
| `REQUEST_TIMEOUT_MS`           | No       | `15000`       | Per-request timeout between 100 and 120000 milliseconds.                                                                                               |

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

The verifier starts an isolated local instance on port `5002`, generates an ephemeral token in memory, checks health/authentication/validation/success behavior, confirms tokens are absent from responses and captured logs, and shuts the instance down. Set `EXTERNAL_AGENT_VERIFY_PORT` if port 5002 is occupied.

`verify:external-flow` additionally starts the external service and gateway, uses the configured Backend MongoDB, registers the external Agent Passport, issues and resolves a delegated install key, invokes through the normal Runtime Gateway, inspects encrypted persistence and redacted audits, and verifies one-time-key and direct-authentication failures.

For the manual integrated development flow, configure the same strong token in `external-agent/.env` as `EXTERNAL_AGENT_RUNTIME_TOKEN` and in `Backend/.env` as `EXTERNAL_TEST_AGENT_RUNTIME_TOKEN`. Also set `ALLOW_PRIVATE_RUNTIME_URLS_IN_DEV=true` when using the default loopback URL. This private-URL exception is restricted to the exact configured external health and invocation routes and is disabled outside development.

## Docker deployment

Build from this directory so the service remains an independent deployment unit:

```sh
cd external-agent
docker build -t external-research-agent:1.0.0 .
docker run --rm -p 5002:5002 \
  -e EXTERNAL_AGENT_RUNTIME_TOKEN="$EXTERNAL_AGENT_RUNTIME_TOKEN" \
  external-research-agent:1.0.0
```

For any Node or container hosting platform:

1. Build the `external-agent` directory or run `npm install --omit=dev --ignore-scripts` within it. Repository workspace installs remain locked by the root `package-lock.json`.
2. Store `EXTERNAL_AGENT_RUNTIME_TOKEN` in the platform's secret manager.
3. Expose the configured `PORT` over public HTTPS through the platform ingress or load balancer.
4. Configure the platform health check as `GET /health`.
5. Do not place the bearer token in image layers, build arguments, URLs, logs, or source control.

TLS is expected to terminate at the hosting platform or reverse proxy. The Node process serves HTTP inside its trusted deployment network.

## Security behavior

Bearer authentication uses a timing-safe digest comparison. The app also applies strict Zod input validation, a 32 KB JSON limit, request timeouts, rate limiting, security headers, optional CORS restrictions, request IDs, centralized production-safe errors, redacted structured logs, and graceful shutdown.

## Known limitations

- Output is deterministic and uses no LLM or live research source.
- There is no database or service-side invocation persistence in Phase 11A.
- The in-memory rate limiter is per process and should be replaced by shared infrastructure for horizontally scaled deployments.
- HTTPS depends on the deployment platform or reverse proxy.
- Gateway integration is development-only; production external agents must use public HTTPS endpoints and production credential provisioning policies.
