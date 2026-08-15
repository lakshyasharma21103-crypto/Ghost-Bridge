import { fail } from "./errors.mjs";

function assertUniqueAllocations(items, label) {
  if (!Array.isArray(items)) fail(`${label} must be an array`);
  const keys = items.map((item) => `${String(item?.id)}/${String(item?.revision)}`);
  if (new Set(keys).size !== keys.length) fail(`Duplicate ${label} allocation`);
}

export function validateReleaseRegistry({ registry, validateRegistry, errorsText = () => "validation failed" }) {
  if (typeof validateRegistry !== "function") fail("Release registry schema validator is unavailable");
  if (!validateRegistry(registry)) fail(`Release registry validation failed: ${errorsText()}`);
  assertUniqueAllocations(registry.facets, "facet registry");
  assertUniqueAllocations(registry.authenticationProfiles, "authentication profile");

  const reordered = structuredClone(registry);
  reordered.facets.reverse();
  reordered.authenticationProfiles.reverse();
  if (!validateRegistry(reordered)) {
    fail(`Release registry schema incorrectly gives array order protocol semantics: ${errorsText()}`);
  }
  return {
    facetCount: registry.facets.length,
    authenticationProfileCount: registry.authenticationProfiles.length,
    orderIndependent: true,
  };
}
