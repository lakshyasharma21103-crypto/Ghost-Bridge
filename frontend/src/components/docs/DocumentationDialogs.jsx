import { BookOpenText, Search, Sparkles, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  askGhostBridge,
  groupSearchResults,
  searchDocumentation,
} from '../../docs/docsEngine.js';

export function DocumentationSearch({ mode = 'search', open, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const titleId = useId();
  const isAsk = mode === 'ask';
  const searchResults = query ? searchDocumentation(query) : [];
  const answer = isAsk && query ? askGhostBridge(query) : null;
  const results = isAsk ? answer?.results || [] : searchResults;
  const groups = groupSearchResults(results);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    window.setTimeout(() => inputRef.current?.focus(), 0);
    const keydown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') trapFocus(event);
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  function trapFocus(event) {
    const dialog = inputRef.current?.closest('[role="dialog"]');
    const focusable = [...(dialog?.querySelectorAll('button, input, a[href]') || [])].filter(
      (element) => !element.disabled,
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="docs-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="docs-dialog"
      >
        <header>
          <div>
            {isAsk ? <Sparkles aria-hidden="true" /> : <Search aria-hidden="true" />}
            <div>
              <h2 id={titleId}>
                {isAsk ? 'Ask Ghost Bridge — Documentation Preview' : 'Search documentation'}
              </h2>
              {isAsk ? (
                <p>Deterministic local retrieval. No question leaves this browser.</p>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog">
            <X aria-hidden="true" />
          </button>
        </header>
        <label className="docs-dialog-input">
          <span className="sr-only">{isAsk ? 'Documentation question' : 'Search query'}</span>
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            maxLength={200}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              isAsk
                ? 'How does scoped capability discovery work?'
                : 'Search Passports, SDK APIs, errors, extensions…'
            }
          />
          <kbd>Esc</kbd>
        </label>
        <div className="docs-dialog-results" aria-live="polite">
          {isAsk && answer ? (
            <div className={`docs-answer-state ${answer.confident ? '' : 'low-confidence'}`}>
              <BookOpenText aria-hidden="true" />
              <p>{answer.message}</p>
            </div>
          ) : null}
          {!query ? (
            <p className="docs-dialog-empty">
              Search public documentation, specification pages, SDK APIs, error codes, Extensions,
              Registry Preview fixtures, and GBEPs.
            </p>
          ) : null}
          {query && !results.length && !isAsk ? (
            <p className="docs-dialog-empty">No documentation result found.</p>
          ) : null}
          {Object.entries(groups).map(([group, items]) => (
            <section key={group}>
              <h3>{group}</h3>
              {items.map((result) => (
                <Link key={`${result.route}-${result.title}`} to={result.headingRoute} onClick={onClose}>
                  <span>
                    <strong>{result.title}</strong>
                    <small>{result.section} · {result.protocolStatus}</small>
                  </span>
                  <p>{result.excerpt}</p>
                  <small>Matched: {result.matchedTerms.join(', ') || 'related section'}</small>
                </Link>
              ))}
            </section>
          ))}
          {isAsk && answer && !answer.confident && searchResults.length ? (
            <section>
              <h3>Direct search results</h3>
              {searchResults.slice(0, 5).map((result) => (
                <Link key={result.route} to={result.headingRoute} onClick={onClose}>
                  <strong>{result.title}</strong>
                  <p>{result.excerpt}</p>
                </Link>
              ))}
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}

