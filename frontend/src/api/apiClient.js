const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';
let partnerApiKey = '';

export class ApiClientError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.status = options.status || 0;
    this.code = options.code || 'REQUEST_FAILED';
    this.details = options.details || [];
    this.requestId = options.requestId;
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
      code: error.code,
      details: error.details,
      requestId: error.requestId || response.headers.get('X-Request-Id') || undefined,
    });
  }

  return body.data;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('X-Request-Id', headers.get('X-Request-Id') || requestId());
  if (path.startsWith('/partner') && partnerApiKey && !headers.has('X-Partner-Api-Key')) {
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
