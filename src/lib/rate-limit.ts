/**
 * Einfaches In-Memory Rate Limiting (Sliding Window) für sensible Endpoints.
 * Für horizontal skalierte Deployments sollte dies durch Redis ersetzt werden;
 * die Signatur ist bewusst adapterfähig gehalten.
 */

type Bucket = { hits: number[]; };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };

  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? now;
    buckets.set(key, bucket);
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }

  bucket.hits.push(now);

  // Schutz gegen unbegrenztes Wachstum des Speichers.
  if (buckets.size > MAX_KEYS) {
    const firstKey = buckets.keys().next().value;
    if (firstKey) buckets.delete(firstKey);
  }
  buckets.set(key, bucket);

  return { ok: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

/** Ermittelt eine Client-Kennung aus Proxy-Headern. */
export function clientKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `${prefix}:${ip}`;
}
