import {
  BeforeApplicationShutdown,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { CronExpressionParser } from 'cron-parser';
import type { CronOptions } from './decorators/cron.decorator';
import type { ScheduleModuleOptions } from './interfaces/schedule-module-options.interface';
import { RedisJobStore } from './redis/redis-job-store.service';
import { RedisPollLoop } from './redis/redis-poll-loop.service';
import { SCHEDULE_MODULE_OPTIONS } from './schedule.constants';
import { type CronJobHandle, SchedulerRegistry } from './scheduler.registry';

const DEFAULT_THRESHOLD_MS = 250;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5000;

function resolveTimezone(
  timeZone?: string,
  utcOffset?: number,
): string | undefined {
  if (timeZone) return timeZone;
  if (utcOffset === undefined) return undefined;
  const sign = utcOffset >= 0 ? '+' : '-';
  const abs = Math.abs(utcOffset);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return mins === 0
    ? `UTC${sign}${hours}`
    : `UTC${sign}${hours}:${String(mins).padStart(2, '0')}`;
}

interface CronJobDef {
  handler: () => unknown;
  options: CronOptions & { cronTime: string };
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
    @Inject(SCHEDULE_MODULE_OPTIONS)
    private readonly options: ScheduleModuleOptions,
  ) {}

  addCron(
    fn: () => unknown,
    options: CronOptions & { cronTime: string },
  ): void {
    const timeZone = options.timeZone as string | undefined;
    if (timeZone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone });
      } catch {
        throw new Error(
          `Invalid timezone "${timeZone}" for cron job "${options.name ?? options.cronTime}"`,
        );
      }
    }
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
      const timeZone = def.options.timeZone as string | undefined;
      const utcOffset = def.options.utcOffset as number | undefined;

      const nextTs = this.computeNext(expression, timeZone, utcOffset);

      const handle = this.createCronJobHandle(
        name,
        expression,
        timeZone,
        utcOffset,
        nextTs,
      );
      this.registry.addCronJob(name, handle);

      if (!def.options.disabled) {
        this.pollLoop.registerJob({
          name,
          expression,
          timeZone,
          utcOffset,
          threshold,
          handler: def.handler,
        });
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

  private computeNext(
    expression: string,
    timeZone?: string,
    utcOffset?: number,
  ): number {
    const tz = resolveTimezone(timeZone, utcOffset);
    return CronExpressionParser.parse(expression, tz ? { tz } : undefined)
      .next()
      .toDate()
      .getTime();
  }

  private createCronJobHandle(
    name: string,
    expression: string,
    timeZone: string | undefined,
    utcOffset: number | undefined,
    initialNextTs: number,
  ): CronJobHandle {
    let nextTs = initialNextTs;
    const store = this.store;
    const computeNext = this.computeNext.bind(this);

    return {
      name,
      expression,
      get nextTs() {
        return nextTs;
      },
      async start() {
        const newNext = computeNext(expression, timeZone, utcOffset);
        nextTs = newNext;
        await store.enqueueJob(name, newNext);
      },
      async stop() {
        await store.removeJob(name);
      },
    };
  }

  private resolveCronName(options: CronOptions & { cronTime: string }): string {
    return options.name ?? options.cronTime.toString();
  }
}
