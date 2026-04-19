import Redis from 'ioredis';
import { logger } from './logger';

export let redis: Redis;

export async function connectRedis(): Promise<void> {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redis.on('error', (err) => logger.error('Redis error', { error: err.message }));
  redis.on('reconnecting', () => logger.warn('Redis reconnecting'));

  await redis.connect();
}

// ─── Cache Utilities ──────────────────────────────────────────────────────────

const DEFAULT_TTL = 300; // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = DEFAULT_TTL
): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn('Cache set failed', { key, error: err });
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    logger.warn('Cache del failed', { key, error: err });
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    logger.warn('Cache del pattern failed', { pattern, error: err });
  }
}

// ─── Cache Key Builders ───────────────────────────────────────────────────────

export const CacheKeys = {
  patient: (id: string) => `patient:${id}`,
  patientPlan: (id: string) => `patient:${id}:plan`,
  patientAnalytics: (id: string) => `patient:${id}:analytics`,
  module: (id: string) => `module:${id}`,
  moduleList: (condition: string) => `modules:condition:${condition}`,
  cohortAnalytics: () => 'analytics:cohort',
  userSession: (tokenHash: string) => `session:${tokenHash}`,
};
