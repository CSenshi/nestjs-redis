/**
 * Creates a Redis client injection token.
 *
 * @param connectionName - Optional connection name
 * @returns Injection token for the Redis client
 * @publicApi
 */
export function RedisToken(connectionName?: string): string {
  if (connectionName) {
    return `REDIS_CLIENT_${connectionName.toUpperCase()}`;
  }

  return 'REDIS_CLIENT';
}
