import { Navigate, Route, Routes } from 'react-router-dom';
import { AuditLogs } from './pages/AuditLogs.jsx';
import { Connections } from './pages/Connections.jsx';
import { ConnectionDetail } from './pages/ConnectionDetail.jsx';
import { CreatePassport } from './pages/CreatePassport.jsx';
import { Invocations } from './pages/Invocations.jsx';
import { IssuePassportKey } from './pages/IssuePassportKey.jsx';
import { Landing } from './pages/Landing.jsx';
import { PartnerDashboard } from './pages/PartnerDashboard.jsx';
import { PassportDetail } from './pages/PassportDetail.jsx';
import { PassportsList } from './pages/PassportsList.jsx';
import { ResolvePassportKey } from './pages/ResolvePassportKey.jsx';
import { Settings } from './pages/Settings.jsx';
import { TestInvocation } from './pages/TestInvocation.jsx';
import { DeveloperSandbox } from './pages/DeveloperSandbox.jsx';
import { Operations } from './pages/Operations.jsx';
import { Policies } from './pages/Policies.jsx';
import { Secrets } from './pages/Secrets.jsx';
import { Compliance } from './pages/Compliance.jsx';
import { EnterpriseOperations } from './pages/EnterpriseOperations.jsx';
import { Orchestrations } from './pages/Orchestrations.jsx';
import { OrchestrationAlerts } from './pages/OrchestrationAlerts.jsx';
import { OrchestrationAnalytics } from './pages/OrchestrationAnalytics.jsx';
import { OrchestrationDefinition } from './pages/OrchestrationDefinition.jsx';
import { OrchestrationOperations } from './pages/OrchestrationOperations.jsx';
import { OrchestrationRuns } from './pages/OrchestrationRuns.jsx';
import { OrchestrationRunDetail } from './pages/OrchestrationRunDetail.jsx';
import { OrchestrationSLOs } from './pages/OrchestrationSLOs.jsx';
import { AgentDiscovery } from './pages/AgentDiscovery.jsx';
import { AgentDetail } from './pages/AgentDetail.jsx';
import { SelectionPolicies } from './pages/SelectionPolicies.jsx';
import { SelectionPolicyDetail } from './pages/SelectionPolicyDetail.jsx';
import { SelectionDecisions } from './pages/SelectionDecisions.jsx';
import { SelectionDecisionDetail } from './pages/SelectionDecisionDetail.jsx';
import { DataContracts } from './pages/DataContracts.jsx';
import { DataContractDetail } from './pages/DataContractDetail.jsx';
import { RecoveryPolicies } from './pages/RecoveryPolicies.jsx';
import { RecoveryPolicyDetail } from './pages/RecoveryPolicyDetail.jsx';
import { Interventions } from './pages/Interventions.jsx';
import { InterventionDetail } from './pages/InterventionDetail.jsx';
import { ScaleCapacity } from './pages/ScaleCapacity.jsx';
import { QueuePartitions } from './pages/QueuePartitions.jsx';
import { WorkerPools } from './pages/WorkerPools.jsx';
import { AdmissionQuotas } from './pages/AdmissionQuotas.jsx';
import { DeadLetter } from './pages/DeadLetter.jsx';
import { DatabaseCache } from './pages/DatabaseCache.jsx';
import { QueryPerformance } from './pages/QueryPerformance.jsx';
import { DatabaseIndexes } from './pages/DatabaseIndexes.jsx';
import { DataProjections } from './pages/DataProjections.jsx';
import { Regions } from './pages/Regions.jsx';
import { RegionalFailover } from './pages/RegionalFailover.jsx';
import { DisasterRecovery } from './pages/DisasterRecovery.jsx';
import { BackupsRestores } from './pages/BackupsRestores.jsx';
import { DrDrills } from './pages/DrDrills.jsx';
import { LoadTests } from './pages/LoadTests.jsx';
import { LoadTestDetail } from './pages/LoadTestDetail.jsx';
import { PerformanceBudgets } from './pages/PerformanceBudgets.jsx';
import { PerformanceBaselines } from './pages/PerformanceBaselines.jsx';
import { CapacityPlanning } from './pages/CapacityPlanning.jsx';
import { ReleaseReadiness } from './pages/ReleaseReadiness.jsx';
import { ReleaseCandidates } from './pages/ReleaseCandidates.jsx';
import { ReleaseCandidateDetail } from './pages/ReleaseCandidateDetail.jsx';
import { ReleaseRollouts } from './pages/ReleaseRollouts.jsx';
import { ReleaseRolloutDetail } from './pages/ReleaseRolloutDetail.jsx';
import { ReleaseMigrations } from './pages/ReleaseMigrations.jsx';
import { ReleaseFeatureFlags } from './pages/ReleaseFeatureFlags.jsx';
import {
  CapabilityGates,
  FeedbackSupport,
  PilotHealth,
  PilotProgramDetail,
  PilotPrograms,
  Staging,
} from './pages/StagingPilotConsole.jsx';
import {
  AdoptionFunnels,
  AnalyticsDataQuality,
  CapabilityAdoption,
  CohortsRetention,
  FeedbackInsights,
  PilotAnalyticsOverview,
  PilotExperiments,
  ProductOpportunities,
} from './pages/PilotAnalyticsConsole.jsx';
import {
  CommercialCustomers,
  CommercialEvidence,
  CustomerSuccess,
  Entitlements,
  GaDecisions,
  GaReadiness,
  GaRollouts,
  Invoices,
  Payments,
  PlansPricing,
  ProductCatalog,
  Renewals,
  Subscriptions,
  UsageMetering,
} from './pages/CommercialConsole.jsx';
import { useAppState } from './app/AppState.jsx';
import { PublicProtocolLayout } from './layouts/PublicProtocolLayout.jsx';
import { ProtocolDocsFrame, ProtocolDocsLayout } from './layouts/ProtocolDocsLayout.jsx';
import { PlatformConsoleLayout } from './layouts/PlatformConsoleLayout.jsx';
import { ProtocolHome } from './pages/ProtocolHome.jsx';
import { ProtocolDocsPage } from './pages/ProtocolDocs.jsx';
import { ConsoleLogin } from './pages/ConsoleLogin.jsx';
import { ConsoleProtocolPlaceholder } from './pages/ConsoleProtocolPlaceholder.jsx';
import { TrustConsole } from './pages/TrustConsole.jsx';
import { legacyPublicRedirects } from './docs/docsManifest.js';

export default function App() {
  const { sandboxEnabled, sandboxReady } = useAppState();

  return (
    <Routes>
      <Route element={<PublicProtocolLayout />}>
        <Route path="/" element={<ProtocolHome />} />
      </Route>
      <Route element={<ProtocolDocsLayout />}>
        <Route element={<ProtocolDocsFrame />}>
          <Route path="/docs/*" element={<ProtocolDocsPage />} />
          <Route path="/extensions/*" element={<ProtocolDocsPage />} />
          <Route path="/specification/*" element={<ProtocolDocsPage />} />
          <Route path="/registry/*" element={<ProtocolDocsPage />} />
          <Route path="/gbeps/*" element={<ProtocolDocsPage />} />
          <Route path="/community/*" element={<ProtocolDocsPage />} />
          <Route path="/sdks/*" element={<ProtocolDocsPage />} />
          {Object.entries(legacyPublicRedirects).map(([from, to]) => (
            <Route key={from} path={from} element={<Navigate to={to} replace />} />
          ))}
        </Route>
      </Route>
      <Route path="/console/login" element={<ConsoleLogin />} />
      <Route element={<PlatformConsoleLayout />}>
        <Route path="/console" element={<Landing />} />
        <Route path="/console/agents" element={<AgentDiscovery />} />
        <Route path="/console/passports" element={<PassportsList />} />
        <Route path="/console/install" element={<ResolvePassportKey />} />
        <Route path="/console/workflows" element={<Orchestrations />} />
        <Route path="/console/invocations" element={<Invocations />} />
        <Route path="/console/approvals" element={<ConsoleProtocolPlaceholder />} />
        <Route path="/console/tasks" element={<OrchestrationRuns />} />
        <Route path="/console/receipts" element={<ConsoleProtocolPlaceholder />} />
        <Route path="/console/policies" element={<Policies />} />
        <Route path="/console/security" element={<ConsoleProtocolPlaceholder />} />
        <Route path="/console/security/issuers" element={<TrustConsole />} />
        <Route path="/console/security/trust-policies" element={<TrustConsole />} />
        <Route path="/console/security/signing-keys" element={<TrustConsole />} />
        <Route path="/console/security/revocation" element={<TrustConsole />} />
        <Route path="/console/security/verification-events" element={<TrustConsole />} />
        <Route path="/console/operations" element={<Operations />} />
        <Route path="/console/analytics" element={<PilotAnalyticsOverview />} />
        <Route path="/console/commercial" element={<ProductCatalog />} />
        <Route path="/console/admin" element={<ConsoleProtocolPlaceholder />} />
        <Route path="/partner" element={<PartnerDashboard />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/operations/scale-capacity" element={<ScaleCapacity />} />
        <Route path="/operations/queue-partitions" element={<QueuePartitions />} />
        <Route path="/operations/worker-pools" element={<WorkerPools />} />
        <Route path="/operations/admission-quotas" element={<AdmissionQuotas />} />
        <Route path="/operations/dead-letter" element={<DeadLetter />} />
        <Route path="/operations/database-cache" element={<DatabaseCache />} />
        <Route path="/operations/query-performance" element={<QueryPerformance />} />
        <Route path="/operations/database-indexes" element={<DatabaseIndexes />} />
        <Route path="/operations/data-projections" element={<DataProjections />} />
        <Route path="/operations/regions" element={<Regions />} />
        <Route path="/operations/failover" element={<RegionalFailover />} />
        <Route path="/operations/disaster-recovery" element={<DisasterRecovery />} />
        <Route path="/operations/backups-restores" element={<BackupsRestores />} />
        <Route path="/operations/dr-drills" element={<DrDrills />} />
        <Route path="/operations/load-tests" element={<LoadTests />} />
        <Route path="/operations/load-tests/:runId" element={<LoadTestDetail />} />
        <Route path="/operations/performance-budgets" element={<PerformanceBudgets />} />
        <Route path="/operations/baselines" element={<PerformanceBaselines />} />
        <Route path="/operations/capacity-planning" element={<CapacityPlanning />} />
        <Route path="/operations/release-readiness" element={<ReleaseReadiness />} />
        <Route path="/operations/release-candidates" element={<ReleaseCandidates />} />
        <Route path="/operations/release-candidates/:candidateId" element={<ReleaseCandidateDetail />} />
        <Route path="/operations/release-rollouts" element={<ReleaseRollouts />} />
        <Route path="/operations/release-rollouts/:rolloutId" element={<ReleaseRolloutDetail />} />
        <Route path="/operations/release-migrations" element={<ReleaseMigrations />} />
        <Route path="/operations/release-feature-flags" element={<ReleaseFeatureFlags />} />
        <Route path="/operations/staging" element={<Staging />} />
        <Route path="/operations/pilot-programs" element={<PilotPrograms />} />
        <Route path="/operations/pilot-programs/:programId" element={<PilotProgramDetail />} />
        <Route path="/operations/capability-gates" element={<CapabilityGates />} />
        <Route path="/operations/pilot-health" element={<PilotHealth />} />
        <Route path="/operations/pilot-feedback-support" element={<FeedbackSupport />} />
        <Route path="/operations/pilot-analytics" element={<PilotAnalyticsOverview />} />
        <Route path="/operations/pilot-analytics/funnels" element={<AdoptionFunnels />} />
        <Route path="/operations/pilot-analytics/cohorts" element={<CohortsRetention />} />
        <Route path="/operations/pilot-analytics/capabilities" element={<CapabilityAdoption />} />
        <Route path="/operations/pilot-analytics/feedback" element={<FeedbackInsights />} />
        <Route path="/operations/pilot-analytics/experiments" element={<PilotExperiments />} />
        <Route path="/operations/pilot-analytics/opportunities" element={<ProductOpportunities />} />
        <Route path="/operations/pilot-analytics/data-quality" element={<AnalyticsDataQuality />} />
        <Route path="/commercial/products" element={<ProductCatalog />} />
        <Route path="/commercial/plans" element={<PlansPricing />} />
        <Route path="/commercial/entitlements" element={<Entitlements />} />
        <Route path="/commercial/customers" element={<CommercialCustomers />} />
        <Route path="/commercial/subscriptions" element={<Subscriptions />} />
        <Route path="/commercial/usage" element={<UsageMetering />} />
        <Route path="/commercial/invoices" element={<Invoices />} />
        <Route path="/commercial/payments" element={<Payments />} />
        <Route path="/commercial/renewals" element={<Renewals />} />
        <Route path="/commercial/customer-success" element={<CustomerSuccess />} />
        <Route path="/ga/readiness" element={<GaReadiness />} />
        <Route path="/ga/rollouts" element={<GaRollouts />} />
        <Route path="/ga/decisions" element={<GaDecisions />} />
        <Route path="/ga/evidence" element={<CommercialEvidence />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/secrets" element={<Secrets />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/enterprise-operations" element={<EnterpriseOperations />} />
        <Route path="/orchestrations" element={<Orchestrations />} />
        <Route path="/orchestrations/operations" element={<OrchestrationOperations />} />
        <Route path="/orchestrations/analytics" element={<OrchestrationAnalytics />} />
        <Route path="/orchestrations/slos" element={<OrchestrationSLOs />} />
        <Route path="/orchestrations/alerts" element={<OrchestrationAlerts />} />
        <Route path="/orchestrations/definitions/:definitionId" element={<OrchestrationDefinition />} />
        <Route path="/orchestrations/runs" element={<OrchestrationRuns />} />
        <Route path="/orchestrations/runs/:runId" element={<OrchestrationRunDetail />} />
        <Route path="/recovery-policies" element={<RecoveryPolicies />} />
        <Route path="/recovery-policies/:policyId" element={<RecoveryPolicyDetail />} />
        <Route path="/interventions" element={<Interventions />} />
        <Route path="/interventions/:interventionId" element={<InterventionDetail />} />
        <Route path="/agent-discovery" element={<AgentDiscovery />} />
        <Route path="/agent-discovery/agents/:connectionId" element={<AgentDetail />} />
        <Route path="/selection-policies" element={<SelectionPolicies />} />
        <Route path="/selection-policies/:policyId" element={<SelectionPolicyDetail />} />
        <Route path="/selection-decisions" element={<SelectionDecisions />} />
        <Route path="/selection-decisions/:decisionId" element={<SelectionDecisionDetail />} />
        <Route path="/data-contracts" element={<DataContracts />} />
        <Route path="/data-contracts/:contractId" element={<DataContractDetail />} />
        <Route path="/passports/new" element={<CreatePassport />} />
        <Route path="/passports" element={<PassportsList />} />
        <Route path="/passports/:passportId" element={<PassportDetail />} />
        <Route path="/install-keys/issue" element={<IssuePassportKey />} />
        <Route path="/install-keys/resolve" element={<ResolvePassportKey />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/connections/:connectionId" element={<ConnectionDetail />} />
        <Route path="/invoke/test" element={<TestInvocation />} />
        <Route path="/invocations" element={<Invocations />} />
        <Route path="/audit" element={<AuditLogs />} />
        <Route path="/settings" element={<Settings />} />
        <Route
          path="/developer-sandbox"
          element={
            sandboxReady ? (
              sandboxEnabled ? (
                <DeveloperSandbox />
              ) : (
                <Navigate to="/" replace />
              )
            ) : null
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
