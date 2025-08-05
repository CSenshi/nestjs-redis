import { ConfigurableModuleBuilder } from '@nestjs/common';
import {
  RedlockModuleOptions,
  RedlockOptionsFactory,
} from './redlock.interfaces';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<RedlockModuleOptions>({
    moduleName: 'Redlock',
  })
    .setClassMethodName('forRoot')
    .setFactoryMethodName('createRedlockOptions' as keyof RedlockOptionsFactory)
    .setExtras({ isGlobal: true }, (definition, extras) => ({
      ...definition,
      global: extras.isGlobal,
    }))
    .build();
