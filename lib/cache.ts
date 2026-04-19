type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const store = globalThis as typeof globalThis & {
  __baakiCache?: Map<string, CacheEntry<unknown>>;
};

function getCacheStore() {
  if (!store.__baakiCache) {
    store.__baakiCache = new Map();
  }

  return store.__baakiCache;
}

export async function withCache<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const cache = getCacheStore();
  const cached = cache.get(key) as CacheEntry<T> | undefined;

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = await loader();
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
  return value;
}

export function clearCache(prefix?: string) {
  const cache = getCacheStore();

  if (!prefix) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
