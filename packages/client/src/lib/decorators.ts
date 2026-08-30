import { Inject } from '@nestjs/common';
import { RedisToken } from './tokens.js';

export const InjectRedis = (connectionName?: string) =>
  Inject(RedisToken(connectionName));
