import { Inject } from '@nestjs/common';
import { RedisToken } from './tokens';

export const InjectRedis = (connectionName?: string) =>
  Inject(RedisToken(connectionName));
