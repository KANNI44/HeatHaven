import { API_BASE_URL } from '../config';
import { getToken } from '../auth/tokenStore';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function buildHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const token = await getToken();
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra ?? {}),
  };
}

export async function apiRequest<T>(
  path: string,
  options?: { method?: HttpMethod; body?: unknown; headers?: HeadersInit }
): Promise<T> {
  const method = options?.method ?? 'GET';
  const headers = await buildHeaders(options?.headers);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    throw new ApiError(`Request failed: ${method} ${path}`, res.status, data);
  }
  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

