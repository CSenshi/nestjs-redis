import { Test, TestingModule } from '@nestjs/testing';
import { HealthIndicatorService } from '@nestjs/terminus';
import { RedisHealthIndicator } from './health.indicator';
import { Redis } from './interfaces';

describe('RedisHealthIndicator', () => {
  let healthIndicator: RedisHealthIndicator;
  let mockRedisClient: jest.Mocked<Redis>;
  let mockIndicator: { up: jest.Mock; down: jest.Mock };

  beforeEach(async () => {
    mockRedisClient = {
      ping: jest.fn(),
      isReady: true,
    } as any;

    mockIndicator = {
      up: jest.fn().mockReturnValue({ redis: { status: 'up' } }),
      down: jest.fn().mockReturnValue({ redis: { status: 'down' } }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        {
          provide: HealthIndicatorService,
          useValue: {
            check: jest.fn().mockReturnValue(mockIndicator),
          },
        },
      ],
    }).compile();

    healthIndicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isHealthy', () => {
    it('should return up status when Redis responds with PONG', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await healthIndicator.isHealthy('redis', {
        client: mockRedisClient,
      });

      expect(mockIndicator.up).toHaveBeenCalled();
      expect(result.redis.status).toBe('up');
      expect(mockRedisClient.ping).toHaveBeenCalledTimes(1);
    });

    it('should return down status when Redis ping fails', async () => {
      mockRedisClient.ping.mockResolvedValue('FAIL');

      const result = await healthIndicator.isHealthy('redis', {
        client: mockRedisClient,
      });

      expect(mockIndicator.down).toHaveBeenCalledWith({
        message: 'Redis ping failed: FAIL',
      });
      expect(result.redis.status).toBe('down');
    });

    it('should handle Redis connection errors', async () => {
      const error = new Error('Connection refused');
      mockRedisClient.ping.mockRejectedValue(error);

      const result = await healthIndicator.isHealthy('redis', {
        client: mockRedisClient,
      });

      expect(mockIndicator.down).toHaveBeenCalledWith({
        message: 'Connection refused',
      });
      expect(result.redis.status).toBe('down');
    });

    it('should handle non-Error exceptions', async () => {
      mockRedisClient.ping.mockRejectedValue('String error');

      const result = await healthIndicator.isHealthy('redis', {
        client: mockRedisClient,
      });

      expect(mockIndicator.down).toHaveBeenCalledWith({
        message: 'Redis connection failed',
      });
      expect(result.redis.status).toBe('down');
    });
  });
});