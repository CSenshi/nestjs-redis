import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { firstValueFrom } from 'rxjs';
import { RedisStreamClient } from './streams-transporter.client';

describe('RedisStreamsTransporter - Integration', () => {
  let redisClient: RedisClientType;
  let client: RedisStreamClient;
  const database = 1;
  const readAllEntries = async (streamName: string) =>
    redisClient.xRange(streamName, '-', '+');

  beforeAll(async () => {
    redisClient = createClient({ database });
    await redisClient.connect();
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  beforeEach(async () => {
    await redisClient.flushDb();
    client = new RedisStreamClient({ database });
    await client.connect();
  });

  afterEach(async () => {
    if (client) {
      await client.close();
    }
  });

  describe('Event Pattern (Fire-and-Forget)', () => {
    it('should send an event', async () => {
      await firstValueFrom(
        client.emit('user.created', { userId: 123, name: 'John Doe' }),
      );

      const streamName = client.getRequestPattern('user.created');
      const entries = await readAllEntries(streamName);

      expect(entries).toHaveLength(1);
      expect(entries[0].message.e).toBe('1');
      expect(entries[0].message.data).toBeDefined();

      const parsed = JSON.parse(entries[0].message.data as string);
      expect(parsed).toEqual({ userId: 123, name: 'John Doe' });
    });

    it('should accept object patterns and normalize the stream name', async () => {
      await firstValueFrom(
        client.emit({ resource: 'user', cmd: 'created' }, { id: 1 }),
      );

      const normalizedPattern = '{"cmd":"created","resource":"user"}';
      const streamName = client.getRequestPattern(normalizedPattern);
      const entries = await readAllEntries(streamName);

      expect(entries).toHaveLength(1);
      expect(entries[0].message.e).toBe('1');
      const parsed = JSON.parse(entries[0].message.data as string);
      expect(parsed).toEqual({ id: 1 });
    });

    it('should write multiple events to the same stream', async () => {
      await firstValueFrom(client.emit('user.updated', { id: 1 }));
      await firstValueFrom(client.emit('user.updated', { id: 2 }));

      const streamName = client.getRequestPattern('user.updated');
      const entries = await readAllEntries(streamName);

      expect(entries).toHaveLength(2);
      const parsed = entries.map((entry) => ({
        e: entry.message.e,
        data: JSON.parse(entry.message.data as string),
      }));
      expect(parsed).toEqual([
        { e: '1', data: { id: 1 } },
        { e: '1', data: { id: 2 } },
      ]);
    });

    it('should allow reconnecting after close', async () => {
      await firstValueFrom(client.emit('user.reconnected', { id: 1 }));
      await client.close();
      await firstValueFrom(client.emit('user.reconnected', { id: 2 }));

      const streamName = client.getRequestPattern('user.reconnected');
      const entries = await readAllEntries(streamName);

      expect(entries).toHaveLength(2);
    });

    it('should handle many events (load-ish)', async () => {
      const total = 2000;
      await Promise.all(
        Array.from({ length: total }, (_, idx) =>
          firstValueFrom(
            client.emit('user.bulk', { id: idx + 1, name: `User ${idx + 1}` }),
          ),
        ),
      );

      const streamName = client.getRequestPattern('user.bulk');
      const length = await redisClient.xLen(streamName);

      expect(length).toBe(total);
    });

    it('should emit from multiple clients to multiple streams', async () => {
      const clients = [
        new RedisStreamClient({ database }),
        new RedisStreamClient({ database }),
        new RedisStreamClient({ database }),
      ];

      try {
        const jobs: Array<Promise<unknown>> = [];
        const streams = ['multi.a', 'multi.b', 'multi.c'];
        const perStream = 2500;

        for (let i = 0; i < streams.length; i += 1) {
          for (let j = 0; j < perStream; j += 1) {
            const payload = { stream: streams[i], idx: j };
            jobs.push(
              firstValueFrom(clients[i].emit(streams[i], payload)),
              firstValueFrom(
                clients[(i + 1) % clients.length].emit(streams[i], payload),
              ),
            );
          }
        }

        await Promise.all(jobs);

        for (const stream of streams) {
          const streamName = clients[0].getRequestPattern(stream);
          const length = await redisClient.xLen(streamName);
          expect(length).toBe(perStream * 2);
        }
      } finally {
        await Promise.all(clients.map((instance) => instance.close()));
      }
    });
  });

  describe('Client Lifecycle', () => {
    it('should throw when unwrap is called before connect', () => {
      expect(() => new RedisStreamClient({ database }).unwrap()).toThrow(
        'Not initialized. Please call the "connect" method first.',
      );
    });
  });
});
