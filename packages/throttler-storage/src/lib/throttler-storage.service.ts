import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import type {
  RedisClientType,
  RedisClusterType,
  RedisSentinelType,
} from 'redis';

type RedisClientLike = RedisClientType | RedisClusterType | RedisSentinelType;

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private scriptSha?: string;
  private readonly prefix = '_throttler';
  private readonly luaScript = `
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

  /**
   * Creates a Redis throttler storage from an existing Redis client.
   *
   * The client lifecycle is NOT managed by this storage instance.
   *
   * @param client The existing Redis client
   *
   * @example
   * ```typescript
   * const storage = new RedisThrottlerStorage(createClient({ url: 'redis://localhost:6379' }));
   * ```
   */
  constructor(private readonly client: RedisClientLike) {}

  /**
   * Loads the Lua script into Redis and caches its SHA1 hash.
   * This method is called lazily on first use or when the script is not found.
   */
  private async loadScript(script:string): Promise<string> {
    if (this.scriptSha) {
      return this.scriptSha;
    }
    
    return this.scriptSha = await this.client.scriptLoad(script);
  }

  /**
   * Executes the Lua script using evalSha and converts the result to ThrottlerStorageRecord.
   */
  private async executeScript(
    scriptOrSha: string,
    keys: string[],
    args: string[],
  ): Promise<ThrottlerStorageRecord> {
    const options = {
      keys,
      arguments: args,
    }
    const [totalHits, timeToExpireMs, timeToBlockExpireMs, isBlocked] =
      (/^[a-f0-9]{40}$/i.test(scriptOrSha) 
        ? await this.client.evalSha(scriptOrSha, options)
        : await this.client.eval(scriptOrSha, options)) as [number, number, number, number];

    return {
      totalHits,
      timeToExpire: timeToExpireMs > 0 ? Math.ceil(timeToExpireMs / 1000) : -1,
      isBlocked: isBlocked === 1,
      timeToBlockExpire: Math.ceil(timeToBlockExpireMs - Date.now() / 1000),
    };
  }

  /**
   * This logic is modeled after the official NestJS in-memory storage implementation:
   * https://github.com/nestjs/throttler/blob/27bf8212/src/throttler.service.ts#L74
   *
   * It has been adapted for Redis with full atomicity using Lua scripting.
   */
  async increment(
    key: string,
    ttlMs: number,
    limit: number,
    blockDurationMs: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redisKey = `${this.prefix}:{${key}}`;
    const blockKey = `${redisKey}:block:${throttlerName}`;

    const keys = [redisKey, blockKey];
    const args = [
      throttlerName,
      ttlMs.toString(),
      limit.toString(),
      blockDurationMs.toString(),
    ];

    // Load script SHA if not already loaded
    const scriptSha = await this.loadScript(this.luaScript);

    try {
      return await this.executeScript(scriptSha, keys, args);
    } catch (error: unknown) {
      // Handle NOSCRIPT error - script was flushed from Redis
      if ((error as Error)?.message.includes('NOSCRIPT')) {
        // Retry using EVAL command which will cache the script automatically
        try{
          return await this.executeScript(this.luaScript, keys, args);
        } catch (err) {
          // Ignore the error here and re-throw the original error below
        }
      }

      // Re-throw if it's not a NOSCRIPT error
      throw error;
    }
  }
}
