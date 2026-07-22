import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
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
import { DelegationGrants } from './pages/DelegationGrants.jsx';
import { DelegationGrantDetail } from './pages/DelegationGrantDetail.jsx';
import { DelegationInvocations } from './pages/DelegationInvocations.jsx';
import { DelegationInvocationDetail } from './pages/DelegationInvocationDetail.jsx';
import { RecoveryPolicies } from './pages/RecoveryPolicies.jsx';
import { RecoveryPolicyDetail } from './pages/RecoveryPolicyDetail.jsx';
import { Interventions } from './pages/Interventions.jsx';
import { InterventionDetail } from './pages/InterventionDetail.jsx';
import { useAppState } from './app/AppState.jsx';

export default function App() {
  const { sandboxEnabled, sandboxReady } = useAppState();

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/partner" element={<PartnerDashboard />} />
        <Route path="/operations" element={<Operations />} />
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
        <Route path="/delegation-grants" element={<DelegationGrants />} />
        <Route path="/delegation-grants/:grantId" element={<DelegationGrantDetail />} />
        <Route path="/delegation-invocations" element={<DelegationInvocations />} />
        <Route path="/delegation-invocations/:invocationId" element={<DelegationInvocationDetail />} />
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
