import { Inject, Injectable } from '@nestjs/common';
import type { RedisClientType, RedisClusterType, RedisSentinelType } from 'redis';
import { SCHEDULE_MODULE_OPTIONS } from '../schedule.constants';
import type { ScheduleModuleOptions } from '../interfaces/schedule-module-options.interface';

type RedisClientLike = RedisClientType | RedisClusterType | RedisSentinelType;

const CLAIM_SCRIPT = `
local jobs = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, 1)
if #jobs == 0 then return nil end
redis.call('ZREM', KEYS[1], jobs[1])
return jobs[1]
`;

@Injectable()
export class RedisJobStore {
  private readonly client: RedisClientLike;
  private readonly jobsKey: string;
  private readonly metaKey: string;
  private claimScriptSha?: string;

  constructor(
    @Inject(SCHEDULE_MODULE_OPTIONS) options: ScheduleModuleOptions,
  ) {
    this.client = options.client as RedisClientLike;
    const prefix = options.keyPrefix ?? 'scheduler';
    this.jobsKey = `${prefix}:jobs`;
    this.metaKey = `${prefix}:meta`;
  }

  /**
   * Registers a job in Redis on bootstrap.
   * Uses ZADD NX if expression is unchanged; overwrites if expression changed.
   */
  async registerJob(
    name: string,
    expression: string,
    nextTs: number,
  ): Promise<void> {
    const stored = await this.client.hGet(this.metaKey, name);

    if (stored !== expression) {
      await this.client.hSet(this.metaKey, name, expression);
      await this.client.zAdd(this.jobsKey, { score: nextTs, value: name });
    } else {
      await this.client.zAdd(this.jobsKey, { score: nextTs, value: name }, { NX: true });
    }
  }

  /**
   * Atomically claims the next due job (score ≤ nowMs).
   * Returns the job name if claimed, null otherwise.
   */
  async claimDueJob(nowMs: number): Promise<string | null> {
    const sha = await this.loadClaimScript();

    try {
      return await this.execClaim(sha, nowMs);
    } catch (error: unknown) {
      if ((error as Error)?.message?.includes('NOSCRIPT')) {
        this.claimScriptSha = undefined;
        return await this.execClaim(CLAIM_SCRIPT, nowMs);
      }
      throw error;
    }
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
   * Removes a job from both the ZSET and the meta Hash.
   */
  async removeJob(name: string): Promise<void> {
    await Promise.all([
      this.client.zRem(this.jobsKey, name),
      this.client.hDel(this.metaKey, name),
    ]);
  }

  private async loadClaimScript(): Promise<string> {
    if (this.claimScriptSha) return this.claimScriptSha;
    this.claimScriptSha = await this.client.scriptLoad(CLAIM_SCRIPT);
    return this.claimScriptSha;
  }

  private async execClaim(
    scriptOrSha: string,
    nowMs: number,
  ): Promise<string | null> {
    const options = {
      keys: [this.jobsKey],
      arguments: [nowMs.toString()],
    };

    const result = this.isSha1(scriptOrSha)
      ? await this.client.evalSha(scriptOrSha, options)
      : await this.client.eval(scriptOrSha, options);

    return (result as string | null) ?? null;
  }

  private isSha1(value: string): boolean {
    return /^[a-f0-9]{40}$/i.test(value);
  }
}
