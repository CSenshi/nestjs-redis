import { Injectable } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { Redlock } from './redlock.decorator';
import { RedlockModule } from './redlock.module';
import { RedlockService } from './redlock.service';

// Mock RedlockService
const mockRedlockService = {
  withLock: jest.fn().mockImplementation((keys, ttl, callback) => callback()),
};

describe('@Redlock Decorator Validations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should preserve function name', () => {
    class TestService {
      @Redlock(['testKey'], 200)
      async testMethod() {
        return 'locked';
      }
    }
    const service = new TestService();
    expect(service.testMethod.name).toBe('testMethod');
  });

  it('should preserve function length (arity)', () => {
    class TestService {
      @Redlock(['testKey'], 200)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async testMethod(_param1: string, _param2: number) {
        return 'locked';
      }
    }
    const service = new TestService();
    expect(service.testMethod.length).toBe(2);
  });

  it('should handle synchronous methods', () => {
    class TestService {
      @Redlock(['testKey'], 200)
      syncMethod() {
        return 'sync result';
      }
    }
    const service = new TestService();
    expect(service.syncMethod).toBeDefined();
  });

  it('should handle methods with return values', async () => {
    class TestService {
      constructor() {
        // Mock the injected service
        (this as Record<string, unknown>)[RedlockService.name] =
          mockRedlockService;
      }

      @Redlock(['testKey'], 200)
      async getValue() {
        return 42;
      }
    }

    const service = new TestService();
    const result = await service.getValue();
    expect(result).toBe(42);
    expect(mockRedlockService.withLock).toHaveBeenCalledWith(
      ['testKey'],
      200,
      expect.any(Function),
    );
  });

  it('should handle methods that throw errors', async () => {
    class TestService {
      constructor() {
        (this as Record<string, unknown>)[RedlockService.name] =
          mockRedlockService;
      }

      @Redlock(['testKey'], 200)
      async throwError() {
        throw new Error('test error');
      }
    }

    mockRedlockService.withLock.mockImplementation((keys, ttl, callback) =>
      callback(),
    );

    const service = new TestService();
    await expect(service.throwError()).rejects.toThrow('test error');
  });

  it('should throw error for non-method properties', () => {
    expect(() => {
      class TestService {
        // @ts-expect-error This is not a method
        @Redlock(['testKey'], 200)
        testProperty = 'not a method';
      }
      // This line prevents "unused variable" warning
      new TestService();
    }).toThrow('@Redlock can only be applied to methods');
  });

  // 6. Metadata preservation tests
  it('should preserve custom properties on methods', () => {
    class TestService {
      constructor() {
        (this as Record<string, unknown>)[RedlockService.name] =
          mockRedlockService;
      }

      @Redlock(['testKey'], 200)
      async testMethod() {
        return 'result';
      }
    }

    // @ts-expect-error Custom property for testing
    TestService.prototype.testMethod.customProp = 'custom value';

    const service = new TestService();
    // @ts-expect-error Accessing custom property
    expect(service.testMethod.customProp).toBe('custom value');
  });

  // 7. TypeScript type safety (compile-time test)
  it('should maintain type safety', () => {
    class TestService {
      constructor() {
        (this as Record<string, unknown>)[RedlockService.name] =
          mockRedlockService;
      }

      @Redlock(['testKey'], 200)
      async typedMethod(str: string, num: number): Promise<string> {
        return `${str}-${num}`;
      }
    }

    const service = new TestService();
    // This should compile without type errors
    const result = service.typedMethod('test', 42);
    expect(result).toBeInstanceOf(Promise);
  });

  // 8. Performance: async vs sync method handling
  it('should handle synchronous methods correctly', async () => {
    class TestService {
      constructor() {
        (this as Record<string, unknown>)[RedlockService.name] =
          mockRedlockService;
      }

      @Redlock(['testKey'], 200)
      syncMethod(value: number): number {
        return value * 2;
      }
    }

    const service = new TestService();
    const result = await service.syncMethod(5);
    expect(result).toBe(10);
    expect(mockRedlockService.withLock).toHaveBeenCalled();
  });

  it('should detect async methods correctly', async () => {
    class TestService {
      constructor() {
        (this as Record<string, unknown>)[RedlockService.name] =
          mockRedlockService;
      }

      @Redlock(['testKey'], 200)
      async asyncMethod(value: number): Promise<number> {
        return Promise.resolve(value * 3);
      }
    }

    const service = new TestService();
    const result = await service.asyncMethod(4);
    expect(result).toBe(12);
    expect(mockRedlockService.withLock).toHaveBeenCalled();
  });

  // 9. Dependency injection edge cases
  it('should throw error when RedlockService is not injected', async () => {
    class TestService {
      @Redlock(['testKey'], 200)
      async testMethod() {
        return 'result';
      }
    }

    const service = new TestService();
    await expect(service.testMethod()).rejects.toThrow(
      'RedlockService not found. Ensure the RedlockModule is imported in the same module as the class using @Redlock or isGlobal is true',
    );
  });

  it('should handle null/undefined RedlockService', async () => {
    class TestService {
      constructor() {
        (this as Record<string, unknown>)[RedlockService.name] = null;
      }

      @Redlock(['testKey'], 200)
      async testMethod() {
        return 'result';
      }
    }

    const service = new TestService();
    await expect(service.testMethod()).rejects.toThrow(
      'RedlockService not found',
    );
  });

  it('should preserve method toString behavior', () => {
    class TestService {
      @Redlock(['testKey'], 200)
      async testMethod() {
        return 'locked';
      }
    }

    const service = new TestService();
    const methodString = service.testMethod.toString();
    expect(methodString).toContain('function');
    expect(service.testMethod.name).toBe('testMethod');
  });
});

describe('@Redlock Decorator', () => {
  let redisClients: RedisClientType[];

  beforeAll(async () => {
    redisClients = [
      createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        database: 3,
      }),
    ];

    await Promise.all(redisClients.map((client) => client.connect()));
  });

  afterAll(async () => {
    // Close all Redis clients
    for (const client of redisClients) {
      await client.quit();
    }
  });

  it('should preserve function name', async () => {
    @Injectable()
    class TestService {
      count = 0;

      @Redlock(['testKey'], 200)
      async incr() {
        await new Promise((resolve) => setTimeout(resolve, 100));
        this.count++;
      }
    }
    const testModule: TestingModule = await Test.createTestingModule({
      imports: [RedlockModule.forRoot({ clients: redisClients })],
      providers: [TestService],
    }).compile();

    await testModule.init();

    const service = testModule.get<TestService>(TestService);

    expect(service.count).toBe(0);
    const startTime = Date.now();
    await Promise.all([service.incr(), service.incr()]);
    const endTime = Date.now();
    expect(endTime - startTime).toBeGreaterThanOrEqual(200); // Ensure that the locks are acquired sequentially (not in parallel)
    expect(service.count).toBe(2);
  });
});
