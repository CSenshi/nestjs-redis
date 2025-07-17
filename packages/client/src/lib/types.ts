import { createCluster, createClient, createSentinel } from "redis";

export type RedisClient = ReturnType<typeof createClient>;
export type RedisCluster = ReturnType<typeof createCluster>;
export type RedisSentinel = ReturnType<typeof createSentinel>;
export type Redis = RedisClient | RedisCluster | RedisSentinel;

export type RedisClientOptions = Parameters<typeof createClient>[0];
export type RedisClusterOptions = Parameters<typeof createCluster>[0];
export type RedisSentinelOptions = Parameters<typeof createSentinel>[0];
export type RedisOptions = RedisClientOptions | RedisClusterOptions | RedisSentinelOptions;

type RedisModuleBaseOptions = {
	isGlobal?: boolean;
}

export type RedisModuleOptions = RedisModuleBaseOptions & ({
	type?: 'client';
	options?: RedisClientOptions
} | {
	type: 'cluster';
	options: RedisClusterOptions;
} | {
	type: 'sentinel';
	options: RedisSentinelOptions;
});
