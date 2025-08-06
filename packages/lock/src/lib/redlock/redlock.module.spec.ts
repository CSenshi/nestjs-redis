import { Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisClientType, createClient } from 'redis';
import { RedlockModule } from './redlock.module';
import { RedlockService } from './redlock.service';

describe('RedisModule Integration forRoot', () => {
  let module: TestingModule;
  let redisClients: RedisClientType[];

  beforeAll(async () => {
    redisClients = [
      createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      }),
    ];

    await Promise.all(redisClients.map((client) => client.connect()));
  });

  afterAll(async () => {
    await Promise.all(redisClients.map((client) => client.quit()));
  });

  describe('RedlockModule.forRoot', () => {
    it('should create a dynamic module with Redis clients', async () => {
      const module = await Test.createTestingModule({
        imports: [
          RedlockModule.forRoot({
            clients: redisClients,
          }),
        ],
      }).compile();
      await module.init();

      expect(module).toBeDefined();
      expect(module.get(RedlockService)).toBeDefined();
    });

    it('should provide RedlockService with Redis clients', async () => {
      const module = await Test.createTestingModule({
        imports: [
          RedlockModule.forRoot({
            clients: redisClients,
          }),
        ],
      }).compile();
      await module.init();

      const redlockService = module.get(RedlockService);
      expect(redlockService).toBeDefined();
      expect(redlockService).toBeInstanceOf(RedlockService);
    });

    @Module({
      providers: [
        {
          inject: [RedlockService],
          provide: 'TestService',
          useFactory: () => {
            return {};
          },
        },
      ],
    })
    class TestModule {}

    it('isGlobal - should fail when false', async () => {
      const appModule = Test.createTestingModule({
        imports: [
          RedlockModule.forRoot({
            clients: redisClients,
            isGlobal: false,
          }),
          TestModule,
        ],
      });

      await expect(appModule.compile()).rejects.toThrow();
    });

    it('isGlobal - should resolve when true', async () => {
      const appModule = Test.createTestingModule({
        imports: [
          RedlockModule.forRoot({
            clients: redisClients,
            isGlobal: true,
          }),
          TestModule,
        ],
      });

      appModule.compile();
    });
  });

  describe('RedlockModule.forRootAsync', () => {
    it('should provide RedlockService with Redis clients', async () => {
      const module = await Test.createTestingModule({
        imports: [
          RedlockModule.forRootAsync({
            useFactory: () => ({
              clients: redisClients,
            }),
          }),
        ],
      }).compile();
      await module.init();
    });

    it('Should get the RedlockService', async () => {
      const module = await Test.createTestingModule({
        imports: [
          RedlockModule.forRootAsync({
            useFactory: () => ({
              clients: redisClients,
            }),
          }),
        ],
      }).compile();
      await module.init();

      expect(module.get(RedlockService)).toBeDefined();
    });
  });

  describe('RedLockService', () => {
    beforeEach(async () => {
      // Create the testing module with real Redis connection
      await Promise.all(redisClients.map((client) => client.flushDb()));
      module = await Test.createTestingModule({
        imports: [
          RedlockModule.forRoot({
            clients: redisClients,
          }),
        ],
      }).compile();

      await module.init();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should connect to Redis and provide RedlockService', () => {
      const redlockService = module.get(RedlockService);
      expect(redlockService).toBeDefined();
      expect(redlockService).toBeInstanceOf(RedlockService);
    });

    it('should acquire a lock using RedlockService', async () => {
      const redlockService = module.get(RedlockService);
      const lock = await redlockService.acquire('test-lock', 1000);
      expect(lock).toBeDefined();
      if (!lock) throw new Error('Lock acquisition failed');

      await lock.release();
    });

    it('should release a lock using RedlockService', async () => {
      const redlockService = module.get(RedlockService);

      const res = await redlockService.withLock('test-lock', 100, async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'lock acquired';
      });
      expect(res).toBe('lock acquired');
      const lock = await redlockService.acquire('test-lock', 1000);
      expect(lock).toBeDefined();
      if (!lock) throw new Error('Lock acquisition failed');
    });
  });
});
