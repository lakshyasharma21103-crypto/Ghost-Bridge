# Ghost Bridge Native 0.1 draft

Status: **experimental**.

Ghost Bridge Native is the portable wire protocol by which a Host Application
discovers, verifies, installs, invokes, observes, and revokes an external AI
agent. A Host Client resolves an opaque Install Grant, verifies the Agent
Passport, previews protocol-profile and extension compatibility, negotiates an
authentication mode, and establishes a scoped Agent Connection. No
provider-specific adapter or user-entered runtime endpoint is required.

Core is the universal baseline. Governed Execution adds organization/workspace
policy, authorization, Data Contracts, approval, idempotent durable Tasks, and
audit evidence. Agent Coordination is Experimental/Deferred and is not required
for either active profile.

This draft is independently implementable without the Ghost Bridge Platform.
It does not claim stability, industry adoption, a completed independent
implementation, an external security review, or a final production trust
profile.

Normative requirement words (`MUST`, `MUST NOT`, `SHOULD`, `MAY`) use their
ordinary standards meaning in this draft.
