export function getRedisClientInjectionToken(connectionName?: string): string {
  if (connectionName) {
    return `NODE_REDIS_CLIENT_${connectionName.toUpperCase()}`;
  }

  return 'NODE_REDIS_CLIENT';
}

export function getRedisConnectionNamesInjectionToken(): string {
  return 'NODE_REDIS_CONNECTION_NAMES';
}
