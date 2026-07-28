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
import { RedisModuleForRootOptions, RedisModuleOptions } from './types';

// redis package generics (RespVersions, TypeMapping, …) vary by factory call site
// under redis v6, so client | cluster | sentinel no longer form a clean union.
// Only the lifecycle surface this module needs is required here; consumers still
// type injections as RedisClientType / RedisClusterType / RedisSentinelType.
type RedisInstance = {
  connect: () => Promise<unknown>;
  close: () => Promise<unknown>;
  on: (event: string, listener: (...args: unknown[]) => void) => unknown;
};

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
      useFactory: async (
        config: RedisModuleOptions,
      ): Promise<RedisInstance> => {
        function getClient(): RedisInstance {
          switch (config?.type) {
            case 'client':
            case undefined:
              return createClient(config?.options) as RedisInstance;
            case 'cluster':
              return createCluster(config.options) as RedisInstance;
            case 'sentinel':
              return createSentinel(config.options) as RedisInstance;
            default:
              throw new Error(
                // @ts-expect-error check for config type
                `Unsupported Redis type: ${config?.type}. Supported types are 'client', 'cluster' and 'sentinel'`,
              );
          }
        }

        function addListeners(
          client: RedisInstance,
          connectionName?: string,
        ): void {
          client.on('connect', () => {
            RedisModule.log(
              `[Event=connect] Connection initiated to Redis server`,
              connectionName,
            );
          });

          client.on('ready', () => {
            RedisModule.log(
              `[Event=ready] Redis client is ready to accept commands`,
              connectionName,
            );
          });

          client.on('end', () => {
            RedisModule.log(
              `[Event=end] Connection closed (disconnected from Redis server)`,
              connectionName,
            );
          });

          client.on('reconnecting', () => {
            RedisModule.log(
              `[Event=reconnecting] Attempting to reconnect to Redis server`,
              connectionName,
            );
          });

          client.on('error', (err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            RedisModule.err(
              `[Event=error] Redis connection error (network issue): ${message}`,
              connectionName,
            );
          });
        }

        RedisModule.log(`Creating Redis client...`, connectionName);
        const client = getClient();
        addListeners(client, connectionName);
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
    await this.moduleRef
      .get<RedisInstance>(RedisToken(this.connectionName))
      .close();
    RedisModule.log(`Redis connection closed`, this.connectionName);
  }

  private static log(
    message: string,
    connectionName: string | undefined = '<empty>',
  ): void {
    if (process.env['REDIS_MODULE_DEBUG'] !== 'true') return;

    this.logger.log(`[Connection=${connectionName}]: ${message}`);
  }

  private static err(
    message: string,
    connectionName: string | undefined = '<empty>',
  ): void {
    this.logger.error(`[Connection=${connectionName}]: ${message}`);
  }
}
