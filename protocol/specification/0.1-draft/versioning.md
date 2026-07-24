# Versioning

This draft uses `ghostbridge/0.1-draft`. Discovery advertises supported and
preferred versions. Peers select a mutually supported version or return a safe
unsupported-version error. Draft selection produces an experimental warning.

Signed or high-impact messages cannot silently downgrade. Breaking wire
changes require a new negotiated version. Extensions never redefine required
core behavior.
