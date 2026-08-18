import { releaseDataFail } from "./errors.mjs";
import {
  DIAGNOSTICS,
  EXPECTED_DIRECTIONAL_BINDING_IDS,
  EXPECTED_INVARIANT_PROPERTY_TOKENS,
  EXPECTED_SOURCE_DIMENSION_IDS,
  PROTOCOL_RELEASE,
  REGISTRY_BY_CLASS,
  REGISTRY_CLASS_SET,
} from "./release-data-constants.mjs";
import { canonicalBase64url, sha256Base64url } from "./semantic-checks.mjs";

const CAPABILITY_LOCAL_NAME = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/;
const CAPABILITY_NAMESPACE_IDENTITY = /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CAPABILITY_VERSION = /^[a-z](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

function exactSet(actual, expected) {
  const left = [...actual].toSorted();
  const right = [...expected].toSorted();
  return left.length === new Set(left).size && JSON.stringify(left) === JSON.stringify(right);
}

function exactObjectKeys(value, expected) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && exactSet(Object.keys(value), expected);
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

function artifact(context, registryClass) {
  return context.artifactsByClass.get(registryClass);
}

export function isCapabilityKey(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.name !== "string" || !CAPABILITY_LOCAL_NAME.test(value.name)) return false;
  if (value.namespaceClass === "core") return exactObjectKeys(value, ["namespaceClass", "name"]);
  if (value.namespaceClass === "external") {
    return exactObjectKeys(value, ["namespaceClass", "namespace", "name"])
      && typeof value.namespace === "string"
      && CAPABILITY_NAMESPACE_IDENTITY.test(value.namespace);
  }
  return false;
}

export function isCapabilityVersion(value) {
  return typeof value === "string" && CAPABILITY_VERSION.test(value);
}

export function capabilityKeysEqual(left, right) {
  if (!isCapabilityKey(left) || !isCapabilityKey(right) || left.namespaceClass !== right.namespaceClass || left.name !== right.name) return false;
  return left.namespaceClass === "core" || left.namespace === right.namespace;
}

export function capabilityScopesEqual(left, right) {
  return Boolean(left && right)
    && capabilityKeysEqual(left.capabilityKey, right.capabilityKey)
    && isCapabilityVersion(left.capabilityVersion)
    && isCapabilityVersion(right.capabilityVersion)
    && left.capabilityVersion === right.capabilityVersion;
}

export function checkAtomicSourceAuthority(context) {
  const source = artifact(context, "gb.registry.source-claim-authority");
  const dimensionIds = uniqueMemberValues(source.dimensions, "id", "source dimensions");
  requireCondition(dimensionIds.length === 81, `Expected 81 atomic source dimensions, found ${dimensionIds.length}`);
  const dimensions = new Map(source.dimensions.map((item) => [item.id, item]));
  for (const dimension of source.dimensions) {
    const claimSources = dimension.authorizedClaims.map((item) => item?.source);
    requireCondition(claimSources.every((value) => typeof value === "string"), `Authorized claim has invalid source: ${dimension.id}`);
    requireCondition(new Set(claimSources).size === claimSources.length, `Duplicate source claim for dimension: ${dimension.id}`, DIAGNOSTICS.SOURCE_DUPLICATE_CLAIM);
  }
  for (const [dimensionId, expectedSource] of [
    ["client-host-local-preferred-release", "Client participant metadata"],
    ["agent-local-preferred-release", "Agent participant metadata"],
  ]) {
    const dimension = dimensions.get(dimensionId);
    requireCondition(dimension?.authorizedClaims?.length === 1, `Preferred-release dimension is malformed: ${dimensionId}`, DIAGNOSTICS.SOURCE_REQUIRED_CLAIM);
    requireCondition(dimension.authorizedClaims[0].source === expectedSource && dimension.authorizedClaims[0].presence === "R", `Preferred-release claim is not required participant-owned consistency evidence: ${dimensionId}`, DIAGNOSTICS.SOURCE_REQUIRED_CLAIM);
  }
  requireCondition(exactSet(source.requiredConsistencyDimensions, ["client-host-local-preferred-release", "agent-local-preferred-release"]), "Preferred-release consistency dimension set is not exact", DIAGNOSTICS.SOURCE_REQUIRED_CLAIM);
  const requiredHostConditions = dimensions.get("capability-required-host-conditions");
  requireCondition(!requiredHostConditions.authorizedClaims.some((item) => item.source === "Host"), "Host context supply became required-condition claim authority", DIAGNOSTICS.HOST_CONTEXT_AUTHORITY);
  requireCondition(Array.isArray(source.contextSupplyObligations) && source.contextSupplyObligations.length === 1, "Host context-supply obligation is not represented separately", DIAGNOSTICS.HOST_CONTEXT_AUTHORITY);
  const hostContext = source.contextSupplyObligations[0];
  requireCondition(hostContext.dimensionId === "capability-required-host-conditions"
    && hostContext.supplier === "Host"
    && hostContext.applicability === "where-applicable"
    && hostContext.meaning === "supplies matching context where applicable"
    && hostContext.authorizesClaim === false,
  "Host context-supply obligation changed or grants claim authority", DIAGNOSTICS.HOST_CONTEXT_AUTHORITY);
  for (const derived of ["final-selected-release", "final-common-authentication-eligible-set", "complete-negotiated-result", "complete-redemption-intent", "connection-authority"]) {
    requireCondition(source.derivedOnlyDimensions.includes(derived), `Missing derived-only dimension: ${derived}`, DIAGNOSTICS.DERIVED_SOURCE_CLAIM);
    requireCondition(!dimensions.has(derived), `Derived-only value is source-authored: ${derived}`, DIAGNOSTICS.DERIVED_SOURCE_CLAIM);
  }
  requireCondition(!dimensionIds.includes("trust-evidence-reference"), "Generic Trust-reference source authority is prohibited", DIAGNOSTICS.TRUST_REFERENCE_VALIDITY);
  requireCondition(dimensions.has("grant-organization-scope-binding") && !dimensions.has("organization-identity-authority"), "Grant organization binding became identity authority", DIAGNOSTICS.GRANT_IDENTITY_ESCALATION);
  requireCondition(dimensions.has("grant-tagged-workspace-scope-binding") && !dimensions.has("workspace-identity-authority"), "Grant Workspace binding became identity authority", DIAGNOSTICS.GRANT_IDENTITY_ESCALATION);
  requireCondition(exactSet(dimensionIds, EXPECTED_SOURCE_DIMENSION_IDS), "Atomic source-dimension inventory is not exact");
  context.metrics.sourceDimensionCount = dimensionIds.length;
}

export function checkAuthenticationProfiles(context) {
  const authentication = artifact(context, "gb.registry.authentication-profile");
  requireCondition(exactSet(authentication.profiles.map((item) => `${item.id}/${item.revision}`), ["gb.auth.signed-request-pop/1", "gb.auth.none-test-fixture/1"]), "Authentication profile set is not exact");
  const signed = authentication.profiles.find((item) => item.id === "gb.auth.signed-request-pop");
  const none = authentication.profiles.find((item) => item.id === "gb.auth.none-test-fixture");
  requireCondition(signed.eligible === false && signed.implementationQualificationIsEligibilityCondition === false && signed.eligibilityRequires.length === 5, "Signed request PoP eligibility boundary changed");
  requireCondition(signed.securityBounds.credentialMaximumValiditySeconds === 86400 && signed.securityBounds.requestProofLifetimeSeconds === 60 && signed.securityBounds.requestProofMaximumAgeSeconds === 60 && signed.securityBounds.expiry === "exclusive" && signed.securityBounds.gracePeriodSeconds === 0, "Authentication security bounds changed");
  requireCondition(signed.prohibitedFallbacks.length === 6, "Authentication fallback inventory is incomplete", DIAGNOSTICS.AUTH_FALLBACK);
  requireCondition(none.production === false && none.eligible === false && Object.entries(none).filter(([key]) => key.startsWith("can") || key === "productionDefault" || key === "productionFallback").every(([, value]) => value === false), "Fixture none gained production authority", DIAGNOSTICS.FIXTURE_NONE_PRODUCTION);
  context.metrics.authenticationProfileCount = authentication.profiles.length;
}

export function checkCapabilityNarrowing(context) {
  const facet = artifact(context, "gb.registry.facet-property");
  const narrowableTokens = uniqueMemberValues(facet.capabilityNarrowableProperties, "token", "capability-narrowable properties");
  requireCondition(exactSet(narrowableTokens, ["requester-cancellation-support", "effect-retry-permission", "capability-approval-requirement", "capability-receipt-disposition", "capability-extension-requirements"]), "Capability-narrowable property set is not exact", DIAGNOSTICS.CAPABILITY_PROPERTY_SET);
  requireCondition(facet.capabilityNarrowableProperties.every((item) => item.revision === 1 && item.classification === "capability-narrowable" && exactSet(item.facets, ["HG", "AG"])), "Capability-narrowable scope is not exact", DIAGNOSTICS.CAPABILITY_SCOPE);
  requireCondition(facet.classificationRules.narrowingScope === "exact-capability-key-and-exact-capability-version-only", "Capability narrowing lost exact key/version scope", DIAGNOSTICS.CAPABILITY_SCOPE);
  requireCondition(Object.entries(facet.classificationRules).filter(([key]) => key.startsWith("canWeaken")).every(([, value]) => value === false), "Capability narrowing weakens an applicable floor", DIAGNOSTICS.CAPABILITY_SCOPE);
  context.metrics.capabilityNarrowablePropertyCount = narrowableTokens.length;
}

export function checkCoreExplicitEmpty(context) {
  const core = artifact(context, "gb.registry.core-capability-allocation");
  requireCondition(Array.isArray(core.capabilityAllocations) && core.capabilityAllocations.length === 0 && core.implicitAllocationAllowed === false, "Core allocation is not explicit empty", DIAGNOSTICS.CORE_NONEMPTY);
}

export function checkDirectionalBindings(context) {
  const directional = artifact(context, "gb.registry.directional-binding");
  const bindingIds = uniqueMemberValues(directional.bindings, "id", "directional bindings");
  requireCondition(bindingIds.length === 20, `Expected 20 directional bindings, found ${bindingIds.length}`);
  requireCondition(exactSet(bindingIds, EXPECTED_DIRECTIONAL_BINDING_IDS), "Directional-binding inventory is not exact");
  requireCondition(exactSet(directional.dependencyOrder, ["validated-inputs", "deterministic-negotiated-result", "complete-redemption-intent", "atomic-connection-commit"]), "Directional dependency inventory changed", DIAGNOSTICS.FUTURE_BINDING);
  requireCondition(JSON.stringify(directional.dependencyOrder) === JSON.stringify(["validated-inputs", "deterministic-negotiated-result", "complete-redemption-intent", "atomic-connection-commit"]), "Directional dependency order changed", DIAGNOSTICS.FUTURE_BINDING);
  requireCondition(directional.prohibitedFutureBindings.length === 5 && directional.offerIssuerAsserted === false, "Future binding or Offer issuer authority was introduced", DIAGNOSTICS.FUTURE_BINDING);
  context.metrics.directionalBindingCount = bindingIds.length;
}

export function checkExternalEligibility(context) {
  const external = artifact(context, "gb.registry.external-capability-eligibility");
  requireCondition(external.eligibilityRules.length === 13, "External eligibility rule inventory is incomplete");
  const orders = external.eligibilityRules.map((item) => item.order);
  requireCondition(new Set(orders).size === 13 && JSON.stringify(orders) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]), "External eligibility order is not the exact sequence 1..13", DIAGNOSTICS.EXTERNAL_ELIGIBILITY);
  requireCondition(external.namespaceAuthority.collisionPrevention === true && Object.entries(external.namespaceAuthority).filter(([key]) => key !== "collisionPrevention").every(([, value]) => value === false), "External namespace grants authority", DIAGNOSTICS.NAMESPACE_ESCALATION);
}

export function checkFacetPropertyInventory(context) {
  const facet = artifact(context, "gb.registry.facet-property");
  requireCondition(exactSet(facet.facets.map((item) => `${item.id}/${item.revision}/${item.code}`), [
    "gb.facet.host.core/1/HC", "gb.facet.agent.core/1/AC", "gb.facet.trust-verification.core/1/TC", "gb.facet.host.governed-execution/1/HG", "gb.facet.agent.governed-execution/1/AG",
  ]), "Facet set is not exact");
  const invariantTokens = uniqueMemberValues(facet.invariantProperties, "token", "invariant properties");
  requireCondition(invariantTokens.length === 54, `Expected 54 invariant properties, found ${invariantTokens.length}`);
  requireCondition(exactSet(invariantTokens, EXPECTED_INVARIANT_PROPERTY_TOKENS), "Invariant property inventory is not exact");
  requireCondition(facet.invariantProperties.every((item) => item.revision === 1 && item.classification === "invariant"), "Invariant property revision or classification changed");
  context.metrics.facetCount = facet.facets.length;
  context.metrics.invariantPropertyCount = invariantTokens.length;
}

export function checkGlobalExplicitEmpty(context) {
  const global = artifact(context, "gb.registry.global-feature-allocation");
  for (const property of ["globalFeatureAllocations", "featureToProfileRelationships", "featureToCapabilityRelationships", "otherGlobalRelationships"]) {
    requireCondition(Array.isArray(global[property]) && global[property].length === 0, `Global set is not explicit empty: ${property}`, DIAGNOSTICS.GLOBAL_NONEMPTY);
  }
  requireCondition(global.inferenceAllowed === false, "Global allocation inference is enabled", DIAGNOSTICS.GLOBAL_NONEMPTY);
}

export function checkHistoricalImmutability(context) {
  const external = artifact(context, "gb.registry.external-capability-eligibility");
  requireCondition(external.historicalResolution.exactImmutableContractEvidence === true && Object.entries(external.historicalResolution).filter(([key]) => key !== "exactImmutableContractEvidence").every(([, value]) => value === false), "External history permits mutable substitution", DIAGNOSTICS.MUTABLE_HISTORY);
}

export function checkManifestAtomicity(context) {
  requireCondition(exactSet(context.artifactsByClass.keys(), REGISTRY_CLASS_SET), "Release-data semantic class set is incomplete", DIAGNOSTICS.PARTIAL_LOAD);
  if (!context.bundle) return;
  const entries = context.bundle.manifest?.registryArtifacts;
  requireCondition(Array.isArray(entries) && entries.length === 7 && exactSet(entries.map((entry) => entry.registryClass), REGISTRY_CLASS_SET), "Release-data manifest is not the exact seven-class set", DIAGNOSTICS.MANIFEST_SCHEMA);
  requireCondition(context.bundle.artifactRecords instanceof Map && context.bundle.artifactRecords.size === 7, "Release-data artifact load is not atomic", DIAGNOSTICS.PARTIAL_LOAD);
}

export function checkReceiptDisposition(context) {
  const facet = artifact(context, "gb.registry.facet-property");
  const receipt = facet.capabilityNarrowableProperties.find((item) => item.token === "capability-receipt-disposition");
  requireCondition(receipt && exactSet(receipt.values, ["required", "permitted", "prohibited"]) && receipt.optionalIsAlias === false, "Receipt disposition set is not exact", DIAGNOSTICS.RECEIPT_VALUE);
  requireCondition(receipt.stricterRequirementSources.length === 5 && receipt.conflictFailure.includes("REQ-VERS-0013"), "Receipt no-waiver conflict rule is incomplete", DIAGNOSTICS.RECEIPT_NO_WAIVER);
}

export function checkRoleSeparation(context) {
  const facet = artifact(context, "gb.registry.facet-property");
  requireCondition(facet.approvalRoleAssignments.decisionIssuer === "eligible Approver only" && facet.approvalRoleAssignments.approvalLifecycleOwner.startsWith("Agent"), "Approval role separation changed");
}

export function checkTypedArtifactBinding(context) {
  for (const registryClass of REGISTRY_CLASS_SET) {
    const value = artifact(context, registryClass);
    const definition = REGISTRY_BY_CLASS.get(registryClass);
    requireCondition(value?.registryClass === registryClass && value?.protocolRelease === PROTOCOL_RELEASE && value?.artifactSchema === definition.schemaId && typeof value?.[definition.identityField] === "string", `Typed artifact binding changed: ${registryClass}`, DIAGNOSTICS.WRONG_ARTIFACT_IDENTITY);
    if (!context.bundle) continue;
    const entry = context.bundle.manifest.registryArtifacts.find((item) => item.registryClass === registryClass);
    requireCondition(entry?.path === definition.path && entry?.[definition.identityField] === value[definition.identityField], `Manifest typed artifact binding changed: ${registryClass}`, DIAGNOSTICS.WRONG_ARTIFACT_IDENTITY);
  }
}

export function checkTrustNegotiationSeparation(context) {
  const facet = artifact(context, "gb.registry.facet-property");
  const deterministic = facet.invariantProperties.find((item) => item.token === "deterministic-release-negotiation");
  requireCondition(deterministic && exactSet(deterministic.facets, ["HC", "AC"]) && !deterministic.facets.includes("TC"), "Trust Core participates in bilateral negotiation", DIAGNOSTICS.TRUST_NEGOTIATION);
  requireCondition(facet.releaseSelectionRoles.trustCoreBilateralSelector === false && facet.releaseSelectionRoles.trustCoreFallbackAuthority === false, "Trust Core gained selection or fallback authority", DIAGNOSTICS.TRUST_NEGOTIATION);
}

export function checkExactByteIntegrity(context) {
  if (!context.bundle) return;
  for (const entry of context.bundle.manifest.registryArtifacts) {
    const bytes = context.bundle.artifactRecords.get(entry.path)?.bytes;
    const integrity = entry.artifactByteIntegrity;
    requireCondition(Buffer.isBuffer(bytes) && integrity?.algorithm === "sha-256" && canonicalBase64url(integrity.value, 32, 32), `Exact-byte evidence is unavailable: ${entry.registryClass}`, DIAGNOSTICS.WRONG_INTEGRITY_REFERENCE);
    requireCondition(bytes.byteLength === integrity.byteLength, `Artifact byte length mismatch: ${entry.registryClass}`, DIAGNOSTICS.WRONG_INTEGRITY_BYTE_LENGTH);
    requireCondition(sha256Base64url(bytes) === integrity.value, `Artifact SHA-256 mismatch: ${entry.registryClass}`, DIAGNOSTICS.WRONG_INTEGRITY_SHA256);
  }
}

export const RELEASE_DATA_SEMANTIC_CHECKERS = Object.freeze([
  Object.freeze({ id: "RDA-SEM-ATOMIC-SOURCE-AUTHORITY", check: checkAtomicSourceAuthority }),
  Object.freeze({ id: "RDA-SEM-AUTHENTICATION-PROFILES", check: checkAuthenticationProfiles }),
  Object.freeze({ id: "RDA-SEM-CAPABILITY-NARROWING", check: checkCapabilityNarrowing }),
  Object.freeze({ id: "RDA-SEM-CORE-EXPLICIT-EMPTY", check: checkCoreExplicitEmpty }),
  Object.freeze({ id: "RDA-SEM-DIRECTIONAL-BINDINGS", check: checkDirectionalBindings }),
  Object.freeze({ id: "RDA-SEM-EXTERNAL-ELIGIBILITY", check: checkExternalEligibility }),
  Object.freeze({ id: "RDA-SEM-FACET-PROPERTY-INVENTORY", check: checkFacetPropertyInventory }),
  Object.freeze({ id: "RDA-SEM-GLOBAL-EXPLICIT-EMPTY", check: checkGlobalExplicitEmpty }),
  Object.freeze({ id: "RDA-SEM-HISTORICAL-IMMUTABILITY", check: checkHistoricalImmutability }),
  Object.freeze({ id: "RDA-SEM-MANIFEST-ATOMICITY", check: checkManifestAtomicity }),
  Object.freeze({ id: "RDA-SEM-RECEIPT-DISPOSITION", check: checkReceiptDisposition }),
  Object.freeze({ id: "RDA-SEM-ROLE-SEPARATION", check: checkRoleSeparation }),
  Object.freeze({ id: "RDA-SEM-TYPED-ARTIFACT-BINDING", check: checkTypedArtifactBinding }),
  Object.freeze({ id: "RDA-SEM-TRUST-NEGOTIATION-SEPARATION", check: checkTrustNegotiationSeparation }),
  Object.freeze({ id: "RDA-SEM-EXACT-BYTE-INTEGRITY", check: checkExactByteIntegrity }),
]);

export function executeReleaseDataSemanticCheckers(context, checkers = RELEASE_DATA_SEMANTIC_CHECKERS) {
  requireCondition(context?.artifactsByClass instanceof Map, "Release-data semantic input must be a class map");
  const registeredIds = checkers.map((item) => item?.id);
  requireCondition(registeredIds.every((id) => typeof id === "string") && new Set(registeredIds).size === registeredIds.length, "Semantic checker registry has duplicate or invalid IDs", DIAGNOSTICS.SEMANTIC_CHECK_COVERAGE);
  const executedSemanticCheckIds = [];
  for (const registration of checkers) {
    requireCondition(typeof registration.check === "function" && registration.check.name.length > 0, `Semantic checker is not an actual named function: ${String(registration.id)}`, DIAGNOSTICS.SEMANTIC_CHECK_COVERAGE);
    registration.check(context);
    executedSemanticCheckIds.push(registration.id);
  }
  return executedSemanticCheckIds;
}

export function validateReleaseDataSemantics(artifactsByClass, validationContext = undefined) {
  const context = { artifactsByClass, bundle: validationContext?.bundle, metrics: {} };
  const executedSemanticCheckIds = executeReleaseDataSemanticCheckers(context, validationContext?.checkers);
  return { ...context.metrics, semanticCheckCount: executedSemanticCheckIds.length, executedSemanticCheckIds };
}

export function authorizeSourceClaim(sourceRegistry, dimensionId, source, present) {
  if (sourceRegistry.derivedOnlyDimensions.includes(dimensionId)) releaseDataFail(DIAGNOSTICS.DERIVED_SOURCE_CLAIM, `Derived-only value cannot be source-authored: ${dimensionId}`);
  const dimension = sourceRegistry.dimensions.find((item) => item.id === dimensionId);
  if (!dimension) releaseDataFail(DIAGNOSTICS.SOURCE_UNAUTHORIZED_CLAIM, `Unknown source-claim dimension: ${dimensionId}`);
  const claims = dimension.authorizedClaims.filter((item) => item.source === source);
  if (claims.length > 1) releaseDataFail(DIAGNOSTICS.SOURCE_DUPLICATE_CLAIM, `Source occurs more than once for dimension: ${source}/${dimensionId}`);
  const claim = claims[0];
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
  if (!candidate || !isCapabilityKey(candidate.capabilityKey) || !isCapabilityVersion(candidate.capabilityVersion)) {
    releaseDataFail(DIAGNOSTICS.CAPABILITY_SCOPE, "Capability narrowing requires one exact typed CapabilityKey and exact string CapabilityVersion");
  }
  if (classifyFacetProperty(facetRegistry, candidate.propertyToken) !== "capability-narrowable") {
    releaseDataFail(DIAGNOSTICS.CAPABILITY_SCOPE, `Invariant property cannot be capability-narrowed: ${candidate.propertyToken}`);
  }
  return "RDA_CAPABILITY_NARROWING_ACCEPTED";
}

export function evaluateReceiptDisposition(candidate) {
  if (!candidate || !["required", "permitted", "prohibited"].includes(candidate.disposition)) releaseDataFail(DIAGNOSTICS.RECEIPT_VALUE, `Invalid Receipt disposition: ${String(candidate?.disposition)}`);
  if (candidate.stricterRequirement === "required" && candidate.disposition !== "required") releaseDataFail(DIAGNOSTICS.RECEIPT_NO_WAIVER, "Capability-local Receipt disposition conflicts with a stricter applicable requirement");
  return "RDA_RECEIPT_DISPOSITION_ACCEPTED";
}
