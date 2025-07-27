import { RedisModuleOptions } from '../types';

/**
 * Interface describing a `RedisOptionsFactory`. Providers supplying configuration
 * options for the Redis module must implement this interface.
 *
 * @publicApi
 */
export interface RedisOptionsFactory {
  createRedisOptions(): Promise<RedisModuleOptions> | RedisModuleOptions;
}
