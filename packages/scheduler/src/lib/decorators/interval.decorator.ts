import { SetMetadata, applyDecorators } from '@nestjs/common';
import { SchedulerType } from '../enums/scheduler-type.enum';
import {
  SCHEDULER_NAME,
  SCHEDULER_TYPE,
  SCHEDULE_INTERVAL_OPTIONS,
} from '../schedule.constants';

export function Interval(timeout: number): MethodDecorator;
export function Interval(name: string, timeout: number): MethodDecorator;
export function Interval(
  nameOrTimeout: string | number,
  timeout?: number,
): MethodDecorator {
  const [name, ms] =
    typeof nameOrTimeout === 'string'
      ? [nameOrTimeout, timeout as number]
      : [undefined, nameOrTimeout];

  return applyDecorators(
    SetMetadata(SCHEDULE_INTERVAL_OPTIONS, { timeout: ms }),
    SetMetadata(SCHEDULER_NAME, name),
    SetMetadata(SCHEDULER_TYPE, SchedulerType.INTERVAL),
  );
}
