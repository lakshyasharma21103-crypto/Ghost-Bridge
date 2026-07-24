# Ghost Bridge North Star

Ghost Bridge is the open protocol for installing external AI agents into any
compatible Host Application.

An Agent Provider should be able to publish one conforming Native Agent, and a
Host Application should be able to integrate the protocol once. The user adds
the Agent with an opaque Install Grant or Registry action—never by pasting a
runtime endpoint, authorization header, or provider credential.

Every external Agent has a verifiable Passport. Every compatibility decision
checks protocol version, profile support, authentication modes, extensions,
and Capability Contracts before installation. Every installed relationship is
scoped and revocable. Every Invocation has bounded input and output contracts.
Tasks and Receipts make execution observable and verifiable.

Core C1-C3 is the universal compatibility baseline. Governed Execution G1-G3
adds organization/workspace isolation, user authorization, capability policy,
Data Contracts, action-bound approvals, idempotent side effects, durable
execution, and audit evidence.

Agent Coordination is Experimental/Deferred. Delegation and multi-agent
coordination remain future work and are not required for Core or Governed
Execution.

The open Protocol contains public specifications, Schemas, portable wire
messages, SDKs, and conformance tools. The commercial Platform is one
compatible implementation and may add hosted enterprise administration,
orchestration, secrets, policy, recovery, observability, and commercial
operations.

`ghostbridge/0.1-draft` is experimental. Independent implementation, external
security review, and a final production trust profile are future work.
