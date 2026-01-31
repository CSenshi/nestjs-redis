import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { firstValueFrom } from 'rxjs';
import { RedisStreamClient } from './streams-transporter.client';
import { RedisStreamServer } from './streams-transporter.server';

describe('RedisStreamsTransporter - Server Integration', () => {
  let redisClient: RedisClientType;
  let client: RedisStreamClient;
  let server: RedisStreamServer;

  const startServer = async () => {
    await new Promise<void>((resolve, reject) => {
      if (!server) {
        reject(new Error('Server not initialized'));
        return;
      }

      server.listen((err) => (err ? reject(err) : resolve()));
    });
  };

  const waitFor = async <T>(
    promiseFactory: () => Promise<T>,
    timeoutMs = 2000,
    intervalMs = 25,
  ): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const tick = async () => {
        try {
          const value = await promiseFactory();
          resolve(value);
          return;
        } catch (err) {
          if (Date.now() >= deadline) {
            reject(err);
            return;
          }
          setTimeout(tick, intervalMs);
        }
      };
      void tick();
    });
  };

  const waitForCount = async (
    getCount: () => number,
    expected: number,
    timeoutMs = 3000,
  ) =>
    waitFor(async () => {
      const count = getCount();
      if (count < expected) {
        throw new Error(`Not yet: ${count}/${expected}`);
      }
      return count;
    }, timeoutMs);

  beforeAll(async () => {
    redisClient = createClient();
    await redisClient.connect();
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  beforeEach(async () => {
    await redisClient.flushDb();
  });

  afterEach(async () => {
    if (client) {
      await client.close();
    }
    if (server) {
      await server.close();
    }
  });

  it('should invoke event handler for dispatched event', async () => {
    const received: Array<{ userId: number }> = [];
    server = new RedisStreamServer();

    server.addHandler(
      'user.created',
      async (data) => {
        received.push(data as { userId: number });
      },
      true,
    );
    await startServer();

    client = new RedisStreamClient();
    await firstValueFrom(client.emit('user.created', { userId: 123 }));

    await waitFor(async () => {
      if (received.length === 0) {
        throw new Error('Not yet');
      }
      return received[0];
    });

    expect(received).toEqual([{ userId: 123 }]);
  });

  it('should match object patterns', async () => {
    const received: Array<{ id: number }> = [];
    server = new RedisStreamServer();

    server.addHandler(
      { resource: 'user', cmd: 'created' },
      async (data) => {
        received.push(data as { id: number });
      },
      true,
    );
    await startServer();

    client = new RedisStreamClient();
    await firstValueFrom(
      client.emit({ resource: 'user', cmd: 'created' }, { id: 1 }),
    );

    await waitFor(async () => {
      if (received.length === 0) {
        throw new Error('Not yet');
      }
      return received[0];
    });

    expect(received).toEqual([{ id: 1 }]);
  });

  it('should handle many events without duplicates', async () => {
    const received = new Set<number>();
    server = new RedisStreamServer();

    server.addHandler(
      'user.bulk',
      async (data) => {
        received.add((data as { id: number }).id);
      },
      true,
    );
    await startServer();

    client = new RedisStreamClient();
    const total = 2000;
    await Promise.all(
      Array.from({ length: total }, (_, idx) =>
        firstValueFrom(client.emit('user.bulk', { id: idx + 1 })),
      ),
    );

    await waitForCount(() => received.size, total);
    expect(received.size).toBe(total);
  });

  it('should not replay events across reads', async () => {
    const received: number[] = [];
    server = new RedisStreamServer();

    server.addHandler(
      'user.unique',
      async (data) => {
        received.push((data as { id: number }).id);
      },
      true,
    );
    await startServer();

    client = new RedisStreamClient();
    const total = 2000;
    for (let i = 0; i < total; i += 1) {
      await firstValueFrom(client.emit('user.unique', { id: i + 1 }));
    }

    await waitForCount(() => received.length, total);

    const unique = new Set(received);
    expect(unique.size).toBe(total);
  });
});
