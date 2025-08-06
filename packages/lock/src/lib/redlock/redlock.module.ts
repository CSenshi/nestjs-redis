import { Module } from '@nestjs/common';
import type { RedlockModuleOptions } from './redlock.interfaces';
import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} from './redlock.module-definition';
import { RedlockService } from './redlock.service';
import type { RedisClientType } from 'redis';

@Module({
  providers: [
    {
      provide: RedlockService,
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: RedlockModuleOptions) =>
        new RedlockService(options.clients as RedisClientType[], options.redlockConfig),
    },
  ],
  exports: [RedlockService],
})
export class RedlockModule extends ConfigurableModuleClass {}
