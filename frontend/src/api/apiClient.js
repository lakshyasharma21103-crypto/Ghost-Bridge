const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';
let partnerApiKey = '';

const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const SAFE_CANCELLATION_STATES = new Set([
  'not_requested',
  'requested',
  'aborting',
  'confirmed',
  'rejected',
  'outcome_unknown',
]);
const SAFE_RECOVERY_DECISIONS = new Set([
  'not_evaluated',
  'retry_allowed',
  'retry_denied',
  'resolve_as_failed_allowed',
  'resolve_as_cancelled_allowed',
  'mark_succeeded_allowed',
  'operator_review_required',
]);

export class ApiClientError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.status = options.status || 0;
    this.code = options.code || 'REQUEST_FAILED';
    this.details = options.details || [];
    this.requestId = options.requestId;
    this.traceId = options.traceId;
    this.reasonCode = options.reasonCode;
    this.cancellationState = options.cancellationState;
    this.recoveryDecision = options.recoveryDecision;
    this.recoveryRequired = options.recoveryRequired === true;
  }
}

export function setPartnerApiKey(value) {
  partnerApiKey = typeof value === 'string' ? value.trim() : '';
}

export function hasPartnerApiKey() {
  return Boolean(partnerApiKey);
}

function requestId() {
  return `req_${crypto.randomUUID()}`;
}

function safeCode(value) {
  return typeof value === 'string' && SAFE_CODE_PATTERN.test(value) ? value : undefined;
}

function safeIdentifier(value) {
  return typeof value === 'string' && SAFE_IDENTIFIER_PATTERN.test(value) ? value : undefined;
}

function safeDetails(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).flatMap((detail) => {
    if (!detail || typeof detail !== 'object') return [];
    const path = typeof detail.path === 'string' ? detail.path.slice(0, 128) : undefined;
    const message = typeof detail.message === 'string' ? detail.message.slice(0, 300) : undefined;
    return path || message ? [{ ...(path ? { path } : {}), ...(message ? { message } : {}) }] : [];
  });
}

function isPhase13B3Control(path, method) {
  const pathname = String(path || '').split(/[?#]/, 1)[0];
  if (pathname === '/operations' || pathname.startsWith('/operations/')) return true;
  if (pathname === '/audit-logs' || pathname.startsWith('/audit-logs/')) return true;
  if (/^\/invocations(?:\/[^/]+(?:\/attempts)?)?$/.test(pathname)) return true;
  if (String(method || 'GET').toUpperCase() === 'GET') return false;
  return (
    /^\/invocations\/[^/]+\/(?:cancel|retry|resolve)$/.test(pathname) ||
    pathname === '/operations/recovery/scan'
  );
}

async function parseResponse(response) {
  const text = await response.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ApiClientError('The server returned an unreadable response.', {
        status: response.status,
        code: 'INVALID_SERVER_RESPONSE',
      });
    }
  }

  if (!response.ok || body.success === false) {
    const error = body.error || {};
    throw new ApiClientError(error.message || 'Request failed', {
      status: response.status,
      code: safeCode(error.code),
      details: safeDetails(error.details),
      requestId: safeIdentifier(error.requestId || response.headers.get('X-Request-Id')),
      traceId: safeIdentifier(error.traceId),
      reasonCode: safeCode(error.reasonCode || error.reason),
      cancellationState: SAFE_CANCELLATION_STATES.has(error.cancellationState)
        ? error.cancellationState
        : undefined,
      recoveryDecision: SAFE_RECOVERY_DECISIONS.has(error.recoveryDecision)
        ? error.recoveryDecision
        : undefined,
      recoveryRequired: error.recoveryRequired === true,
    });
  }

  return body.data;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('X-Request-Id', headers.get('X-Request-Id') || requestId());
  const requiresPartnerAuthentication =
    path.startsWith('/partner') ||
    path.startsWith('/enterprise') ||
    path.startsWith('/policies') ||
    path.startsWith('/secrets') ||
    path.startsWith('/approvals') ||
    path.startsWith('/evidence') ||
    path.startsWith('/admin/operations') ||
    isPhase13B3Control(path, options.method);
  if (requiresPartnerAuthentication && !headers.has('X-Partner-Api-Key')) {
    if (!partnerApiKey) {
      throw new ApiClientError('Configure a Partner API key before making this request.', {
        code: 'PARTNER_API_KEY_REQUIRED',
      });
    }
    headers.set('X-Partner-Api-Key', partnerApiKey);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    cache: 'no-store',
    credentials: 'include',
    headers,
  });

  return parseResponse(response);
}

export const apiClient = {
  get(path, options) {
    return apiRequest(path, options);
  },
  post(path, body, options = {}) {
    return apiRequest(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body || {}),
    });
  },
  patch(path, body, options = {}) {
    return apiRequest(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body || {}),
    });
  },
  delete(path, options = {}) {
    return apiRequest(path, {
      ...options,
      method: 'DELETE',
    });
  },
};

export { API_BASE_URL };
