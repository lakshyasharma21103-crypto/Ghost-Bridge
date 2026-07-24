# Data Contract

Data Contracts declare direction, allowed/required/prohibited fields and data
classes, payload/string/array/depth limits, retention, redaction, declarative
transformation profile references, and lifecycle status.

Projection is a deterministic allowlist. Authorization headers, cookies,
tokens, API keys, database URIs, source code, prompts, hidden reasoning,
private memory, and cross-tenant references are rejected or redacted only
according to explicit policy. Arbitrary executable transformations are absent.
