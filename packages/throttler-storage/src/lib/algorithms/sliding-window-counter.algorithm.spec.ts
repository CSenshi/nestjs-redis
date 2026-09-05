import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { createClient } from 'redis';
import { RedisThrottlerStorage } from '../throttler-storage.service.js';
import { SlidingWindowCounterAlgorithm } from './sliding-window-counter.algorithm.js';

describe('SlidingWindowCounterAlgorithm', () => {
  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });
  const storage = new RedisThrottlerStorage(
    client,
    SlidingWindowCounterAlgorithm,
  );

  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.close();
  });

  it.each([100, 200, 500, 1000, 1500])(
    'enforces the limit within a %ims window',
    async (ttlMs) => {
      const key = `sliding-counter:${randomUUID()}`;

      // Start near a real Redis window boundary so the requests share a window.
      while (true) {
        const [seconds, microseconds] = await client.sendCommand<string[]>([
          'TIME',
        ]);
        const nowMs =
          Number(seconds) * 1000 + Math.floor(Number(microseconds) / 1000);
        const elapsedMs = nowMs % ttlMs;
        if (elapsedMs < 100) break;
        await setTimeout(ttlMs - elapsedMs + 20);
      }

      const increment = () => storage.increment(key, ttlMs, 2, 2000, 'default');
      await expect(increment()).resolves.toMatchObject({
        totalHits: 1,
        isBlocked: false,
      });

      // A 1500ms window must still contain the first hit after one second.
      if (ttlMs === 1500) await setTimeout(1000);

      await expect(increment()).resolves.toMatchObject({
        totalHits: 2,
        isBlocked: false,
      });
      await expect(increment()).resolves.toMatchObject({
        totalHits: 3,
        isBlocked: true,
      });
    },
  );
});
