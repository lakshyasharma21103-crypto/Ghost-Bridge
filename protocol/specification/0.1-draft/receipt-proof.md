# Execution Receipt proof

Status: **Experimental security profile**

Governed policy may require an Agent Passport-authorized execution key to sign the Execution Receipt. The Receipt binds Receipt, Invocation, Task, agent, Passport, execution key, capability/version, tenant scope, outcome/times/attempt, approvals, Data Contract, safe idempotency and input/output/evidence digests, revocation state, audience, and trust profile.

Verification checks proof, Passport authorization at execution time, capability-manifest binding, tenant/Invocation/Task/approval binding, digest consistency, current revocation, and compromise history. Credentials, prompts, hidden reasoning, and private memory are prohibited.
