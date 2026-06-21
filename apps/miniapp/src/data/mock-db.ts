import {
  ensureMockStorageCommon,
  MOCK_DB_CURRENT_VERSION,
  MOCK_DB_VERSION_KEY,
  migrateMerchantList,
  STORAGE_KEYS,
  emptyCart,
  seedCategories,
  seedMerchants,
  seedProducts,
  seedUsers,
  type Address,
  type Cart,
  type Category,
  type Favorite,
  type Merchant,
  type Message,
  type Order,
  type Product,
  type User
} from '@community-store/shared';
import { readJSON, writeJSON } from './storage';

const MOCK_DB_VERSION = MOCK_DB_CURRENT_VERSION;
const VERSION_KEY = MOCK_DB_VERSION_KEY;

function ensureSeed<T>(key: string, seed: T): T {
  const current = readJSON<T | null>(key, null);
  if (current === null) {
    writeJSON(key, seed);
    return seed;
  }
  return current;
}

export function ensureMockDB(): void {
  ensureMockStorageCommon({
    readJSON: <T,>(key: string, fallback: T | null) => readJSON<T | null>(key, fallback),
    writeJSON: (key: string, value: unknown) => writeJSON(key, value),
    extraEnsures: {
      addresses: () => ensureSeed<Address[]>(STORAGE_KEYS.addresses, []),
      favorites: () => ensureSeed<Favorite[]>(STORAGE_KEYS.favorites, []),
      messages: () => ensureSeed<Message[]>(STORAGE_KEYS.messages, []),
      cart: () =>
        ensureSeed<Cart>(STORAGE_KEYS.cart, {
          ...emptyCart,
          updated_at: new Date().toISOString()
        })
    }
  });
  ensureSeed<Order[]>(STORAGE_KEYS.orders, []);
}

export function readMerchants(): Merchant[] {
  ensureMockDB();
  const raw = readJSON<Merchant[] | null>(STORAGE_KEYS.merchants, null);
  const migrated = migrateMerchantList(raw ?? []);
  if (!raw || JSON.stringify(raw) !== JSON.stringify(migrated)) {
    writeMerchants(migrated);
  }
  return migrated;
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

export function readFavorites(): Favorite[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.favorites, []);
}

export function writeFavorites(value: Favorite[]): void {
  writeJSON(STORAGE_KEYS.favorites, value);
}

export function readMessages(): Message[] {
  ensureMockDB();
  return readJSON(STORAGE_KEYS.messages, []);
}

export function writeMessages(value: Message[]): void {
  writeJSON(STORAGE_KEYS.messages, value);
}
