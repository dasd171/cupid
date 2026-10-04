/**
 * In-memory sliding-window rate limiter.
 * Per-process only — sufficient for a self-hosted single instance.
 */

const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds until the oldest hit leaves the window. */
  retryAfterMs: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    const oldest = hits[0] ?? now;
    buckets.set(key, hits);
    return { allowed: false, retryAfterMs: Math.max(0, windowMs - (now - oldest)) };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { allowed: true, retryAfterMs: 0 };
}

/** Drop buckets that have fully expired (housekeeping). */
export function pruneRateLimitBuckets(windowMs: number): void {
  const now = Date.now();
  for (const [key, hits] of buckets) {
    const fresh = hits.filter((t) => now - t < windowMs);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}
