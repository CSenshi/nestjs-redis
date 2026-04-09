import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { SchedulerMetadataAccessor } from './schedule-metadata.accessor.js';
import { SchedulerOrchestrator } from './scheduler.orchestrator.js';
import { SchedulerType } from './enums/scheduler-type.enum.js';
import { SCHEDULE_MODULE_OPTIONS } from './schedule.constants.js';
import type { ScheduleModuleOptions } from './interfaces/schedule-module-options.interface.js';

@Injectable()
export class ScheduleExplorer implements OnModuleInit {
  private readonly logger = new Logger(ScheduleExplorer.name);

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly accessor: SchedulerMetadataAccessor,
    private readonly orchestrator: SchedulerOrchestrator,
    @Inject(SCHEDULE_MODULE_OPTIONS)
    private readonly options: ScheduleModuleOptions,
  ) {}

  onModuleInit(): void {
    this.explore();
  }

  private explore(): void {
    const providers = [
      ...this.discovery.getProviders(),
      ...this.discovery.getControllers(),
    ];

    for (const wrapper of providers) {
      const { instance } = wrapper;
      if (!instance || typeof instance !== 'object') continue;

      const prototype = Object.getPrototypeOf(instance) as object;
      this.scanner.scanFromPrototype(instance, prototype, (methodName: string) => {
        this.lookupSchedulers(instance as Record<string, unknown>, methodName);
      });
    }
  }

  private lookupSchedulers(
    instance: Record<string, unknown>,
    methodName: string,
  ): void {
    const methodRef = instance[methodName];
    if (typeof methodRef !== 'function') return;

    const methodKey = (instance[methodName] as object).constructor
      ? (instance[methodName] as Function)
      : methodRef;

    const schedulerType = this.accessor.getSchedulerType(methodKey as object);
    if (!schedulerType) return;

    const name = this.accessor.getSchedulerName(methodKey as object);

    switch (schedulerType) {
      case SchedulerType.CRON: {
        if (this.options.cronJobs === false) return;
        const meta = this.accessor.getCronMetadata(methodKey as object);
        if (!meta) return;
        const handler = this.wrapHandler(instance, methodName);
        const resolvedName = name ?? `${instance.constructor?.name ?? 'Unknown'}.${methodName}`;
        this.orchestrator.addCron(handler, { ...meta, name: resolvedName });
        break;
      }
      case SchedulerType.INTERVAL: {
        if (this.options.intervals === false) return;
        const meta = this.accessor.getIntervalMetadata(methodKey as object);
        if (!meta) return;
        const handler = this.wrapHandler(instance, methodName);
        const resolvedName = name ?? `${instance.constructor?.name ?? 'Unknown'}.${methodName}`;
        this.orchestrator.addInterval(handler, meta.timeout, resolvedName);
        break;
      }
      case SchedulerType.TIMEOUT: {
        if (this.options.timeouts === false) return;
        const meta = this.accessor.getTimeoutMetadata(methodKey as object);
        if (!meta) return;
        const handler = this.wrapHandler(instance, methodName);
        const resolvedName = name ?? `${instance.constructor?.name ?? 'Unknown'}.${methodName}`;
        this.orchestrator.addTimeout(handler, meta.timeout, resolvedName);
        break;
      }
    }
  }

  private wrapHandler(
    instance: Record<string, unknown>,
    methodName: string,
  ): () => unknown {
    return () => {
      try {
        const result = (instance[methodName] as Function).call(instance);
        return result;
      } catch (error: unknown) {
        this.logger.error(
          `Error in scheduled method "${methodName}"`,
          error,
        );
      }
    };
  }
}
