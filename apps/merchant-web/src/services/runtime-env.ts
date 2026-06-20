export type DataMode = 'mock' | 'api';

interface RuntimeInject {
  dataMode?: string;
  apiBaseUrl?: string;
}

export interface RuntimeConfig {
  dataMode: DataMode;
  apiBaseUrl: string;
}

const defaultConfig: RuntimeConfig = {
  dataMode: 'mock',
  apiBaseUrl: 'http://localhost:8000/api/v1'
};

export function getRuntimeConfig(): RuntimeConfig {
  const host = globalThis as { __COMMUNITY_STORE_WEB_RUNTIME__?: RuntimeInject };
  const inject = host.__COMMUNITY_STORE_WEB_RUNTIME__ ?? {};

  return {
    dataMode: inject.dataMode === 'api' ? 'api' : defaultConfig.dataMode,
    apiBaseUrl:
      typeof inject.apiBaseUrl === 'string' && inject.apiBaseUrl.trim()
        ? inject.apiBaseUrl
        : defaultConfig.apiBaseUrl
  };
}
