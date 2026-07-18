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
import { OrchestrationDefinition } from './pages/OrchestrationDefinition.jsx';
import { OrchestrationRuns } from './pages/OrchestrationRuns.jsx';
import { OrchestrationRunDetail } from './pages/OrchestrationRunDetail.jsx';
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
        <Route path="/orchestrations/definitions/:definitionId" element={<OrchestrationDefinition />} />
        <Route path="/orchestrations/runs" element={<OrchestrationRuns />} />
        <Route path="/orchestrations/runs/:runId" element={<OrchestrationRunDetail />} />
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
