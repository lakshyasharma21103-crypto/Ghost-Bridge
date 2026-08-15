import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const require = createRequire(import.meta.url);
const ajvVersion = require("ajv/package.json").version;
const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "../..");
const manifestPath = "protocol/schemas/e1.r0-draft.1/foundation-manifest.json";
const schemaRoot = "protocol/schemas/e1.r0-draft.1";
const expectedDialect = "https://json-schema.org/draft/2020-12/schema";
const uuidUrnPattern = /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function fail(message) {
  throw new Error(message);
}

function repositoryPath(relativePath) {
  return path.join(repositoryRoot, ...relativePath.split("/"));
}

function assertRepositoryRelativePath(relativePath, label) {
  if (
    typeof relativePath !== "string" ||
    relativePath.length === 0 ||
    relativePath.includes("\\") ||
    relativePath.startsWith("/") ||
    relativePath.split("/").includes("..")
  ) {
    fail(`${label} is not a safe POSIX repository-relative path: ${relativePath}`);
  }
}

function assertNoDuplicateObjectKeys(text, source) {
  let index = 0;

  function skipWhitespace() {
    while (index < text.length && /[\u0009\u000a\u000d\u0020]/.test(text[index])) {
      index += 1;
    }
  }

  function parseString() {
    const start = index;
    if (text[index] !== '"') fail(`Expected JSON string in ${source}`);
    index += 1;
    while (index < text.length) {
      const character = text[index];
      if (character === '"') {
        index += 1;
        return JSON.parse(text.slice(start, index));
      }
      if (character === "\\") {
        index += 1;
        if (text[index] === "u") index += 4;
      }
      index += 1;
    }
    fail(`Unterminated JSON string in ${source}`);
  }

  function parseArray() {
    index += 1;
    skipWhitespace();
    if (text[index] === "]") {
      index += 1;
      return;
    }
    while (index < text.length) {
      parseValue();
      skipWhitespace();
      if (text[index] === "]") {
        index += 1;
        return;
      }
      if (text[index] !== ",") fail(`Malformed JSON array in ${source}`);
      index += 1;
      skipWhitespace();
    }
    fail(`Unterminated JSON array in ${source}`);
  }

  function parseObject() {
    index += 1;
    const keys = new Set();
    skipWhitespace();
    if (text[index] === "}") {
      index += 1;
      return;
    }
    while (index < text.length) {
      const key = parseString();
      if (keys.has(key)) fail(`Duplicate raw JSON member ${JSON.stringify(key)} in ${source}`);
      keys.add(key);
      skipWhitespace();
      if (text[index] !== ":") fail(`Malformed JSON object in ${source}`);
      index += 1;
      parseValue();
      skipWhitespace();
      if (text[index] === "}") {
        index += 1;
        return;
      }
      if (text[index] !== ",") fail(`Malformed JSON object in ${source}`);
      index += 1;
      skipWhitespace();
    }
    fail(`Unterminated JSON object in ${source}`);
  }

  function parseValue() {
    skipWhitespace();
    if (text[index] === "{") return parseObject();
    if (text[index] === "[") return parseArray();
    if (text[index] === '"') {
      parseString();
      return;
    }
    const remainder = text.slice(index);
    const token = remainder.match(/^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/);
    if (!token) fail(`Malformed JSON value in ${source}`);
    index += token[0].length;
  }

  parseValue();
  skipWhitespace();
  if (index !== text.length) fail(`Trailing JSON input in ${source}`);
}

function readJson(relativePath) {
  assertRepositoryRelativePath(relativePath, "asset path");
  const bytes = readFileSync(repositoryPath(relativePath));
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail(`UTF-8 BOM is prohibited: ${relativePath}`);
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (/[ \t]+$/mu.test(text)) fail(`Trailing whitespace is prohibited: ${relativePath}`);
  const value = JSON.parse(text);
  assertNoDuplicateObjectKeys(text, relativePath);
  return { text, value };
}

function listFiles(relativeDirectory) {
  const absoluteDirectory = repositoryPath(relativeDirectory);
  return readdirSync(absoluteDirectory, { withFileTypes: true })
    .flatMap((entry) => {
      const child = `${relativeDirectory}/${entry.name}`;
      return entry.isDirectory() ? listFiles(child) : [child];
    })
    .sort();
}

function visit(value, visitor, pointer = "#") {
  visitor(value, pointer);
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, visitor, `${pointer}/${index}`));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      visit(child, visitor, `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`);
    }
  }
}

function canonicalBase64url(value, minimumBytes, maximumBytes) {
  if (typeof value !== "string" || value.includes("=")) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return false;
  const decoded = Buffer.from(value, "base64url");
  return (
    decoded.length >= minimumBytes &&
    decoded.length <= maximumBytes &&
    decoded.toString("base64url") === value
  );
}

function canonicalTimestamp(value) {
  if (typeof value !== "string") return false;
  const match = value.match(
    /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])\.([0-9]{3})Z$/,
  );
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || year > 9999) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

function semanticTimeEvidence(value) {
  if (value.kind === "exact") return canonicalTimestamp(value.at);
  if (value.kind !== "interval") return false;
  if (!canonicalTimestamp(value.lower.at) || !canonicalTimestamp(value.upper.at)) return false;
  const comparison = value.lower.at.localeCompare(value.upper.at);
  return comparison < 0 || (comparison === 0 && value.lower.inclusive && value.upper.inclusive);
}

const base64Bounds = new Map([
  ["urn:uuid:49bd1792-0f82-43d2-a218-27503453622a", [16, 16]],
  ["urn:uuid:b360f786-e930-4969-820b-003efadbac6d", [1, 64]],
  ["urn:uuid:677407e9-d334-43e2-ae04-b196848eea99", [1, 128]],
  ["urn:uuid:5e0d2101-1c30-4f40-8320-9a6b2e64319e", [16, 16]],
  ["urn:uuid:1752eea0-b836-4d22-aa5b-ff9bd704f2b9", [16, 16]],
  ["urn:uuid:d1d4490a-e652-40dc-8f01-c3b7af62f821", [16, 16]],
  ["urn:uuid:3a9255e0-dd70-4a71-848d-8cc3855d1ceb", [16, 16]],
  ["urn:uuid:daa8d590-3b33-4f46-a63a-7e7d87500e44", [16, 16]],
  ["urn:uuid:e27e6244-aabf-4d75-a79c-ea2b43cc8073", [16, 16]],
  ["urn:uuid:64cf1eb9-4c44-485d-88dd-14c86bf922a1", [16, 16]],
  ["urn:uuid:fcb537b3-67fc-4621-b25d-adf3fbbe81b5", [1, 64]],
  ["urn:uuid:aa90be25-0d0c-403d-847e-a3b8295e0aed", [1, 64]],
  ["urn:uuid:3868e676-6b8a-4692-b7d4-4e47ff5e88f4", [1, 128]],
]);

function semanticResult(testCase) {
  switch (testCase.semanticCheck) {
    case "tenant-id":
      return (
        typeof testCase.value === "string" &&
        testCase.value.length >= 1 &&
        testCase.value.length <= 128 &&
        /^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,126}[A-Za-z0-9])?$/.test(testCase.value)
      );
    case "tenant-exact-equality":
      return (testCase.values[0] === testCase.values[1]) === testCase.equalExpected;
    case "canonical-base64url": {
      const bounds = base64Bounds.get(testCase.targetSchema);
      if (!bounds) fail(`No base64url semantic bounds for ${testCase.targetSchema}`);
      return canonicalBase64url(testCase.value, bounds[0], bounds[1]);
    }
    case "canonical-timestamp":
      return canonicalTimestamp(testCase.value);
    case "time-evidence":
      return semanticTimeEvidence(testCase.value);
    case "artifact-byte-integrity":
      return (
        testCase.value?.algorithm === "sha-256" &&
        canonicalBase64url(testCase.value.value, 32, 32) &&
        Number.isSafeInteger(testCase.value.byteLength) &&
        testCase.value.byteLength >= 0
      );
    case "extension-identity":
      return (
        typeof testCase.value === "string" &&
        testCase.value.length <= 255 &&
        /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\/[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/.test(testCase.value)
      );
    case "none":
      return true;
    default:
      fail(`Unknown semantic check ${testCase.semanticCheck}`);
  }
}

function main() {
  const manifestRecord = readJson(manifestPath);
  const manifest = manifestRecord.value;
  const schemaIds = new Set();
  const schemaPaths = new Set();
  const logicalNames = new Set();
  const schemas = new Map();
  const schemaTexts = new Map();

  const specificationText = listFiles("protocol/specification/e1.r0-draft.1")
    .filter((item) => item.endsWith(".md"))
    .map((item) => readFileSync(repositoryPath(item), "utf8"))
    .join("\n");
  const requirementIds = new Set(
    [...specificationText.matchAll(/^#{2,3} (REQ-[A-Z]+-[0-9]{4})(?:\s|$)/gmu)].map((match) => match[1]),
  );
  if (requirementIds.size !== 324) fail(`Expected 324 normative requirement IDs, found ${requirementIds.size}`);
  const decisionIds = new Set(
    listFiles("protocol/decisions")
      .map((item) => path.basename(item).match(/^(H-(?:0[1-9]|1[0-4]))-/u)?.[1])
      .filter(Boolean),
  );
  const representationProfile = readFileSync(
    repositoryPath("docs/protocol/d2-rp-01-e1.r0-draft.1-canonical-representation-profile.md"),
    "utf8",
  );
  const representationIds = new Set(
    [...representationProfile.matchAll(/\bD2R-[0-9]{3}[A-Z]?\b/gu)].map((match) => match[0]),
  );

  function verifyProvenance(provenance, label) {
    for (const id of provenance.h) {
      if (!decisionIds.has(id)) fail(`Unknown H provenance ${id} in ${label}`);
    }
    for (const id of provenance.req) {
      if (!requirementIds.has(id)) fail(`Unknown REQ provenance ${id} in ${label}`);
    }
    for (const id of provenance.d2r) {
      if (!representationIds.has(id)) fail(`Unknown D2R provenance ${id} in ${label}`);
    }
  }

  for (const entry of manifest.schemas) {
    assertRepositoryRelativePath(entry.path, `schema ${entry.logicalName}`);
    if (!uuidUrnPattern.test(entry.schemaId)) fail(`Noncanonical schema ID: ${entry.schemaId}`);
    if (schemaIds.has(entry.schemaId)) fail(`Duplicate schema ID: ${entry.schemaId}`);
    if (schemaPaths.has(entry.path)) fail(`Duplicate manifest schema path: ${entry.path}`);
    if (logicalNames.has(entry.logicalName)) fail(`Duplicate logical schema name: ${entry.logicalName}`);
    schemaIds.add(entry.schemaId);
    schemaPaths.add(entry.path);
    logicalNames.add(entry.logicalName);
    verifyProvenance(entry.provenance, `manifest schema ${entry.logicalName}`);
    const record = readJson(entry.path);
    if (record.value.$schema !== expectedDialect) fail(`Wrong dialect in ${entry.path}`);
    if (record.value.$id !== entry.schemaId) fail(`Manifest/schema ID mismatch in ${entry.path}`);
    schemas.set(entry.schemaId, record.value);
    schemaTexts.set(entry.path, record.text);
  }

  if (!uuidUrnPattern.test(manifest.bundleId)) fail(`Noncanonical bundle ID: ${manifest.bundleId}`);
  if (schemaIds.has(manifest.bundleId)) fail("Bundle ID collides with a schema ID");

  for (const entry of manifest.schemas) {
    for (const dependency of entry.dependencies) {
      if (!schemaIds.has(dependency)) fail(`Missing dependency ${dependency} for ${entry.logicalName}`);
    }
  }

  const onDiskSchemaPaths = listFiles(schemaRoot).filter((item) => item.endsWith(".schema.json"));
  if (onDiskSchemaPaths.length !== schemaPaths.size) {
    fail(`Schema/manifest count mismatch: disk=${onDiskSchemaPaths.length}, manifest=${schemaPaths.size}`);
  }
  for (const schemaPath of onDiskSchemaPaths) {
    if (!schemaPaths.has(schemaPath)) fail(`Canonical schema missing from manifest: ${schemaPath}`);
  }

  let referenceCount = 0;
  for (const entry of manifest.schemas) {
    const schema = schemas.get(entry.schemaId);
    visit(schema, (node, pointer) => {
      if (!node || typeof node !== "object" || Array.isArray(node)) return;
      if (Object.hasOwn(node, "default")) fail(`Prohibited default at ${entry.path}${pointer}`);
      if (Object.hasOwn(node, "nullable")) fail(`Prohibited nullable at ${entry.path}${pointer}`);
      if (node.type === "object") {
        const closed = node.additionalProperties === false || node.unevaluatedProperties === false;
        const isComposedBranch = pointer.includes("/oneOf/") && schema.unevaluatedProperties === false;
        if (!closed && !isComposedBranch) fail(`Object schema is not closed at ${entry.path}${pointer}`);
      }
      if (typeof node.$ref === "string") {
        referenceCount += 1;
        if (node.$ref.startsWith("#")) return;
        if (/^https?:/u.test(node.$ref)) fail(`External schema reference is prohibited: ${node.$ref}`);
        if (!uuidUrnPattern.test(node.$ref)) fail(`Noncanonical schema reference: ${node.$ref}`);
        if (!schemaIds.has(node.$ref)) fail(`Unresolved schema reference: ${node.$ref}`);
      }
    });
    const text = schemaTexts.get(entry.path);
    if (text.includes("urn:ghostbridge:")) fail(`Custom Ghost Bridge URN in ${entry.path}`);
    if (text.includes("0.1-draft")) fail(`Historical schema dependency in ${entry.path}`);
  }

  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    validateSchema: true,
    loadSchema: async (uri) => fail(`Network schema retrieval attempted: ${uri}`),
  });
  let metaSchemaPasses = 0;
  for (const entry of manifest.schemas) {
    const schema = schemas.get(entry.schemaId);
    if (!ajv.validateSchema(schema)) {
      fail(`Draft 2020-12 meta-schema failure in ${entry.path}: ${ajv.errorsText(ajv.errors)}`);
    }
    metaSchemaPasses += 1;
  }
  for (const schema of schemas.values()) ajv.addSchema(schema);
  for (const schemaId of schemaIds) {
    if (!ajv.getSchema(schemaId)) fail(`Schema failed offline compilation: ${schemaId}`);
  }

  const validateManifest = ajv.getSchema(manifest.manifestSchema);
  if (!validateManifest(manifest)) fail(`Manifest validation failed: ${ajv.errorsText(validateManifest.errors)}`);

  const assetEntries = [
    ...manifest.registries,
    manifest.semanticConstraintInventory,
    ...manifest.fixtures,
  ];
  const assetPaths = new Set();
  const assets = new Map();
  for (const asset of assetEntries) {
    assertRepositoryRelativePath(asset.path, "manifest asset");
    if (assetPaths.has(asset.path)) fail(`Duplicate manifest asset path: ${asset.path}`);
    assetPaths.add(asset.path);
    if (!schemaIds.has(asset.schemaId)) fail(`Unknown asset schema ID: ${asset.schemaId}`);
    const record = readJson(asset.path);
    const validate = ajv.getSchema(asset.schemaId);
    if (!validate(record.value)) fail(`Asset validation failed for ${asset.path}: ${ajv.errorsText(validate.errors)}`);
    assets.set(asset.path, record.value);
  }

  const registry = assets.get(manifest.registries[0].path);
  const expectedFacets = [
    "gb.facet.host.core",
    "gb.facet.agent.core",
    "gb.facet.trust-verification.core",
    "gb.facet.host.governed-execution",
    "gb.facet.agent.governed-execution",
  ];
  if (JSON.stringify(registry.facets.map((item) => item.id)) !== JSON.stringify(expectedFacets)) {
    fail("Facet registry allocation mismatch");
  }
  if (new Set(registry.facets.map((item) => `${item.id}/${item.revision}`)).size !== 5) {
    fail("Duplicate facet registry allocation");
  }
  if (new Set(registry.authenticationProfiles.map((item) => `${item.id}/${item.revision}`)).size !== 2) {
    fail("Duplicate authentication profile allocation");
  }

  const inventory = assets.get(manifest.semanticConstraintInventory.path);
  const constraintIds = inventory.constraints.map((item) => item.id);
  if (new Set(constraintIds).size !== constraintIds.length) fail("Duplicate semantic constraint ID");
  const requiredConstraintIds = [
    "FND-BASE64URL-CANONICAL",
    "FND-BASE64URL-DECODED-LENGTH",
    "FND-DUPLICATE-RAW-JSON-MEMBERS",
    "FND-STRICT-UTF8-AND-RAW-BYTE-LIMITS",
    "FND-TIMESTAMP-CALENDAR-VALIDITY",
    "FND-TIMESTAMP-YEAR-RANGE",
    "FND-TIMESTAMP-NO-LEAP-SECOND",
    "FND-SAFE-SOURCE-TOKEN-NUMBERS",
    "FND-NEGATIVE-ZERO-REJECTION",
    "FND-PATH-DECODE-REENCODE-EQUALITY",
    "FND-TENANT-EXACT-EQUALITY",
    "FND-TENANT-TYPE-NONINTERCHANGEABILITY",
    "FND-INTERVAL-ORDERING",
    "FND-INTERVAL-NONEMPTY",
    "FND-IDNA2008-VALIDATION",
    "FND-CANONICAL-IPV4",
    "FND-CANONICAL-RFC5952-IPV6",
    "FND-IPV4-MAPPED-IPV6-REJECTION",
    "FND-HTTP-LOOPBACK-CONTEXT",
    "FND-NETB-DNS-REDIRECT-REBINDING",
    "FND-ARTIFACT-EXACT-BYTE-HASH",
    "FND-EXTENSION-IDENTITY-BOUNDARIES",
    "FND-SCHEMA-OFFLINE-NETWORK-PROHIBITION",
  ];
  if (
    requiredConstraintIds.some((id) => !constraintIds.includes(id)) ||
    requiredConstraintIds.length !== constraintIds.length
  ) {
    fail("Semantic constraint inventory does not contain the exact required foundation categories");
  }
  for (const constraint of inventory.constraints) {
    verifyProvenance(constraint.provenance, `semantic constraint ${constraint.id}`);
  }
  for (const deferred of manifest.deferred) {
    verifyProvenance(deferred.provenance, `deferred type ${deferred.logicalName}`);
  }

  const fixtureCounts = new Map();
  const fixtureIds = new Set();
  const fixtureTargetSchemaIds = new Set();
  let fixtureCount = 0;
  let semanticCount = 0;
  for (const fixtureEntry of manifest.fixtures) {
    const corpus = assets.get(fixtureEntry.path);
    const filenameClassification = path.basename(fixtureEntry.path, ".json");
    if (corpus.classification !== filenameClassification) {
      fail(`Fixture classification/path mismatch: ${fixtureEntry.path}`);
    }
    fixtureCounts.set(corpus.classification, corpus.cases.length);
    for (const testCase of corpus.cases) {
      fixtureCount += 1;
      if (fixtureIds.has(testCase.id)) fail(`Duplicate fixture ID: ${testCase.id}`);
      fixtureIds.add(testCase.id);
      fixtureTargetSchemaIds.add(testCase.targetSchema);
      const validate = ajv.getSchema(testCase.targetSchema);
      if (!validate) fail(`Fixture target schema is not preloaded: ${testCase.targetSchema}`);
      if (testCase.kind === "value") {
        const structuralPass = validate(testCase.value);
        if (structuralPass !== (testCase.structuralExpected === "pass")) {
          fail(`Structural expectation mismatch for ${testCase.id}: ${ajv.errorsText(validate.errors)}`);
        }
        if (testCase.semanticExpected !== "not-applicable") {
          semanticCount += 1;
          const semanticPass = semanticResult(testCase);
          if (semanticPass !== (testCase.semanticExpected === "pass")) {
            fail(`Semantic expectation mismatch for ${testCase.id}`);
          }
        }
      } else {
        for (const value of testCase.values) {
          if (!validate(value)) fail(`Equality fixture contains structurally invalid value: ${testCase.id}`);
        }
        semanticCount += 1;
        if (!semanticResult(testCase)) fail(`Equality expectation mismatch for ${testCase.id}`);
      }
    }
  }
  const foundationSchemaIds = manifest.schemas
    .filter((entry) => entry.assetClass !== "d2-machinery")
    .map((entry) => entry.schemaId);
  for (const schemaId of foundationSchemaIds) {
    if (!fixtureTargetSchemaIds.has(schemaId)) fail(`Foundation schema has no fixture coverage: ${schemaId}`);
  }

  const expectedDeferred = ["SemanticCommitmentRef", "Origin", "KeyThumbprintReference"];
  if (JSON.stringify(manifest.deferred.map((item) => item.logicalName)) !== JSON.stringify(expectedDeferred)) {
    fail("Cautious-type deferral inventory mismatch");
  }

  const source = readFileSync(scriptPath, "utf8");
  const importSpecifiers = [...source.matchAll(/from\s+["']([^"']+)["']/gu)].map((match) => match[1]);
  const allowedImports = new Set(["node:fs", "node:module", "node:path", "node:url", "ajv/dist/2020.js"]);
  for (const specifier of importSpecifiers) {
    if (!allowedImports.has(specifier)) fail(`Non-foundation validator import: ${specifier}`);
  }

  console.log(`VALIDATOR Ajv ${ajvVersion} Draft 2020-12`);
  console.log(`SCHEMAS ${schemas.size}`);
  console.log(`UNIQUE_SCHEMA_IDS ${schemaIds.size}`);
  console.log(`MANIFEST_SCHEMA_ENTRIES ${manifest.schemas.length}`);
  console.log(`META_SCHEMA PASS ${metaSchemaPasses}/${schemas.size}`);
  console.log(`OFFLINE_REFS PASS ${referenceCount}`);
  console.log(`PROVENANCE PASS ${requirementIds.size} REQ_IDS ${decisionIds.size} H_IDS`);
  console.log(`SEMANTIC_CONSTRAINTS ${inventory.constraints.length}`);
  console.log(`DEFERRED_TYPES ${manifest.deferred.length}`);
  console.log(`FIXTURES ${fixtureCount}`);
  console.log(`FIXTURE_TARGET_SCHEMAS ${fixtureTargetSchemaIds.size}`);
  for (const [classification, count] of [...fixtureCounts.entries()].sort()) {
    console.log(`FIXTURE_CLASS ${classification} ${count}`);
  }
  console.log(`SEMANTIC_CHECKS PASS ${semanticCount}`);
  console.log("STATIC_SAFETY PASS");
  console.log("FOUNDATION_VALIDATION PASS");
}

try {
  main();
} catch (error) {
  console.error(`FOUNDATION_VALIDATION FAIL: ${error.message}`);
  process.exitCode = 1;
}
