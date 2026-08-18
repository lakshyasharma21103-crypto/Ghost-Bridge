import { fail } from "./errors.mjs";
import { RELEASE_DATA_SEMANTIC_CHECK_IDS } from "./release-data-semantics.mjs";

export function verifyReleaseDataConstraintCoverage(inventory) {
  if (!inventory || !Array.isArray(inventory.constraints)) fail("Semantic constraint inventory is unavailable");
  const constraints = inventory.constraints.filter((item) => typeof item.id === "string" && item.id.startsWith("RDA-SEM-"));
  const ids = constraints.map((item) => item.id).toSorted();
  const checks = constraints.map((item) => item.executableCheck).toSorted();
  const expected = [...RELEASE_DATA_SEMANTIC_CHECK_IDS].toSorted();
  if (new Set(ids).size !== ids.length) fail("Duplicate release-data semantic constraint ID");
  if (new Set(checks).size !== checks.length) fail("Duplicate release-data executable semantic-check mapping");
  if (JSON.stringify(ids) !== JSON.stringify(expected) || JSON.stringify(checks) !== JSON.stringify(expected)) {
    fail(`Release-data semantic constraint coverage mismatch: ids=${JSON.stringify(ids)} checks=${JSON.stringify(checks)} expected=${JSON.stringify(expected)}`);
  }
  for (const constraint of constraints) {
    if (constraint.downstreamOwner !== "D2-01B") fail(`Release-data semantic constraint has wrong owner: ${constraint.id}`);
    if (constraint.executableCheck !== constraint.id) fail(`Orphan release-data semantic constraint: ${constraint.id}`);
  }
  return { constraintCount: constraints.length, executableCheckCount: checks.length };
}
