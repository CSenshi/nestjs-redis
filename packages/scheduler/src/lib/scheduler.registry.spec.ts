import { SchedulerRegistry, CronJobHandle } from './scheduler.registry.js';
import { RedisJobStore } from './redis/redis-job-store.service.js';
import { RedisPollLoop } from './redis/redis-poll-loop.service.js';
import { SchedulerType } from './enums/scheduler-type.enum.js';

const makeMockStore = (): jest.Mocked<Pick<RedisJobStore, 'removeJob'>> => ({
  removeJob: jest.fn().mockResolvedValue(undefined),
});

const makeMockPollLoop = (): jest.Mocked<Pick<RedisPollLoop, 'unregisterJob'>> => ({
  unregisterJob: jest.fn(),
});

const makeHandle = (name: string): CronJobHandle => ({
  name,
  expression: '* * * * * *',
  nextTs: Date.now() + 1000,
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
});

describe('SchedulerRegistry', () => {
  let registry: SchedulerRegistry;
  let store: ReturnType<typeof makeMockStore>;
  let pollLoop: ReturnType<typeof makeMockPollLoop>;

  beforeEach(() => {
    store = makeMockStore();
    pollLoop = makeMockPollLoop();
    registry = new SchedulerRegistry(
      store as unknown as RedisJobStore,
      pollLoop as unknown as RedisPollLoop,
    );
  });

  describe('getCronJob', () => {
    it('returns handle for registered job', () => {
      const handle = makeHandle('job1');
      registry.addCronJob('job1', handle);
      expect(registry.getCronJob('job1')).toBe(handle);
    });

    it('throws for unknown job', () => {
      expect(() => registry.getCronJob('ghost')).toThrow(
        NO_SCHEDULER_FOUND_MSG(SchedulerType.CRON, 'ghost'),
      );
    });
  });

  describe('getCronJobs', () => {
    it('returns all registered cron jobs', () => {
      registry.addCronJob('a', makeHandle('a'));
      registry.addCronJob('b', makeHandle('b'));
      expect(registry.getCronJobs().size).toBe(2);
    });
  });

  describe('addCronJob', () => {
    it('throws on duplicate name', () => {
      registry.addCronJob('dup', makeHandle('dup'));
      expect(() => registry.addCronJob('dup', makeHandle('dup'))).toThrow(
        DUPLICATE_MSG(SchedulerType.CRON, 'dup'),
      );
    });
  });

  describe('deleteCronJob', () => {
    it('stops and removes job, calls removeJob and unregisterJob', async () => {
      const handle = makeHandle('toDelete');
      registry.addCronJob('toDelete', handle);
      await registry.deleteCronJob('toDelete');

      expect(handle.stop).toHaveBeenCalled();
      expect(store.removeJob).toHaveBeenCalledWith('toDelete');
      expect(pollLoop.unregisterJob).toHaveBeenCalledWith('toDelete');
      expect(registry.doesExist('cron', 'toDelete')).toBe(false);
    });

    it('throws if job does not exist', async () => {
      await expect(registry.deleteCronJob('nope')).rejects.toThrow();
    });
  });

  describe('doesExist', () => {
    it('returns true for existing cron job', () => {
      registry.addCronJob('exists', makeHandle('exists'));
      expect(registry.doesExist('cron', 'exists')).toBe(true);
    });

    it('returns false for non-existent job', () => {
      expect(registry.doesExist('cron', 'missing')).toBe(false);
    });

    it('checks interval existence', () => {
      const ref = setInterval(() => {}, 10000);
      registry.addInterval('myInterval', ref);
      expect(registry.doesExist('interval', 'myInterval')).toBe(true);
      clearInterval(ref);
    });

    it('checks timeout existence', () => {
      const ref = setTimeout(() => {}, 10000);
      registry.addTimeout('myTimeout', ref);
      expect(registry.doesExist('timeout', 'myTimeout')).toBe(true);
      clearTimeout(ref);
    });
  });

  describe('intervals', () => {
    it('returns interval names', () => {
      const ref = setInterval(() => {}, 10000);
      registry.addInterval('i1', ref);
      expect(registry.getIntervals()).toContain('i1');
      clearInterval(ref);
    });

    it('throws on duplicate interval', () => {
      const ref = setInterval(() => {}, 10000);
      registry.addInterval('dup', ref);
      expect(() => registry.addInterval('dup', ref)).toThrow();
      clearInterval(ref);
    });

    it('deletes interval and clears it', () => {
      const ref = setInterval(() => {}, 10000);
      registry.addInterval('del', ref);
      registry.deleteInterval('del');
      expect(registry.doesExist('interval', 'del')).toBe(false);
    });
  });

  describe('timeouts', () => {
    it('returns timeout names', () => {
      const ref = setTimeout(() => {}, 10000);
      registry.addTimeout('t1', ref);
      expect(registry.getTimeouts()).toContain('t1');
      clearTimeout(ref);
    });

    it('deletes timeout and clears it', () => {
      const ref = setTimeout(() => {}, 10000);
      registry.addTimeout('del', ref);
      registry.deleteTimeout('del');
      expect(registry.doesExist('timeout', 'del')).toBe(false);
    });
  });
});

function NO_SCHEDULER_FOUND_MSG(type: SchedulerType, name: string): string {
  return `No scheduler with type "${type}" and name "${name}" was found.`;
}

function DUPLICATE_MSG(type: SchedulerType, name: string): string {
  return `Scheduler with type "${type}" and name "${name}" already exists. Check your decorated methods.`;
}
