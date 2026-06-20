import {
  STORAGE_KEYS,
  emptyCart,
  seedCategories,
  seedMerchants,
  seedProducts,
  seedUsers,
  type Address,
  type Cart,
  type Category,
  type Merchant,
  type Order,
  type Product,
  type User
} from '@community-store/shared';
import { readJSON, writeJSON } from './storage';

const MOCK_DB_VERSION = 5;
const VERSION_KEY = 'community_store_mock_db_version';

function ensureSeed<T>(key: string, seed: T): T {
  const current = readJSON<T | null>(key, null);
  if (current === null) {
    writeJSON(key, seed);
    return seed;
  }
  return current;
}

export function ensureMockDB(): void {
  const storedVersion = readJSON<number>(VERSION_KEY, 0);
  if (storedVersion < MOCK_DB_VERSION) {
    writeJSON(STORAGE_KEYS.merchants, seedMerchants);
    writeJSON(STORAGE_KEYS.categories, seedCategories);
    writeJSON(STORAGE_KEYS.products, seedProducts);
    writeJSON(STORAGE_KEYS.users, seedUsers);
    writeJSON(STORAGE_KEYS.addresses, []);
    writeJSON(VERSION_KEY, MOCK_DB_VERSION);
  }

  ensureSeed<Merchant[]>(STORAGE_KEYS.merchants, seedMerchants);
  ensureSeed<Category[]>(STORAGE_KEYS.categories, seedCategories);
  ensureSeed<Product[]>(STORAGE_KEYS.products, seedProducts);
  ensureSeed<Order[]>(STORAGE_KEYS.orders, []);
  ensureSeed<Cart>(STORAGE_KEYS.cart, {
    ...emptyCart,
    updated_at: new Date().toISOString()
  });
  ensureSeed<User[]>(STORAGE_KEYS.users, seedUsers);
  ensureSeed<Address[]>(STORAGE_KEYS.addresses, []);
}

export function readMerchants(): Merchant[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.merchants, seedMerchants);
}

export function writeMerchants(value: Merchant[]): void {
  writeJSON(STORAGE_KEYS.merchants, value);
}

export function readCategories(): Category[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.categories, seedCategories);
}

export function writeCategories(value: Category[]): void {
  writeJSON(STORAGE_KEYS.categories, value);
}

export function readProducts(): Product[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.products, seedProducts);
}

export function writeProducts(value: Product[]): void {
  writeJSON(STORAGE_KEYS.products, value);
}

export function readOrders(): Order[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.orders, []);
}

export function writeOrders(value: Order[]): void {
  writeJSON(STORAGE_KEYS.orders, value);
}

export function readCart(): Cart {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.cart, {
    ...emptyCart,
    updated_at: new Date().toISOString()
  });
}

export function writeCart(value: Cart): void {
  writeJSON(STORAGE_KEYS.cart, value);
}

export function readUsers(): User[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.users, seedUsers);
}

export function readAddresses(): Address[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.addresses, []);
}

export function writeAddresses(value: Address[]): void {
  writeJSON(STORAGE_KEYS.addresses, value);
}
