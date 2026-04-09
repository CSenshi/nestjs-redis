import { SetMetadata, applyDecorators } from '@nestjs/common';
import { SchedulerType } from '../enums/scheduler-type.enum';
import {
  SCHEDULER_NAME,
  SCHEDULER_TYPE,
  SCHEDULE_TIMEOUT_OPTIONS,
} from '../schedule.constants';

export function Timeout(timeout: number): MethodDecorator;
export function Timeout(name: string, timeout: number): MethodDecorator;
export function Timeout(
  nameOrTimeout: string | number,
  timeout?: number,
): MethodDecorator {
  const [name, ms] =
    typeof nameOrTimeout === 'string'
      ? [nameOrTimeout, timeout as number]
      : [undefined, nameOrTimeout];

  return applyDecorators(
    SetMetadata(SCHEDULE_TIMEOUT_OPTIONS, { timeout: ms }),
    SetMetadata(SCHEDULER_NAME, name),
    SetMetadata(SCHEDULER_TYPE, SchedulerType.TIMEOUT),
  );
}
