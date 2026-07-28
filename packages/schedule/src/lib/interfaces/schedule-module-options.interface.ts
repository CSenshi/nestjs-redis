import type { ModuleMetadata, Type } from '@nestjs/common';
import type {
  RedisClientType,
  RedisClusterType,
  RedisSentinelType,
} from 'redis';

type RedisClientLike = RedisClientType | RedisClusterType | RedisSentinelType;

/**
 * @publicApi
 */
export interface ScheduleModuleOptions {
  client: RedisClientLike;
  keyPrefix?: string;
  shutdownTimeout?: number;
  cronJobs?: boolean;
  intervals?: boolean;
  timeouts?: boolean;
}

/**
 * @publicApi
 */
export interface ScheduleModuleOptionsFactory {
  createScheduleOptions():
    | Promise<ScheduleModuleOptions>
    | ScheduleModuleOptions;
}

/**
 * @publicApi
 */
export interface ScheduleModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  useExisting?: Type<ScheduleModuleOptionsFactory>;
  useClass?: Type<ScheduleModuleOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<ScheduleModuleOptions> | ScheduleModuleOptions;
  inject?: any[];
}
