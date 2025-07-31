import type { createClient, createCluster, createSentinel } from 'redis';

/**
 * Redis client types supported by the health indicator
 */
export type RedisClient = ReturnType<typeof createClient>;
export type RedisCluster = ReturnType<typeof createCluster>;
export type RedisSentinel = ReturnType<typeof createSentinel>;
export type Redis = RedisClient | RedisCluster | RedisSentinel;
