import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SCHEDULE_CRON_OPTIONS,
  SCHEDULE_INTERVAL_OPTIONS,
  SCHEDULE_TIMEOUT_OPTIONS,
  SCHEDULER_NAME,
  SCHEDULER_TYPE,
} from './schedule.constants.js';
import type { SchedulerType } from './enums/scheduler-type.enum.js';
import type { CronOptions } from './decorators/cron.decorator.js';
import type { IntervalMetadata } from './interfaces/interval-metadata.interface.js';
import type { TimeoutMetadata } from './interfaces/timeout-metadata.interface.js';

@Injectable()
export class SchedulerMetadataAccessor {
  constructor(private readonly reflector: Reflector) {}

  getSchedulerType(target: object): SchedulerType | undefined {
    return this.reflector.get<SchedulerType>(SCHEDULER_TYPE, target);
  }

  getSchedulerName(target: object): string | undefined {
    return this.reflector.get<string>(SCHEDULER_NAME, target);
  }

  getCronMetadata(
    target: object,
  ): (CronOptions & { cronTime: string | Date }) | undefined {
    return this.reflector.get<CronOptions & { cronTime: string | Date }>(
      SCHEDULE_CRON_OPTIONS,
      target,
    );
  }

  getIntervalMetadata(target: object): IntervalMetadata | undefined {
    return this.reflector.get<IntervalMetadata>(
      SCHEDULE_INTERVAL_OPTIONS,
      target,
    );
  }

  getTimeoutMetadata(target: object): TimeoutMetadata | undefined {
    return this.reflector.get<TimeoutMetadata>(
      SCHEDULE_TIMEOUT_OPTIONS,
      target,
    );
  }
}
