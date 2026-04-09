import { Injectable } from '@nestjs/common';
import { SchedulerType } from './enums/scheduler-type.enum';
import { RedisJobStore } from './redis/redis-job-store.service';
import { RedisPollLoop } from './redis/redis-poll-loop.service';
import { DUPLICATE_SCHEDULER, NO_SCHEDULER_FOUND } from './schedule.messages';

export interface CronJobHandle {
  start(): Promise<void>;
  stop(): Promise<void>;
  readonly name: string;
  readonly expression: string;
  readonly nextTs: number;
}

@Injectable()
export class SchedulerRegistry {
  private readonly cronJobs = new Map<string, CronJobHandle>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly intervals = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly timeouts = new Map<string, any>();

  constructor(
    private readonly store: RedisJobStore,
    private readonly pollLoop: RedisPollLoop,
  ) {}

  getCronJob(name: string): CronJobHandle {
    const job = this.cronJobs.get(name);
    if (!job) {
      throw new Error(NO_SCHEDULER_FOUND(SchedulerType.CRON, name));
    }
    return job;
  }

  getCronJobs(): Map<string, CronJobHandle> {
    return new Map(this.cronJobs);
  }

  addCronJob(name: string, job: CronJobHandle): void {
    if (this.cronJobs.has(name)) {
      throw new Error(DUPLICATE_SCHEDULER(SchedulerType.CRON, name));
    }
    this.cronJobs.set(name, job);
  }

  async deleteCronJob(name: string): Promise<void> {
    const job = this.getCronJob(name);
    await job.stop();
    this.cronJobs.delete(name);
    this.pollLoop.unregisterJob(name);
    await this.store.removeJob(name);
  }

  doesExist(type: 'cron' | 'timeout' | 'interval', name: string): boolean {
    switch (type) {
      case 'cron':
        return this.cronJobs.has(name);
      case 'interval':
        return this.intervals.has(name);
      case 'timeout':
        return this.timeouts.has(name);
    }
  }

  getIntervals(): string[] {
    return [...this.intervals.keys()];
  }

  getTimeouts(): string[] {
    return [...this.timeouts.keys()];
  }

  getInterval<T = NodeJS.Timeout>(name: string): T {
    const interval = this.intervals.get(name) as T | undefined;
    if (interval === undefined) {
      throw new Error(NO_SCHEDULER_FOUND(SchedulerType.INTERVAL, name));
    }
    return interval;
  }

  getTimeout<T = NodeJS.Timeout>(name: string): T {
    const timeout = this.timeouts.get(name) as T | undefined;
    if (timeout === undefined) {
      throw new Error(NO_SCHEDULER_FOUND(SchedulerType.TIMEOUT, name));
    }
    return timeout;
  }

  addInterval<T = NodeJS.Timeout>(name: string, ref: T): void {
    if (this.intervals.has(name)) {
      throw new Error(DUPLICATE_SCHEDULER(SchedulerType.INTERVAL, name));
    }
    this.intervals.set(name, ref);
  }

  addTimeout<T = NodeJS.Timeout>(name: string, ref: T): void {
    if (this.timeouts.has(name)) {
      throw new Error(DUPLICATE_SCHEDULER(SchedulerType.TIMEOUT, name));
    }
    this.timeouts.set(name, ref);
  }

  deleteInterval(name: string): void {
    const ref = this.getInterval(name);
    clearInterval(ref as NodeJS.Timeout);
    this.intervals.delete(name);
  }

  deleteTimeout(name: string): void {
    const ref = this.getTimeout(name);
    clearTimeout(ref as NodeJS.Timeout);
    this.timeouts.delete(name);
  }
}
