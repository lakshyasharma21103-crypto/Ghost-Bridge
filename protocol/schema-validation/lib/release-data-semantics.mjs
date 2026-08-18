import { releaseDataFail } from "./errors.mjs";
import {
  DIAGNOSTICS,
  EXPECTED_DIRECTIONAL_BINDING_IDS,
  EXPECTED_INVARIANT_PROPERTY_TOKENS,
  EXPECTED_SOURCE_DIMENSION_IDS,
  REGISTRY_CLASS_SET,
} from "./release-data-constants.mjs";

function exactSet(actual, expected) {
  const left = [...actual].toSorted();
  const right = [...expected].toSorted();
  return left.length === new Set(left).size && JSON.stringify(left) === JSON.stringify(right);
}

function requireCondition(condition, message, code = DIAGNOSTICS.INVALID_CONTENT) {
  if (!condition) releaseDataFail(code, message);
}

function uniqueMemberValues(items, property, label) {
  requireCondition(Array.isArray(items), `${label} must be an array`);
  const values = items.map((item) => item?.[property]);
  requireCondition(values.every((value) => typeof value === "string"), `${label} has an invalid ${property}`);
  requireCondition(new Set(values).size === values.length, `${label} has duplicate ${property}`);
  return values;
}

export const RELEASE_DATA_SEMANTIC_CHECK_IDS = Object.freeze([
  "RDA-SEM-ATOMIC-SOURCE-AUTHORITY",
  "RDA-SEM-AUTHENTICATION-PROFILES",
  "RDA-SEM-CAPABILITY-NARROWING",
  "RDA-SEM-CORE-EXPLICIT-EMPTY",
  "RDA-SEM-DIRECTIONAL-BINDINGS",
  "RDA-SEM-EXTERNAL-ELIGIBILITY",
  "RDA-SEM-FACET-PROPERTY-INVENTORY",
  "RDA-SEM-GLOBAL-EXPLICIT-EMPTY",
  "RDA-SEM-HISTORICAL-IMMUTABILITY",
  "RDA-SEM-MANIFEST-ATOMICITY",
  "RDA-SEM-RECEIPT-DISPOSITION",
  "RDA-SEM-ROLE-SEPARATION",
  "RDA-SEM-TYPED-ARTIFACT-BINDING",
  "RDA-SEM-TRUST-NEGOTIATION-SEPARATION",
  "RDA-SEM-EXACT-BYTE-INTEGRITY",
]);

export function validateReleaseDataSemantics(artifactsByClass) {
  requireCondition(artifactsByClass instanceof Map, "Release-data semantic input must be a class map");
  requireCondition(exactSet(artifactsByClass.keys(), REGISTRY_CLASS_SET), "Release-data semantic class set is incomplete");

  const source = artifactsByClass.get("gb.registry.source-claim-authority");
  const dimensionIds = uniqueMemberValues(source.dimensions, "id", "source dimensions");
  requireCondition(dimensionIds.length === 81, `Expected 81 atomic source dimensions, found ${dimensionIds.length}`);
  const dimensions = new Map(source.dimensions.map((item) => [item.id, item]));
  for (const [dimensionId, expectedSource] of [
    ["client-host-local-preferred-release", "Client participant metadata"],
    ["agent-local-preferred-release", "Agent participant metadata"],
  ]) {
    const dimension = dimensions.get(dimensionId);
    requireCondition(dimension?.authorizedClaims?.length === 1, `Preferred-release dimension is malformed: ${dimensionId}`, DIAGNOSTICS.SOURCE_REQUIRED_CLAIM);
    requireCondition(dimension.authorizedClaims[0].source === expectedSource && dimension.authorizedClaims[0].presence === "R", `Preferred-release claim is not required participant-owned consistency evidence: ${dimensionId}`, DIAGNOSTICS.SOURCE_REQUIRED_CLAIM);
  }
  requireCondition(exactSet(source.requiredConsistencyDimensions, ["client-host-local-preferred-release", "agent-local-preferred-release"]), "Preferred-release consistency dimension set is not exact", DIAGNOSTICS.SOURCE_REQUIRED_CLAIM);
  const requiredHostConditions = dimensions.get("capability-required-host-conditions")?.authorizedClaims?.find((item) => item.source === "Host");
  requireCondition(requiredHostConditions?.presence === "R" && requiredHostConditions.qualification === "supplies matching context where applicable", "Applicable required Host conditions are not required matching-context claims", DIAGNOSTICS.SOURCE_REQUIRED_CLAIM);
  for (const derived of ["final-selected-release", "final-common-authentication-eligible-set", "complete-negotiated-result", "complete-redemption-intent", "connection-authority"]) {
    requireCondition(source.derivedOnlyDimensions.includes(derived), `Missing derived-only dimension: ${derived}`, DIAGNOSTICS.DERIVED_SOURCE_CLAIM);
    requireCondition(!dimensions.has(derived), `Derived-only value is source-authored: ${derived}`, DIAGNOSTICS.DERIVED_SOURCE_CLAIM);
  }
  requireCondition(!dimensionIds.includes("trust-evidence-reference"), "Generic Trust-reference source authority is prohibited", DIAGNOSTICS.TRUST_REFERENCE_VALIDITY);
  requireCondition(dimensions.has("grant-organization-scope-binding") && !dimensions.has("organization-identity-authority"), "Grant organization binding became identity authority", DIAGNOSTICS.GRANT_IDENTITY_ESCALATION);
  requireCondition(dimensions.has("grant-tagged-workspace-scope-binding") && !dimensions.has("workspace-identity-authority"), "Grant Workspace binding became identity authority", DIAGNOSTICS.GRANT_IDENTITY_ESCALATION);
  requireCondition(exactSet(dimensionIds, EXPECTED_SOURCE_DIMENSION_IDS), "Atomic source-dimension inventory is not exact");

  const directional = artifactsByClass.get("gb.registry.directional-binding");
  const bindingIds = uniqueMemberValues(directional.bindings, "id", "directional bindings");
  requireCondition(bindingIds.length === 20, `Expected 20 directional bindings, found ${bindingIds.length}`);
  requireCondition(exactSet(bindingIds, EXPECTED_DIRECTIONAL_BINDING_IDS), "Directional-binding inventory is not exact");
  requireCondition(exactSet(directional.dependencyOrder, ["validated-inputs", "deterministic-negotiated-result", "complete-redemption-intent", "atomic-connection-commit"]), "Directional dependency inventory changed", DIAGNOSTICS.FUTURE_BINDING);
  requireCondition(JSON.stringify(directional.dependencyOrder) === JSON.stringify(["validated-inputs", "deterministic-negotiated-result", "complete-redemption-intent", "atomic-connection-commit"]), "Directional dependency order changed", DIAGNOSTICS.FUTURE_BINDING);
  requireCondition(directional.prohibitedFutureBindings.length === 5 && directional.offerIssuerAsserted === false, "Future binding or Offer issuer authority was introduced", DIAGNOSTICS.FUTURE_BINDING);

  const facet = artifactsByClass.get("gb.registry.facet-property");
  requireCondition(exactSet(facet.facets.map((item) => `${item.id}/${item.revision}/${item.code}`), [
    "gb.facet.host.core/1/HC",
    "gb.facet.agent.core/1/AC",
    "gb.facet.trust-verification.core/1/TC",
    "gb.facet.host.governed-execution/1/HG",
    "gb.facet.agent.governed-execution/1/AG",
  ]), "Facet set is not exact");
  const invariantTokens = uniqueMemberValues(facet.invariantProperties, "token", "invariant properties");
  requireCondition(invariantTokens.length === 54, `Expected 54 invariant properties, found ${invariantTokens.length}`);
  requireCondition(exactSet(invariantTokens, EXPECTED_INVARIANT_PROPERTY_TOKENS), "Invariant property inventory is not exact");
  requireCondition(facet.invariantProperties.every((item) => item.revision === 1 && item.classification === "invariant"), "Invariant property revision or classification changed");
  const narrowableTokens = uniqueMemberValues(facet.capabilityNarrowableProperties, "token", "capability-narrowable properties");
  requireCondition(exactSet(narrowableTokens, ["requester-cancellation-support", "effect-retry-permission", "capability-approval-requirement", "capability-receipt-disposition", "capability-extension-requirements"]), "Capability-narrowable property set is not exact", DIAGNOSTICS.CAPABILITY_PROPERTY_SET);
  requireCondition(facet.capabilityNarrowableProperties.every((item) => item.revision === 1 && item.classification === "capability-narrowable" && exactSet(item.facets, ["HG", "AG"])), "Capability-narrowable scope is not exact", DIAGNOSTICS.CAPABILITY_SCOPE);
  requireCondition(facet.classificationRules.narrowingScope === "exact-capability-key-and-exact-capability-version-only", "Capability narrowing lost exact key/version scope", DIAGNOSTICS.CAPABILITY_SCOPE);
  requireCondition(Object.entries(facet.classificationRules).filter(([key]) => key.startsWith("canWeaken")).every(([, value]) => value === false), "Capability narrowing weakens an applicable floor", DIAGNOSTICS.CAPABILITY_SCOPE);
  const receipt = facet.capabilityNarrowableProperties.find((item) => item.token === "capability-receipt-disposition");
  requireCondition(receipt && exactSet(receipt.values, ["required", "permitted", "prohibited"]) && receipt.optionalIsAlias === false, "Receipt disposition set is not exact", DIAGNOSTICS.RECEIPT_VALUE);
  requireCondition(receipt.stricterRequirementSources.length === 5 && receipt.conflictFailure.includes("REQ-VERS-0013"), "Receipt no-waiver conflict rule is incomplete", DIAGNOSTICS.RECEIPT_NO_WAIVER);
  const deterministic = facet.invariantProperties.find((item) => item.token === "deterministic-release-negotiation");
  requireCondition(deterministic && exactSet(deterministic.facets, ["HC", "AC"]) && !deterministic.facets.includes("TC"), "Trust Core participates in bilateral negotiation", DIAGNOSTICS.TRUST_NEGOTIATION);
  requireCondition(facet.releaseSelectionRoles.trustCoreBilateralSelector === false && facet.releaseSelectionRoles.trustCoreFallbackAuthority === false, "Trust Core gained selection or fallback authority", DIAGNOSTICS.TRUST_NEGOTIATION);
  requireCondition(facet.approvalRoleAssignments.decisionIssuer === "eligible Approver only" && facet.approvalRoleAssignments.approvalLifecycleOwner.startsWith("Agent"), "Approval role separation changed");

  const core = artifactsByClass.get("gb.registry.core-capability-allocation");
  requireCondition(Array.isArray(core.capabilityAllocations) && core.capabilityAllocations.length === 0 && core.implicitAllocationAllowed === false, "Core allocation is not explicit empty", DIAGNOSTICS.CORE_NONEMPTY);

  const external = artifactsByClass.get("gb.registry.external-capability-eligibility");
  requireCondition(external.eligibilityRules.length === 13, "External eligibility rule inventory is incomplete");
  requireCondition(external.namespaceAuthority.collisionPrevention === true && Object.entries(external.namespaceAuthority).filter(([key]) => key !== "collisionPrevention").every(([, value]) => value === false), "External namespace grants authority", DIAGNOSTICS.NAMESPACE_ESCALATION);
  requireCondition(external.historicalResolution.exactImmutableContractEvidence === true && Object.entries(external.historicalResolution).filter(([key]) => key !== "exactImmutableContractEvidence").every(([, value]) => value === false), "External history permits mutable substitution", DIAGNOSTICS.MUTABLE_HISTORY);

  const global = artifactsByClass.get("gb.registry.global-feature-allocation");
  for (const property of ["globalFeatureAllocations", "featureToProfileRelationships", "featureToCapabilityRelationships", "otherGlobalRelationships"]) {
    requireCondition(Array.isArray(global[property]) && global[property].length === 0, `Global set is not explicit empty: ${property}`, DIAGNOSTICS.GLOBAL_NONEMPTY);
  }
  requireCondition(global.inferenceAllowed === false, "Global allocation inference is enabled", DIAGNOSTICS.GLOBAL_NONEMPTY);

  const authentication = artifactsByClass.get("gb.registry.authentication-profile");
  requireCondition(exactSet(authentication.profiles.map((item) => `${item.id}/${item.revision}`), ["gb.auth.signed-request-pop/1", "gb.auth.none-test-fixture/1"]), "Authentication profile set is not exact");
  const signed = authentication.profiles.find((item) => item.id === "gb.auth.signed-request-pop");
  const none = authentication.profiles.find((item) => item.id === "gb.auth.none-test-fixture");
  requireCondition(signed.eligible === false && signed.implementationQualificationIsEligibilityCondition === false && signed.eligibilityRequires.length === 5, "Signed request PoP eligibility boundary changed");
  requireCondition(signed.securityBounds.credentialMaximumValiditySeconds === 86400 && signed.securityBounds.requestProofLifetimeSeconds === 60 && signed.securityBounds.requestProofMaximumAgeSeconds === 60 && signed.securityBounds.expiry === "exclusive" && signed.securityBounds.gracePeriodSeconds === 0, "Authentication security bounds changed");
  requireCondition(signed.prohibitedFallbacks.length === 6, "Authentication fallback inventory is incomplete", DIAGNOSTICS.AUTH_FALLBACK);
  requireCondition(none.production === false && none.eligible === false && Object.entries(none).filter(([key]) => key.startsWith("can") || key === "productionDefault" || key === "productionFallback").every(([, value]) => value === false), "Fixture none gained production authority", DIAGNOSTICS.FIXTURE_NONE_PRODUCTION);

  return {
    sourceDimensionCount: dimensionIds.length,
    directionalBindingCount: bindingIds.length,
    facetCount: facet.facets.length,
    invariantPropertyCount: invariantTokens.length,
    capabilityNarrowablePropertyCount: narrowableTokens.length,
    authenticationProfileCount: authentication.profiles.length,
    semanticCheckCount: RELEASE_DATA_SEMANTIC_CHECK_IDS.length,
  };
}

export function authorizeSourceClaim(sourceRegistry, dimensionId, source, present) {
  if (sourceRegistry.derivedOnlyDimensions.includes(dimensionId)) {
    releaseDataFail(DIAGNOSTICS.DERIVED_SOURCE_CLAIM, `Derived-only value cannot be source-authored: ${dimensionId}`);
  }
  const dimension = sourceRegistry.dimensions.find((item) => item.id === dimensionId);
  if (!dimension) releaseDataFail(DIAGNOSTICS.SOURCE_UNAUTHORIZED_CLAIM, `Unknown source-claim dimension: ${dimensionId}`);
  const claim = dimension.authorizedClaims.find((item) => item.source === source);
  if (!claim) releaseDataFail(DIAGNOSTICS.SOURCE_UNAUTHORIZED_CLAIM, `Source is unauthorized for dimension: ${source}/${dimensionId}`);
  if (!present && claim.presence === "R") releaseDataFail(DIAGNOSTICS.SOURCE_REQUIRED_CLAIM, `Required applicable claim is absent: ${source}/${dimensionId}`);
  return !present && claim.presence === "P" ? DIAGNOSTICS.SOURCE_OPTIONAL_ABSENCE : "RDA_SOURCE_CLAIM_ACCEPTED";
}

export function classifyFacetProperty(facetRegistry, token) {
  const invariant = facetRegistry.invariantProperties.find((item) => item.token === token);
  if (invariant) return invariant.classification;
  const narrowable = facetRegistry.capabilityNarrowableProperties.find((item) => item.token === token);
  if (narrowable) return narrowable.classification;
  releaseDataFail(DIAGNOSTICS.UNKNOWN_PROPERTY, `Unknown property fails as invariant: ${token}`);
}

export function validateCapabilityNarrowing(facetRegistry, candidate) {
  if (!candidate || typeof candidate.capabilityKey !== "string" || !Number.isInteger(candidate.capabilityVersion)) {
    releaseDataFail(DIAGNOSTICS.CAPABILITY_SCOPE, "Capability narrowing requires one exact key and exact version");
  }
  if (classifyFacetProperty(facetRegistry, candidate.propertyToken) !== "capability-narrowable") {
    releaseDataFail(DIAGNOSTICS.CAPABILITY_SCOPE, `Invariant property cannot be capability-narrowed: ${candidate.propertyToken}`);
  }
  return "RDA_CAPABILITY_NARROWING_ACCEPTED";
}

export function evaluateReceiptDisposition(candidate) {
  if (!candidate || !["required", "permitted", "prohibited"].includes(candidate.disposition)) {
    releaseDataFail(DIAGNOSTICS.RECEIPT_VALUE, `Invalid Receipt disposition: ${String(candidate?.disposition)}`);
  }
  if (candidate.stricterRequirement === "required" && candidate.disposition !== "required") {
    releaseDataFail(DIAGNOSTICS.RECEIPT_NO_WAIVER, "Capability-local Receipt disposition conflicts with a stricter applicable requirement");
  }
  return "RDA_RECEIPT_DISPOSITION_ACCEPTED";
}
