import {
  Braces,
  Menu,
  Moon,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { DocumentationSearch } from '../components/docs/DocumentationDialogs.jsx';
import {
  protocolProfile,
  publicTopNavigation,
} from '../docs/docsManifest.js';

export function PublicProtocolLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [dark, setDark] = useState(false);
  const closeDialog = useCallback(() => setDialog(null), []);
  const githubUrl = useMemo(() => configuredGithubUrl(), []);

  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setDialog('search');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.protocolTheme = dark ? 'dark' : 'light';
  }, [dark]);

  return (
    <div className="protocol-site">
      <a className="protocol-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="protocol-header">
        <div className="protocol-header-primary">
          <Link to="/" className="protocol-brand" onClick={() => setMenuOpen(false)}>
            <span className="protocol-brand-mark">
              <Braces aria-hidden="true" />
            </span>
            <span>
              Ghost Bridge <small>Protocol</small>
            </span>
          </Link>
          <span className="protocol-version-control" title="Draft protocol revision">
            {protocolProfile.protocolRevision}
            <em>Draft</em>
          </span>
          <div className="protocol-header-actions">
            <button type="button" className="protocol-search-trigger" onClick={() => setDialog('search')}>
              <Search aria-hidden="true" />
              <span>Search documentation</span>
              <kbd>⌘/Ctrl K</kbd>
            </button>
            <button type="button" className="protocol-ask-trigger" onClick={() => setDialog('ask')}>
              <Sparkles aria-hidden="true" />
              <span>Ask Ghost Bridge</span>
            </button>
            <button
              type="button"
              className="protocol-theme-trigger"
              onClick={() => setDark((value) => !value)}
              aria-label={`Use ${dark ? 'light' : 'dark'} theme`}
            >
              {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </button>
            <Link to="/console" className="protocol-console-link">
              Open Console
            </Link>
            <button
              type="button"
              className="protocol-menu-button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Toggle project navigation"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>
        <nav
          className={`protocol-project-nav ${menuOpen ? 'open' : ''}`}
          aria-label="Project"
        >
          {publicTopNavigation.map((item) => (
            <NavLink
              key={item.route}
              to={item.route}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {item.label}
              {item.status ? <small>{item.status}</small> : null}
            </NavLink>
          ))}
          {githubUrl ? (
            <a href={githubUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
          ) : null}
        </nav>
      </header>
      <Outlet />
      <footer className="protocol-footer">
        <div>
          <strong>Ghost Bridge Protocol</strong>
          <span>{protocolProfile.tagline}</span>
          <small>{protocolProfile.protocolVersion} · Experimental</small>
        </div>
        <nav aria-label="Project links">
          <Link to="/community/governance">Governance</Link>
          <Link to="/community/contributing">Contributing</Link>
          <Link to="/community/security-reporting">Security reporting</Link>
        </nav>
      </footer>
      <DocumentationSearch mode="search" open={dialog === 'search'} onClose={closeDialog} />
      <DocumentationSearch mode="ask" open={dialog === 'ask'} onClose={closeDialog} />
    </div>
  );
}

function configuredGithubUrl() {
  const value = import.meta.env.VITE_PUBLIC_GITHUB_URL;
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'github.com' && url.pathname.split('/').filter(Boolean).length >= 2
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

