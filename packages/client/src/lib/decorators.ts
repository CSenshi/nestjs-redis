import { Inject } from '@nestjs/common';
import { RedisToken } from './utils';

export const InjectRedis = (connection?: string) =>
  Inject(RedisToken(connection));
