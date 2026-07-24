# Agent Passport

An Agent Passport declares stable agent identity, issuer, version, bounded safe
description, lifecycle status, capabilities, supported protocol versions and
transports, data/delegation/approval declarations, receipt support, revocation,
verification, documentation, extensions, and optional proof.

Statuses are `draft`, `active`, `suspended`, `expired`, `revoked`, and
`retired`. Only an active, unexpired, unrevoked Passport is executable.
Passports never expose source code, prompts, hidden reasoning, private memory,
credentials, install secrets, private policy rules, or worker metadata.
