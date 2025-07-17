import { DynamicModule, Module } from '@nestjs/common';
import { Redis, RedisModuleOptions } from './types';
import { createClient, createCluster, createSentinel } from 'redis';
import { ConnectorService } from './services/connector.service';
import { getRedisClientInjectionToken } from './utils';

@Module({})
export class RedisClientModule {
  public static forRoot(options?: RedisModuleOptions): DynamicModule {
    return {
      global: options?.isGlobal ?? false,
      module: RedisClientModule,
      providers: [
        ConnectorService,
        {
          provide: getRedisClientInjectionToken(),
          useFactory: (): Redis => {
            if (!options) return createClient();

            switch (options.type) {
              case 'client': return createClient(options.options);
              case 'cluster': return createCluster(options.options);
              case 'sentinel': return createSentinel(options.options);
              default:
                throw new Error('Invalid configuration');
            }
          }
        }
      ],
      exports: [getRedisClientInjectionToken()],
    };
  }
}
