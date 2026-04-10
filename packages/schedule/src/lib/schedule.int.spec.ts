import { Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { ScheduleModule } from './schedule.module.js';
import { MultiCronService } from './test-utils/multi-cron.service.js';
import { TestService } from './test-utils/test.service.js';

describe('@Cron decorator (integration)', () => {
  let client: RedisClientType;

  beforeAll(async () => {
    client = createClient({
      url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
      database: 5,
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.quit();
  });

  beforeEach(async () => {
    await client.flushDb();
  });

  const makeModule = async (providers: Type[]) => {
    const module = await Test.createTestingModule({
      imports: [
        ScheduleModule.forRoot({
          client,
          keyPrefix: 'cron-test',
          cronJobs: true,
        }),
      ],
      providers,
    }).compile();
    await module.init();
    return module;
  };

  it('fires the handler roughly once per second (single instance)', async () => {
    const mod = await makeModule([TestService]);
    const service = mod.get(TestService);

    await new Promise((r) => setTimeout(r, 2_500));
    await mod.close();

    expect(service.callCount).toBeGreaterThanOrEqual(2);
    expect(service.callCount).toBeLessThanOrEqual(3);
  }, 10_000);

  it('fires two distinct @Cron jobs on their own independent schedules', async () => {
    const mod = await makeModule([MultiCronService]);
    const service = mod.get(MultiCronService);

    await new Promise((r) => setTimeout(r, 5_500));
    await mod.close();

    // every second: ~5 ticks in 5.5 s
    expect(service.everySecondCount).toBeGreaterThanOrEqual(4);
    expect(service.everySecondCount).toBeLessThanOrEqual(6);

    // every 2 seconds: ~2-4 ticks in 5.5 s depending on wall-clock alignment
    expect(service.everyTwoSecondsCount).toBeGreaterThanOrEqual(2);
    expect(service.everyTwoSecondsCount).toBeLessThanOrEqual(4);
  }, 15_000);

  it('fires exactly once per tick across 3 competing module instances', async () => {
    const mods = await Promise.all([
      makeModule([TestService]),
      makeModule([TestService]),
      makeModule([TestService]),
    ]);
    const services = mods.map((m) => m.get(TestService));

    await new Promise((r) => setTimeout(r, 3_500));
    await Promise.all(mods.map((m) => m.close()));

    const total = services.reduce((sum, s) => sum + s.callCount, 0);

    // Without mutual exclusion this would be 9–12 (3 modules × 3–4 ticks).
    // Redis Lua claim guarantees exactly one winner per tick.
    expect(total).toBeGreaterThanOrEqual(3);
    expect(total).toBeLessThanOrEqual(4);
  }, 15_000);
});
