import { NavLink } from 'react-router-dom';

const items = [
  ['Scale & Capacity', '/operations/scale-capacity'],
  ['Queue Partitions', '/operations/queue-partitions'],
  ['Worker Pools', '/operations/worker-pools'],
  ['Admission & Quotas', '/operations/admission-quotas'],
  ['Dead Letter', '/operations/dead-letter'],
];

export function ProductionScaleNav() {
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3" aria-label="Production scale operations">
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
