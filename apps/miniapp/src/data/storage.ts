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

const uniStorage: StorageLike = {
  getItem(key) {
    if (typeof uni === 'undefined' || typeof uni.getStorageSync !== 'function') {
      return null;
    }
    try {
      const value = uni.getStorageSync(key);
      if (typeof value === 'string') {
        return value;
      }
      if (value === '' || value === undefined || value === null) {
        return null;
      }
      return JSON.stringify(value);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    if (typeof uni !== 'undefined' && typeof uni.setStorageSync === 'function') {
      try {
        uni.setStorageSync(key, value);
      } catch {
        fallbackStorage.setItem(key, value);
      }
      return;
    }
    fallbackStorage.setItem(key, value);
  },
  removeItem(key) {
    if (typeof uni !== 'undefined' && typeof uni.removeStorageSync === 'function') {
      try {
        uni.removeStorageSync(key);
      } catch {
        fallbackStorage.removeItem(key);
      }
      return;
    }
    fallbackStorage.removeItem(key);
  }
};

function resolveStorage(): StorageLike {
  const host = globalThis as { localStorage?: StorageLike };
  const local = host.localStorage;
  if (local && typeof local.getItem === 'function') {
    return local;
  }
  if (typeof uni !== 'undefined') {
    return uniStorage;
  }
  return fallbackStorage;
}

export function readJSON<T>(key: string, fallback: T): T {
  const storage = resolveStorage();
  const raw = storage.getItem(key);
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
  const storage = resolveStorage();
  storage.setItem(key, JSON.stringify(value));
}

export function removeValue(key: string): void {
  const storage = resolveStorage();
  storage.removeItem(key);
}
