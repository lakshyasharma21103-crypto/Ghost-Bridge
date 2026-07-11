import { CircleDashed } from 'lucide-react';

export function EmptyState({ title, detail, action }) {
  return (
    <div className="border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <CircleDashed className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
      <h2 className="mt-4 text-base font-semibold text-slate-950">{title}</h2>
      {detail ? <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{detail}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
