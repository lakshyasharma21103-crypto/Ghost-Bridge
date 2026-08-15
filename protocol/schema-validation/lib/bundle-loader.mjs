import { readdirSync } from "node:fs";

import { fail } from "./errors.mjs";
import { readJsonFile } from "./json-source.mjs";
import { assertCanonicalPosixRelativePath, resolveRepositoryPath } from "./path-policy.mjs";

export const EXPECTED_DIALECT = "https://json-schema.org/draft/2020-12/schema";
export const UUID_URN_PATTERN = /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
}

function assertArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
}

export function listRepositoryFiles(repositoryRoot, relativeDirectory) {
  assertCanonicalPosixRelativePath(relativeDirectory, "repository directory");
  const absoluteDirectory = resolveRepositoryPath(repositoryRoot, relativeDirectory, "repository directory");
  return readdirSync(absoluteDirectory, { withFileTypes: true })
    .flatMap((entry) => {
      const child = `${relativeDirectory}/${entry.name}`;
      return entry.isDirectory() ? listRepositoryFiles(repositoryRoot, child) : [child];
    })
    .sort();
}

export function readRepositoryJson(repositoryRoot, relativePath) {
  const absolutePath = resolveRepositoryPath(repositoryRoot, relativePath, "asset path");
  return readJsonFile(absolutePath, relativePath);
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

export function loadFoundationBundle({ repositoryRoot, manifestPath, schemaRoot }) {
  const manifestRecord = readRepositoryJson(repositoryRoot, manifestPath);
  const manifest = manifestRecord.value;
  const declarations = validateManifestDeclarations(manifest);
  const schemas = new Map();
  const schemaTexts = new Map();
  const loadedSchemaIds = new Set();

  for (const entry of manifest.schemas) {
    const record = readRepositoryJson(repositoryRoot, entry.path);
    assertLoadedSchemaIdentity(entry, record.value, loadedSchemaIds);
    schemas.set(entry.schemaId, record.value);
    schemaTexts.set(entry.path, record.text);
  }

  const onDiskSchemaPaths = listRepositoryFiles(repositoryRoot, schemaRoot).filter((item) => item.endsWith(".schema.json"));
  assertManifestDiskCoverage(manifest, onDiskSchemaPaths);
  return {
    manifest,
    manifestRecord,
    schemas,
    schemaTexts,
    onDiskSchemaPaths,
    ...declarations,
  };
}

export function loadManifestAssets({ repositoryRoot, manifest, schemaIds }) {
  assertArray(manifest.registries, "manifest registries");
  assertArray(manifest.fixtures, "manifest fixtures");
  assertObject(manifest.semanticConstraintInventory, "semantic constraint inventory entry");
  const entries = [...manifest.registries, manifest.semanticConstraintInventory, ...manifest.fixtures].toSorted((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
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
