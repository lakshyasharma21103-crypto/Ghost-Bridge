export const protocolProfile = Object.freeze({
  name: 'Ghost Bridge Protocol',
  tagline: 'Install external agents into any compatible application.',
  definition:
    'Ghost Bridge is an open protocol for Host Applications to discover, verify, install, invoke, observe, and revoke external AI agents across vendors.',
  protocolVersion: 'ghostbridge/0.1-draft',
  protocolRevision: '0.1-draft',
  protocolState: 'Draft',
  stability: 'Experimental',
  sdkState: 'Phase 15C development',
  registryState: 'Preview',
  extensionsState: 'Experimental framework',
  gbepState: 'Initial draft',
  coreProfile: 'Active · C1-C3',
  governedExecutionProfile: 'Active · G1-G3',
  agentCoordinationProfile: 'Experimental/Deferred',
  independentImplementation: 'Not completed',
  externalSecurityReview: 'Not completed',
  productionTrustProfile: 'ghostbridge-trust/0.1-draft · Experimental security profile',
  packagePublication: 'Not completed',
  documentationRevision: 'phase-15c-2026-07-24',
});

const code = (language, value, label = 'Example') => ({ type: 'code', language, value, label });
const note = (tone, title, body) => ({ type: 'callout', tone, title, body });
const bullets = (...items) => ({ type: 'bullets', items });
const steps = (...items) => ({ type: 'steps', items });
const table = (columns, rows) => ({ type: 'table', columns, rows });
const diagram = (label, nodes) => ({ type: 'diagram', label, nodes });

const sharedStatus = [
  note(
    'warning',
    'Experimental protocol',
    'ghostbridge/0.1-draft is a Draft protocol revision. It is not a production-stability claim.',
  ),
  table(
    ['Area', 'Current state'],
    [
      ['Protocol', 'Experimental'],
      ['TypeScript SDK', 'Phase 15B development'],
      ['Independent implementation', 'Not completed'],
      ['Registry', 'Preview'],
      ['External security review', 'Not completed'],
    ],
  ),
];

const detailed = {
  '/docs/get-started/what-is-ghost-bridge': {
    title: 'What is the Ghost Bridge Protocol?',
    description:
      'An identity-first protocol for installing, connecting, and coordinating trusted AI agents.',
    sections: [
      {
        heading: 'What can Ghost Bridge enable?',
        content: [
          bullets(
            'Verify an agent through its Agent Passport.',
            'Install it through a one-time Install Grant.',
            'Discover governed Capability Contracts.',
            'Invoke capabilities within organization and workspace scope.',
            'Delegate narrowly bounded authority between agents.',
            'Enforce Data Contracts, human approval, durable Tasks, Receipts, and revocation.',
          ),
        ],
      },
      {
        heading: 'Why does Ghost Bridge matter?',
        content: [
          'Reachability alone does not establish who an agent is, what it may do, or whether an outcome can be verified. Ghost Bridge makes identity, authority, data boundaries, approval, execution state, evidence, and revocation explicit protocol concerns.',
          note(
            'info',
            'A passport system and secure bridge network',
            'A Passport establishes identity. An Install Grant establishes a connection. Capability Contracts define behavior. Delegation Grants limit transferred authority. Data Contracts control what crosses the bridge. Execution Receipts provide outcome evidence.',
          ),
        ],
      },
      {
        heading: 'Who is Ghost Bridge for?',
        content: [
          bullets(
            'Agent vendors building Native Agents.',
            'Application developers building clients and orchestrators.',
            'Operators implementing compatible control planes.',
            'Security teams defining identity, scope, approval, data, and revocation policy.',
          ),
        ],
      },
      {
        heading: 'How Ghost Bridge works',
        content: [
          diagram('Discovery through verified execution', [
            'Discover',
            'Verify Passport',
            'Install',
            'Authorize',
            'Invoke',
            'Observe Task',
            'Verify Receipt',
          ]),
        ],
      },
      {
        heading: 'Core protocol primitives',
        content: [
          table(
            ['Primitive', 'Purpose'],
            [
              ['Agent Passport', 'Verifiable, versioned, revocable agent identity.'],
              ['Install Grant', 'Short-lived, one-time installation authorization.'],
              ['Capability Contract', 'Governed capability behavior and risk declaration.'],
              ['Agent Connection', 'Installed organization and workspace relationship.'],
              ['Invocation Envelope', 'One bounded, deadline-aware capability request.'],
              ['Delegation Grant', 'Narrow agent-to-agent authority.'],
              ['Data Contract', 'Permitted fields and classifications at a boundary.'],
              ['Approval Challenge', 'Exact, expiring high-impact action request.'],
              ['Execution Task', 'Durable execution state and cancellation surface.'],
              ['Execution Receipt', 'Verifiable evidence of an outcome.'],
              ['Revocation', 'Authoritative invalidation of trust or authority.'],
            ],
          ),
        ],
      },
      {
        heading: 'Start building',
        content: [
          bullets(
            'Run the Quickstart for a first local Invocation.',
            'Build an Invoice Summary Agent.',
            'Build a client and connect the Invoice and Accounting reference agents.',
            'Use Inspector to examine every message without exposing credentials.',
          ),
        ],
      },
      { heading: 'Protocol status', content: sharedStatus },
      {
        heading: 'Learn more',
        content: [
          bullets(
            'Architecture explains participants and protocol layers.',
            'Lifecycle follows every request from discovery through revocation.',
            'Security separates authentication, authorization, delegation, approval, and evidence.',
          ),
        ],
      },
    ],
  },
  '/docs/get-started/quickstart': {
    title: 'Quickstart',
    description: 'Reach a first deterministic local Invocation and Receipt in about ten minutes.',
    sections: [
      {
        heading: 'Prerequisites',
        content: [
          bullets('Node.js 20 or newer.', 'The Ghost Bridge repository checkout.', 'No database, provider key, paid API, or external service.'),
        ],
      },
      {
        heading: 'Build the local packages',
        content: [
          code('powershell', 'npm.cmd install\nnpm.cmd run build'),
          code('bash', 'npm install\nnpm run build'),
        ],
      },
      {
        heading: 'Run the reference flow',
        content: [
          code('powershell', 'node protocol/examples/two-agent-workflow/run.js\nnpm.cmd run dev:ghostbridge-inspector -- --target http://127.0.0.1:8787'),
          code('bash', 'node protocol/examples/two-agent-workflow/run.js\nnpm run dev:ghostbridge-inspector -- --target http://127.0.0.1:8787'),
          steps(
            'Start the Invoice reference agent.',
            'Open Inspector on its loopback target.',
            'Inspect discovery, Passport, and Capability Contracts.',
            'Invoke invoice.extract.',
            'Inspect the Task and verify its Receipt.',
          ),
        ],
      },
      {
        heading: 'Expected result',
        content: [
          'The deterministic fixture returns a completed Execution Task and a non-billable Execution Receipt. The command performs no live provider request.',
        ],
      },
    ],
  },
  '/docs/learn/architecture': {
    title: 'Architecture',
    description: 'Participants, trust boundaries, protocol layers, and native message flows.',
    sections: [
      {
        heading: 'Participants',
        content: [
          table(
            ['Participant', 'Responsibility'],
            [
              ['Agent Vendor', 'Builds and operates an agent.'],
              ['Passport Issuer', 'Issues, rotates, suspends, and revokes Agent Passports.'],
              ['Native Agent', 'Implements governed capabilities.'],
              ['Client', 'Discovers, installs, and invokes agents.'],
              ['Operator', 'Operates a compatible control plane.'],
              ['Organization', 'Top-level tenant scope.'],
              ['Workspace', 'Bounded operating scope within an Organization.'],
              ['Approver', 'Decides a scoped Approval Challenge.'],
              ['Registry', 'Optional public metadata discovery system.'],
              ['Ghost Bridge Platform', 'One commercial implementation of the protocol.'],
            ],
          ),
          diagram('Participant relationships', [
            'Passport Issuer → Agent Passport → Native Agent',
            'Client → Install Grant → Agent Connection',
            'Organization → Workspace → Invocation',
            'Approver → Approval Decision → Task',
            'Registry → public metadata only',
          ]),
        ],
      },
      {
        heading: 'Protocol layers',
        content: [
          table(
            ['Layer', 'Responsibilities'],
            [
              ['Trust', 'Issuer identity, Passport verification, key resolution, revocation.'],
              ['Installation', 'Install Grants, Connection Offers, Agent Connections.'],
              ['Capability', 'Contracts, discovery, compatibility, risk and side effects.'],
              ['Execution', 'Invocation Envelopes, Tasks, cancellation, progress, Receipts.'],
              ['Coordination', 'Delegation Grants, Data Contracts, approvals, multi-agent relationships.'],
              ['Transport Binding', 'Current HTTPS/JSON framing and authentication binding; storage-neutral.'],
            ],
          ),
          diagram('Layered protocol', ['Trust', 'Installation', 'Capability', 'Execution', 'Coordination', 'HTTPS/JSON binding']),
        ],
      },
      {
        heading: 'Agent installation',
        content: [diagram('Installation sequence', ['Client discovers Agent', 'Client verifies Passport', 'Client resolves one-time Install Grant', 'Agent returns Connection Offer', 'Client redeems grant', 'Agent creates scoped Connection'])],
      },
      {
        heading: 'Native invocation',
        content: [diagram('Invocation sequence', ['Client sends Invocation Envelope', 'Agent checks version, identity, scope, policy, revocation', 'Agent creates Task', 'Capability executes', 'Agent issues Receipt', 'Client verifies Receipt'])],
      },
      {
        heading: 'Agent-to-agent delegation',
        content: [diagram('Delegation sequence', ['Delegator creates bounded Grant', 'Data Contract projects output', 'Delegate validates authority', 'Delegate invokes one allowed capability', 'Use count decreases', 'Receipt binds delegation reference'])],
      },
      {
        heading: 'Approval lifecycle',
        content: [diagram('Approval sequence', ['Invocation needs approval', 'Agent issues Challenge', 'Task waits', 'Approver decides exact action', 'Decision is consumed once', 'Task resumes or terminates'])],
      },
      {
        heading: 'Receipt and revocation lifecycle',
        content: [diagram('Evidence and invalidation', ['Execution completes', 'Receipt captures digests and references', 'Verifier validates Receipt', 'Issuer or owner revokes authority', 'Caches invalidate', 'Future execution fails closed'])],
      },
    ],
  },
  '/docs/learn/lifecycle': {
    title: 'Native protocol lifecycle',
    description: 'The complete 16-step lifecycle from discovery through authoritative revocation.',
    sections: [
      {
        heading: 'Lifecycle matrix',
        content: [
          table(
            ['Step', 'Participants and message', 'Security check', 'SDK / Inspector'],
            [
              ['1. Discovery', 'Client → Discovery Document', 'Bounded public endpoints', 'discover / Connection'],
              ['2. Version negotiation', 'Client ↔ Agent supported versions', 'No silent high-impact downgrade', 'negotiateVersion / Connection'],
              ['3. Passport verification', 'Issuer, Client, Agent Passport', 'Issuer, audience, expiry, keys, revocation', 'getPassport / Passport'],
              ['4. Capability discovery', 'Client → bounded catalog', 'Scope filtering before ranking', 'searchCapabilities / Capabilities'],
              ['5. Grant resolution', 'Client → Install Grant resolution', 'Entropy, expiry, scope, one-time state', 'resolveInstallGrant / Installation'],
              ['6. Connection', 'Client redeems grant', 'Atomic one-time redemption', 'install / Installation'],
              ['7. Authorization', 'Subject, policy, Organization, Workspace', 'RBAC, policy, revocation', 'invoke / Invocation'],
              ['8. Acceptance', 'Invocation Envelope', 'Schema, version, deadline, idempotency', 'invoke / Messages'],
              ['9. Task creation', 'Agent → Execution Task', 'Valid state transition', 'getTask / Tasks'],
              ['10. Delegation', 'Delegator → Delegation Grant', 'No authority expansion', 'invoke / Delegation'],
              ['11. Data enforcement', 'Projected payload', 'Fields, classes, size, redaction', 'projectDataContract / Data Contract'],
              ['12. Approval', 'Challenge → Decision', 'Exact action, limits, expiry, single use', 'submitApprovalDecision / Approval'],
              ['13. Execution', 'Agent capability handler', 'Timeout, cancellation, safe context', 'invokeAndWait / Tasks'],
              ['14. Receipt', 'Agent → Execution Receipt', 'Digest, version, scope, proof', 'verifyReceipt / Receipts'],
              ['15. Recovery', 'Client or Operator', 'Idempotency and safe retry classification', 'cancelTask / Tasks'],
              ['16. Revocation', 'Issuer, owner, resolver', 'Authoritative invalidation and cache refresh', 'checkRevocation / Revocation'],
            ],
          ),
        ],
      },
      {
        heading: 'Failure behavior',
        content: [
          'Every step fails with a bounded standard error. Errors contain safe correlation identifiers but no remote stack, token, credential, raw policy, or database record.',
        ],
      },
    ],
  },
  '/docs/learn/versioning': {
    title: 'Versioning',
    description: 'Protocol revisions, SDK package versions, documentation revisions, and extension versions are independent.',
    sections: [
      {
        heading: 'Three version domains',
        content: [
          table(
            ['Domain', 'Meaning'],
            [
              ['Protocol revision', 'Wire compatibility; currently ghostbridge/0.1-draft.'],
              ['SDK package version', 'Package semantic version; does not imply protocol stability.'],
              ['Documentation revision', 'Build identity for this documentation set.'],
            ],
          ),
        ],
      },
      {
        heading: 'Negotiation',
        content: [
          bullets(
            'Both parties advertise supported protocol revisions.',
            'One mutually supported revision is selected.',
            'Unsupported revisions fail safely.',
            'Signed or high-impact messages do not silently downgrade.',
            'Extensions negotiate separately.',
          ),
        ],
      },
      { heading: 'Current status', content: sharedStatus },
    ],
  },
  '/docs/develop/build-agent': {
    title: 'Build a Native Agent',
    description: 'Build a deterministic Invoice Summary Agent with typed capabilities, Tasks, and Receipts.',
    sections: [
      {
        heading: 'Create the project',
        content: [
          code('powershell', 'New-Item -ItemType Directory invoice-summary-agent\nSet-Location invoice-summary-agent\nnpm.cmd init -y\nnpm.cmd install ..\\packages\\ghostbridge-native-agent'),
          code('bash', 'mkdir invoice-summary-agent && cd invoice-summary-agent\nnpm init -y\nnpm install ../packages/ghostbridge-native-agent'),
        ],
      },
      {
        heading: 'Create the Agent Passport',
        content: [
          'Create an active, expiring Passport containing only public declarations. Never place credentials or runtime bearer tokens in a Passport.',
        ],
      },
      {
        heading: 'Define Data Contracts and capabilities',
        content: [
          code(
            'typescript',
            `import { createGhostBridgeAgent } from "@ghostbridge/native-agent";

const agent = createGhostBridgeAgent({ passport });
agent.registerCapability("invoice.extract", {
  inputContract: { type: "object", required: ["text"] },
  outputContract: { type: "object", required: ["invoiceNumber", "total"] },
  capabilityVersion: "1.0.0",
  riskCategory: "low",
  sideEffectCategory: "none",
  idempotencyRequirement: "optional",
  receiptProfile: "standard",
  handler: async ({ input, context }) => ({
    outcome: "completed",
    output: extractInvoice(input.text, context.signal),
  }),
});
agent.registerCapability("invoice.validate", {
  inputContract: { type: "object", required: ["invoiceNumber", "total"] },
  outputContract: { type: "object", required: ["valid"] },
  capabilityVersion: "1.0.0",
  riskCategory: "moderate",
  sideEffectCategory: "none",
  handler: async ({ input }) => ({ outcome: "completed", output: { valid: Boolean(input.invoiceNumber) } }),
});
await agent.listen({ host: "127.0.0.1", port: 8787 });`,
          ),
        ],
      },
      {
        heading: 'Inspect and test',
        content: [
          steps(
            'Inspect discovery and the public Passport.',
            'Search the bounded capability catalog.',
            'Resolve and redeem a synthetic one-time grant.',
            'Invoke invoice.extract and inspect its Task.',
            'Verify its Receipt.',
            'Send invalid input and confirm validation fails.',
            'Test expired Passport and grant fixtures.',
            'Revoke the Connection and confirm future invocation fails.',
          ),
        ],
      },
      {
        heading: 'Next steps',
        content: [bullets('Add a durable Task store.', 'Configure issuer-key and revocation resolvers.', 'Run conformance checks.', 'Review the security checklist and Inspector logs.')],
      },
    ],
  },
  '/docs/develop/build-client': {
    title: 'Build a Client',
    description: 'Discover, verify, install, invoke, approve, observe, and close a Native client.',
    sections: [
      {
        heading: 'Participants',
        content: [
          table(
            ['Participant', 'Role'],
            [
              ['Application', 'Owns user experience and orchestration.'],
              ['Ghost Bridge client', 'Creates and validates protocol messages.'],
              ['Native Agent', 'Exposes governed capabilities.'],
              ['Operator', 'Runs a compatible control plane when used.'],
              ['User', 'Initiates work.'],
              ['Approver', 'Decides one exact high-impact action.'],
            ],
          ),
        ],
      },
      {
        heading: 'Install and invoke',
        content: [
          code(
            'typescript',
            `import { createGhostBridgeClient, ApprovalRequiredError } from "@ghostbridge/native-client";

const client = createGhostBridgeClient({ baseUrl: "http://127.0.0.1:8787" });
await client.discover();
await client.negotiateVersion();
const passport = await client.getPassport();
const resolution = await client.resolveInstallGrant(grant, {
  organizationScope: "org_demo",
  workspaceScope: "workspace_ap",
});
const installed = await client.install(grant, resolution.requestedScope);
const result = await client.invokeAndWait({
  agentId: installed.agentId,
  capability: "invoice.extract",
  input: { text: "Invoice A-100, total 42.00" },
  idempotencyKey: "invoice-a-100",
});
const verification = await client.verifyReceipt(result.receipt);
client.close();`,
          ),
        ],
      },
      {
        heading: 'Approval and cancellation',
        content: [
          'When a Task waits for approval, submit an Approval Decision bound to its Challenge. A cancelled watcher does not imply that the remote Task was cancelled; call cancelTask explicitly.',
        ],
      },
      {
        heading: 'Typed errors',
        content: [
          code(
            'typescript',
            `try {
  await client.invoke(options);
} catch (error) {
  if (error instanceof ApprovalRequiredError) {
    showApproval(error.requestId);
  }
}`,
          ),
        ],
      },
    ],
  },
  '/docs/develop/connect-two-agents': {
    title: 'Connect Two Agents',
    description: 'Connect the Invoice and Accounting reference agents with explicit data and authority boundaries.',
    sections: [
      {
        heading: 'Architecture',
        content: [
          diagram('Invoice-to-accounting workflow', ['Application → Invoice Agent: invoice.extract', 'Data Contract: projected invoice summary', 'Invoice Agent → Accounting Agent: bounded Delegation Grant', 'Accounting Agent: check_duplicate', 'Approver: approve draft creation', 'Accounting Agent: create_draft → Receipt']),
        ],
      },
      {
        heading: 'Sequence',
        content: [
          steps(
            'Install both agents.',
            'Inspect compatible Capability Contracts.',
            'Invoke invoice.extract.',
            'Project output through the Data Contract.',
            'Create a read-only Delegation Grant.',
            'Invoke accounting.check_duplicate.',
            'Reject an attempted authority expansion.',
            'Create a separate write delegation.',
            'Receive and decide the Approval Challenge.',
            'Create the accounting draft.',
            'Retry with the same idempotency key and prove one draft.',
            'Verify the Execution Receipt.',
            'Revoke the Accounting Agent Connection and prove future invocation fails.',
          ),
        ],
      },
      {
        heading: 'Task states and safe errors',
        content: [
          table(
            ['Moment', 'Expected state or error'],
            [
              ['Read capability accepted', 'accepted → running → completed'],
              ['Write needs approval', 'waiting_for_approval'],
              ['Authority expansion', 'DELEGATION_INVALID'],
              ['Same key, same input', 'completed with idempotentReplay'],
              ['Same key, different input', 'IDEMPOTENCY_CONFLICT'],
              ['After revocation', 'REVOKED'],
            ],
          ),
        ],
      },
      {
        heading: 'Run the actual example',
        content: [code('powershell', 'node protocol/examples/two-agent-workflow/run.js')],
      },
    ],
  },
  '/docs/develop/capability-discovery': {
    title: 'Progressive Capability Discovery',
    description: 'Catalog → Inspect → Authorize → Invoke without loading every complete contract.',
    sections: [
      {
        heading: 'Catalog',
        content: [
          'Return bounded summaries only: agent identity, capability key and name, one-line description, risk, side effects, approval requirement, conformance level, and availability.',
        ],
      },
      {
        heading: 'Inspect',
        content: ['Return one complete permitted Capability Contract only after a candidate is selected.'],
      },
      {
        heading: 'Authorize',
        content: [
          bullets(
            'Filter organization and workspace scope before ranking.',
            'Require an active installation.',
            'Enforce RBAC, policy, revocation, and Data Contract compatibility.',
            'Never expose credentials, endpoints, private Passport fields, or revoked capabilities.',
          ),
        ],
      },
      {
        heading: 'Invoke',
        content: [
          code(
            'typescript',
            `const catalog = await client.searchCapabilities({
  query: "extract invoice",
  organizationScope,
  workspaceScope,
  riskCategories: ["low", "moderate"],
  limit: 10,
});
const contract = await client.getCapabilityDetails({
  agentId: catalog.items[0].agentId,
  capabilityKey: catalog.items[0].capabilityKey,
  organizationScope,
  workspaceScope,
});`,
          ),
        ],
      },
    ],
  },
  '/docs/develop/orchestration': {
    title: 'Programmatic agent orchestration',
    description: 'Safe direct SDK and declarative workflow patterns.',
    sections: [
      {
        heading: 'Direct SDK orchestration',
        content: [
          bullets(
            'Invoke agents through typed SDK calls.',
            'Keep intermediate values in application memory.',
            'Apply a Data Contract at every agent boundary.',
            'Keep delegation explicit and return the final result to the user.',
          ),
        ],
      },
      {
        heading: 'Declarative workflow orchestration',
        content: [
          bullets(
            'Reference Capability Contracts from workflow nodes.',
            'Let a compatible Operator execute the graph.',
            'Record checkpoints and Receipts.',
            'Do not run generated code outside approved execution boundaries.',
          ),
          note('danger', 'No unrestricted code mode', 'Phase 15B does not introduce arbitrary untrusted code execution. Any future sandbox requires a GBEP and security review.'),
        ],
      },
    ],
  },
  '/docs/develop/build-with-agent-skills': {
    title: 'Build with Agent Skills',
    description: 'Use the repository skill pack to design and implement a Native integration.',
    sections: [
      {
        heading: 'Discovery before code',
        content: [
          bullets(
            'Define what the agent does, who operates it, and who issues its Passport.',
            'List capabilities, side effects, accepted and prohibited data, delegation, and approval.',
            'Choose durable execution, receipt profile, scopes, and revocation behavior.',
          ),
        ],
      },
      {
        heading: 'Use the pack',
        content: [code('text', 'skills/ghostbridge-agent-dev/SKILL.md')],
      },
      {
        heading: 'Required outputs',
        content: [bullets('Actual SDK usage.', 'Valid Capability and Data Contracts.', 'No credentials in source.', 'Tests and conformance checks.', 'Security-sensitive decisions explained.')],
      },
    ],
  },
  '/docs/develop/error-handling': {
    title: 'Error handling',
    description: 'Handle bounded typed errors without exposing remote implementation details.',
    sections: [
      {
        heading: 'Typed error mapping',
        content: [
          table(
            ['Condition', 'Type'],
            [
              ['Malformed response', 'ProtocolValidationError'],
              ['Unsupported revision', 'UnsupportedProtocolVersionError'],
              ['Approval required', 'ApprovalRequiredError'],
              ['Deadline elapsed', 'DeadlineExceededError'],
              ['Revoked authority', 'RevokedError'],
              ['Rate limit', 'RateLimitedError'],
              ['Network unavailable', 'ProviderUnavailableError'],
            ],
          ),
        ],
      },
      {
        heading: 'Safe retry',
        content: [
          'Retry only transient errors and only when a request is read-only or has an idempotency key. Never automatically retry an unsafe side effect without idempotency.',
        ],
      },
    ],
  },
  '/docs/tools/inspector': {
    title: 'Ghost Bridge Inspector',
    description: 'A local-only UI and CLI for sanitized Native protocol inspection.',
    sections: [
      {
        heading: 'Start Inspector',
        content: [code('powershell', 'npm.cmd run dev:ghostbridge-inspector -- --target http://127.0.0.1:8787')],
      },
      {
        heading: 'Sections',
        content: [bullets('Connection, Passport, Capabilities, and Installation.', 'Invocation, Tasks, Delegation, Data Contract, and Approval.', 'Receipts, Revocation, sanitized Messages, and Logs.')],
      },
      {
        heading: 'Network safety',
        content: [
          'Loopback targets are allowed by default. Non-loopback targets require both --unsafe-allow-remote and --i-understand-risk. Credentials in target URLs are always rejected.',
          note('danger', 'Sanitized diagnostics only', 'Inspector never displays authorization headers, cookies, tokens, credentials, raw secrets, or private policy data.'),
        ],
      },
    ],
  },
  '/docs/tools/debugging': {
    title: 'Debugging',
    description: 'Diagnose Native protocol failures with Inspector, typed errors, and safe correlation data.',
    sections: [
      {
        heading: 'Troubleshooting matrix',
        content: [
          table(
            ['Symptom', 'Likely cause', 'Inspector / SDK', 'Safe remediation'],
            [
              ['Discovery failed', 'Unreachable or malformed discovery', 'Connection / ProviderUnavailableError', 'Check loopback target and discovery document.'],
              ['Unsupported version', 'No mutual revision', 'Connection / UnsupportedProtocolVersionError', 'Advertise a mutual revision; do not force downgrade.'],
              ['Invalid or expired Passport', 'Schema, issuer, expiry, or key failure', 'Passport / PassportValidationError', 'Refresh and verify the public Passport.'],
              ['Revoked Passport', 'Authoritative revocation', 'Revocation / RevokedError', 'Stop execution and resolve replacement identity.'],
              ['Capability not found', 'Missing, filtered, or version mismatch', 'Capabilities / CapabilityNotFoundError', 'Search again in the same scope.'],
              ['Grant expired or redeemed', 'One-time grant state', 'Installation / InstallGrantError', 'Issue a fresh bounded grant.'],
              ['Scope mismatch', 'Organization or Workspace differs', 'Invocation / ScopeMismatchError', 'Use the Connection scope exactly.'],
              ['Missing idempotency key', 'Side-effect contract requires it', 'Invocation / ProtocolValidationError', 'Generate a stable operation key.'],
              ['Data Contract violation', 'Field, class, or size denied', 'Data Contract / DataContractViolationError', 'Project and minimize the payload.'],
              ['Delegation expired or exhausted', 'Bound reached', 'Delegation / DelegationError', 'Create a new least-authority Grant.'],
              ['Approval required or expired', 'High-impact policy', 'Approval / ApprovalRequiredError', 'Obtain a new exact Decision.'],
              ['Task timeout', 'Deadline elapsed', 'Tasks / DeadlineExceededError', 'Inspect status before a safe retry.'],
              ['Cancellation rejected', 'Terminal or non-cancellable Task', 'Tasks / GhostBridgeError', 'Observe the existing outcome.'],
              ['Receipt invalid', 'Digest, scope, version, or proof mismatch', 'Receipts / ProtocolValidationError', 'Treat outcome as unverified.'],
              ['Revocation cache stale', 'Invalidation lag', 'Revocation / RevokedError', 'Refresh authoritative status.'],
              ['Rate limited', 'Bounded capacity', 'Messages / RateLimitedError', 'Respect retryAfterMs.'],
              ['Provider unavailable', 'Peer unavailable', 'Connection / ProviderUnavailableError', 'Use bounded backoff for safe requests.'],
            ],
          ),
        ],
      },
      {
        heading: 'Safe diagnostics',
        content: [bullets('Correlate request IDs and trace IDs.', 'Use bounded structured logs.', 'Increase verbosity only for local synthetic fixtures.', 'Redact production payloads and never log credentials.', 'Reproduce with conformance checks.')],
      },
    ],
  },
  '/docs/security/authentication': {
    title: 'Authentication',
    description: 'Determine who or what is presenting a request.',
    sections: [
      {
        heading: 'Authentication modes',
        content: [table(['Mode category', 'Use'], [['none', 'Local fixtures only.'], ['oauth', 'Delegated user or application authentication.'], ['mutual_tls', 'Mutual certificate identity.'], ['signed_request', 'Message-bound proof.'], ['managed_credential', 'Operator-managed secret.'], ['delegated_credential', 'Narrow delegated credential.'], ['platform_brokered', 'Compatible operator brokerage.']])],
      },
      {
        heading: 'Requirements',
        content: [bullets('Use HTTPS remotely.', 'Validate exact issuer and audience.', 'Use short-lived credentials and secure storage.', 'Never put credentials in Passports, Connection Offers, URLs, or logs.', 'Use PKCE for browser authorization where applicable.')],
      },
    ],
  },
  '/docs/security/authorization': {
    title: 'Authorization',
    description: 'Determine whether a subject may perform a capability in an Organization and Workspace.',
    sections: [
      {
        heading: 'Trust concepts are distinct',
        content: [table(['Concept', 'What it authorizes'], [['Authentication', 'Establishes the presenting subject.'], ['Agent Passport', 'Establishes verifiable agent identity and declarations.'], ['Install Grant', 'Authorizes installation only.'], ['Agent Connection', 'Establishes an installed scoped relationship.'], ['Delegation Grant', 'Transfers narrowly bounded agent-to-agent authority.'], ['Approval Decision', 'Authorizes one exact high-impact action.'], ['Data Contract', 'Controls information crossing an agent boundary.'], ['Execution Receipt', 'Provides outcome evidence; grants no authority.'], ['Revocation', 'Invalidates trust or authority.']])],
      },
      {
        heading: 'Evaluation order',
        content: [steps('Authenticate the subject.', 'Validate Passport and revocation.', 'Validate Organization and Workspace.', 'Require active installation.', 'Evaluate RBAC and policy.', 'Validate capability, delegation, and Data Contract.', 'Require approval where declared.', 'Accept one bounded Invocation.')],
      },
      {
        heading: 'Tenant isolation',
        content: ['Authority never inherits across Organizations or Workspaces. Scope filtering occurs before capability ranking and before sensitive detail retrieval.'],
      },
    ],
  },
  '/sdks/typescript/protocol-core': {
    title: '@ghostbridge/protocol-core',
    description: 'Portable constants, public types, validators, bounded wire utilities, extension negotiation, redaction, and proof interfaces.',
    sections: [
      {
        heading: 'Public API',
        content: [table(['API', 'Signature and return'], [
          ['parseProtocolVersion', '(value: string) → parsed protocol revision'],
          ['negotiateVersion', '(options) → selectedVersion, stability, warnings'],
          ['safeParse / boundedSerialize', '(wire value, limits?) → validated plain data or JSON'],
          ['validatePassport', '(AgentPassport, options?) → AgentPassport'],
          ['validateCapabilityContract', '(CapabilityContract) → CapabilityContract'],
          ['projectDataContract', '(input, DataContract, options?) → projected object'],
          ['validateExtensionIdentifier', '(identifier: string) → normalized identifier'],
          ['negotiateExtensions', '({ client, agent }) → negotiated and unavailable optional extensions'],
          ['redactPublicData', '(value) → recursively redacted public data'],
          ['digest', '(value) → deterministic SHA-256 digest'],
        ])],
      },
      {
        heading: 'Errors and compatibility',
        content: ['Validators throw GhostBridgeProtocolError with a bounded errorCode and safeMessage. The current implementation targets Node.js 20; portable types and validation surfaces are designed for browser-safe separation where practical.'],
      },
      {
        heading: 'Protocol requirement',
        content: ['All APIs currently target ghostbridge/0.1-draft and are Experimental. Node-specific schema loading and cryptographic helpers are isolated public concerns and the package imports no database, backend, frontend, Platform, or legacy adapter.'],
      },
    ],
  },
  '/sdks/typescript/native-client': {
    title: '@ghostbridge/native-client',
    description: 'Typed discovery, installation, progressive capability search, invocation, Tasks, approvals, Receipts, and revocation.',
    sections: [
      {
        heading: 'Create a client',
        content: [code('typescript', `const client = createGhostBridgeClient({
  baseUrl: "https://agent.example",
  timeoutMs: 10_000,
  fetch: globalThis.fetch,
});`)],
      },
      {
        heading: 'Methods',
        content: [table(['Method', 'Parameters and return'], [
          ['discover', '() → DiscoveryDocument'],
          ['negotiateVersion', '(options?) → version selection'],
          ['resolveInstallGrant / install', '(grant, scope) → resolution / Agent Connection'],
          ['getPassport', '() → validated AgentPassport'],
          ['listCapabilities', '() → complete public contracts for compatibility'],
          ['searchCapabilities', '(ScopedCapabilityQuery) → bounded catalog page'],
          ['getCapabilityDetails', '(CapabilityDetailsQuery) → one permitted contract'],
          ['invoke / invokeAndWait', '(connection+envelope or InvokeOptions) → InvocationResult'],
          ['getTask / watchTask / cancelTask', '(taskId, options?) → task state or async updates'],
          ['submitApprovalDecision', '(challengeId, decision) → accepted decision'],
          ['getReceipt / verifyReceipt', '(receipt or ID, verifier?) → Receipt verification'],
          ['checkRevocation', '(subjectType, reference) → RevocationStatus'],
          ['close', '() → clears client state'],
        ])],
      },
      {
        heading: 'Safe errors',
        content: ['Methods expose GhostBridgeError subclasses for validation, unsupported versions, Passports, grants, capabilities, scope, delegation, Data Contracts, approvals, deadlines, cancellation, revocation, rate limiting, and unavailability. Remote stack traces are never accepted.'],
      },
      {
        heading: 'Runtime compatibility',
        content: ['Node.js 20 and browser environments with Fetch, AbortController, Web Crypto-compatible UUID support, and TextEncoder are intended targets. A configurable Fetch implementation supports deterministic tests.'],
      },
    ],
  },
  '/sdks/typescript/native-agent': {
    title: '@ghostbridge/native-agent',
    description: 'Production draft API for registering governed capabilities and serving the Native HTTPS/JSON binding.',
    sections: [
      {
        heading: 'Create and configure',
        content: [code('typescript', `const agent = createGhostBridgeAgent({ passport });
agent
  .configureDiscovery(discovery)
  .configureAuthorization(authorize)
  .configureTaskStore(taskStore)
  .configureApprovalHandler(onApproval)
  .configureReceiptIssuer(issueReceipt)
  .configureRevocationResolver(resolveRevocation)
  .configureLogger(logger)
  .configureMetrics(recordMetric);`)],
      },
      {
        heading: 'Capability registration',
        content: ['registerCapability and capability accept typed input/output, schemas or Data Contract references, version, risk, side effects, approval, idempotency, cancellation, asynchronous execution, timeout bounds, Receipt profile, delegation policy, and a handler.'],
      },
      {
        heading: 'Safe handler context',
        content: [bullets('Organization and Workspace scope, Invocation and Task IDs.', 'Initiating subject, deadline, idempotency key, and trace context.', 'Approval and delegation references.', 'AbortSignal and a logger that strips credentials and payload fields.')],
      },
      {
        heading: 'Lifecycle methods',
        content: [table(['Method', 'Purpose'], [['listen / close', 'Start or stop a Native loopback or configured HTTP binding.'], ['searchCapabilities', 'Return a scoped bounded catalog.'], ['getCapabilityDetails', 'Return one scoped contract.'], ['issueInstallGrant', 'Issue a high-entropy, expiring one-time grant.'], ['invoke', 'Authorize and execute one Invocation Envelope.'], ['getTask / cancelTask', 'Observe or request cancellation.'], ['getReceipt', 'Retrieve bounded outcome evidence.'], ['revokeConnection', 'Authoritatively stop future use.']])],
      },
    ],
  },
  '/sdks/typescript/conformance': {
    title: '@ghostbridge/conformance',
    description: 'Deterministic localhost-only draft conformance checks.',
    sections: [
      {
        heading: 'CLI',
        content: [code('powershell', 'npx ghostbridge-conformance --target http://127.0.0.1:8787 --level 3')],
      },
      {
        heading: 'API',
        content: [table(['API', 'Return'], [['runConformance', 'Structured checks, status, and bounded findings.'], ['assertLocalTarget', 'Validated loopback target or a safe rejection.'], ['conformanceLevels', 'Draft Level 1–3 definitions.']])],
      },
      {
        heading: 'Safety',
        content: ['Remote targets are rejected. Conformance uses deterministic synthetic fixtures and makes no provider, billing, or production request.'],
      },
    ],
  },
  '/sdks/typescript/inspector': {
    title: '@ghostbridge/inspector',
    description: 'Local-only sanitized protocol inspection API and development UI.',
    sections: [
      {
        heading: 'API',
        content: [table(['API', 'Purpose'], [['assertInspectorTarget', 'Accept loopback or require two explicit unsafe-remote flags.'], ['GhostBridgeInspector', 'Inspect discovery, Passport, capabilities, installation, Invocation, Tasks, approval, Receipts, and revocation.'], ['sanitizeInspectorValue', 'Remove secret-shaped fields and sensitive headers.'], ['startInspectorUi', 'Serve the loopback-only local Inspector UI.']])],
      },
      {
        heading: 'Errors',
        content: ['InspectorSecurityError rejects remote, credential-bearing, non-HTTP, or non-loopback UI targets. Protocol operations retain bounded typed SDK errors.'],
      },
      {
        heading: 'Compatibility',
        content: ['Node.js 20 only for the Inspector server and CLI. The package is private and is not published in Phase 15B.'],
      },
    ],
  },
  '/extensions/overview': {
    title: 'Extensions overview',
    description: 'Optional namespaced additions that do not immediately modify the core protocol.',
    sections: [
      {
        heading: 'Extension contract',
        content: [bullets('Use a reverse-domain identifier such as com.example/feature-name.', 'The io.ghostbridge namespace is reserved for official work.', 'Declare version, state, required or optional behavior, references, and security considerations.', 'Negotiate client and agent support explicitly.')],
      },
      {
        heading: 'Security invariants',
        content: [bullets('Extensions cannot replace core security checks.', 'They cannot weaken scope isolation, revocation, Data Contracts, or approval.', 'They cannot expose credentials or load third-party executable code.', 'Unknown optional behavior degrades safely; unknown required behavior fails.')],
      },
    ],
  },
  '/extensions/negotiation': {
    title: 'Extension negotiation',
    description: 'Match identifier and version independently from protocol revision negotiation.',
    sections: [
      {
        heading: 'Negotiation behavior',
        content: [code('typescript', `const result = negotiateExtensions({
  client: [{ identifier: "io.ghostbridge/display-metadata", version: "1.0.0", status: "experimental", required: false }],
  agent: [{ identifier: "io.ghostbridge/display-metadata", version: "1.0.0", status: "experimental", required: false }],
});`)],
      },
      {
        heading: 'Graceful degradation',
        content: ['An unsupported optional extension is reported in unavailableOptional. Unsupported required behavior or required version conflict fails negotiation.'],
      },
    ],
  },
  '/extensions/official': {
    title: 'Official extensions',
    description: 'Reserved official namespace and current reference extension.',
    sections: [
      {
        heading: 'io.ghostbridge/display-metadata',
        content: [table(['Field', 'Value'], [['State', 'Experimental'], ['Version', '1.0.0'], ['Required', 'No'], ['Authority impact', 'None'], ['Purpose', 'Optional presentation labels and hints only.']])],
      },
    ],
  },
  '/specification/0.1-draft': {
    title: 'Ghost Bridge Native 0.1 Draft',
    description: 'Experimental identity-first wire protocol specification.',
    sections: [
      {
        heading: 'Normative language',
        content: ['MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, NOT RECOMMENDED, MAY, and OPTIONAL express requirement strength in this draft. The draft does not claim adoption of a normative-keyword RFC.'],
      },
      {
        heading: 'Specification navigation',
        content: [table(['Group', 'Subjects'], [['Specification', 'Overview, key changes, architecture.'], ['Base Protocol', 'Lifecycle, discovery, version negotiation, transport, authentication, authorization, errors, extensions.'], ['Identity and Installation', 'Passport, issuer, Install Grant, Connection Offer, Connection, revocation.'], ['Capabilities and Execution', 'Capability Contract, Invocation, Task, cancellation, progress, Receipt.'], ['Agent Coordination', 'Delegation, Data Contract, Approval Challenge and Decision.'], ['Schema Reference', 'Common and every public message schema.']])],
      },
      {
        heading: 'Transport binding',
        content: ['The current binding uses HTTPS/JSON for remote deployments. It defines framing and authentication binding but requires no particular database, queue, storage engine, cloud, model provider, or commercial control plane.'],
      },
      { heading: 'Status', content: sharedStatus },
    ],
  },
  '/registry': {
    title: 'Ghost Bridge Registry Preview',
    description: 'Public metadata discovery using reference agents and deterministic fixtures only.',
    featureState: 'Preview',
    sections: [
      {
        heading: 'Preview notice',
        content: [note('warning', 'Ghost Bridge Registry is currently in preview', 'Available data contains only reference agents and synthetic fixtures. It is not evidence of a broad public ecosystem.')],
      },
      {
        heading: 'Reference agents',
        content: [table(['Agent', 'Capabilities', 'Status'], [['Invoice Summary Agent', 'invoice.extract, invoice.validate', 'Reference fixture'], ['Accounting Agent', 'accounting.check_duplicate, accounting.create_draft', 'Reference fixture']])],
      },
      {
        heading: 'Public projection',
        content: ['Listings include safe Passport declarations, protocol version, public capabilities, risk, side effects, approval, receipts, conformance, and revocation status. They exclude credentials, customer records, installations, private endpoints, policy decisions, and tokens.'],
      },
    ],
  },
  '/registry/agents/invoice-agent': {
    title: 'Invoice Summary Agent',
    description: 'Deterministic reference agent for invoice extraction and validation.',
    featureState: 'Preview',
    sections: [{ heading: 'Public capabilities', content: [table(['Capability', 'Risk', 'Side effect', 'Approval'], [['invoice.extract', 'Low', 'None', 'No'], ['invoice.validate', 'Moderate', 'None', 'No']])]}, { heading: 'Trust status', content: [table(['Field', 'Value'], [['Issuer', 'Ghost Bridge reference fixtures'], ['Protocol', 'ghostbridge/0.1-draft'], ['Passport', 'Active synthetic fixture'], ['Revocation', 'Not revoked'], ['Conformance', 'Draft Level 1–3 fixture']])]}],
  },
  '/registry/agents/accounting-agent': {
    title: 'Accounting Agent',
    description: 'Deterministic reference agent for duplicate checks and approval-bound draft creation.',
    featureState: 'Preview',
    sections: [{ heading: 'Public capabilities', content: [table(['Capability', 'Risk', 'Side effect', 'Approval'], [['accounting.check_duplicate', 'Moderate', 'Read', 'No'], ['accounting.create_draft', 'High', 'Reversible write', 'Required']])]}, { heading: 'Trust status', content: [table(['Field', 'Value'], [['Issuer', 'Ghost Bridge reference fixtures'], ['Protocol', 'ghostbridge/0.1-draft'], ['Passport', 'Active synthetic fixture'], ['Revocation', 'Not revoked'], ['Receipt support', 'Yes']])]}],
  },
  '/registry/publishing': {
    title: 'Registry publishing',
    description: 'Planned publishing checks; public self-service publishing is not implemented.',
    featureState: 'Planned',
    sections: [{ heading: 'Future process', content: [steps('Verify issuer and namespace ownership.', 'Validate Passport and Schemas.', 'Review conformance results.', 'Moderate public metadata.', 'Publish updates and process revocation.')]}, { heading: 'Phase 15B boundary', content: [note('info', 'Documentation only', 'There is no real self-service publishing, DNS verification, marketplace, or checkout in Phase 15B.')]}],
  },
  '/gbeps/0001': {
    title: 'GBEP-0001: Process and governance',
    description: 'Defines the initial Ghost Bridge Enhancement Proposal process.',
    sections: [{ heading: 'Summary', content: ['GBEPs provide a transparent path for protocol, process, informational, and extension changes. Proposals do not merge automatically and require owner review.']}, { heading: 'Lifecycle', content: [diagram('GBEP lifecycle', ['Draft', 'Review', 'Accepted or Rejected', 'Final', 'Superseded or Withdrawn'])]}, { heading: 'Security and compatibility', content: ['Every standards or extensions proposal documents security, privacy, compatibility, reference implementation, and conformance impact.']}],
  },
  '/gbeps/0002': {
    title: 'GBEP-0002: Extension lifecycle',
    description: 'Defines Experimental, Candidate, Official, Deprecated, and Removed extension states.',
    sections: [{ heading: 'Summary', content: ['Extensions advance only with implementation evidence, security review appropriate to their risk, documentation, compatibility analysis, and conformance coverage.']}, { heading: 'States', content: [diagram('Extension lifecycle', ['Experimental', 'Candidate', 'Official', 'Deprecated', 'Removed'])]}],
  },
  '/community/governance': {
    title: 'Governance',
    description: 'Current project ownership and the path toward broader neutral governance.',
    sections: [{ heading: 'Current state', content: [note('info', 'Initial project governance', 'Current ownership remains with the project owner. Neutral governance does not yet exist.')]}, { heading: 'Decision process', content: [steps('Open a documented issue or GBEP.', 'Record motivation, security, privacy, compatibility, and alternatives.', 'Collect implementation and conformance evidence.', 'Owner reviews and records a decision.', 'Accepted work follows the release process.')]}, { heading: 'Future goal', content: ['A broader neutral-governance model is a future goal and requires explicit owner and legal review.']}],
  },
};

const phase15b1Detailed = {
  '/docs/get-started/what-is-ghost-bridge': {
    title: 'What is Ghost Bridge?',
    description: 'The universal Host Application to External Agent protocol.',
    aliases: ['cross-company agent integration', 'external AI agent', 'universal agent installation'],
    sections: [
      {
        heading: 'The primary model',
        content: [
          'A provider publishes one external Native Agent. A compatible Host Application verifies its Passport, previews protocol-profile and extension compatibility, negotiates authentication, installs approved capabilities, invokes them, observes Tasks and Receipts, and can revoke the connection.',
          diagram('Universal relationship', ['Agent Provider → External Native Agent', 'opaque Install Grant → Host Application', 'Host Application → Invocation → External Agent', 'External Agent → Task and Receipt → Host Application']),
        ],
      },
      {
        heading: 'Protocol profiles',
        content: [table(['Profile', 'Status', 'Conformance'], [
          ['Core', 'Active', 'C1 discovery and identity; C2 installation and authentication; C3 execution lifecycle'],
          ['Governed Execution', 'Active', 'G1 scoped access; G2 policy, data, and approval; G3 durable auditable execution'],
          ['Agent Coordination', 'Experimental/Deferred', 'Not required for Core or Governed compatibility'],
        ])],
      },
      {
        heading: 'Why it matters',
        content: [bullets(
          'Hosts integrate the protocol once instead of shipping provider-specific adapters.',
          'Users supply an opaque Install Grant, not a remote endpoint or credential.',
          'Providers publish bounded capability contracts and remain independent of host internals.',
          'Compatibility failures are visible before installation.',
        )],
      },
      { heading: 'Protocol status', content: sharedStatus },
    ],
  },
  '/docs/get-started/quickstart': {
    title: 'Quickstart: add an external agent',
    description: 'Run the independent CodeForge Provider and FlowDesk Host compatibility fixture.',
    aliases: ['cross-company agent quickstart', 'install external agent'],
    sections: [
      { heading: 'Prerequisites', content: [bullets('Node.js 20 or newer.', 'A repository checkout.', 'No database, provider credential, paid API, or external service.')] },
      { heading: 'Run the universal flow', content: [
        code('powershell', 'npm.cmd install\nnpm.cmd run verify:universal-agent-compatibility'),
        code('bash', 'npm install\nnpm run verify:universal-agent-compatibility'),
      ] },
      { heading: 'What the verifier proves', content: [steps(
        'CodeForge publishes a Passport, Core profile, authentication modes, and create-app capability.',
        'FlowDesk resolves the opaque grant without a provider adapter or user-entered endpoint.',
        'The host previews compatibility and installs only approved capabilities.',
        'The host invokes the agent, observes a durable Task, verifies its Receipt, and revokes the connection.',
      )] },
      { heading: 'Next', content: [bullets('Build an Agent.', 'Build a Host.', 'Add Governed Execution when enterprise controls are required.')] },
    ],
  },
  '/docs/get-started/add-external-agent': {
    title: 'Add an external agent',
    description: 'The ordinary Host Application installation journey.',
    sections: [
      { heading: 'Installation journey', content: [steps(
        'Paste the opaque Install Grant supplied by the agent provider.',
        'Choose the organization and, when applicable, workspace.',
        'Review verified identity, profiles, authentication, extensions, and requested capabilities.',
        'Approve only the capabilities the host policy permits.',
        'Complete negotiated authentication and create the Agent Connection.',
      )] },
      { heading: 'What users never enter', content: [bullets('Remote agent endpoints.', 'Provider access tokens.', 'Provider-specific adapter settings.', 'Private runtime credentials.')] },
    ],
  },
  '/docs/get-started/core-vs-governed': {
    title: 'Core versus Governed Execution',
    description: 'Choose the smallest active profile that satisfies the integration.',
    sections: [
      { heading: 'Comparison', content: [table(['Concern', 'Core', 'Governed Execution'], [
        ['Universal installation', 'Required', 'Includes Core'],
        ['Capability invocation', 'Required', 'Required'],
        ['Organization/workspace policy', 'Basic scope', 'Enforced controls'],
        ['Data Contracts and approvals', 'Optional extension behavior', 'G2 requirement'],
        ['Idempotent durable audit trail', 'Core task and receipt', 'G3 requirement'],
        ['Agent-to-agent delegation', 'Not required', 'Not required'],
      ])] },
    ],
  },
  '/docs/develop/build-host': {
    title: 'Build a Host Application',
    description: 'Integrate one generic resolver-backed Native Client for any compatible external agent.',
    aliases: ['build client', 'universal host', 'host application SDK'],
    sections: [
      { heading: 'Create the generic client', content: [code('typescript', `import { createGhostBridgeClient } from "@ghostbridge/native-client";

const host = createGhostBridgeClient({
  installGrantResolver: resolveOpaqueGrant,
  issuerKeyResolver: resolveIssuerKey,
  authenticationHandler: authenticateUser,
  requiredProfiles: ["ghostbridge.core"],
});`)] },
      { heading: 'Preview and install', content: [code('typescript', `const preview = await host.previewInstall({ grant, organizationScope, workspaceScope });
if (preview.compatibility.status === "incompatible") throw new Error("Incompatible agent");

const connection = await host.install({
  grant,
  organizationScope,
  workspaceScope,
  approvedCapabilityKeys: preview.capabilities.map(({ capabilityKey }) => capabilityKey),
});`)] },
      { heading: 'Provider independence', content: [bullets('Resolve opaque grants through infrastructure configured by the host operator.', 'Do not branch on provider names.', 'Do not require users to paste endpoints or credentials.', 'Treat Passport, profile, authentication, extension, and capability declarations as untrusted until validated.')] },
      { heading: 'Complete host checklist', content: [steps(
        'Create the Host Application project and install @ghostbridge/native-client.',
        'Configure the opaque-grant resolver and issuer-key resolution.',
        'Configure host-supported profiles, extensions, and authentication handlers.',
        'Accept an Install Grant from the user.',
        'Preview the external Agent and verify its Passport.',
        'Negotiate the protocol version, profiles, extensions, and authentication mode.',
        'Inspect Capability Contracts and approve an enabled subset.',
        'Complete authentication and create the Agent Connection.',
        'Invoke an approved capability and watch its Execution Task.',
        'Handle Approval Required when Governed Execution policy requests it.',
        'Validate output, verify the Receipt, and handle standard errors.',
        'Revoke the Agent Connection when access must end.',
      )] },
    ],
  },
  '/docs/develop/install-external-agent': {
    title: 'Install an external agent',
    description: 'Preview compatibility, approve capabilities, authenticate, and create a scoped connection.',
    sections: [
      { heading: 'Compatibility gate', content: [bullets('Negotiate a common protocol version.', 'Require Core support.', 'Require Governed Execution only when host policy needs it.', 'Negotiate an authentication mode.', 'Fail closed for unsupported required extensions.')] },
      { heading: 'Safe preview', content: ['The preview contains only public identity, profile, extension, and capability metadata. It excludes the opaque grant, runtime target, authentication reference, credentials, and private policy detail.'] },
    ],
  },
  '/docs/develop/publish-agent-compatibility': {
    title: 'Publish Agent Compatibility',
    description: 'Declare enough public metadata for any conforming Host to evaluate an Agent.',
    sections: [
      { heading: 'Publish declarations', content: [bullets('Supported protocol versions and Core conformance.', 'Optional Governed Execution conformance.', 'Supported authentication modes.', 'Extension declarations with applicable profiles and required status.', 'A verifiable Agent Passport and bounded Capability Contracts.')] },
      { heading: 'Provider boundary', content: ['Publish protocol declarations, not a Host-specific adapter. Runtime resolution remains machine-facing and users receive an opaque Install Grant or Registry action.'] },
      { heading: 'Verify', content: [code('powershell', 'npm.cmd run verify:universal-agent-compatibility')] },
    ],
  },
  '/docs/develop/invoke-installed-agent': {
    title: 'Invoke an installed agent',
    description: 'Invoke an approved capability through its active Agent Connection.',
    sections: [
      { heading: 'Invoke', content: [code('typescript', `const result = await host.invoke({
  connectionId: connection.connectionId,
  capability: "codeforge.create_app",
  input: { name: "Acme Portal", template: "react" },
  idempotencyKey: "create-acme-portal-v1",
});`)] },
      { heading: 'Validate the lifecycle', content: [bullets('Validate declared input and output contracts.', 'Observe the Execution Task until terminal.', 'Verify the Execution Receipt.', 'Stop all future use after revocation.')] },
    ],
  },
  '/docs/governed/overview': {
    title: 'Governed Execution',
    description: 'Enterprise controls for direct Host Application to External Agent execution.',
    aliases: ['enterprise agent controls', 'governed agent integration'],
    sections: [
      { heading: 'Active profile', content: ['Governed Execution builds on Core. It does not require agent-to-agent delegation.'] },
      { heading: 'Levels', content: [table(['Level', 'Required behavior'], [
        ['G1', 'Organization/workspace isolation, authentication, and user authorization.'],
        ['G2', 'Capability policy, Data Contract enforcement, prohibited-field blocking, and action-bound approval.'],
        ['G3', 'Idempotent side effects, durable Tasks, Receipts, failure semantics, and revocation.'],
      ])] },
      { heading: 'Reference flow', content: ['The deterministic LedgerWorks Provider and OpsCanvas Host verifier exercises G1-G3 without delegation.'] },
    ],
  },
  '/docs/governed/organizations-workspaces': {
    title: 'Organizations and Workspaces',
    description: 'Bind every governed installation and Invocation to exact tenant scope.',
    sections: [{ heading: 'Isolation', content: [bullets('Reject organization mismatch before installation.', 'Reject workspace mismatch before installation or execution.', 'Bind authentication and authorization evidence to the same scope.', 'Never fall back to a broader organization or workspace.')] }],
  },
  '/docs/governed/capability-policies': {
    title: 'Capability Policies',
    description: 'Install and execute only the capabilities permitted by Host policy.',
    sections: [{ heading: 'Least capability', content: ['The Host approves an explicit subset during installation. Disabled or later-revoked capabilities fail with a bounded authorization error.'] }],
  },
  '/docs/governed/durable-tasks': {
    title: 'Durable Tasks and Idempotency',
    description: 'Make side effects replay-safe and execution state observable.',
    sections: [{ heading: 'G3 requirements', content: [bullets('Require idempotency for side-effecting capabilities.', 'Return one result for repeated keys.', 'Expose bounded Task state and cancellation support.', 'Retain audit-safe references without credentials.')] }],
  },
  '/docs/governed/receipts-revocation': {
    title: 'Receipts and Revocation',
    description: 'Verify outcome evidence and stop future use authoritatively.',
    sections: [{ heading: 'Evidence and invalidation', content: ['A Receipt binds the completed outcome to its execution references. Revoking the Connection prevents every later Invocation through that relationship.'] }],
  },
  '/docs/experimental/agent-coordination': {
    title: 'Agent Coordination',
    description: 'Experimental/Deferred agent-to-agent coordination concepts.',
    featureState: 'Experimental',
    sections: [
      { heading: 'Status', content: [note('warning', 'Experimental/Deferred', 'Agent Coordination is not part of Core or Governed Execution conformance and is not required for universal Host Application to External Agent integration.')] },
      { heading: 'Retained work', content: ['Delegation and two-agent reference code remain available as experimental implementation evidence. They are not presented as the primary product path.'] },
    ],
  },
  '/docs/learn/architecture': {
    title: 'Architecture',
    description: 'Participants, trust boundaries, active profiles, and the universal host-agent flow.',
    sections: [
      { heading: 'Primary participants', content: [table(['Participant', 'Responsibility'], [
        ['Agent Provider', 'Publishes and operates an external Native Agent.'],
        ['External Native Agent', 'Declares identity, profiles, authentication, extensions, and capabilities.'],
        ['Host Application', 'Resolves grants, evaluates compatibility, authenticates, installs, invokes, and revokes.'],
        ['Organization and Workspace', 'Bound the installed relationship and execution.'],
        ['Registry', 'Optional public metadata discovery; never a runtime credential store.'],
      ])] },
      { heading: 'Universal host-agent flow', content: [diagram('Direct integration', ['Provider publishes Agent', 'Host resolves opaque grant', 'Host verifies Passport and compatibility', 'Host installs approved capabilities', 'Host invokes Agent', 'Host verifies Task and Receipt', 'Host revokes Connection'])] },
      { heading: 'Protocol profiles', content: [bullets('Core is the required universal baseline.', 'Governed Execution adds policy, data, approval, idempotency, and audit controls.', 'Agent Coordination is Experimental/Deferred and never implied by Core or Governed Execution.')] },
      { heading: 'Trust boundaries', content: ['Each side independently validates remote data. The resolver is host infrastructure, the runtime target is not shown in preview, and authentication material is never placed in the public protocol model.'] },
      { heading: 'Transport and storage', content: ['The current binding is HTTPS/JSON. The protocol does not require a database, queue, cloud, model provider, commercial platform, or MCP transport.'] },
      { heading: 'Revocation', content: ['Connection revocation is authoritative: subsequent invocations fail closed.'] },
      { heading: 'Experimental coordination', content: ['Multi-agent delegation remains a separate future profile and does not sit on the critical path shown above.'] },
    ],
  },
  '/docs/tools/conformance-cli': {
    title: 'Conformance CLI',
    description: 'Run deterministic Core C1-C3 and Governed Execution G1-G3 checks.',
    sections: [
      { heading: 'Active profiles', content: [table(['Command', 'Coverage'], [
        ['verify-core-c1', 'Discovery, Passport, and revocation declarations.'],
        ['verify-core-c2', 'C1 plus installation and authentication negotiation.'],
        ['verify-core-c3 / verify-core', 'C1-C2 plus capabilities, invocation, Tasks, Receipts, and revocation.'],
        ['verify-governed-g1', 'Core plus organization/workspace isolation and authorization.'],
        ['verify-governed-g2', 'G1 plus policy, Data Contracts, prohibited fields, and approval.'],
        ['verify-governed-g3 / verify-governed', 'G1-G2 plus idempotent durable auditable execution.'],
      ])] },
      { heading: 'Legacy aliases', content: [note('warning', 'Deprecated naming', 'verify-level-1 through verify-level-3 remain compatibility aliases. They do not make Agent Coordination a Core or Governed requirement.')] },
      { heading: 'Local safety', content: ['The draft CLI accepts deterministic localhost fixtures only and makes no live provider request.'] },
    ],
  },
  '/docs/tools/inspector': {
    title: 'Ghost Bridge Inspector',
    description: 'Inspect profiles, installation, authentication, capability contracts, and execution safely.',
    sections: [
      { heading: 'Primary tabs', content: [bullets('Connection and Passport.', 'Profiles and Capabilities.', 'Install Preview and Authentication.', 'Invocation, Tasks, Receipts, and Revocation.', 'Sanitized Messages and Logs.')] },
      { heading: 'Experimental section', content: ['Agent Coordination is grouped separately as Experimental. It is not the default Inspector path.'] },
      { heading: 'Safety boundary', content: ['Inspector defaults to loopback, rejects credential-bearing targets, and redacts authorization headers, cookies, tokens, and secret-shaped fields.'] },
    ],
  },
  '/docs/reference/profiles': {
    title: 'Protocol Profiles',
    description: 'Active and experimental compatibility profiles for Ghost Bridge Native.',
    sections: [
      { heading: 'Core', content: ['Core is active and required. C1 covers discovery and identity, C2 installation and authentication, and C3 the execution lifecycle.'] },
      { heading: 'Governed Execution', content: ['Governed Execution is active and includes Core. G1 covers scoped access, G2 policy/data/approval, and G3 idempotent durable auditability.'] },
      { heading: 'Agent Coordination', content: [note('warning', 'Experimental/Deferred', 'Coordination, delegation, and multi-agent flows are not required for either active profile.')] },
    ],
  },
  '/docs/reference/standard-errors': {
    title: 'Standard Errors',
    description: 'Safe compatibility, contract, authorization, and execution failures.',
    sections: [
      { heading: 'Compatibility and authentication', content: [table(['Code', 'Meaning'], [
        ['NO_COMMON_PROTOCOL_VERSION', 'The Host and Agent share no supported protocol version.'],
        ['CORE_PROFILE_REQUIRED', 'The required Core profile is absent or unsupported.'],
        ['GOVERNED_PROFILE_REQUIRED', 'Host policy requires unsupported Governed Execution.'],
        ['NO_COMPATIBLE_AUTHENTICATION_MODE', 'No declared Agent mode is supported by the Host.'],
        ['REQUIRED_EXTENSION_UNSUPPORTED', 'A required Agent extension is unsupported.'],
      ])] },
      { heading: 'Contracts and execution', content: [table(['Code', 'Meaning'], [
        ['INPUT_CONTRACT_VIOLATION', 'Invocation input violates the bounded declared schema.'],
        ['OUTPUT_CONTRACT_VIOLATION', 'Agent output violates the bounded declared schema.'],
        ['AUTHENTICATION_REQUIRED', 'The negotiated authentication step is incomplete.'],
        ['AUTHORIZATION_DENIED', 'The subject or capability is not authorized.'],
        ['IDEMPOTENCY_REQUIRED', 'A side-effecting Invocation lacks an idempotency key.'],
        ['TASK_FAILED', 'Execution reached a bounded failed terminal state.'],
      ])] },
      { heading: 'Safety', content: ['Errors expose a stable code and safe message. They do not expose credentials, raw policy data, runtime targets, database records, or remote stack traces.'] },
    ],
  },
  '/specification/0.1-draft': {
    title: 'Ghost Bridge Native 0.1 Draft',
    description: 'Experimental Host Application to External Agent wire protocol.',
    sections: [
      { heading: 'Normative language', content: ['MUST, MUST NOT, SHOULD, and MAY express requirement strength in this draft.'] },
      { heading: 'Specification navigation', content: [table(['Group', 'Subjects'], [
        ['Profiles', 'Core C1-C3, Governed Execution G1-G3, and Experimental/Deferred Agent Coordination.'],
        ['Discovery and Identity', 'Version negotiation, Passport, issuer verification, and revocation.'],
        ['Installation', 'Opaque Install Grant resolution, compatibility preview, authentication, Connection Offer, and Connection.'],
        ['Capabilities and Execution', 'Capability Contract, Invocation, Task, cancellation, Receipt, and standard errors.'],
        ['Governed Execution', 'Scope, authorization, policy, Data Contracts, approval, idempotency, and audit evidence.'],
        ['Experimental Coordination', 'Delegation and multi-agent behavior; not required by active profiles.'],
      ])] },
      { heading: 'Transport binding', content: ['The current binding uses HTTPS/JSON and requires no specific database, queue, cloud, model provider, commercial control plane, or MCP transport.'] },
      { heading: 'Status', content: sharedStatus },
    ],
  },
  '/community/roadmap': {
    title: 'Roadmap',
    description: 'Implemented foundation, current realignment, and honestly labeled future work.',
    sections: [
      { heading: 'Completed foundation', content: [bullets('Phase 15A — Protocol foundation.', 'Phase 15B — SDK and developer ecosystem.', 'Phase 15B.1 — Core/Governed realignment and universal compatibility.')] },
      { heading: 'Next', content: [bullets('Phase 15C — Production trust and issuer system.', 'Phase 15D — Conformance and certification hardening.', 'Phase 15F — Independent Python implementation.', 'Phase 15H — Security review, benchmarks, and Protocol 1.0.')] },
      { heading: 'Future profile', content: [note('warning', 'Agent Coordination remains future work', 'Direct agent-to-agent communication, delegated authority, delegation chains, and cross-vendor autonomous coordination are Experimental/Deferred.')] },
    ],
  },
};

const phase15cDetailed = {
  '/docs/security/trust-overview': {
    title: 'How a host verifies a real Agent Passport',
    description: 'Issuer identity, issuer discovery, Passport signature, public-key discovery, host trust policy, and revocation.',
    aliases: ['How does a host know an Agent Passport is real?', 'verify agent passport issuer trust'],
    sections: [
      { heading: 'Experimental security profile', content: [note('warning', 'Production-oriented, not certified', 'ghostbridge-trust/0.1-draft uses established cryptographic standards but has not completed an external audit, formal verification, or Protocol 1.0 stabilization.')] },
      { heading: 'Four separate results', content: [table(['Result', 'Meaning'], [
        ['Cryptographic validity', 'The protected JWS and exact signed content are valid.'],
        ['Issuer authenticity', 'A root pin or approved bootstrap binds the key chain to the exact HTTPS issuer.'],
        ['Host trust', 'Organization and workspace policy approve the issuer and requested use.'],
        ['Operational validity', 'Metadata, Passport, keys, Connection, capabilities, and revocation data are current.'],
      ])] },
      { heading: 'Verification chain', content: [steps('Normalize the exact issuer origin.', 'Discover and validate signed issuer metadata.', 'Load the bounded public JWKS and check thumbprints/key state.', 'Verify the Passport and signed Capability Manifest.', 'Apply organization and workspace trust policy.', 'Check the distributed signed revocation set before governed execution.')] },
    ],
  },
  '/docs/security/issuer-identity': {
    title: 'Issuer identity',
    description: 'Exact HTTPS issuer identity, root bootstrap, and business-trust boundaries.',
    sections: [
      { heading: 'Identity is an origin', content: ['A Passport Issuer is identified by a normalized HTTPS origin. A display name such as CodeForge is presentation only and never establishes identity. Explicit allowlisted localhost HTTP exists solely for local fixtures.'] },
      { heading: 'Bootstrap', content: [bullets('Pin approved root JWK thumbprints.', 'Require exact issuer metadata binding.', 'Review root or origin changes administratively.', 'Do not treat Registry listing as issuer approval.')] },
    ],
  },
  '/docs/security/issuer-discovery': {
    title: 'Issuer discovery',
    description: 'Safe well-known issuer metadata and public-key discovery without attacker-controlled key URLs.',
    sections: [
      { heading: 'Well-known endpoint', content: [code('http', 'GET {normalized issuer origin}/.well-known/ghostbridge-issuer')] },
      { heading: 'Network boundary', content: [bullets('HTTPS outside explicit local fixture mode.', 'No credentials, fragments, arbitrary schemes, private IPs, or proof-header URLs.', 'No redirects by default; bounded bytes and timeouts.', 'Same-origin JWKS and revocation endpoints by default.')] },
      { heading: 'Anti-rollback', content: ['Hosts persist the highest trusted metadata and revocation sequence and reject older signed snapshots.'] },
    ],
  },
  '/docs/security/passport-signing': {
    title: 'Passport signing and capability integrity',
    description: 'Issuer proofs, Capability Manifest digests, and Agent execution-key authorization.',
    sections: [
      { heading: 'What the proof binds', content: [bullets('Issuer, Passport and agent identity/version.', 'Profile, validity, status, transports, authentication, data, approval, Receipt, and revocation declarations.', 'Exact Capability Manifest digest.', 'Purpose-scoped Agent execution-key IDs and RFC 7638 thumbprints.')] },
      { heading: 'Substitution defense', content: ['The host requires set equality between delivered Capability Contracts and the signed manifest, then recomputes every contract digest. Risk, side effect, approval, Data Contract, idempotency, and Receipt changes require a new manifest.'] },
    ],
  },
  '/docs/security/key-management': {
    title: 'Key management',
    description: 'Purpose separation, non-exporting signer providers, public JWKS, and algorithm policy.',
    sections: [
      { heading: 'Key roles', content: [table(['Role', 'Routine authority'], [['Root / recovery', 'Issuer metadata and operational-key authorization'], ['Operational', 'Passport, manifest, installation, offer, and revocation proofs by purpose'], ['Agent execution', 'Runtime response and Execution Receipt evidence for one agent']])] },
      { heading: 'Algorithm policy', content: ['Ed25519 with JWS `EdDSA` is mandatory-to-implement for this draft. `none`, `HS*`, key-type confusion, unprotected identifiers, `jku`, `x5u`, embedded `jwk`, and unsupported critical headers are rejected.'] },
      { heading: 'Private-key boundary', content: ['Production signers operate through KeyProvider/IssuerSigner/AgentSigner interfaces. Private bytes are never returned by public APIs, JWKS, Inspector, logs, metrics, Receipts, or frontend state.'] },
    ],
  },
  '/docs/security/key-rotation': {
    title: 'Key rotation',
    description: 'Prepublication, activation overlap, retirement, compromise, and cache invalidation.',
    sections: [
      { heading: 'Overlapping rotation', content: [steps('Generate inside the key provider.', 'Prepublish the public key and increase metadata sequence.', 'Refresh host caches.', 'Activate the new key and move the old key to retiring.', 'Verify bounded old objects during overlap.', 'Retire the old key; never reuse its kid.')] },
      { heading: 'Compromise', content: ['Compromise stops new signatures, publishes higher-sequence emergency revocation, invalidates caches, blocks affected installation/Connections, and classifies historical evidence. Root compromise requires explicit out-of-band recovery.'] },
    ],
  },
  '/docs/security/revocation': {
    title: 'Distributed revocation',
    description: 'Signed issuer snapshots, freshness policy, rollback protection, and historical evidence.',
    sections: [
      { heading: 'Issuer-authoritative snapshots', content: ['Each issuer publishes a purpose-signed bounded revocation set with monotonic sequence, `nextUpdate`, and previous-set digest. Ghost Bridge does not require a global revocation authority.'] },
      { heading: 'Freshness', content: [table(['State', 'Host behavior'], [['fresh', 'Normal policy evaluation'], ['nearing_expiry', 'Refresh proactively'], ['stale / unavailable', 'Visible warning for allowed low-risk Core use; high-risk Governed defaults fail closed'], ['rollback_detected / invalid', 'Reject and alert']])] },
    ],
  },
  '/docs/security/request-integrity': {
    title: 'Request integrity',
    description: 'Negotiated signed-request authentication bound to content, Connection, audience, and nonce.',
    sections: [
      { heading: 'Draft profile', content: ['`ghostbridge-http-signature/0.1-draft` follows established HTTP Message Signature semantics and is one negotiated authentication profile, not a universal requirement.'] },
      { heading: 'Bound components', content: [bullets('Method and target path.', 'Canonical content digest.', 'Creation, expiry, message and Invocation IDs.', 'Connection, protocol, audience, nonce, and configured tenant scope.')] },
    ],
  },
  '/docs/security/replay-protection': {
    title: 'Replay protection and idempotency',
    description: 'Why authenticated-message replay and business-operation duplication are separate controls.',
    aliases: ['nonce replay cache', 'signed request replay'],
    sections: [
      { heading: 'Two questions', content: [table(['Control', 'Question'], [['Replay protection', 'Has this authenticated message already been presented?'], ['Idempotency', 'Should this business operation execute again?']])] },
      { heading: 'Required result', content: ['The first signed request succeeds. The identical authenticated request is rejected. A fresh valid request with the same business idempotency key may return the existing business result.'] },
    ],
  },
  '/docs/security/receipt-verification': {
    title: 'Receipt verification',
    description: 'Agent execution-key proof and explicit historical trust after retirement or compromise.',
    sections: [
      { heading: 'Current and historical evidence', content: ['Verification reports signature validity, authorization at issuance, current key state, current revocation, and compromise timing separately. Historical results include valid at issuance, valid with retired key, invalid due to revocation, and indeterminate due to compromise.'] },
      { heading: 'Evidence boundary', content: ['A valid signature proves who signed the declared bytes. It does not independently prove that a real-world outcome or vendor claim is true.'] },
    ],
  },
  '/docs/security/issuer-compromise': {
    title: 'Issuer compromise response',
    description: 'Operational-key, Agent-key, root-key, metadata, endpoint, and domain compromise handling.',
    sections: [
      { heading: 'Operational response', content: [steps('Mark the key compromised and stop signing.', 'Publish emergency revocation with a higher sequence.', 'Activate a prepublished replacement.', 'Invalidate host caches and block affected new trust operations.', 'Re-evaluate Connections and classify historical Receipts.', 'Audit and issue replacement Passports.')] },
      { heading: 'Root compromise', content: [note('warning', 'No silent recovery', 'Root or domain compromise requires issuer suspension, administrator review, and documented out-of-band recovery.')] },
    ],
  },
  '/docs/security/trust-policies': {
    title: 'Organization and workspace trust policies',
    description: 'Issuer approval, root pins, algorithms, risk, freshness, and unknown-issuer review.',
    sections: [
      { heading: 'Policy composition', content: ['Organization policy sets mandatory trust boundaries. Workspace policy may be stricter but cannot weaken them. Decisions are scoped and versioned; trusted results are never cached across organizations with different policy.'] },
      { heading: 'Unknown issuers', content: ['Allowed behaviors are block, administrator review, or limited Core-only use. Unknown issuers never silently receive high-impact Governed authority.'] },
    ],
  },
  '/docs/security/authentication-profiles': {
    title: 'Authentication profiles',
    description: 'Negotiated OAuth, mutual TLS, signed request, credential, and platform-brokered modes.',
    sections: [
      { heading: 'Connection-bound negotiation', content: ['Each mode declares discovery, host support, user interaction, credential boundary, audience, refresh, revocation, proof of possession, and safe errors. The selected mode is bound to the Connection and cannot silently downgrade.'] },
      { heading: 'Local fixtures', content: ['`none` is restricted to explicit safe local scenarios. Automated tests use deterministic synthetic authorization and do not call a live identity provider.'] },
    ],
  },
};

for (const slug of [
  'trust-profile',
  'issuer-identity',
  'issuer-discovery',
  'proof-profile',
  'key-discovery',
  'key-lifecycle',
  'key-rotation',
  'revocation-set',
  'audience-binding',
  'replay-protection',
  'request-integrity',
  'receipt-proof',
  'trust-errors',
]) {
  const documentationRoute = {
    'trust-profile': 'trust-overview',
    'proof-profile': 'passport-signing',
    'key-discovery': 'key-management',
    'key-lifecycle': 'key-management',
    'revocation-set': 'revocation',
    'audience-binding': 'request-integrity',
    'receipt-proof': 'receipt-verification',
    'trust-errors': 'trust-overview',
  }[slug] || slug;
  phase15cDetailed[`/specification/0.1-draft/${slug}`] = {
    ...phase15cDetailed[`/docs/security/${documentationRoute}`],
    title: `Specification: ${slug.replaceAll('-', ' ')}`,
    featureState: 'Experimental',
  };
}

const groups = [
  ['Get Started', [
    ['/docs/get-started/what-is-ghost-bridge', 'What is Ghost Bridge?'],
    ['/docs/get-started/quickstart', 'Quickstart'],
    ['/docs/get-started/add-external-agent', 'Add an External Agent'],
    ['/docs/get-started/core-vs-governed', 'Core vs Governed'],
  ]],
  ['Learn', [
    ['/docs/learn/architecture', 'Architecture'],
    ['/docs/learn/participants', 'Participants'],
    ['/docs/learn/protocol-layers', 'Protocol Layers'],
    ['/docs/learn/lifecycle', 'Lifecycle'],
    ['/docs/learn/protocol-and-platform', 'Protocol and Platform'],
    ['/docs/learn/versioning', 'Versioning'],
  ]],
  ['Build with Ghost Bridge', [
    ['/docs/develop/build-agent', 'Build an Agent'],
    ['/docs/develop/build-host', 'Build a Host'],
    ['/docs/develop/publish-agent-compatibility', 'Publish Agent Compatibility'],
    ['/docs/develop/install-external-agent', 'Install an External Agent'],
    ['/docs/develop/build-with-agent-skills', 'Build with Agent Skills'],
    ['/docs/develop/client-best-practices', 'Host Best Practices'],
    ['/docs/develop/capability-discovery', 'Capability Discovery'],
    ['/docs/develop/invoke-installed-agent', 'Invoke an Installed Agent'],
    ['/docs/develop/error-handling', 'Tasks and Error Handling'],
  ]],
  ['Governed Execution', [
    ['/docs/governed/overview', 'Overview'],
    ['/docs/governed/organizations-workspaces', 'Organizations and Workspaces'],
    ['/docs/security/authentication', 'Authentication'],
    ['/docs/security/authorization', 'User Authorization'],
    ['/docs/governed/capability-policies', 'Capability Policies'],
    ['/docs/core/data-contracts', 'Data Contracts'],
    ['/docs/core/approvals', 'Approvals'],
    ['/docs/security/data-boundaries', 'Data Boundaries'],
    ['/docs/security/replay-protection', 'Replay Protection and Idempotency'],
    ['/docs/governed/durable-tasks', 'Durable Tasks'],
    ['/docs/governed/receipts-revocation', 'Receipts and Revocation'],
    ['/docs/security/key-management', 'Key Management'],
    ['/docs/security/trust-overview', 'Trust Foundation'],
    ['/docs/security/issuer-identity', 'Issuer Identity'],
    ['/docs/security/issuer-discovery', 'Issuer Discovery'],
    ['/docs/security/passport-signing', 'Passport Signing'],
    ['/docs/security/key-rotation', 'Key Rotation'],
    ['/docs/security/revocation', 'Distributed Revocation'],
    ['/docs/security/request-integrity', 'Request Integrity'],
    ['/docs/security/receipt-verification', 'Receipt Verification'],
    ['/docs/security/issuer-compromise', 'Issuer Compromise'],
    ['/docs/security/trust-policies', 'Trust Policies'],
    ['/docs/security/authentication-profiles', 'Authentication Profiles'],
    ['/docs/security/security-best-practices', 'Security Best Practices'],
  ]],
  ['Reference', [
    ['/docs/core/agent-passports', 'Agent Passports'],
    ['/docs/core/capability-contracts', 'Capability Contracts'],
    ['/docs/core/install-grants', 'Install Grants'],
    ['/docs/reference/connection-offers', 'Connection Offers'],
    ['/docs/core/agent-connections', 'Agent Connections'],
    ['/docs/core/invocations', 'Invocation Envelopes'],
    ['/docs/core/execution-tasks', 'Execution Tasks'],
    ['/docs/core/execution-receipts', 'Execution Receipts'],
    ['/docs/core/revocation', 'Revocation'],
    ['/docs/security/overview', 'Security Overview'],
    ['/docs/security/passport-verification', 'Passport Verification'],
    ['/docs/reference/profiles', 'Protocol Profiles'],
    ['/docs/reference/authentication-modes', 'Authentication Modes'],
    ['/docs/reference/extensions', 'Extension Declarations'],
    ['/docs/reference/standard-errors', 'Standard Errors'],
  ]],
  ['Developer Tools', [
    ['/docs/tools/inspector', 'Ghost Bridge Inspector'],
    ['/docs/tools/debugging', 'Debugging'],
    ['/docs/tools/conformance-cli', 'Conformance CLI'],
    ['/docs/tools/schema-validation', 'Schema Validation'],
  ]],
  ['Examples', [
    ['/docs/examples/codeforge-flowdesk', 'CodeForge and FlowDesk'],
    ['/docs/examples/ledgerworks-opscanvas', 'LedgerWorks and OpsCanvas'],
    ['/docs/examples/invoice-agent', 'Invoice Agent'],
    ['/docs/examples/accounting-agent', 'Accounting Agent'],
  ]],
  ['TypeScript SDK', [
    ['/sdks/typescript', 'TypeScript SDK'],
    ['/sdks/typescript/protocol-core', 'protocol-core'],
    ['/sdks/typescript/native-client', 'native-client'],
    ['/sdks/typescript/native-agent', 'native-agent'],
    ['/sdks/typescript/conformance', 'conformance'],
    ['/sdks/typescript/inspector', 'inspector'],
  ]],
  ['Extensions', [
    ['/extensions', 'Extensions'],
    ['/extensions/overview', 'Overview'],
    ['/extensions/support-matrix', 'Support Matrix'],
    ['/extensions/authoring', 'Authoring'],
    ['/extensions/negotiation', 'Negotiation'],
    ['/extensions/lifecycle', 'Lifecycle'],
    ['/extensions/official', 'Official'],
    ['/extensions/experimental', 'Experimental'],
  ]],
  ['Specification', [
    ['/specification', 'Specification'],
    ['/specification/0.1-draft', '0.1 Draft'],
    ['/specification/0.1-draft/trust-profile', 'Trust Profile'],
    ['/specification/0.1-draft/issuer-identity', 'Issuer Identity'],
    ['/specification/0.1-draft/issuer-discovery', 'Issuer Discovery'],
    ['/specification/0.1-draft/proof-profile', 'Proof Profile'],
    ['/specification/0.1-draft/key-discovery', 'Key Discovery'],
    ['/specification/0.1-draft/key-lifecycle', 'Key Lifecycle'],
    ['/specification/0.1-draft/key-rotation', 'Key Rotation'],
    ['/specification/0.1-draft/revocation-set', 'Revocation Set'],
    ['/specification/0.1-draft/audience-binding', 'Audience Binding'],
    ['/specification/0.1-draft/replay-protection', 'Replay Protection'],
    ['/specification/0.1-draft/request-integrity', 'Request Integrity'],
    ['/specification/0.1-draft/receipt-proof', 'Receipt Proof'],
    ['/specification/0.1-draft/trust-errors', 'Trust Errors'],
    ['/specification/latest', 'Latest'],
  ]],
  ['Registry Preview', [
    ['/registry', 'Registry Preview'],
    ['/registry/about', 'About'],
    ['/registry/agents', 'Agents'],
    ['/registry/agents/invoice-agent', 'Invoice Summary Agent'],
    ['/registry/agents/accounting-agent', 'Accounting Agent'],
    ['/registry/publishing', 'Publishing'],
    ['/registry/consuming', 'Consuming'],
    ['/registry/trust-and-safety', 'Trust and Safety'],
  ]],
  ['GBEPs', [
    ['/gbeps', 'GBEP Index'],
    ['/gbeps/0001', 'GBEP-0001'],
    ['/gbeps/0002', 'GBEP-0002'],
  ]],
  ['Community', [
    ['/community', 'Community'],
    ['/community/governance', 'Governance'],
    ['/community/contributing', 'Contributing'],
    ['/community/code-of-conduct', 'Code of Conduct'],
    ['/community/security-reporting', 'Security Reporting'],
    ['/community/roadmap', 'Roadmap'],
    ['/community/feature-lifecycle', 'Feature Lifecycle'],
  ]],
  ['Future and Experimental', [
    ['/docs/experimental/agent-coordination', 'Agent Coordination'],
    ['/docs/get-started/two-agent-tutorial', 'Two-Agent Tutorial'],
    ['/docs/develop/build-client', 'Legacy Build Client Guide'],
    ['/docs/develop/connect-two-agents', 'Connect Two Agents'],
    ['/docs/develop/orchestration', 'Programmatic Orchestration'],
    ['/docs/core/delegation-grants', 'Delegation Grants'],
    ['/docs/security/delegated-authority', 'Delegated Authority'],
    ['/docs/examples/two-agent-workflow', 'Two-Agent Workflow'],
  ]],
];

const genericDescriptions = {
  'Get Started': 'Install an external agent into a compatible Host Application.',
  Learn: 'Architecture and lifecycle for universal Host Application to External Agent integration.',
  'Build with Ghost Bridge': 'Build provider-independent agents and Host Applications with the Native SDK.',
  'Governed Execution': 'Organization-scoped policy, data, approval, durable execution, evidence, and revocation controls.',
  Reference: 'Normative message, profile, compatibility, execution, and security reference.',
  'Future and Experimental': 'Non-primary coordination work retained for experimentation and future design.',
  'Core Protocol': 'Normative concepts, validation rules, failure behavior, and security boundaries for this protocol primitive.',
  Security: 'Security guidance for identity, authority, tenant scope, data boundaries, replay defense, and revocation.',
  'TypeScript SDK': 'Production draft TypeScript API surface, compatibility, typed failures, and deterministic examples.',
  Extensions: 'Experimental extension framework guidance with explicit security and compatibility boundaries.',
  Specification: 'The experimental Ghost Bridge Native wire specification and public Schema reference.',
  'Registry Preview': 'Preview-only public metadata from deterministic reference-agent fixtures.',
  GBEPs: 'Initial Ghost Bridge Enhancement Proposal process and repository-owned proposals.',
  Community: 'Current project contribution, governance, security-reporting, and lifecycle information.',
};

function genericSections(group, title) {
  if (group === 'TypeScript SDK') {
    return [
      { heading: 'API surface', content: [`${title} is part of the Phase 15B TypeScript SDK. Its package exports are explicit and its public declarations are repository controlled.`] },
      { heading: 'Compatibility', content: [table(['Environment', 'Support'], [['Node.js', '20 or newer'], ['Browser', 'Client and portable core where Fetch and Web APIs are available'], ['Protocol', 'ghostbridge/0.1-draft'], ['Stability', 'Experimental']])] },
      { heading: 'Safe errors', content: ['Public methods validate remote responses and expose bounded typed errors without remote stack traces.'] },
    ];
  }
  if (group === 'Security') {
    return [
      { heading: 'Security objective', content: [`${title} must preserve exact identity, organization and workspace scope, least authority, bounded data, approval, replay protection, and authoritative revocation.`] },
      { heading: 'Required checks', content: [bullets('Fail closed on malformed or unsupported messages.', 'Do not log credentials or private policy details.', 'Validate expiry, replay binding, and revocation.', 'Use safe public errors and private correlation logs.')] },
    ];
  }
  if (group === 'Registry Preview') {
    return [
      { heading: 'Preview boundary', content: [note('warning', 'Preview data only', 'Only deterministic reference fixtures and safe public Passport projections are shown.')] },
      { heading: 'Excluded data', content: [bullets('Customer records and installed-agent state.', 'Credentials, runtime bearer tokens, and install secrets.', 'Organization or Workspace connections.', 'Private endpoints and internal policy decisions.')] },
    ];
  }
  if (group === 'Community') {
    return [
      { heading: 'Current state', content: [`${title} reflects the repository's current owner-led project state. It does not claim neutral governance, external certification, or broad adoption.`] },
      { heading: 'Review boundary', content: ['Legal commitments, contribution agreements, and the Code of Conduct require owner and legal review where applicable.'] },
    ];
  }
  return [
    { heading: 'Overview', content: [`${title} is part of Ghost Bridge Native ${protocolProfile.protocolRevision}. ${genericDescriptions[group] || 'This page documents the implemented Native protocol behavior.'}`] },
    { heading: 'Protocol requirements', content: [bullets('Validate protocol version and bounded message shape.', 'Enforce Organization and Workspace scope.', 'Check expiry, policy, idempotency, and revocation where applicable.', 'Return typed, bounded errors without secrets.')] },
    { heading: 'Implementation guidance', content: ['Use the canonical portable validators and SDK APIs. Inspect local flows with Ghost Bridge Inspector and run deterministic conformance checks before integration.'] },
  ];
}

function routeKind(route) {
  if (route.startsWith('/specification')) return 'Specification';
  if (route.startsWith('/sdks')) return 'SDK API';
  if (route.startsWith('/extensions')) return 'Extensions';
  if (route.startsWith('/registry')) return 'Registry Preview';
  if (route.startsWith('/gbeps')) return 'GBEPs';
  return 'Documentation';
}

export const docsManifest = Object.freeze(
  groups.flatMap(([group, items], groupIndex) =>
    items.map(([route, label], index) => {
      const custom = phase15cDetailed[route] || phase15b1Detailed[route] || detailed[route] || {};
      const title = custom.title || label;
      const sections = custom.sections || genericSections(group, title);
      return Object.freeze({
        id: route.slice(1).replaceAll('/', '.') || 'home',
        route,
        title,
        navTitle: label,
        description:
          custom.description ||
          genericDescriptions[group] ||
          `Guidance for ${label} in Ghost Bridge Native.`,
        category: group,
        order: index + 1,
        groupOrder: groupIndex + 1,
        protocolVersion: protocolProfile.protocolVersion,
        stability: protocolProfile.stability,
        featureState:
          custom.featureState ||
          (route.startsWith('/registry')
            ? 'Preview'
            : group === 'Future and Experimental'
              ? 'Experimental'
            : route.startsWith('/community/code-of-conduct')
              ? 'Planned'
              : 'Experimental'),
        lastReviewedAt: '2026-07-24',
        sourcePath: 'frontend/src/docs/docsManifest.js',
        tableOfContents: sections.map((section) => ({
          title: section.heading,
          id: slugifyHeading(section.heading),
          level: 2,
        })),
        keywords: [
          'Ghost Bridge',
          label,
          group,
          ...title.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
        ],
        aliases: custom.aliases || [],
        kind: routeKind(route),
        sections,
      });
    }),
  ),
);

export const publicTopNavigation = Object.freeze([
  { label: 'Documentation', route: '/docs/get-started/what-is-ghost-bridge' },
  { label: 'Extensions', route: '/extensions' },
  { label: 'Specification', route: '/specification/0.1-draft' },
  { label: 'Registry', route: '/registry', status: 'Preview' },
  { label: 'GBEPs', route: '/gbeps' },
  { label: 'Community', route: '/community' },
]);

export const legacyPublicRedirects = Object.freeze({
  '/docs': '/docs/get-started/what-is-ghost-bridge',
  '/docs/introduction': '/docs/get-started/what-is-ghost-bridge',
  '/docs/quickstart': '/docs/get-started/quickstart',
  '/docs/architecture': '/docs/learn/architecture',
  '/docs/trust-model': '/docs/security/overview',
  '/docs/build/agent': '/docs/develop/build-agent',
  '/docs/build/client': '/docs/develop/build-host',
  '/docs/develop/build-client': '/docs/develop/build-host',
  '/docs/build/two-agent-workflow': '/docs/develop/connect-two-agents',
  '/docs/error-handling': '/docs/develop/error-handling',
  '/docs/testing': '/docs/tools/conformance-cli',
  '/docs/schema-validation': '/docs/tools/schema-validation',
  '/docs/protocol-inspector': '/docs/tools/inspector',
  '/docs/debugging': '/docs/tools/debugging',
  '/docs/extensions': '/extensions/overview',
  '/specification/0.1-draft/schemas': '/docs/tools/schema-validation',
  '/specification/versioning': '/docs/learn/versioning',
  '/specification/changelog': '/specification/0.1-draft',
  '/sdks': '/sdks/typescript',
  '/examples': '/docs/examples/codeforge-flowdesk',
  '/examples/invoice-accounting': '/docs/examples/two-agent-workflow',
  '/conformance': '/docs/tools/conformance-cli',
  '/security': '/docs/security/overview',
  '/roadmap': '/community/roadmap',
  '/governance': '/community/governance',
  '/contributing': '/community/contributing',
});

export const extensionCatalog = Object.freeze([
  {
    identifier: 'io.ghostbridge/display-metadata',
    version: '1.0.0',
    status: 'Experimental',
    required: false,
    clients: 'Supported',
    agents: 'Supported',
    authorityImpact: 'None',
  },
]);

export const registryAgents = Object.freeze([
  {
    slug: 'invoice-agent',
    displayName: 'Invoice Summary Agent',
    agentId: 'reference.invoice',
    issuer: 'Ghost Bridge reference fixtures',
    issuerId: 'http://127.0.0.1/reference-issuer',
    issuerVerificationState: 'Local fixture only',
    passportSignatureState: 'Not evaluated by Registry Preview',
    hostApprovalState: 'Host decision required',
    registryObservationState: 'Registry observed',
    externalAuditState: 'Not completed',
    trustProfile: 'ghostbridge-trust/0.1-draft',
    revocationFreshness: 'Fixture snapshot',
    protocolVersion: protocolProfile.protocolVersion,
    passportStatus: 'active',
    revocationStatus: 'active',
    conformanceLevel: 'Core C1-C3',
    profiles: ['Core C1-C3'],
    authenticationModes: ['signed_request'],
    extensionCompatibility: 'No required extensions',
    taskSupport: true,
    approvalSupport: false,
    receiptSupport: true,
    revocationSupport: true,
    capabilities: ['invoice.extract', 'invoice.validate'],
  },
  {
    slug: 'accounting-agent',
    displayName: 'Accounting Agent',
    agentId: 'reference.accounting',
    issuer: 'Ghost Bridge reference fixtures',
    issuerId: 'http://127.0.0.1/reference-issuer',
    issuerVerificationState: 'Local fixture only',
    passportSignatureState: 'Not evaluated by Registry Preview',
    hostApprovalState: 'Host decision required',
    registryObservationState: 'Registry observed',
    externalAuditState: 'Not completed',
    trustProfile: 'ghostbridge-trust/0.1-draft',
    revocationFreshness: 'Fixture snapshot',
    protocolVersion: protocolProfile.protocolVersion,
    passportStatus: 'active',
    revocationStatus: 'active',
    conformanceLevel: 'Core C1-C3 · Governed G1-G3',
    profiles: ['Core C1-C3', 'Governed Execution G1-G3'],
    authenticationModes: ['platform_brokered', 'signed_request'],
    extensionCompatibility: 'No required extensions',
    taskSupport: true,
    approvalSupport: true,
    receiptSupport: true,
    revocationSupport: true,
    capabilities: ['accounting.check_duplicate', 'accounting.create_draft'],
  },
]);

export const gbepIndex = Object.freeze([
  {
    number: '0001',
    title: 'Process and governance',
    owner: 'Ghost Bridge project owner',
    status: 'Draft',
    type: 'Process',
    createdAt: '2026-07-24',
    updatedAt: '2026-07-24',
    protocolVersionImpact: 'None',
    route: '/gbeps/0001',
  },
  {
    number: '0002',
    title: 'Extension lifecycle',
    owner: 'Ghost Bridge project owner',
    status: 'Draft',
    type: 'Extensions Track',
    createdAt: '2026-07-24',
    updatedAt: '2026-07-24',
    protocolVersionImpact: 'Future revisions',
    route: '/gbeps/0002',
  },
]);

export function slugifyHeading(value) {
  return String(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function findPublicPage(route) {
  return docsManifest.find((page) => page.route === route);
}

export function navigationGroups() {
  return groups.map(([label]) => ({
    label,
    pages: docsManifest.filter((page) => page.category === label),
  }));
}
