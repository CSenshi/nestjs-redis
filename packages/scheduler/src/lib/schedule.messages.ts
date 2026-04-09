import type { SchedulerType } from './enums/scheduler-type.enum';

export const DUPLICATE_SCHEDULER = (
  type: SchedulerType,
  name: string,
): string =>
  `Scheduler with type "${type}" and name "${name}" already exists. Check your decorated methods.`;

export const NO_SCHEDULER_FOUND = (
  type: SchedulerType,
  name: string,
): string =>
  `No scheduler with type "${type}" and name "${name}" was found.`;
