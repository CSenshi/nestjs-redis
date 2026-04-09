import { Test } from '@nestjs/testing';
import { RedisJobStore } from './redis-job-store.service.js';
import { SCHEDULE_MODULE_OPTIONS } from '../schedule.constants.js';

const makeClient = () => ({
  hGet: jest.fn(),
  hSet: jest.fn(),
  hDel: jest.fn(),
  zAdd: jest.fn(),
  zRem: jest.fn(),
  zRangeWithScores: jest.fn(),
  scriptLoad: jest.fn(),
  evalSha: jest.fn(),
  eval: jest.fn(),
});

describe('RedisJobStore', () => {
  let store: RedisJobStore;
  let client: ReturnType<typeof makeClient>;

  beforeEach(async () => {
    client = makeClient();
    const module = await Test.createTestingModule({
      providers: [
        RedisJobStore,
        {
          provide: SCHEDULE_MODULE_OPTIONS,
          useValue: { client, keyPrefix: 'test' },
        },
      ],
    }).compile();
    store = module.get(RedisJobStore);
  });

  describe('registerJob', () => {
    it('uses ZADD without NX when expression changed', async () => {
      client.hGet.mockResolvedValue('old-expr');
      await store.registerJob('myJob', 'new-expr', 1000);
      expect(client.hSet).toHaveBeenCalledWith('test:meta', 'myJob', 'new-expr');
      expect(client.zAdd).toHaveBeenCalledWith(
        'test:jobs',
        { score: 1000, value: 'myJob' },
      );
    });

    it('uses ZADD NX when expression unchanged', async () => {
      client.hGet.mockResolvedValue('same-expr');
      await store.registerJob('myJob', 'same-expr', 2000);
      expect(client.hSet).not.toHaveBeenCalled();
      expect(client.zAdd).toHaveBeenCalledWith(
        'test:jobs',
        { score: 2000, value: 'myJob' },
        { NX: true },
      );
    });

    it('overwrites when no stored expression (null)', async () => {
      client.hGet.mockResolvedValue(null);
      await store.registerJob('myJob', 'new-expr', 3000);
      expect(client.hSet).toHaveBeenCalled();
    });
  });

  describe('claimDueJob', () => {
    it('returns job name on successful claim', async () => {
      client.scriptLoad.mockResolvedValue('abc123sha1abc123sha1abc123sha1abc123sha1');
      client.evalSha.mockResolvedValue('myJob');
      const result = await store.claimDueJob(Date.now());
      expect(result).toBe('myJob');
    });

    it('returns null when no job is due', async () => {
      client.scriptLoad.mockResolvedValue('abc123sha1abc123sha1abc123sha1abc123sha1');
      client.evalSha.mockResolvedValue(null);
      const result = await store.claimDueJob(Date.now());
      expect(result).toBeNull();
    });

    it('falls back to raw script on NOSCRIPT error', async () => {
      client.scriptLoad.mockResolvedValue('abc123sha1abc123sha1abc123sha1abc123sha1');
      client.evalSha.mockRejectedValue(new Error('NOSCRIPT No matching script'));
      client.eval.mockResolvedValue('fallbackJob');
      const result = await store.claimDueJob(Date.now());
      expect(result).toBe('fallbackJob');
    });
  });

  describe('peekNextJob', () => {
    it('returns null when ZSET is empty', async () => {
      client.zRangeWithScores.mockResolvedValue([]);
      expect(await store.peekNextJob()).toBeNull();
    });

    it('returns name and score of earliest entry', async () => {
      client.zRangeWithScores.mockResolvedValue([{ value: 'job1', score: 12345 }]);
      expect(await store.peekNextJob()).toEqual({ name: 'job1', score: 12345 });
    });
  });

  describe('enqueueJob', () => {
    it('calls ZADD to overwrite entry', async () => {
      await store.enqueueJob('job1', 99999);
      expect(client.zAdd).toHaveBeenCalledWith('test:jobs', { score: 99999, value: 'job1' });
    });
  });

  describe('removeJob', () => {
    it('removes from ZSET and meta hash', async () => {
      client.zRem.mockResolvedValue(1);
      client.hDel.mockResolvedValue(1);
      await store.removeJob('job1');
      expect(client.zRem).toHaveBeenCalledWith('test:jobs', 'job1');
      expect(client.hDel).toHaveBeenCalledWith('test:meta', 'job1');
    });
  });
});
