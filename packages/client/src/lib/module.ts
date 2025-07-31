import {
  DynamicModule,
  FactoryProvider,
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createClient, createCluster, createSentinel } from 'redis';
import { RedisModuleAsyncOptions } from './interfaces';
import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} from './redis-client.module-definition';
import { RedisToken } from './tokens';
import { Redis, RedisModuleForRootOptions, RedisModuleOptions } from './types';

@Module({})
export class RedisModule
  extends ConfigurableModuleClass
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  protected connectionToken?: string;

  constructor(private moduleRef: ModuleRef) {
    super();
  }

  public static forRoot(
    options: RedisModuleForRootOptions = {},
  ): DynamicModule {
    const baseModule = super.forRoot(options);

    return {
      global: options?.isGlobal ?? false,
      module: class extends RedisModule {
        override connectionToken = RedisToken(options?.connectionName);
      },
      providers: [
        ...(baseModule.providers || []),
        this.getRedisClientProvider(options?.connectionName),
      ],
      exports: [RedisToken(options?.connectionName)],
    };
  }

  public static forRootAsync(options: RedisModuleAsyncOptions): DynamicModule {
    const baseModule = super.forRootAsync(options);

    return {
      global: options.isGlobal ?? false,
      module: class extends RedisModule {
        override connectionToken = RedisToken(options.connectionName);
      },
      providers: [
        ...(baseModule.providers || []),
        this.getRedisClientProvider(options.connectionName),
      ],
      exports: [RedisToken(options.connectionName)],
    };
  }

  private static getRedisClientProvider(
    connectionName?: string,
  ): FactoryProvider {
    return {
      provide: RedisToken(connectionName),
      useFactory: (config: RedisModuleOptions): Redis => {
        switch (config?.type) {
          case 'client':
          case undefined:
            return createClient(config?.options);
          case 'cluster':
            return createCluster(config.options);
          case 'sentinel':
            return createSentinel(config.options);
          default:
            throw new Error(
              // @ts-expect-error check for config type
              `Unsupported Redis type: ${config?.type}. Supported types are 'client', 'cluster' and 'sentinel'`,
            );
        }
      },
      inject: [MODULE_OPTIONS_TOKEN],
    };
  }

  async onApplicationBootstrap() {
    if (!this.connectionToken) {
      throw new Error(
        'Connection token is not defined. Ensure to call forRoot or forRootAsync.',
      );
    }

    await this.moduleRef.get<Redis>(this.connectionToken).connect();
  }

  async onApplicationShutdown() {
    if (!this.connectionToken) {
      throw new Error(
        'Connection token is not defined. Ensure to call forRoot or forRootAsync.',
      );
    }

    await this.moduleRef.get<Redis>(this.connectionToken).quit();
  }
}
