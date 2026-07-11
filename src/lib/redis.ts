import { createClient, type RedisClientType } from 'redis';
import { env } from '../config/env.ts';
import { logger } from './logger.ts';

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(env.REDIS_URL?.trim());
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  const url = env.REDIS_URL?.trim();
  if (!url) return null;

  if (client?.isOpen) return client;

  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        const nextClient = createClient({ url });
        nextClient.on('error', (err) => {
          logger.warn('Redis client error', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
        await nextClient.connect();
        client = nextClient;
        logger.info('Redis connected for distributed security controls');
        return nextClient;
      } catch (err) {
        logger.warn('Redis unavailable; using in-memory fallbacks', {
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      } finally {
        connectPromise = null;
      }
    })();
  }

  return connectPromise;
}

export async function redisGet(key: string): Promise<string | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  return redis.get(key);
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) return false;
  if (ttlSeconds != null) {
    await redis.set(key, value, { EX: ttlSeconds });
  } else {
    await redis.set(key, value);
  }
  return true;
}

export async function redisDel(key: string): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) return false;
  await redis.del(key);
  return true;
}

export async function redisIncr(key: string, ttlSeconds: number): Promise<number | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, ttlSeconds);
  }
  return count;
}
