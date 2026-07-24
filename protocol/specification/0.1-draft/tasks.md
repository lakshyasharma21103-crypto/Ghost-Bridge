# Execution Task

Task states are `accepted`, `queued`, `running`, `waiting_for_approval`,
`waiting_for_dependency`, `completed`, `failed`, `cancelled`, `timed_out`,
`recovery_required`, `compensation_required`, and `revoked`.

Public tasks expose identifiers, safe progress, timestamps/deadline,
cancellation support, retry category, safe failure, Receipt/public checkpoint
references, and next action. Queue partitions, leases, locks, stack traces,
worker identities, and private topology remain internal.
