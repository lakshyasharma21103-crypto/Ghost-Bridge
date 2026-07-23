import { NavLink } from 'react-router-dom';

const links = [
  ['/operations/release-readiness', 'Release Readiness'],
  ['/operations/release-candidates', 'Release Candidates'],
  ['/operations/release-rollouts', 'Rollouts'],
  ['/operations/release-migrations', 'Migrations'],
  ['/operations/release-feature-flags', 'Feature Flags'],
];

export function ReleaseReadinessNav() {
  return (
    <nav className="mb-5 flex flex-wrap gap-2" aria-label="Release operations">
      {links.map(([path, label]) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `border px-3 py-2 text-xs font-medium ${
              isActive
                ? 'border-cyan-700 bg-cyan-50 text-cyan-900'
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
