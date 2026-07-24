import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  ExternalLink,
  Info as InfoIcon,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react';
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { pageToMarkdown, previousNext } from '../../docs/docsEngine.js';

export function PageTitle({ children }) {
  return <h1>{children}</h1>;
}

export function PageDescription({ children }) {
  return <p className="docs-page-description">{children}</p>;
}

export function StatusBadge({ children, state = children }) {
  return <span className={`docs-badge docs-badge-${String(state).toLowerCase()}`}>{children}</span>;
}

export function VersionBadge({ children }) {
  return <span className="docs-version-badge">{children}</span>;
}

const icons = {
  note: AlertCircle,
  info: InfoIcon,
  tip: Lightbulb,
  warning: AlertTriangle,
  danger: ShieldAlert,
};

export function Callout({ tone = 'note', title, children }) {
  const Icon = icons[tone] || AlertCircle;
  return (
    <aside className={`docs-callout docs-callout-${tone}`} aria-label={`${tone}: ${title}`}>
      <Icon aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
    </aside>
  );
}

export const Note = (props) => <Callout tone="note" {...props} />;
export const Info = (props) => <Callout tone="info" {...props} />;
export const Tip = (props) => <Callout tone="tip" {...props} />;
export const Warning = (props) => <Callout tone="warning" {...props} />;
export const Danger = (props) => <Callout tone="danger" {...props} />;
export const DeprecationNotice = ({ children }) => (
  <Warning title="Deprecated">{children}</Warning>
);
export const ExperimentalNotice = ({ children }) => (
  <Warning title="Experimental">{children}</Warning>
);

export function Steps({ children }) {
  return <ol className="docs-steps">{children}</ol>;
}

export function Step({ children }) {
  return <li>{children}</li>;
}

const TabsContext = createContext(null);

export function Tabs({ children, label = 'Code examples' }) {
  const items = Children.toArray(children).filter(isValidElement);
  const [active, setActive] = useState(0);
  const id = useId();
  const refs = useRef([]);
  const select = (index) => {
    const bounded = (index + items.length) % items.length;
    setActive(bounded);
    refs.current[bounded]?.focus();
  };
  return (
    <TabsContext.Provider value={{ active, id }}>
      <div className="docs-tabs">
        <div role="tablist" aria-label={label} className="docs-tab-list">
          {items.map((item, index) => (
            <button
              key={item.props.label}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${index}`}
              aria-controls={`${id}-panel-${index}`}
              aria-selected={active === index}
              tabIndex={active === index ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight') {
                  event.preventDefault();
                  select(index + 1);
                } else if (event.key === 'ArrowLeft') {
                  event.preventDefault();
                  select(index - 1);
                } else if (event.key === 'Home') {
                  event.preventDefault();
                  select(0);
                } else if (event.key === 'End') {
                  event.preventDefault();
                  select(items.length - 1);
                }
              }}
            >
              {item.props.label}
            </button>
          ))}
        </div>
        {items.map((item, index) =>
          cloneElement(item, { index, key: item.props.label }),
        )}
      </div>
    </TabsContext.Provider>
  );
}

export function Tab({ children, index = 0 }) {
  const context = useContext(TabsContext);
  if (!context) return children;
  return (
    <div
      role="tabpanel"
      id={`${context.id}-panel-${index}`}
      aria-labelledby={`${context.id}-tab-${index}`}
      hidden={context.active !== index}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

export function CodeGroup({ children }) {
  return <div className="docs-code-group">{children}</div>;
}

export function CodeBlock({ value, language = 'text', label = 'Code example' }) {
  return (
    <figure className="docs-code-block">
      <figcaption>
        <span>{label}</span>
        <span>{language}</span>
        <CopyCodeButton value={value} />
      </figcaption>
      <pre tabIndex={0}>
        <code>{value}</code>
      </pre>
    </figure>
  );
}

export function CopyCodeButton({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="docs-copy-button"
      onClick={async () => {
        await copyText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1_800);
      }}
      aria-label="Copy code"
    >
      {copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

export function CopyPageButton({ page }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="docs-action"
      onClick={async () => {
        await copyText(
          pageToMarkdown(page, {
            canonicalOrigin: window.location.origin,
          }),
        );
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1_800);
      }}
    >
      {copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Page copied' : 'Copy page as Markdown'}</span>
    </button>
  );
}

export function CopyCanonicalLinkButton({ route }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="docs-action"
      onClick={async () => {
        await copyText(new URL(route, window.location.origin).toString());
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1_800);
      }}
    >
      {copied ? <Check aria-hidden="true" /> : <ExternalLink aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Link copied' : 'Copy canonical link'}</span>
    </button>
  );
}

export function Card({ title, children, to }) {
  const content = (
    <>
      <h3>{title}</h3>
      <div>{children}</div>
    </>
  );
  return to ? (
    <Link className="docs-card" to={to}>
      {content}
    </Link>
  ) : (
    <article className="docs-card">{content}</article>
  );
}

export function CardGroup({ children }) {
  return <div className="docs-card-group">{children}</div>;
}

export function DefinitionTable({ items }) {
  return (
    <dl className="docs-definition-table">
      {items.map(({ term, definition }) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{definition}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SupportMatrix({ columns, rows, caption = 'Support matrix' }) {
  return <DataTable columns={columns} rows={rows} caption={caption} />;
}

export function ProtocolMessageExample(props) {
  return <CodeBlock label="Protocol message" language="json" {...props} />;
}

export function SchemaExample(props) {
  return <CodeBlock label="JSON Schema" language="json" {...props} />;
}

export function SafeDiagram({ label, nodes }) {
  return (
    <figure className="docs-diagram" aria-label={label}>
      <figcaption>{label}</figcaption>
      <ol>
        {nodes.map((node) => (
          <li key={node}>{node}</li>
        ))}
      </ol>
      <p className="sr-only">Diagram sequence: {nodes.join(', then ')}</p>
    </figure>
  );
}

export const MermaidDiagram = SafeDiagram;

export function NextSteps({ children }) {
  return (
    <section className="docs-next-steps">
      <h2>Next steps</h2>
      {children}
    </section>
  );
}

export function PreviousNextNavigation({ page }) {
  const { previous, next } = previousNext(page);
  return (
    <nav className="docs-previous-next" aria-label="Previous and next documentation">
      {previous ? (
        <Link to={previous.route}>
          <ChevronLeft aria-hidden="true" />
          <span>
            <small>Previous</small>
            {previous.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link to={next.route}>
          <span>
            <small>Next</small>
            {next.title}
          </span>
          <ChevronRight aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );
}

export function OnThisPage({ items }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    for (const item of items) {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [items]);
  return (
    <nav aria-label="On this page" className="docs-on-this-page">
      <strong>On this page</strong>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={active === item.id ? 'active' : undefined}
          aria-current={active === item.id ? 'location' : undefined}
        >
          {item.title}
        </a>
      ))}
    </nav>
  );
}

export function Breadcrumbs({ page }) {
  return (
    <nav aria-label="Breadcrumb" className="docs-breadcrumbs">
      <ol>
        <li>
          <Link to="/docs/get-started/what-is-ghost-bridge">Documentation</Link>
        </li>
        <li>{page.category}</li>
        <li aria-current="page">{page.title}</li>
      </ol>
    </nav>
  );
}

export function DocumentationBlocks({ blocks }) {
  return blocks.map((block, index) => {
    if (typeof block === 'string') return <p key={index}>{block}</p>;
    if (block.type === 'bullets') {
      return (
        <ul key={index}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }
    if (block.type === 'steps') {
      return (
        <Steps key={index}>
          {block.items.map((item) => (
            <Step key={item}>{item}</Step>
          ))}
        </Steps>
      );
    }
    if (block.type === 'code') return <CodeBlock key={index} {...block} />;
    if (block.type === 'callout') {
      return (
        <Callout key={index} tone={block.tone} title={block.title}>
          <p>{block.body}</p>
        </Callout>
      );
    }
    if (block.type === 'table') {
      return <DataTable key={index} {...block} caption={`${block.columns[0]} table`} />;
    }
    if (block.type === 'diagram') return <SafeDiagram key={index} {...block} />;
    return null;
  });
}

function DataTable({ columns, rows, caption }) {
  return (
    <div className="docs-table-scroll" tabIndex={0}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`}>
              {row.map((cell, cellIndex) =>
                cellIndex === 0 ? (
                  <th key={cellIndex} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={cellIndex}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

