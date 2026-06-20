interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memoryStorage = new Map<string, string>();

const fallbackStorage: StorageLike = {
  getItem(key) {
    return memoryStorage.get(key) ?? null;
  },
  setItem(key, value) {
    memoryStorage.set(key, value);
  },
  removeItem(key) {
    memoryStorage.delete(key);
  }
};

function resolveStorage(): StorageLike {
  const host = globalThis as { localStorage?: StorageLike };
  const storage = host.localStorage;
  if (storage && typeof storage.getItem === 'function') {
    return storage;
  }
  return fallbackStorage;
}

export function readJSON<T>(key: string, fallback: T): T {
  const raw = resolveStorage().getItem(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  resolveStorage().setItem(key, JSON.stringify(value));
}

export function removeValue(key: string): void {
  resolveStorage().removeItem(key);
}
