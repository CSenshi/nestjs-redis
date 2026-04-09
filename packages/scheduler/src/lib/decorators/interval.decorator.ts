import { SetMetadata, applyDecorators } from '@nestjs/common';
import {
  SCHEDULE_INTERVAL_OPTIONS,
  SCHEDULER_NAME,
  SCHEDULER_TYPE,
} from '../schedule.constants';
import { SchedulerType } from '../enums/scheduler-type.enum';

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
