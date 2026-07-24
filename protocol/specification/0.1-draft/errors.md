# Errors

Protocol errors contain `protocolVersion`, `errorCode`, bounded `safeMessage`,
`retryable`, optional safe retry delay, request/trace identifiers, and bounded
details. Standard codes are enumerated by `@ghostbridge/protocol-core`.

Errors never expose stack traces, database errors, secrets, private policy
rules, or raw provider payloads. Unknown internal failures become
`INTERNAL_ERROR`; unsupported versions become
`UNSUPPORTED_PROTOCOL_VERSION`.
