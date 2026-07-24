import {
  docsManifest,
  gbepIndex,
  protocolProfile,
  publicTopNavigation,
  registryAgents,
  slugifyHeading,
} from './docsManifest.js';

const ALLOWED_STATES = new Set(['Experimental', 'Preview', 'Planned', 'Stable', 'Deprecated', 'Removed']);
const MAX_QUERY_LENGTH = 200;
const MAX_RESULTS = 20;
const MAX_EXCERPT_LENGTH = 220;

export function validateDocumentationManifest(manifest = docsManifest) {
  const errors = [];
  const routes = new Set();
  const ids = new Set();
  const orders = new Set();
  const supportedVersions = new Set([protocolProfile.protocolVersion]);
  const knownRoutes = new Set(manifest.map((page) => page.route));

  for (const page of manifest) {
    if (!page.title?.trim()) errors.push(`${page.route || page.id}: missing title`);
    if (!page.route?.startsWith('/')) errors.push(`${page.id}: invalid route`);
    if (routes.has(page.route)) errors.push(`${page.route}: duplicate route`);
    routes.add(page.route);
    if (ids.has(page.id)) errors.push(`${page.id}: duplicate page ID`);
    ids.add(page.id);
    const orderKey = `${page.category}:${page.order}`;
    if (orders.has(orderKey)) errors.push(`${page.route}: duplicate navigation order`);
    orders.add(orderKey);
    if (!ALLOWED_STATES.has(page.featureState)) errors.push(`${page.route}: invalid feature state`);
    if (!supportedVersions.has(page.protocolVersion)) errors.push(`${page.route}: unsupported protocol version`);
    if (!page.sourcePath) errors.push(`${page.route}: missing source path`);
    if (!Array.isArray(page.tableOfContents)) errors.push(`${page.route}: missing table of contents`);
    const anchors = new Set();
    for (const item of page.tableOfContents || []) {
      if (anchors.has(item.id)) errors.push(`${page.route}#${item.id}: duplicate anchor`);
      anchors.add(item.id);
    }
    for (const link of extractInternalLinks(page)) {
      const [route, anchor] = link.split('#');
      const target = manifest.find((candidate) => candidate.route === route);
      if (!knownRoutes.has(route)) errors.push(`${page.route}: broken internal link ${link}`);
      else if (anchor && !target.tableOfContents.some((item) => item.id === anchor)) {
        errors.push(`${page.route}: broken anchor ${link}`);
      }
    }
  }
  for (const item of publicTopNavigation) {
    if (!knownRoutes.has(item.route)) errors.push(`top navigation: dead route ${item.route}`);
  }
  if (errors.length) {
    const error = new Error(`Documentation manifest validation failed:\n${errors.join('\n')}`);
    error.validationErrors = errors;
    throw error;
  }
  return {
    pageCount: manifest.length,
    routeCount: routes.size,
    groupCount: new Set(manifest.map((page) => page.category)).size,
  };
}

export function pageToMarkdown(page, options = {}) {
  if (!page) throw new TypeError('A public documentation page is required.');
  const canonicalOrigin = String(options.canonicalOrigin || '').replace(/\/$/, '');
  const lines = [
    `# ${page.title}`,
    '',
    page.description,
    '',
    `> Protocol: ${page.protocolVersion}`,
    `> Status: ${page.stability} · ${page.featureState}`,
    `> Canonical route: ${canonicalOrigin}${page.route}`,
    '',
  ];
  for (const section of page.sections) {
    lines.push(`## ${section.heading}`, '');
    for (const block of section.content) {
      lines.push(...blockToMarkdown(block), '');
    }
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function blockToMarkdown(block) {
  if (typeof block === 'string') return [block];
  if (block.type === 'bullets') return block.items.map((item) => `- ${item}`);
  if (block.type === 'steps') return block.items.map((item, index) => `${index + 1}. ${item}`);
  if (block.type === 'code') return [`\`\`\`${block.language || 'text'}`, block.value, '```'];
  if (block.type === 'callout') {
    return [`> **${block.title} (${block.tone})**`, `> ${block.body}`];
  }
  if (block.type === 'table') {
    return [
      `| ${block.columns.join(' | ')} |`,
      `| ${block.columns.map(() => '---').join(' | ')} |`,
      ...block.rows.map((row) => `| ${row.join(' | ')} |`),
    ];
  }
  if (block.type === 'diagram') {
    return [`**Diagram: ${block.label}**`, '', block.nodes.map((node) => `- ${node}`).join('\n')];
  }
  return [];
}

export function createSearchIndex(manifest = docsManifest) {
  const documents = manifest.map((page) => {
    const headings = page.sections.map((section) => section.heading);
    const body = page.sections
      .flatMap((section) => section.content.flatMap(blockText))
      .join(' ');
    return Object.freeze({
      id: page.id,
      route: page.route,
      title: page.title,
      description: page.description,
      section: page.category,
      kind: page.kind,
      protocolStatus: `${page.stability} · ${page.featureState}`,
      headings,
      body,
      keywords: page.keywords.join(' '),
      aliases: page.aliases.join(' '),
      titleTokens: tokenize(page.title),
      headingTokens: tokenize(headings.join(' ')),
      bodyTokens: tokenize(body),
      keywordTokens: tokenize(`${page.keywords.join(' ')} ${page.aliases.join(' ')}`),
    });
  });
  for (const agent of registryAgents) {
    const target = documents.find((document) => document.route === `/registry/agents/${agent.slug}`);
    if (target) target.bodyTokens.push(...tokenize(`${agent.displayName} ${agent.capabilities.join(' ')}`));
  }
  for (const gbep of gbepIndex) {
    const target = documents.find((document) => document.route === gbep.route);
    if (target) target.keywordTokens.push(...tokenize(`GBEP ${gbep.number} ${gbep.title}`));
  }
  return Object.freeze(documents);
}

export function searchDocumentation(query, options = {}) {
  const boundedQuery = String(query || '').trim().slice(0, MAX_QUERY_LENGTH);
  if (!boundedQuery) return [];
  const queryTokens = tokenize(boundedQuery).slice(0, 20);
  if (!queryTokens.length) return [];
  const index = options.index || defaultSearchIndex;
  const limit = Math.max(1, Math.min(Number(options.limit) || 10, MAX_RESULTS));
  return index
    .map((document) => {
      const score = scoreDocument(document, queryTokens);
      return { document, score };
    })
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.document.title.localeCompare(right.document.title) ||
        left.document.route.localeCompare(right.document.route),
    )
    .slice(0, limit)
    .map(({ document, score }) => ({
      title: document.title,
      section: document.section,
      group: document.kind,
      excerpt: createExcerpt(document, queryTokens),
      matchedTerms: queryTokens.filter((token) =>
        [...document.titleTokens, ...document.headingTokens, ...document.bodyTokens, ...document.keywordTokens]
          .some((candidate) => matchesToken(candidate, token)),
      ),
      route: document.route,
      headingRoute: bestHeadingRoute(document, queryTokens),
      protocolStatus: document.protocolStatus,
      score,
    }));
}

export function askGhostBridge(question, options = {}) {
  const results = searchDocumentation(question, { ...options, limit: 6 });
  const questionTokens = tokenize(String(question || '')).slice(0, 20);
  const minimumMatchedTerms = Math.max(1, Math.ceil(questionTokens.length / 2));
  const confident = results.filter(
    (result) =>
      result.score >= 7 &&
      new Set(result.matchedTerms).size >= minimumMatchedTerms,
  );
  if (!confident.length) {
    return {
      confident: false,
      message: 'No confident documentation result found.',
      results,
    };
  }
  return {
    confident: true,
    message:
      'These sections are deterministic documentation matches, not an authoritative model-generated answer.',
    results: confident.slice(0, 4),
  };
}

export function groupSearchResults(results) {
  return results.reduce((groups, result) => {
    const group = result.group || 'Documentation';
    if (!groups[group]) groups[group] = [];
    groups[group].push(result);
    return groups;
  }, {});
}

export function generateLlmsText(manifest = docsManifest) {
  validateDocumentationManifest(manifest);
  const lines = [
    '# Ghost Bridge Protocol',
    '',
    protocolProfile.definition,
    '',
    `Status: ${protocolProfile.protocolVersion} is ${protocolProfile.stability} and MUST be treated as experimental.`,
    `Tagline: ${protocolProfile.tagline}`,
    '',
    '## Public documentation index',
    '',
  ];
  for (const page of manifest) {
    lines.push(`- [${page.title}](${page.route}): ${page.description} (${page.featureState})`);
  }
  return `${lines.join('\n')}\n`;
}

export function generateLlmsFullText(manifest = docsManifest, options = {}) {
  validateDocumentationManifest(manifest);
  const maximumBytes = Math.max(32_768, Math.min(options.maximumBytes || 1_500_000, 2_000_000));
  const chunks = [
    '# Ghost Bridge public documentation',
    '',
    `${protocolProfile.protocolVersion} is experimental. Private Console and commercial administration content are excluded.`,
    '',
  ];
  let bytes = BufferSafe.byteLength(chunks.join('\n'));
  for (const page of manifest) {
    const markdown = pageToMarkdown(page);
    const pageBytes = BufferSafe.byteLength(markdown);
    if (bytes + pageBytes > maximumBytes) break;
    chunks.push(markdown);
    bytes += pageBytes;
  }
  return `${chunks.join('\n---\n').trim()}\n`;
}

export function previousNext(page, manifest = docsManifest) {
  const index = manifest.findIndex((candidate) => candidate.route === page.route);
  return {
    previous: index > 0 ? manifest[index - 1] : undefined,
    next: index >= 0 && index < manifest.length - 1 ? manifest[index + 1] : undefined,
  };
}

function scoreDocument(document, queryTokens) {
  return queryTokens.reduce((score, token) => {
    const exactTitle = document.titleTokens.some((candidate) => candidate === token);
    const title = document.titleTokens.some((candidate) => matchesToken(candidate, token));
    const heading = document.headingTokens.some((candidate) => matchesToken(candidate, token));
    const keyword = document.keywordTokens.some((candidate) => matchesToken(candidate, token));
    const body = document.bodyTokens.some((candidate) => matchesToken(candidate, token));
    return score + (exactTitle ? 12 : title ? 9 : 0) + (heading ? 6 : 0) + (keyword ? 4 : 0) + (body ? 2 : 0);
  }, 0);
}

function matchesToken(candidate, query) {
  if (candidate === query || candidate.startsWith(query) || query.startsWith(candidate)) return true;
  return query.length >= 5 && candidate.length >= 5 && editDistanceAtMostOne(candidate, query);
}

function editDistanceAtMostOne(left, right) {
  if (Math.abs(left.length - right.length) > 1) return false;
  let edits = 0;
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }
  return edits + (leftIndex < left.length || rightIndex < right.length ? 1 : 0) <= 1;
}

function createExcerpt(document, queryTokens) {
  const text = `${document.description} ${document.body}`.replace(/\s+/g, ' ').trim();
  const lower = text.toLowerCase();
  const position = queryTokens
    .map((token) => lower.indexOf(token))
    .filter((value) => value >= 0)
    .sort((left, right) => left - right)[0] || 0;
  const start = Math.max(0, position - 60);
  const excerpt = text.slice(start, start + MAX_EXCERPT_LENGTH);
  return `${start > 0 ? '…' : ''}${excerpt}${start + MAX_EXCERPT_LENGTH < text.length ? '…' : ''}`;
}

function bestHeadingRoute(document, queryTokens) {
  const heading = document.headings.find((value) => {
    const tokens = tokenize(value);
    return queryTokens.some((query) => tokens.some((candidate) => matchesToken(candidate, query)));
  });
  return heading ? `${document.route}#${slugifyHeading(heading)}` : document.route;
}

function tokenize(value) {
  return [...new Set(String(value || '').toLowerCase().match(/[a-z0-9][a-z0-9._-]*/g) || [])];
}

function blockText(block) {
  if (typeof block === 'string') return [block];
  if (block.type === 'code') return [block.label, block.value];
  if (block.type === 'callout') return [block.title, block.body];
  if (block.type === 'table') return [...block.columns, ...block.rows.flat()];
  if (block.type === 'diagram') return [block.label, ...block.nodes];
  return block.items || [];
}

function extractInternalLinks(page) {
  const text = page.sections.flatMap((section) => section.content.flatMap(blockText)).join(' ');
  return [...text.matchAll(/\]\((\/[^)\s]+)\)/g)].map((match) => match[1]);
}

const BufferSafe = {
  byteLength(value) {
    if (typeof Buffer !== 'undefined') return Buffer.byteLength(value, 'utf8');
    return new TextEncoder().encode(value).byteLength;
  },
};

export const defaultSearchIndex = createSearchIndex();
