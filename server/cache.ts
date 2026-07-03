import Redis from 'ioredis';

// Redis is an optional optimization: if REDIS_URL is unset or the server is
// unreachable, every cache call degrades to a no-op and callers fall back to
// recomputing the value. Nothing here should ever throw into request handlers.
const REDIS_URL = process.env.REDIS_URL;

let client: Redis | null = null;
let loggedError = false;

if (REDIS_URL) {
  client = new Redis(REDIS_URL, {
    // Fail fast instead of buffering commands while disconnected.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    lazyConnect: false,
  });
  client.on('error', (err) => {
    // Log the first error only — a downed Redis would otherwise flood the logs.
    if (!loggedError) {
      loggedError = true;
      console.warn('Redis unavailable, continuing without cache:', err.message);
    }
  });
  client.on('ready', () => {
    loggedError = false;
  });
}

export const cacheEnabled = Boolean(client);

export async function cacheGet(key: string): Promise<string | null> {
  if (!client) return null;
  try {
    return await client.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!client) return;
  try {
    await client.set(key, value, 'EX', ttlSeconds);
  } catch {
    // Ignore — caching is best-effort.
  }
}

/** Drops cached entries whose keys start with any of the given prefixes. */
export async function cacheDelPrefix(...prefixes: string[]): Promise<void> {
  if (!client || prefixes.length === 0) return;
  try {
    const keys: string[] = [];
    for (const prefix of prefixes) {
      const stream = client.scanStream({ match: `${prefix}*`, count: 100 });
      for await (const batch of stream) keys.push(...(batch as string[]));
    }
    if (keys.length > 0) await client.del(...keys);
  } catch {
    // Ignore — stale entries simply expire on their own TTL.
  }
}
