import { AlertCircle, LoaderCircle } from 'lucide-react';
import { ApiClientError } from '../api/apiClient.js';

export function ErrorAlert({ error, title = 'Request failed' }) {
  if (!error) return null;
  const details = error instanceof ApiClientError && Array.isArray(error.details) ? error.details : [];

  return (
    <div className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950" role="alert">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 leading-5">{error.message || 'An unexpected request error occurred.'}</p>
          {error.code ? <p className="mt-1 font-mono text-xs text-rose-800">{error.code}</p> : null}
          {details.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-rose-900">
              {details.slice(0, 4).map((detail, index) => (
                <li key={`${detail.path || 'detail'}_${index}`}>{detail.path ? `${detail.path}: ` : ''}{detail.message || 'Invalid value.'}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function LoadingBlock({ label = 'Loading' }) {
  return (
    <div className="flex min-h-36 items-center justify-center border border-slate-200 bg-white text-sm text-slate-500">
      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}
