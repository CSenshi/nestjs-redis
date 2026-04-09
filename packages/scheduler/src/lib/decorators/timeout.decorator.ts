import { SetMetadata, applyDecorators } from '@nestjs/common';
import {
  SCHEDULE_TIMEOUT_OPTIONS,
  SCHEDULER_NAME,
  SCHEDULER_TYPE,
} from '../schedule.constants.js';
import { SchedulerType } from '../enums/scheduler-type.enum.js';

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
