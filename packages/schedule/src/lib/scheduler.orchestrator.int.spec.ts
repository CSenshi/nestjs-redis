import { Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { ScheduleModule } from './schedule.module.js';
import { DisabledCronService } from './test-utils/disabled-cron.service.js';
import { TestService } from './test-utils/test.service.js';

describe('SchedulerOrchestrator — disabled cron jobs', () => {
  let client: RedisClientType;

  beforeAll(async () => {
    client = createClient({
      url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
      database: 6,
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
          keyPrefix: 'disabled-test',
          cronJobs: true,
        }),
      ],
      providers,
    }).compile();
    await module.init();
    return module;
  };

  it('does not enqueue a disabled job in Redis', async () => {
    const mod = await makeModule([DisabledCronService]);
    await mod.close();

    expect(
      await client.zScore('disabled-test:jobs', 'disabled-job'),
    ).toBeNull();
    expect(await client.hGet('disabled-test:meta', 'disabled-job')).toBeNull();
  });

  it('never fires the handler for a disabled job', async () => {
    const mod = await makeModule([DisabledCronService]);
    const service = mod.get(DisabledCronService);

    await new Promise((r) => setTimeout(r, 2_000));
    await mod.close();

    expect(service.callCount).toBe(0);
  }, 10_000);

  it('does not fire a disabled job even when an enabled job runs normally', async () => {
    const mod = await makeModule([TestService, DisabledCronService]);
    const enabled = mod.get(TestService);
    const disabled = mod.get(DisabledCronService);

    await new Promise((r) => setTimeout(r, 2_500));
    await mod.close();

    expect(enabled.callCount).toBeGreaterThanOrEqual(2);
    expect(disabled.callCount).toBe(0);
  }, 10_000);

  it('does not enqueue a disabled job even when an enabled job is present', async () => {
    const mod = await makeModule([TestService, DisabledCronService]);
    await mod.close();

    // enabled job must be in Redis
    expect(
      await client.zScore('disabled-test:jobs', 'test-job'),
    ).not.toBeNull();
    // disabled job must not be
    expect(
      await client.zScore('disabled-test:jobs', 'disabled-job'),
    ).toBeNull();
  });
});
