import {
  DynamicModule,
  FactoryProvider,
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Redis, RedisModuleOptions, RedisConnectionConfig } from './types';
import { createClient, createCluster, createSentinel } from 'redis';
import { RedisToken } from './tokens';
import { ModuleRef } from '@nestjs/core';

@Module({})
export class RedisClientModule
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  protected connectionToken?: string;

  constructor(private moduleRef: ModuleRef) {}

  public static forRoot(options?: RedisModuleOptions): DynamicModule {
    const provider = this.getRedisClientProvider(options);
    const token = RedisToken(options?.connectionName);

    return {
      global: options?.isGlobal ?? false,
      module: class extends RedisClientModule {
        override connectionToken = token;
      },
      providers: [provider],
      exports: [provider.provide],
    };
  }

  private static getRedisClientProvider(
    config?: RedisConnectionConfig
  ): FactoryProvider {
    return {
      provide: RedisToken(config?.connectionName),
      useFactory: (): Redis => {
        if (!config) return createClient();
        switch (config.type) {
          case 'client':
          case undefined:
            return createClient(config.options);
          case 'cluster':
            return createCluster(config.options);
          case 'sentinel':
            return createSentinel(config.options);
          default:
            throw new Error('Invalid configuration');
        }
      },
    };
  }

  async onApplicationBootstrap() {
    await this.getRedisClient().connect();
  }

  async onApplicationShutdown() {
    await this.getRedisClient().quit();
  }

  private getRedisClient(): Redis {
    if(!this.connectionToken){
      throw new Error('Connection token is not defined. Ensure RedisClientModule is properly configured.');
    }
    return this.moduleRef.get<Redis>(this.connectionToken, { strict: false });
  }
}
