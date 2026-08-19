import { fail } from "./errors.mjs";

export const SHARED_R1_CONSTRAINT_IDS = Object.freeze([
  "FND-ARTIFACT-EXACT-BYTE-HASH",
  "FND-CANONICAL-IPV4",
  "FND-CANONICAL-RFC5952-IPV6",
  "FND-DUPLICATE-RAW-JSON-MEMBERS",
  "FND-EXTENSION-IDENTITY-BOUNDARIES",
  "FND-IDNA2008-VALIDATION",
  "FND-INTERVAL-NONEMPTY",
  "FND-INTERVAL-ORDERING",
  "FND-IPV4-MAPPED-IPV6-REJECTION",
  "FND-NEGATIVE-ZERO-REJECTION",
  "FND-SAFE-SOURCE-TOKEN-NUMBERS",
  "FND-STRICT-UTF8-AND-RAW-BYTE-LIMITS",
]);

export const LATER_D2_01_CONSTRAINT_IDS = Object.freeze([
  "FND-HTTP-LOOPBACK-CONTEXT",
  "FND-NETB-DNS-REDIRECT-REBINDING",
  "FND-PATH-DECODE-REENCODE-EQUALITY",
  "FND-TENANT-EXACT-EQUALITY",
  "FND-TENANT-TYPE-NONINTERCHANGEABILITY",
]);

const FIXTURE_EVIDENCE = Object.freeze({
  "FND-ARTIFACT-EXACT-BYTE-HASH": ["FX-ARTIFACT-INTEGRITY", "FX-ARTIFACT-DIGEST-MISMATCH"],
  "FND-CANONICAL-IPV4": ["FX-SHARED-ORIGIN-IPV4", "FX-SHARED-ORIGIN-IPV4-LEADING-ZERO", "FX-SHARED-ORIGIN-IPV4-RANGE"],
  "FND-CANONICAL-RFC5952-IPV6": ["FX-SHARED-ORIGIN-IPV6", "FX-SHARED-ORIGIN-IPV6-LEADING-ZERO", "FX-SHARED-ORIGIN-IPV6-WRONG-ZERO-RUN"],
  "FND-DUPLICATE-RAW-JSON-MEMBERS": ["FX-SHARED-RAW-DUPLICATE"],
  "FND-EXTENSION-IDENTITY-BOUNDARIES": ["FX-EXTENSION-MULTILABEL", "FX-EXTENSION-UPPERCASE", "FX-EXTENSION-TOTAL-255", "FX-EXTENSION-TOTAL-256"],
  "FND-IDNA2008-VALIDATION": ["FX-SHARED-ORIGIN-IDNA-A-LABEL", "FX-SHARED-ORIGIN-IDNA-CONTEXTO", "FX-SHARED-ORIGIN-IDNA-CONTEXTO-INVALID", "FX-SHARED-ORIGIN-INVALID-A-LABEL", "FX-SHARED-ORIGIN-IDNA-DISALLOWED-SYMBOL", "FX-SHARED-ORIGIN-DNS-HYPHEN-34"],
  "FND-INTERVAL-NONEMPTY": ["FX-INTERVAL-CLOSED-CLOSED", "FX-INTERVAL-EQUAL-OPEN-LOWER", "FX-INTERVAL-EQUAL-OPEN-UPPER"],
  "FND-INTERVAL-ORDERING": ["FX-INTERVAL-CLOSED-CLOSED", "FX-INTERVAL-REVERSED"],
  "FND-IPV4-MAPPED-IPV6-REJECTION": ["FX-SHARED-ORIGIN-IPV4-MAPPED-IPV6"],
  "FND-NEGATIVE-ZERO-REJECTION": ["FX-SHARED-RAW-NEGATIVE-ZERO"],
  "FND-SAFE-SOURCE-TOKEN-NUMBERS": ["FX-SHARED-RAW-NUMBER-TOKENS", "FX-SHARED-RAW-UNSAFE-INTEGER"],
  "FND-STRICT-UTF8-AND-RAW-BYTE-LIMITS": [
    "FX-SHARED-RAW-INVALID-UTF8",
    "FX-SHARED-RAW-UNPAIRED-SURROGATE",
    "FX-SHARED-RAW-UNICODE-NONCHARACTER",
    "FX-SHARED-RAW-ERROR-BYTES-EXACT",
    "FX-SHARED-RAW-ERROR-BYTES-OVER",
    "FX-SHARED-RAW-REQUEST-BYTES-EXACT",
    "FX-SHARED-RAW-REQUEST-BYTES-OVER",
    "FX-SHARED-RAW-RESPONSE-BYTES-EXACT",
    "FX-SHARED-RAW-RESPONSE-BYTES-OVER",
    "FX-SHARED-RAW-STRING-BYTES-EXACT",
    "FX-SHARED-RAW-STRING-BYTES-OVER",
    "FX-SHARED-RAW-ARRAY-256",
    "FX-SHARED-RAW-ARRAY-257",
    "FX-SHARED-RAW-DEPTH-OVER",
  ],
});

function exactSortedSet(label, actual, expected) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    fail(`${label} mismatch: expected=${JSON.stringify(expectedSorted)} actual=${JSON.stringify(actualSorted)}`);
  }
}

export function verifySharedConstraintCoverage(inventory, executedFixtureIds) {
  if (!inventory || !Array.isArray(inventory.constraints)) fail("Semantic constraint inventory has no constraints array");
  const r1 = inventory.constraints.filter((constraint) => constraint.downstreamOwner === "D2-01R1").map((constraint) => constraint.id);
  const later = inventory.constraints.filter((constraint) => constraint.downstreamOwner === "D2-01").map((constraint) => constraint.id);
  exactSortedSet("D2-01R1 constraint ownership", r1, SHARED_R1_CONSTRAINT_IDS);
  exactSortedSet("remaining D2-01 constraint ownership", later, LATER_D2_01_CONSTRAINT_IDS);
  for (const constraintId of SHARED_R1_CONSTRAINT_IDS) {
    const evidence = FIXTURE_EVIDENCE[constraintId];
    if (!Array.isArray(evidence) || evidence.length === 0) fail(`No fixture evidence is registered for ${constraintId}`);
    for (const fixtureId of evidence) {
      if (!executedFixtureIds.has(fixtureId)) fail(`Shared constraint ${constraintId} did not execute fixture ${fixtureId}`);
    }
  }
  return Object.freeze({ owned: r1.length, later: later.length, evidence: Object.values(FIXTURE_EVIDENCE).flat().length });
}
