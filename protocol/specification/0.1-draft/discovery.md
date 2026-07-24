# Discovery

`GET /.well-known/ghostbridge` returns a bounded JSON document with:
`protocol`, `supportedVersions`, `preferredVersion`, `status`, feature flags,
transports, `maximumMessageBytes`, endpoint references, and supported extension
namespaces.

Discovery must not expose databases, private services, credentials, provider
keys, worker endpoints, policy internals, or secret-management topology.
Clients reject malformed, oversized, or unsupported discovery responses.
