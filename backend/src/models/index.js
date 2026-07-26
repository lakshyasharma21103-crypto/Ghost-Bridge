const Partner = require('./Partner');
const AgentPassport = require('./AgentPassport');
const Capability = require('./Capability');
const PassportInstallKey = require('./PassportInstallKey');
const PassportConnection = require('./PassportConnection');
const Credential = require('./Credential');
const Invocation = require('./Invocation');
const InvocationAttempt = require('./InvocationAttempt');
const AuditLog = require('./AuditLog');
const OperationalAlert = require('./OperationalAlert');
const CircuitBreaker = require('./CircuitBreaker');
const RuntimeCapacitySlot = require('./RuntimeCapacitySlot');
const RuntimeWorkItem = require('./RuntimeWorkItem');
const DurableEventOutbox = require('./DurableEventOutbox');
const RuntimeWorkerHeartbeat = require('./RuntimeWorkerHeartbeat');
const Organization = require('./Organization');
const Workspace = require('./Workspace');
const Team = require('./Team');
const EnterpriseUser = require('./EnterpriseUser');
const ServiceAccount = require('./ServiceAccount');
const Role = require('./Role');
const Policy = require('./Policy');
const PolicyRevision = require('./PolicyRevision');
const GovernedSecret = require('./GovernedSecret');
const SecretVersion = require('./SecretVersion');
const CredentialBinding = require('./CredentialBinding');
const CredentialLease = require('./CredentialLease');
const CredentialRotationAttempt = require('./CredentialRotationAttempt');
const EncryptionRewrapJob = require('./EncryptionRewrapJob');
const ApprovalWorkflow = require('./ApprovalWorkflow');
const ApprovalRequest = require('./ApprovalRequest');
const ApprovalDecision = require('./ApprovalDecision');
const ApprovalGrant = require('./ApprovalGrant');
const ComplianceNotification = require('./ComplianceNotification');
const EvidenceEvent = require('./EvidenceEvent');
const AuditChainState = require('./AuditChainState');
const AuditCheckpoint = require('./AuditCheckpoint');
const RetentionPolicy = require('./RetentionPolicy');
const LegalHold = require('./LegalHold');
const EvidenceExport = require('./EvidenceExport');
const LifecycleTransition = require('./LifecycleTransition');
const MaintenanceWindow = require('./MaintenanceWindow');
const AccessReviewCampaign = require('./AccessReviewCampaign');
const AccessReviewItem = require('./AccessReviewItem');
const OperationalConfiguration = require('./OperationalConfiguration');
const OperationalIncident = require('./OperationalIncident');
const SecurityEvent = require('./SecurityEvent');
const TenantDataExport = require('./TenantDataExport');
const TenantDeletionJob = require('./TenantDeletionJob');
const TenantDeletionTombstone = require('./TenantDeletionTombstone');
const OperationalRecovery = require('./OperationalRecovery');
const DisasterRecoveryStatus = require('./DisasterRecoveryStatus');
const OrchestrationDefinition = require('./OrchestrationDefinition');
const OrchestrationRun = require('./OrchestrationRun');
const OrchestrationNodeRun = require('./OrchestrationNodeRun');
const CapabilityCatalogEntry = require('./CapabilityCatalogEntry');
const AgentSelectionPolicy = require('./AgentSelectionPolicy');
const AgentSelectionDecision = require('./AgentSelectionDecision');
const InterAgentDataContract = require('./InterAgentDataContract');
const InterAgentDelegationGrant = require('./InterAgentDelegationGrant');
const InterAgentDelegationInvocation = require('./InterAgentDelegationInvocation');
const InterAgentDelegationReference = require('./InterAgentDelegationReference');
const OrchestrationRecoveryPolicy = require('./OrchestrationRecoveryPolicy');
const OrchestrationRecoveryDecision = require('./OrchestrationRecoveryDecision');
const OrchestrationCompensationPlan = require('./OrchestrationCompensationPlan');
const OrchestrationCompensationRun = require('./OrchestrationCompensationRun');
const OrchestrationInterventionRequest = require('./OrchestrationInterventionRequest');
const OrchestrationCheckpoint = require('./OrchestrationCheckpoint');
const OrchestrationCorrectedInput = require('./OrchestrationCorrectedInput');
const OrchestrationTimelineEvent = require('./OrchestrationTimelineEvent');
const OrchestrationTraceSpan = require('./OrchestrationTraceSpan');
const OrchestrationRunHealthSummary = require('./OrchestrationRunHealthSummary');
const OrchestrationSloPolicy = require('./OrchestrationSloPolicy');
const OrchestrationSloEvaluation = require('./OrchestrationSloEvaluation');
const OrchestrationAlertRule = require('./OrchestrationAlertRule');
const OrchestrationAlert = require('./OrchestrationAlert');
const OrchestrationOperationalSnapshot = require('./OrchestrationOperationalSnapshot');
const OrchestrationFleetControl = require('./OrchestrationFleetControl');
const OrchestrationDiagnosticExport = require('./OrchestrationDiagnosticExport');
const QueuePartition = require('./QueuePartition');
const WorkerRegistration = require('./WorkerRegistration');
const WorkloadAdmissionDecision = require('./WorkloadAdmissionDecision');
const WorkloadBackpressureState = require('./WorkloadBackpressureState');
const WorkloadDeadLetter = require('./WorkloadDeadLetter');
const WorkloadQuotaPolicy = require('./WorkloadQuotaPolicy');
const WorkloadQuotaReservation = require('./WorkloadQuotaReservation');
const WorkloadScaleConfiguration = require('./WorkloadScaleConfiguration');
const DataAccessPerformancePolicy = require('./DataAccessPerformancePolicy');
const CacheInvalidationEvent = require('./CacheInvalidationEvent');
const QueryPerformanceSample = require('./QueryPerformanceSample');
const ProjectionMetadata = require('./ProjectionMetadata');
const IndexDriftRecord = require('./IndexDriftRecord');
const RegionalDeploymentConfiguration = require('./RegionalDeploymentConfiguration');
const RegionalServiceRegistration = require('./RegionalServiceRegistration');
const RegionalHealthSnapshot = require('./RegionalHealthSnapshot');
const RegionalWriteAuthority = require('./RegionalWriteAuthority');
const RegionalAuthorityTransition = require('./RegionalAuthorityTransition');
const RegionalRoutingDecision = require('./RegionalRoutingDecision');
const RegionalReplicationHealth = require('./RegionalReplicationHealth');
const DisasterRecoveryPolicy = require('./DisasterRecoveryPolicy');
const RegionalFailoverPlan = require('./RegionalFailoverPlan');
const BackupManifest = require('./BackupManifest');
const BackupIntegrityManifest = require('./BackupIntegrityManifest');
const DisasterRecoveryRestore = require('./DisasterRecoveryRestore');
const DisasterRecoveryDrill = require('./DisasterRecoveryDrill');
const PerformanceLoadScenario = require('./PerformanceLoadScenario');
const PerformanceBudgetPolicy = require('./PerformanceBudgetPolicy');
const PerformanceBaseline = require('./PerformanceBaseline');
const PerformanceEnvironmentFingerprint = require('./PerformanceEnvironmentFingerprint');
const PerformanceTestRun = require('./PerformanceTestRun');
const PerformanceMeasurementWindow = require('./PerformanceMeasurementWindow');
const PerformanceFailureInjectionProfile = require('./PerformanceFailureInjectionProfile');
const PerformanceFixtureSet = require('./PerformanceFixtureSet');
const PerformanceRegressionEvaluation = require('./PerformanceRegressionEvaluation');
const CapacityModel = require('./CapacityModel');
const CapacityPlan = require('./CapacityPlan');
const ReleaseCandidate = require('./ReleaseCandidate');
const ReleaseManifest = require('./ReleaseManifest');
const BuildProvenance = require('./BuildProvenance');
const ReleaseArtifactManifest = require('./ReleaseArtifactManifest');
const ReleaseCompatibilityMatrix = require('./ReleaseCompatibilityMatrix');
const ReleaseMigrationPlan = require('./ReleaseMigrationPlan');
const ReleaseMigrationCheckpoint = require('./ReleaseMigrationCheckpoint');
const ReleaseFeatureFlag = require('./ReleaseFeatureFlag');
const DeploymentTarget = require('./DeploymentTarget');
const ReleaseRolloutPolicy = require('./ReleaseRolloutPolicy');
const ReleaseRolloutPlan = require('./ReleaseRolloutPlan');
const ReleaseEvidencePackage = require('./ReleaseEvidencePackage');
const ReleaseManualGate = require('./ReleaseManualGate');
const ReleaseWaiver = require('./ReleaseWaiver');
const ReleaseFreeze = require('./ReleaseFreeze');
const ReleaseOperationalOwnership = require('./ReleaseOperationalOwnership');
const ReleaseObservationWindow = require('./ReleaseObservationWindow');
const stagingPilotModels = require('./stagingPilotModels');
const pilotAnalyticsModels = require('./pilotAnalyticsModels');
const gaCommercialModels = require('./gaCommercialModels');

module.exports = {
  Partner,
  AgentPassport,
  Capability,
  PassportInstallKey,
  PassportConnection,
  Credential,
  Invocation,
  InvocationAttempt,
  AuditLog,
  OperationalAlert,
  CircuitBreaker,
  RuntimeCapacitySlot,
  RuntimeWorkItem,
  DurableEventOutbox,
  RuntimeWorkerHeartbeat,
  Organization,
  Workspace,
  Team,
  EnterpriseUser,
  ServiceAccount,
  Role,
  Policy,
  PolicyRevision,
  GovernedSecret,
  SecretVersion,
  CredentialBinding,
  CredentialLease,
  CredentialRotationAttempt,
  EncryptionRewrapJob,
  ApprovalWorkflow,
  ApprovalRequest,
  ApprovalDecision,
  ApprovalGrant,
  ComplianceNotification,
  EvidenceEvent,
  AuditChainState,
  AuditCheckpoint,
  RetentionPolicy,
  LegalHold,
  EvidenceExport,
  LifecycleTransition,
  MaintenanceWindow,
  AccessReviewCampaign,
  AccessReviewItem,
  OperationalConfiguration,
  OperationalIncident,
  SecurityEvent,
  TenantDataExport,
  TenantDeletionJob,
  TenantDeletionTombstone,
  OperationalRecovery,
  DisasterRecoveryStatus,
  OrchestrationDefinition,
  OrchestrationRun,
  OrchestrationNodeRun,
  CapabilityCatalogEntry,
  AgentSelectionPolicy,
  AgentSelectionDecision,
  InterAgentDataContract,
  InterAgentDelegationGrant,
  InterAgentDelegationInvocation,
  InterAgentDelegationReference,
  OrchestrationRecoveryPolicy,
  OrchestrationRecoveryDecision,
  OrchestrationCompensationPlan,
  OrchestrationCompensationRun,
  OrchestrationInterventionRequest,
  OrchestrationCheckpoint,
  OrchestrationCorrectedInput,
  OrchestrationTimelineEvent,
  OrchestrationTraceSpan,
  OrchestrationRunHealthSummary,
  OrchestrationSloPolicy,
  OrchestrationSloEvaluation,
  OrchestrationAlertRule,
  OrchestrationAlert,
  OrchestrationOperationalSnapshot,
  OrchestrationFleetControl,
  OrchestrationDiagnosticExport,
  QueuePartition,
  WorkerRegistration,
  WorkloadAdmissionDecision,
  WorkloadBackpressureState,
  WorkloadDeadLetter,
  WorkloadQuotaPolicy,
  WorkloadQuotaReservation,
  WorkloadScaleConfiguration,
  DataAccessPerformancePolicy,
  CacheInvalidationEvent,
  QueryPerformanceSample,
  ProjectionMetadata,
  IndexDriftRecord,
  RegionalDeploymentConfiguration,
  RegionalServiceRegistration,
  RegionalHealthSnapshot,
  RegionalWriteAuthority,
  RegionalAuthorityTransition,
  RegionalRoutingDecision,
  RegionalReplicationHealth,
  DisasterRecoveryPolicy,
  RegionalFailoverPlan,
  BackupManifest,
  BackupIntegrityManifest,
  DisasterRecoveryRestore,
  DisasterRecoveryDrill,
  PerformanceLoadScenario,
  PerformanceBudgetPolicy,
  PerformanceBaseline,
  PerformanceEnvironmentFingerprint,
  PerformanceTestRun,
  PerformanceMeasurementWindow,
  PerformanceFailureInjectionProfile,
  PerformanceFixtureSet,
  PerformanceRegressionEvaluation,
  CapacityModel,
  CapacityPlan,
  ReleaseCandidate,
  ReleaseManifest,
  BuildProvenance,
  ReleaseArtifactManifest,
  ReleaseCompatibilityMatrix,
  ReleaseMigrationPlan,
  ReleaseMigrationCheckpoint,
  ReleaseFeatureFlag,
  DeploymentTarget,
  ReleaseRolloutPolicy,
  ReleaseRolloutPlan,
  ReleaseEvidencePackage,
  ReleaseManualGate,
  ReleaseWaiver,
  ReleaseFreeze,
  ReleaseOperationalOwnership,
  ReleaseObservationWindow,
  ...stagingPilotModels,
  ...pilotAnalyticsModels,
  ...gaCommercialModels,
};
