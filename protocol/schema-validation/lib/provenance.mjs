import { readFileSync } from "node:fs";
import path from "node:path";

import { listRepositoryFiles } from "./bundle-loader.mjs";
import { fail } from "./errors.mjs";
import { decodeStrictUtf8 } from "./json-source.mjs";
import { resolveRepositoryPath } from "./path-policy.mjs";

function readRepositoryText(repositoryRoot, relativePath) {
  return decodeStrictUtf8(readFileSync(resolveRepositoryPath(repositoryRoot, relativePath)), relativePath);
}

export function loadAuthorityIndex({ repositoryRoot, specificationRoot, decisionsRoot, representationProfilePath }) {
  const specificationText = listRepositoryFiles(repositoryRoot, specificationRoot)
    .filter((item) => item.endsWith(".md"))
    .map((item) => readRepositoryText(repositoryRoot, item))
    .join("\n");
  const requirementIds = new Set(
    [...specificationText.matchAll(/^#{2,3} (REQ-[A-Z]+-[0-9]{4})(?:\s|$)/gmu)].map((match) => match[1]),
  );
  if (requirementIds.size !== 324) fail(`Expected 324 normative requirement IDs, found ${requirementIds.size}`);

  const decisionIds = new Set(
    listRepositoryFiles(repositoryRoot, decisionsRoot)
      .map((item) => path.basename(item).match(/^(H-(?:0[1-9]|1[0-4]))-/u)?.[1])
      .filter(Boolean),
  );
  if (decisionIds.size !== 14) fail(`Expected accepted H-01 through H-14, found ${decisionIds.size} decision IDs`);

  const representationText = readRepositoryText(repositoryRoot, representationProfilePath);
  const representationIds = new Set(
    [...representationText.matchAll(/\bD2R-[0-9]{3}[A-Z]?\b/gu)].map((match) => match[0]),
  );
  return { requirementIds, decisionIds, representationIds };
}

export function verifyProvenance(provenance, label, authority) {
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) {
    fail(`Missing provenance object in ${label}`);
  }
  for (const [property, known, description] of [
    ["h", authority.decisionIds, "H"],
    ["req", authority.requirementIds, "REQ"],
    ["d2r", authority.representationIds, "D2R"],
  ]) {
    if (!Array.isArray(provenance[property])) fail(`Missing ${description} provenance list in ${label}`);
    for (const id of provenance[property]) {
      if (!known.has(id)) fail(`Unknown ${description} provenance ${String(id)} in ${label}`);
    }
  }
}

export function verifyBundleProvenance({ manifest, inventory, authority }) {
  for (const entry of manifest.schemas) {
    verifyProvenance(entry.provenance, `manifest schema ${entry.logicalName}`, authority);
  }
  if (!inventory || !Array.isArray(inventory.constraints)) fail("Semantic constraint inventory has no constraints array");
  const constraintIds = new Set();
  for (const constraint of inventory.constraints) {
    if (constraintIds.has(constraint.id)) fail(`Duplicate semantic constraint ID: ${String(constraint.id)}`);
    constraintIds.add(constraint.id);
    verifyProvenance(constraint.provenance, `semantic constraint ${String(constraint.id)}`, authority);
  }
  if (!Array.isArray(manifest.deferred)) fail("Manifest deferred inventory is not an array");
  for (const deferred of manifest.deferred) {
    verifyProvenance(deferred.provenance, `deferred type ${String(deferred.logicalName)}`, authority);
  }
  return { constraintCount: constraintIds.size };
}
