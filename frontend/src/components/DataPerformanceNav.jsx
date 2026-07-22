import { NavLink } from 'react-router-dom';

const items = [
  ['Database & Cache', '/operations/database-cache'],
  ['Query Performance', '/operations/query-performance'],
  ['Indexes', '/operations/database-indexes'],
  ['Projections', '/operations/data-projections'],
];

export function DataPerformanceNav() {
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3" aria-label="Data-access performance operations">
      {items.map(([label, path]) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `border px-3 py-1.5 text-xs font-medium ${isActive ? 'border-cyan-700 bg-cyan-50 text-cyan-900' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
