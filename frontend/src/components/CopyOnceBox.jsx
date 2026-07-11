import { Check, Copy, EyeOff } from 'lucide-react';
import { useState } from 'react';

export function CopyOnceBox({ label, value, onCopied }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    if (!value || copied) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    onCopied?.();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-300">{label}</p>
        <button
          type="button"
          onClick={copyValue}
          disabled={copied}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          title={copied ? 'Copied and hidden' : 'Copy once'}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <div className="mt-3 rounded-md bg-black/30 px-3 py-2 font-mono text-sm">
        {copied ? (
          <span className="inline-flex items-center gap-2 text-slate-300">
            <EyeOff className="h-4 w-4" />
            Hidden after copy
          </span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
