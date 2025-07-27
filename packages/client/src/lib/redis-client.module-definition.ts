import { ConfigurableModuleBuilder } from '@nestjs/common';
import { RedisOptionsFactory } from './interfaces';
import { RedisModuleOptions } from './types';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<RedisModuleOptions>({
    moduleName: 'RedisClient',
  })
    .setClassMethodName('forRoot')
    .setFactoryMethodName('createRedisOptions' as keyof RedisOptionsFactory)
    .build();
