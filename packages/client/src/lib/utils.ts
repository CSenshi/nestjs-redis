export function getRedisClientInjectionToken(connectionName?: string): string {
	if (connectionName) {
		return `NODE_REDIS_CLIENT_${connectionName.toUpperCase()}`;
	}

	return 'NODE_REDIS_CLIENT';
}