import {
  STORAGE_KEYS,
  seedUsers,
  type LoginPayload,
  type LoginResult,
  type UserRole
} from '@community-store/shared';
import { reactive, readonly } from 'vue';
import { readJSON, writeJSON } from '../data/storage';
import { getDataSource } from '../services/data-source';

const SESSION_KEY = `${STORAGE_KEYS.auth}_miniapp`;

interface SessionAuth {
  token: string;
  user: LoginResult['user'];
}

const defaultBuyer = {
  id: seedUsers[0].id,
  username: seedUsers[0].username,
  role: 'buyer' as UserRole,
  nickname: seedUsers[0].nickname,
  phone: seedUsers[0].phone,
  merchant_id: seedUsers[0].merchant_id
};

const defaultSession: SessionAuth = {
  token: `django-token-${defaultBuyer.id}`,
  user: defaultBuyer
};

function normalizeSession(raw: unknown): SessionAuth {
  if (raw && typeof raw === 'object' && 'user' in raw) {
    const session = raw as Partial<SessionAuth>;
    if (session.user && typeof session.token === 'string' && session.token.trim()) {
      return session as SessionAuth;
    }
  }

  if (raw && typeof raw === 'object' && 'id' in raw) {
    const user = raw as SessionAuth['user'];
    return {
      token: `django-token-${user.id}`,
      user
    };
  }

  return defaultSession;
}

const state = reactive<SessionAuth>(
  normalizeSession(readJSON<unknown>(SESSION_KEY, defaultSession))
);

function persist(): void {
  writeJSON(SESSION_KEY, state);
}

// 首次加载即落盘标准化会话，保证 API 请求可读取到 token。
persist();

export function useSessionStore() {
  const dataSource = getDataSource();

  async function login(payload: LoginPayload): Promise<void> {
    const result = await dataSource.login(payload);
    state.token = result.token;
    state.user = result.user;
    persist();
  }

  function logout(): void {
    state.token = defaultSession.token;
    state.user = defaultSession.user;
    persist();
  }

  return {
    state: readonly(state),
    login,
    logout
  };
}
