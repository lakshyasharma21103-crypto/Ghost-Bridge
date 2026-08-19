import { readdirSync } from "node:fs";

import { fail } from "./errors.mjs";
import { readJsonFile } from "./json-source.mjs";
import { assertCanonicalPosixRelativePath, resolveRepositoryFilesystemPath } from "./path-policy.mjs";

export const EXPECTED_DIALECT = "https://json-schema.org/draft/2020-12/schema";
export const UUID_URN_PATTERN = /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const JSON_FILE_PATTERN = /\.json$/iu;

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
}

function assertArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
}

function normalizeFixtureRoots(fixtureRoot, fixtureRoots) {
  const roots = fixtureRoots ?? [fixtureRoot];
  if (!Array.isArray(roots) || roots.length === 0 || roots.includes(undefined)) {
    fail("At least one canonical fixture root is required");
  }
  if (new Set(roots).size !== roots.length) fail("Duplicate canonical fixture root");
  for (const root of roots) assertCanonicalPosixRelativePath(root, "manifest fixture root");
  return Object.freeze([...roots]);
}

export function listRepositoryFiles(repositoryRoot, relativeDirectory) {
  assertCanonicalPosixRelativePath(relativeDirectory, "repository directory");
  const absoluteDirectory = resolveRepositoryFilesystemPath(
    repositoryRoot,
    relativeDirectory,
    "directory",
    "repository directory",
  );
  return readdirSync(absoluteDirectory, { withFileTypes: true })
    .flatMap((entry) => {
      const child = `${relativeDirectory}/${entry.name}`;
      const entryKind = assertRegularRepositoryEntry(entry, child);
      return entryKind === "directory" ? listRepositoryFiles(repositoryRoot, child) : [child];
    })
    .sort();
}

export function assertRegularRepositoryEntry(entry, relativePath) {
  if (!entry || typeof entry !== "object") fail(`Invalid repository directory entry: ${relativePath}`);
  if (entry.isSymbolicLink()) fail(`Symbolic-link repository entry is prohibited: ${relativePath}`);
  if (entry.isDirectory()) return "directory";
  if (entry.isFile()) return "file";
  fail(`Non-regular repository entry is prohibited: ${relativePath}`);
}

export function readRepositoryJson(repositoryRoot, relativePath) {
  const absolutePath = resolveRepositoryFilesystemPath(repositoryRoot, relativePath, "file", "asset path");
  return readJsonFile(absolutePath, relativePath);
}

export function assertPathUnderRoot(relativePath, relativeRoot, label) {
  assertCanonicalPosixRelativePath(relativePath, label);
  assertCanonicalPosixRelativePath(relativeRoot, `${label} root`);
  if (!relativePath.startsWith(`${relativeRoot}/`)) {
    fail(`${label} is outside canonical root ${relativeRoot}: ${relativePath}`);
  }
}

export function assertExactPathSet(label, declaredPaths, onDiskPaths) {
  const declared = [...declaredPaths].toSorted();
  const onDisk = [...onDiskPaths].toSorted();
  if (new Set(declared).size !== declared.length) fail(`Duplicate declared ${label} path`);
  if (new Set(onDisk).size !== onDisk.length) fail(`Duplicate on-disk ${label} path`);
  const declaredSet = new Set(declared);
  const onDiskSet = new Set(onDisk);
  const missing = declared.filter((item) => !onDiskSet.has(item));
  const extra = onDisk.filter((item) => !declaredSet.has(item));
  if (missing.length > 0 || extra.length > 0) {
    fail(`${label} disk coverage mismatch: missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`);
  }
  return declared.length;
}

export function assertDeclaredPathRoleUniqueness({ manifest, manifestPath }) {
  const roles = [{ path: manifestPath, role: "manifest" }, ...manifest.schemas.map((entry) => ({ path: entry.path, role: "schema" })), ...manifest.registries.map((entry) => ({ path: entry.path, role: "registry" })), { path: manifest.semanticConstraintInventory.path, role: "semantic-inventory" }, ...manifest.fixtures.map((entry) => ({ path: entry.path, role: "fixture" }))];
  const owners = new Map();
  for (const item of roles) {
    assertCanonicalPosixRelativePath(item.path, `${item.role} path`);
    const existingRole = owners.get(item.path);
    if (existingRole === item.role) fail(`Duplicate declared path in ${item.role} role: ${item.path}`);
    if (existingRole !== undefined) {
      fail(`Cross-role declared path collision (${existingRole}/${item.role}): ${item.path}`);
    }
    owners.set(item.path, item.role);
  }
  return owners.size;
}

export function assertAllDeclaredPathsProcessed(label, declaredPaths, processedPaths) {
  const count = assertExactPathSet(`${label} processing`, declaredPaths, processedPaths);
  return { declared: count, processed: processedPaths.size ?? [...processedPaths].length };
}

export function assertMachineAssetCoverage({ manifest, manifestPath, schemaRoot, fixtureRoot, fixtureRoots, registryRoot, schemaRootFiles, fixtureRootFiles, registryRootFiles }) {
  assertArray(manifest.registries, "manifest registries");
  assertArray(manifest.fixtures, "manifest fixtures");
  assertObject(manifest.semanticConstraintInventory, "semantic constraint inventory entry");
  manifest.registries.forEach((entry, index) => assertObject(entry, `manifest registry entry ${index}`));
  manifest.fixtures.forEach((entry, index) => assertObject(entry, `manifest fixture entry ${index}`));
  const declaredPathCount = assertDeclaredPathRoleUniqueness({ manifest, manifestPath });

  assertPathUnderRoot(manifestPath, schemaRoot, "foundation manifest");
  for (const entry of manifest.schemas) assertPathUnderRoot(entry.path, schemaRoot, "manifest schema");
  assertPathUnderRoot(manifest.semanticConstraintInventory.path, schemaRoot, "semantic inventory");
  const acceptedFixtureRoots = normalizeFixtureRoots(fixtureRoot, fixtureRoots);
  for (const entry of manifest.fixtures) {
    if (!acceptedFixtureRoots.some((root) => entry.path.startsWith(`${root}/`))) {
      fail(`manifest fixture is outside canonical roots ${JSON.stringify(acceptedFixtureRoots)}: ${entry.path}`);
    }
  }
  for (const entry of manifest.registries) assertPathUnderRoot(entry.path, registryRoot, "manifest registry");

  const declaredSchemas = manifest.schemas.map((entry) => entry.path);
  const onDiskSchemas = schemaRootFiles.filter((item) => item.endsWith(".schema.json"));
  const onDiskSchemaJsonAssets = schemaRootFiles.filter((item) => JSON_FILE_PATTERN.test(item) && !item.endsWith(".schema.json"));
  const onDiskFixtures = fixtureRootFiles.filter((item) => JSON_FILE_PATTERN.test(item));
  const onDiskRegistries = registryRootFiles.filter((item) => JSON_FILE_PATTERN.test(item));

  const schemaCount = assertExactPathSet("schema", declaredSchemas, onDiskSchemas);
  const schemaJsonAssetCount = assertExactPathSet("schema-root non-schema JSON asset", [manifestPath, manifest.semanticConstraintInventory.path], onDiskSchemaJsonAssets);
  const fixtureCount = assertExactPathSet(
    "fixture",
    manifest.fixtures.map((entry) => entry.path),
    onDiskFixtures,
  );
  const registryCount = assertExactPathSet(
    "registry",
    manifest.registries.map((entry) => entry.path),
    onDiskRegistries,
  );
  return { declaredPathCount, schemaCount, schemaJsonAssetCount, fixtureCount, registryCount };
}

export function validateManifestDeclarations(manifest) {
  assertObject(manifest, "foundation manifest");
  if (!UUID_URN_PATTERN.test(manifest.bundleId)) fail(`Noncanonical bundle ID: ${String(manifest.bundleId)}`);
  assertArray(manifest.schemas, "foundation manifest schemas");

  const schemaIds = new Set();
  const schemaPaths = new Set();
  const logicalNames = new Set();
  for (const [index, entry] of manifest.schemas.entries()) {
    assertObject(entry, `manifest schema entry ${index}`);
    assertCanonicalPosixRelativePath(entry.path, `schema ${String(entry.logicalName)}`);
    if (!UUID_URN_PATTERN.test(entry.schemaId)) fail(`Noncanonical schema ID: ${String(entry.schemaId)}`);
    if (schemaIds.has(entry.schemaId)) fail(`Duplicate schema ID: ${entry.schemaId}`);
    if (schemaPaths.has(entry.path)) fail(`Duplicate manifest schema path: ${entry.path}`);
    if (typeof entry.logicalName !== "string" || entry.logicalName.length === 0) {
      fail(`Manifest schema entry ${index} has no logical name`);
    }
    if (logicalNames.has(entry.logicalName)) fail(`Duplicate logical schema name: ${entry.logicalName}`);
    assertArray(entry.dependencies, `dependencies for ${entry.logicalName}`);
    schemaIds.add(entry.schemaId);
    schemaPaths.add(entry.path);
    logicalNames.add(entry.logicalName);
  }

  if (schemaIds.has(manifest.bundleId)) fail("Bundle ID collides with a schema ID");
  for (const entry of manifest.schemas) {
    const dependencies = new Set();
    for (const dependency of entry.dependencies) {
      if (!UUID_URN_PATTERN.test(dependency)) {
        fail(`Noncanonical dependency ${String(dependency)} for ${entry.logicalName}`);
      }
      if (dependencies.has(dependency)) fail(`Duplicate dependency ${dependency} for ${entry.logicalName}`);
      if (!schemaIds.has(dependency)) fail(`Missing dependency ${dependency} for ${entry.logicalName}`);
      dependencies.add(dependency);
    }
  }
  return { schemaIds, schemaPaths, logicalNames };
}

export function assertManifestDiskCoverage(manifest, onDiskSchemaPaths) {
  const declared = new Set(manifest.schemas.map((entry) => entry.path));
  if (declared.size !== onDiskSchemaPaths.length) {
    fail(`Schema/manifest count mismatch: disk=${onDiskSchemaPaths.length}, manifest=${declared.size}`);
  }
  for (const schemaPath of onDiskSchemaPaths) {
    if (!declared.has(schemaPath)) fail(`Canonical schema missing from manifest: ${schemaPath}`);
  }
}

export function assertLoadedSchemaIdentity(entry, schema, loadedSchemaIds) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) fail(`Schema is not an object: ${entry.path}`);
  if (schema.$schema !== EXPECTED_DIALECT) fail(`Wrong dialect in ${entry.path}`);
  if (loadedSchemaIds.has(schema.$id)) fail(`Duplicate schema $id: ${String(schema.$id)}`);
  if (schema.$id !== entry.schemaId) fail(`Manifest/schema ID mismatch in ${entry.path}`);
  loadedSchemaIds.add(schema.$id);
}

export function loadFoundationBundle({ repositoryRoot, manifestPath, schemaRoot, fixtureRoot, fixtureRoots, registryRoot }) {
  const schemaRootFiles = listRepositoryFiles(repositoryRoot, schemaRoot);
  const manifestRecord = readRepositoryJson(repositoryRoot, manifestPath);
  const manifest = manifestRecord.value;
  const declarations = validateManifestDeclarations(manifest);
  const acceptedFixtureRoots = normalizeFixtureRoots(fixtureRoot, fixtureRoots);
  const fixtureRootFiles = acceptedFixtureRoots.flatMap((root) => listRepositoryFiles(repositoryRoot, root)).sort();
  const registryRootFiles = listRepositoryFiles(repositoryRoot, registryRoot);
  const machineAssetCoverage = assertMachineAssetCoverage({
    manifest,
    manifestPath,
    schemaRoot,
    fixtureRoots: acceptedFixtureRoots,
    registryRoot,
    schemaRootFiles,
    fixtureRootFiles,
    registryRootFiles,
  });
  const schemas = new Map();
  const schemaTexts = new Map();
  const loadedSchemaIds = new Set();

  for (const entry of manifest.schemas) {
    const record = readRepositoryJson(repositoryRoot, entry.path);
    assertLoadedSchemaIdentity(entry, record.value, loadedSchemaIds);
    schemas.set(entry.schemaId, record.value);
    schemaTexts.set(entry.path, record.text);
  }

  const onDiskSchemaPaths = schemaRootFiles.filter((item) => item.endsWith(".schema.json"));
  assertManifestDiskCoverage(manifest, onDiskSchemaPaths);
  return {
    manifest,
    manifestRecord,
    schemas,
    schemaTexts,
    onDiskSchemaPaths,
    diskPaths: { schemaRootFiles, fixtureRootFiles, registryRootFiles },
    machineAssetCoverage,
    fixtureRoots: acceptedFixtureRoots,
    ...declarations,
  };
}

export function loadManifestAssets({ repositoryRoot, manifest, schemaIds }) {
  assertArray(manifest.registries, "manifest registries");
  assertArray(manifest.fixtures, "manifest fixtures");
  assertObject(manifest.semanticConstraintInventory, "semantic constraint inventory entry");
  const entries = [...manifest.registries, manifest.semanticConstraintInventory, ...manifest.fixtures].toSorted((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const paths = new Set();
  const assets = new Map();
  for (const entry of entries) {
    assertObject(entry, "manifest asset entry");
    assertCanonicalPosixRelativePath(entry.path, "manifest asset");
    if (paths.has(entry.path)) fail(`Duplicate manifest asset path: ${entry.path}`);
    if (!schemaIds.has(entry.schemaId)) fail(`Unknown asset schema ID: ${String(entry.schemaId)}`);
    paths.add(entry.path);
    assets.set(entry.path, readRepositoryJson(repositoryRoot, entry.path).value);
  }
  return { assetEntries: entries, assetPaths: paths, assets };
}
