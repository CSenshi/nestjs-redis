import { Injectable, Logger } from '@nestjs/common';
import { CronExpressionParser } from 'cron-parser';
import { RedisJobStore } from './redis-job-store.service';

const DEFAULT_EMPTY_SLEEP_MS = 1000;

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
const MAX_POLL_INTERVAL_MS = 60_000;

export interface CronJobEntry {
  name: string;
  expression: string;
  timeZone?: string;
  utcOffset?: number;
  threshold: number;
  handler: () => unknown;
}

@Injectable()
export class RedisPollLoop {
  private readonly logger = new Logger(RedisPollLoop.name);
  private running = false;
  private abortController?: AbortController;
  private readonly jobs = new Map<string, CronJobEntry>();
  private readonly inFlight = new Set<Promise<unknown>>();

  constructor(private readonly store: RedisJobStore) {}

  registerJob(entry: CronJobEntry): void {
    this.jobs.set(entry.name, entry);
  }

  unregisterJob(name: string): void {
    this.jobs.delete(name);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.abortController = new AbortController();
    void this.loop(this.abortController.signal);
  }

  async stop(shutdownTimeout = 5000): Promise<void> {
    this.running = false;
    this.abortController?.abort();

    if (this.inFlight.size > 0) {
      const deadline = new Promise<void>((resolve) =>
        setTimeout(resolve, shutdownTimeout),
      );
      await Promise.race([Promise.allSettled([...this.inFlight]), deadline]);
    }
  }

  private async loop(signal: AbortSignal): Promise<void> {
    while (this.running && !signal.aborted) {
      try {
        const next = await this.store.peekNextJob();
        const now = await this.store.getTime();

        if (!next) {
          await this.interruptibleSleep(DEFAULT_EMPTY_SLEEP_MS, signal);
          continue;
        }

        if (next.score > now) {
          await this.interruptibleSleep(
            Math.min(next.score - now, MAX_POLL_INTERVAL_MS),
            signal,
          );
          if (signal.aborted) break;
        }

        const claimedAt = await this.store.getTime();
        const jobName = await this.store.claimDueJob(claimedAt);

        if (!jobName) {
          // Another instance claimed it; loop immediately
          continue;
        }

        const entry = this.jobs.get(jobName);
        if (!entry) {
          this.logger.warn(`Claimed unknown job: ${jobName}`);
          continue;
        }
        const nextTs = this.computeNextOccurrence(entry);
        await this.store.enqueueJob(jobName, nextTs);

        if (claimedAt - next.score > entry.threshold) {
          this.logger.warn(
            `Skipping late job "${jobName}" (${claimedAt - next.score}ms overdue, threshold ${entry.threshold}ms)`,
          );
          continue;
        }

        this.dispatchHandler(entry);
      } catch (error: unknown) {
        if (!signal.aborted) {
          this.logger.error('Poll loop error', error);
          await this.interruptibleSleep(DEFAULT_EMPTY_SLEEP_MS, signal);
        }
      }
    }
  }

  private dispatchHandler(entry: CronJobEntry): void {
    const promise = Promise.resolve()
      .then(() => entry.handler())
      .catch((error: unknown) => {
        this.logger.error(`Handler error for job "${entry.name}"`, error);
      })
      .finally(() => {
        this.inFlight.delete(promise);
      });

    this.inFlight.add(promise);
  }

  private computeNextOccurrence(entry: CronJobEntry): number {
    const tz = resolveTimezone(entry.timeZone, entry.utcOffset);
    const interval = CronExpressionParser.parse(
      entry.expression,
      tz ? { tz } : undefined,
    );
    return interval.next().toDate().getTime();
  }

  private interruptibleSleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise<void>((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }
      const timer = setTimeout(resolve, ms);
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }
}
