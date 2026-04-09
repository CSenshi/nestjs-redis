import { Test, TestingModule } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import { createClient } from 'redis';
import { ScheduleModule } from './schedule.module.js';
import { SchedulerRegistry } from './scheduler.registry.js';
import { Cron } from './decorators/cron.decorator.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const TEST_PREFIX = `test:scheduler:${Date.now()}`;

describe('ScheduleModule integration', () => {
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

  describe('exactly-one-execution across two parallel orchestrators', () => {
    it('executes each job exactly once when two modules compete', async () => {
      const executionCounts = { jobA: 0 };

      @Injectable()
      class ServiceA {
        @Cron('* * * * * *', { name: `${TEST_PREFIX}:jobA` })
        jobA() {
          executionCounts.jobA++;
        }
      }

      const buildModule = () =>
        Test.createTestingModule({
          imports: [
            ScheduleModule.forRoot({
              client: client as unknown as Parameters<typeof ScheduleModule.forRoot>[0]['client'],
              keyPrefix: TEST_PREFIX,
              cronJobs: true,
              intervals: false,
              timeouts: false,
            }),
          ],
          providers: [ServiceA],
        }).compile();

      const [moduleA, moduleB] = await Promise.all([buildModule(), buildModule()]);
      await moduleA.init();
      await moduleB.init();

      // Wait for at least one tick (1s job)
      await new Promise((r) => setTimeout(r, 1500));

      await Promise.all([moduleA.close(), moduleB.close()]);

      // With distributed lock, only one execution per tick — allow 1-2 total
      expect(executionCounts.jobA).toBeLessThanOrEqual(2);
      expect(executionCounts.jobA).toBeGreaterThanOrEqual(1);
    }, 10000);
  });

  describe('expression-change detection', () => {
    it('reschedules when cron expression changes', async () => {
      const jobName = `${TEST_PREFIX}:changeJob`;

      // First: register with one expression
      @Injectable()
      class ServiceV1 {
        @Cron('0 0 1 1 *', { name: jobName }) // yearly — far future
        yearly() {}
      }

      const module1 = await Test.createTestingModule({
        imports: [
          ScheduleModule.forRoot({
            client: client as unknown as Parameters<typeof ScheduleModule.forRoot>[0]['client'],
            keyPrefix: TEST_PREFIX,
          }),
        ],
        providers: [ServiceV1],
      }).compile();
      await module1.init();
      await module1.close();

      // Check it was stored
      const originalScore = await client.zScore(`${TEST_PREFIX}:jobs`, jobName);
      expect(originalScore).not.toBeNull();

      // Second: register with a different expression
      @Injectable()
      class ServiceV2 {
        @Cron('* * * * * *', { name: jobName }) // every second — near future
        everySecond() {}
      }

      const module2 = await Test.createTestingModule({
        imports: [
          ScheduleModule.forRoot({
            client: client as unknown as Parameters<typeof ScheduleModule.forRoot>[0]['client'],
            keyPrefix: TEST_PREFIX,
          }),
        ],
        providers: [ServiceV2],
      }).compile();
      await module2.init();
      await module2.close();

      const newScore = await client.zScore(`${TEST_PREFIX}:jobs`, jobName);
      expect(newScore).not.toBeNull();
      // The new score should be much sooner than the original (yearly) schedule
      expect(newScore!).toBeLessThan(originalScore!);
    }, 15000);
  });

  describe('disabled job', () => {
    it('does not fire when disabled: true', async () => {
      const executed: string[] = [];
      const jobName = `${TEST_PREFIX}:disabledJob`;

      @Injectable()
      class DisabledService {
        @Cron('* * * * * *', { name: jobName, disabled: true })
        shouldNotRun() {
          executed.push('ran');
        }
      }

      const module = await Test.createTestingModule({
        imports: [
          ScheduleModule.forRoot({
            client: client as unknown as Parameters<typeof ScheduleModule.forRoot>[0]['client'],
            keyPrefix: TEST_PREFIX,
          }),
        ],
        providers: [DisabledService],
      }).compile();
      await module.init();

      await new Promise((r) => setTimeout(r, 1200));

      await module.close();

      expect(executed).toHaveLength(0);

      // Verify not in ZSET
      const score = await client.zScore(`${TEST_PREFIX}:jobs`, jobName);
      expect(score).toBeNull();
    }, 10000);
  });

  describe('SchedulerRegistry', () => {
    it('getCronJob returns a handle with start/stop methods', async () => {
      const jobName = `${TEST_PREFIX}:registryJob`;

      @Injectable()
      class RegistryService {
        @Cron('0 0 1 1 *', { name: jobName }) // yearly — won't fire
        myJob() {}
      }

      const module = await Test.createTestingModule({
        imports: [
          ScheduleModule.forRoot({
            client: client as unknown as Parameters<typeof ScheduleModule.forRoot>[0]['client'],
            keyPrefix: TEST_PREFIX,
          }),
        ],
        providers: [RegistryService],
      }).compile();
      await module.init();

      const registry = module.get(SchedulerRegistry);
      const handle = registry.getCronJob(jobName);
      expect(handle).toBeDefined();
      expect(typeof handle.start).toBe('function');
      expect(typeof handle.stop).toBe('function');

      await module.close();
    }, 10000);
  });
});
