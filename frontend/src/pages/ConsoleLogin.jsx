import { Braces, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppState } from '../app/AppState.jsx';

export function ConsoleLogin() {
  const { partnerConfigured, configurePartnerKey } = useAppState();
  const [key, setKey] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from || '/console';
  if (partnerConfigured) return <Navigate to={destination} replace />;

  function submit(event) {
    event.preventDefault();
    if (!key.trim()) return;
    configurePartnerKey(key.trim());
    navigate(destination, { replace: true });
  }

  return (
    <main className="console-login-page">
      <Link to="/" className="console-login-brand">
        <Braces aria-hidden="true" /> Ghost Bridge
      </Link>
      <section className="console-login-card">
        <div className="console-login-icon">
          <ShieldCheck aria-hidden="true" />
        </div>
        <p className="protocol-section-label">Platform Console</p>
        <h1>Sign in to the enterprise control plane</h1>
        <p>
          The Platform Console contains operational and commercial features. It is separate
          from the public Ghost Bridge Protocol website.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="partner-key">Partner API key</label>
          <input
            id="partner-key"
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            autoComplete="current-password"
            placeholder="Enter your configured key"
            required
          />
          <button type="submit">Open Console</button>
        </form>
        <Link to="/docs">Return to public documentation</Link>
      </section>
    </main>
  );
}
