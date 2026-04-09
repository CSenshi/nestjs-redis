/**
 * Drop-in compatibility test: verifies that the same decorator shapes
 * used with @nestjs/schedule compile and run correctly with @nestjs-redis/scheduler.
 */
import { Test } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { createClient } from 'redis';
import { ScheduleModule } from './schedule.module.js';
import { Cron } from './decorators/cron.decorator.js';
import { Interval } from './decorators/interval.decorator.js';
import { Timeout } from './decorators/timeout.decorator.js';
import { CronExpression } from './enums/cron-expression.enum.js';
import { SchedulerRegistry } from './scheduler.registry.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const TEST_PREFIX = `test:compat:${Date.now()}`;

describe('Drop-in compatibility', () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(async () => {
    client = createClient({ url: REDIS_URL });
    await client.connect();
  });

  afterAll(async () => {
    const keys = await client.keys(`${TEST_PREFIX}:*`);
    if (keys.length > 0) await client.del(keys);
    await client.disconnect();
  });

  it('compiles and bootstraps with same decorator shapes as @nestjs/schedule', async () => {
    const intervalFired: boolean[] = [];
    const timeoutFired: boolean[] = [];

    @Injectable()
    class CompatService {
      // Same as @nestjs/schedule — name can be omitted
      @Cron(CronExpression.EVERY_YEAR, { name: `${TEST_PREFIX}:yearly` })
      handleYearly() {}

      @Interval(500)
      handleInterval() {
        intervalFired.push(true);
      }

      @Timeout(200)
      handleTimeout() {
        timeoutFired.push(true);
      }

      @Interval('namedInterval', 600)
      handleNamedInterval() {}

      @Timeout('namedTimeout', 300)
      handleNamedTimeout() {}
    }

    const module = await Test.createTestingModule({
      imports: [
        ScheduleModule.forRoot({
          client: client as unknown as Parameters<typeof ScheduleModule.forRoot>[0]['client'],
          keyPrefix: TEST_PREFIX,
        }),
      ],
      providers: [CompatService],
    }).compile();

    await module.init();

    await new Promise((r) => setTimeout(r, 700));

    const registry = module.get(SchedulerRegistry);

    // Cron job is registered
    expect(registry.getCronJob(`${TEST_PREFIX}:yearly`)).toBeDefined();

    // Intervals fired
    expect(intervalFired.length).toBeGreaterThanOrEqual(1);

    // Timeout fired exactly once
    expect(timeoutFired).toHaveLength(1);

    // Named interval and timeout are accessible in registry
    expect(registry.doesExist('interval', 'namedInterval')).toBe(true);
    expect(registry.doesExist('timeout', 'namedTimeout')).toBe(true);

    await module.close();
  }, 10000);
});
