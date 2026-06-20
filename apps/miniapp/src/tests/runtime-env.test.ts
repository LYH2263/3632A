import { describe, expect, it } from 'vitest';
import { getRuntimeConfig } from '../utils/runtime-env';

describe('runtime-env', () => {
  it('未注入运行时变量时使用默认值', () => {
    const host = globalThis as { __COMMUNITY_STORE_RUNTIME__?: unknown };
    delete host.__COMMUNITY_STORE_RUNTIME__;

    const config = getRuntimeConfig();
    expect(config.dataMode).toBe('mock');
    expect(config.apiBaseUrl).toContain('http://localhost:8000');
  });

  it('注入 api 模式后读取成功', () => {
    const host = globalThis as {
      __COMMUNITY_STORE_RUNTIME__?: {
        dataMode?: string;
        apiBaseUrl?: string;
      };
    };

    host.__COMMUNITY_STORE_RUNTIME__ = {
      dataMode: 'api',
      apiBaseUrl: 'http://127.0.0.1:8000/api/v1'
    };

    const config = getRuntimeConfig();
    expect(config.dataMode).toBe('api');
    expect(config.apiBaseUrl).toBe('http://127.0.0.1:8000/api/v1');
  });
});
