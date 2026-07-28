import type {
  RedisClientOptions,
  RedisClusterOptions,
  RedisSentinelOptions,
} from 'redis';

export type RedisOptions =
  | RedisClientOptions
  | RedisClusterOptions
  | RedisSentinelOptions;

export type RedisConnectionConfig =
  | {
      type?: 'client';
      options?: RedisClientOptions;
    }
  | {
      type: 'cluster';
      options: RedisClusterOptions;
    }
  | {
      type: 'sentinel';
      options: RedisSentinelOptions;
    };

/**
 * Redis module configuration options.
 * This only contains the Redis connection configuration, not module-level concerns.
 * Used by useFactory in forRootAsync.
 */
export type RedisModuleOptions = RedisConnectionConfig;

/**
 * Options for forRoot method that include both Redis configuration and module-level options.
 */
export type RedisModuleForRootOptions = RedisModuleOptions & {
  /**
   * If "true", register `RedisModule` as a global module.
   */
  isGlobal?: boolean;

  /**
   * The name of the connection. Used to create multiple named connections.
   */
  connectionName?: string;
};
