import { Link, useLocation } from 'react-router-dom';

const names = {
  '/console/approvals': 'Approvals',
  '/console/receipts': 'Execution Receipts',
  '/console/security': 'Security',
  '/console/admin': 'Administration',
};

export function ConsoleProtocolPlaceholder() {
  const { pathname } = useLocation();
  const title = names[pathname] || 'Native Protocol';
  return (
    <section>
      <header className="overview-header">
        <div>
          <h1 className="overview-title">{title}</h1>
          <p className="overview-description">
            Ghost Bridge Platform controls mapped to portable Ghost Bridge Native messages.
          </p>
        </div>
      </header>
      <div className="empty-state">
        <h2>Protocol projection available</h2>
        <p>
          Existing enterprise records remain authoritative. Public DTOs are projected through
          an explicit allowlist and exclude credentials, storage metadata, and private policy
          internals.
        </p>
        <Link to="/specification/0.1-draft">Read the public specification</Link>
      </div>
    </section>
  );
}
