import { Test, TestingModule } from '@nestjs/testing';
import { RedisClientModule } from './module';
import { createClient, createCluster } from 'redis';
import { getRedisClientInjectionToken } from './utils';

// Mock redis module
jest.mock('redis', () => ({
  createClient: jest.fn(),
  createCluster: jest.fn(),
}));

describe('RedisClientModule', () => {
  let module: TestingModule;
  const mockRedisClient = {
    connect: jest.fn(),
    quit: jest.fn(),
  };
  const mockRedisCluster = {
    connect: jest.fn(),
    quit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockRedisClient);
    (createCluster as jest.Mock).mockReturnValue(mockRedisCluster);
  });

  describe('forRoot', () => {
    it('should create a module with default configuration', () => {
      const dynamicModule = RedisClientModule.forRoot();

      expect(dynamicModule.providers).toContainEqual({
        provide: getRedisClientInjectionToken(),
        useFactory: expect.any(Function),
      });
    });

    it('should create a global module when isGlobal is true', () => {
      const dynamicModule = RedisClientModule.forRoot({ isGlobal: true });

      expect(dynamicModule.global).toBe(true);
    });
  });

  describe('module integration', () => {
    it('should provide Redis client', async () => {
      const dynamicModule = RedisClientModule.forRoot();

      module = await Test.createTestingModule({
        imports: [dynamicModule],
      }).compile();

      expect(module.get(getRedisClientInjectionToken())).toBeDefined();
    });

    it('should export Redis client', async () => {
      const dynamicModule = RedisClientModule.forRoot();

      module = await Test.createTestingModule({
        imports: [dynamicModule],
      }).compile();

      const redisClient = module.get(getRedisClientInjectionToken());
      expect(redisClient).toBeDefined();
    });
  });

  describe('multi-connection', () => {
    it('should provide multiple named Redis clients', async () => {
      const dynamicModule = RedisClientModule.forRoot({
        connections: [
          { type: 'client', options: { url: 'redis://localhost:6379' } },
          {
            connection: 'redis-conn-2',
            type: 'client',
            options: { url: 'redis://localhost:6379' },
          },
        ],
      });
      const module = await Test.createTestingModule({
        imports: [dynamicModule],
      }).compile();
      const client1 = module.get(getRedisClientInjectionToken());
      const client2 = module.get(getRedisClientInjectionToken('redis-conn-2'));
      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
      expect(() =>
        module.get(getRedisClientInjectionToken('redis-conn-cluster-3'))
      ).toThrow();
    });
  });
});
