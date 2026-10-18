/**
 * Limitador de solicitudes en memoria (ventana deslizante).
 * Suficiente para una sola instancia del servidor; con varias instancias
 * conviene moverlo a Redis o a la base de datos.
 */

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 50_000;

export type RateLimitRule = { limit: number; windowMs: number };

export function checkRateLimit(key: string, rule: RateLimitRule): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((timestamp) => now - timestamp < rule.windowMs);

  if (bucket.hits.length >= rule.limit) {
    buckets.set(key, bucket);
    return { allowed: false, retryAfterMs: rule.windowMs - (now - bucket.hits[0]) };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  // Evita que el mapa crezca sin límite
  if (buckets.size > MAX_KEYS) {
    const oldest = buckets.keys().next().value;
    if (oldest) buckets.delete(oldest);
  }

  return { allowed: true, retryAfterMs: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
