import { HealthIndicatorService } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from 'redis';
import type {
  RedisClientType,
  RedisClusterType,
  RedisSentinelType,
} from 'redis';
import { RedisHealthIndicator } from './health.indicator';

type RedisInstance = RedisClientType | RedisClusterType | RedisSentinelType;

// These tests require a running Redis instance
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

describe('RedisHealthIndicator Integration Tests', () => {
  let healthIndicator: RedisHealthIndicator;
  let redisClient: RedisInstance;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        {
          provide: HealthIndicatorService,
          useValue: {
            check: jest.fn().mockReturnValue({
              up: jest.fn().mockImplementation((data) => ({
                redis: { status: 'up', ...data },
              })),
              down: jest.fn().mockImplementation((data) => ({
                redis: { status: 'down', ...data },
              })),
            }),
          },
        },
      ],
    }).compile();

    healthIndicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
  });

  describe('with Redis client', () => {
    beforeAll(async () => {
      try {
        // Use database 1 for health-indicator to avoid conflicts with other projects
        redisClient = createClient({
          url: REDIS_URL,
          database: 1,
        });
        await redisClient.connect();
      } catch {
        console.warn('Redis server not available, skipping integration tests');
      }
    });

    afterAll(async () => {
      if (redisClient && 'isReady' in redisClient && redisClient.isReady) {
        if ('quit' in redisClient) {
          await redisClient.quit();
        }
      }
    });

    it('should perform successful health check with real Redis', async () => {
      if (!redisClient || !('isReady' in redisClient) || !redisClient.isReady) {
        console.warn('Skipping test: Redis not available');
        return;
      }

      const result = await healthIndicator.isHealthy('redis', {
        client: redisClient,
      });

      expect(result.redis.status).toBe('up');
    });

    it('should handle connection errors', async () => {
      const badClient = createClient({
        url: 'redis://localhost:9999',
        socket: {
          connectTimeout: 1000, // 1 second timeout
        },
      });

      // Don't try to connect - just test the health check with a disconnected client
      const result = await healthIndicator.isHealthy('redis', {
        client: badClient,
      });

      expect(result.redis.status).toBe('down');

      try {
        await badClient.quit();
      } catch {
        // Ignore cleanup errors
      }
    }, 15000);
  });
});
