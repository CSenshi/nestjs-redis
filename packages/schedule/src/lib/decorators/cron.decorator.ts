import { SetMetadata, applyDecorators } from '@nestjs/common';
import { SchedulerType } from '../enums/scheduler-type.enum';
import {
  SCHEDULER_NAME,
  SCHEDULER_TYPE,
  SCHEDULE_CRON_OPTIONS,
} from '../schedule.constants';

/**
 * @publicApi
 */
export type CronOptions = {
  /**
   * Specify the name of your cron job. This will allow to inject your cron job reference through `@InjectCronRef`.
   */
  name?: string;

  /**
   * Specify the timezone for the execution. This will modify the actual time relative to your timezone. If the timezone is invalid, an error is thrown. You can check all timezones available at [Moment Timezone Website](http://momentjs.com/timezone/).
   */
  timeZone?: unknown;
  /**
   * Specify the offset of your timezone in minutes rather than using the `timeZone` param.
   */
  utcOffset?: unknown;

  /**
   * This flag indicates whether the job will be executed at all.
   * @default false
   */
  disabled?: boolean;

  /**
   *  Threshold in ms to control whether to execute or skip missed execution deadlines caused by slow or busy hardware.
   *  Execution delays within threshold will be executed immediately, and otherwise will be skipped.
   *  In both cases a warning will be printed to the console with the job name and cron expression.
   *  Default is 250
   */
  threshold?: number;
} & ( // make timeZone & utcOffset mutually exclusive
  | {
      timeZone?: string;
      utcOffset?: never;
    }
  | {
      timeZone?: never;
      utcOffset?: number;
    }
);

/**
 * Creates a scheduled job.
 * @param cronTime The time to fire off your job as a cron expression string (e.g. `"* * * * *"`).
 * @param options Job execution options.
 *
 * @publicApi
 */
export function Cron(
  cronTime: string,
  options: CronOptions = {},
): MethodDecorator {
  const name = options?.name;
  return applyDecorators(
    SetMetadata(SCHEDULE_CRON_OPTIONS, {
      ...options,
      cronTime,
    }),
    SetMetadata(SCHEDULER_NAME, name),
    SetMetadata(SCHEDULER_TYPE, SchedulerType.CRON),
  );
}
