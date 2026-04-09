import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SCHEDULE_CRON_OPTIONS,
  SCHEDULE_INTERVAL_OPTIONS,
  SCHEDULE_TIMEOUT_OPTIONS,
  SCHEDULER_NAME,
  SCHEDULER_TYPE,
} from './schedule.constants';
import type { SchedulerType } from './enums/scheduler-type.enum';
import type { CronOptions } from './decorators/cron.decorator';
import type { IntervalMetadata } from './interfaces/interval-metadata.interface';
import type { TimeoutMetadata } from './interfaces/timeout-metadata.interface';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type TargetFn = Function;

@Injectable()
export class SchedulerMetadataAccessor {
  constructor(private readonly reflector: Reflector) {}

  getSchedulerType(target: TargetFn): SchedulerType | undefined {
    return this.reflector.get<SchedulerType>(SCHEDULER_TYPE, target);
  }

  getSchedulerName(target: TargetFn): string | undefined {
    return this.reflector.get<string>(SCHEDULER_NAME, target);
  }

  getCronMetadata(
    target: TargetFn,
  ): (CronOptions & { cronTime: string | Date }) | undefined {
    return this.reflector.get<CronOptions & { cronTime: string | Date }>(
      SCHEDULE_CRON_OPTIONS,
      target,
    );
  }

  getIntervalMetadata(target: TargetFn): IntervalMetadata | undefined {
    return this.reflector.get<IntervalMetadata>(
      SCHEDULE_INTERVAL_OPTIONS,
      target,
    );
  }

  getTimeoutMetadata(target: TargetFn): TimeoutMetadata | undefined {
    return this.reflector.get<TimeoutMetadata>(
      SCHEDULE_TIMEOUT_OPTIONS,
      target,
    );
  }
}
