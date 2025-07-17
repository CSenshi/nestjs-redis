import { Inject } from '@nestjs/common';
import { getRedisClientInjectionToken } from './utils';

export const InjectRedis = (connection?: string) => Inject(getRedisClientInjectionToken(connection));
