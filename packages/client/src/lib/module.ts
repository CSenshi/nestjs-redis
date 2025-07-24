import {
  DynamicModule,
  FactoryProvider,
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import {
  Redis,
  RedisModuleOptions,
  RedisConnectionConfig,
  isRedisArrayConfiguration,
} from './types';
import { createClient, createCluster, createSentinel } from 'redis';
import { RedisToken, getRedisConnectionNamesInjectionToken } from './utils';
import { ModuleRef } from '@nestjs/core';

@Module({})
export class RedisClientModule
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  constructor(private moduleRef: ModuleRef) {}

  public static forRoot(options?: RedisModuleOptions): DynamicModule {
    const providers = this.getRedisClientProviders(options);

    return {
      global: options?.isGlobal ?? false,
      module: RedisClientModule,
      providers: [
        ...providers,
        {
          provide: getRedisConnectionNamesInjectionToken(),
          useValue: providers.map((p) => p.provide),
        },
      ],
      exports: providers.map((p) => p.provide),
    };
  }

  async onApplicationBootstrap() {
    await Promise.all(this.getAllClients().map((client) => client.connect()));
  }
  async onApplicationShutdown() {
    await Promise.all(this.getAllClients().map((client) => client.quit()));
  }

  private getAllClients(): Redis[] {
    const redisInjectionTokens = this.moduleRef.get<string[]>(
      getRedisConnectionNamesInjectionToken()
    );
    const clients = redisInjectionTokens.map((connectionName) =>
      this.moduleRef.get<Redis>(connectionName, { strict: false })
    );
    return clients;
  }

  private static getRedisClientProviders(
    options?: RedisModuleOptions
  ): FactoryProvider[] {
    if (isRedisArrayConfiguration(options)) {
      return options.connections.map((conn: RedisConnectionConfig) =>
        this.getRedisClientProvider(conn)
      );
    }

    return [this.getRedisClientProvider()];
  }

  private static getRedisClientProvider(
    config?: RedisConnectionConfig
  ): FactoryProvider {
    return {
      provide: RedisToken(config?.connection),
      useFactory: (): Redis => {
        if (!config) return createClient();
        switch (config.type) {
          case 'client':
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
}
