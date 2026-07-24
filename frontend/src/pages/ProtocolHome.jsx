import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Braces,
  CheckCircle2,
  Clock3,
  Code2,
  FileCheck2,
  Fingerprint,
  KeyRound,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const promises = [
  ['Verified identity', 'A signed, versioned Agent Passport establishes who the external agent is.', Fingerprint],
  ['Compatible installation', 'A generic host resolves one opaque Install Grant and previews compatibility.', KeyRound],
  ['Bounded execution', 'Capability contracts, tasks, receipts, and revocation make execution inspectable.', ShieldCheck],
];

const enabled = [
  ['Cross-vendor external agents', Boxes],
  ['Universal Host Applications', Braces],
  ['Profile and extension compatibility', BadgeCheck],
  ['Capability discovery', Code2],
  ['Authentication negotiation', KeyRound],
  ['Organization and workspace scope', ShieldCheck],
  ['Optional human approval', UserCheck],
  ['Durable execution', Clock3],
  ['Verifiable receipts', ReceiptText],
  ['Authoritative revocation', RotateCcw],
];

const primitives = [
  'Agent Passport',
  'Protocol Profile',
  'Capability Contract',
  'Install Grant',
  'Connection Offer',
  'Agent Connection',
  'Invocation Envelope',
  'Execution Task',
  'Execution Receipt',
  'Revocation',
];

export function ProtocolHome() {
  return (
    <main>
      <section className="protocol-hero">
        <div className="protocol-hero-grid">
          <div>
            <div className="protocol-eyebrow">
              <span className="protocol-status-dot" />
              ghostbridge/0.1-draft · Draft
            </div>
            <p className="protocol-kicker">Ghost Bridge Protocol</p>
            <h1>Install external AI agents into any compatible application.</h1>
            <p className="protocol-hero-copy">
              A provider publishes one Native Agent. Any conforming Host Application can
              verify its identity, preview compatibility, negotiate authentication, install
              approved capabilities, invoke it, and revoke the connection.
            </p>
            <div className="protocol-hero-actions">
              <Link to="/docs/get-started/quickstart" className="protocol-button protocol-button-primary">
                Quickstart <ArrowRight aria-hidden="true" />
              </Link>
              <Link to="/docs/develop/build-agent" className="protocol-button">
                Build an Agent
              </Link>
              <Link to="/docs/develop/build-host" className="protocol-button">
                Build a Host
              </Link>
            </div>
          </div>
          <div className="protocol-message-card" aria-label="Universal host-agent flow">
            <div className="protocol-message-toolbar">
              <span /><span /><span /><code>ghostbridge/0.1-draft</code>
            </div>
            <pre>{`Agent Provider
      │ Passport + capabilities
      ▼
External Native Agent
      │ opaque Install Grant
      ▼
Host Application
      │ invoke + observe + revoke
      ▼
Execution Task + Receipt`}</pre>
            <div className="protocol-message-result">
              <CheckCircle2 aria-hidden="true" />
              No provider-specific adapter or endpoint entry
            </div>
          </div>
        </div>
      </section>

      <section className="protocol-section protocol-definition">
        <p className="protocol-section-label">Definition</p>
        <h2>
          Ghost Bridge is an open protocol for installing and invoking external AI agents
          from compatible Host Applications.
        </h2>
        <p>
          Core is the universal baseline. Governed Execution adds enterprise controls.
          Agent Coordination is a separate Experimental/Deferred future profile.
        </p>
      </section>

      <section className="protocol-section">
        <div className="protocol-section-heading">
          <div>
            <p className="protocol-section-label">Core promise</p>
            <h2>One agent implementation, many compatible hosts.</h2>
          </div>
        </div>
        <div className="protocol-promise-grid">
          {promises.map(([title, copy, Icon], index) => (
            <article key={title}>
              <span className="protocol-card-number">0{index + 1}</span>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="protocol-section protocol-tinted-section">
        <p className="protocol-section-label">What Ghost Bridge enables</p>
        <h2>A complete Host Application → External Agent lifecycle.</h2>
        <div className="protocol-enable-grid">
          {enabled.map(([title, Icon]) => (
            <article key={title}><Icon aria-hidden="true" /><span>{title}</span></article>
          ))}
        </div>
      </section>

      <section className="protocol-section protocol-lifecycle-section">
        <p className="protocol-section-label">Universal lifecycle</p>
        <h2>Discover, install, invoke, observe, and revoke.</h2>
        <div className="protocol-lifecycle">
          {['Discover Agent', 'Verify Passport', 'Preview Compatibility', 'Negotiate Authentication', 'Install Capabilities', 'Invoke', 'Observe Task', 'Verify Receipt', 'Revoke'].map((item, index, values) => (
            <div key={item}>
              <span>{index + 1}</span><strong>{item}</strong>
              {index < values.length - 1 ? <ArrowRight aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="protocol-section">
        <p className="protocol-section-label">Protocol profiles</p>
        <div className="protocol-audience-grid">
          <Profile title="Core · Active" copy="C1 discovery and identity; C2 installation and authentication; C3 capabilities, invocation, tasks, receipts, and revocation." />
          <Profile title="Governed Execution · Active" copy="G1 scoped access; G2 authorization, Data Contracts, and approval; G3 durable, idempotent, auditable execution." />
          <Profile title="Agent Coordination · Experimental/Deferred" copy="Agent-to-agent delegation and multi-agent coordination remain available for experimentation but are not required for universal compatibility." />
        </div>
      </section>

      <section className="protocol-section">
        <div className="protocol-section-heading">
          <div><p className="protocol-section-label">Core primitives</p><h2>Small, explicit building blocks.</h2></div>
          <Link to="/docs/core/agent-passports">Explore reference →</Link>
        </div>
        <div className="protocol-primitives">
          {primitives.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      <section className="protocol-section protocol-code-section">
        <div>
          <p className="protocol-section-label">Native TypeScript foundation</p>
          <h2>Publish one bounded capability.</h2>
          <p>The same declaration is discoverable by every compatible host.</p>
          <Link to="/sdks/typescript">TypeScript SDK documentation →</Link>
        </div>
        <pre><code>{`import { createGhostBridgeAgent } from
  "@ghostbridge/native-agent";

const agent = createGhostBridgeAgent({ passport });
agent.capability("codeforge.create_app", {
  contract,
  handler: async ({ input }) => ({
    outcome: "completed",
    output: await createApp(input)
  })
});
await agent.listen();`}</code></pre>
      </section>

      <section className="protocol-section">
        <p className="protocol-section-label">Start building</p>
        <div className="protocol-start-grid">
          <StartCard icon={Code2} title="Build an Agent" href="/docs/develop/build-agent" />
          <StartCard icon={Braces} title="Build a Host" href="/docs/develop/build-host" />
          <StartCard icon={FileCheck2} title="Run Conformance" href="/docs/tools/conformance-cli" />
        </div>
      </section>

      <section className="protocol-section protocol-status-section">
        <div><p className="protocol-section-label">Protocol status</p><h2>Draft, implemented, and explicit about its limits.</h2></div>
        <dl>
          <Status term="Version" value="ghostbridge/0.1-draft" />
          <Status term="Core profile" value="Active · C1–C3" />
          <Status term="Governed Execution" value="Active · G1–G3" />
          <Status term="Agent Coordination" value="Experimental/Deferred" />
          <Status term="Registry" value="Preview" />
          <Status term="Independent implementation" value="Not completed" />
          <Status term="External security review" value="Not completed" />
        </dl>
      </section>
    </main>
  );
}

function Profile({ title, copy }) {
  return <article><BadgeCheck aria-hidden="true" /><h3>{title}</h3><p>{copy}</p></article>;
}

function StartCard({ icon: Icon, title, href }) {
  return <Link to={href}><Icon aria-hidden="true" /><strong>{title}</strong><ArrowRight aria-hidden="true" /></Link>;
}

function Status({ term, value }) {
  return <div><dt>{term}</dt><dd>{value}</dd></div>;
}
