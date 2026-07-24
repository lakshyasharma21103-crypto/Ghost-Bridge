# Future protocol benchmark plan

These are targets and planned measurements, not achieved claims.

- ordinary users do not manually enter agent endpoints;
- one Install Grant can install an agent, targeting under 60 seconds;
- compatibility is visible before activation;
- every agent-to-agent call has explicit delegated authority;
- every cross-agent payload is governed by a Data Contract;
- duplicate side-effecting requests execute once;
- revoked agents stop receiving new Invocations;
- public documentation is sufficient for an external implementation;
- a future independent Python implementation interoperates with TypeScript.

Future benchmarks will record installation time, manual setup fields, time to
first successful Invocation, custom governance code, delegation-scope coverage,
Data Contract enforcement, approval binding, idempotency correctness,
revocation latency, Receipt completeness, and cross-language interoperability.
No superiority multiplier is claimed without reproducible evidence.
