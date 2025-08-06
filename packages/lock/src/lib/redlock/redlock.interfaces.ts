import type { RedlockOptions } from '@redis-kit/lock';
import type { createClient, RedisClientType } from 'redis';

type RedisClient = ReturnType<typeof createClient> | RedisClientType;

/**
 * Redis module configuration options.
 * Contains Redis clients array and lock-specific configuration.
 */
export interface RedlockModuleOptions {
  /** Array of Redis clients for distributed locking */
  clients: RedisClient[];
  /** Lock configuration options */
  redlockConfig?: RedlockOptions;
}

/**
 * Factory interface for creating Redis options
 */
export interface RedlockOptionsFactory {
  createRedlockOptions(): Promise<RedlockModuleOptions> | RedlockModuleOptions;
}
