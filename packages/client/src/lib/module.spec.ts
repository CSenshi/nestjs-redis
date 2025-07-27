import { Test, TestingModule } from '@nestjs/testing';
import { RedisClientModule } from './module';
import { createClient, createCluster, createSentinel } from 'redis';
import { RedisToken } from './tokens';

// Mock redis module
jest.mock('redis', () => ({
  createClient: jest.fn(),
  createCluster: jest.fn(),
  createSentinel: jest.fn(),
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
  const mockRedisSentinel = {
    connect: jest.fn(),
    quit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockRedisClient);
    (createCluster as jest.Mock).mockReturnValue(mockRedisCluster);
    (createSentinel as jest.Mock).mockReturnValue(mockRedisSentinel);
  });

  describe('forRoot - single connection configuration', () => {
    it('should create a module with default configuration', () => {
      const dynamicModule = RedisClientModule.forRoot();

      expect(dynamicModule.providers).toHaveLength(1);
      expect(dynamicModule.providers?.[0]).toEqual({
        provide: RedisToken(),
        useFactory: expect.any(Function),
      });
      expect(dynamicModule.exports).toEqual([RedisToken()]);
    });

    it('should create a global module when isGlobal is true', () => {
      const dynamicModule = RedisClientModule.forRoot({ isGlobal: true });

      expect(dynamicModule.global).toBe(true);
    });

    it('should create a non-global module by default', () => {
      const dynamicModule = RedisClientModule.forRoot();

      expect(dynamicModule.global).toBe(false);
    });

    it('should create a named connection', () => {
      const dynamicModule = RedisClientModule.forRoot({
        connectionName: 'cache',
      });

      expect(dynamicModule.providers?.[0]).toEqual({
        provide: RedisToken('cache'),
        useFactory: expect.any(Function),
      });
      expect(dynamicModule.exports).toEqual([RedisToken('cache')]);
    });

    it('should create client type connection by default', () => {
      const dynamicModule = RedisClientModule.forRoot();
      const provider = dynamicModule.providers?.[0] as any;
      const redisInstance = provider.useFactory();

      expect(createClient).toHaveBeenCalledWith();
      expect(redisInstance).toBe(mockRedisClient);
    });

    it('should create client type connection with options', () => {
      const options = { url: 'redis://localhost:6379' };
      const dynamicModule = RedisClientModule.forRoot({
        type: 'client',
        options,
      });
      const provider = dynamicModule.providers?.[0] as any;
      provider.useFactory();

      expect(createClient).toHaveBeenCalledWith(options);
    });

    it('should create cluster type connection', () => {
      const options = { rootNodes: [{ url: 'redis://localhost:6379' }] };
      const dynamicModule = RedisClientModule.forRoot({
        type: 'cluster',
        options,
      });
      const provider = dynamicModule.providers?.[0] as any;
      provider.useFactory();

      expect(createCluster).toHaveBeenCalledWith(options);
    });

    it('should create sentinel type connection', () => {
      const options = {
        sentinelRootNodes: [{ host: 'localhost', port: 26379 }],
        name: 'mymaster',
      };
      const dynamicModule = RedisClientModule.forRoot({
        type: 'sentinel',
        options,
      });
      const provider = dynamicModule.providers?.[0] as any;
      provider.useFactory();

      expect(createSentinel).toHaveBeenCalledWith(options);
    });
  });

  describe('module integration', () => {
    it('should provide Redis client with default connection', async () => {
      const dynamicModule = RedisClientModule.forRoot();

      module = await Test.createTestingModule({
        imports: [dynamicModule],
      }).compile();

      expect(module.get(RedisToken())).toBeDefined();
    });

    it('should provide Redis client with named connection', async () => {
      const dynamicModule = RedisClientModule.forRoot({
        connectionName: 'cache',
      });

      module = await Test.createTestingModule({
        imports: [dynamicModule],
      }).compile();

      expect(module.get(RedisToken('cache'))).toBeDefined();
    });

    it('should export Redis client', async () => {
      const dynamicModule = RedisClientModule.forRoot();

      module = await Test.createTestingModule({
        imports: [dynamicModule],
      }).compile();

      const redisClient = module.get(RedisToken());
      expect(redisClient).toBeDefined();
    });
  });

  describe('configuration validation', () => {
    it('should handle undefined configuration', () => {
      const dynamicModule = RedisClientModule.forRoot(undefined);
      const provider = dynamicModule.providers?.[0] as any;
      provider.useFactory();

      expect(createClient).toHaveBeenCalledWith();
    });

    it('should handle empty configuration', () => {
      const dynamicModule = RedisClientModule.forRoot({});
      const provider = dynamicModule.providers?.[0] as any;
      provider.useFactory();

      expect(createClient).toHaveBeenCalledWith(undefined);
    });
  });

  describe('lifecycle management', () => {
    it('should implement OnApplicationBootstrap', () => {
      const module = new RedisClientModule({} as any);
      expect(typeof module.onApplicationBootstrap).toBe('function');
    });

    it('should implement OnApplicationShutdown', () => {
      const module = new RedisClientModule({} as any);
      expect(typeof module.onApplicationShutdown).toBe('function');
    });
  });

  describe('token generation', () => {
    it('should generate correct token for default connection', () => {
      expect(RedisToken()).toBe('REDIS_CLIENT');
    });

    it('should generate correct token for named connection', () => {
      expect(RedisToken('cache')).toBe('REDIS_CLIENT_CACHE');
    });

    it('should generate correct token with uppercase conversion', () => {
      expect(RedisToken('my-cache')).toBe('REDIS_CLIENT_MY-CACHE');
    });
  });
});