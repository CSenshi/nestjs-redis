import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from 'redis';
import type {
  RedisClientType,
  RedisClusterType,
  RedisSentinelType,
} from 'redis';
import { RedisHealthIndicator } from './health.indicator.js';

type RedisInstance = RedisClientType | RedisClusterType | RedisSentinelType;

// These tests require a running Redis instance
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

describe('RedisHealthIndicator Integration Tests', () => {
  let healthIndicator: RedisHealthIndicator;
  let redisClient: RedisInstance;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisHealthIndicator],
    }).compile();

    healthIndicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
  });

  describe('with Redis client', () => {
    beforeAll(async () => {
      try {
        // Redis DB map (one range per package for parallel pnpm test):
        // client=0, health-indicator=1, lock=2-3, throttler=4,
        // schedule=5-8, streams-transporter=9-11
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
          await redisClient.close();
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
        await badClient.close();
      } catch {
        // Ignore cleanup errors
      }
    }, 15000);
  });
});
