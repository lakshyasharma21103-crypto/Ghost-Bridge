export const PROTOCOL_RELEASE = "ghostbridge/e1.r0-draft.1";
export const RELEASE_MANIFEST_PATH = "protocol/registries/e1.r0-draft.1/release-registry.json";
export const RELEASE_MANIFEST_SCHEMA_ID = "urn:uuid:927bbd7a-e229-440d-95f1-6ff0ebefe716";
export const RELEASE_SOURCE_PATH = "protocol/schema-validation/release-data/e1.r0-draft.1.source.json";
export const RELEASE_SOURCE_SCHEMA_ID = "urn:uuid:377b6b6b-2c73-4309-9df8-343057a56e41";
export const RELEASE_CONFORMANCE_LOCK_PATH = "protocol/schema-validation/release-data/e1.r0-draft.1.conformance-lock.json";
export const RELEASE_FIXTURE_PATH = "protocol/fixtures/wire/e1.r0-draft.1/release-data/corpus.json";
export const RELEASE_FIXTURE_SCHEMA_ID = "urn:uuid:d11fe4f0-85ee-4d0c-9210-778cb3cc4ef9";

export const REGISTRY_DEFINITIONS = Object.freeze([
  Object.freeze({
    registryClass: "gb.registry.source-claim-authority",
    identityField: "sourceClaimAuthorityArtifact",
    schemaId: "urn:uuid:85293782-58f5-4c69-aa5b-830dd8aa480d",
    path: "protocol/registries/e1.r0-draft.1/release-data/source-claim-authority.registry.json",
    logicalName: "SourceClaimAuthorityRegistry",
  }),
  Object.freeze({
    registryClass: "gb.registry.directional-binding",
    identityField: "directionalBindingArtifact",
    schemaId: "urn:uuid:e47a0317-4178-4ad3-8238-4c9aadce1cb2",
    path: "protocol/registries/e1.r0-draft.1/release-data/directional-binding.registry.json",
    logicalName: "DirectionalBindingRegistry",
  }),
  Object.freeze({
    registryClass: "gb.registry.facet-property",
    identityField: "facetPropertyArtifact",
    schemaId: "urn:uuid:876284f1-c7c1-468f-bab6-c679e564c3fe",
    path: "protocol/registries/e1.r0-draft.1/release-data/facet-property.registry.json",
    logicalName: "FacetPropertyRegistry",
  }),
  Object.freeze({
    registryClass: "gb.registry.core-capability-allocation",
    identityField: "coreCapabilityAllocationArtifact",
    schemaId: "urn:uuid:cfe70791-b8f7-48f7-809f-f7c6872c3c46",
    path: "protocol/registries/e1.r0-draft.1/release-data/core-capability-allocation.registry.json",
    logicalName: "CoreCapabilityAllocationRegistry",
  }),
  Object.freeze({
    registryClass: "gb.registry.external-capability-eligibility",
    identityField: "externalCapabilityEligibilityArtifact",
    schemaId: "urn:uuid:f901bb9f-46b5-4b04-a2cd-4185e43f560e",
    path: "protocol/registries/e1.r0-draft.1/release-data/external-capability-eligibility.registry.json",
    logicalName: "ExternalCapabilityEligibilityRegistry",
  }),
  Object.freeze({
    registryClass: "gb.registry.global-feature-allocation",
    identityField: "globalFeatureAllocationArtifact",
    schemaId: "urn:uuid:001a31f0-2190-43f8-988d-8d3055450d28",
    path: "protocol/registries/e1.r0-draft.1/release-data/global-feature-allocation.registry.json",
    logicalName: "GlobalFeatureAllocationRegistry",
  }),
  Object.freeze({
    registryClass: "gb.registry.authentication-profile",
    identityField: "authenticationProfileArtifact",
    schemaId: "urn:uuid:9feb2499-b6f5-4b4b-875a-d6b65b861e3c",
    path: "protocol/registries/e1.r0-draft.1/release-data/authentication-profile.registry.json",
    logicalName: "AuthenticationProfileRegistry",
  }),
]);

export const REGISTRY_CLASS_SET = Object.freeze(REGISTRY_DEFINITIONS.map((item) => item.registryClass).toSorted());
export const REGISTRY_BY_CLASS = new Map(REGISTRY_DEFINITIONS.map((item) => [item.registryClass, item]));

export const EXPECTED_SOURCE_DIMENSION_IDS = Object.freeze([
  "agent-identity", "passport-identity", "passport-version", "passport-issuer-identity", "grant-issuer-identity",
  "client-host-participant-supported-release-set", "client-host-local-preferred-release", "agent-participant-supported-release-set", "agent-local-preferred-release",
  "current-deployed-release-availability", "offer-release-bound", "grant-release-bound", "consent-envelope-permitted-release-set", "release-policy-status-security-narrowing",
  "grant-organization-scope-binding", "organization-restriction", "grant-tagged-workspace-scope-binding", "workspace-restriction", "host-participant-identity",
  "host-audience-applicability-requirement", "authenticated-principal", "purpose-bound-agent-resource-target", "network-origin",
  "profile-identity-support-ceiling", "profile-current-deployment-availability", "offer-profile-subset-restriction", "grant-profile-subset-restriction", "host-required-profile",
  "host-optional-profile-interest", "consent-permitted-profile-subset", "profile-policy-narrowing", "facet-identity-claim", "facet-current-deployment-availability",
  "offer-facet-restriction", "grant-facet-restriction", "host-required-facet", "host-optional-facet-interest", "consent-permitted-facet-subset", "facet-policy-narrowing",
  "capability-key-ceiling", "capability-version-ceiling", "immutable-external-contract-reference", "current-deployed-capability-availability", "offer-capability-subset-restrictions",
  "grant-capability-subset-restrictions", "host-required-capability", "host-optional-capability-interest", "host-capability-preference", "capability-restrictions-limits",
  "capability-risk-classification", "capability-effect-classification", "capability-current-availability", "capability-required-host-conditions",
  "capability-optional-host-conditions-preferences", "capability-consent-permission", "capability-policy-narrowing-denial",
  "passport-manifest-authentication-profile-support-ceiling", "discovery-current-deployed-profile-support", "offer-transaction-profile-subset-restriction",
  "grant-transaction-profile-ceiling-restriction", "host-profile-requirement", "host-exact-profile-selection", "consent-permission-for-selected-profile",
  "authentication-policy-narrowing-denial", "extension-support-ceiling", "extension-current-availability", "offer-extension-restriction", "grant-extension-restriction",
  "host-required-extension", "host-optional-extension-interest", "consent-permitted-extension-set", "extension-policy-narrowing", "experiment-support",
  "host-experiment-request", "experiment-consent", "experiment-policy-denial-narrowing", "bounded-trust-verification-result", "offer-restriction",
  "grant-restriction", "consent-restriction", "deployment-policy-restriction",
]);

export const EXPECTED_DIRECTIONAL_BINDING_IDS = Object.freeze([
  "passport-to-agent-identity", "passport-issuer-to-passport", "discovery-to-agent-origin-release-record", "grant-issuer-to-grant", "grant-to-scope",
  "offer-to-transaction", "host-metadata-to-host-release", "authentication-evidence-to-result", "trust-reference-to-result-input", "source-claims-to-candidate",
  "host-auth-selection-to-derived-set", "target-to-origin", "organization-to-workspace", "profile-to-facet", "capability-key-version-contract",
  "extension-to-dependencies", "validated-inputs-to-selected-release", "selected-release-to-negotiated-result", "negotiated-result-to-redemption-intent",
  "redemption-intent-to-connection",
]);

export const EXPECTED_INVARIANT_PROPERTY_TOKENS = Object.freeze([
  "release-identity-and-status", "participant-release-support", "deterministic-release-negotiation", "immutable-negotiated-result", "facet-claim-boundary",
  "source-claim-intersection", "discovery-observation", "lifecycle-ordering", "installation-redemption", "connection-authority-lifecycle", "authorization-floor",
  "compatibility-identity", "compatibility-evolution", "extension-openness", "extension-selection", "transport-origin-routing", "transport-http-envelope",
  "transport-retry-time-budget", "transport-parser-resource-limits", "transport-intermediary-boundary", "error-outcome-separation", "error-precedence-and-privacy",
  "security-floor", "privacy-minimization", "authentication-authority-separation", "authentication-profile-selection", "authentication-production-floor",
  "authentication-result-binding", "principal-audience-binding", "credential-reference-safety", "current-request-proof", "authentication-lifecycle",
  "authentication-failure-boundary", "trust-result-consumption", "trust-verification", "trust-continuity-history", "trust-key-revocation", "invocation-admission",
  "approval-concept-separation", "approval-challenge-issuance", "approval-decision-integrity", "approval-action-binding", "approval-authority-lifecycle",
  "approval-consumption", "approval-history", "task-admission-and-birth", "task-state-lifecycle", "result-terminal-truth", "task-history-recovery",
  "receipt-policy", "receipt-semantic-integrity", "receipt-proof-eligibility", "receipt-verification", "governed-extension-boundary",
]);

export const DIAGNOSTICS = Object.freeze({
  MANIFEST_SCHEMA: "RDA_MANIFEST_SCHEMA",
  MISSING_CLASS: "RDA_MANIFEST_MISSING_CLASS",
  UNKNOWN_CLASS: "RDA_MANIFEST_UNKNOWN_CLASS",
  DUPLICATE_CLASS: "RDA_MANIFEST_DUPLICATE_CLASS",
  WRONG_RELEASE: "RDA_WRONG_RELEASE",
  WRONG_ARTIFACT_IDENTITY: "RDA_WRONG_ARTIFACT_IDENTITY",
  WRONG_INTEGRITY_REFERENCE: "RDA_WRONG_INTEGRITY_REFERENCE",
  WRONG_INTEGRITY_SHA256: "RDA_WRONG_INTEGRITY_SHA256",
  WRONG_INTEGRITY_BYTE_LENGTH: "RDA_WRONG_INTEGRITY_BYTE_LENGTH",
  CLASS_MISMATCH: "RDA_CLASS_MISMATCH",
  MULTIPLY_REFERENCED: "RDA_ARTIFACT_MULTIPLY_REFERENCED",
  UNREFERENCED_ARTIFACT: "RDA_UNREFERENCED_ARTIFACT",
  INVALID_CONTENT: "RDA_INVALID_REGISTRY_CONTENT",
  PARTIAL_LOAD: "RDA_NON_ATOMIC_PARTIAL_LOAD",
  SOURCE_REQUIRED_CLAIM: "RDA_SOURCE_REQUIRED_CLAIM",
  SOURCE_UNAUTHORIZED_CLAIM: "RDA_SOURCE_UNAUTHORIZED_CLAIM",
  SOURCE_OPTIONAL_ABSENCE: "RDA_OPTIONAL_ABSENCE_NO_CLAIM",
  SOURCE_DUPLICATE_CLAIM: "RDA_SOURCE_DUPLICATE_CLAIM",
  HOST_CONTEXT_AUTHORITY: "RDA_HOST_CONTEXT_AUTHORITY",
  GRANT_IDENTITY_ESCALATION: "RDA_GRANT_BINDING_IDENTITY_ESCALATION",
  DERIVED_SOURCE_CLAIM: "RDA_DERIVED_VALUE_SOURCE_CLAIM",
  TRUST_REFERENCE_VALIDITY: "RDA_TRUST_REFERENCE_VALIDITY",
  TRUST_NEGOTIATION: "RDA_TRUST_CORE_NEGOTIATION",
  UNKNOWN_PROPERTY: "RDA_UNKNOWN_PROPERTY",
  CAPABILITY_PROPERTY_SET: "RDA_CAPABILITY_PROPERTY_EXACT_SET",
  CAPABILITY_SCOPE: "RDA_CAPABILITY_NARROWING_SCOPE",
  RECEIPT_VALUE: "RDA_RECEIPT_DISPOSITION_VALUE",
  RECEIPT_NO_WAIVER: "RDA_RECEIPT_NO_WAIVER",
  CORE_NONEMPTY: "RDA_CORE_ALLOCATION_NONEMPTY",
  GLOBAL_NONEMPTY: "RDA_GLOBAL_ALLOCATION_NONEMPTY",
  NAMESPACE_ESCALATION: "RDA_NAMESPACE_AUTHORITY_ESCALATION",
  EXTERNAL_ELIGIBILITY: "RDA_EXTERNAL_ELIGIBILITY_EXACTNESS",
  AUTH_FALLBACK: "RDA_AUTHENTICATION_FALLBACK",
  FIXTURE_NONE_PRODUCTION: "RDA_FIXTURE_NONE_PRODUCTION",
  MUTABLE_HISTORY: "RDA_MUTABLE_HISTORICAL_SUBSTITUTION",
  FUTURE_BINDING: "RDA_FUTURE_OR_CIRCULAR_BINDING",
  SEMANTIC_LOCK: "RDA_SEMANTIC_CONFORMANCE_LOCK",
  SEMANTIC_CHECK_COVERAGE: "RDA_SEMANTIC_CHECK_COVERAGE",
  GENERATOR_PREFLIGHT: "RDA_GENERATOR_PREFLIGHT",
  GENERATOR_CURRENT_STATE: "RDA_GENERATOR_CURRENT_STATE",
  GENERATOR_REPLACEMENT: "RDA_GENERATOR_REPLACEMENT",
});
