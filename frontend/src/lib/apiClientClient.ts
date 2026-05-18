'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

let refreshPromise: Promise<boolean> | null = null;

function buildUrl(endpoint: string, params?: ApiOptions['params']) {
  let url = `${API_URL}${endpoint}`;

  if (params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    const queryString = queryParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  return url;
}

async function parseResponseBody(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function request<T>(
  endpoint: string,
  options: ApiOptions = {},
  allowRefresh = true,
): Promise<T> {
  const url = buildUrl(endpoint, options.params);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  const data = await parseResponseBody(response);

  if ((response.status === 401 || response.status === 403) && allowRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(endpoint, options, false);
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || `API Error (${response.status})`,
    );
  }

  return data as T;
}

export const apiClientClient = {
  fetch<T>(endpoint: string, options: ApiOptions = {}) {
    return request<T>(endpoint, options);
  },

  get<T>(endpoint: string, options: ApiOptions = {}) {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body: any, options: ApiOptions = {}) {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  patch<T>(endpoint: string, body: any, options: ApiOptions = {}) {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  put<T>(endpoint: string, body: any, options: ApiOptions = {}) {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete<T>(endpoint: string, options: ApiOptions = {}) {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};
