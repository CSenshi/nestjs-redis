import {
  DynamicModule,
  Module,
  Provider,
  Type,
} from '@nestjs/common';
import { DiscoveryModule, Reflector } from '@nestjs/core';
import { SCHEDULE_MODULE_OPTIONS } from './schedule.constants.js';
import type {
  ScheduleModuleAsyncOptions,
  ScheduleModuleOptions,
  ScheduleModuleOptionsFactory,
} from './interfaces/schedule-module-options.interface.js';
import { SchedulerRegistry } from './scheduler.registry.js';
import { SchedulerOrchestrator } from './scheduler.orchestrator.js';
import { ScheduleExplorer } from './schedule.explorer.js';
import { SchedulerMetadataAccessor } from './schedule-metadata.accessor.js';
import { RedisJobStore } from './redis/redis-job-store.service.js';
import { RedisPollLoop } from './redis/redis-poll-loop.service.js';

const CORE_PROVIDERS: Type[] = [
  SchedulerMetadataAccessor,
  RedisJobStore,
  RedisPollLoop,
  SchedulerRegistry,
  SchedulerOrchestrator,
  ScheduleExplorer,
];

@Module({})
export class ScheduleModule {
  static forRoot(options?: Partial<ScheduleModuleOptions>): DynamicModule {
    if (!options?.client) {
      throw new Error(
        'ScheduleModule.forRoot() requires a `client` option. Use forRootAsync() to inject it.',
      );
    }

    const resolvedOptions: ScheduleModuleOptions = {
      cronJobs: true,
      intervals: true,
      timeouts: true,
      ...options,
      client: options.client,
    };

    return {
      global: true,
      module: ScheduleModule,
      imports: [DiscoveryModule],
      providers: [
        { provide: SCHEDULE_MODULE_OPTIONS, useValue: resolvedOptions },
        Reflector,
        ...CORE_PROVIDERS,
      ],
      exports: [SchedulerRegistry],
    };
  }

  static forRootAsync(options: ScheduleModuleAsyncOptions): DynamicModule {
    const asyncProviders = ScheduleModule.createAsyncProviders(options);

    return {
      global: true,
      module: ScheduleModule,
      imports: [DiscoveryModule, ...(options.imports ?? [])],
      providers: [
        ...asyncProviders,
        Reflector,
        ...CORE_PROVIDERS,
      ],
      exports: [SchedulerRegistry],
    };
  }

  private static createAsyncProviders(
    options: ScheduleModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: SCHEDULE_MODULE_OPTIONS,
          useFactory: async (...args: unknown[]) => {
            const result = await options.useFactory!(...args);
            return {
              cronJobs: true,
              intervals: true,
              timeouts: true,
              ...result,
            };
          },
          inject: options.inject ?? [],
        },
      ];
    }

    const useClass = options.useClass ?? options.useExisting;
    if (!useClass) {
      throw new Error(
        'ScheduleModule.forRootAsync() requires useFactory, useClass, or useExisting.',
      );
    }

    const providers: Provider[] = [
      {
        provide: SCHEDULE_MODULE_OPTIONS,
        useFactory: async (factory: ScheduleModuleOptionsFactory) => {
          const result = await factory.createScheduleOptions();
          return {
            cronJobs: true,
            intervals: true,
            timeouts: true,
            ...result,
          };
        },
        inject: [useClass],
      },
    ];

    if (options.useClass) {
      providers.push({ provide: useClass, useClass });
    }

    return providers;
  }
}
