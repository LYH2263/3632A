import { getRuntimeConfig } from '../utils/runtime-env';

function resolveAuthToken(): string | null {
  const host = globalThis as { localStorage?: Storage };
  const storage = host.localStorage;
  if (!storage || typeof storage.getItem !== 'function') {
    return null;
  }

  const raw = storage.getItem('community_store_auth_miniapp');
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as
      | { token?: string; user?: { id?: number } }
      | { id?: number };
    if (typeof parsed === 'object' && parsed) {
      if ('token' in parsed && typeof parsed.token === 'string' && parsed.token.trim()) {
        return parsed.token;
      }
      if ('id' in parsed && typeof parsed.id === 'number') {
        return `django-token-${parsed.id}`;
      }
      if ('user' in parsed && parsed.user && typeof parsed.user.id === 'number') {
        return `django-token-${parsed.user.id}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as { data?: T; message?: string } | T;
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: string }).message ?? '请求失败')
        : '请求失败';
    throw new Error(message);
  }

  if (typeof payload === 'object' && payload && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const runtime = getRuntimeConfig();
  const url = `${runtime.apiBaseUrl}${path}`;
  const token = resolveAuthToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });
  return parseResponse<T>(response);
}
