import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { OnThisPage } from '../components/docs/DocumentationComponents.jsx';
import {
  findPublicPage,
  navigationGroups,
} from '../docs/docsManifest.js';
import { PublicProtocolLayout } from './PublicProtocolLayout.jsx';

export function ProtocolDocsLayout() {
  return <PublicProtocolLayout />;
}

export function ProtocolDocsFrame() {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { pathname } = useLocation();
  const page = findPublicPage(pathname);
  const groups = navigationGroups();

  return (
    <div className="protocol-docs-shell">
      <button
        type="button"
        className="docs-mobile-navigation-trigger"
        aria-expanded={navigationOpen}
        aria-controls="documentation-navigation"
        onClick={() => setNavigationOpen((value) => !value)}
      >
        {navigationOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        {navigationOpen ? 'Close navigation' : 'Documentation navigation'}
      </button>
      <aside
        id="documentation-navigation"
        className={`protocol-docs-sidebar ${navigationOpen ? 'open' : ''}`}
        aria-label="Documentation"
      >
        {groups.map((group) => (
          <details
            key={group.label}
            open={group.pages.some((item) => item.route === pathname)}
          >
            <summary>{group.label}</summary>
            <nav aria-label={group.label}>
              {group.pages.map((item) => (
                <NavLink
                  key={item.route}
                  to={item.route}
                  onClick={() => setNavigationOpen(false)}
                  className={({ isActive }) => (isActive ? 'docs-link-active' : undefined)}
                >
                  <span>{item.navTitle}</span>
                  {item.featureState === 'Preview' || item.featureState === 'Planned' ? (
                    <small>{item.featureState}</small>
                  ) : null}
                </NavLink>
              ))}
            </nav>
          </details>
        ))}
      </aside>
      <main id="main-content" className="protocol-docs-content" tabIndex={-1}>
        <Outlet />
      </main>
      <aside className="protocol-docs-toc">
        {page ? (
          <>
            <details className="docs-mobile-toc">
              <summary>On this page</summary>
              <OnThisPage items={page.tableOfContents} />
            </details>
            <div className="docs-desktop-toc">
              <OnThisPage items={page.tableOfContents} />
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}

