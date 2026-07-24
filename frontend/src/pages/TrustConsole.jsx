import { Link, useLocation } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { PageHeader, Panel } from './pageChrome.jsx';

const sections = [
  ['Issuers', '/console/security/issuers'],
  ['Trust Policies', '/console/security/trust-policies'],
  ['Signing Keys', '/console/security/signing-keys'],
  ['Revocation', '/console/security/revocation'],
  ['Verification Events', '/console/security/verification-events'],
];

export function TrustConsole() {
  const { pathname } = useLocation();
  const section = sections.find(([, path]) => pathname === path)?.[0] || 'Issuers';
  return <>
    <PageHeader eyebrow="Security · Experimental security profile" title={section} description="Organization and workspace trust administration for ghostbridge-trust/0.1-draft. This console never receives private signing-key bytes." />
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Trust administration">
      {sections.map(([label, path]) => <Link key={path} to={path} className={`border px-3 py-2 text-sm font-medium ${pathname === path ? 'border-cyan-700 bg-cyan-50 text-cyan-950' : 'border-slate-200 bg-white text-slate-700'}`}>{label}</Link>)}
    </nav>
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold text-slate-950">{section}</h2><p className="mt-1 text-sm text-slate-600">No trust records are available from the current workspace fixture.</p></div>
        <StatusBadge tone="pending">Administrator review required</StatusBadge>
      </div>
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <TrustField label="Cryptographic validity" value="Not evaluated" />
        <TrustField label="Issuer approval" value="No decision" />
        <TrustField label="Revocation freshness" value="Unavailable" />
        <TrustField label="External audit" value="Not completed" />
      </dl>
      <p className="mt-6 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950">Registry observation, a valid signature, issuer approval, conformance, and external audit are separate states. This page never collapses them into one “Verified” badge.</p>
    </Panel>
  </>;
}

function TrustField({ label, value }) {
  return <div><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className="mt-1 text-slate-900">{value}</dd></div>;
}
