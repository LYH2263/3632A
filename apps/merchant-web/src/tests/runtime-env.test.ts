import { describe, expect, it } from 'vitest';
import { getRuntimeConfig } from '../services/runtime-env';

describe('merchant runtime env', () => {
  it('默认配置为 mock', () => {
    const host = globalThis as { __COMMUNITY_STORE_WEB_RUNTIME__?: unknown };
    delete host.__COMMUNITY_STORE_WEB_RUNTIME__;
    const config = getRuntimeConfig();
    expect(config.dataMode).toBe('mock');
  });
});
