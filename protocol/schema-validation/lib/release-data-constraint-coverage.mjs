import { releaseDataFail } from "./errors.mjs";
import { DIAGNOSTICS } from "./release-data-constants.mjs";
import { RELEASE_DATA_SEMANTIC_CHECKERS } from "./release-data-semantics.mjs";

function failCoverage(message) {
  releaseDataFail(DIAGNOSTICS.SEMANTIC_CHECK_COVERAGE, message);
}

function exactUniqueSet(actual, expected) {
  const left = [...actual].toSorted();
  const right = [...expected].toSorted();
  return left.length === new Set(left).size
    && right.length === new Set(right).size
    && JSON.stringify(left) === JSON.stringify(right);
}

export function verifyReleaseDataConstraintCoverage(inventory, executedCheckerIds, checkerRegistry = RELEASE_DATA_SEMANTIC_CHECKERS) {
  if (!inventory || !Array.isArray(inventory.constraints)) failCoverage("Semantic constraint inventory is unavailable");
  if (!Array.isArray(executedCheckerIds)) failCoverage("Executed semantic checker evidence is unavailable");
  if (!Array.isArray(checkerRegistry)) failCoverage("Semantic checker registry is unavailable");

  const constraints = inventory.constraints.filter((item) => typeof item.id === "string" && item.id.startsWith("RDA-SEM-"));
  const constraintIds = constraints.map((item) => item.id);
  const registeredIds = checkerRegistry.map((item) => item?.id);
  const functionNames = checkerRegistry.map((item) => item?.check?.name);

  if (new Set(constraintIds).size !== constraintIds.length) failCoverage("Duplicate release-data semantic constraint ID");
  if (new Set(registeredIds).size !== registeredIds.length) failCoverage("Duplicate release-data semantic checker ID");
  if (new Set(executedCheckerIds).size !== executedCheckerIds.length) failCoverage("A release-data semantic checker executed more than once");
  if (functionNames.some((name) => typeof name !== "string" || name.length === 0)) failCoverage("A registered semantic checker is not an actual named function");
  if (new Set(functionNames).size !== functionNames.length) failCoverage("A semantic checker function is multiply registered");

  for (const constraint of constraints) {
    if (constraint.downstreamOwner !== "D2-01B") failCoverage(`Release-data semantic constraint has wrong owner: ${constraint.id}`);
    if (constraint.executableCheck !== constraint.id) failCoverage(`Semantic inventory mapping is inconsistent: ${constraint.id}`);
  }
  if (!exactUniqueSet(registeredIds, constraintIds)) failCoverage(`Registered checker IDs do not exactly match inventory IDs: registered=${JSON.stringify(registeredIds.toSorted())} inventory=${JSON.stringify(constraintIds.toSorted())}`);
  if (!exactUniqueSet(executedCheckerIds, constraintIds)) failCoverage(`Executed checker IDs do not exactly match inventory IDs: executed=${JSON.stringify(executedCheckerIds.toSorted())} inventory=${JSON.stringify(constraintIds.toSorted())}`);

  return {
    constraintCount: constraintIds.length,
    registeredCheckerCount: registeredIds.length,
    executedCheckerCount: executedCheckerIds.length,
    executedCheckerIds: [...executedCheckerIds],
  };
}
