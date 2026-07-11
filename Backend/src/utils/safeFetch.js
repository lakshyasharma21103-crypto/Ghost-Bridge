const dns = require('node:dns').promises;
const net = require('node:net');
const { env } = require('../config/env');
const { AppError } = require('./AppError');
const { ErrorCodes } = require('./errorCodes');
const { redactSecrets } = require('./redact');

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 3;
const DEVELOPMENT_DEMO_RUNTIME_PATH = '/api/v1/demo/mock-agent/run';
const EXTERNAL_AGENT_RUNTIME_PATH = '/v1/research/invoke';
const EXTERNAL_AGENT_HEALTH_PATH = '/health';

function detail(path, message, extra = {}) {
  return [{ path, message, ...extra }];
}

function normalizeHostname(hostname) {
  return String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^\[/, '')
    .replace(/\]$/, '');
}

function ipv4Parts(address) {
  return address.split('.').map((part) => Number(part));
}

function isBlockedIpv4(address) {
  const parts = ipv4Parts(address);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }
  const [a, b, c, d] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    address === '169.254.169.254' ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 255 && b === 255 && c === 255 && d === 255)
  );
}

function isBlockedIpv6(address) {
  const host = normalizeHostname(address);
  return (
    host === '::' ||
    host === '::1' ||
    host.startsWith('::ffff:127.') ||
    host.startsWith('::ffff:10.') ||
    host.startsWith('::ffff:192.168.') ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.startsWith('fe80') ||
    host.startsWith('ff') ||
    host.startsWith('0:')
  );
}

function isBlockedIp(address) {
  const version = net.isIP(normalizeHostname(address));
  if (version === 4) return isBlockedIpv4(normalizeHostname(address));
  if (version === 6) return isBlockedIpv6(normalizeHostname(address));
  return false;
}

function isBlockedHostname(hostname) {
  const host = normalizeHostname(hostname);
  return (
    !host ||
    host === 'localhost' ||
    host === 'localhost.localdomain' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal' ||
    host === '169.254.169.254' ||
    (!host.includes('.') && !net.isIP(host))
  );
}

function developmentDemoRuntimeUrl() {
  return `http://127.0.0.1:${env.PORT}${DEVELOPMENT_DEMO_RUNTIME_PATH}`;
}

function externalTestAgentBaseUrl() {
  return String(env.EXTERNAL_TEST_AGENT_BASE_URL || '')
    .trim()
    .replace(/\/+$/, '');
}

function externalTestAgentUrl(pathname) {
  return `${externalTestAgentBaseUrl()}${pathname}`;
}

function isDevelopmentExternalAgentUrl(value) {
  if (env.NODE_ENV !== 'development' || env.ALLOW_PRIVATE_RUNTIME_URLS_IN_DEV !== true) {
    return false;
  }

  let parsed;
  try {
    parsed = value instanceof URL ? value : new URL(value);
  } catch {
    return false;
  }

  if (parsed.username || parsed.password || parsed.search || parsed.hash) return false;
  const allowedUrls = [
    externalTestAgentUrl(EXTERNAL_AGENT_RUNTIME_PATH),
    externalTestAgentUrl(EXTERNAL_AGENT_HEALTH_PATH),
  ];
  return allowedUrls.some((allowed) => {
    try {
      return parsed.toString() === new URL(allowed).toString();
    } catch {
      return false;
    }
  });
}

function isDevelopmentDemoRuntimeUrl(value) {
  let parsed;
  try {
    parsed = value instanceof URL ? value : new URL(value);
  } catch {
    return false;
  }

  return (
    env.NODE_ENV === 'development' &&
    parsed.protocol === 'http:' &&
    normalizeHostname(parsed.hostname) === '127.0.0.1' &&
    parsed.port === String(env.PORT) &&
    parsed.pathname === DEVELOPMENT_DEMO_RUNTIME_PATH &&
    !parsed.username &&
    !parsed.password &&
    !parsed.search &&
    !parsed.hash
  );
}

function parseSafeUrl(rawUrl, options = {}) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppError(
      400,
      ErrorCodes.UNSAFE_URL,
      'URL is invalid.',
      detail('url', 'URL must be valid.'),
    );
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError(
      400,
      ErrorCodes.UNSAFE_URL,
      'URL protocol is not allowed.',
      detail('url', 'Only HTTP and HTTPS URLs are allowed.'),
    );
  }

  if (env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new AppError(
      400,
      ErrorCodes.UNSAFE_URL,
      'HTTPS is required for outbound requests in production.',
      detail('url', 'Production safeFetch requests must use HTTPS.'),
    );
  }

  if (parsed.username || parsed.password) {
    throw new AppError(
      400,
      ErrorCodes.UNSAFE_URL,
      'URL must not contain credentials.',
      detail('url', 'Embedded URL credentials are not allowed.'),
    );
  }

  const isApprovedDevelopmentDemo =
    options.allowDevelopmentDemo === true && isDevelopmentDemoRuntimeUrl(parsed);
  const isApprovedDevelopmentExternalAgent =
    options.allowDevelopmentExternalAgent === true && isDevelopmentExternalAgentUrl(parsed);

  if (
    !isApprovedDevelopmentDemo &&
    !isApprovedDevelopmentExternalAgent &&
    (isBlockedHostname(parsed.hostname) || isBlockedIp(parsed.hostname))
  ) {
    throw new AppError(
      400,
      ErrorCodes.UNSAFE_URL,
      'URL host is not allowed.',
      detail('hostname', 'Local, private, metadata, multicast, and internal hosts are blocked.'),
    );
  }

  if (options.noQuery && parsed.search) {
    throw new AppError(
      400,
      ErrorCodes.UNSAFE_URL,
      'URL must not include query parameters.',
      detail('url', 'Query parameters are not allowed for this request.'),
    );
  }

  return parsed;
}

async function assertResolvedHostIsSafe(parsed, options = {}) {
  if (options.allowDevelopmentDemo === true && isDevelopmentDemoRuntimeUrl(parsed)) {
    return;
  }
  if (options.allowDevelopmentExternalAgent === true && isDevelopmentExternalAgentUrl(parsed)) {
    return;
  }

  if (net.isIP(normalizeHostname(parsed.hostname))) {
    if (isBlockedIp(parsed.hostname)) {
      throw new AppError(
        400,
        ErrorCodes.UNSAFE_URL,
        'URL host resolved to a blocked IP address.',
        detail('hostname', 'Resolved IP is local, private, metadata, link-local, or multicast.'),
      );
    }
    return;
  }

  let records;
  try {
    records = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
  } catch {
    throw new AppError(
      502,
      ErrorCodes.SAFE_FETCH_FAILED,
      'Outbound host could not be resolved.',
      detail('hostname', 'DNS resolution failed.'),
    );
  }

  if (!records.length || records.some((record) => isBlockedIp(record.address))) {
    throw new AppError(
      400,
      ErrorCodes.UNSAFE_URL,
      'URL host resolved to a blocked IP address.',
      detail('hostname', 'Resolved IP is local, private, metadata, link-local, or multicast.'),
    );
  }
}

async function readLimitedBody(response, maxBytes) {
  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new AppError(
        502,
        ErrorCodes.SAFE_FETCH_RESPONSE_TOO_LARGE,
        'Outbound response exceeded the configured size limit.',
        detail('maxBytes', 'Response body was larger than the safeFetch maximum.', { maxBytes }),
      );
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks).toString('utf8');
}

function headersToObject(headers) {
  return redactSecrets(Object.fromEntries(headers.entries()));
}

function isSensitiveOutboundHeader(name) {
  return ['authorization', 'proxy-authorization', 'cookie', 'x-api-key'].includes(
    String(name).toLowerCase(),
  );
}

function stripSensitiveHeadersForCrossOriginRedirect(headers) {
  const normalized = new Headers(headers || {});
  for (const name of [...normalized.keys()]) {
    const lowerName = String(name).toLowerCase();
    if (isSensitiveOutboundHeader(lowerName) || !['accept', 'content-type'].includes(lowerName)) {
      normalized.delete(name);
    }
  }
  return Object.fromEntries(normalized.entries());
}

function redirectUrl(response, currentUrl) {
  const location = response.headers.get('location');
  if (!location) return null;
  return new URL(location, currentUrl).toString();
}

function sanitizeFetchError(error) {
  if (error instanceof AppError) return error;
  if (error?.name === 'AbortError') {
    return new AppError(
      504,
      ErrorCodes.SAFE_FETCH_TIMEOUT,
      'Outbound request timed out.',
      detail('timeout', 'safeFetch aborted the request after the configured timeout.'),
    );
  }
  return new AppError(
    502,
    ErrorCodes.SAFE_FETCH_FAILED,
    'Outbound request failed.',
    detail('request', 'The remote request failed before a safe response was available.'),
  );
}

async function safeFetch(rawUrl, options = {}) {
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const maxBytes = Number(options.maxBytes || DEFAULT_MAX_BYTES);
  const maxRedirects = Number(options.maxRedirects ?? DEFAULT_MAX_REDIRECTS);
  let nextUrl = String(rawUrl);
  let requestHeaders = options.headers || {};

  try {
    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      const parsed = parseSafeUrl(nextUrl, options);
      await assertResolvedHostIsSafe(parsed, options);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetch(parsed, {
          method: options.method || 'GET',
          headers: requestHeaders,
          body: options.body,
          redirect: 'manual',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (response.status >= 300 && response.status < 400) {
        const location = redirectUrl(response, parsed);
        if (!location) {
          throw new AppError(
            502,
            ErrorCodes.SAFE_FETCH_FAILED,
            'Redirect response did not include a location.',
            detail('redirect', 'Redirect location is missing.'),
          );
        }
        if (redirectCount >= maxRedirects) {
          throw new AppError(
            502,
            ErrorCodes.SAFE_FETCH_FAILED,
            'Outbound request exceeded the redirect limit.',
            detail('redirect', 'Too many redirects.', { maxRedirects }),
          );
        }
        if (new URL(location).origin !== parsed.origin) {
          requestHeaders = stripSensitiveHeadersForCrossOriginRedirect(requestHeaders);
        }
        nextUrl = location;
        continue;
      }

      return {
        ok: response.ok,
        status: response.status,
        url: parsed.toString(),
        headers: headersToObject(response.headers),
        bodyText: await readLimitedBody(response, maxBytes),
      };
    }
  } catch (error) {
    throw sanitizeFetchError(error);
  }

  throw new AppError(
    502,
    ErrorCodes.SAFE_FETCH_FAILED,
    'Outbound request failed.',
    detail('request', 'safeFetch exited without a response.'),
  );
}

module.exports = {
  safeFetch,
  parseSafeUrl,
  isBlockedIp,
  isBlockedHostname,
  developmentDemoRuntimeUrl,
  isDevelopmentDemoRuntimeUrl,
  externalTestAgentBaseUrl,
  externalTestAgentUrl,
  isDevelopmentExternalAgentUrl,
  EXTERNAL_AGENT_RUNTIME_PATH,
  EXTERNAL_AGENT_HEALTH_PATH,
  stripSensitiveHeadersForCrossOriginRedirect,
};
