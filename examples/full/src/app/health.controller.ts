import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { InjectRedis, RedisHealthIndicator } from '@nestjs-redis/kit';
import type { RedisClientType, RedisClusterType } from 'redis';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redis: RedisHealthIndicator,
    @InjectRedis() private readonly redisClient: RedisClientType,
    @InjectRedis('cluster')
    private readonly redisClusterClient: RedisClusterType,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () =>
        this.redis.isHealthy('redis-client', {
          client: this.redisClient,
        }),
      () =>
        this.redis.isHealthy('redis-cluster', {
          client: this.redisClusterClient,
        }),
    ]);
  }
}
