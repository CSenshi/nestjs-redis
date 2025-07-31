import { Test, TestingModule } from '@nestjs/testing';
import { RedisModule } from './module';
import { RedisToken } from './tokens';
import { Redis, RedisModuleOptions } from './types';
import { ConfigModule, ConfigService } from '@nestjs/config';

describe('RedisModule Integration forRoot', () => {
  let module: TestingModule;
  let redisClient: Redis;

  // Test Redis configuration - using default Redis instance
  const testRedisConfig: RedisModuleOptions = {
    type: 'client',
    options: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
  };

  beforeEach(async () => {
    // Create the testing module with real Redis connection
    module = await Test.createTestingModule({
      imports: [RedisModule.forRoot(testRedisConfig)],
    }).compile();
    await module.init();

    redisClient = module.get<Redis>(RedisToken());
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Real Redis Connection', () => {
    it('should connect to Redis successfully', async () => {
      // The connection should be established during module initialization
      expect(redisClient).toBeDefined();
    });

    it('should perform basic Redis operations', async () => {
      const testKey = 'test:integration:key';
      const testValue = 'test-value-' + Date.now();

      // Set a value
      await redisClient.set(testKey, testValue);

      // Get the value
      const retrievedValue = await redisClient.get(testKey);
      expect(retrievedValue).toBe(testValue);

      // Delete the key
      await redisClient.del(testKey);

      // Verify deletion
      const deletedValue = await redisClient.get(testKey);
      expect(deletedValue).toBeNull();
    });

    it('should handle multiple operations', async () => {
      const testKey1 = 'test:integration:key1';
      const testKey2 = 'test:integration:key2';
      const testValue1 = 'value1-' + Date.now();
      const testValue2 = 'value2-' + Date.now();

      // Set multiple values
      await Promise.all([
        redisClient.set(testKey1, testValue1),
        redisClient.set(testKey2, testValue2),
      ]);

      // Get multiple values
      const [value1, value2] = await Promise.all([
        redisClient.get(testKey1),
        redisClient.get(testKey2),
      ]);

      expect(value1).toBe(testValue1);
      expect(value2).toBe(testValue2);

      // Clean up
      await Promise.all([redisClient.del(testKey1), redisClient.del(testKey2)]);
    });

    it('should handle hash operations', async () => {
      const testHash = 'test:integration:hash';
      const testField = 'field1';
      const testValue = 'hash-value-' + Date.now();

      // Set hash field
      await redisClient.hSet(testHash, testField, testValue);

      // Get hash field
      const retrievedValue = await redisClient.hGet(testHash, testField);
      expect(retrievedValue).toBe(testValue);

      // Get all hash fields
      const allFields = await redisClient.hGetAll(testHash);
      expect(allFields[testField]).toBe(testValue);

      // Delete hash
      await redisClient.del(testHash);
    });

    it('should handle list operations', async () => {
      const testList = 'test:integration:list';
      const testValues = ['value1', 'value2', 'value3'];

      // Push values to list
      await redisClient.lPush(testList, testValues);

      // Get list length
      const length = await redisClient.lLen(testList);
      expect(length).toBe(testValues.length);

      // Get list elements
      const elements = await redisClient.lRange(testList, 0, -1);
      expect(elements).toEqual(testValues.reverse()); // lPush adds to head

      // Pop from list
      const popped = await redisClient.lPop(testList);
      expect(popped).toBe('value3');

      // Clean up
      await redisClient.del(testList);
    });

    it('should handle set operations', async () => {
      const testSet = 'test:integration:set';
      const testValues = ['member1', 'member2', 'member3'];

      // Add members to set
      await redisClient.sAdd(testSet, testValues);

      // Get set members
      const members = await redisClient.sMembers(testSet);
      expect(members).toHaveLength(testValues.length);
      expect(members).toEqual(expect.arrayContaining(testValues));

      // Check if member exists
      const exists = await redisClient.sIsMember(testSet, 'member1');
      expect(exists).toBe(1);

      // Remove member
      await redisClient.sRem(testSet, 'member1');
      const existsAfter = await redisClient.sIsMember(testSet, 'member1');
      expect(existsAfter).toBe(0);

      // Clean up
      await redisClient.del(testSet);
    });

    it('should handle key expiration', async () => {
      const testKey = 'test:integration:expire';
      const testValue = 'expire-value';

      // Set key with expiration
      await redisClient.set(testKey, testValue, { EX: 1 }); // 1 second expiration

      // Check if key exists
      const exists = await redisClient.exists(testKey);
      expect(exists).toBe(1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Check if key expired
      const existsAfter = await redisClient.exists(testKey);
      expect(existsAfter).toBe(0);
    });

    it('should handle connection lifecycle', async () => {
      // The connection should be active
      const ping = await redisClient.ping();
      expect(ping).toBe('PONG');
    });
  });

  describe('Module Configuration', () => {
    it('should work with default configuration', async () => {
      const defaultModule = await Test.createTestingModule({
        imports: [RedisModule.forRoot()],
      }).compile();
      await defaultModule.init();

      const defaultRedisClient = defaultModule.get<Redis>(RedisToken());

      // Test basic operation
      const ping = await defaultRedisClient.ping();
      expect(ping).toBe('PONG');

      await defaultModule.close();
    });

    it('should work with custom URL configuration', async () => {
      const customConfig: RedisModuleOptions = {
        type: 'client',
        options: {
          url: process.env.REDIS_URL || 'redis://localhost:6379',
          socket: {
            connectTimeout: 5000,
          },
        },
      };

      const customModule = await Test.createTestingModule({
        imports: [RedisModule.forRoot(customConfig)],
      }).compile();
      await customModule.init();

      const customRedisClient = customModule.get<Redis>(RedisToken());

      // Test basic operation
      const ping = await customRedisClient.ping();
      expect(ping).toBe('PONG');

      await customModule.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid Redis operations gracefully', async () => {
      // Try to get a non-existent key
      const nonExistentValue = await redisClient.get('non:existent:key');
      expect(nonExistentValue).toBeNull();

      // Try to increment a non-numeric value
      await redisClient.set('test:string', 'not-a-number');
      await expect(redisClient.incr('test:string')).rejects.toThrow();

      // Clean up
      await redisClient.del('test:string');
    });
  });

  describe('Performance', () => {
    it('should handle bulk operations efficiently', async () => {
      const testKeys = Array.from(
        { length: 100 },
        (_, i) => `test:bulk:key${i}`
      );
      const testValues = testKeys.map((_, i) => `value${i}`);

      // Bulk set
      const setPromises = testKeys.map((key, index) =>
        redisClient.set(key, testValues[index])
      );
      await Promise.all(setPromises);

      // Bulk get
      const getPromises = testKeys.map((key) => redisClient.get(key));
      const retrievedValues = await Promise.all(getPromises);

      expect(retrievedValues).toHaveLength(testKeys.length);
      expect(retrievedValues).toEqual(testValues);

      // Bulk delete
      const delPromises = testKeys.map((key) => redisClient.del(key));
      await Promise.all(delPromises);
    });
  });
});

describe('RedisModule Integration forRootAsync', () => {
  let module: TestingModule;
  let redisClient: Redis;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        RedisModule.forRootAsync({
          useFactory: () => ({
            type: 'client',
            options: {
              url: process.env.REDIS_URL || 'redis://localhost:6379',
            },
          }),
        }),
      ],
    }).compile();

    await module.init();

    redisClient = module.get<Redis>(RedisToken());
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Real Redis Connection', () => {
    it('should connect to Redis successfully', async () => {
      // The connection should be established during module initialization
      expect(redisClient).toBeDefined();
    });

    it('should perform basic Redis operations', async () => {
      const testKey = 'test:async-integration:key';
      const testValue = 'test-value-' + Date.now();

      // Set a value
      await redisClient.set(testKey, testValue);

      // Get the value
      const retrievedValue = await redisClient.get(testKey);
      expect(retrievedValue).toBe(testValue);

      // Delete the key
      await redisClient.del(testKey);

      // Verify deletion
      const deletedValue = await redisClient.get(testKey);
      expect(deletedValue).toBeNull();
    });
  });

  describe('Module Configuration', () => {
    it('should work with injected configModule', async () => {
      const defaultModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
          }),
          RedisModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
              type: 'client',
              isGlobal: true,
              options: {
                url:
                  configService.get<string>('REDIS_HOST') ??
                  'redis://localhost:6379',
              },
            }),
          }),
        ],
      }).compile();
      await defaultModule.init();

      const defaultRedisClient = defaultModule.get<Redis>(RedisToken());

      // Test basic operation
      const ping = await defaultRedisClient.ping();
      expect(ping).toBe('PONG');

      await defaultModule.close();
    });
  });
});

describe('Multi-connection Integration', () => {
  let module: TestingModule;
  let redisClient1: Redis;
  let redisClient2: Redis;

  beforeAll(async () => {
    // Create module with multiple forRoot calls
    module = await Test.createTestingModule({
      imports: [
        // Default connection
        RedisModule.forRoot({
          type: 'client',
          options: {
            url: process.env.REDIS_URL || 'redis://localhost:6379',
          },
        }),
        // Named connection
        RedisModule.forRoot({
          connectionName: 'cache',
          type: 'client',
          options: {
            url: process.env.REDIS_URL || 'redis://localhost:6379',
          },
        }),
      ],
    }).compile();
    await module.init();
    redisClient1 = module.get<Redis>(RedisToken());
    redisClient2 = module.get<Redis>(RedisToken('cache'));
  });

  afterAll(async () => {
    await module.close();
  });

  it('should connect and operate with both clients', async () => {
    const key1 = 'multi:conn:key1';
    const key2 = 'multi:conn:key2';
    await redisClient1.set(key1, 'value1');
    await redisClient2.set(key2, 'value2');
    const v1 = await redisClient1.get(key1);
    const v2 = await redisClient2.get(key2);
    expect(v1).toBe('value1');
    expect(v2).toBe('value2');
    await redisClient1.del(key1);
    await redisClient2.del(key2);
  });

  it('should isolate connections properly', async () => {
    const testKey = 'isolation:test:key';

    // Set value in first connection
    await redisClient1.set(testKey, 'value1');

    // Set different value in second connection (same Redis instance, so should overwrite)
    await redisClient2.set(testKey, 'value2');

    // Both connections should see the same value since they connect to the same Redis instance
    const value1 = await redisClient1.get(testKey);
    const value2 = await redisClient2.get(testKey);

    expect(value1).toBe('value2');
    expect(value2).toBe('value2');

    // Clean up
    await redisClient1.del(testKey);
  });

  it('should handle connection lifecycle independently', async () => {
    // Both connections should be able to ping
    const ping1 = await redisClient1.ping();
    const ping2 = await redisClient2.ping();

    expect(ping1).toBe('PONG');
    expect(ping2).toBe('PONG');
  });
});
