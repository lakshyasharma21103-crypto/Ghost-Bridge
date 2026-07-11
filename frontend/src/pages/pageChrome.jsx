export function PageHeader({ title, eyebrow, description, actions }) {
  return (
    <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase text-cyan-800">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return <section className={`border border-slate-200 bg-white p-5 ${className}`}>{children}</section>;
}

export function PrimaryButton({ children, type = 'button', onClick, disabled = false, className = '' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex min-h-10 items-center justify-center gap-2 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, type = 'button', onClick, disabled = false, className = '' }) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex min-h-10 items-center justify-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>{children}</button>;
}

export function MetricCard({ label, value, detail, tone = 'slate' }) {
  const accents = { slate: 'border-t-slate-900', cyan: 'border-t-cyan-600', emerald: 'border-t-emerald-600', coral: 'border-t-rose-500' };
  return <section className={`border border-slate-200 border-t-[3px] bg-white p-5 ${accents[tone] || accents.slate}`}><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>{detail ? <p className="mt-2 text-sm text-slate-600">{detail}</p> : null}</section>;
}

export function FieldLabel({ children, hint }) {
  return <div className="mb-1"><span className="text-sm font-medium text-slate-800">{children}</span>{hint ? <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p> : null}</div>;
}

export function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatDuration(value) {
  if (value == null) return '-';
  return value < 1000 ? `${value} ms` : `${(value / 1000).toFixed(1)} s`;
}
