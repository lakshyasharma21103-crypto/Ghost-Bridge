# Approval

An Approval Challenge binds a safe action summary and required role categories
to an exact Organization, Workspace, Invocation, action, limits, requester,
policy decision, and expiration. An Approval Decision is `approved`, `rejected`,
`more_information_required`, `expired`, or `cancelled` and records approved
limits, approver, time, reason code, and optional proof.

A decision is single-use and cannot authorize another Invocation, action,
scope, limit, or expired challenge.
