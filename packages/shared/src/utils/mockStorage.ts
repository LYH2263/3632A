import {
  seedCategories,
  seedMerchants,
  seedProducts,
  seedUsers,
  STORAGE_KEYS,
  type Category,
  type Merchant,
  type Product,
  type User
} from '../index';
import { getDefaultBusinessHours } from './businessHours';

export const MOCK_DB_CURRENT_VERSION = 7;
export const MOCK_DB_VERSION_KEY = 'community_store_mock_db_version';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function migrateMerchant(merchant: Merchant): Merchant {
  const defaultHours = getDefaultBusinessHours();
  const merged: Merchant = {
    ...merchant,
    min_order_amount:
      typeof merchant.min_order_amount === 'number' ? merchant.min_order_amount : 0,
    delivery_fee:
      typeof merchant.delivery_fee === 'number' ? merchant.delivery_fee : 0,
    is_open: typeof merchant.is_open === 'boolean' ? merchant.is_open : true
  };

  if (!merged.business_hours) {
    merged.business_hours = deepClone(defaultHours);
    return merged;
  }

  const existing = merged.business_hours as Record<string, unknown>;
  for (let i = 0; i <= 6; i++) {
    const key = String(i);
    const defaultDay = defaultHours[i as 0 | 1 | 2 | 3 | 4 | 5 | 6];
    const day = existing[key];
    if (!day || typeof day !== 'object') {
      existing[key] = deepClone(defaultDay);
      continue;
    }
    const d = day as Record<string, unknown>;
    if (typeof d.enabled !== 'boolean') d.enabled = defaultDay.enabled;
    if (typeof d.start !== 'string' || !/^\d{2}:\d{2}$/.test(d.start)) {
      d.start = defaultDay.start;
    }
    if (typeof d.end !== 'string' || !/^\d{2}:\d{2}$/.test(d.end)) {
      d.end = defaultDay.end;
    }
  }
  merged.business_hours = existing as typeof merged.business_hours;
  return merged;
}

export function migrateMerchantList(list: Merchant[]): Merchant[] {
  if (!Array.isArray(list)) {
    return deepClone(seedMerchants);
  }
  const result: Merchant[] = [];
  for (const seed of seedMerchants) {
    const existing = list.find((m) => m && m.id === seed.id);
    if (existing) {
      result.push(migrateMerchant(existing));
    }
  }
  for (const merchant of list) {
    if (merchant && !result.some((m) => m.id === merchant.id)) {
      result.push(migrateMerchant(merchant));
    }
  }
  return result.length > 0 ? result : deepClone(seedMerchants);
}

export type StorageReadFn<T> = (key: string, fallback: T | null) => T | null;
export type StorageWriteFn = (key: string, value: unknown) => void;

export interface MockStorageEnsureOptions {
  readJSON: StorageReadFn<unknown>;
  writeJSON: StorageWriteFn;
  extraEnsures?: Record<string, () => void>;
}

export function ensureMockStorageCommon(opts: MockStorageEnsureOptions): void {
  const { readJSON, writeJSON, extraEnsures } = opts;

  const storedVersion = Number(readJSON(MOCK_DB_VERSION_KEY, 0)) || 0;

  const rawMerchants = readJSON(STORAGE_KEYS.merchants, null) as Merchant[] | null;
  const rawCategories = readJSON(STORAGE_KEYS.categories, null) as Category[] | null;
  const rawProducts = readJSON(STORAGE_KEYS.products, null) as Product[] | null;
  const rawUsers = readJSON(STORAGE_KEYS.users, null) as User[] | null;

  if (storedVersion < MOCK_DB_CURRENT_VERSION || !rawMerchants || !rawCategories || !rawProducts || !rawUsers) {
    writeJSON(STORAGE_KEYS.merchants, migrateMerchantList(rawMerchants ?? []));
    writeJSON(
      STORAGE_KEYS.categories,
      Array.isArray(rawCategories) && rawCategories.length > 0 ? rawCategories : deepClone(seedCategories)
    );
    writeJSON(
      STORAGE_KEYS.products,
      Array.isArray(rawProducts) && rawProducts.length > 0 ? rawProducts : deepClone(seedProducts)
    );
    writeJSON(
      STORAGE_KEYS.users,
      Array.isArray(rawUsers) && rawUsers.length > 0 ? rawUsers : deepClone(seedUsers)
    );
    writeJSON(MOCK_DB_VERSION_KEY, MOCK_DB_CURRENT_VERSION);
  }

  if (!readJSON(STORAGE_KEYS.orders, null)) {
    writeJSON(STORAGE_KEYS.orders, []);
  }

  if (extraEnsures) {
    for (const key of Object.keys(extraEnsures)) {
      extraEnsures[key]();
    }
  }
}
