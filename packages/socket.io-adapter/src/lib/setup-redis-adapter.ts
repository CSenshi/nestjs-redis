import type { INestApplication } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { UnknownElementException } from '@nestjs/core/errors/exceptions';
import { RedisClientNotFoundException } from './exceptions';
import { RedisIoAdapter } from './redis-io.adapter';

export async function setupRedisAdapter(
  app: INestApplication,
  redisToken?: string,
): Promise<void> {
  const redisIoAdapter = new RedisIoAdapter(app);

  try {
    const moduleRef = app.get(ModuleRef);
    const redisClient = moduleRef.get(RedisToken(redisToken), {
      strict: false,
    });
    await redisIoAdapter.connectToRedis(redisClient);
    app.useWebSocketAdapter(redisIoAdapter);
  } catch (error) {
    if (error instanceof UnknownElementException) {
      throw new RedisClientNotFoundException(redisToken);
    }

    throw error;
  }
}

/**
 * Creates a Redis client injection token.
 *
 * @param connectionName - Optional connection name
 * @returns Injection token for the Redis client
 * @publicApi
 */
function RedisToken(connectionName?: string): string {
  if (connectionName) {
    return `REDIS_CLIENT_${connectionName.toUpperCase()}`;
  }

  return 'REDIS_CLIENT';
}
