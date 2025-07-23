import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { createClient, createCluster, createSentinel } from 'redis';

// Import types from the client package for better compatibility
type RedisClient = ReturnType<typeof createClient>;
type RedisCluster = ReturnType<typeof createCluster>;
type RedisSentinel = ReturnType<typeof createSentinel>;
type Redis = RedisClient | RedisCluster | RedisSentinel;

type RedisClientOptions = Parameters<typeof createClient>[0];
type RedisClusterOptions = Parameters<typeof createCluster>[0];
type RedisSentinelOptions = Parameters<typeof createSentinel>[0];

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationBootstrap, OnApplicationShutdown {
  private readonly prefix = '_throttler';
  private readonly ownsClient: boolean;
  private readonly client: Redis;

  // Private constructor - forces use of factory methods
  private constructor(client: Redis, ownsClient: boolean) {
    this.client = client;
    this.ownsClient = ownsClient;
  }

  // Static factory methods - clean and explicit

  /**
   * Creates a Redis throttler storage with default client configuration
   * (connects to localhost:6379)
   */
  static create(): RedisThrottlerStorage {
    return new RedisThrottlerStorage(createClient(), true);
  }

  /**
   * Creates a Redis throttler storage from an existing Redis client
   * The client lifecycle will NOT be managed by this storage instance
   */
  static fromClient(client: RedisClient): RedisThrottlerStorage {
    return new RedisThrottlerStorage(client, false);
  }

  /**
   * Creates a Redis throttler storage from Redis client options
   * A new client will be created and its lifecycle managed by this storage instance
   */
  static fromClientOptions(options: RedisClientOptions): RedisThrottlerStorage {
    return new RedisThrottlerStorage(createClient(options), true);
  }

  /**
   * Creates a Redis throttler storage from an existing Redis cluster
   * The cluster lifecycle will NOT be managed by this storage instance
   */
  static fromCluster(cluster: RedisCluster): RedisThrottlerStorage {
    return new RedisThrottlerStorage(cluster, false);
  }

  /**
   * Creates a Redis throttler storage from Redis cluster options
   * A new cluster will be created and its lifecycle managed by this storage instance
   */
  static fromClusterOptions(options: RedisClusterOptions): RedisThrottlerStorage {
    return new RedisThrottlerStorage(createCluster(options), true);
  }

  /**
   * Creates a Redis throttler storage from an existing Redis sentinel
   * The sentinel lifecycle will NOT be managed by this storage instance
   */
  static fromSentinel(sentinel: RedisSentinel): RedisThrottlerStorage {
    return new RedisThrottlerStorage(sentinel, false);
  }

  /**
   * Creates a Redis throttler storage from Redis sentinel options
   * A new sentinel will be created and its lifecycle managed by this storage instance
   */
  static fromSentinelOptions(options: RedisSentinelOptions): RedisThrottlerStorage {
    return new RedisThrottlerStorage(createSentinel(options), true);
  }

  /**
   * This logic is modeled after the official NestJS in-memory storage implementation:
   * https://github.com/nestjs/throttler/blob/27bf8212/src/throttler.service.ts#L74
   * 
   * It has been adapted for Redis with full atomicity using Lua scripting.
   */
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const ttlMilliseconds = ttl;
    const blockDurationMilliseconds = blockDuration;

    const redisKey = `${this.prefix}:${key}`;
    const blockKey = `${redisKey}:block:${throttlerName}`;

    const luaScript = `
      local key = KEYS[1]
      local blockKey = KEYS[2]
      local throttlerName = ARGV[1]
      local ttlMs = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local blockDurationMs = tonumber(ARGV[4])

      -- 1. Check if already blocked
      if redis.call("EXISTS", blockKey) == 1 then
        return { limit + 1, -1, redis.call("PTTL", blockKey), 1 }
      end

      -- 2. If not blocked: Increment hit count for this throttler
      local hits = redis.call("HINCRBY", key, throttlerName, 1)

      -- 3. If new key: set TTL (only if ttlMs > 0)
      if redis.call("PTTL", key) <= 0 and ttlMs > 0 then
        redis.call("PEXPIRE", key, ttlMs)
      end

      -- 4. If under limit: return normal response
      if hits <= limit then
        return { hits, redis.call("PTTL", key), -1, 0 }
      end

      -- 5. If over limit: set block flag (only if blockDurationMs > 0)
      if blockDurationMs > 0 then
        redis.call("SET", blockKey, "1", "PX", blockDurationMs)
        return { hits, redis.call("PTTL", key), blockDurationMs, 1 }
      else
        return { hits, redis.call("PTTL", key), -1, 0 }
      end
    `;

    const [totalHits, timeToExpireMs, timeToBlockExpireMs, isBlocked] = await this.client.eval(luaScript, {
      keys: [redisKey, blockKey],
      arguments: [throttlerName, ttlMilliseconds.toString(), limit.toString(), blockDurationMilliseconds.toString()],
    }) as [number, number, number, number];

    return {
      totalHits,
      timeToExpire: timeToExpireMs > 0 ? Math.ceil(timeToExpireMs / 1000) : -1,
      isBlocked: isBlocked === 1,
      timeToBlockExpire: Math.ceil(timeToBlockExpireMs - Date.now() / 1000),
    };
  }

  async onApplicationBootstrap() {
    if (this.ownsClient) {
      await this.client.connect();
    }
  }

  async onApplicationShutdown() {
    if (this.ownsClient) {
      await this.client.quit();
    }
  }
}