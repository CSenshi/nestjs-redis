import type { createClient, createCluster, createSentinel } from 'redis';

export type RedisClient = ReturnType<typeof createClient>;
export type RedisCluster = ReturnType<typeof createCluster>;
export type RedisSentinel = ReturnType<typeof createSentinel>;
export type Redis = RedisClient | RedisCluster | RedisSentinel;

export type RedisClientOptions = Parameters<typeof createClient>[0];
export type RedisClusterOptions = Parameters<typeof createCluster>[0];
export type RedisSentinelOptions = Parameters<typeof createSentinel>[0];
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
