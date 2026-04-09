import { SetMetadata, applyDecorators } from '@nestjs/common';
import {
  SCHEDULE_CRON_OPTIONS,
  SCHEDULER_NAME,
  SCHEDULER_TYPE,
} from '../schedule.constants';
import { SchedulerType } from '../enums/scheduler-type.enum';

export type CronOptions = {
  name?: string;
  disabled?: boolean;
  threshold?: number;
  waitForCompletion?: boolean;
  unrefTimeout?: boolean;
} & (
  | { timeZone?: string; utcOffset?: never }
  | { timeZone?: never; utcOffset?: number }
);

export function Cron(
  cronTime: string | Date,
  options: CronOptions = {},
): MethodDecorator {
  return applyDecorators(
    SetMetadata(SCHEDULE_CRON_OPTIONS, { cronTime, ...options }),
    SetMetadata(SCHEDULER_NAME, options.name),
    SetMetadata(SCHEDULER_TYPE, SchedulerType.CRON),
  );
}
