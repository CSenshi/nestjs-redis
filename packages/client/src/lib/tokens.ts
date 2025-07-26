/**
 * Creates a Redis client injection token.
 * 
 * @param connection - Optional connection name
 * @returns Injection token for the Redis client
 * @publicApi
 */
export function RedisToken(connection?: string): string {
  if (connection) {
    return `REDIS_CLIENT_${connection.toUpperCase()}`;
  }

  return 'REDIS_CLIENT';
}

/**
 * Injection token for Redis connection names.
 * 
 * @publicApi
 */
export function getRedisConnectionNamesInjectionToken(): string {
  return 'REDIS_CONNECTION_NAMES';
}