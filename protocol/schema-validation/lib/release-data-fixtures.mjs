import { fail, diagnosticCode, releaseDataFail } from "./errors.mjs";
import { assertExactPathSet, listRepositoryFiles } from "./bundle-loader.mjs";
import { decodeStrictUtf8, parseJsonSource } from "./json-source.mjs";
import { readExactJsonAsset, loadReleaseDataFiles, validateReleaseDataBundle } from "./release-data-loader.mjs";
import { DIAGNOSTICS, RELEASE_FIXTURE_PATH, RELEASE_FIXTURE_SCHEMA_ID } from "./release-data-constants.mjs";
import { loadReleaseDataConformanceLock } from "./release-data-conformance-lock.mjs";
import {
  authorizeSourceClaim,
  classifyFacetProperty,
  evaluateReceiptDisposition,
  validateCapabilityNarrowing,
  validateReleaseDataSemantics,
} from "./release-data-semantics.mjs";
import { serializeGeneratedJson } from "../generate-release-data.mjs";
import { sha256Base64url } from "./semantic-checks.mjs";

const ACCEPTED = "RDA_RELEASE_DATA_ACCEPTED";

function cloneFileBundle(bundle) {
  return {
    manifest: structuredClone(bundle.manifest),
    manifestRecord: { ...bundle.manifestRecord, bytes: Buffer.from(bundle.manifestRecord.bytes), value: structuredClone(bundle.manifestRecord.value) },
    artifactRecords: new Map([...bundle.artifactRecords].map(([path, record]) => [path, { bytes: Buffer.from(record.bytes), text: record.text, value: structuredClone(record.value) }])),
  };
}

function cloneArtifactMap(artifactsByClass) {
  return new Map([...artifactsByClass].map(([registryClass, artifact]) => [registryClass, structuredClone(artifact)]));
}

function entryForClass(bundle, registryClass) {
  const entry = bundle.manifest.registryArtifacts.find((item) => item.registryClass === registryClass);
  if (!entry) fail(`Fixture helper could not find registry class: ${registryClass}`);
  return entry;
}

function refreshArtifact(bundle, registryClass, mutate) {
  const entry = entryForClass(bundle, registryClass);
  const record = bundle.artifactRecords.get(entry.path);
  if (!record) fail(`Fixture helper could not find artifact record: ${entry.path}`);
  const value = parseJsonSource(decodeStrictUtf8(record.bytes, entry.path), entry.path);
  mutate(value);
  const bytes = serializeGeneratedJson(value);
  bundle.artifactRecords.set(entry.path, { bytes, text: bytes.toString("utf8"), value });
  entry.artifactByteIntegrity = {
    algorithm: "sha-256",
    value: sha256Base64url(bytes),
    byteLength: bytes.byteLength,
  };
}

function validateMutatedFileBundle(baselineBundle, mutate, context) {
  const bundle = cloneFileBundle(baselineBundle);
  mutate(bundle);
  validateReleaseDataBundle({ bundle, validateManifest: context.validateManifest, validatorsBySchema: context.validatorsBySchema, conformanceLock: context.conformanceLock });
  return ACCEPTED;
}

function validateMutatedSemantics(context, mutate) {
  const artifacts = cloneArtifactMap(context.baselineResult.artifactsByClass);
  mutate(artifacts);
  validateReleaseDataSemantics(artifacts, { conformanceLock: context.conformanceLock });
  return ACCEPTED;
}

function runScenario(testCase, context) {
  const target = testCase.parameters.target;
  const baselineBundle = context.baselineBundle;
  const baselineArtifacts = context.baselineResult.artifactsByClass;
  switch (testCase.scenario) {
    case "complete-set":
      return ACCEPTED;
    case "optional-absence":
      return authorizeSourceClaim(baselineArtifacts.get("gb.registry.source-claim-authority"), "offer-release-bound", "Offer", false);
    case "missing-class":
      return validateMutatedFileBundle(baselineBundle, (bundle) => {
        bundle.manifest.registryArtifacts = bundle.manifest.registryArtifacts.filter((item) => item.registryClass !== target);
      }, context);
    case "unknown-class":
      return validateMutatedFileBundle(baselineBundle, (bundle) => {
        bundle.manifest.registryArtifacts[0].registryClass = "gb.registry.unknown-fixture";
      }, context);
    case "duplicate-class":
      return validateMutatedFileBundle(baselineBundle, (bundle) => {
        bundle.manifest.registryArtifacts[1].registryClass = bundle.manifest.registryArtifacts[0].registryClass;
      }, context);
    case "wrong-release":
      return validateMutatedFileBundle(baselineBundle, (bundle) => {
        bundle.manifest.protocolRelease = "ghostbridge/e1.r0-draft.0";
      }, context);
    case "artifact-wrong-release":
      return validateMutatedFileBundle(baselineBundle, (bundle) => refreshArtifact(bundle, "gb.registry.source-claim-authority", (artifact) => {
        artifact.protocolRelease = "ghostbridge/e1.r0-draft.0";
      }), context);
    case "wrong-registry-class":
      return validateMutatedFileBundle(baselineBundle, (bundle) => {
        const first = bundle.manifest.registryArtifacts[0].registryClass;
        bundle.manifest.registryArtifacts[0].registryClass = bundle.manifest.registryArtifacts[1].registryClass;
        bundle.manifest.registryArtifacts[1].registryClass = first;
      }, context);
    case "artifact-class-mismatch":
      return validateMutatedFileBundle(baselineBundle, (bundle) => refreshArtifact(bundle, "gb.registry.source-claim-authority", (artifact) => {
        artifact.registryClass = "gb.registry.directional-binding";
      }), context);
    case "wrong-artifact-identity":
      return validateMutatedFileBundle(baselineBundle, (bundle) => {
        entryForClass(bundle, "gb.registry.source-claim-authority").sourceClaimAuthorityArtifact = "urn:uuid:00000000-0000-4000-8000-000000000001";
      }, context);
    case "wrong-artifact-type":
      return validateMutatedFileBundle(baselineBundle, (bundle) => {
        const entry = entryForClass(bundle, "gb.registry.source-claim-authority");
        entry.directionalBindingArtifact = entry.sourceClaimAuthorityArtifact;
        delete entry.sourceClaimAuthorityArtifact;
      }, context);
    case "wrong-integrity-reference":
      return validateMutatedFileBundle(baselineBundle, (bundle) => {
        entryForClass(bundle, "gb.registry.source-claim-authority").artifactByteIntegrity.algorithm = "sha-512";
      }, context);
    case "wrong-sha256":
      return validateMutatedFileBundle(baselineBundle, (bundle) => {
        entryForClass(bundle, "gb.registry.source-claim-authority").artifactByteIntegrity.value = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
      }, context);
    case "wrong-byte-length":
      return validateMutatedFileBundle(baselineBundle, (bundle) => {
        entryForClass(bundle, "gb.registry.source-claim-authority").artifactByteIntegrity.byteLength += 1;
      }, context);
    case "partial-load":
      return validateMutatedFileBundle(baselineBundle, (bundle) => {
        bundle.artifactRecords.delete(entryForClass(bundle, "gb.registry.source-claim-authority").path);
      }, context);
    case "multiply-referenced-artifact":
      return validateMutatedFileBundle(baselineBundle, (bundle) => {
        bundle.manifest.registryArtifacts[1].path = bundle.manifest.registryArtifacts[0].path;
      }, context);
    case "invalid-registry-content":
      return validateMutatedFileBundle(baselineBundle, (bundle) => refreshArtifact(bundle, "gb.registry.source-claim-authority", (artifact) => {
        delete artifact.claimSemantics.R;
      }), context);
    case "preferred-version-optionalized":
      return validateMutatedFileBundle(baselineBundle, (bundle) => refreshArtifact(bundle, "gb.registry.source-claim-authority", (artifact) => {
        artifact.dimensions.find((item) => item.id === target).authorizedClaims[0].presence = "P";
      }), context);
    case "unauthorized-source-claim":
      return authorizeSourceClaim(baselineArtifacts.get("gb.registry.source-claim-authority"), "agent-identity", "Request body", true);
    case "host-context-claim-authority":
      return authorizeSourceClaim(baselineArtifacts.get("gb.registry.source-claim-authority"), "capability-required-host-conditions", "Host", true);
    case "host-context-authority-escalation":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.source-claim-authority").dimensions.find((item) => item.id === "capability-required-host-conditions").authorizedClaims.push({ source: "Host", presence: "R", qualification: "supplies matching context where applicable" });
      });
    case "host-context-widen":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.source-claim-authority").contextSupplyObligations[0].authorizesClaim = true;
      });
    case "host-context-replace":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.source-claim-authority").dimensions.find((item) => item.id === "capability-required-host-conditions").authorizedClaims = [{ source: "Host", presence: "R", qualification: "supplies matching context where applicable" }];
      });
    case "source-owner-changed":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.source-claim-authority").dimensions.find((item) => item.id === "agent-identity").authorizedClaims[0].source = "Request body";
      });
    case "source-presence-changed":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.source-claim-authority").dimensions.find((item) => item.id === "agent-identity").authorizedClaims[0].presence = "P";
      });
    case "source-duplicate-conflict":
      return validateMutatedSemantics(context, (artifacts) => {
        const claims = artifacts.get("gb.registry.source-claim-authority").dimensions.find((item) => item.id === "agent-identity").authorizedClaims;
        claims.push({ ...structuredClone(claims[0]), presence: "P" });
      });
    case "source-qualification-changed":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.source-claim-authority").dimensions.find((item) => item.id === "agent-identity").authorizedClaims[0].qualification = "fixture qualification";
      });
    case "derived-value-changed":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.source-claim-authority").derivedOnlyDimensions[0] = "fixture-derived-only-value";
      });
    case "grant-identity-escalation":
      return validateMutatedSemantics(context, (artifacts) => {
        const source = artifacts.get("gb.registry.source-claim-authority");
        const original = target === "organization" ? "grant-organization-scope-binding" : "grant-tagged-workspace-scope-binding";
        source.dimensions.find((item) => item.id === original).id = `${target}-identity-authority`;
      });
    case "derived-source-claim":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.source-claim-authority").dimensions.find((item) => item.id === "offer-restriction").id = target;
      });
    case "trust-reference-validity":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.source-claim-authority").dimensions.find((item) => item.id === "bounded-trust-verification-result").id = "trust-evidence-reference";
      });
    case "trust-core-negotiation":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.facet-property").invariantProperties.find((item) => item.token === "deterministic-release-negotiation").facets.push("TC");
      });
    case "unknown-property":
      return classifyFacetProperty(baselineArtifacts.get("gb.registry.facet-property"), "unregistered-fixture-property");
    case "sixth-capability-property":
      return validateMutatedSemantics(context, (artifacts) => {
        const properties = artifacts.get("gb.registry.facet-property").capabilityNarrowableProperties;
        properties.push({ ...structuredClone(properties[0]), token: "sixth-fixture-property" });
      });
    case "narrowing-without-exact-version":
      return validateCapabilityNarrowing(baselineArtifacts.get("gb.registry.facet-property"), { capabilityKey: { namespaceClass: "core", name: "fixture" }, propertyToken: "requester-cancellation-support" });
    case "valid-core-capability-scope":
      return validateCapabilityNarrowing(baselineArtifacts.get("gb.registry.facet-property"), { capabilityKey: { namespaceClass: "core", name: "fixture.core" }, capabilityVersion: "v1", propertyToken: "requester-cancellation-support" });
    case "valid-external-capability-scope":
      return validateCapabilityNarrowing(baselineArtifacts.get("gb.registry.facet-property"), { capabilityKey: { namespaceClass: "external", namespace: "urn:uuid:12345678-1234-4123-8123-123456789abc", name: "fixture.external" }, capabilityVersion: "release_1", propertyToken: "requester-cancellation-support" });
    case "string-capability-key":
      return validateCapabilityNarrowing(baselineArtifacts.get("gb.registry.facet-property"), { capabilityKey: "external.fixture", capabilityVersion: "v1", propertyToken: "requester-cancellation-support" });
    case "integer-capability-version":
      return validateCapabilityNarrowing(baselineArtifacts.get("gb.registry.facet-property"), { capabilityKey: { namespaceClass: "core", name: "fixture" }, capabilityVersion: 1, propertyToken: "requester-cancellation-support" });
    case "malformed-capability-version":
      return validateCapabilityNarrowing(baselineArtifacts.get("gb.registry.facet-property"), { capabilityKey: { namespaceClass: "core", name: "fixture" }, capabilityVersion: "1.0", propertyToken: "requester-cancellation-support" });
    case "external-capability-missing-namespace":
      return validateCapabilityNarrowing(baselineArtifacts.get("gb.registry.facet-property"), { capabilityKey: { namespaceClass: "external", name: "fixture" }, capabilityVersion: "v1", propertyToken: "requester-cancellation-support" });
    case "core-capability-has-namespace":
      return validateCapabilityNarrowing(baselineArtifacts.get("gb.registry.facet-property"), { capabilityKey: { namespaceClass: "core", namespace: "urn:uuid:12345678-1234-4123-8123-123456789abc", name: "fixture" }, capabilityVersion: "v1", propertyToken: "requester-cancellation-support" });
    case "receipt-optional-value":
      return evaluateReceiptDisposition({ disposition: "optional" });
    case "receipt-no-waiver-conflict":
      return evaluateReceiptDisposition({ disposition: "permitted", stricterRequirement: "required" });
    case "core-nonempty":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.core-capability-allocation").capabilityAllocations.push({ key: "fixture" });
      });
    case "global-allocation-nonempty":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.global-feature-allocation").globalFeatureAllocations.push({ feature: "fixture" });
      });
    case "global-relationship-nonempty":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.global-feature-allocation").featureToProfileRelationships.push({ feature: "fixture" });
      });
    case "namespace-authority-escalation":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.external-capability-eligibility").namespaceAuthority.ownership = true;
      });
    case "authentication-fallback":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.authentication-profile").profiles.find((item) => item.id === "gb.auth.signed-request-pop").prohibitedFallbacks.pop();
      });
    case "fixture-none-production":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.authentication-profile").profiles.find((item) => item.id === "gb.auth.none-test-fixture").production = true;
      });
    case "mutable-historical-substitution":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.external-capability-eligibility").historicalResolution.mutableLatest = true;
      });
    case "future-binding":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.directional-binding").dependencyOrder.push("future-connection-result");
      });
    case "directional-kind-changed":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.directional-binding").bindings[0].kind = "evaluation";
      });
    case "directional-meaning-changed":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.directional-binding").bindings[0].meaning = "fixture changed meaning";
      });
    case "invariant-facet-changed":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.facet-property").invariantProperties[0].facets[0] = "HG";
      });
    case "invariant-role-changed":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.facet-property").invariantProperties[0].roles = "fixture role";
      });
    case "invariant-failure-changed":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.facet-property").invariantProperties[0].failure[0] = "FO";
      });
    case "invariant-meaning-changed":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.facet-property").invariantProperties[0].meaning = "fixture changed meaning";
      });
    case "failure-code-meaning-changed":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.facet-property").failureCodes[0].meaning = "fixture changed failure meaning";
      });
    case "external-rule-text-changed":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.external-capability-eligibility").eligibilityRules[0].rule = "fixture changed rule";
      });
    case "external-duplicate-order":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.external-capability-eligibility").eligibilityRules[1].order = 1;
      });
    case "external-rule-reordered":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.external-capability-eligibility").eligibilityRules.reverse();
      });
    case "narrowable-no-waiver-changed":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.facet-property").capabilityNarrowableProperties[0].noWidenNoWaiver = "fixture weakened rule";
      });
    case "narrowable-conflict-changed":
      return validateMutatedSemantics(context, (artifacts) => {
        artifacts.get("gb.registry.facet-property").capabilityNarrowableProperties[0].conflictFailure = "fixture changed conflict";
      });
    case "signed-pop-premature-eligibility":
      return validateMutatedFileBundle(baselineBundle, (bundle) => refreshArtifact(bundle, "gb.registry.authentication-profile", (artifact) => {
        artifact.profiles.find((item) => item.id === "gb.auth.signed-request-pop").eligible = true;
      }), context);
    default:
      releaseDataFail(DIAGNOSTICS.INVALID_CONTENT, `Unknown release-data fixture scenario: ${testCase.scenario}`);
  }
}

export function runReleaseDataFixtures({ repositoryRoot, validatorsBySchema, validateManifest }) {
  assertExactPathSet(
    "release-data fixture",
    [RELEASE_FIXTURE_PATH],
    listRepositoryFiles(repositoryRoot, "protocol/fixtures/wire/e1.r0-draft.1/release-data"),
  );
  const fixtureRecord = readExactJsonAsset(repositoryRoot, RELEASE_FIXTURE_PATH);
  const validateCorpus = validatorsBySchema.get(RELEASE_FIXTURE_SCHEMA_ID);
  if (typeof validateCorpus !== "function") fail("Release-data fixture corpus schema validator is unavailable");
  if (!validateCorpus(fixtureRecord.value)) fail("Release-data fixture corpus failed structural validation");
  const fixtureIds = fixtureRecord.value.cases.map((item) => item.id);
  if (new Set(fixtureIds).size !== fixtureIds.length) fail("Duplicate release-data fixture ID");

  const conformanceLock = loadReleaseDataConformanceLock(repositoryRoot);
  const baselineBundle = loadReleaseDataFiles(repositoryRoot);
  const baselineResult = validateReleaseDataBundle({ bundle: baselineBundle, validateManifest, validatorsBySchema, conformanceLock });
  const context = { baselineBundle, baselineResult, conformanceLock, validateManifest, validatorsBySchema };
  let positiveCount = 0;
  let negativeCount = 0;
  const exercised = [];
  for (const testCase of [...fixtureRecord.value.cases].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))) {
    let actualDisposition = "accept";
    let actualDiagnostic;
    try {
      actualDiagnostic = runScenario(testCase, context);
    } catch (error) {
      actualDisposition = "reject";
      actualDiagnostic = diagnosticCode(error);
      if (!actualDiagnostic) throw error;
    }
    if (actualDisposition !== testCase.expectedDisposition || actualDiagnostic !== testCase.expectedDiagnostic) {
      fail(`Release-data fixture expectation mismatch for ${testCase.id}: expected=${testCase.expectedDisposition}/${testCase.expectedDiagnostic} actual=${actualDisposition}/${String(actualDiagnostic)}`);
    }
    if (actualDisposition === "accept") positiveCount += 1;
    else negativeCount += 1;
    exercised.push(testCase.id);
  }
  if (exercised.length !== fixtureRecord.value.cases.length) fail("A release-data fixture was not exercised");
  return { fixtureCount: exercised.length, positiveCount, negativeCount, exercised };
}
