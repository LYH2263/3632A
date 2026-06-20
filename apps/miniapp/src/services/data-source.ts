import type { DataSource } from '@community-store/shared';
import { getRuntimeConfig } from '../utils/runtime-env';
import { ApiDataSource } from './api-data-source';
import { MockDataSource } from './mock-data-source';

let singleton: DataSource | null = null;

export function getDataSource(): DataSource {
  if (singleton) {
    return singleton;
  }

  const runtime = getRuntimeConfig();
  singleton = runtime.dataMode === 'api' ? new ApiDataSource() : new MockDataSource();
  return singleton;
}
