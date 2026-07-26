const dns = require('node:dns').promises;
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const { Readable } = require('node:stream');
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

const blockedAddresses = new net.BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
]) {
  blockedAddresses.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['100::', 64],
  ['2001:2::', 48],
  ['2001:10::', 28],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
]) {
  blockedAddresses.addSubnet(network, prefix, 'ipv6');
}

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
  return blockedAddresses.check(address, 'ipv4');
}

function isBlockedIpv6(address) {
  const host = normalizeHostname(address);
  const mapped = ipv4MappedAddress(host);
  return mapped ? isBlockedIpv4(mapped) : blockedAddresses.check(host, 'ipv6');
}

function ipv4MappedAddress(address) {
  const match = /^(?:::ffff:|(?:0:){5}ffff:)(.+)$/.exec(address);
  if (!match) return undefined;
  if (net.isIP(match[1]) === 4) return match[1];
  const words = match[1].split(':');
  if (words.length !== 2 || words.some((word) => !/^[0-9a-f]{1,4}$/i.test(word))) {
    return undefined;
  }
  const high = Number.parseInt(words[0], 16);
  const low = Number.parseInt(words[1], 16);
  return `${high >>> 8}.${high & 0xff}.${low >>> 8}.${low & 0xff}`;
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
  const allowedPrivate =
    (options.allowDevelopmentDemo === true && isDevelopmentDemoRuntimeUrl(parsed)) ||
    (options.allowDevelopmentExternalAgent === true && isDevelopmentExternalAgentUrl(parsed));

  if (net.isIP(normalizeHostname(parsed.hostname))) {
    if (!allowedPrivate && isBlockedIp(parsed.hostname)) {
      throw new AppError(
        400,
        ErrorCodes.UNSAFE_URL,
        'URL host resolved to a blocked IP address.',
        detail('hostname', 'Resolved IP is local, private, metadata, link-local, or multicast.'),
      );
    }
    return {
      address: normalizeHostname(parsed.hostname),
      family: net.isIP(normalizeHostname(parsed.hostname)),
    };
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

  if (!records.length || (!allowedPrivate && records.some((record) => isBlockedIp(record.address)))) {
    throw new AppError(
      400,
      ErrorCodes.UNSAFE_URL,
      'URL host resolved to a blocked IP address.',
      detail('hostname', 'Resolved IP is local, private, metadata, link-local, or multicast.'),
    );
  }
  return { address: records[0].address, family: records[0].family };
}

function callerCancellationError(reason) {
  if (reason instanceof AppError) return reason;
  const causeName =
    typeof reason?.name === 'string' && /^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/.test(reason.name)
      ? reason.name
      : undefined;
  const causeCode =
    typeof reason?.code === 'string' && /^[A-Z][A-Z0-9_]{0,127}$/.test(reason.code)
      ? reason.code
      : undefined;
  return new AppError(
    409,
    ErrorCodes.INVOCATION_CANCELLED,
    'Outbound request was cancelled by the caller.',
    detail('request', 'The caller cancelled the outbound request.'),
    {
      reasonCode: 'CALLER_CANCELLED',
      ...(causeName || causeCode ? { cause: { name: causeName, code: causeCode } } : {}),
    },
  );
}

function deadlineError(timeoutMs) {
  return new AppError(
    504,
    ErrorCodes.SAFE_FETCH_TIMEOUT,
    'Outbound request timed out.',
    detail('timeout', 'safeFetch exceeded the configured absolute deadline.'),
    {
      timeoutReason: 'SAFE_FETCH_DEADLINE_EXCEEDED',
      configuredTimeoutMs: timeoutMs,
    },
  );
}

function signalError(signal) {
  return signal?.reason instanceof AppError
    ? signal.reason
    : callerCancellationError(signal?.reason);
}

function raceWithSignal(operation, signal, onAbort) {
  if (!signal) return Promise.resolve(operation);
  if (signal.aborted) {
    onAbort?.();
    return Promise.reject(signalError(signal));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', abort);
      callback(value);
    };
    const abort = () => {
      try {
        onAbort?.();
      } catch {
        // Abort cleanup is best-effort and must not replace the cancellation reason.
      }
      finish(reject, signalError(signal));
    };
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(operation).then(
      (value) => finish(resolve, value),
      (error) => finish(reject, error),
    );
  });
}

async function readLimitedBody(response, maxBytes, signal) {
  if (!response.body) return '';
  const declared = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await Promise.resolve(response.body.cancel?.()).catch(() => {});
    throw new AppError(
      502,
      ErrorCodes.SAFE_FETCH_RESPONSE_TOO_LARGE,
      'Outbound response exceeded the configured size limit.',
      detail('maxBytes', 'Declared response body was larger than the safeFetch maximum.', {
        maxBytes,
      }),
    );
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await raceWithSignal(reader.read(), signal, () => {
      Promise.resolve(reader.cancel(signal?.reason)).catch(() => {});
    });
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      try {
        Promise.resolve(reader.cancel()).catch(() => {});
      } catch {
        // The bounded-body error remains authoritative even if stream cleanup fails.
      }
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

function sanitizeFetchError(error, context = {}) {
  if (error instanceof AppError) return error;
  if (context.signal?.aborted) {
    if (context.signal.reason instanceof AppError) return context.signal.reason;
    if (context.deadlineExceeded === true) return deadlineError(context.timeoutMs);
    return callerCancellationError(context.callerSignal?.reason || context.signal.reason);
  }
  if (error?.name === 'AbortError') {
    if (context.deadlineExceeded === true) return deadlineError(context.timeoutMs);
    return callerCancellationError(context.callerSignal?.reason || error);
  }
  return new AppError(
    502,
    ErrorCodes.SAFE_FETCH_FAILED,
    'Outbound request failed.',
    detail('request', 'The remote request failed before a safe response was available.'),
  );
}

async function safeFetch(rawUrl, options = {}) {
  const suppliedTimeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(suppliedTimeoutMs) && suppliedTimeoutMs > 0
      ? Math.max(1, Math.floor(suppliedTimeoutMs))
      : DEFAULT_TIMEOUT_MS;
  const maxBytes = Number(options.maxBytes || DEFAULT_MAX_BYTES);
  const maxRedirects = Number(options.maxRedirects ?? DEFAULT_MAX_REDIRECTS);
  let nextUrl = String(rawUrl);
  let requestHeaders = options.headers || {};
  let deadlineExceeded = false;
  let transmissionStarted = false;
  const visited = new Set();
  const controller = new AbortController();
  const callerSignal = options.signal;
  const abortFromCaller = () => {
    if (!controller.signal.aborted) {
      controller.abort(callerCancellationError(callerSignal?.reason));
    }
  };
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => {
    if (controller.signal.aborted) return;
    deadlineExceeded = true;
    controller.abort(deadlineError(timeoutMs));
  }, timeoutMs);

  try {
    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      if (controller.signal.aborted) throw signalError(controller.signal);
      const parsed = parseSafeUrl(nextUrl, options);
      if (visited.has(parsed.toString())) {
        throw new AppError(
          502,
          ErrorCodes.SAFE_FETCH_FAILED,
          'Outbound redirect loop was rejected.',
          detail('redirect', 'Redirect loop detected.'),
        );
      }
      visited.add(parsed.toString());
      const pinned = await raceWithSignal(
        assertResolvedHostIsSafe(parsed, options),
        controller.signal,
      );

      if (!transmissionStarted && typeof options.beforeTransmit === 'function') {
        await raceWithSignal(
          Promise.resolve().then(() => options.beforeTransmit()),
          controller.signal,
        );
      }
      if (controller.signal.aborted) throw signalError(controller.signal);
      transmissionStarted = true;
      const fetchImplementation = options.fetchImpl || pinnedRequest;
      const response = await raceWithSignal(
        fetchImplementation(parsed, {
          method: options.method || 'GET',
          headers: requestHeaders,
          body: options.body,
          redirect: 'manual',
          signal: controller.signal,
          pinned,
        }),
        controller.signal,
      );

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
        try {
          await raceWithSignal(Promise.resolve(response.body?.cancel()), controller.signal);
        } catch {
          if (controller.signal.aborted) throw signalError(controller.signal);
          // Redirect body cleanup is best-effort and contains no returned application data.
        }
        const redirectTarget = new URL(location);
        if (parsed.protocol === 'https:' && redirectTarget.protocol !== 'https:') {
          throw new AppError(
            400,
            ErrorCodes.UNSAFE_URL,
            'HTTPS downgrade redirect was rejected.',
            detail('redirect', 'HTTPS-to-HTTP redirects are not allowed.'),
          );
        }
        const crossOrigin = redirectTarget.origin !== parsed.origin;
        const method = String(options.method || 'GET').toUpperCase();
        if (crossOrigin && !['GET', 'HEAD'].includes(method)) {
          throw new AppError(
            400,
            ErrorCodes.UNSAFE_URL,
            'Cross-origin side-effecting redirect was rejected.',
            detail('redirect', 'A request body is never resent across origins.'),
          );
        }
        if (crossOrigin) {
          requestHeaders = stripSensitiveHeadersForCrossOriginRedirect(requestHeaders);
        }
        if (
          response.status === 303 ||
          ([301, 302].includes(response.status) && method === 'POST')
        ) {
          options = { ...options, method: 'GET', body: undefined };
        } else if ([307, 308].includes(response.status) && crossOrigin) {
          throw new AppError(
            400,
            ErrorCodes.UNSAFE_URL,
            'Method-preserving cross-origin redirect was rejected.',
            detail('redirect', '307/308 redirects may not move a request across origins.'),
          );
        }
        nextUrl = location;
        continue;
      }

      return {
        ok: response.ok,
        status: response.status,
        url: parsed.toString(),
        headers: headersToObject(response.headers),
        bodyText: await readLimitedBody(response, maxBytes, controller.signal),
      };
    }
  } catch (error) {
    throw sanitizeFetchError(error, {
      signal: controller.signal,
      callerSignal,
      deadlineExceeded,
      timeoutMs,
    });
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }

  throw new AppError(
    502,
    ErrorCodes.SAFE_FETCH_FAILED,
    'Outbound request failed.',
    detail('request', 'safeFetch exited without a response.'),
  );
}

function pinnedRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const request = client.request(
      url,
      {
        method: options.method,
        headers: options.headers,
        agent: false,
        servername: url.hostname,
        rejectUnauthorized: true,
        lookup(_hostname, _lookupOptions, callback) {
          callback(null, options.pinned.address, options.pinned.family);
        },
      },
      (response) => {
        const headers = new Headers();
        for (const [name, value] of Object.entries(response.headers)) {
          if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
          else if (value !== undefined) headers.set(name, String(value));
        }
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          headers,
          body: Readable.toWeb(response),
        });
      },
    );
    request.once('error', reject);
    const abort = () => request.destroy(options.signal?.reason);
    if (options.signal?.aborted) abort();
    else options.signal?.addEventListener('abort', abort, { once: true });
    request.once('close', () => options.signal?.removeEventListener('abort', abort));
    if (options.body !== undefined) request.write(options.body);
    request.end();
  });
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
