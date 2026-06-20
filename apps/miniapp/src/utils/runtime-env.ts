export type DataMode = 'mock' | 'api';

interface RuntimeInject {
  dataMode?: string;
  apiBaseUrl?: string;
}

interface RuntimeConfig {
  dataMode: DataMode;
  apiBaseUrl: string;
}

const DEFAULT_CONFIG: RuntimeConfig = {
  dataMode: 'mock',
  apiBaseUrl: 'http://localhost:8000/api/v1'
};

function readInject(): RuntimeInject {
  const host = globalThis as { __COMMUNITY_STORE_RUNTIME__?: RuntimeInject };
  const runtime = host.__COMMUNITY_STORE_RUNTIME__;
  if (!runtime || typeof runtime !== 'object') {
    return {};
  }
  return runtime;
}

export function getRuntimeConfig(): RuntimeConfig {
  const inject = readInject();

  const dataMode: DataMode = inject.dataMode === 'api' ? 'api' : 'mock';
  const apiBaseUrl =
    typeof inject.apiBaseUrl === 'string' && inject.apiBaseUrl.trim()
      ? inject.apiBaseUrl
      : DEFAULT_CONFIG.apiBaseUrl;

  return {
    dataMode,
    apiBaseUrl
  };
}
