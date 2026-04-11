import { Inject, Injectable } from '@nestjs/common';
import type {
  RedisClientType,
  RedisClusterType,
  RedisSentinelType,
} from 'redis';
import type { ScheduleModuleOptions } from '../interfaces/schedule-module-options.interface';
import { SCHEDULE_MODULE_OPTIONS } from '../schedule.constants';

type RedisClientLike = RedisClientType | RedisClusterType | RedisSentinelType;

const CLAIM_SCRIPT = `
local jobs = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, 1)
if #jobs == 0 then return nil end
redis.call('ZREM', KEYS[1], jobs[1])
return jobs[1]
`;

// KEYS[1] = metaKey, KEYS[2] = jobsKey
// ARGV[1] = name, ARGV[2] = expression, ARGV[3] = nextTs
const REGISTER_SCRIPT = `
local stored = redis.call('HGET', KEYS[1], ARGV[1])
if stored ~= ARGV[2] then
  redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
  redis.call('ZADD', KEYS[2], tonumber(ARGV[3]), ARGV[1])
else
  redis.call('ZADD', KEYS[2], 'NX', tonumber(ARGV[3]), ARGV[1])
end
`;

@Injectable()
export class RedisJobStore {
  private readonly client: RedisClientLike;
  private readonly jobsKey: string;
  private readonly metaKey: string;
  private readonly scriptShas = new Map<string, string>();

  constructor(@Inject(SCHEDULE_MODULE_OPTIONS) options: ScheduleModuleOptions) {
    this.client = options.client as RedisClientLike;
    const prefix = options.keyPrefix ?? 'scheduler';
    this.jobsKey = `${prefix}:jobs`;
    this.metaKey = `${prefix}:meta`;
  }

  /**
   * Atomically registers a job on bootstrap.
   * If the expression changed: overwrites meta + ZADD unconditionally.
   * If the expression is unchanged: ZADD NX (preserves existing scheduled time).
   */
  async registerJob(
    name: string,
    expression: string,
    nextTs: number,
  ): Promise<void> {
    await this.execScript(REGISTER_SCRIPT, {
      keys: [this.metaKey, this.jobsKey],
      arguments: [name, expression, nextTs.toString()],
    });
  }

  /**
   * Atomically claims the next due job (score ≤ nowMs).
   * Returns the job name if claimed, null otherwise.
   */
  async claimDueJob(nowMs: number): Promise<string | null> {
    const result = await this.execScript(CLAIM_SCRIPT, {
      keys: [this.jobsKey],
      arguments: [nowMs.toString()],
    });
    return (result as string | null) ?? null;
  }

  /**
   * Peeks at the earliest entry in the ZSET without removing it.
   */
  async peekNextJob(): Promise<{ name: string; score: number } | null> {
    const results = await this.client.zRangeWithScores(this.jobsKey, 0, 0);
    if (results.length === 0) return null;
    const { value, score } = results[0];
    return { name: value, score };
  }

  /**
   * Re-enqueues a job with the given next timestamp (overwrites existing entry).
   */
  async enqueueJob(name: string, nextTs: number): Promise<void> {
    await this.client.zAdd(this.jobsKey, { score: nextTs, value: name });
  }

  /**
   * Returns current Redis server time in milliseconds.
   * Use this instead of Date.now() to avoid clock skew across instances.
   */
  async getTime(): Promise<number> {
    const [seconds, microseconds] = await this.client.time();
    return parseInt(seconds) * 1000 + Math.floor(parseInt(microseconds) / 1000);
  }

  /**
   * Removes a job from both the ZSET and the meta Hash.
   */
  async removeJob(name: string): Promise<void> {
    await Promise.all([
      this.client.zRem(this.jobsKey, name),
      this.client.hDel(this.metaKey, name),
    ]);
  }

  private async execScript(
    script: string,
    options: { keys: string[]; arguments: string[] },
  ): Promise<unknown> {
    let sha = this.scriptShas.get(script);
    if (!sha) {
      sha = await this.client.scriptLoad(script);
      this.scriptShas.set(script, sha);
    }
    try {
      return await this.client.evalSha(sha, options);
    } catch (error: unknown) {
      if ((error as Error)?.message?.includes('NOSCRIPT')) {
        this.scriptShas.delete(script);
        return await this.client.eval(script, options);
      }
      throw error;
    }
  }
}
