import { NavLink } from 'react-router-dom';

const items = [
  ['Product Catalog', '/commercial/products'],
  ['Plans & Pricing', '/commercial/plans'],
  ['Entitlements', '/commercial/entitlements'],
  ['Customers', '/commercial/customers'],
  ['Subscriptions', '/commercial/subscriptions'],
  ['Usage & Metering', '/commercial/usage'],
  ['Invoices', '/commercial/invoices'],
  ['Payments', '/commercial/payments'],
  ['Renewals', '/commercial/renewals'],
  ['Customer Success', '/commercial/customer-success'],
];

export function CommercialNav() {
  return (
    <nav className="mb-5 flex flex-wrap gap-1 border-b border-slate-200" aria-label="Commercial operations">
      {items.map(([label, path]) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) => `border-b-2 px-3 py-2 text-xs font-medium transition ${
            isActive ? 'border-cyan-700 text-cyan-800' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function GaNav() {
  const gaItems = [
    ['GA Readiness', '/ga/readiness'],
    ['Rollouts', '/ga/rollouts'],
    ['Launch Decisions', '/ga/decisions'],
    ['Commercial Evidence', '/ga/evidence'],
  ];
  return (
    <nav className="mb-5 flex flex-wrap gap-1 border-b border-slate-200" aria-label="General availability">
      {gaItems.map(([label, path]) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) => `border-b-2 px-3 py-2 text-xs font-medium transition ${
            isActive ? 'border-cyan-700 text-cyan-800' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
