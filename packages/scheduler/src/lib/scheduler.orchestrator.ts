import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  BeforeApplicationShutdown,
} from '@nestjs/common';
import { CronExpressionParser } from 'cron-parser';
import { RedisJobStore } from './redis/redis-job-store.service.js';
import { RedisPollLoop } from './redis/redis-poll-loop.service.js';
import { SchedulerRegistry, CronJobHandle } from './scheduler.registry.js';
import { SCHEDULE_MODULE_OPTIONS } from './schedule.constants.js';
import type { ScheduleModuleOptions } from './interfaces/schedule-module-options.interface.js';
import type { CronOptions } from './decorators/cron.decorator.js';

const DEFAULT_THRESHOLD_MS = 250;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5000;

interface CronJobDef {
  handler: () => unknown;
  options: CronOptions & { cronTime: string | Date };
}

@Injectable()
export class SchedulerOrchestrator
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  private readonly logger = new Logger(SchedulerOrchestrator.name);
  private readonly cronDefs = new Map<string, CronJobDef>();
  private readonly intervalRefs: NodeJS.Timeout[] = [];
  private readonly timeoutRefs: NodeJS.Timeout[] = [];

  constructor(
    private readonly store: RedisJobStore,
    private readonly pollLoop: RedisPollLoop,
    private readonly registry: SchedulerRegistry,
    @Inject(SCHEDULE_MODULE_OPTIONS) private readonly options: ScheduleModuleOptions,
  ) {}

  addCron(fn: () => unknown, options: CronOptions & { cronTime: string | Date }): void {
    const name = this.resolveCronName(options);
    this.cronDefs.set(name, { handler: fn, options });
  }

  addInterval(fn: () => unknown, timeout: number, name: string): void {
    const ref = setInterval(() => {
      try {
        const result = fn();
        if (result instanceof Promise) {
          result.catch((err: unknown) => {
            this.logger.error(`Interval "${name}" handler error`, err);
          });
        }
      } catch (err: unknown) {
        this.logger.error(`Interval "${name}" handler error`, err);
      }
    }, timeout);
    this.intervalRefs.push(ref);
    this.registry.addInterval(name, ref);
  }

  addTimeout(fn: () => unknown, timeout: number, name: string): void {
    const ref = setTimeout(() => {
      try {
        const result = fn();
        if (result instanceof Promise) {
          result.catch((err: unknown) => {
            this.logger.error(`Timeout "${name}" handler error`, err);
          });
        }
      } catch (err: unknown) {
        this.logger.error(`Timeout "${name}" handler error`, err);
      }
      this.timeoutRefs.splice(this.timeoutRefs.indexOf(ref), 1);
    }, timeout);
    this.timeoutRefs.push(ref);
    this.registry.addTimeout(name, ref);
  }

  async onApplicationBootstrap(): Promise<void> {
    for (const [name, def] of this.cronDefs) {
      const expression = def.options.cronTime as string;
      const threshold = def.options.threshold ?? DEFAULT_THRESHOLD_MS;
      const timeZone = def.options.timeZone;

      const nextTs = this.computeNext(expression, timeZone);

      const handle = this.createCronJobHandle(name, expression, timeZone, threshold, nextTs, def.handler);
      this.registry.addCronJob(name, handle);
      this.pollLoop.registerJob({ name, expression, timeZone, threshold, handler: def.handler });

      if (!def.options.disabled) {
        await this.store.registerJob(name, expression, nextTs);
      }
    }

    this.pollLoop.start();
  }

  async beforeApplicationShutdown(): Promise<void> {
    await this.pollLoop.stop(
      this.options.shutdownTimeout ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
    );

    for (const ref of this.intervalRefs) {
      clearInterval(ref);
    }
    for (const ref of this.timeoutRefs) {
      clearTimeout(ref);
    }
  }

  private computeNext(expression: string, timeZone?: string): number {
    const opts = timeZone ? { tz: timeZone } : undefined;
    return CronExpressionParser.parse(expression, opts).next().toDate().getTime();
  }

  private createCronJobHandle(
    name: string,
    expression: string,
    timeZone: string | undefined,
    threshold: number,
    initialNextTs: number,
    handler: () => unknown,
  ): CronJobHandle {
    let nextTs = initialNextTs;
    const store = this.store;
    const computeNext = this.computeNext.bind(this);

    return {
      name,
      expression,
      get nextTs() { return nextTs; },
      async start() {
        const newNext = computeNext(expression, timeZone);
        nextTs = newNext;
        await store.enqueueJob(name, newNext);
      },
      async stop() {
        await store.removeJob(name);
      },
    };
  }

  private resolveCronName(options: CronOptions & { cronTime: string | Date }): string {
    return options.name ?? options.cronTime.toString();
  }
}
