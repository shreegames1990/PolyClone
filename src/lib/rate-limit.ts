/**
 * Fixed-window, in-memory rate limiter. Per server instance only: enough to stop
 * casual abuse of a single long-running Node server (Railway), not a distributed limit.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const windows = new Map<string, { start: number; count: number }>();

  const prune = (now: number) => {
    for (const [key, w] of windows) if (now - w.start >= windowMs) windows.delete(key);
  };

  return {
    /** Records a hit for `key` and returns whether it is within the limit. */
    allow(key: string, now: number = Date.now()): boolean {
      prune(now);
      const current = windows.get(key);
      if (!current) {
        windows.set(key, { start: now, count: 1 });
        return true;
      }
      if (current.count >= limit) return false;
      windows.set(key, { start: current.start, count: current.count + 1 });
      return true;
    },
    size: () => windows.size,
  };
}
