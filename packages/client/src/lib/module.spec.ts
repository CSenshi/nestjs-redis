import { Test, TestingModule } from '@nestjs/testing';
import { RedisClientModule } from './module';
import { ConnectorService } from './services/connector.service';
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

      expect(dynamicModule).toEqual({
        global: false,
        module: RedisClientModule,
        providers: [
          ConnectorService,
          {
            provide: getRedisClientInjectionToken(),
            useFactory: expect.any(Function),
          },
        ],
        exports: [getRedisClientInjectionToken(),],
      });
    });

    it('should create a global module when isGlobal is true', () => {
      const dynamicModule = RedisClientModule.forRoot({ isGlobal: true });

      expect(dynamicModule.global).toBe(true);
    });
  });

  describe('module integration', () => {
    it('should provide ConnectorService and Redis client', async () => {
      const dynamicModule = RedisClientModule.forRoot();

      module = await Test.createTestingModule({
        imports: [dynamicModule]
      }).compile();

      const connectorService = module.get<ConnectorService>(ConnectorService);
      const redisClient = module.get(getRedisClientInjectionToken(),);

      expect(connectorService).toBeDefined();
      expect(redisClient).toBeDefined();
    });

    it('should export Redis client', async () => {
      const dynamicModule = RedisClientModule.forRoot();

      module = await Test.createTestingModule({
        imports: [dynamicModule]
      }).compile();

      const redisClient = module.get(getRedisClientInjectionToken(),);
      expect(redisClient).toBeDefined();
    });
  });
});
