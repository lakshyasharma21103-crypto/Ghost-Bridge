# Issuer compromise

For an operational key: mark compromised, stop signing, publish higher-sequence emergency revocation, activate a prepublished replacement, invalidate caches, block new affected installs/Connections, reevaluate active Connections, classify historical Receipts, issue replacements, and audit the event.

Agent-key, metadata-service, revocation-endpoint, account/domain, and root compromise each require incident-specific containment. Root/domain compromise cannot be safely repaired through an automatic silent key change.
