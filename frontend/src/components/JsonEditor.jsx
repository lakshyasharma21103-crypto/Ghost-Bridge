import { useMemo } from 'react';

export function JsonEditor({ label, value, onChange, rows = 10, hint }) {
  const error = useMemo(() => {
    if (!value.trim()) return '';
    try {
      JSON.parse(value);
      return '';
    } catch (parseError) {
      return parseError.message;
    }
  }, [value]);

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {hint ? <span className="mt-1 block text-xs leading-5 text-slate-500">{hint}</span> : null}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        spellCheck="false"
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
      />
      {error ? <span className="mt-2 block text-sm text-rose-700">{error}</span> : null}
    </label>
  );
}
