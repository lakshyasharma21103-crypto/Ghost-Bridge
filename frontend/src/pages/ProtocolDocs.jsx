import { useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Breadcrumbs,
  Card,
  CardGroup,
  CopyCanonicalLinkButton,
  CopyPageButton,
  DocumentationBlocks,
  PageDescription,
  PageTitle,
  PreviousNextNavigation,
  StatusBadge,
  SupportMatrix,
  VersionBadge,
} from '../components/docs/DocumentationComponents.jsx';
import {
  docsManifest,
  extensionCatalog,
  findPublicPage,
  gbepIndex,
  protocolProfile,
  registryAgents,
} from '../docs/docsManifest.js';

export function ProtocolDocsPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const page = findPublicPage(pathname);

  useEffect(() => {
    document.title = page
      ? `${page.title} · Ghost Bridge Protocol`
      : 'Ghost Bridge Protocol';
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [page]);

  if (!page) return <Navigate to="/docs/get-started/what-is-ghost-bridge" replace />;

  return (
    <article className="protocol-doc-article">
      <Breadcrumbs page={page} />
      <div className="docs-page-category">{page.category}</div>
      <PageTitle>{page.title}</PageTitle>
      <PageDescription>{page.description}</PageDescription>
      <div className="docs-page-meta">
        <VersionBadge>{page.protocolVersion}</VersionBadge>
        <StatusBadge state={page.stability}>{page.stability}</StatusBadge>
        <StatusBadge state={page.featureState}>{page.featureState}</StatusBadge>
        {pathname.startsWith('/specification') ? (
          <label className="docs-version-select">
            <span>Specification revision</span>
            <select
              value="0.1-draft"
              onChange={(event) => navigate(`/specification/${event.target.value}`)}
            >
              <option value="0.1-draft">0.1-draft · Draft</option>
            </select>
          </label>
        ) : null}
      </div>
      <div className="docs-page-actions">
        <CopyPageButton page={page} />
        <CopyCanonicalLinkButton route={page.route} />
      </div>
      {page.sections.map((section) => (
        <section key={section.heading} aria-labelledby={page.tableOfContents.find((item) => item.title === section.heading)?.id}>
          <h2 id={page.tableOfContents.find((item) => item.title === section.heading)?.id}>
            {section.heading}
          </h2>
          <DocumentationBlocks blocks={section.content} />
        </section>
      ))}
      <PageSupplement page={page} />
      <PreviousNextNavigation page={page} />
    </article>
  );
}

function PageSupplement({ page }) {
  if (page.route === '/extensions' || page.route === '/extensions/support-matrix') {
    return (
      <section aria-labelledby="extension-support-matrix">
        <h2 id="extension-support-matrix">Extension support matrix</h2>
        <SupportMatrix
          columns={['Identifier', 'Version', 'State', 'Client', 'Agent', 'Authority impact']}
          rows={extensionCatalog.map((item) => [
            item.identifier,
            item.version,
            item.status,
            item.clients,
            item.agents,
            item.authorityImpact,
          ])}
        />
      </section>
    );
  }
  if (page.route === '/registry/agents') {
    return (
      <section aria-labelledby="registry-reference-agents">
        <h2 id="registry-reference-agents">Reference agents</h2>
        <div className="registry-filters" aria-label="Registry filters">
          {['Capability', 'Risk category', 'Side effect', 'Approval', 'Conformance', 'Protocol', 'Passport status'].map((filter) => (
            <span key={filter}>{filter}</span>
          ))}
        </div>
        <CardGroup>
          {registryAgents.map((agent) => (
            <Card
              key={agent.slug}
              title={agent.displayName}
              to={`/registry/agents/${agent.slug}`}
            >
              <p>{agent.capabilities.join(' · ')}</p>
              <small>{agent.protocolVersion} · {agent.profiles.join(' · ')}</small>
              <p>{agent.authenticationModes.join(' / ')} · {agent.extensionCompatibility}</p>
              <strong>Add to Compatible Host →</strong>
            </Card>
          ))}
        </CardGroup>
      </section>
    );
  }
  if (page.route.startsWith('/registry/agents/')) {
    const agent = registryAgents.find((item) => page.route.endsWith(`/${item.slug}`));
    if (agent) {
      return (
        <section aria-labelledby="agent-compatibility">
          <h2 id="agent-compatibility">Host compatibility</h2>
          <SupportMatrix
            columns={['Profiles', 'Authentication', 'Tasks', 'Approval', 'Receipts', 'Revocation']}
            rows={[[
              agent.profiles.join(' · '),
              agent.authenticationModes.join(' / '),
              agent.taskSupport ? 'Yes' : 'No',
              agent.approvalSupport ? 'Yes' : 'No',
              agent.receiptSupport ? 'Yes' : 'No',
              agent.revocationSupport ? 'Yes' : 'No',
            ]]}
          />
          <p><strong>Add to Compatible Host</strong> with an opaque Install Grant.</p>
        </section>
      );
    }
  }
  if (page.route === '/gbeps') {
    return (
      <section aria-labelledby="gbep-proposals">
        <h2 id="gbep-proposals">Proposals</h2>
        <div className="gbep-filters" aria-label="GBEP type filters">
          {['All', 'Standards Track', 'Process', 'Informational', 'Extensions Track'].map((type) => (
            <span key={type}>{type}</span>
          ))}
        </div>
        <CardGroup>
          {gbepIndex.map((proposal) => (
            <Card
              key={proposal.number}
              title={`GBEP-${proposal.number}: ${proposal.title}`}
              to={proposal.route}
            >
              <p>{proposal.type} · {proposal.status}</p>
              <small>Created {proposal.createdAt}</small>
            </Card>
          ))}
        </CardGroup>
      </section>
    );
  }
  if (page.route === '/specification/latest') {
    return (
      <section aria-labelledby="latest-draft-warning">
        <h2 id="latest-draft-warning">Latest available revision</h2>
        <p>
          The latest available revision is{' '}
          <Link to="/specification/0.1-draft">{protocolProfile.protocolVersion}</Link>. No
          Current or Final revision exists.
        </p>
      </section>
    );
  }
  if (page.route === '/sdks/typescript') {
    return (
      <section aria-labelledby="typescript-packages">
        <h2 id="typescript-packages">Packages</h2>
        <CardGroup>
          {docsManifest
            .filter((item) => item.route.startsWith('/sdks/typescript/'))
            .map((item) => (
              <Card key={item.route} title={item.title} to={item.route}>
                <p>{item.description}</p>
              </Card>
            ))}
        </CardGroup>
      </section>
    );
  }
  return null;
}
