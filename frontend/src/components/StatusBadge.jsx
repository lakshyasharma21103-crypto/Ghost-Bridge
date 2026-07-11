const tones = {
  ready: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  offline: 'bg-rose-50 text-rose-700 ring-rose-200',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-cyan-50 text-cyan-800 ring-cyan-200',
  limited: 'bg-violet-50 text-violet-800 ring-violet-200',
};

export function StatusBadge({ children, tone = 'neutral' }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  );
}
