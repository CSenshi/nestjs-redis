export { RedisClientModule } from './lib/module';
export { InjectRedis } from './lib/decorators';
export type {
  Redis,
  RedisClient,
  RedisCluster,
  RedisSentinel,
  RedisModuleOptions,
  RedisConnectionConfig,
} from './lib/types';
export { RedisToken } from './lib/tokens';
export type {
  RedisOptionsFactory,
  RedisModuleAsyncOptions,
} from './lib/interfaces';
