import { readFileSync } from "node:fs";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020.js";

import { EXPECTED_DIALECT, UUID_URN_PATTERN, listRepositoryFiles } from "./bundle-loader.mjs";
import { errorMessage, fail } from "./errors.mjs";
import { decodeStrictUtf8 } from "./json-source.mjs";
import { resolveRepositoryFilesystemPath } from "./path-policy.mjs";

export function visitJson(value, visitor, pointer = "#") {
  visitor(value, pointer);
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitJson(item, visitor, `${pointer}/${index}`));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      visitJson(child, visitor, `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`);
    }
  }
}

export function collectExternalReferences(schema) {
  const references = new Set();
  visitJson(schema, (node) => {
    if (node && typeof node === "object" && !Array.isArray(node) && typeof node.$ref === "string" && !node.$ref.startsWith("#")) {
      references.add(node.$ref);
    }
  });
  return references;
}

export function assertDeclaredDependencies(entry, schema) {
  const actual = [...collectExternalReferences(schema)].sort();
  const declared = [...entry.dependencies].sort();
  if (JSON.stringify(actual) !== JSON.stringify(declared)) {
    fail(`Direct dependency mismatch for ${entry.logicalName}: declared=${JSON.stringify(declared)} actual=${JSON.stringify(actual)}`);
  }
}

function childPointer(pointer, keyword, key) {
  const escapedKeyword = keyword.replaceAll("~", "~0").replaceAll("/", "~1");
  if (key === undefined) return `${pointer}/${escapedKeyword}`;
  const escapedKey = String(key).replaceAll("~", "~0").replaceAll("/", "~1");
  return `${pointer}/${escapedKeyword}/${escapedKey}`;
}

function visitSchemaMap(value, visitor) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const [key, schema] of Object.entries(value)) visitor(schema, key);
}

function visitSchemaArray(value, visitor) {
  if (!Array.isArray(value)) return;
  value.forEach((schema, index) => visitor(schema, index));
}

const OBJECT_SPECIFIC_KEYWORDS = Object.freeze([
  "properties",
  "patternProperties",
  "additionalProperties",
  "unevaluatedProperties",
  "propertyNames",
  "required",
  "dependentRequired",
  "dependentSchemas",
  "minProperties",
  "maxProperties",
]);

export function isObjectApplicableSchema(schemaNode) {
  if (!schemaNode || typeof schemaNode !== "object" || Array.isArray(schemaNode)) return false;
  if (schemaNode.type === "object") return true;
  if (Array.isArray(schemaNode.type) && schemaNode.type.includes("object")) return true;
  return OBJECT_SPECIFIC_KEYWORDS.some((keyword) => Object.hasOwn(schemaNode, keyword));
}

export function assertClosedCoreObjectSchemas(entry, schema) {
  function scan(schemaNode, pointer, inheritedUnevaluatedClosure) {
    if (!schemaNode || typeof schemaNode !== "object" || Array.isArray(schemaNode)) return;
    const sameInstanceClosure = inheritedUnevaluatedClosure || schemaNode.unevaluatedProperties === false;
    if (
      isObjectApplicableSchema(schemaNode) &&
      schemaNode.additionalProperties !== false &&
      schemaNode.unevaluatedProperties !== false &&
      !inheritedUnevaluatedClosure
    ) {
      fail(`Object schema is not closed at ${entry.path}${pointer}`);
    }

    for (const keyword of ["allOf", "anyOf", "oneOf"]) {
      visitSchemaArray(schemaNode[keyword], (child, index) => scan(child, childPointer(pointer, keyword, index), sameInstanceClosure));
    }
    for (const keyword of ["if", "then", "else", "not"]) {
      if (Object.hasOwn(schemaNode, keyword)) scan(schemaNode[keyword], childPointer(pointer, keyword), sameInstanceClosure);
    }
    visitSchemaMap(schemaNode.dependentSchemas, (child, key) => scan(child, childPointer(pointer, "dependentSchemas", key), sameInstanceClosure));

    for (const keyword of ["properties", "patternProperties", "$defs", "definitions"]) {
      visitSchemaMap(schemaNode[keyword], (child, key) => scan(child, childPointer(pointer, keyword, key), false));
    }
    for (const keyword of ["prefixItems"]) {
      visitSchemaArray(schemaNode[keyword], (child, index) => scan(child, childPointer(pointer, keyword, index), false));
    }
    for (const keyword of ["items", "contains", "additionalProperties", "unevaluatedProperties", "propertyNames", "unevaluatedItems", "contentSchema"]) {
      if (Object.hasOwn(schemaNode, keyword)) scan(schemaNode[keyword], childPointer(pointer, keyword), false);
    }
  }

  scan(schema, "#", false);
}

export function scanSchemaSafety({ entry, schema, text, schemaIds }) {
  let referenceCount = 0;
  visitJson(schema, (node, pointer) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    if (Object.hasOwn(node, "default")) fail(`Prohibited default at ${entry.path}${pointer}`);
    if (Object.hasOwn(node, "nullable")) fail(`Prohibited nullable at ${entry.path}${pointer}`);
    if (typeof node.$ref !== "string") return;
    referenceCount += 1;
    if (node.$ref.startsWith("#")) return;
    if (/^https?:/u.test(node.$ref)) fail(`External schema reference is prohibited: ${node.$ref}`);
    if (node.$ref.startsWith("urn:ghostbridge:")) fail(`External Ghost Bridge schema reference is prohibited: ${node.$ref}`);
    if (!UUID_URN_PATTERN.test(node.$ref)) fail(`Noncanonical schema reference: ${node.$ref}`);
    if (!schemaIds.has(node.$ref)) fail(`Unresolved schema reference: ${node.$ref}`);
  });
  if (text.includes("urn:ghostbridge:")) fail(`Custom Ghost Bridge URN in ${entry.path}`);
  if (text.includes("0.1-draft")) fail(`Historical schema dependency in ${entry.path}`);
  assertClosedCoreObjectSchemas(entry, schema);
  assertDeclaredDependencies(entry, schema);
  return referenceCount;
}

export function scanBundleSchemaSafety(bundle) {
  let referenceCount = 0;
  for (const entry of bundle.manifest.schemas) {
    referenceCount += scanSchemaSafety({
      entry,
      schema: bundle.schemas.get(entry.schemaId),
      text: bundle.schemaTexts.get(entry.path),
      schemaIds: bundle.schemaIds,
    });
  }
  return { referenceCount };
}

export function createOfflineSchemaValidator(schemas) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    validateSchema: true,
    loadSchema: async (uri) => fail(`Network schema retrieval attempted: ${uri}`),
  });
  let metaSchemaPasses = 0;
  for (const [schemaId, schema] of schemas) {
    if (schema.$schema !== EXPECTED_DIALECT) fail(`Wrong schema dialect for ${schemaId}`);
    if (!ajv.validateSchema(schema)) {
      fail(`Draft 2020-12 meta-schema failure for ${schemaId}: ${ajv.errorsText(ajv.errors)}`);
    }
    metaSchemaPasses += 1;
  }
  for (const schema of schemas.values()) ajv.addSchema(schema);
  for (const schemaId of schemas.keys()) {
    try {
      if (!ajv.getSchema(schemaId)) fail(`Schema failed offline compilation: ${schemaId}`);
    } catch (error) {
      fail(`Schema failed offline compilation: ${schemaId}: ${errorMessage(error)}`, {
        cause: error,
      });
    }
  }
  return { ajv, metaSchemaPasses };
}

export function validateAssetSchemas({ ajv, manifest, assets }) {
  const manifestValidator = ajv.getSchema(manifest.manifestSchema);
  if (!manifestValidator) fail(`Manifest schema is not preloaded: ${String(manifest.manifestSchema)}`);
  if (!manifestValidator(manifest)) fail(`Manifest validation failed: ${ajv.errorsText(manifestValidator.errors)}`);

  for (const entry of [...manifest.registries, manifest.semanticConstraintInventory, ...manifest.fixtures]) {
    const validate = ajv.getSchema(entry.schemaId);
    if (!validate) fail(`Asset schema is not preloaded: ${entry.schemaId}`);
    const asset = assets.get(entry.path);
    if (asset === undefined) fail(`Manifest asset was not loaded: ${entry.path}`);
    if (!validate(asset)) fail(`Asset validation failed for ${entry.path}: ${ajv.errorsText(validate.errors)}`);
  }
}

export function assertValidatorImportIsolation(repositoryRoot, validationRoot) {
  const builtins = new Set(["node:crypto", "node:fs", "node:module", "node:path", "node:url"]);
  const packages = new Set(["ajv/dist/2020.js", "ajv/package.json"]);
  const allFiles = listRepositoryFiles(repositoryRoot, validationRoot);
  const modules = allFiles.filter((item) => item.endsWith(".mjs"));
  for (const file of allFiles) {
    const absoluteFile = resolveRepositoryFilesystemPath(repositoryRoot, file, "file", "validator source file");
    const source = decodeStrictUtf8(readFileSync(absoluteFile), file);
    if (/[ \t]+$/mu.test(source)) fail(`Trailing whitespace is prohibited: ${file}`);
    if (!file.endsWith(".mjs")) continue;
    const specifiers = [...[...source.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/gu)].map((match) => match[1]), ...[...source.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/gu)].map((match) => match[1]), ...[...source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/gu)].map((match) => match[1])];
    for (const specifier of specifiers) {
      if (builtins.has(specifier) || packages.has(specifier)) continue;
      if (!specifier.startsWith(".")) fail(`Non-foundation validator import in ${file}: ${specifier}`);
      const resolved = path.resolve(path.dirname(absoluteFile), specifier);
      const allowedRoot = resolveRepositoryFilesystemPath(
        repositoryRoot,
        validationRoot,
        "directory",
        "validator root",
      );
      const relative = path.relative(allowedRoot, resolved);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        fail(`Validator import escapes protocol/schema-validation in ${file}: ${specifier}`);
      }
    }
  }
  return { scannedFiles: allFiles.length, scannedModules: modules.length };
}
