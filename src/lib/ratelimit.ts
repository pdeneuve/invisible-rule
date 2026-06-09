import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const hasUpstashEnv = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = hasUpstashEnv ? Redis.fromEnv() : null;

function buildLimiter(tokens: number, window: '10 s' | '1 m' | '1 h' | '1 d', prefix: string) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true,
    prefix,
  });
}

export const ratelimiters = {
  expensiveAi: buildLimiter(20, '1 m', 'ir:ai'),
  chat: buildLimiter(60, '1 m', 'ir:chat'),
  email: buildLimiter(5, '1 m', 'ir:email'),
  default: buildLimiter(120, '1 m', 'ir:default'),
};

export async function checkRateLimit(
  identifier: string,
  bucket: keyof typeof ratelimiters = 'default',
): Promise<{ allowed: boolean; limit?: number; remaining?: number; reset?: number }> {
  const limiter = ratelimiters[bucket];
  if (!limiter) return { allowed: true };
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  return { allowed: success, limit, remaining, reset };
}
