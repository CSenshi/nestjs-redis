import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import type {
  RedisClientType,
  RedisClusterType,
  RedisSentinelType,
} from 'redis';

import { DefaultNestjsLimit } from './algorithms/default-nestjs-limit.algorithm.js';
import type { ThrottlerAlgorithm } from './throttler-algorithm.interface.js';

type RedisClientLike = RedisClientType | RedisClusterType | RedisSentinelType;

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private scriptSha?: string;
  private readonly prefix = '_throttler';

  /**
   * Creates a Redis throttler storage from an existing Redis client.
   *
   * The client lifecycle is NOT managed by this storage instance.
   *
   * @param client The existing Redis client
   * @param algorithm The rate-limiting algorithm to use (default: FixedWindowAlgorithm)
   *
   * @example
   * ```typescript
   * // Default fixed-window algorithm
   * const storage = new RedisThrottlerStorage(client);
   * ```
   */
  constructor(
    private readonly client: RedisClientLike,
    private readonly algorithm: ThrottlerAlgorithm = DefaultNestjsLimit,
  ) { }

  /**
   * Loads the Lua script into Redis and caches its SHA1 hash.
   * This method is called lazily on first use or when the script is not found.
   */
  private async loadScript(): Promise<string> {
    if (this.scriptSha) {
      return this.scriptSha;
    }

    return (this.scriptSha = await this.client.scriptLoad(
      this.algorithm.script,
    ));
  }

  /**
   * Executes the Lua script using evalSha and converts the result to ThrottlerStorageRecord.
   */
  private async executeScript(
    scriptOrSha: string,
    keys: string[],
    args: string[],
  ): Promise<ThrottlerStorageRecord> {
    const options = { keys, arguments: args };

    const [totalHits, timeToExpireMs, timeToBlockExpireMs, isBlocked] = (
      this.isSha1Hash(scriptOrSha)
        ? await this.client.evalSha(scriptOrSha, options)
        : await this.client.eval(scriptOrSha, options)
    ) as [number, number, number, number];

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
    const keys = [
      `${this.prefix}:{${key}}:${throttlerName}`,
      `${this.prefix}:{${key}}:block:${throttlerName}`,
    ];
    const args = [
      throttlerName,
      ttlMs.toString(),
      limit.toString(),
      blockDurationMs.toString(),
    ];

    const scriptSha = await this.loadScript();

    try {
      return await this.executeScript(scriptSha, keys, args);
    } catch (error: unknown) {
      // Handle NOSCRIPT error - script was flushed from Redis
      if ((error as Error)?.message.includes('NOSCRIPT')) {
        this.scriptSha = undefined;
        return await this.executeScript(this.algorithm.script, keys, args);
      }

      // Re-throw if it's not a NOSCRIPT error
      throw error;
    }
  }

  private isSha1Hash(value: string): boolean {
    return /^[a-f0-9]{40}$/i.test(value);
  }
}
