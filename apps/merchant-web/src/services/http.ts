import { getRuntimeConfig } from './runtime-env';

function resolveAuthToken(): string | null {
  const host = globalThis as { localStorage?: Storage };
  const storage = host.localStorage;
  if (!storage || typeof storage.getItem !== 'function') {
    return null;
  }

  const raw = storage.getItem('community_store_auth_merchant_web');
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

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getRuntimeConfig();
  const token = resolveAuthToken();
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  const payload = (await response.json()) as { data?: T; message?: string } | T;
  if (!response.ok) {
    if (typeof payload === 'object' && payload && 'message' in payload) {
      throw new Error(String((payload as { message?: string }).message ?? '请求失败'));
    }
    throw new Error('请求失败');
  }

  if (typeof payload === 'object' && payload && 'data' in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}
