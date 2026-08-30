import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { DiscoveryModule, Reflector } from '@nestjs/core';
import {
  ScheduleModuleAsyncOptions,
  ScheduleModuleOptions,
  ScheduleModuleOptionsFactory,
} from './interfaces/schedule-module-options.interface.js';
import { RedisJobStore } from './redis/redis-job-store.service.js';
import { RedisPollLoop } from './redis/redis-poll-loop.service.js';
import { SchedulerMetadataAccessor } from './schedule-metadata.accessor.js';
import { SCHEDULE_MODULE_OPTIONS } from './schedule.constants.js';
import { ScheduleExplorer } from './schedule.explorer.js';
import { SchedulerOrchestrator } from './scheduler.orchestrator.js';
import { SchedulerRegistry } from './scheduler.registry.js';

const CORE_PROVIDERS: Type[] = [
  SchedulerMetadataAccessor,
  RedisJobStore,
  RedisPollLoop,
  SchedulerRegistry,
  SchedulerOrchestrator,
  ScheduleExplorer,
];

/**
 * @publicApi
 */
@Module({})
export class ScheduleModule {
  static forRoot(options: ScheduleModuleOptions): DynamicModule {
    const resolvedOptions: ScheduleModuleOptions = {
      cronJobs: true,
      intervals: true,
      timeouts: true,
      ...options,
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
    return {
      global: true,
      module: ScheduleModule,
      imports: [DiscoveryModule, ...(options.imports ?? [])],
      providers: [
        ...this.createAsyncProviders(options),
        Reflector,
        ...CORE_PROVIDERS,
      ],
      exports: [SchedulerRegistry],
    };
  }

  private static createAsyncProviders(
    options: ScheduleModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    const useClass = options.useClass as Type<ScheduleModuleOptionsFactory>;
    return [
      this.createAsyncOptionsProvider(options),
      { provide: useClass, useClass },
    ];
  }

  private static createAsyncOptionsProvider(
    options: ScheduleModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      const factory = options.useFactory;
      return {
        provide: SCHEDULE_MODULE_OPTIONS,
        useFactory: async (...args: unknown[]) => {
          const config = await factory(...args);
          return {
            cronJobs: true,
            intervals: true,
            timeouts: true,
            ...config,
          };
        },
        inject: (options.inject ?? []) as never[],
      };
    }
    const inject = [
      (options.useClass ??
        options.useExisting) as Type<ScheduleModuleOptionsFactory>,
    ];
    return {
      provide: SCHEDULE_MODULE_OPTIONS,
      useFactory: async (factory: ScheduleModuleOptionsFactory) => {
        const config = await factory.createScheduleOptions();
        return {
          cronJobs: true,
          intervals: true,
          timeouts: true,
          ...config,
        };
      },
      inject,
    };
  }
}
