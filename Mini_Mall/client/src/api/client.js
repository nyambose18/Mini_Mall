const API_BASE = '/api';

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  constructor(message, status, payload = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code || '';
    this.fields = payload.fields || {};
    this.payload = payload;
  }
}

export async function api(path, options = {}) {
  const { method = 'GET', body, formData } = options;
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: formData || (body !== undefined ? JSON.stringify(body) : undefined),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    if (response.status === 401 && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(
      data?.error?.message || 'Something went wrong. Please try again.',
      response.status,
      data?.error || {},
    );
  }

  return data;
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  return api('/uploads', { method: 'POST', formData });
}