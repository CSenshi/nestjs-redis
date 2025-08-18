import {
  DynamicModule,
  FactoryProvider,
  Logger,
  Module,
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
  implements OnApplicationShutdown
{
  private static readonly logger = new Logger('RedisModule');

  protected connectionName?: string;

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
        override connectionName = options?.connectionName;
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
        override connectionName = options.connectionName;
      },
      imports: options.imports || [],
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
      useFactory: async (config: RedisModuleOptions): Promise<Redis> => {
        function getClient(): Redis {
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
        }

        RedisModule.log(`Creating Redis client...`, connectionName);
        const client = getClient();
        RedisModule.log(`Connecting to Redis...`, connectionName);
        await client.connect();
        RedisModule.log(`Redis client connected`, connectionName);
        return client;
      },
      inject: [MODULE_OPTIONS_TOKEN],
    };
  }

  async onApplicationShutdown() {
    RedisModule.log(`Closing Redis connection...`, this.connectionName);
    await this.moduleRef.get<Redis>(RedisToken(this.connectionName)).quit();
    RedisModule.log(`Redis connection closed`, this.connectionName);
  }

  private static log(
    message: string,
    connectionName: string | undefined = '<empty>',
  ): void {
    if (process.env['REDIS_MODULE_DEBUG'] !== 'true') return;

    this.logger.log(`[connection=${connectionName}]: ${message}`);
  }
}
