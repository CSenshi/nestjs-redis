import type { RedlockOptions } from '@redis-kit/lock';
import type {
  RedisClientType,
  RedisClusterType,
  RedisSentinelType,
} from 'redis';

type RedisInstance = RedisClientType | RedisClusterType | RedisSentinelType;

/**
 * Redis module configuration options.
 * Contains Redis clients array and lock-specific configuration.
 */
export interface RedlockModuleOptions {
  /** Array of Redis clients for distributed locking */
  clients: RedisInstance[];
  /** Lock configuration options */
  redlockConfig?: RedlockOptions;
}

/**
 * Factory interface for creating Redis options
 */
export interface RedlockOptionsFactory {
  createRedlockOptions(): Promise<RedlockModuleOptions> | RedlockModuleOptions;
}
