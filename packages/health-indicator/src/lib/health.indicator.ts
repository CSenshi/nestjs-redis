import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { Redis } from './interfaces';

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
  private healthIndicatorService = new HealthIndicatorService();

  async isHealthy(
    key: string,
    { client }: { client: Redis },
  ): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

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
