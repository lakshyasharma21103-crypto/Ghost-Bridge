import { NavLink } from 'react-router-dom';

const items = [
  ['Pilot Analytics', '/operations/pilot-analytics'],
  ['Adoption Funnels', '/operations/pilot-analytics/funnels'],
  ['Cohorts & Retention', '/operations/pilot-analytics/cohorts'],
  ['Capability Adoption', '/operations/pilot-analytics/capabilities'],
  ['Feedback Insights', '/operations/pilot-analytics/feedback'],
  ['Experiments', '/operations/pilot-analytics/experiments'],
  ['Product Opportunities', '/operations/pilot-analytics/opportunities'],
  ['Data Quality', '/operations/pilot-analytics/data-quality'],
];

export function PilotAnalyticsNav() {
  return (
    <nav className="mb-5 flex flex-wrap gap-1 border-b border-slate-200" aria-label="Pilot analytics">
      {items.map(([label, path], index) => (
        <NavLink
          key={path}
          to={path}
          end={index === 0}
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
