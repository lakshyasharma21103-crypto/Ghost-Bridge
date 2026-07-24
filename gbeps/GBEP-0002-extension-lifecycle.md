---
number: 0002
title: Extension lifecycle
owner: Ghost Bridge project owner
status: Draft
type: Extensions Track
created: 2026-07-24
updated: 2026-07-24
protocol-version-impact: Future revisions
---

# Summary

Define Experimental, Candidate, Official, Deprecated, and Removed extension
states.

# Motivation

Optional behavior needs a predictable path without weakening core security or
implying premature stability.

# Specification

Extensions use reverse-domain identifiers, explicit versions, support
declarations, schema and documentation references, and security
considerations. Unknown optional behavior degrades safely. Unknown required
behavior fails negotiation.

# Security considerations

Extensions cannot bypass scope isolation, revocation, Data Contracts, approval,
or other core security checks and cannot load third-party executable code.

# Privacy considerations

Extensions declare all additional public data and cross-boundary effects.

# Compatibility impact

Identifier and extension-version negotiation is independent from protocol
revision negotiation.

# Alternatives

Implicit feature flags were rejected because they are difficult to inspect and
negotiate.

# Reference implementation status

`io.ghostbridge/display-metadata` is the harmless presentation-only reference
extension.

# Conformance impact

Conformance checks cover identifiers, conflicts, required behavior, and
graceful optional degradation.

