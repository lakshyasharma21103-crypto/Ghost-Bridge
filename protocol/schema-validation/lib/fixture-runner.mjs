import path from "node:path";

import { errorMessage, fail } from "./errors.mjs";
import { WIRE_JSON_LIMITS, parseWireJsonBytes } from "./json-source.mjs";
import { evaluateSemanticCheck } from "./semantic-checks.mjs";

export function assertFixtureClassification(classification, testCase) {
  if (!testCase || typeof testCase !== "object" || Array.isArray(testCase)) fail("Fixture case must be an object");
  const fixtureId = String(testCase.id);
  if (testCase.kind === "raw-json") {
    if (testCase.expected === "fail" && typeof testCase.diagnosticIncludes !== "string") {
      fail(`Failing raw fixture has no diagnostic expectation: ${String(testCase.id)}`);
    }
    if (testCase.expected === "fail" && Object.hasOwn(testCase, "expectedNumberTokens")) {
      fail(`Failing raw fixture has a successful number-token expectation: ${String(testCase.id)}`);
    }
    if (testCase.expected === "pass" && Object.hasOwn(testCase, "diagnosticIncludes")) {
      fail(`Passing raw fixture has a failure diagnostic expectation: ${String(testCase.id)}`);
    }
    if (classification === "structural-negative" && testCase.expected !== "fail") {
      fail(`Misclassified structural-negative raw fixture: ${fixtureId}`);
    }
    if (classification === "structural-positive" && testCase.expected !== "pass") {
      fail(`Misclassified structural-positive raw fixture: ${fixtureId}`);
    }
    if (classification === "semantic-negative" || classification === "semantic-positive") {
      fail(`Raw fixture is not a semantic fixture: ${fixtureId}`);
    }
    if (!["structural-negative", "structural-positive", "boundary"].includes(classification)) {
      fail(`Unknown raw fixture classification: ${String(classification)}`);
    }
    return;
  }
  if (classification === "structural-negative") {
    if (testCase.kind !== "value" || testCase.structuralExpected !== "fail" || testCase.semanticExpected !== "not-applicable" || testCase.semanticCheck !== "none") {
      fail(`Misclassified structural-negative fixture: ${fixtureId}`);
    }
  } else if (classification === "semantic-negative") {
    if (testCase.kind !== "value" || testCase.structuralExpected !== "pass" || testCase.semanticExpected !== "fail" || testCase.semanticCheck === "none") {
      fail(`Misclassified semantic-negative fixture: ${fixtureId}`);
    }
  } else if (classification === "semantic-positive") {
    const acceptedValueEvidence = testCase.kind === "value" && testCase.structuralExpected === "pass" && testCase.semanticExpected === "pass" && testCase.semanticCheck !== "none";
    const acceptedEqualityEvidence = testCase.kind === "equality" && testCase.semanticCheck !== "none";
    if (!acceptedValueEvidence && !acceptedEqualityEvidence) {
      fail(`Misclassified semantic-positive fixture: ${fixtureId}`);
    }
  } else if (classification === "structural-positive") {
    if (testCase.kind !== "value" || testCase.structuralExpected !== "pass") {
      fail(`Misclassified structural-positive fixture: ${fixtureId}`);
    }
  } else if (classification !== "boundary") {
    fail(`Unknown fixture classification: ${String(classification)}`);
  }
}

function materializeRawSource(source, fixtureId, wireClass) {
  const wireLimit = WIRE_JSON_LIMITS.bodyBytes[wireClass];
  if (wireLimit === undefined) fail(`Unknown raw fixture wire class: ${fixtureId}`);
  const maximumFixtureBytes = wireLimit + 1;
  if (source.encoding === "utf8") {
    if (Buffer.byteLength(source.value, "utf8") > maximumFixtureBytes) fail(`Raw fixture source is unnecessarily oversized: ${fixtureId}`);
    return Buffer.from(source.value, "utf8");
  }
  if (source.encoding === "hex") {
    if (source.value.length / 2 > maximumFixtureBytes) fail(`Raw fixture source is unnecessarily oversized: ${fixtureId}`);
    return Buffer.from(source.value, "hex");
  }
  if (source.encoding === "repeat-utf8") {
    const generatedBytes =
      Buffer.byteLength(source.prefix, "utf8") +
      Buffer.byteLength(source.value, "utf8") * source.count +
      Buffer.byteLength(source.suffix, "utf8");
    if (!Number.isSafeInteger(generatedBytes) || generatedBytes > maximumFixtureBytes) {
      fail(`Raw fixture source is unnecessarily oversized: ${fixtureId}`);
    }
    return Buffer.from(`${source.prefix}${source.value.repeat(source.count)}${source.suffix}`, "utf8");
  }
  fail(`Unknown raw fixture source encoding: ${fixtureId}`);
}

export function runFixtureCase({ testCase, classification, validateTarget, errorsText = () => "validation failed" }) {
  if (!testCase || typeof testCase !== "object" || Array.isArray(testCase)) fail("Fixture case must be an object");
  if (classification !== undefined) assertFixtureClassification(classification, testCase);

  if (testCase.kind === "raw-json") {
    let result;
    let diagnostic;
    try {
      result = parseWireJsonBytes(materializeRawSource(testCase.source, testCase.id, testCase.wireClass), {
        wireClass: testCase.wireClass,
        source: `fixture ${String(testCase.id)}`,
      });
    } catch (error) {
      diagnostic = errorMessage(error);
    }
    const passed = diagnostic === undefined;
    if (passed !== (testCase.expected === "pass")) {
      fail(`Raw expectation mismatch for ${String(testCase.id)}: expected=${testCase.expected} actual=${passed ? "pass" : "fail"}${diagnostic ? `; ${diagnostic}` : ""}`);
    }
    if (!passed && !diagnostic.includes(testCase.diagnosticIncludes)) {
      fail(`Raw fixture ${String(testCase.id)} failed with the wrong diagnostic: ${diagnostic}`);
    }
    if (passed && testCase.expectedNumberTokens !== undefined) {
      if (JSON.stringify(result.numberTokens) !== JSON.stringify(testCase.expectedNumberTokens)) {
        fail(`Raw number-token evidence mismatch for ${String(testCase.id)}`);
      }
    }
    return { semanticChecks: 0, rawChecks: 1 };
  }

  if (typeof validateTarget !== "function") fail(`Fixture ${String(testCase.id)} has no target validator`);

  if (testCase.kind === "value") {
    const hasSemanticInput = Object.hasOwn(testCase, "semanticInput");
    if (testCase.semanticCheck === "artifact-byte-integrity" && !hasSemanticInput) {
      fail(`Artifact fixture ${String(testCase.id)} has no semanticInput`);
    }
    if (testCase.semanticCheck !== "artifact-byte-integrity" && hasSemanticInput) {
      fail(`Non-artifact fixture ${String(testCase.id)} supplies artifact semanticInput`);
    }
    const structuralPass = validateTarget(testCase.value) === true;
    const expectedStructuralPass = testCase.structuralExpected === "pass";
    if (structuralPass !== expectedStructuralPass) {
      fail(`Structural expectation mismatch for ${String(testCase.id)}: expected=${testCase.structuralExpected} actual=${structuralPass ? "pass" : "fail"}; ${errorsText()}`);
    }
    if (testCase.semanticExpected === "not-applicable") {
      if (testCase.semanticCheck !== "none") {
        fail(`Fixture ${String(testCase.id)} skips a non-none semantic check`);
      }
      return { semanticChecks: 0, rawChecks: 0 };
    }
    if (testCase.semanticCheck === "none") {
      fail(`Fixture ${String(testCase.id)} expects an applicable semantic result with no semantic check`);
    }
    if (!structuralPass) fail(`Fixture ${String(testCase.id)} requests semantic validation after structural rejection`);
    const semanticPass = evaluateSemanticCheck(testCase, { validateTarget });
    const expectedSemanticPass = testCase.semanticExpected === "pass";
    if (semanticPass !== expectedSemanticPass) {
      fail(`Semantic expectation mismatch for ${String(testCase.id)}: expected=${testCase.semanticExpected} actual=${semanticPass ? "pass" : "fail"}`);
    }
    return { semanticChecks: 1, rawChecks: 0 };
  }

  if (testCase.kind === "equality") {
    if (testCase.semanticCheck === "none") fail(`Equality fixture ${String(testCase.id)} has no semantic check`);
    for (const value of testCase.values) {
      if (!validateTarget(value)) fail(`Equality fixture contains structurally invalid value: ${String(testCase.id)}`);
    }
    if (!evaluateSemanticCheck(testCase, { validateTarget })) {
      fail(`Equality expectation mismatch for ${String(testCase.id)}`);
    }
    return { semanticChecks: 1, rawChecks: 0 };
  }

  fail(`Unknown fixture kind ${String(testCase.kind)} in ${String(testCase.id)}`);
}

export function runFoundationFixtures({ manifest, assets, ajv }) {
  const fixtureCounts = new Map();
  const fixtureIds = new Set();
  const fixtureTargetSchemaIds = new Set();
  let fixtureCount = 0;
  let semanticCount = 0;
  let rawCount = 0;
  const processedFixturePaths = new Set();

  for (const fixtureEntry of [...manifest.fixtures].sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0))) {
    const corpus = assets.get(fixtureEntry.path);
    if (!corpus || !Array.isArray(corpus.cases)) fail(`Fixture corpus was not loaded: ${fixtureEntry.path}`);
    const filenameClassification = path.posix.basename(fixtureEntry.path, ".json");
    if (corpus.classification !== filenameClassification) {
      fail(`Fixture classification/path mismatch: ${fixtureEntry.path}`);
    }
    fixtureCounts.set(corpus.classification, (fixtureCounts.get(corpus.classification) ?? 0) + corpus.cases.length);

    for (const testCase of corpus.cases) {
      fixtureCount += 1;
      if (fixtureIds.has(testCase.id)) fail(`Duplicate fixture ID: ${String(testCase.id)}`);
      fixtureIds.add(testCase.id);
      const isRaw = testCase.kind === "raw-json";
      if (!isRaw) fixtureTargetSchemaIds.add(testCase.targetSchema);
      const validateTarget = isRaw ? undefined : ajv.getSchema(testCase.targetSchema);
      if (!isRaw && !validateTarget) fail(`Fixture target schema is not preloaded: ${String(testCase.targetSchema)}`);
      const result = runFixtureCase({
        testCase,
        classification: corpus.classification,
        validateTarget,
        errorsText: () => ajv.errorsText(validateTarget.errors),
      });
      semanticCount += result.semanticChecks;
      rawCount += result.rawChecks;
    }
    processedFixturePaths.add(fixtureEntry.path);
  }

  const fixtureCoveredAssetClasses = new Set(["representation-helper", "wire-primitive", "wire-foundation-object"]);
  for (const entry of manifest.schemas.filter((item) => fixtureCoveredAssetClasses.has(item.assetClass))) {
    if (!fixtureTargetSchemaIds.has(entry.schemaId)) fail(`Foundation schema has no fixture coverage: ${entry.schemaId}`);
  }
  return {
    fixtureCounts,
    fixtureCount,
    semanticCount,
    rawCount,
    fixtureIds,
    fixtureTargetSchemaIds,
    processedFixturePaths,
  };
}
