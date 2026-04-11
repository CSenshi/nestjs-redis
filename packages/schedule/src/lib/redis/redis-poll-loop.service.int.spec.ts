import { Test } from '@nestjs/testing';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { SCHEDULE_MODULE_OPTIONS } from '../schedule.constants.js';
import { RedisJobStore } from './redis-job-store.service.js';
import { RedisPollLoop } from './redis-poll-loop.service.js';

const makeStore = async (client: RedisClientType, keyPrefix = 'test') => {
  const module = await Test.createTestingModule({
    providers: [
      RedisJobStore,
      {
        provide: SCHEDULE_MODULE_OPTIONS,
        useValue: { client, keyPrefix },
      },
    ],
  }).compile();
  return module.get(RedisJobStore);
};

describe('RedisPollLoop (integration)', () => {
  let client: RedisClientType;

  beforeAll(async () => {
    client = createClient({
      url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
      database: 4,
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.quit();
  });

  beforeEach(async () => {
    await client.flushDb();
  });

  it('fires handler once per second over 3 s (single instance)', async () => {
    const store = await makeStore(client);
    const loop = new RedisPollLoop(store);
    let callCount = 0;

    const now = await store.getTime();
    await store.registerJob('job1', '* * * * * *', now - 10);

    loop.registerJob({
      name: 'job1',
      expression: '* * * * * *',
      threshold: 250,
      handler: () => {
        callCount++;
      },
    });
    loop.start();

    await new Promise((r) => setTimeout(r, 2_500));
    await loop.stop(10);

    // 2.5 s window with per-second ticks: 3 or 4 depending on wall-clock alignment
    expect(callCount).toBeGreaterThanOrEqual(3);
    expect(callCount).toBeLessThanOrEqual(4);
  }, 10_000);

  it('fires two distinct jobs on their own independent schedules', async () => {
    const store = await makeStore(client);
    const loop = new RedisPollLoop(store);
    let job1Count = 0;
    let job2Count = 0;

    const now = await store.getTime();
    await store.registerJob('job1', '* * * * * *', now - 10);
    await store.registerJob('job2', '*/2 * * * * *', now - 10);

    loop.registerJob({
      name: 'job1',
      expression: '* * * * * *',
      threshold: 250,
      handler: () => {
        job1Count++;
      },
    });
    loop.registerJob({
      name: 'job2',
      expression: '*/2 * * * * *',
      threshold: 250,
      handler: () => {
        job2Count++;
      },
    });
    loop.start();

    await new Promise((r) => setTimeout(r, 5_500));
    await loop.stop(10);

    // job1 fires every second - expect ~5 ticks in 5.5 s
    expect(job1Count).toBeGreaterThanOrEqual(6);
    expect(job1Count).toBeLessThanOrEqual(7);

    // job2 fires every 2 seconds - expect 2-4 ticks in 5.5 s depending on wall-clock alignment
    expect(job2Count).toBeGreaterThanOrEqual(2);
    expect(job2Count).toBeLessThanOrEqual(4);
  }, 15_000);

  it('fires handler exactly once per tick across 5 competing instances', async () => {
    const stores = await Promise.all([
      makeStore(client),
      makeStore(client),
      makeStore(client),
      makeStore(client),
      makeStore(client),
    ]);
    const loops = stores.map((s) => new RedisPollLoop(s));

    let callCount = 0;

    const now = await stores[0].getTime();
    await Promise.all(
      stores.map((s) => s.registerJob('job1', '* * * * * *', now - 10)),
    );

    const entry = {
      name: 'job1',
      expression: '* * * * * *',
      threshold: 250,
      handler: () => {
        callCount++;
      },
    };
    loops.forEach((l) => l.registerJob(entry));
    loops.forEach((l) => l.start());

    await new Promise((r) => setTimeout(r, 5_500));
    await Promise.all(loops.map((l) => l.stop(10)));

    // Without mutual exclusion this would be 15–18 (3 loops × 5–6 ticks).
    // The Lua claim guarantees exactly one winner per tick.
    expect(callCount).toBeGreaterThanOrEqual(6);
    expect(callCount).toBeLessThanOrEqual(7);
  }, 15_000);
});
