import { Injectable } from '@nestjs/common';
import type {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import type {
  RedisClientType,
  RedisClusterType,
  RedisSentinelType,
  createClient,
  createCluster,
  createSentinel,
} from 'redis';

type Redis =
  | ReturnType<typeof createClient>
  | ReturnType<typeof createCluster>
  | ReturnType<typeof createSentinel>
  | RedisClientType
  | RedisClusterType
  | RedisSentinelType;

@Injectable()
export class RedisHealthIndicator {
  /**
   * TODO
   *
   * This is workaround, this should be DI but for some reason
   * HealthIndicatorService is not injected after building the package.
   *
   * Reference (how it should be): https://docs.nestjs.com/recipes/terminus#custom-health-indicator
   *
   * ToDo: Fix this issue in the future.
   */
  private _healthIndicatorService: HealthIndicatorService | null = null;

  private async ensureHealthIndicatorService(): Promise<HealthIndicatorService> {
    if (this._healthIndicatorService !== null) {
      return this._healthIndicatorService;
    }

    const { HealthIndicatorService } = await import('@nestjs/terminus');
    this._healthIndicatorService = new HealthIndicatorService();
    return this._healthIndicatorService;
  }

  async isHealthy(
    key: string,
    { client }: { client: Redis },
  ): Promise<HealthIndicatorResult> {
    const healthIndicatorService = await this.ensureHealthIndicatorService();
    const indicator = healthIndicatorService.check(key);

    try {
      const result = await client.ping();
      const isHealthy = result === 'PONG';

      if (!isHealthy) {
        return indicator.down({ message: `Redis ping failed: ${result}` });
      }

      return indicator.up();
    } catch (error) {
      return indicator.down({
        message:
          error instanceof Error ? error.message : 'Redis connection failed',
      });
    }
  }
}
