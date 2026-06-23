// Tiny TTL cache. In-memory by default (per-serverless-instance, good enough to
// dedupe SEMrush calls within a burst and save units). For durable, shared
// caching across instances, swap this for Upstash Redis (Vercel KV is
// deprecated): the interface below is all the call sites use.

interface Entry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, Entry>();

export async function cacheGet<T>(key: string): Promise<T | null> {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
