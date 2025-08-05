import type { RedlockOptions } from '@redis-kit/lock';
import type { RedisClientType } from 'redis';

/**
 * Redis module configuration options.
 * Contains Redis clients array and lock-specific configuration.
 */
export interface RedlockModuleOptions {
  /** Array of Redis clients for distributed locking */
  clients: RedisClientType[];
  /** Lock configuration options */
  redlockConfig?: RedlockOptions;
}

/**
 * Factory interface for creating Redis options
 */
export interface RedlockOptionsFactory {
  createRedlockOptions(): Promise<RedlockModuleOptions> | RedlockModuleOptions;
}
