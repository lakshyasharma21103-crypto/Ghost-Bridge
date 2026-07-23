import { NavLink } from 'react-router-dom';

const items = [
  ['Staging', '/operations/staging'],
  ['Pilot Programs', '/operations/pilot-programs'],
  ['Capability Gates', '/operations/capability-gates'],
  ['Pilot Health', '/operations/pilot-health'],
  ['Feedback & Support', '/operations/pilot-feedback-support'],
];

export function PilotOperationsNav() {
  return (
    <nav className="mb-5 flex flex-wrap gap-2" aria-label="Staging and pilot operations">
      {items.map(([label, path]) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `rounded-md border px-3 py-1.5 text-xs font-medium transition ${
              isActive
                ? 'border-cyan-300 bg-cyan-50 text-cyan-800'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
