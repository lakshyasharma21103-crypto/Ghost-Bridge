'use strict';

const dns = require('node:dns');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');

const blocked = new net.BlockList();
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
  blocked.addSubnet(network, prefix, 'ipv4');
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
  blocked.addSubnet(network, prefix, 'ipv6');
}

class SecureTransportError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'SecureTransportError';
    this.code = code;
    this.retryable = options.retryable === true;
  }
}

function transportError(code, message, options) {
  return new SecureTransportError(code, message, options);
}

function isPublicAddress(address) {
  const normalized = String(address || '').replace(/^\[|\]$/g, '').toLowerCase();
  const family = net.isIP(normalized);
  if (!family) return false;
  if (family === 4) return !blocked.check(normalized, 'ipv4');
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);
  if (mapped) return isPublicAddress(mapped[1]);
  return !blocked.check(normalized, 'ipv6');
}

function normalizeAllowedOrigins(values) {
  return new Set(
    (values || []).map((value) => {
      const url = new URL(value);
      return url.origin.toLowerCase();
    }),
  );
}

function validateTransportUrl(value, options = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw transportError('UNSAFE_DISCOVERY_TARGET', 'The trust endpoint URL is invalid.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw transportError(
      'UNSAFE_DISCOVERY_TARGET',
      'Trust endpoints must not contain credentials, a query, or a fragment.',
    );
  }
  const localOrigins = normalizeAllowedOrigins(options.allowedLocalOrigins);
  const localFixture =
    options.localFixtureMode === true && localOrigins.has(url.origin.toLowerCase());
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localFixture)) {
    throw transportError(
      'UNSAFE_DISCOVERY_TARGET',
      'Remote trust endpoints require HTTPS.',
    );
  }
  const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
  const allowedPorts = new Set(
    options.allowedPorts || (localFixture ? [port] : [443]),
  );
  if (!allowedPorts.has(port)) {
    throw transportError('UNSAFE_DISCOVERY_TARGET', 'The trust endpoint port is not allowed.');
  }
  return { url, localFixture };
}

async function resolveAndPin(url, options = {}) {
  const literalFamily = net.isIP(url.hostname.replace(/^\[|\]$/g, ''));
  const records = literalFamily
    ? [{ address: url.hostname.replace(/^\[|\]$/g, ''), family: literalFamily }]
    : await (options.lookup || dns.promises.lookup)(url.hostname, {
        all: true,
        verbatim: true,
      });
  if (!Array.isArray(records) || records.length === 0) {
    throw transportError(
      'ISSUER_DISCOVERY_FAILED',
      'The trust endpoint hostname did not resolve.',
      { retryable: true },
    );
  }
  const normalized = records.map((record) => ({
    address: String(record.address),
    family: Number(record.family || net.isIP(record.address)),
  }));
  if (
    normalized.some(
      ({ address, family }) =>
        ![4, 6].includes(family) ||
        (!options.localFixture && !isPublicAddress(address)) ||
        (options.localFixture && !isLoopbackAddress(address)),
    )
  ) {
    throw transportError(
      'UNSAFE_DISCOVERY_TARGET',
      'The trust endpoint resolved to a non-public destination.',
    );
  }
  return normalized[0];
}

function isLoopbackAddress(address) {
  const normalized = String(address).toLowerCase();
  return normalized === '::1' || /^127\./.test(normalized);
}

function createNodeSecurityTransport(defaults = {}) {
  return Object.freeze({
    securityProperties: Object.freeze({
      dnsRebindingResistant: true,
      redirects: 'rejected',
      addressPinning: true,
      tlsServerNameValidation: true,
    }),
    async get(urlValue, requestOptions = {}) {
      const options = { ...defaults, ...requestOptions };
      const validated = validateTransportUrl(urlValue, options);
      const pinned = await resolveAndPin(validated.url, {
        ...options,
        localFixture: validated.localFixture,
      });
      return requestPinned(validated.url, pinned, options);
    },
  });
}

function requestPinned(url, pinned, options) {
  return new Promise((resolve, reject) => {
    const maximumBytes = boundedInteger(options.maximumBytes, 1, 16_777_216, 131_072);
    const timeoutMs = boundedInteger(options.timeoutMs, 50, 30_000, 5_000);
    const expectedContentTypes = (options.expectedContentTypes || ['application/json']).map(
      (value) => String(value).toLowerCase(),
    );
    const client = url.protocol === 'https:' ? https : http;
    let settled = false;
    const finish = (operation, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      options.signal?.removeEventListener('abort', onCallerAbort);
      operation(value);
    };
    const request = client.request(
      url,
      {
        method: 'GET',
        headers: {
          accept: expectedContentTypes.join(', '),
          'user-agent': 'ghostbridge-trust/0.1-draft',
        },
        agent: false,
        servername: url.hostname,
        rejectUnauthorized: true,
        lookup(_hostname, _lookupOptions, callback) {
          callback(null, pinned.address, pinned.family);
        },
      },
      (response) => {
        const status = Number(response.statusCode || 0);
        if (status >= 300 && status < 400) {
          response.destroy();
          finish(
            reject,
            transportError(
              'ISSUER_DISCOVERY_FAILED',
              'Trust endpoint redirects are rejected.',
            ),
          );
          return;
        }
        const contentType = String(response.headers['content-type'] || '')
          .split(';', 1)[0]
          .trim()
          .toLowerCase();
        if (!expectedContentTypes.includes(contentType)) {
          response.destroy();
          finish(
            reject,
            transportError(
              'ISSUER_DISCOVERY_FAILED',
              'The trust endpoint returned an unexpected content type.',
            ),
          );
          return;
        }
        const declared = Number(response.headers['content-length']);
        if (Number.isFinite(declared) && declared > maximumBytes) {
          response.destroy();
          finish(
            reject,
            transportError(
              'RESPONSE_TOO_LARGE',
              'The trust response exceeds its configured size limit.',
            ),
          );
          return;
        }
        const chunks = [];
        let size = 0;
        response.on('data', (chunk) => {
          size += chunk.length;
          if (size > maximumBytes) {
            response.destroy();
            finish(
              reject,
              transportError(
                'RESPONSE_TOO_LARGE',
                'The trust response exceeds its configured size limit.',
              ),
            );
            return;
          }
          chunks.push(chunk);
        });
        response.once('error', () =>
          finish(
            reject,
            transportError(
              'ISSUER_DISCOVERY_FAILED',
              'The trust response could not be read.',
              { retryable: true },
            ),
          ),
        );
        response.once('end', () =>
          finish(resolve, {
            status,
            ok: status >= 200 && status < 300,
            headers: {
              get(name) {
                const value = response.headers[String(name).toLowerCase()];
                return Array.isArray(value) ? value.join(', ') : value ?? null;
              },
            },
            async text() {
              return Buffer.concat(chunks).toString('utf8');
            },
          }),
        );
      },
    );
    request.once('error', () =>
      finish(
        reject,
        transportError(
          'ISSUER_DISCOVERY_FAILED',
          'The trust endpoint request failed.',
          { retryable: true },
        ),
      ),
    );
    const abort = (code, message, retryable) => {
      request.destroy();
      finish(reject, transportError(code, message, { retryable }));
    };
    const onCallerAbort = () =>
      abort('ISSUER_DISCOVERY_FAILED', 'The trust request was cancelled.', false);
    const deadline = setTimeout(
      () =>
        abort(
          'ISSUER_DISCOVERY_FAILED',
          'The trust request exceeded its total deadline.',
          true,
        ),
      timeoutMs,
    );
    if (options.signal?.aborted) {
      onCallerAbort();
      return;
    }
    options.signal?.addEventListener('abort', onCallerAbort, { once: true });
    request.end();
  });
}

function boundedInteger(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : fallback;
}

module.exports = {
  SecureTransportError,
  createNodeSecurityTransport,
  isPublicAddress,
  resolveAndPin,
  validateTransportUrl,
};
