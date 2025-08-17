export class RedisClientNotFoundException extends Error {
  constructor(redisToken?: string) {
    const baseMessage = `Redis client not found. Please ensure that the Redis client is properly configured and provided in the application context.

Most common solution:
Import and configure RedisModule in your app.module.ts:`;

    const configExample = redisToken
      ? `  RedisModule.forRoot({
    connectionName: '${redisToken}', // <-- connection name 
    options: { url: process.env['REDIS_URL'] },
  }),`
      : `  RedisModule.forRoot({
    options: { url: process.env['REDIS_URL'] },
  }),`;

    const troubleshooting = `

Make sure you have:
1. RedisModule imported in your module`;

    super(baseMessage + '\n\n' + configExample + troubleshooting);
    this.name = 'RedisClientNotFoundException';

    if (redisToken) {
      this.message += `\n\nRequired connection name: ${redisToken}`;
    }

    this.message += `\n`;
  }
}

export class RedisAdapterAlreadySetUpException extends Error {
  constructor() {
    super('Redis adapter is already set up for this application instance.');
    this.name = 'RedisAdapterAlreadySetUpException';
  }
}
