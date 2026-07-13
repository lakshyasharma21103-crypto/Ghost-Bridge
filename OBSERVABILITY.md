# Phase 13A1 observability

The gateway and external research agent use provider-neutral JSON diagnostics. Each event has an
`event`, `service`, `environment` (when available), `version`, `timestamp`, and only the correlation
and outcome fields relevant to that event. Fields whose values are undefined are omitted.

## Correlation identifiers

- `traceId` follows one end-to-end operation across the gateway, REST adapter, external agent,
  provider, invocation persistence, and audit persistence.
- `requestId` identifies an HTTP request. The gateway forwards its bounded request identifier to the
  external runtime so both sides can correlate the network hop.
- `invocationId` is assigned only after the runtime invocation has been persisted. The gateway then
  forwards it as `x-invocation-id`.
- `connectionId`, `agentId`, and `capabilityId`/`capabilityName` are included only where the runtime
  already resolved them and they are safe to record.

Incoming `x-trace-id` and `x-request-id` values are retained only when they match the bounded safe
identifier grammar and do not resemble Agent Passport credentials. Otherwise, cryptographically
random `trace_...` and `req_...` values are generated. Responses return `x-trace-id` and
`x-request-id`; browser CORS policy exposes both headers.

## Events and stages

Request events are `request.received`, `request.completed`, and `request.failed`. Gateway invocation
events are `runtime.invocation.started|completed|failed`; external events are
`external_agent.invocation.started|completed|failed`; provider events are
`gemini.operation.started|completed|failed`. Persistence completion is recorded as
`persistence.invocation.completed` and `persistence.audit.completed`.

Gateway runtime stages are:

`request_validation`, `connection_lookup`, `capability_resolution`, `policy_check`,
`credential_load`, `credential_decryption`, `request_mapping`, `external_runtime_invocation`,
`response_validation`, `response_mapping`, `invocation_persistence`, and `audit_persistence`.

Native installation is visible as `install_key_resolution`, `passport_retrieval`,
`passport_validation`, `capability_import`, `runtime_configuration_resolution`,
`delegated_credential_resolution`, `connection_creation`, and `connection_verification`. Installation
does not report success if required identity, auth, runtime, installation policy, or capability schema
metadata is incomplete.

Phase 13A2 persists only the following safe timing subset on Invocation records:
`connection_lookup`, `capability_resolution`, `policy_check`, `credential_load`, `request_mapping`,
`external_runtime_invocation`, `response_validation`, `invocation_persistence`, and
`audit_persistence`. Each entry contains only stage, duration, and outcome, and the array is strictly
bounded. The other diagnostic stages remain structured-log events and are not scraped for metrics.

External-agent stages are `request_validation`, `runtime_authentication`, `grounded_research`,
`grounding_source_extraction`, `structured_formatting`, `response_validation`, and
`response_serialization`. Stage completion/failure events include a monotonic `durationMs`.

## Safe diagnostics

Diagnostics never include prompts, task content, private context, full model/runtime responses,
source URLs, request bodies, outbound request options, credentials, or authorization headers.
Recursive redaction handles objects, arrays, errors, common serialized JSON, bearer strings, cookies,
and secret query parameters. Key matching is case-insensitive and covers authorization, cookies,
API/install/partner keys, access/refresh/runtime tokens, secrets, credentials, encrypted/decrypted
payloads, and passwords. Production clients never receive stacks or raw upstream response bodies.

Errors preserve safe fields where available: `errorCode`, `internalCode`, `operation`, `stage`, the
correlation identifiers, `statusCode`, `retryable`, safe timeout reason, safe cause code/name, and
`durationMs`. Classification is diagnostic only; Phase 13A1 does not retry automatically. Network
timeouts/failures, HTTP 429 and 502/503/504, and transient database connectivity errors are normally
retryable. Authentication/policy failures, install-key failures, unsupported configuration, schema
failures, malformed output, and source verification failures are not.

## Health and readiness

`/health` is dependency-free process liveness. `/ready` checks dependencies and configuration without
making a Gemini request. Gateway readiness requires an active database connection and valid runtime
configuration. External-agent readiness reports the selected provider, whether provider configuration
exists, and whether runtime authentication is configured. A ready service returns HTTP 200; otherwise
it returns HTTP 503 with safe component states only.

To trace an invocation, start with either response correlation header, search gateway diagnostics for
that `traceId`, note the `invocationId` assigned by `invocation_persistence`, and use the same values to
find the REST adapter, external-agent, Gemini operation, invocation record, and audit events.
