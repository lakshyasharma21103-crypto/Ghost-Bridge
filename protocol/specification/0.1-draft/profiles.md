# Protocol profiles

Profiles let a Host Application decide compatibility before installation. Each
declaration has a stable identifier, status, supported conformance levels, and
an explicit `supported` value.

## Core

Identifier: `ghostbridge.core`

Core is active and required for universal compatibility. C1 covers discovery
and identity, C2 adds installation and authentication, and C3 adds capability
execution, Tasks, Receipts, standard errors, and revocation.

## Governed Execution

Identifier: `ghostbridge.governed-execution`

Governed Execution is active and includes Core. G1 provides scoped access, G2
provides policy, data, and approval control, and G3 provides idempotent durable
execution and audit evidence.

## Agent Coordination

Identifier: `ghostbridge.agent-coordination.experimental`

Agent Coordination is Experimental/Deferred and unsupported by default. A Host
MUST NOT infer coordination support from Core or Governed Execution support.

## Compatibility

Before redeeming a grant, a Host MUST negotiate a protocol version and
authentication mode, require Core, require Governed Execution only when policy
needs it, and reject unsupported required extensions. The safe preview MUST NOT
contain the opaque grant, runtime target, authentication setup reference,
credentials, or private policy data.
