import { Injectable } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketGateway } from '@nestjs/websockets';
import { RedisModule } from '@nestjs-redis/client';
import {
  RedisAdapterAlreadySetUpException,
  RedisClientNotFoundException,
} from './exceptions';
import { setupRedisAdapter } from './setup-redis-adapter';

// Integration tests require a running Redis instance
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

@WebSocketGateway({})
@Injectable()
export class EventsGateway {}

describe('setupRedisAdapter Integration Tests', () => {
  const moduleConfig = {
    imports: [
      RedisModule.forRoot({
        type: 'client',
        options: { url: REDIS_URL },
      }),
      RedisModule.forRoot({
        connectionName: 'cache',
        type: 'client',
        options: { url: REDIS_URL },
      }),
    ],
    providers: [EventsGateway],
  };
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule(moduleConfig).compile();
  });

  it('should setup Redis adapter successfully with default and named connections', async () => {
    // Test 1: Default connection using RedisModule
    const app = module.createNestApplication();
    await app.init();

    // Should work with default connection
    await expect(setupRedisAdapter(app)).resolves.not.toThrow();

    await app.close();

    // Test 2: Named connection using RedisModule
    const appWithNamedConnection = (
      await Test.createTestingModule(moduleConfig).compile()
    ).createNestApplication();
    await appWithNamedConnection.init();

    // Should work with named connection
    await expect(
      setupRedisAdapter(appWithNamedConnection, 'cache'),
    ).resolves.not.toThrow();

    await appWithNamedConnection.close();
  });

  it('should throw RedisClientNotFoundException when Redis client is not configured', async () => {
    // Test 2: Named connection not configured
    const app = module.createNestApplication();
    await app.init();

    // Should throw an error when trying to setup with a non-existent named connection
    await expect(
      setupRedisAdapter(app, 'nonExistentConnection'),
    ).rejects.toThrow(RedisClientNotFoundException);

    await app.close();
  });

  it('should fail when trying to set adapter multiple times', async () => {
    const app = module.createNestApplication();
    await app.init();

    // First setup should succeed
    await expect(setupRedisAdapter(app)).resolves.not.toThrow();

    // Second setup should throw an error
    await expect(setupRedisAdapter(app, 'cache')).rejects.toThrow(
      RedisAdapterAlreadySetUpException,
    );

    await app.close();
  });

  it('should handle multiple applications independently', async () => {
    const app1 = module.createNestApplication();
    const app2 = (
      await Test.createTestingModule(moduleConfig).compile()
    ).createNestApplication();

    await app1.init();
    await app2.init();

    // Setup Redis adapter for first app
    await expect(setupRedisAdapter(app1)).resolves.not.toThrow();

    // Setup Redis adapter for second app
    await expect(setupRedisAdapter(app2, 'cache')).resolves.not.toThrow();

    // Ensure both apps can close without issues
    await app1.close();
    await app2.close();
  });
});
