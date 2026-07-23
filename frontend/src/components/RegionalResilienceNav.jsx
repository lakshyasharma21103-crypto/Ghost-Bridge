import { NavLink } from 'react-router-dom';

const items = [
  ['Regions', '/operations/regions'],
  ['Failover', '/operations/failover'],
  ['Disaster Recovery', '/operations/disaster-recovery'],
  ['Backups & Restores', '/operations/backups-restores'],
  ['DR Drills', '/operations/dr-drills'],
];

export function RegionalResilienceNav() {
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3" aria-label="Regional resilience operations">
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
